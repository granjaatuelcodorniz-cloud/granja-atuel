-- Entire test is rolled back. It uses existing memberships; no Auth users or emails.
begin;
select set_config('test.trace_admin',(select user_id::text from public.tienda_admins limit 1),true),
 set_config('test.trace_owner',(select owner_id::text from public.incubacion_lotes limit 1),true),
 set_config('test.trace_other',(select id::text from auth.users where id not in(select owner_id from public.incubacion_lotes) and id not in(select user_id from public.tienda_admins) limit 1),true);
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.trace_admin'),'role','authenticated')::text,true);
with delivery as (
 insert into public.incubacion_entregas(owner_id,batch_code,production_date,delivered_on,egg_count,purchase_reference)
 values(current_setting('test.trace_owner')::uuid,'QA-ROLLBACK',current_date-2,current_date-1,100,'QA only') returning id
)select set_config('test.trace_delivery',id::text,true) from delivery;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.trace_other'),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
do $$ begin
 if exists(select 1 from public.incubacion_entregas where id=current_setting('test.trace_delivery')::uuid) then raise exception 'Other customer can read delivery'; end if;
 begin
  insert into public.incubacion_entregas(owner_id,batch_code,production_date,delivered_on,egg_count) values(auth.uid(),'Forged',current_date,current_date,1);
  raise exception 'Customer can forge confirmed assignment';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.incubacion_lotes(name,species,egg_count,start_date,candling_day,lockdown_day,hatch_day,source,delivery_id) values('QA cross owner','coturnix',100,current_date,10,14,16,'granja_atuel',current_setting('test.trace_delivery')::uuid);
  raise exception 'Cross-account delivery accepted';
 exception when raise_exception then if sqlerrm<>'Delivery does not match incubation' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.trace_owner'),'role','authenticated')::text,true);
with lot as (
 insert into public.incubacion_lotes(name,species,egg_count,start_date,candling_day,lockdown_day,hatch_day,source,delivery_id)
 values('QA trace rollback','coturnix',100,current_date,10,14,16,'granja_atuel',current_setting('test.trace_delivery')::uuid) returning id
)select set_config('test.trace_lot',id::text,true) from lot;
do $$ begin
 if (select count(*) from public.incubacion_lotes where id=current_setting('test.trace_lot')::uuid)<>1 then raise exception 'Own delivery cannot be linked'; end if;
 begin
  insert into public.incubacion_lotes(name,species,egg_count,start_date,candling_day,lockdown_day,hatch_day,source,delivery_id) values('QA excess eggs','coturnix',101,current_date,10,14,16,'granja_atuel',current_setting('test.trace_delivery')::uuid);
  raise exception 'Excess delivered quantity accepted';
 exception when raise_exception then if sqlerrm<>'Delivery does not match incubation' then raise; end if;
 end;
 begin
  insert into public.incubacion_lotes(name,species,egg_count,start_date,candling_day,lockdown_day,hatch_day,source,delivery_id) values('QA reused eggs','coturnix',1,current_date,10,14,16,'granja_atuel',current_setting('test.trace_delivery')::uuid);
  raise exception 'Same delivered eggs allocated twice';
 exception when raise_exception then if sqlerrm<>'Delivered eggs already allocated' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.trace_admin'),'role','authenticated')::text,true);
update public.incubacion_entregas set active=false,version=version+1 where id=current_setting('test.trace_delivery')::uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.trace_owner'),'role','authenticated')::text,true);
do $$ begin
 if not exists(select 1 from public.incubacion_lotes where id=current_setting('test.trace_lot')::uuid) then raise exception 'Archiving removed historical lot'; end if;
 begin
  insert into public.incubacion_lotes(name,species,egg_count,start_date,candling_day,lockdown_day,hatch_day,source,delivery_id) values('QA archived delivery','coturnix',1,current_date,10,14,16,'granja_atuel',current_setting('test.trace_delivery')::uuid);
  raise exception 'Archived delivery accepted';
 exception when raise_exception then if sqlerrm<>'Delivery does not match incubation' then raise; end if;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform id from public.incubacion_entregas;raise exception 'Anonymous can read deliveries';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: admin assignment, owner linking, other-account isolation, false admin metadata, quantity bound, archive history, anonymous denial; all QA data rolled back' as result;
