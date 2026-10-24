import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';
import {sameOrigin} from './request';
import {getAdmin} from './supabase';
export async function authorizeAdmin(request:Request){if(!sameOrigin(request))return {error:NextResponse.json({error:'Origen no permitido.'},{status:403})};const user=await getAdmin();if(!user)return {error:NextResponse.json({error:'Iniciá sesión como administrador.'},{status:401})};return {user};}
export function adminService(){if(!process.env.SUPABASE_SECRET_KEY||!process.env.NEXT_PUBLIC_SUPABASE_URL)throw new Error('Configuración de administración pendiente.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
export const adminReply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
