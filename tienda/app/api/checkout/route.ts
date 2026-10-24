import {NextResponse} from 'next/server';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {validateCheckout,priceOrder} from '@/lib/checkout';
import {checkoutOrigin,checkoutReady,orderDb,visitor,digest,mp,testSeller,shopOrigin} from '@/lib/order-server';
export async function POST(request:Request){
 const reply=(b:unknown,status=200)=>NextResponse.json(b,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!checkoutReady())return reply({error:'El pago de prueba está pendiente de configuración.'},503);
 let input;try{input=validateCheckout(await readSmallJson(request));}catch(e){return reply({error:e instanceof Error?e.message:'Revisá el pedido.'},400);}
 try{
 const returnOrigin=checkoutOrigin(request);const db=orderDb(),hash=await visitor(true);if(!hash)return reply({error:'No pudimos identificar esta sesión.'},400);
 const requestHash=digest(JSON.stringify({name:input.name,email:input.email,lines:input.lines,expected_total_cents:input.expected_total_cents}));
 const {data:previous,error:readError}=await db.from('tienda_pedidos').select('*').eq('visitor_hash',hash).eq('request_key',input.request_key).maybeSingle();if(readError)throw new Error('No pudimos consultar el pedido.');let order=previous;
 if(!order){
 const {data:products,error}=await db.from('tienda_productos').select('*').in('id',input.lines.map(l=>l.id));if(error)throw new Error('No pudimos verificar el catálogo.');
 const values=priceOrder(input.lines,products??[]);if(values.total_cents!==input.expected_total_cents)return reply({error:'El precio cambió. Recargá para revisar el total antes de pagar.'},409);
 const created=await db.from('tienda_pedidos').insert({visitor_hash:hash,request_key:input.request_key,request_hash:requestHash,customer_name:input.name,customer_email:input.email,...values}).select().single();
 if(created.error?.code==='23505')return reply({error:'El pedido ya se está procesando. Volvé a intentar en unos segundos.'},409);
 if(created.error)throw new Error('No pudimos guardar el pedido.');order=created.data;
 }
 if(order.request_hash!==requestHash)return reply({error:'El carrito o tus datos cambiaron. Recargá para iniciar otro pedido.'},409);
 if(order.status==='approved')return reply({redirect:'/pedido/'+order.id});
 if(Date.parse(order.expires_at)<Date.now())return reply({error:'El pedido venció. Recargá para generar uno nuevo.'},409);
 if(order.checkout_url)return reply({redirect:order.checkout_url});
 const claim=await db.from('tienda_pedidos').update({preference_id:'creating:'+order.id}).eq('id',order.id).is('preference_id',null).select('id');if(claim.error)throw new Error('No pudimos preparar el pago.');if(!claim.data?.length)return reply({error:'El pago se está preparando. Volvé a intentar en unos segundos.'},409);
 try{
 await testSeller();
 const preference=await mp('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':order.id},body:JSON.stringify({items:order.items.map((i:{id:string;title:string;quantity:number;unit_price:number})=>({...i,currency_id:'ARS'})),external_reference:order.id,back_urls:{success:returnOrigin+'/pedido/'+order.id,pending:returnOrigin+'/pedido/'+order.id,failure:returnOrigin+'/pedido/'+order.id},auto_return:'approved',expires:true,expiration_date_to:order.expires_at, ...(process.env.MERCADOPAGO_WEBHOOK_SECRET?{notification_url:shopOrigin+'/api/mercadopago/webhook'}:{})})});
 const url=new URL(preference.init_point);if(url.protocol!=='https:'||!['www.mercadopago.com.ar','mercadopago.com.ar','sandbox.mercadopago.com.ar'].includes(url.hostname))throw new Error('La dirección de pago no es válida.');
 const saved=await db.from('tienda_pedidos').update({preference_id:String(preference.id),checkout_url:url.href}).eq('id',order.id);if(saved.error)throw new Error('No pudimos guardar el enlace de pago.');
 return reply({redirect:url.href});
 }catch(e){await db.from('tienda_pedidos').update({preference_id:null}).eq('id',order.id).eq('preference_id','creating:'+order.id);throw e;}
 }catch(e){return reply({error:e instanceof Error?e.message:'No pudimos iniciar el pago. Intentá de nuevo.'},503);}
}
