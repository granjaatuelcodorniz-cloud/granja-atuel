-- El modo se fija al crear el pedido. Mantiene los pedidos de prueba y habilita
-- el esquema del futuro checkout real, que sigue apagado por configuración.
begin;
alter table public.tienda_pedidos
 add column payment_collector_id text check (payment_collector_id ~ '^[0-9]{1,30}$'),
 drop constraint tienda_pedidos_mode_check,
 drop constraint tienda_pedidos_delivery_check,
 add constraint tienda_pedidos_mode_check check (mode in ('test','production')),
 add constraint tienda_pedidos_delivery_check check (
  (mode='test' and delivery='simulated_pickup' and delivery_address is null) or
  (((mode='test' and delivery='simulated_shipping') or (mode='production' and delivery='shipping'))
   and delivery_address is not null and jsonb_typeof(delivery_address)='object'
   and delivery_address ?& array['province','city','postal_code','address','phone','reference'])
 ),
 add constraint tienda_production_checkout_verified check (
  mode='test' or checkout_url is null or
   (payment_collector_id is not null and payment_collector_id<>'3450457878')
 );
create index tienda_pedidos_mode_created on public.tienda_pedidos(mode,created_at desc);
commit;
