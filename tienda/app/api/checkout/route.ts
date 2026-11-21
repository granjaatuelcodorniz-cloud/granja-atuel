import {NextResponse} from 'next/server';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {validateCheckout,priceOrder,type OrderItem} from '@/lib/checkout';
import {checkoutOrigin,currentPaymentConfig,orderDb,visitor,digest,mp} from '@/lib/order-server';
import {checkoutAvailable,preferenceSeller} from '@/lib/payment-config';
import {getPurchaseMode} from '@/lib/current-purchase';
import {indexableHost} from '@/lib/site-release';
import {LinkOrderError,linkOrdersConfigured,saveLinkOrder} from '@/lib/link-orders';
import {getShopSettings} from '@/lib/shop-settings';

export async function POST(request:Request){
 const reply=(b:unknown,status=200)=>NextResponse.json(b,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 const useLink=getPurchaseMode()==='links',config=currentPaymentConfig();
 if(useLink){
  if(!indexableHost(request.headers.get('host')))return reply({error:'Abrí la tienda desde su dirección oficial.'},403);
  if(!linkOrdersConfigured())return reply({error:'La compra en línea no está disponible ahora.'},503);
 }else if(!config||!checkoutAvailable(config,process.env))return reply({error:'Mercado Pago todavía no está disponible.'},503);
 let body;
 try{body=await readSmallJson(request);}catch(e){return reply({error:e instanceof Error?e.message:'Revisá el pedido.'},400);}
 let requiresDni;
 try{requiresDni=(await getShopSettings({strict:true})).require_recipient_dni;}
 catch{return reply({error:'No pudimos verificar los datos que requiere el envío. Intentá de nuevo.'},503);}
 let input;
 try{input=validateCheckout(body,requiresDni);}catch(e){return reply({error:e instanceof Error?e.message:'Revisá el pedido.'},400);}
 if(useLink){
  try{
   const hash=await visitor(true);
   if(!hash)return reply({error:'No pudimos identificar esta sesión.'},400);
   const id=await saveLinkOrder(input,hash);
   return reply({redirect:'/pedido/'+id});
  }catch(e){return e instanceof LinkOrderError?reply({error:e.message},e.status):reply({error:'No pudimos guardar tus datos. Intentá de nuevo.'},503);}
 }
 if(!config)return reply({error:'Mercado Pago todavía no está disponible.'},503);
 try{
  const returnOrigin=checkoutOrigin(request,config);
  const db=orderDb(),hash=await visitor(true);
  if(!hash)return reply({error:'No pudimos identificar esta sesión.'},400);
  const requestHash=digest(JSON.stringify({name:input.name,email:input.email,lines:input.lines,expected_total_cents:input.expected_total_cents,delivery_address:input.delivery_address}));
  const {data:previous,error:readError}=await db.from('tienda_pedidos').select('*').eq('mode',config.mode).eq('payment_flow','checkout_pro').eq('visitor_hash',hash).eq('request_key',input.request_key).maybeSingle();
  if(readError)throw new Error('No pudimos consultar el pedido.');
  let order=previous;
  if(!order){
   const {data:products,error}=await db.from('tienda_productos').select('*').in('id',input.lines.map(l=>l.id));
   if(error)throw new Error('No pudimos verificar el catálogo.');
   let values;
   try{values=priceOrder(input.lines,products??[]);}catch(e){return reply({error:e instanceof Error?e.message:'Revisá tu carrito.'},409);}
   if(values.total_cents!==input.expected_total_cents)return reply({error:'El precio cambió. Recargá para revisar el total antes de pagar.'},409);
   const created=await db.from('tienda_pedidos').insert({
    visitor_hash:hash,request_key:input.request_key,request_hash:requestHash,customer_name:input.name,customer_email:input.email,
    mode:config.mode,delivery:config.mode==='test'?'simulated_shipping':'shipping',delivery_address:input.delivery_address,...values
   }).select().single();
   if(created.error?.code==='23505')return reply({error:'El pedido ya se está procesando. Volvé a intentar en unos segundos.'},409);
   if(created.error)throw new Error('No pudimos guardar el pedido.');
   order=created.data;
  }
  if(order.request_hash!==requestHash)return reply({error:'El carrito o tus datos cambiaron. Recargá para iniciar otro pedido.'},409);
  if(['approved','refunded','charged_back'].includes(order.status))return reply({redirect:'/pedido/'+order.id});
  if(Date.parse(order.expires_at)<Date.now())return reply({error:'El pedido venció. Recargá para generar uno nuevo.'},409);
  if(order.checkout_url)return reply({redirect:order.checkout_url});
  const lock='creating:'+order.id;
  const claim=await db.from('tienda_pedidos').update({preference_id:lock}).eq('id',order.id).is('preference_id',null).select('id');
  if(claim.error)throw new Error('No pudimos preparar el pago.');
  if(!claim.data?.length)return reply({error:'El pago se está preparando. Volvé a intentar en unos segundos.'},409);
  try{
   const back=returnOrigin+'/pedido/'+order.id;
   const preference=await mp(config,'/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':order.id},body:JSON.stringify({
    items:(order.items as OrderItem[]).map(i=>({...i,currency_id:'ARS'})),
    external_reference:order.id,back_urls:{success:back,pending:back,failure:back},auto_return:'approved',
    expires:true,expiration_date_to:order.expires_at,
    ...(config.webhookSecret?{notification_url:config.origin+'/api/mercadopago/webhook'}:{})
   })});
   const collector=preferenceSeller(preference,order.id,config.mode);
   if(!collector||typeof preference.id!=='string'||!preference.id||typeof preference.init_point!=='string')throw new Error('El cobro no pudo vincularse a la aplicación de Granja Atuel.');
   const url=new URL(preference.init_point);
   if(url.protocol!=='https:'||url.username||url.password||!['www.mercadopago.com.ar','mercadopago.com.ar','sandbox.mercadopago.com.ar'].includes(url.hostname))throw new Error('Mercado Pago devolvió un enlace inválido.');
   const saved=await db.from('tienda_pedidos').update({preference_id:preference.id,checkout_url:url.href,payment_collector_id:collector}).eq('id',order.id).eq('preference_id',lock).select('id').maybeSingle();
   if(saved.error||!saved.data)throw new Error('No pudimos guardar el enlace de pago.');
   return reply({redirect:url.href});
  }catch(e){await db.from('tienda_pedidos').update({preference_id:null}).eq('id',order.id).eq('preference_id',lock);throw e;}
 }catch(e){
  return reply({error:e instanceof TypeError?'No pudimos conectar con Mercado Pago. Intentá de nuevo.':e instanceof Error?e.message:'No pudimos iniciar el pago. Intentá de nuevo.'},503);
 }
}
