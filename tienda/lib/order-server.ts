import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createHash,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {validPayment} from './checkout';
import {GranjaAtuelTestSeller,orderIdPattern,paymentConfig,paymentIdPattern,type PaymentConfig} from './payment-config';

export const currentPaymentConfig=()=>paymentConfig(process.env);
export function checkoutOrigin(request:Request,config:PaymentConfig) {
 const host=request.headers.get('host');
 const canonical=new URL(config.origin).host;
 const allowed=config.mode==='production'?[canonical]:[canonical,process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL];
 if(!host||!allowed.includes(host))throw new Error('Abrí la tienda desde su dirección oficial.');
 return 'https://'+host;
}
export function orderDb(){
 if(!currentPaymentConfig())throw new Error('Mercado Pago todavía no está disponible.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
}
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function visitor(create=false){
 const jar=await cookies();let token=jar.get('ga_order_visitor')?.value;
 if(create&&!/^[a-f0-9]{64}$/.test(token??'')){token=randomBytes(32).toString('hex');jar.set('ga_order_visitor',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:2592000});}
 return token&&/^[a-f0-9]{64}$/.test(token)?digest(token):null;
}
export class PaymentVerificationError extends Error {
 constructor(public code:string){super('No pudimos verificar el pago.');this.name='PaymentVerificationError';}
}
export class PaymentProviderError extends Error {
 constructor(public status:number,public code:string){super('Mercado Pago no pudo completar la consulta.');this.name='PaymentProviderError';}
}
export async function mp(config:PaymentConfig,path:string,options:RequestInit={}):Promise<Record<string,unknown>>{
 const headers=new Headers(options.headers);headers.set('Authorization','Bearer '+config.token);headers.set('Content-Type','application/json');
 const r=await fetch('https://api.mercadopago.com'+path,{...options,headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok){
  let code='unknown';
  try{const b=await r.json();const reason=b.error??b.code;if(['string','number'].includes(typeof reason)&&/^[a-zA-Z0-9_.-]{1,80}$/.test(String(reason)))code=String(reason);}
  catch{code='unreadable_response';}
  console.error('MP_API_ERROR',JSON.stringify({endpoint:path.split('?')[0].replace(/\d+/g,'id'),status:r.status,code}));
  throw new PaymentProviderError(r.status,code);
 }
 return r.json();
}

async function recordPayment(config:PaymentConfig,payment:Record<string,unknown>,lookupId:string,expectedOrderId?:string){
 const reference=payment.external_reference;
 if(String(payment.id)!==lookupId||(expectedOrderId&&reference!==expectedOrderId))throw new PaymentVerificationError('PAYMENT_REFERENCE');
 if(typeof reference!=='string'||!orderIdPattern.test(reference))return false;
 const db=orderDb();
 const {data:order,error}=await db.from('tienda_pedidos').select('id,total_cents,payment_collector_id').eq('id',reference).eq('mode',config.mode).eq('payment_flow','checkout_pro').maybeSingle();
 if(error)throw new PaymentVerificationError('PAYMENT_ORDER_READ');
 if(!order)return false;
 const seller=config.mode==='test'?GranjaAtuelTestSeller:order.payment_collector_id;
 if(!seller||!validPayment(payment,order,seller,config.mode))throw new PaymentVerificationError('PAYMENT_MISMATCH');
 const result=await db.rpc('tienda_register_payment',{p_order_id:order.id,p_payment_id:lookupId,p_status:payment.status,p_updated_at:payment.date_last_updated,p_amount_cents:order.total_cents});
 if(result.error){console.error('PAYMENT_REGISTER_ERROR',result.error.code);throw new PaymentVerificationError('PAYMENT_REGISTER');}
 return true;
}
export async function reconcilePayment(config:PaymentConfig,paymentId:string,expectedOrderId?:string){
 if(!paymentIdPattern.test(paymentId))throw new PaymentVerificationError('PAYMENT_ID');
 return recordPayment(config,await mp(config,'/v1/payments/'+paymentId),paymentId,expectedOrderId);
}

export async function reconcileOrder(config:PaymentConfig,orderId:string,paymentId?:string) {
 if(paymentId)return await reconcilePayment(config,paymentId,orderId)?1:0;
 const {data:known,error}=await orderDb().from('tienda_pagos').select('payment_id').eq('order_id',orderId).order('updated_at',{ascending:false}).limit(20);
 if(error)throw new PaymentVerificationError('PAYMENT_ORDER_READ');
 const ids=new Set<string>();
 try{
  const q=new URLSearchParams({external_reference:orderId,sort:'date_created',criteria:'desc',limit:'20'});
  const result=await mp(config,'/v1/payments/search?'+q);
  if(!Array.isArray(result.results))throw new PaymentVerificationError('PAYMENT_SEARCH');
  for(const row of result.results)if(row&&row.external_reference===orderId&&paymentIdPattern.test(String(row.id)))ids.add(String(row.id));
 }catch(e){if(!known?.length)throw e;}
 // Search even when a previous attempt is known: a newer approved payment may exist.
 for(const row of known??[])if(paymentIdPattern.test(row.payment_id))ids.add(row.payment_id);
 let checked=0;
 const candidates=[...ids].slice(0,20);
 for(let k=0;k<candidates.length;k+=4){
  const checkedBatch=await Promise.all(candidates.slice(k,k+4).map(id=>reconcilePayment(config,id,orderId)));
  checked+=checkedBatch.filter(Boolean).length;
 }
 return checked;
}
