import {NextResponse} from 'next/server';
import {databaseConfigured,supabaseServer} from '@/lib/supabase';
import {sameOrigin,readSmallJson} from '@/lib/request';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Origen no permitido.'},{status:403});
 if(!databaseConfigured())return NextResponse.json({error:'Conexión pendiente de configuración.'},{status:503});
 let body;try{body=await readSmallJson(request);}catch{return NextResponse.json({error:'Solicitud inválida.'},{status:400});}
 if(typeof body.username!=='string'||!body.username.trim()||body.username.length>100||typeof body.password!=='string'||body.password.length>200)return NextResponse.json({error:'Revisá tus datos.'},{status:400});
 const username=body.username.trim().toLowerCase();
 const email=username.includes('@')?username:`${username}@finanzas.local`;
 const db=await supabaseServer();const {data,error}=await db.auth.signInWithPassword({email,password:body.password});
 if(error||!data.user)return NextResponse.json({error:'Usuario o contraseña incorrectos, o acceso no habilitado.'},{status:401});
 const {data:admin}=await db.from('tienda_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
 if(!admin){await db.auth.signOut({scope:'local'});return NextResponse.json({error:'Usuario o contraseña incorrectos, o acceso no habilitado.'},{status:403});}
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
