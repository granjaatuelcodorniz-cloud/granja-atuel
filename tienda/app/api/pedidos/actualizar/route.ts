import {NextResponse} from 'next/server';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {orderDb,visitor,mp,reconcilePayment,checkoutReady,PaymentProviderError} from '@/lib/order-server';
export async function POST(request:Request){
 const reply=(b:unknown,s=200)=>NextResponse.json(b,{status:s,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!checkoutReady())return reply({error:'Configuración pendiente.'},503);
 try{const b=await readSmallJson(request);if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id))return reply({error:'Pedido inválido.'},400);const hash=await visitor();if(!hash)return reply({error:'Pedido no disponible en esta sesión.'},404);
 const db=orderDb();const {data:order}=await db.from('tienda_pedidos').select('id').eq('id',b.id).eq('visitor_hash',hash).maybeSingle();if(!order)return reply({error:'Pedido no disponible en esta sesión.'},404);
 // A return URL only supplies a lookup ID. Approval still comes exclusively
 // from Mercado Pago and must match this visitor's order, seller and amount.
 if(b.payment_id!==undefined){if(typeof b.payment_id!=='string'||!/^\d{1,30}$/.test(b.payment_id))return reply({error:'Identificador de pago inválido.'},400);await reconcilePayment(b.payment_id,order.id);return reply({ok:true});}
 const known=await db.from('tienda_pagos').select('payment_id').eq('order_id',order.id);if(known.error)throw new Error('No pudimos consultar los pagos.');
 if(known.data?.length){for(const p of known.data)await reconcilePayment(p.payment_id,order.id);return reply({ok:true});}
 const result=await mp('/v1/payments/search?external_reference='+encodeURIComponent(order.id)+'&sort=date_created&criteria=desc&limit=30');
 for(const p of result.results??[])await reconcilePayment(String(p.id),order.id);
 return reply({ok:true});
 }catch(e){return reply({error:e instanceof PaymentProviderError?`No pudimos consultar Mercado Pago (HTTP ${e.status} · ${e.code}). Volvé a intentar.`:'No pudimos verificar el pago en este momento. Volvé a intentar.'},503);}
}
