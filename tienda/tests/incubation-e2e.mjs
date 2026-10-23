// Explicit integration check against the configured Supabase project.
// Creates one disposable @example.invalid Auth user. Run only when email is
// autoconfirmed. Delete the printed test identity afterward via an admin tool.
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
const settings=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}}).then(r=>r.json());
assert.equal(settings.mailer_autoconfirm,true,'Avoid sending any verification emails during this test.');
const base='http://127.0.0.1:3102';const cookies=new Map();
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3102'],{stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
const email=`incubation-preview-test-${randomBytes(8).toString('hex')}@example.invalid`;const password=randomBytes(32).toString('base64url');
writeFileSync('/tmp/atuel-incubation-test-identity.json',JSON.stringify({email}),{mode:0o600});
async function post(path,body){const r=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:JSON.stringify(body)});for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}return {status:r.status,data:await r.json()};}
const date=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
try{
 let online=false;for(let i=0;i<40;i++){try{await fetch(base+'/robots.txt');online=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}assert.ok(online,'Server did not start');
 const signup=await post('/api/incubacion/cuenta',{action:'signup',email,password});assert.equal(signup.status,200);assert.equal(signup.data.authenticated,true);
 const create=await post('/api/incubacion/lotes',{action:'create',egg_count:100,start_date:date(-20),name:'Disposable integration test'});assert.equal(create.status,201);let lot=create.data.lot;
 writeFileSync('/tmp/atuel-incubation-test-identity.json',JSON.stringify({email,user_id:lot.owner_id}),{mode:0o600});assert.equal(lot.developing,null);
 const ovo=await post('/api/incubacion/lotes',{action:'candling',id:lot.id,version:lot.version,date:date(-10),discarded:12});assert.equal(ovo.status,200);lot=ovo.data.lot;assert.equal(lot.developing,88);
 const stale=await post('/api/incubacion/lotes',{action:'candling',id:lot.id,version:1,date:date(-10),discarded:0});assert.equal(stale.status,409);
 const badBirth=await post('/api/incubacion/lotes',{action:'hatch',id:lot.id,version:lot.version,date:date(-2),born:89,share_results:false});assert.equal(badBirth.status,400);
 const lockdown=await post('/api/incubacion/lotes',{action:'lockdown',id:lot.id,version:lot.version,date:date(-5)});assert.equal(lockdown.status,200);lot=lockdown.data.lot;
 const birth=await post('/api/incubacion/lotes',{action:'hatch',id:lot.id,version:lot.version,date:date(-2),born:80,incident:'Test only',share_results:true});assert.equal(birth.status,200);lot=birth.data.lot;assert.equal(lot.born,80);
 const dashboard=await fetch(base+'/incubacion',{headers:{Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')}}).then(r=>r.text());assert.match(dashboard,/Mis incubaciones/);assert.match(dashboard,/Historial/);
 const consent=await post('/api/incubacion/lotes',{action:'consent',id:lot.id,version:lot.version,date:date(-1),share_results:false});assert.equal(consent.status,200);lot=consent.data.lot;assert.equal(lot.share_results,false);
 assert.equal((await post('/api/incubacion/lotes',{action:'delete',id:lot.id,version:lot.version})).status,200);
 assert.equal((await post('/api/incubacion/salir',{})).status,200);
 assert.equal((await post('/api/incubacion/cuenta',{action:'login',email,password})).status,200);
 assert.equal((await post('/api/incubacion/salir',{})).status,200);
 console.log('PASS: signup, cookie session, create, ovoscopy 100−12=88, version conflict, invalid birth, lockdown, 80 births, consent withdrawal, delete, logout and login.');
 console.log('Disposable Auth identity requires cleanup:',email);
}catch(e){console.error(e);process.exitCode=1;}finally{server.kill('SIGTERM');}
