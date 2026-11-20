-- Entorno paralelo. Solo crea objetos tienda_*; no cambia las tablas de gestión.
begin;
create table public.tienda_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.tienda_admins enable row level security;
revoke all on public.tienda_admins from anon, authenticated;
grant select on public.tienda_admins to authenticated;
create policy tienda_admin_read_self on public.tienda_admins for select to authenticated using (user_id=(select auth.uid()));

create table public.tienda_productos (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  name text not null check (char_length(name) between 3 and 100),
  description text not null default '' check (char_length(description)<=500),
  category text not null check(category in ('consumo','fertiles','insumos')),
  price integer not null check(price between 1 and 100000000),
  image text not null,
  active boolean not null default false,
  available boolean not null default false,
  weight_grams integer check(weight_grams between 1 and 100000),
  height_cm integer check(height_cm between 1 and 100000),
  width_cm integer check(width_cm between 1 and 100000),
  length_cm integer check(length_cm between 1 and 100000),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.tienda_productos enable row level security;
revoke all on public.tienda_productos from anon,authenticated;
grant select on public.tienda_productos to anon,authenticated;
grant update(name,description,category,price,image,active,available,weight_grams,height_cm,width_cm,length_cm,updated_at) on public.tienda_productos to authenticated;
create policy tienda_catalog_public on public.tienda_productos for select to anon,authenticated using (active);
create policy tienda_catalog_admin_read on public.tienda_productos for select to authenticated using (exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
create policy tienda_catalog_admin_update on public.tienda_productos for update to authenticated using (exists(select 1 from public.tienda_admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));

-- Owner bootstrap from the existing verified auth account. No user-editable metadata.
insert into public.tienda_admins(user_id) select id from auth.users where email='marcos@finanzas.local';
insert into public.tienda_productos(id,name,description,category,price,image,active,available,sort_order) values
('consumo-5','Huevos de consumo','5 docenas · 60 huevos','consumo',25000,'/huevos-consumo1.webp',true,true,1),
('consumo-10','Huevos de consumo','10 docenas · 120 huevos','consumo',38000,'/huevos-consumo1.webp',true,true,2),
('fertiles-5','Huevos fértiles','5 docenas · 60 huevos para incubar','fertiles',54000,'/huevos-fertiles1.webp',true,true,3),
('fertiles-10','Huevos fértiles','10 docenas · 120 huevos para incubar','fertiles',98000,'/huevos-fertiles1.webp',true,true,4),
('blister-200','Blíster para codorniz','200 unidades · Capacidad de una docena','insumos',82000,'/maples-x-200-unidades.webp',true,true,5);
commit;
