-- Test-only orders. No connection to internal sales, stock or dispatch.
create table public.tienda_pedidos (
 id uuid primary key default gen_random_uuid(), visitor_hash text not null check(length(visitor_hash)=64),
 request_key uuid not null, request_hash text not null,
 mode text not null default 'test' check(mode='test'),
 customer_name text not null check(length(customer_name) between 2 and 100),
 customer_email text not null check(length(customer_email) between 3 and 254),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 20),
 total_cents bigint not null check(total_cents between 100 and 10000000000),currency text not null default 'ARS' check(currency='ARS'),
 delivery text not null default 'simulated_pickup' check(delivery='simulated_pickup'),
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','pending','approved','rejected','cancelled','refunded','charged_back')),
 preference_id text unique,checkout_url text,
 created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '1 hour'),
 unique(visitor_hash,request_key)
);
create index tienda_pedidos_created on public.tienda_pedidos(created_at desc);
alter table public.tienda_pedidos enable row level security;
revoke all on public.tienda_pedidos from anon,authenticated;
grant select on public.tienda_pedidos to authenticated;
grant all on public.tienda_pedidos to service_role;
create policy tienda_orders_admin_read on public.tienda_pedidos for select to authenticated using(exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
create table public.tienda_pagos (
 payment_id text primary key,order_id uuid not null references public.tienda_pedidos(id),
 status text not null check(status in ('pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back')),
 updated_at timestamptz not null,amount_cents bigint not null check(amount_cents>0)
);
create index tienda_pagos_order on public.tienda_pagos(order_id);
alter table public.tienda_pagos enable row level security;
revoke all on public.tienda_pagos from anon,authenticated;
grant all on public.tienda_pagos to service_role;
-- Row lock makes repeated/concurrent callbacks and multiple attempts deterministic.
create function public.tienda_register_payment(p_order_id uuid,p_payment_id text,p_status text,p_updated_at timestamptz,p_amount_cents bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare expected bigint; begin
 select total_cents into expected from public.tienda_pedidos where id=p_order_id for update;
 if expected is null or expected<>p_amount_cents then raise exception 'Payment amount/order mismatch'; end if;
 if exists(select 1 from public.tienda_pagos where payment_id=p_payment_id and order_id<>p_order_id) then raise exception 'Payment already assigned'; end if;
 insert into public.tienda_pagos(payment_id,order_id,status,updated_at,amount_cents) values(p_payment_id,p_order_id,p_status,p_updated_at,p_amount_cents)
 on conflict(payment_id) do update set status=excluded.status,updated_at=excluded.updated_at where public.tienda_pagos.updated_at<excluded.updated_at;
 update public.tienda_pedidos set status=case
 when exists(select 1 from public.tienda_pagos where order_id=p_order_id and status='approved') then 'approved'
 when exists(select 1 from public.tienda_pagos where order_id=p_order_id and status='charged_back') then 'charged_back'
 when exists(select 1 from public.tienda_pagos where order_id=p_order_id and status='refunded') then 'refunded'
 when exists(select 1 from public.tienda_pagos where order_id=p_order_id and status in('pending','in_process','authorized')) then 'pending'
 when exists(select 1 from public.tienda_pagos where order_id=p_order_id and status='rejected') then 'rejected'
 else 'cancelled' end where id=p_order_id;
end $$;
revoke all on function public.tienda_register_payment(uuid,text,text,timestamptz,bigint) from public,anon,authenticated;
grant execute on function public.tienda_register_payment(uuid,text,text,timestamptz,bigint) to service_role;
