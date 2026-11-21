// Run after a production build. Both Supabase and Mercado Pago use local fixtures.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import http from 'node:http';
import {seedProducts} from '../lib/catalog.ts';
import {GranjaAtuelMercadoPagoApp,productionShopOrigin} from '../lib/payment-config.ts';

const host=new URL(productionShopOrigin).host;
const port=3106;
const product={...seedProducts.find(p=>p.id==='consumo-10'),price:42000,stock_tracking:true,stock_quantity:6};
const orders=new Map(),preferences=[],registered=new Map();
const seller=93201,webhookSecret='checkout-pro-fixture-secret';
let receivedPayment;

function matchingOrders(query){
 return [...orders.values()].filter(order=>[...query].every(([key,value])=>
  value==='is.null'?order[key]===null:!value.startsWith('eq.')||String(order[key])===value.slice(3)
 ));
}

const fixture=http.createServer(async (req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const reply=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 try{
  const parts=[];
  for await(const part of req)parts.push(part);
  const body=parts.length?JSON.parse(Buffer.concat(parts).toString()):null;
  const rows=values=>reply(req.headers.accept?.includes('vnd.pgrst.object')?values[0]??null:values);
  switch(url.pathname){
   case '/rest/v1/tienda_productos':
    return rows([product]);
   case '/rest/v1/tienda_configuracion':
    return reply({data:{require_recipient_dni:false}});
   case '/rest/v1/tienda_contenidos':
    return reply([]);
   case '/rest/v1/tienda_pedidos': {
    if(req.method==='POST'){
     const order={id:randomUUID(),status:'awaiting_payment',payment_flow:'checkout_pro',preference_id:null,checkout_url:null,expires_at:new Date(Date.now()+3600000).toISOString(),...body};
     orders.set(order.id,order);
     return rows([order]);
    }
    const matched=matchingOrders(url.searchParams);
    if(req.method==='PATCH')for(const order of matched)Object.assign(order,body);
    return rows(matched);
   }
   case '/rest/v1/rpc/tienda_register_payment': {
    const order=orders.get(body.p_order_id);
    assert.ok(order);
    assert.equal(body.p_amount_cents,order.total_cents);
    registered.set(body.p_payment_id,body);
    order.status=body.p_status;
    return reply(null);
   }
   case '/merchant/checkout/preferences': {
    assert.equal(req.method,'POST');
    assert.equal(req.headers.authorization,'Bearer fixture-live-token');
    assert.equal(req.headers['x-idempotency-key'],body.external_reference);
    assert.equal(orders.get(body.external_reference).payment_flow,'checkout_pro');
    preferences.push(body);
    return reply({id:'fixture-'+body.external_reference,client_id:GranjaAtuelMercadoPagoApp,collector_id:seller,external_reference:body.external_reference,init_point:'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=fixture'});
   }
   case '/merchant/v1/payments/93201':
    assert.equal(req.headers.authorization,'Bearer fixture-live-token');
    return reply(receivedPayment);
   default:
    return reply({message:'Unexpected fixture path '+url.pathname},404);
  }
 }catch(error){return reply({message:String(error)},500);}
});
fixture.listen(0,'127.0.0.1');
await once(fixture,'listening');
const fixtureOrigin='http://127.0.0.1:'+fixture.address().port;
const capture=encodeURIComponent(
 "const originalFetch=globalThis.fetch;" +
 "globalThis.fetch=(resource,init)=>typeof resource==='string'&&resource.startsWith('https://api.mercadopago.com/')?originalFetch(process.env.ATUEL_PAYMENT_FIXTURE+'/merchant'+new URL(resource).pathname+new URL(resource).search,init):originalFetch(resource,init);"
);
const env={
 ...process.env,VERCEL_ENV:'production',ATUEL_PUBLIC_SITE:'true',MERCADOPAGO_MODE:'production',MERCADOPAGO_ENABLE_PRODUCTION:'true',
 MERCADOPAGO_PRODUCTION_ACCESS_TOKEN:'fixture-live-token',MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET:webhookSecret,
 SUPABASE_SECRET_KEY:'sb_secret_fixture',NEXT_PUBLIC_SUPABASE_URL:fixtureOrigin,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 ATUEL_LINK_ORDERS_KEY:'',ATUEL_PAYMENT_FIXTURE:fixtureOrigin,
};
const child=spawn(process.execPath,['--import','data:text/javascript,'+capture,'node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
let logs='';
child.stdout.on('data',s=>logs+=s);
child.stderr.on('data',s=>logs+=s);

function request(path,{body,cookie,headers={}}={}){
 const json=body===undefined?undefined:JSON.stringify(body);
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method:json?'POST':'GET',
   headers:{Host:host,...(cookie?{Cookie:cookie}:{}),...(json?{Origin:productionShopOrigin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(json)}:{}),...headers}},
   res=>{let body='';res.on('data',s=>body+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});
  req.on('error',reject);
  req.end(json);
 });
}

try{
 let online=false;
 for(let i=0;i<40;i++){try{await request('/robots.txt');online=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(online);
 const path='/checkout?producto='+product.id;
 const before=await request(path);
 assert.equal(before.status,200);
 assert.match(before.body,/Datos de envío/);
 assert.match(before.body,/42\.000/);
 assert.doesNotMatch(before.body,/informar el número de operación/);

 const delivery={province:'Mendoza',city:'San Rafael',postal_code:'5600',address:'Prueba 123',phone:'260 4000000',reference:''};
 const body={name:'Persona de prueba',email:'fixture@example.invalid',cart:[{id:product.id,quantity:1}],request_key:randomUUID(),expected_total_cents:4200000,delivery_address:delivery};
 product.price=43500;
 assert.equal((await request('/api/checkout',{body})).status,409);
 assert.equal(orders.size,0);
 assert.equal(preferences.length,0);

 assert.match((await request(path)).body,/43\.500/);
 const updated={...body,expected_total_cents:4350000};
 const purchase=await request('/api/checkout',{body:updated});
 assert.equal(purchase.status,200,purchase.body);
 const cookie=purchase.headers['set-cookie']?.[0]?.split(';')[0];
 const [order]=orders.values();
 const [preference]=preferences;
 assert.ok(cookie);
 assert.equal(orders.size,1);
 assert.equal(order.total_cents,4350000);
 assert.deepEqual(order.delivery_address,delivery);
 assert.equal(preference.items[0].unit_price,43500);
 assert.equal(preference.items[0].currency_id,'ARS');
 assert.equal(preference.back_urls.success,productionShopOrigin+'/pedido/'+order.id);
 assert.equal(preference.notification_url,productionShopOrigin+'/api/mercadopago/webhook');
 assert.equal(order.payment_collector_id,String(seller));
 assert.equal((await request('/api/checkout',{body:updated,cookie})).body,purchase.body);
 assert.equal(preferences.length,1);

 const paymentPath='/api/mercadopago/webhook?data.id=93201&type=payment';
 assert.equal((await request(paymentPath,{body:{}})).status,401);
 receivedPayment={id:93201,external_reference:order.id,collector_id:seller,status:'approved',currency_id:'ARS',live_mode:true,transaction_amount:42000,date_last_updated:new Date().toISOString()};
 const ts=String(Date.now());
 const signature=createHmac('sha256',webhookSecret).update('id:93201;request-id:fixture-request;ts:'+ts+';').digest('hex');
 const headers={'x-request-id':'fixture-request','x-signature':'ts='+ts+',v1='+signature};
 assert.equal((await request(paymentPath,{body:{},headers})).status,503);
 assert.equal(registered.size,0);
 receivedPayment.transaction_amount=43500;
 assert.equal((await request(paymentPath,{body:{},headers})).status,200);
 assert.equal(registered.size,1);
 const receipt=await request('/pedido/'+order.id,{cookie});
 assert.match(receipt.body,/Pago aprobado/);
 assert.doesNotMatch(receipt.body,/Prueba 123|fixture@example\.invalid/);
 console.log('Checkout Pro used the updated catalog price, saved delivery, reused the preference on retry, and verified a signed payment against the exact total.');
}catch(error){
 console.error(error,logs);
 process.exitCode=1;
}finally{
 child.kill('SIGTERM');
 fixture.close();
}
