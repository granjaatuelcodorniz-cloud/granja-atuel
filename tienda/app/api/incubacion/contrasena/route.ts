import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {databaseConfigured,supabaseServer} from '@/lib/supabase';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!databaseConfigured())return reply({error:'Conexión no disponible.'},503);
 const jar=await cookies();if(!jar.has('ga_recovery_verified'))return reply({error:'Abrí el enlace de recuperación antes de elegir una contraseña.'},401);
 try{
  const b=await readSmallJson(request);if(typeof b.password!=='string'||b.password.length<8||b.password.length>200)return reply({error:'La contraseña debe tener al menos 8 caracteres.'},400);
  const db=await supabaseServer();const {data:{user}}=await db.auth.getUser();if(!user||jar.get('ga_recovery_verified')?.value!==user.id)return reply({error:'El enlace venció. Solicitá otro.'},401);
  const {error}=await db.auth.updateUser({password:b.password});if(error)return reply({error:'No pudimos cambiar la contraseña. Revisá el enlace y elegí una contraseña diferente.'},400);
  jar.delete('ga_recovery_verified');await db.auth.signOut();return reply({ok:true});
 }catch{return reply({error:'Solicitud inválida.'},400);}
}
