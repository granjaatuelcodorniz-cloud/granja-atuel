-- Additive dashboard upgrade. Existing products, orders and internal finance data are preserved.
alter table public.tienda_productos
 add column sku text not null default '' check(length(sku)<=60),
 add column details text not null default '' check(length(details)<=6000),
 add column gallery jsonb not null default '[]' check(jsonb_typeof(gallery)='array' and jsonb_array_length(gallery)<=8),
 add column stock_tracking boolean not null default false,
 add column stock_quantity integer not null default 0 check(stock_quantity between 0 and 1000000),
 add column stock_minimum integer not null default 5 check(stock_minimum between 0 and 1000000);
create unique index tienda_productos_sku_unique on public.tienda_productos(lower(sku)) where sku<>'';
grant insert(id,name,description,category,price,image,active,available,weight_grams,height_cm,width_cm,length_cm,sort_order,sku,details,gallery,stock_tracking,stock_minimum) on public.tienda_productos to authenticated;
grant update(sku,details,gallery,stock_tracking,stock_minimum,sort_order) on public.tienda_productos to authenticated;
create policy tienda_catalog_admin_insert on public.tienda_productos for insert to authenticated with check(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));

create table public.tienda_stock_movimientos (
 id uuid primary key default gen_random_uuid(), product_id text not null references public.tienda_productos(id),
 delta integer not null check(delta<>0 and delta between -1000000 and 1000000),
 previous_quantity integer not null, new_quantity integer not null check(new_quantity between 0 and 1000000),
 reason text not null check(length(reason) between 3 and 300),actor uuid not null references auth.users(id),
 request_key uuid not null unique,created_at timestamptz not null default now()
);
create index tienda_stock_product_date on public.tienda_stock_movimientos(product_id,created_at desc);
alter table public.tienda_stock_movimientos enable row level security;
revoke all on public.tienda_stock_movimientos from anon,authenticated;
grant select on public.tienda_stock_movimientos to authenticated;
grant all on public.tienda_stock_movimientos to service_role;
create policy tienda_stock_admin_read on public.tienda_stock_movimientos for select to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
create function public.tienda_adjust_stock(p_product_id text,p_delta integer,p_reason text,p_actor uuid,p_request_key uuid,p_expected_quantity integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare current_quantity integer; old public.tienda_stock_movimientos%rowtype; begin
 if not exists(select 1 from public.tienda_admins where user_id=p_actor) then raise exception 'Administrator required'; end if;
 select * into old from public.tienda_stock_movimientos where request_key=p_request_key;
 if found then
  if old.product_id<>p_product_id or old.delta<>p_delta or old.actor<>p_actor or old.reason<>p_reason then raise exception 'Attempt already used'; end if;
  return old.new_quantity;
 end if;
 select stock_quantity into current_quantity from public.tienda_productos where id=p_product_id for update;
 if current_quantity is null then raise exception 'Product missing'; end if;
 if current_quantity<>p_expected_quantity then raise exception 'Stock changed. Refresh before adjusting'; end if;
 if p_delta is null or p_delta=0 or abs(p_delta::bigint)>1000000 or current_quantity+p_delta not between 0 and 1000000 then raise exception 'Invalid stock adjustment'; end if;
 update public.tienda_productos set stock_quantity=current_quantity+p_delta,updated_at=now() where id=p_product_id;
 insert into public.tienda_stock_movimientos(product_id,delta,previous_quantity,new_quantity,reason,actor,request_key) values(p_product_id,p_delta,current_quantity,current_quantity+p_delta,p_reason,p_actor,p_request_key);
 return current_quantity+p_delta;
end $$;
revoke all on function public.tienda_adjust_stock(text,integer,text,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.tienda_adjust_stock(text,integer,text,uuid,uuid,integer) to service_role;

create table public.tienda_imagenes (
 id uuid primary key default gen_random_uuid(),url text not null unique,path text unique,
 name text not null check(length(name) between 1 and 150),alt text not null default '' check(length(alt)<=200),
 archived boolean not null default false,created_at timestamptz not null default now()
);
alter table public.tienda_imagenes enable row level security;
revoke all on public.tienda_imagenes from anon,authenticated;
grant select,insert,update on public.tienda_imagenes to authenticated;
create policy tienda_media_admin on public.tienda_imagenes for all to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
insert into public.tienda_imagenes(url,name,alt) values
('/huevos-consumo1.webp','Huevos de consumo','Huevos de codorniz para consumo'),
('/huevos-fertiles1.webp','Huevos fértiles','Huevos de codorniz para incubar'),
('/maples-x-200-unidades.webp','Blíster de codorniz','Envases para huevos de codorniz'),
('/hero-web.webp','Nuestra granja','Codornices en Granja Atuel'),
('/el-corazon-esta-en-cada-detalle.webp','El cuidado de la producción','Producción de Granja Atuel');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('tienda-productos','tienda-productos',true,2097152,array['image/webp','image/jpeg','image/png']);
create policy tienda_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='tienda-productos' and (storage.foldername(name))[1]='products' and exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
create policy tienda_images_admin_select on storage.objects for select to authenticated using(bucket_id='tienda-productos' and exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));

create table public.tienda_configuracion (
 id text primary key check(id='main'), data jsonb not null default '{}',updated_at timestamptz not null default now()
);
alter table public.tienda_configuracion enable row level security;
revoke all on public.tienda_configuracion from anon,authenticated;
grant select on public.tienda_configuracion to anon,authenticated;
grant update(data,updated_at) on public.tienda_configuracion to authenticated;
create policy tienda_settings_public_read on public.tienda_configuracion for select to anon,authenticated using(true);
create policy tienda_settings_admin_update on public.tienda_configuracion for update to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
insert into public.tienda_configuracion(id) values('main');

alter table public.tienda_pedidos
 add column fulfillment_status text not null default 'new' check(fulfillment_status in('new','preparing','ready','dispatched','delivered','cancelled')),
 add column admin_notes text not null default '' check(length(admin_notes)<=2000),
 add column shipping_carrier text not null default '' check(length(shipping_carrier)<=80),
 add column tracking_code text not null default '' check(length(tracking_code)<=120);
grant update(fulfillment_status,admin_notes,shipping_carrier,tracking_code) on public.tienda_pedidos to authenticated;
create policy tienda_orders_admin_update on public.tienda_pedidos for update to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
