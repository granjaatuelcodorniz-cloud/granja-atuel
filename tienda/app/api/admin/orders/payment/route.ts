import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {currentPaymentConfig,reconcileOrder} from '@/lib/order-server';
import {orderIdPattern,paymentIdPattern} from '@/lib/payment-config';
import {adminOrderFields} from '@/lib/admin';

export async function POST(request:Request){
 const access=await authorizeAdmin(request);
 if(access.error)return access.error;
 const config=currentPaymentConfig();
 if(!config)return adminReply({error:'Mercado Pago todavía no está disponible.'},503);
 let b;
 try{b=await readSmallJson(request);}catch{return adminReply({error:'Revisá el pedido.'},400);}
 if(typeof b.id!=='string'||!orderIdPattern.test(b.id))return adminReply({error:'Pedido inválido.'},400);
 // Only use the optional ID for a previously verified merchant's transaction.
 if(b.payment_id!==undefined&&(typeof b.payment_id!=='string'||!paymentIdPattern.test(b.payment_id)))return adminReply({error:'Ingresá el número de pago que figura en Mercado Pago.'},400);
 const db=await supabaseServer();
 const {data:before,error:readError}=await db.from('tienda_pedidos').select('id').eq('id',b.id).eq('mode',config.mode).maybeSingle();
 if(readError)return adminReply({error:'No pudimos consultar el pedido.'},503);
 if(!before)return adminReply({error:'Pedido no disponible.'},404);
 try{
  const matched=await reconcileOrder(config,b.id,b.payment_id);
  const result=await db.from('tienda_pedidos').select(adminOrderFields).eq('id',b.id).eq('mode',config.mode).single();
  if(result.error)return adminReply({error:'Actualizá el panel para ver el estado confirmado.'},503);
  return adminReply({order:result.data,matched});
 }catch{return adminReply({error:'No se pudo verificar un pago para este pedido. Revisá la referencia en Mercado Pago e intentá de nuevo.'},503);}
}
