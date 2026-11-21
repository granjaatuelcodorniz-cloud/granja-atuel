// Run against a production build with a local database fixture. No request reaches Mercado Pago.
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {seedProducts} from '../lib/catalog.ts';

const activeHost='www.granjaatuel.com.ar',origin='https://'+activeHost,port=3105;
const product=seedProducts.find(p=>p.id==='consumo-5');
const orders=new Map(),requestKeys=new Map();
let creates=0;
const db=http.createServer(async (req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const reply=(x,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(x));};
  if(pathname==='/rest/v1/tienda_productos')return reply([product]);
  if(pathname==='/rest/v1/tienda_configuracion')return reply({data:{}});
  if(pathname==='/rest/v1/tienda_contenidos')return reply([]);
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const args=JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(args.p_key,'a'.repeat(64));
  if(pathname==='/rest/v1/rpc/tienda_create_link_order'){
   creates++;
   const unique=args.p_visitor+args.p_request_key;
   if(requestKeys.has(unique))return reply(requestKeys.get(unique));
   const id=randomUUID();requestKeys.set(unique,id);
   orders.set(id,{args,summary:{id,items:[{id:args.p_product,title:'Huevos de consumo',unit_price:product.price,quantity:1}],total_cents:args.p_total_cents,status:'awaiting_payment',expires_at:new Date(Date.now()+60000).toISOString(),fulfillment_status:'new',link_reported_payment:null}});
   return reply(id);
  }
  const found=orders.get(args.p_order);
  if(pathname==='/rest/v1/rpc/tienda_read_link_order')return reply(found?.args.p_visitor===args.p_visitor?found.summary:null);
  if(pathname==='/rest/v1/rpc/tienda_report_link_payment'){
   if(found?.args.p_visitor!==args.p_visitor)return reply(false);
   found.summary.link_reported_payment=args.p_payment;
   return reply(true);
  }
  return reply({message:'Unexpected fixture path'},404);
 }catch(err){res.writeHead(500);res.end(JSON.stringify({message:String(err)}));}
});
db.listen(0,'127.0.0.1');await once(db,'listening');
const env={...process.env,VERCEL_ENV:'production',ATUEL_PUBLIC_SITE:'true',MERCADOPAGO_MODE:'production',
 MERCADOPAGO_ENABLE_PRODUCTION:'false',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:'+db.address().port,
 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_fixture_key',ATUEL_LINK_ORDERS_KEY:'a'.repeat(64)};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
let logs='';
server.stdout.on('data',s=>logs+=s);
server.stderr.on('data',s=>logs+=s);
function request(path,{body,cookie,source=origin,host=activeHost}={}){
 const data=body===undefined?undefined:JSON.stringify(body);
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method:data?'POST':'GET',
   headers:{Host:host,'User-Agent':'Browser checkout test',...(cookie?{Cookie:cookie}:{}),...(data?{Origin:source,'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}},
   res=>{let body='';res.on('data',s=>body+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});
  req.on('error',reject);req.end(data);
 });
}
try{
 let online=false;
 for(let i=0;i<45;i++){try{await request('/robots.txt');online=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}
 assert.ok(online);
 const form=await request('/checkout?producto=consumo-5');
 assert.equal(form.status,200);assert.match(form.body,/Datos de envío/);assert.doesNotMatch(form.body,/compra en línea no está disponible|mpago\.la/);
 for(const name of ['name','email','phone','province','city','postal_code','address','reference'])assert.ok(form.body.includes('name="'+name+'"'));
 const delivery_address={province:'Mendoza',city:'San Rafael',postal_code:'m5600aaa',address:'Calle de prueba 123',phone:'260 4000000',reference:'Departamento 2'};
 const order={name:'Persona de prueba',email:'qa@example.invalid',cart:[{id:product.id,quantity:1}],request_key:randomUUID(),expected_total_cents:product.price*100,delivery_address};
 assert.equal((await request('/api/checkout',{body:order,source:'https://other.example'})).status,403);
 assert.equal((await request('/api/checkout',{body:{...order,delivery_address:{...delivery_address,address:''}}})).status,400);
 assert.equal((await request('/api/checkout',{body:{...order,expected_total_cents:100}})).status,409);
 assert.equal((await request('/api/checkout',{body:{...order,cart:[{id:product.id,quantity:2}]}})).status,409);
 assert.equal(creates,0);
 const create=await request('/api/checkout',{body:order});
 assert.equal(create.status,200,create.body);
 const {redirect}=JSON.parse(create.body);
 const [setCookie]=create.headers['set-cookie'],cookie=setCookie.split(';')[0];
 assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/Secure/i);
 assert.match(redirect,/^\/pedido\/[a-f0-9-]{36}$/);assert.equal(orders.size,1);
 const [stored]=orders.values();
 assert.deepEqual(stored.args.p_delivery,{...delivery_address,postal_code:'M5600AAA'});
 assert.equal(stored.args.p_name,order.name);
 assert.equal(stored.args.p_email,order.email);
 assert.equal(JSON.parse((await request('/api/checkout',{body:order,cookie})).body).redirect,redirect);
 assert.equal(orders.size,1);
 assert.equal((await request(redirect+'/pagar')).status,404);
 const review=await request(redirect,{cookie});
 assert.match(review.body,/Los datos de envío ya quedaron guardados/);assert.match(review.body,/Continuar a Mercado Pago/);
 assert.doesNotMatch(review.body,/Calle de prueba 123|qa@example.invalid|mpago\.la/);
 const pay=await request(redirect+'/pagar',{cookie});
 assert.equal(pay.status,303);assert.equal(pay.headers.location,'https://mpago.la/11TRxkJ');
 assert.equal(pay.headers['referrer-policy'],'no-referrer');
 const report={id:redirect.split('/').at(-1),payment_id:'9876543210'};
 assert.equal((await request('/api/pedidos/pago',{body:report})).status,404);
 assert.equal((await request('/api/pedidos/pago',{body:report,cookie})).status,200);
 assert.match((await request(redirect,{cookie})).body,/Pago informado/);
 const noSecondPayment=await request(redirect+'/pagar',{cookie});
 assert.equal(noSecondPayment.status,303);assert.doesNotMatch(noSecondPayment.headers.location,/mpago\.la/);
 assert.equal(stored.summary.status,'awaiting_payment');
 console.log('Shipping checkout: destination saved first, errors stay on-site, payment handoff is private, reported operations are not approved.');
}catch(e){console.error(e,logs);process.exitCode=1;}finally{server.kill('SIGTERM');db.close();}
