alter table public.incubacion_entregas add column active boolean not null default true,add column version integer not null default 1 check(version>0);
grant update(active,version) on public.incubacion_entregas to authenticated;
create policy incubation_delivery_admin_update on public.incubacion_entregas for update to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
create or replace function public.incubation_validate_delivery() returns trigger
 language plpgsql security invoker set search_path='' as $$
declare delivery public.incubacion_entregas%rowtype; begin
 if new.delivery_id is not null then
  select * into delivery from public.incubacion_entregas where id=new.delivery_id and owner_id=new.owner_id;
  if not found or not delivery.active or new.source<>'granja_atuel' or new.start_date<delivery.delivered_on or new.egg_count>delivery.egg_count then raise exception 'Delivery does not match incubation'; end if;
 end if;
 return new;
end $$;
-- Archived assignments remain in the history, but cannot be newly linked.
