-- Cover new delivery ownership and stock audit foreign keys without removing existing indexes.
create index incubacion_lotes_delivery_owner on public.incubacion_lotes(delivery_id,owner_id);
create index tienda_stock_movimientos_actor on public.tienda_stock_movimientos(actor);
