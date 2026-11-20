-- Read-only authorization regression check against the configured project.
-- Uses existing admin/customer memberships; no users, lots or results are modified.
begin read only;
select set_config('test.inc_admin',(select user_id::text from public.tienda_admins limit 1),true),
 set_config('test.inc_owner',(select owner_id::text from public.incubacion_lotes limit 1),true),
 set_config('test.inc_other',gen_random_uuid()::text,true),
 set_config('test.inc_total',(select count(*)::text from public.incubacion_lotes),true),
 set_config('test.inc_owned',(select count(*)::text from public.incubacion_lotes where owner_id=(select owner_id from public.incubacion_lotes limit 1)),true);
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.inc_admin'),'role','authenticated')::text,true);
do $$ begin
 if (select count(*) from public.incubacion_lotes)<>current_setting('test.inc_total')::int then raise exception 'Administrator cannot read all lots'; end if;
 if exists(select 1 from pg_policies where tablename='incubacion_lotes' and policyname='incubation_admin_read' and qual like '%share_results%') then raise exception 'Admin access still depends on sharing'; end if;
 if (select count(*) from pg_policies where tablename='incubacion_lotes' and cmd in ('INSERT','UPDATE','DELETE'))<>3 then raise exception 'Unexpected write policies'; end if;
 if exists(select 1 from pg_policies where tablename='incubacion_lotes' and cmd in ('INSERT','UPDATE','DELETE') and (coalesce(qual,with_check) not like '%owner_id%' or coalesce(with_check,qual) not like '%owner_id%')) then raise exception 'Write access is not restricted to owner'; end if;
 if has_column_privilege('authenticated','public.incubacion_lotes','share_results','UPDATE') then raise exception 'Legacy sharing flag is writable'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.inc_owner'),'role','authenticated')::text,true);
do $$ begin
 if (select count(*) from public.incubacion_lotes)<>current_setting('test.inc_owned')::int then raise exception 'Customer cannot read exactly their own lots'; end if;
 if exists(select 1 from public.incubacion_lotes where owner_id<>auth.uid()) then raise exception 'Customer can read another account'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.inc_other'),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
do $$ begin
 if exists(select 1 from public.incubacion_lotes) then raise exception 'Unrelated account or user metadata grants read access'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 begin
  perform id from public.incubacion_lotes limit 1;
  raise exception 'Anonymous role can read lots';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: admin reads all, owner reads own, unrelated account and anonymous denied, write policies remain owner-only; no data mutations' as result;
