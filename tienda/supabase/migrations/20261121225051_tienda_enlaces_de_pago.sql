begin;

create table public.tienda_enlaces_pago (
 product_id text primary key references public.tienda_productos(id) on delete cascade,
 url text not null check (url ~ '^https://mpago[.]la/[A-Za-z0-9]{1,80}/?$'),
 amount_ars integer not null check (amount_ars between 1 and 100000000),
 updated_at timestamptz not null default now()
);
alter table public.tienda_enlaces_pago enable row level security;
revoke all on public.tienda_enlaces_pago from public, anon, authenticated;
grant select,insert,update on public.tienda_enlaces_pago to authenticated;
create policy tienda_enlaces_admin on public.tienda_enlaces_pago for all to authenticated
 using ((select tienda_privado.admin_has_mfa())) with check ((select tienda_privado.admin_has_mfa()));

-- Preserve the existing fixed links and their amounts, even if a catalog price has changed.
insert into public.tienda_enlaces_pago(product_id,url,amount_ars)
select p.id,v.url,v.amount from (values
 ('consumo-5','https://mpago.la/11TRxkJ',25000),
 ('consumo-10','https://mpago.la/1HPrFSq',38000),
 ('fertiles-5','https://mpago.la/2qbsnRt',54000),
 ('fertiles-10','https://mpago.la/27Cp2BJ',98000),
 ('blister-200','https://mpago.la/1yqnBnb',82000)
) as v(id,url,amount) join public.tienda_productos p on p.id=v.id;

-- The storefront server can resolve checkout links with the existing order key.
create function tienda_privado.payment_links(p_key text)
returns table(product_id text,url text,amount_ars integer)
language plpgsql stable security definer set search_path='' as $$
begin
 if not tienda_privado.link_order_authorized(p_key) then raise insufficient_privilege; end if;
 return query select l.product_id,l.url,l.amount_ars
 from public.tienda_enlaces_pago l join public.tienda_productos p on p.id=l.product_id
 where p.active and p.available and (not p.stock_tracking or p.stock_quantity>0) and p.price=l.amount_ars;
end
$$;
create function public.tienda_payment_links(p_key text)
returns table(product_id text,url text,amount_ars integer)
language sql stable security invoker set search_path='' as $$
 select * from tienda_privado.payment_links(p_key)
$$;
revoke all on function tienda_privado.payment_links(text),public.tienda_payment_links(text) from public,anon,authenticated;
grant execute on function tienda_privado.payment_links(text),public.tienda_payment_links(text) to anon;

commit;
