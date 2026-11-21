import {NextResponse} from 'next/server';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {orderDb,reconcileOrder,currentPaymentConfig} from '@/lib/order-server';
import {orderVisitor} from '@/lib/order-access';
import {orderIdPattern,paymentIdPattern} from '@/lib/payment-config';

export async function POST(request:Request){
 const reply=(b:unknown,status=200)=>NextResponse.json(b,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 const config=currentPaymentConfig();
 if(!config)return reply({error:'Mercado Pago todavía no está disponible.'},503);
 let b;
 try{b=await readSmallJson(request);}catch{return reply({error:'Revisá el pedido.'},400);}
 if(typeof b.id!=='string'||!orderIdPattern.test(b.id))return reply({error:'Pedido inválido.'},400);
 if(b.payment_id!==undefined&&(typeof b.payment_id!=='string'||!paymentIdPattern.test(b.payment_id)))return reply({error:'Identificador de pago inválido.'},400);
 try{
  const hash=await orderVisitor(b.id);if(!hash)return reply({error:'Pedido no disponible en esta sesión.'},404);
  const {data:order,error}=await orderDb().from('tienda_pedidos').select('id').eq('mode',config.mode).eq('payment_flow','checkout_pro').eq('id',b.id).eq('visitor_hash',hash).maybeSingle();
  if(error)return reply({error:'No pudimos consultar el pedido.'},503);
  if(!order)return reply({error:'Pedido no disponible en esta sesión.'},404);
  const matched=await reconcileOrder(config,order.id,b.payment_id);
  return reply({ok:true,matched});
 }catch{return reply({error:'No pudimos verificar el pago en este momento. Volvé a intentar.'},503);}
}
