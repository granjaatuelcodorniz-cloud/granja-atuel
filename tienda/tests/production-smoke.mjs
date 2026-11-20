// Build with VERCEL_ENV=production ATUEL_PUBLIC_SITE=true MERCADOPAGO_MODE=production first.
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';

const host='www.granjaatuel.com.ar',origin='https://'+host,port=3102;
const env={...process.env,VERCEL_ENV:'production',ATUEL_PUBLIC_SITE:'true',MERCADOPAGO_MODE:'production',
 NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',MERCADOPAGO_ENABLE_PRODUCTION:'false'};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
let logs='';
server.stdout.on('data',s=>logs+=s);
server.stderr.on('data',s=>logs+=s);

function get(path,hostname=host){
 return new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port,path,headers:{Host:hostname,'User-Agent':'Googlebot'}},res=>{
   let body='';res.setEncoding('utf8');res.on('data',s=>body+=s);
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
  });
  req.on('error',reject);
 });
}
function indexable(response,path){
 assert.equal(response.status,200,path);
 assert.doesNotMatch(response.headers['x-robots-tag']||'',/noindex/,path);
 assert.doesNotMatch(response.body,/<meta name="robots" content="[^"]*noindex/,path);
 const canonical=response.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
 assert.ok(canonical,path+' should include a canonical URL');
 assert.equal(new URL(canonical).href,origin+path,path+' canonical');
}

try{
 let online=false;
 for(let i=0;i<40;i++){try{await get('/robots.txt');online=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(online,'Server did not start');
 const home=await get('/');indexable(home,'/');
 assert.match(home.body,/<title>Granja Atuel — Huevos de Codorniz Frescos \| San Rafael, Mendoza<\/title>/);
 for(const hash of ['productos','fertiles','nutricion','puntos','recetas','faq','mayoristas','testimonios'])
  assert.ok(home.body.includes('id="'+hash+'"'),hash);
 for(const link of ['11TRxkJ','1HPrFSq','2qbsnRt','27Cp2BJ','1yqnBnb'])
  assert.ok(home.body.includes('href="https://mpago.la/'+link+'"'),link);
 assert.doesNotMatch(home.body,/VISTA DE PRUEBAS|Abrir carrito/);
 const oldHome=await get('/index.html?fuente=anterior');
 assert.equal(oldHome.status,308);assert.equal(oldHome.headers.location,'/?fuente=anterior');
 const oldRecipe=await get('/api/receta?slug=tacos-de-huevo-revuelto');
 assert.equal(oldRecipe.status,308);assert.equal(oldRecipe.headers.location,origin+'/recetas/tacos-de-huevo-revuelto');
 const recipe=await get('/recetas/tacos-de-huevo-revuelto');
 indexable(recipe,'/recetas/tacos-de-huevo-revuelto');assert.match(recipe.body,/Ingredientes/);
 for(const path of ['/producto/consumo-5','/huevos-fertiles','/buenas-practicas'])indexable(await get(path),path);
 assert.equal((await get('/recetas/no-existe')).status,404);
 const [notebook,legacy,manifest,worker]=await Promise.all(['/incubacion','/incubacion.html','/incubacion-manifest.json','/sw.js'].map(path=>get(path)));
 assert.equal(notebook.status,200);assert.equal(legacy.status,200);assert.equal(notebook.body,legacy.body);
 assert.match(notebook.body,/<meta name="robots" content="noindex"/);
 assert.match(notebook.body,/ga_lotes/);assert.equal(JSON.parse(manifest.body).start_url,'/incubacion');assert.match(worker.body,/ga-incubacion-v4/);
 const robots=await get('/robots.txt');assert.equal(robots.status,200);
 assert.match(robots.body,/^Allow: \/$/m);assert.match(robots.body,/^Disallow: \/admin$/m);
 assert.match(robots.body,/^Sitemap: https:\/\/www\.granjaatuel\.com\.ar\/sitemap\.xml$/m);
 const sitemap=await get('/sitemap.xml');assert.equal(sitemap.status,200);
 const urls=[...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.ok(urls.length>=30);assert.equal(new Set(urls).size,urls.length);
 assert.ok(urls.every(url=>url.startsWith(origin+'/')&&!/\/(admin|checkout|pedido|api)(?:\/|$)/.test(new URL(url).pathname)));
 assert.ok(urls.includes(origin+'/recetas/tacos-de-huevo-revuelto'));
 assert.ok(!urls.includes(origin+'/incubacion'));
 const alternate='granja-atuel.vercel.app',alt=await get('/',alternate);
 assert.match(alt.headers['x-robots-tag'],/noindex/);assert.match(alt.body,/<meta name="robots" content="noindex, nofollow"/);
 assert.match((await get('/robots.txt',alternate)).body,/^Disallow: \/$/m);
 assert.doesNotMatch((await get('/sitemap.xml',alternate)).body,/<loc>/);
 const admin=await get('/admin');assert.equal(admin.status,307);assert.match(admin.headers.location,/\/admin\/login/);
 assert.match(admin.headers['x-robots-tag'],/noindex/);
 const checkout=await get('/checkout');assert.equal(checkout.status,307);assert.equal(checkout.headers.location,'/#productos');
 console.log('Production HTTP checks passed; '+urls.length+' self canonical URLs, legacy redirects, notebook, purchasing and noindex on the alternate host.');
}catch(err){console.error(err);console.error(logs);process.exitCode=1;}finally{server.kill('SIGTERM');}
