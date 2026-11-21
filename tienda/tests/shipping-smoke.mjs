// Run against a production build with a local database fixture. No request reaches Mercado Pago.
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {seedProducts} from '../lib/catalog.ts';

const activeHost='www.granjaatuel.com.ar',origin='https://'+activeHost,port=3105;
const product=seedProducts.find(p=>p.id==='consumo-5');
const bulk={...seedProducts.find(p=>p.id==='consumo-10'),price:42000,stock_tracking:true,stock_quantity:0,updated_at:'2026-11-21T00:00:00.000Z'};
const products=[product,bulk];
const links=new Map(products.map((p,i)=>[p.id,{
 product_id:p.id,url:i?'https://mpago.la/FixtureOld':'https://mpago.la/11TRxkJ',
 amount_ars:i?38000:25000,updated_at:'2026-11-21T00:00:00.000Z'
}]));
const movements=new Map();
const orders=new Map(),requestKeys=new Map();
const adminId=randomUUID(),factorId=randomUUID(),challengeId=randomUUID();
const authUser={id:adminId,email:'operator@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},factors:[]};
function fixtureSession(aal){
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const head=encode({alg:'HS256',typ:'JWT'});
 const body=encode({sub:adminId,role:'authenticated',aal,exp:Math.floor(Date.now()/1000)+3600});
 const value=head+'.'+body;
 const signature=createHmac('sha256','isolated-fixture').update(value).digest('base64url');
 return {access_token:value+'.'+signature,refresh_token:'fixture-'+aal,token_type:'bearer',expires_in:3600,user:authUser};
}
const passwordSession=fixtureSession('aal1'),verifiedSession=fixtureSession('aal2');
let creates=0,requiresDni=false,settingsUnavailable=false;
const db=http.createServer(async (req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const pathname=url.pathname;
  const reply=(x,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(x));};
  if(pathname==='/rest/v1/tienda_productos'){
   const id=url.searchParams.get('id')?.slice(3);
   if(!id)return reply(products);
   const row=products.find(p=>p.id===id);
   if(!row)return reply([]);
   return req.headers.accept?.includes('vnd.pgrst.object')?reply(row):reply([row]);
  }
  if(pathname==='/rest/v1/tienda_configuracion'){
   if(settingsUnavailable)return reply({message:'Temporary fixture failure'},503);
   return reply({data:{require_recipient_dni:requiresDni,whatsapp:'541100000000',contact_email:'ventas@example.invalid'}});
  }
  if(pathname==='/rest/v1/tienda_contenidos')return reply([]);
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const args=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
  const authorized=req.headers.authorization==='Bearer '+verifiedSession.access_token;
  const passwordOnly=req.headers.authorization==='Bearer '+passwordSession.access_token;
  if(pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password')
   return args.email===authUser.email&&args.password==='fixture-password'?reply(passwordSession):reply({message:'Invalid login'},400);
  if(pathname==='/auth/v1/user')return authorized||passwordOnly?reply(authUser):reply({message:'Sign in required'},401);
  if(pathname==='/auth/v1/factors'&&passwordOnly){
   assert.equal(args.issuer,'Granja Atuel');
   authUser.factors=[{id:factorId,factor_type:'totp',status:'unverified',friendly_name:'Granja Atuel'}];
   return reply({id:factorId,type:'totp',totp:{qr_code:'<svg/>',secret:'LOCALFIXTURE',uri:'otpauth://totp/LocalFixture'}});
  }
  if(pathname==='/auth/v1/factors/'+factorId+'/challenge'&&passwordOnly)return reply({id:challengeId,type:'totp',expires_at:Math.floor(Date.now()/1000)+60});
  if(pathname==='/auth/v1/factors/'+factorId+'/verify'&&passwordOnly){
   if(args.challenge_id!==challengeId||args.code!=='123456')return reply({message:'Invalid code'},400);
   authUser.factors[0].status='verified';
   return reply(verifiedSession);
  }
  if(pathname==='/rest/v1/tienda_admins')return authorized||passwordOnly?reply([{user_id:adminId}]):reply([]);
  if(pathname==='/rest/v1/tienda_enlaces_pago'&&authorized){
   if(req.method==='GET')return reply([...links.values()]);
   const row=links.get(url.searchParams.get('product_id')?.slice(3));
   if(!row||row.updated_at!==url.searchParams.get('updated_at')?.slice(3))return reply([]);
   Object.assign(row,args);
   return reply([row]);
  }
  if(pathname==='/rest/v1/rpc/tienda_adjust_stock_as_admin'&&authorized){
   const row=products.find(p=>p.id===args.p_product_id);
   const prior=movements.get(args.p_request_key);
   if(prior)return reply(prior.new_quantity);
   if(row.stock_quantity!==args.p_expected_quantity)return reply({message:'Stock changed'},409);
   const now=new Date().toISOString();
   const movement={id:randomUUID(),product_id:row.id,delta:args.p_delta,previous_quantity:row.stock_quantity,new_quantity:row.stock_quantity+args.p_delta,reason:args.p_reason,created_at:now};
   movements.set(args.p_request_key,movement);
   row.stock_quantity=movement.new_quantity;
   row.updated_at=now;
   return reply(row.stock_quantity);
  }
  if(pathname==='/rest/v1/tienda_stock_movimientos'&&authorized){
   const row=movements.get(url.searchParams.get('request_key')?.slice(3));
   return reply(row??[]);
  }
  if(pathname==='/rest/v1/tienda_pedidos'&&authorized){
   const found=orders.get(url.searchParams.get('id')?.slice(3));
   if(!found)return reply([]);
   if(req.method==='PATCH')Object.assign(found.summary,args);
   const row={...found.summary,visitor_hash:found.args.p_visitor,customer_email:found.args.p_email,payment_flow:'payment_link'};
   return req.headers.accept?.includes('vnd.pgrst.object')?reply(row):reply([row]);
  }
  if(pathname==='/rest/v1/rpc/tienda_confirm_link_payment'&&authorized){
   const found=orders.get(args.p_order);
   if(!found||found.summary.link_reported_payment!==args.p_payment||found.summary.total_cents!==args.p_total_cents)return reply(false);
   found.summary.status='approved';
   found.summary.link_verified_payment=args.p_payment;
   return reply(true);
  }
  assert.equal(args.p_key,'a'.repeat(64));
  if(pathname==='/rest/v1/rpc/tienda_payment_links'){
   return reply(products.filter(p=>p.active&&p.available&&(!p.stock_tracking||p.stock_quantity>0)&&links.get(p.id)?.amount_ars===p.price).map(p=>links.get(p.id)));
  }
  if(pathname==='/rest/v1/rpc/tienda_create_link_order'){
   creates++;
   const unique=args.p_visitor+args.p_request_key;
   if(requestKeys.has(unique))return reply(requestKeys.get(unique));
   const id=randomUUID();requestKeys.set(unique,id);
   orders.set(id,{args,summary:{id,items:[{id:args.p_product,title:'Huevos de consumo',unit_price:product.price,quantity:1}],total_cents:args.p_total_cents,status:'awaiting_payment',expires_at:new Date(Date.now()+60000).toISOString(),fulfillment_status:'new',fulfillment_version:1,link_reported_payment:null}});
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
function request(path,{body,cookie,source=origin,host=activeHost,method}={}){
 const data=body===undefined?undefined:JSON.stringify(body);
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method:method??(data?'POST':'GET'),
   headers:{Host:host,'User-Agent':'Browser checkout test',...(cookie?{Cookie:cookie}:{}),...(data?{Origin:source,'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}},
   res=>{let body='';res.on('data',s=>body+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});
  req.on('error',reject);req.end(data);
 });
}
function cookiesFrom(response){
 return response.headers['set-cookie']?.map(value=>value.split(';')[0]).join('; ');
}
try{
 let online=false;
 for(let i=0;i<45;i++){try{await request('/robots.txt');online=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}
 assert.ok(online);
 const form=await request('/checkout?producto=consumo-5');
 assert.equal(form.status,200);assert.match(form.body,/Datos de envío/);assert.doesNotMatch(form.body,/compra en línea no está disponible|mpago\.la|name="dni"/);
 assert.match(form.body,/volvés a tu pedido para informar el número de operación/);
 assert.match(form.body,/Privacidad de compra/);
 assert.match(form.body,/Consultar por WhatsApp/);
 assert.doesNotMatch(form.body,/_vercel\/insights/);
 assert.match((await request('/privacidad-de-compra')).body,/Datos que usamos/);
 assert.match((await request('/')).body,/href="\/checkout\?producto=consumo-5"/);
 assert.doesNotMatch((await request('/')).body,/href="\/checkout\?producto=consumo-10"/);
 for(const name of ['name','email','phone','province','city','postal_code','address','reference'])assert.ok(form.body.includes('name="'+name+'"'));
 const delivery_address={province:'Mendoza',city:'San Rafael',postal_code:'m5600aaa',address:'Calle de prueba 123',phone:'260 4000000',reference:'Departamento 2'};
 const order={name:'Persona de prueba',email:'qa@example.invalid',cart:[{id:product.id,quantity:1}],request_key:randomUUID(),expected_total_cents:product.price*100,delivery_address};
 assert.equal((await request('/api/checkout',{body:order,source:'https://other.example'})).status,403);
 assert.equal((await request('/api/checkout',{body:{...order,delivery_address:{...delivery_address,address:''}}})).status,400);
 assert.equal((await request('/api/checkout',{body:{...order,expected_total_cents:100}})).status,409);
 assert.equal((await request('/api/checkout',{body:{...order,cart:[{id:product.id,quantity:2}]}})).status,409);
 assert.equal(creates,0);
 const create=await request('/api/checkout',{body:{...order,delivery_address:{...delivery_address,dni:'12.345.678'}}});
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
 const reference='#'+redirect.split('/').at(-1).slice(0,8);
 const chat=review.body.match(/href="(https:\/\/wa\.me\/541100000000\?text=[^"]+)"/)?.[1];
 assert.ok(chat);
 assert.equal(new URL(chat).searchParams.get('text'),'Hola, quisiera consultar por el pedido '+reference+'.');
 assert.match(review.body,/href="mailto:ventas@example\.invalid\?subject=Consulta%20por%20el%20pedido%20%23[a-f0-9]{8}"/);
 const noAccess=(await request(redirect)).body;
 assert.match(noAccess,/Pedido no disponible/);
 assert.match(noAccess,/Consultar por WhatsApp|Escribinos por correo/);
 assert.doesNotMatch(noAccess,/Total con envío incluido|Calle de prueba 123|qa@example.invalid/);

 const recovery=review.body.match(/\/pedido\/[a-f0-9-]{36}\/recuperar#[A-Za-z0-9_-]+/)?.[0];
 assert.ok(recovery,'Private recovery link available to the original browser');
 const [recoveryPage,token]=recovery.split('#');
 const recoveryView=await request(recoveryPage);
 assert.equal(recoveryView.status,200);
 assert.match(recoveryView.body,/Abrir mi pedido/);
 assert.doesNotMatch(recoveryView.body,/_vercel\/insights/);
 assert.equal(recoveryView.headers['referrer-policy'],'no-referrer');
 const orderId=redirect.split('/').at(-1);
 const restored=await request('/api/pedidos/recuperar',{body:{id:orderId,token}});
 assert.equal(restored.status,200,restored.body);
 assert.equal(JSON.parse(restored.body).redirect,redirect);
 const recoveredCookie=cookiesFrom(restored);
 assert.match(restored.headers['set-cookie'][0],/HttpOnly/i);
 assert.match((await request(redirect,{cookie:recoveredCookie})).body,/Los datos de envío ya quedaron guardados/);

 const pay=await request(redirect+'/pagar',{cookie:recoveredCookie});
 assert.equal(pay.status,303);assert.equal(pay.headers.location,'https://mpago.la/11TRxkJ');
 assert.equal(pay.headers['referrer-policy'],'no-referrer');
 const report={id:redirect.split('/').at(-1),payment_id:'9876543210'};
 assert.equal((await request('/api/pedidos/pago',{body:report})).status,404);
 assert.equal((await request('/api/pedidos/pago',{body:report,cookie:recoveredCookie})).status,200);
 assert.match((await request(redirect,{cookie})).body,/Pago informado/);
 const noSecondPayment=await request(redirect+'/pagar',{cookie});
 assert.equal(noSecondPayment.status,303);assert.doesNotMatch(noSecondPayment.headers.location,/mpago\.la/);
 assert.equal(stored.summary.status,'awaiting_payment');
 assert.match((await request(redirect,{cookie})).body,/Consultar por WhatsApp/);

 const login=await request('/api/admin/login',{body:{username:authUser.email,password:'fixture-password'}});
 assert.equal(login.status,200,login.body);
 const passwordCookie=cookiesFrom(login);
 assert.equal((await request('/admin',{cookie:passwordCookie})).headers.location,'/admin/seguridad');
 const confirm={...report,manual_confirmed:true};
 assert.equal((await request('/api/admin/orders/payment',{body:confirm,cookie:passwordCookie})).status,403);
 const enrollment=await request('/api/admin/seguridad',{body:{action:'enroll'},cookie:passwordCookie});
 assert.equal(enrollment.status,200,enrollment.body);
 assert.equal(JSON.parse(enrollment.body).factorId,factorId);
 const verified=await request('/api/admin/seguridad',{body:{action:'verify',factorId,code:'123456'},cookie:passwordCookie});
 assert.equal(verified.status,200,verified.body);
 const adminCookie=cookiesFrom(verified);
 assert.ok(adminCookie,'MFA completion returned a session cookie');
 assert.equal((await request('/admin/seguridad',{cookie:adminCookie})).headers.location,'/admin');
 const adjustment={product_id:bulk.id,delta:2,expected_quantity:0,reason:'Recuento de stock',request_key:randomUUID()};
 assert.equal((await request('/api/admin/inventory',{body:adjustment,cookie:passwordCookie})).status,403);
 const stock=await request('/api/admin/inventory',{body:adjustment,cookie:adminCookie});
 assert.equal(stock.status,200,stock.body);
 assert.equal(JSON.parse(stock.body).product.stock_quantity,2);
 assert.equal(JSON.parse(stock.body).movement.new_quantity,2);
 assert.equal((await request('/api/admin/inventory',{body:adjustment,cookie:adminCookie})).status,200);
 assert.equal(movements.size,1,'A retry must reuse the original inventory movement');
 assert.doesNotMatch((await request('/')).body,/href="\/checkout\?producto=consumo-10"/,'More stock cannot bypass a mismatched payment link');
 const replacement={product_id:bulk.id,url:'https://mpago.la/FixtureNew',amount_ars:42000,expected_updated_at:links.get(bulk.id).updated_at};
 const linkRoute='/api/admin/products/payment-link';
 assert.equal((await request(linkRoute,{method:'PUT',body:replacement,cookie:passwordCookie})).status,403);
 assert.equal((await request(linkRoute,{method:'PUT',body:{...replacement,url:'https://example.invalid/'},cookie:adminCookie})).status,400);
 const changed=await request(linkRoute,{method:'PUT',body:replacement,cookie:adminCookie});
 assert.equal(changed.status,200,changed.body);
 assert.equal(JSON.parse(changed.body).link.amount_ars,bulk.price);
 assert.equal((await request(linkRoute,{method:'PUT',body:replacement,cookie:adminCookie})).status,409);
 for(const path of ['/','/producto/consumo-10']){
  const page=await request(path);
  assert.match(page.body,/href="\/checkout\?producto=consumo-10"/);
  assert.doesNotMatch(page.body,/mpago\.la/);
 }
 const bulkCheckout=await request('/checkout?producto=consumo-10');
 assert.match(bulkCheckout.body,/Datos de envío/);
 assert.match(bulkCheckout.body,/42\.000/);
 const paid=await request('/api/admin/orders/payment',{body:confirm,cookie:adminCookie});
 assert.equal(paid.status,200,paid.body);
 assert.match((await request(redirect,{cookie:recoveredCookie})).body,/Pago aprobado/);
 const fulfillment={id:orderId,fulfillment_version:1,fulfillment_status:'dispatched',shipping_carrier:'Transporte de prueba',tracking_code:'QA123',admin_notes:''};
 const shipped=await request('/api/admin/orders',{method:'PUT',body:fulfillment,cookie:adminCookie});
 assert.equal(shipped.status,200,shipped.body);
 const receipt=await request(redirect,{cookie:recoveredCookie});
 assert.match(receipt.body,/Transporte de prueba/);
 assert.match(receipt.body,/QA123/);
 const draft=await request('/api/admin/orders/recovery',{body:{id:orderId},cookie:adminCookie});
 assert.equal(draft.status,200,draft.body);
 assert.equal(decodeURIComponent(new URL(JSON.parse(draft.body).draft).pathname),order.email);
 assert.doesNotMatch(decodeURIComponent(draft.body),/Calle de prueba 123|Departamento 2/);

 requiresDni=true;
 const withDni=await request('/checkout?producto=consumo-5');
 assert.match(withDni.body,/<input[^>]*required=""[^>]*name="dni"/);
 const beforeDni=creates;
 const newOrder={...order,request_key:randomUUID()};
 assert.equal((await request('/api/checkout',{body:newOrder,cookie})).status,400);
 assert.equal((await request('/api/checkout',{body:{...newOrder,delivery_address:{...delivery_address,dni:'abc'}},cookie})).status,400);
 settingsUnavailable=true;
 assert.equal((await request('/api/checkout',{body:newOrder,cookie})).status,503);
 assert.equal(creates,beforeDni);
 settingsUnavailable=false;
 const complete=await request('/api/checkout',{body:{...newOrder,delivery_address:{...delivery_address,dni:'12.345.678'}},cookie});
 assert.equal(complete.status,200,complete.body);
 const privateOrder=JSON.parse(complete.body).redirect;
 assert.match((await request(privateOrder,{cookie:recoveredCookie})).body,/Pedido no disponible/);
 assert.equal(orders.get(privateOrder.split('/').at(-1)).args.p_delivery.dni,'12345678');
 const privateView=await request(privateOrder,{cookie});
 assert.match(privateView.body,/Consultar por WhatsApp/);
 assert.doesNotMatch(privateView.body,/12345678|12\.345\.678|Calle de prueba 123|qa@example.invalid/);
 console.log('Checkout, order recovery and tracking passed. MFA protected stock adjustments and link edits; matching stock and price opened the checkout. No payment or email was sent.');
}catch(e){console.error(e,logs);process.exitCode=1;}finally{server.kill('SIGTERM');db.close();}
