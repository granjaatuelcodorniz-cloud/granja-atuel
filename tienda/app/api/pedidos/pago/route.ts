import {NextResponse} from 'next/server';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {indexableHost} from '@/lib/site-release';
import {orderVisitor} from '@/lib/order-access';
import {orderIdPattern,paymentIdPattern} from '@/lib/payment-config';
import {linkOrdersConfigured,reportLinkPayment} from '@/lib/link-orders';

export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request)||!indexableHost(request.headers.get('host')))return reply({error:'Origen no permitido.'},403);
 if(!linkOrdersConfigured())return reply({error:'El registro de pagos no está disponible ahora.'},503);
 let input;
 try{input=await readSmallJson(request);}catch{return reply({error:'Revisá el número de operación.'},400);}
 if(typeof input.id!=='string'||!orderIdPattern.test(input.id)||typeof input.payment_id!=='string'||!paymentIdPattern.test(input.payment_id))
  return reply({error:'Ingresá el número de operación de Mercado Pago (solo números).'},400);
 try{
  const hash=await orderVisitor(input.id);
  if(!hash||!await reportLinkPayment(input.id,hash,input.payment_id))return reply({error:'El pedido no está disponible en este navegador o su pago ya fue revisado.'},404);
  return reply({ok:true});
 }catch{return reply({error:'No pudimos guardar el número de operación. Intentá de nuevo.'},503);}
}
