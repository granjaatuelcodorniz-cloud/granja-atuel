import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {databaseConfigured,supabaseServer} from '@/lib/supabase';
import {authOrigin} from '@/lib/auth-origin';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!databaseConfigured())return reply({error:'Conexión no disponible.'},503);
 try{
  const b=await readSmallJson(request);if(typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email))return reply({error:'Ingresá un correo válido.'},400);
  const jar=await cookies();if(jar.has('ga_recovery_wait'))return reply({error:'Esperá un minuto antes de volver a solicitar el enlace.'},429);
  const db=await supabaseServer();const {error}=await db.auth.resetPasswordForEmail(b.email.trim().toLowerCase(),{redirectTo:authOrigin(request)+'/auth/callback'});
  jar.set('ga_recovery_requested','1',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:900});
  jar.set('ga_recovery_wait','1',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60});
  if(error&&error.status===429)return reply({error:'Esperá unos minutos antes de volver a intentar.'},429);
  if(error)return reply({error:'No pudimos solicitar el enlace. Intentá más tarde.'},503);
  return reply({message:'Si el correo tiene una cuenta habilitada para recuperar acceso, recibirás un enlace. Revisá también spam. Abrilo en este mismo navegador.'});
 }catch{return reply({error:'Revisá el correo e intentá de nuevo.'},400);}
}
