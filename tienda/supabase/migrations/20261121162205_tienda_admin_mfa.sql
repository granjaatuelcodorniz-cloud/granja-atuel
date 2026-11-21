-- Keep visitor checkout and public reads available. Administrative grants require AAL2.
begin;

create function tienda_privado.admin_has_mfa()
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select auth.jwt()->>'aal')='aal2',false)
  and exists(select 1 from public.tienda_admins where user_id=(select auth.uid()))
$$;
revoke all on function tienda_privado.admin_has_mfa() from public,anon,authenticated;
grant execute on function tienda_privado.admin_has_mfa() to authenticated;

alter policy tienda_orders_admin_read on public.tienda_pedidos
 using ((select tienda_privado.admin_has_mfa()));
alter policy tienda_orders_admin_update on public.tienda_pedidos
 using ((select tienda_privado.admin_has_mfa()))
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_catalog_admin_read on public.tienda_productos
 using ((select tienda_privado.admin_has_mfa()));
alter policy tienda_catalog_admin_insert on public.tienda_productos
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_catalog_admin_update on public.tienda_productos
 using ((select tienda_privado.admin_has_mfa()))
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_stock_admin_read on public.tienda_stock_movimientos
 using ((select tienda_privado.admin_has_mfa()));
alter policy tienda_media_admin on public.tienda_imagenes
 using ((select tienda_privado.admin_has_mfa()))
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_settings_admin_update on public.tienda_configuracion
 using ((select tienda_privado.admin_has_mfa()))
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_content_admin_read on public.tienda_contenidos
 using ((select tienda_privado.admin_has_mfa()));
alter policy tienda_content_admin_insert on public.tienda_contenidos
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_content_admin_update on public.tienda_contenidos
 using ((select tienda_privado.admin_has_mfa()))
 with check ((select tienda_privado.admin_has_mfa()));
alter policy tienda_images_admin_select on storage.objects
 using (bucket_id='tienda-productos' and (select tienda_privado.admin_has_mfa()));
alter policy tienda_images_admin_insert on storage.objects
 with check (bucket_id='tienda-productos' and (storage.foldername(name))[1]='products' and (select tienda_privado.admin_has_mfa()));
alter policy incubation_admin_read on public.incubacion_lotes
 using ((select tienda_privado.admin_has_mfa()));
alter policy incubation_delivery_admin_read on public.incubacion_entregas
 using ((select tienda_privado.admin_has_mfa()));
alter policy incubation_delivery_admin_insert on public.incubacion_entregas
 with check ((select tienda_privado.admin_has_mfa()));
alter policy incubation_delivery_admin_update on public.incubacion_entregas
 using ((select tienda_privado.admin_has_mfa()))
 with check ((select tienda_privado.admin_has_mfa()));

create or replace function tienda_privado.adjust_stock(
 p_product_id text,p_delta integer,p_reason text,p_request_key uuid,p_expected_quantity integer
) returns integer language plpgsql security definer set search_path='' as $$
begin
 if not tienda_privado.admin_has_mfa() then raise insufficient_privilege; end if;
 return public.tienda_adjust_stock(p_product_id,p_delta,p_reason,auth.uid(),p_request_key,p_expected_quantity);
end
$$;

create or replace function tienda_privado.confirm_link_payment(p_order uuid,p_payment text,p_total_cents bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();
 v_order public.tienda_pedidos%rowtype;
begin
 if not tienda_privado.admin_has_mfa() then raise insufficient_privilege; end if;
 if not coalesce(p_payment ~ '^[0-9]{1,30}$',false) then raise exception 'LINK_PAYMENT_INVALID'; end if;
 select * into v_order from public.tienda_pedidos where id=p_order and payment_flow='payment_link' for update;
 if not found then return false; end if;
 if v_order.total_cents is distinct from p_total_cents or v_order.fulfillment_status='cancelled' then return false; end if;
 if v_order.status='approved' then return v_order.link_verified_payment=p_payment; end if;
 if v_order.status<>'awaiting_payment' or (v_order.link_reported_payment is not null and v_order.link_reported_payment<>p_payment)
 then return false; end if;
 insert into public.tienda_pagos(payment_id,order_id,status,updated_at,amount_cents)
 values(p_payment,p_order,'approved',now(),v_order.total_cents);
 update public.tienda_pedidos set status='approved',link_verified_payment=p_payment,link_verified_by=v_actor,link_verified_at=now() where id=p_order;
 return true;
end
$$;
commit;
