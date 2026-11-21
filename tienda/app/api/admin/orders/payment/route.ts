import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {currentPaymentConfig,reconcileOrder} from '@/lib/order-server';
import {indexableHost} from '@/lib/site-release';
import {orderIdPattern,paymentIdPattern,shopMode} from '@/lib/payment-config';
import {adminOrderFields} from '@/lib/admin';

export async function POST(request:Request){
 const access=await authorizeAdmin(request);
 if(access.error)return access.error;
 const config=currentPaymentConfig();
 let b;
 try{b=await readSmallJson(request);}catch{return adminReply({error:'Revisá el pedido.'},400);}
 if(typeof b.id!=='string'||!orderIdPattern.test(b.id))return adminReply({error:'Pedido inválido.'},400);
 // Only use the optional ID for a previously verified merchant's transaction.
 if(b.payment_id!==undefined&&(typeof b.payment_id!=='string'||!paymentIdPattern.test(b.payment_id)))return adminReply({error:'Ingresá el número de pago que figura en Mercado Pago.'},400);
 const db=await supabaseServer();
 const mode=shopMode(process.env);
 const {data:before,error:readError}=await db.from('tienda_pedidos').select('id,payment_flow,total_cents').eq('id',b.id).eq('mode',mode).maybeSingle();
 if(readError)return adminReply({error:'No pudimos consultar el pedido.'},503);
 if(!before)return adminReply({error:'Pedido no disponible.'},404);
 if(before.payment_flow==='payment_link'){
  if(!indexableHost(request.headers.get('host')))return adminReply({error:'Abrí Pedidos desde el dominio oficial de la tienda.'},403);
  if(b.manual_confirmed!==true||typeof b.payment_id!=='string')return adminReply({error:'Verificá la operación y el total en Mercado Pago antes de confirmar.'},400);
  const {data,error}=await db.rpc('tienda_confirm_link_payment',{p_order:b.id,p_payment:b.payment_id,p_total_cents:Number(before.total_cents)});
  if(error?.code==='23505')return adminReply({error:'Esa operación ya está registrada en otro pedido.'},409);
  if(error)return adminReply({error:'No pudimos guardar la confirmación del pago.'},503);
  if(data!==true)return adminReply({error:'El pedido o el número informado cambió. Actualizá antes de confirmar.'},409);
  const result=await db.from('tienda_pedidos').select(adminOrderFields).eq('id',b.id).eq('mode',mode).single();
  if(result.error)return adminReply({error:'Actualizá el panel para ver el pago confirmado.'},503);
  return adminReply({order:result.data,manual:true,matched:1});
 }
 if(!config)return adminReply({error:'Mercado Pago todavía no está disponible.'},503);
 try{
  const matched=await reconcileOrder(config,b.id,b.payment_id);
  const result=await db.from('tienda_pedidos').select(adminOrderFields).eq('id',b.id).eq('mode',config.mode).single();
  if(result.error)return adminReply({error:'Actualizá el panel para ver el estado confirmado.'},503);
  return adminReply({order:result.data,matched});
 }catch{return adminReply({error:'No se pudo verificar un pago para este pedido. Revisá la referencia en Mercado Pago e intentá de nuevo.'},503);}
}
