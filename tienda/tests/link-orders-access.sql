-- Test against the migrated database. All writes below are rolled back.
begin;
do $$
declare
 k text := repeat('e',64);
 v text := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 rid uuid := gen_random_uuid();
 sample uuid;
 another uuid;
 admin_id uuid;
 pid text;
 cents bigint;
 op text := '97'||lpad((random()*999999999999999)::bigint::text,15,'0');
 dest jsonb := '{"province":"Mendoza","city":"San Rafael","postal_code":"5600","address":"Domicilio de prueba 123","phone":"260 4000000","reference":""}';
 summary jsonb;
begin
 select user_id into strict admin_id from public.tienda_admins limit 1;
 select id,price::bigint*100 into strict pid,cents from public.tienda_productos
 where active and available and (not stock_tracking or stock_quantity>0) limit 1;
 insert into tienda_privado.link_order_keys(key_hash) values(encode(sha256(convert_to(k,'UTF8')),'hex')) on conflict do nothing;
 if has_table_privilege('anon','public.tienda_pedidos','SELECT,INSERT,UPDATE')
    or has_table_privilege('anon','tienda_privado.link_order_keys','SELECT')
    or has_function_privilege('anon','public.tienda_confirm_link_payment(uuid,text,bigint)','EXECUTE')
 then raise exception 'unexpected privilege'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 set local role anon;
 begin
  perform public.tienda_create_link_order(repeat('f',64),v,rid,v,pid,cents,'Persona de prueba','qa@example.invalid',dest);
  raise exception 'incorrect server key accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.tienda_create_link_order(k,v,rid,v,pid,cents,'Persona de prueba','qa@example.invalid',dest-'address');
  raise exception 'incomplete address accepted';
 exception when raise_exception then if sqlerrm<>'LINK_ORDER_INVALID' then raise; end if;
 end;
 begin
  perform public.tienda_create_link_order(k,v,rid,v,pid,cents-1,'Persona de prueba','qa@example.invalid',dest);
  raise exception 'incorrect price accepted';
 exception when raise_exception then if sqlerrm<>'LINK_ORDER_CHANGED' then raise; end if;
 end;
 sample:=public.tienda_create_link_order(k,v,rid,v,pid,cents,'Persona de prueba','qa@example.invalid',dest);
 if sample is null or public.tienda_create_link_order(k,v,rid,v,pid,cents,'Persona de prueba','qa@example.invalid',dest)<>sample
 then raise exception 'checkout retry did not return the same order'; end if;
 another:=public.tienda_create_link_order(k,v,gen_random_uuid(),v,pid,cents,'Persona de prueba','qa@example.invalid',dest);
 if public.tienda_read_link_order(k,repeat('0',64),sample) is not null
    or public.tienda_report_link_payment(k,repeat('0',64),sample,op)
 then raise exception 'foreign browser accessed the order'; end if;
 if not public.tienda_report_link_payment(k,v,sample,op) then raise exception 'operation was not reported'; end if;
 summary:=public.tienda_read_link_order(k,v,sample);
 if summary is null or summary->>'status'<>'awaiting_payment' or summary->>'link_reported_payment'<>op
    or summary ?| array['customer_name','customer_email','delivery_address','visitor_hash']
 then raise exception 'reported operation approved itself or summary leaked personal data'; end if;
 reset role;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 set local role authenticated;
 begin
  perform public.tienda_confirm_link_payment(sample,op,cents);
  raise exception 'a non-admin approved an operation';
 exception when insufficient_privilege then null;
 end;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 if public.tienda_confirm_link_payment(sample,'0',cents) then raise exception 'a different operation was accepted'; end if;
 if public.tienda_confirm_link_payment(sample,op,cents-1) then raise exception 'the wrong amount was accepted'; end if;
 if not public.tienda_confirm_link_payment(sample,op,cents) then raise exception 'admin confirmation failed'; end if;
 if not public.tienda_confirm_link_payment(sample,op,cents) then raise exception 'admin confirmation retry failed'; end if;
 begin
  perform public.tienda_confirm_link_payment(another,op,cents);
  raise exception 'duplicate operation was approved';
 exception when unique_violation then null;
 end;
 reset role;
 if not exists(select 1 from public.tienda_pedidos where id=sample and delivery_address=dest
    and link_verified_by=admin_id and status='approved')
    or not exists(select 1 from public.tienda_pagos where order_id=sample and payment_id=op and amount_cents=cents)
 then raise exception 'delivery or audit trail missing'; end if;
end
$$;
rollback;
