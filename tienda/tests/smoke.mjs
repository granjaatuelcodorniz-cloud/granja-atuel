// Run after npm run build. No real login, payments, shipments or data mutations.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3101';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3101'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
try{
 let online=false;
 for(let i=0;i<40;i++){try{await fetch(base+'/robots.txt');online=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(online,'Server did not start: '+logs);
 const home=await fetch(base);const html=await home.text();
 assert.equal(home.status,200);assert.match(html,/Huevos de consumo/);assert.match(html,/25[.\s]?000/);
 assert.match(home.headers.get('x-robots-tag'),/noindex/);
 const admin=await fetch(base+'/admin',{redirect:'manual'});assert.equal(admin.status,307);assert.match(admin.headers.get('location'),/\/admin\/login/);
 const denied=await fetch(base+'/api/admin/products',{method:'PUT',headers:{'Content-Type':'application/json','Origin':base},body:'{}'});assert.equal(denied.status,401);
 const csrf=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://other.example'},body:'{}'});assert.equal(csrf.status,403);
 const recipes=await fetch(base+'/recetas');assert.equal(recipes.status,200);assert.match(await recipes.text(),/Ingredientes/);
 const incubation=await fetch(base+'/incubacion');assert.equal(incubation.status,200);assert.match(await incubation.text(),/Crear cuenta/);
 const oldIncubation=await fetch(base+'/incubacion.html',{redirect:'manual'});assert.equal(oldIncubation.status,307);assert.equal(oldIncubation.headers.get('location'),'/incubacion');
 const fertile=await fetch(base+'/huevos-fertiles');assert.equal(fertile.status,200);assert.match(await fertile.text(),/Presentaciones disponibles/);
 const saveDenied=await fetch(base+'/api/incubacion/lotes',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({action:'create',egg_count:100,start_date:'2026-10-01'})});assert.equal(saveDenied.status,401);
 const customerCSRF=await fetch(base+'/api/incubacion/cuenta',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:'{}'});assert.equal(customerCSRF.status,403);
 const invalidSignup=await fetch(base+'/api/incubacion/cuenta',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'null'});assert.equal(invalidSignup.status,400);
 const reports=await fetch(base+'/admin/incubaciones',{redirect:'manual'});assert.equal(reports.status,307);
 const image=await fetch(base+'/huevos-consumo1.webp');assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/);
 const robots=await fetch(base+'/robots.txt');assert.match(await robots.text(),/Disallow: \//);
 console.log('HTTP checks passed: catalog, noindex, admin redirect, unauthorized edit, CSRF rejection, recipes, incubation and product image.');
}catch(e){console.error(e);console.error(logs);process.exitCode=1;}finally{server.kill('SIGTERM');}
