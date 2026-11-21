import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';
import {redirect} from 'next/navigation';
import {sameOrigin} from './request';
import {getAdminSession} from './supabase';

export async function requireAdmin(){
 const session=await getAdminSession();
 if(!session)redirect('/admin/login');
 if(!session.verified)redirect('/admin/seguridad');
 return session;
}
export async function authorizeAdmin(request:Request){
 if(!sameOrigin(request))return {error:adminReply({error:'Origen no permitido.'},403)};
 const session=await getAdminSession();
 if(!session)return {error:adminReply({error:'Iniciá sesión como administrador.'},401)};
 if(!session.verified)return {error:adminReply({error:'Completá la verificación en dos pasos del panel.'},403)};
 return {...session,error:undefined};
}
export function adminService(){if(!process.env.SUPABASE_SECRET_KEY||!process.env.NEXT_PUBLIC_SUPABASE_URL)throw new Error('Configuración de administración pendiente.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
export const adminReply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
