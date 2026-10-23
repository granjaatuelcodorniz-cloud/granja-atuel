import {NextResponse} from 'next/server';
import {supabaseServer,databaseConfigured} from '@/lib/supabase';
import {sameOrigin,readSmallJson} from '@/lib/request';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!databaseConfigured())return reply({error:'La conexión todavía no está disponible.'},503);
 let b;try{b=await readSmallJson(request);}catch{return reply({error:'Solicitud inválida.'},400);}
 if(!['login','signup'].includes(b.action)||typeof b.email!=='string'||!/^\S+@\S+\.\S+$/.test(b.email)||b.email.length>254||typeof b.password!=='string'||b.password.length>200||b.password.length<(b.action==='signup'?8:1))return reply({error:'Ingresá un correo válido y una contraseña de al menos 8 caracteres.'},400);
 const db=await supabaseServer();const email=b.email.trim().toLowerCase();
 if(b.action==='signup'){
 const {data,error}=await db.auth.signUp({email,password:b.password});
 if(error)return reply({error:error.status===429?'Esperá unos minutos antes de volver a intentar.':'No pudimos crear la cuenta. Probá ingresar si ya te registraste.'},400);
 return reply({ok:true,authenticated:!!data.session,message:'Revisá tu correo para confirmar la cuenta. Después volvé aquí e ingresá con tu contraseña. Si ya tenés cuenta, usá Ingresar.'});
 }
 const {error}=await db.auth.signInWithPassword({email,password:b.password});
 if(error)return reply({error:'Correo o contraseña incorrectos, o correo pendiente de confirmación.'},401);
 return reply({ok:true,authenticated:true});
}
