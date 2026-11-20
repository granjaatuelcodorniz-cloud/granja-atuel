-- Keep the inventory ledger writable by store admins without a project-wide service key.
create schema if not exists tienda_privado;
revoke all on schema tienda_privado from public, anon, authenticated;
grant usage on schema tienda_privado to authenticated;

create function tienda_privado.adjust_stock(
  p_product_id text,p_delta integer,p_reason text,p_request_key uuid,p_expected_quantity integer
)
returns integer language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists(select 1 from public.tienda_admins where user_id=v_actor) then
    raise insufficient_privilege using message='Administrator required';
  end if;
  return public.tienda_adjust_stock(p_product_id,p_delta,p_reason,v_actor,p_request_key,p_expected_quantity);
end
$$;
revoke all on function tienda_privado.adjust_stock(text,integer,text,uuid,integer) from public,anon,authenticated;
grant execute on function tienda_privado.adjust_stock(text,integer,text,uuid,integer) to authenticated;

create function public.tienda_adjust_stock_as_admin(
  p_product_id text,p_delta integer,p_reason text,p_request_key uuid,p_expected_quantity integer
)
returns integer language sql security invoker set search_path='' as $$
  select tienda_privado.adjust_stock(p_product_id,p_delta,p_reason,p_request_key,p_expected_quantity)
$$;
revoke all on function public.tienda_adjust_stock_as_admin(text,integer,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.tienda_adjust_stock_as_admin(text,integer,text,uuid,integer) to authenticated;
