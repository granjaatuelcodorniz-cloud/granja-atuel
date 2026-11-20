-- Applied once with Supabase migration tools. No old browser data is imported.
-- Before customer signup, isolate the existing internal management accounts.
create table public.app_internal_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.app_internal_users enable row level security;
revoke all on public.app_internal_users from anon, authenticated;
grant select on public.app_internal_users to authenticated;
create policy internal_membership_self on public.app_internal_users for select to authenticated using (user_id=(select auth.uid()));
insert into public.app_internal_users(user_id) select id from auth.users where email in ('marcos@finanzas.local','noelia@finanzas.local');
-- Preserve the existing permissive policies; add an AND gate for internal users.
do $$ declare t text; begin
 foreach t in array array['gastos','alertas','ventas','ventas_ml','config_app','balance_mensual','cartera_mensual','gastos_personales','spy_prices','pagos_proveedores','ingresos_mensuales','pagos_servicios','spy_dividendos','clientes','pagos'] loop
 execute format('create policy internal_accounts_only on public.%I as restrictive for all to authenticated using (exists(select 1 from public.app_internal_users where user_id=(select auth.uid()))) with check (exists(select 1 from public.app_internal_users where user_id=(select auth.uid())))',t);
 end loop;
end $$;
create table public.incubacion_lotes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80),species text not null check(species in ('coturnix','gallina','personalizado')),
 egg_count integer not null check(egg_count between 1 and 100000),start_date date not null check(start_date>='2020-01-01'),
 candling_day integer not null,lockdown_day integer not null,hatch_day integer not null,
 source text not null default 'sin_indicar' check(source in ('granja_atuel','otro','propio','sin_indicar')),
 incubator text not null default '' check(length(incubator)<=100),notes text not null default '' check(length(notes)<=1500),
 discarded integer check(discarded>=0 and discarded<=egg_count),
 developing integer generated always as (egg_count-discarded) stored,
 candled_on date,lockdown_on date,born integer,hatched_on date,
 incident text not null default '' check(length(incident)<=1500),share_results boolean not null default false,
 version integer not null default 1 check(version>0),created_at timestamptz not null default now(),
 check(candling_day>=1 and candling_day<lockdown_day and lockdown_day<hatch_day and hatch_day<=65),
 check((discarded is null)=(candled_on is null)),check((born is null)=(hatched_on is null)),
 check(candled_on>=start_date),check(lockdown_on>=start_date),check(hatched_on>=start_date),
 check(hatched_on>=candled_on),check(hatched_on>=lockdown_on),check(born>=0 and born<=coalesce(developing,egg_count))
);
create index incubacion_owner_created on public.incubacion_lotes(owner_id,created_at desc);
create index incubacion_shared on public.incubacion_lotes(created_at desc) where share_results;
alter table public.incubacion_lotes enable row level security;
revoke all on public.incubacion_lotes from anon,authenticated;
grant select,delete on public.incubacion_lotes to authenticated;
grant insert(name,species,egg_count,start_date,candling_day,lockdown_day,hatch_day,source,incubator,notes) on public.incubacion_lotes to authenticated;
grant update(discarded,candled_on,lockdown_on,born,hatched_on,incident,share_results,version) on public.incubacion_lotes to authenticated;
create policy incubation_owner_read on public.incubacion_lotes for select to authenticated using(owner_id=(select auth.uid()));
create policy incubation_owner_insert on public.incubacion_lotes for insert to authenticated with check(owner_id=(select auth.uid()));
create policy incubation_owner_update on public.incubacion_lotes for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy incubation_owner_delete on public.incubacion_lotes for delete to authenticated using(owner_id=(select auth.uid()));
create policy incubation_consented_admin_read on public.incubacion_lotes for select to authenticated using(share_results and exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
