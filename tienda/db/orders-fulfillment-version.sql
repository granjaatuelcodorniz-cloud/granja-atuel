alter table public.tienda_pedidos add column fulfillment_version integer not null default 1 check(fulfillment_version>0);
grant update(fulfillment_version) on public.tienda_pedidos to authenticated;
