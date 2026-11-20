create or replace function public.incubation_validate_delivery() returns trigger
 language plpgsql security invoker set search_path='' as $$
declare delivery public.incubacion_entregas%rowtype; allocated integer; begin
 if new.delivery_id is not null then
  select * into delivery from public.incubacion_entregas where id=new.delivery_id and owner_id=new.owner_id;
  if not found or not delivery.active or new.source<>'granja_atuel' or new.start_date<delivery.delivered_on or new.egg_count>delivery.egg_count then raise exception 'Delivery does not match incubation'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.delivery_id::text,0));
  select coalesce(sum(egg_count),0) into allocated from public.incubacion_lotes where delivery_id=new.delivery_id and id<>new.id;
  if allocated+new.egg_count>delivery.egg_count then raise exception 'Delivered eggs already allocated'; end if;
 end if;
 return new;
end $$;
