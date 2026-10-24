-- One row records a farm batch delivered to a specific account. No existing lot is linked automatically.
create table public.incubacion_entregas (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 batch_code text not null check(length(batch_code) between 1 and 80),
 production_date date not null check(production_date>='2020-01-01'),
 delivered_on date not null check(delivered_on>=production_date),
 egg_count integer not null check(egg_count between 1 and 100000),
 purchase_reference text not null default '' check(length(purchase_reference)<=100),
 created_at timestamptz not null default now(),
 unique(id,owner_id)
);
create index incubacion_entregas_owner on public.incubacion_entregas(owner_id,delivered_on desc);
create index incubacion_entregas_batch on public.incubacion_entregas(batch_code);
alter table public.incubacion_entregas enable row level security;
revoke all on public.incubacion_entregas from anon,authenticated;
grant select on public.incubacion_entregas to authenticated;
grant insert(owner_id,batch_code,production_date,delivered_on,egg_count,purchase_reference) on public.incubacion_entregas to authenticated;
create policy incubation_delivery_owner_read on public.incubacion_entregas for select to authenticated using(owner_id=(select auth.uid()));
create policy incubation_delivery_admin_read on public.incubacion_entregas for select to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
create policy incubation_delivery_admin_insert on public.incubacion_entregas for insert to authenticated with check(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
-- No UPDATE/DELETE grant: confirmed assignments are immutable.
alter table public.incubacion_lotes
 add column delivery_id uuid,
 add column supplier_lot text not null default '' check(length(supplier_lot)<=100),
 add column purchase_reference text not null default '' check(length(purchase_reference)<=100),
 add constraint incubation_delivery_owner_fk foreign key(delivery_id,owner_id) references public.incubacion_entregas(id,owner_id),
 add constraint incubation_delivery_source check(delivery_id is null or source='granja_atuel');
create index incubacion_lotes_delivery on public.incubacion_lotes(delivery_id) where delivery_id is not null;
grant insert(delivery_id,supplier_lot,purchase_reference) on public.incubacion_lotes to authenticated;
grant update(delivery_id,supplier_lot,purchase_reference) on public.incubacion_lotes to authenticated;
-- Validate the confirmed relationship even when the browser calls the Data API directly.
create function public.incubation_validate_delivery() returns trigger
 language plpgsql security invoker set search_path='' as $$
declare delivery public.incubacion_entregas%rowtype; begin
 if new.delivery_id is not null then
  select * into delivery from public.incubacion_entregas where id=new.delivery_id and owner_id=new.owner_id;
  if not found or new.source<>'granja_atuel' or new.start_date<delivery.delivered_on or new.egg_count>delivery.egg_count then
   raise exception 'Delivery does not match incubation';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.incubation_validate_delivery() from public,anon,authenticated;
create trigger incubation_delivery_valid before insert or update of delivery_id,owner_id,start_date,egg_count,source on public.incubacion_lotes for each row execute function public.incubation_validate_delivery();
