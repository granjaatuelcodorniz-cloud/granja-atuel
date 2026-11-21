-- Save delivery before opening a fixed Mercado Pago link.
-- Anonymous callers reach only narrow invoker functions and need the store server's key.
begin;
alter table public.tienda_pedidos
 add column payment_flow text not null default 'checkout_pro',
 add column link_reported_payment text check (link_reported_payment ~ '^[0-9]{1,30}$'),
 add column link_verified_payment text check (link_verified_payment ~ '^[0-9]{1,30}$'),
 add column link_verified_by uuid,
 add column link_verified_at timestamptz,
 add constraint tienda_pedidos_payment_flow_check check (
  (payment_flow='checkout_pro' and link_reported_payment is null and link_verified_payment is null and link_verified_by is null and link_verified_at is null)
  or (payment_flow='payment_link' and mode='production' and preference_id is null and checkout_url is null and payment_collector_id is null
      and ((link_verified_payment is null and link_verified_by is null and link_verified_at is null and status<>'approved')
           or (link_verified_payment is not null and link_verified_by is not null and link_verified_at is not null)))
 );

create table tienda_privado.link_order_keys (key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'));
alter table tienda_privado.link_order_keys enable row level security;
revoke all on tienda_privado.link_order_keys from public, anon, authenticated;
grant usage on schema tienda_privado to anon;

create function tienda_privado.link_order_authorized(p_key text)
returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is null and coalesce(p_key ~ '^[a-f0-9]{64}$',false)
  and exists(select 1 from tienda_privado.link_order_keys where key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex'))
$$;
revoke all on function tienda_privado.link_order_authorized(text) from public, anon, authenticated;

create function tienda_privado.create_link_order(
 p_key text,p_visitor text,p_request_key uuid,p_request_hash text,p_product text,p_total_cents bigint,
 p_name text,p_email text,p_delivery jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_order public.tienda_pedidos%rowtype;
 v_product public.tienda_productos%rowtype;
begin
 if not tienda_privado.link_order_authorized(p_key) then raise insufficient_privilege; end if;
 if not coalesce(p_visitor ~ '^[a-f0-9]{64}$',false) or not coalesce(p_request_hash ~ '^[a-f0-9]{64}$',false) or p_request_key is null
 or not coalesce(p_delivery ?& array['province','city','postal_code','address','phone','reference'],false)
 or exists(select 1 from unnest(array['province','city','postal_code','address','phone']) as f(key)
           where coalesce(jsonb_typeof(p_delivery->f.key),'')<>'string' or nullif(btrim(p_delivery->>f.key),'') is null)
 then raise exception 'LINK_ORDER_INVALID'; end if;

 perform pg_advisory_xact_lock(hashtextextended('tienda.link-order:'||p_visitor,0));
 select * into v_order from public.tienda_pedidos where visitor_hash=p_visitor and request_key=p_request_key;
 if found then
  if v_order.payment_flow<>'payment_link' or v_order.request_hash<>p_request_hash then raise exception 'LINK_ORDER_CONFLICT'; end if;
  return v_order.id;
 end if;
 if (select count(*) from public.tienda_pedidos where visitor_hash=p_visitor and payment_flow='payment_link' and created_at>now()-interval '1 hour')>=8
 then raise exception 'LINK_ORDER_LIMIT'; end if;
 select * into v_product from public.tienda_productos where id=p_product and active and available and (not stock_tracking or stock_quantity>0) for share;
 if not found or v_product.price::bigint*100 is distinct from p_total_cents then raise exception 'LINK_ORDER_CHANGED'; end if;

 insert into public.tienda_pedidos(visitor_hash,request_key,request_hash,customer_name,customer_email,mode,delivery,delivery_address,payment_flow,items,total_cents)
 values(p_visitor,p_request_key,p_request_hash,p_name,p_email,'production','shipping',p_delivery,'payment_link',
  jsonb_build_array(jsonb_build_object('id',v_product.id,'title',v_product.name||' · '||v_product.description,'quantity',1,'unit_price',v_product.price)),
  p_total_cents) returning id into v_order.id;
 return v_order.id;
end
$$;

create function tienda_privado.read_link_order(p_key text,p_visitor text,p_order uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_summary jsonb;
begin
 if not tienda_privado.link_order_authorized(p_key) then raise insufficient_privilege; end if;
 select jsonb_build_object(
  'id',id,'items',items,'total_cents',total_cents,'status',status,'expires_at',expires_at,
  'fulfillment_status',fulfillment_status,'shipping_carrier',shipping_carrier,'tracking_code',tracking_code,
  'link_reported_payment',link_reported_payment
 ) into v_summary from public.tienda_pedidos
 where id=p_order and visitor_hash=p_visitor and payment_flow='payment_link';
 return v_summary;
end
$$;

create function tienda_privado.report_link_payment(p_key text,p_visitor text,p_order uuid,p_payment text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not tienda_privado.link_order_authorized(p_key) then raise insufficient_privilege; end if;
 if not coalesce(p_payment ~ '^[0-9]{1,30}$',false) then raise exception 'LINK_PAYMENT_INVALID'; end if;
 update public.tienda_pedidos set link_reported_payment=p_payment
 where id=p_order and visitor_hash=p_visitor and payment_flow='payment_link'
       and status='awaiting_payment' and fulfillment_status<>'cancelled';
 return found;
end
$$;

create function tienda_privado.confirm_link_payment(p_order uuid,p_payment text,p_total_cents bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();
 v_order public.tienda_pedidos%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.tienda_admins where user_id=v_actor) then raise insufficient_privilege; end if;
 if not coalesce(p_payment ~ '^[0-9]{1,30}$',false) then raise exception 'LINK_PAYMENT_INVALID'; end if;
 select * into v_order from public.tienda_pedidos where id=p_order and payment_flow='payment_link' for update;
 if not found then return false; end if;
 if v_order.total_cents is distinct from p_total_cents or v_order.fulfillment_status='cancelled' then return false; end if;
 if v_order.status='approved' then return v_order.link_verified_payment=p_payment; end if;
 if v_order.status<>'awaiting_payment' or (v_order.link_reported_payment is not null and v_order.link_reported_payment<>p_payment)
 then return false; end if;
 -- A verified operation number can be assigned to only one order, including Checkout Pro orders.
 insert into public.tienda_pagos(payment_id,order_id,status,updated_at,amount_cents)
 values(p_payment,p_order,'approved',now(),v_order.total_cents);
 update public.tienda_pedidos set status='approved',link_verified_payment=p_payment,link_verified_by=v_actor,link_verified_at=now() where id=p_order;
 return true;
end
$$;

create function public.tienda_create_link_order(
 p_key text,p_visitor text,p_request_key uuid,p_request_hash text,p_product text,p_total_cents bigint,
 p_name text,p_email text,p_delivery jsonb
) returns uuid language sql security invoker set search_path='' as $$
 select tienda_privado.create_link_order(p_key,p_visitor,p_request_key,p_request_hash,p_product,p_total_cents,p_name,p_email,p_delivery)
$$;
create function public.tienda_read_link_order(p_key text,p_visitor text,p_order uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select tienda_privado.read_link_order(p_key,p_visitor,p_order)
$$;
create function public.tienda_report_link_payment(p_key text,p_visitor text,p_order uuid,p_payment text)
returns boolean language sql security invoker set search_path='' as $$
 select tienda_privado.report_link_payment(p_key,p_visitor,p_order,p_payment)
$$;
create function public.tienda_confirm_link_payment(p_order uuid,p_payment text,p_total_cents bigint)
returns boolean language sql security invoker set search_path='' as $$
 select tienda_privado.confirm_link_payment(p_order,p_payment,p_total_cents)
$$;

revoke all on function tienda_privado.create_link_order(text,text,uuid,text,text,bigint,text,text,jsonb),
 tienda_privado.read_link_order(text,text,uuid),tienda_privado.report_link_payment(text,text,uuid,text),
 public.tienda_create_link_order(text,text,uuid,text,text,bigint,text,text,jsonb),
 public.tienda_read_link_order(text,text,uuid),public.tienda_report_link_payment(text,text,uuid,text),
 tienda_privado.confirm_link_payment(uuid,text,bigint),public.tienda_confirm_link_payment(uuid,text,bigint)
 from public,anon,authenticated;
grant execute on function tienda_privado.create_link_order(text,text,uuid,text,text,bigint,text,text,jsonb),
 tienda_privado.read_link_order(text,text,uuid),tienda_privado.report_link_payment(text,text,uuid,text),
 public.tienda_create_link_order(text,text,uuid,text,text,bigint,text,text,jsonb),
 public.tienda_read_link_order(text,text,uuid),public.tienda_report_link_payment(text,text,uuid,text) to anon;
grant execute on function tienda_privado.confirm_link_payment(uuid,text,bigint),public.tienda_confirm_link_payment(uuid,text,bigint) to authenticated;
commit;
