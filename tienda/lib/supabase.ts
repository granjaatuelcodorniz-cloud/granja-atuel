import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const databaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export async function supabaseServer() {
  if(!databaseConfigured()) throw new Error('La conexión a la base de datos todavía no está configurada.');
  const jar=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
    cookies:{getAll:()=>jar.getAll(), setAll:values=>{try {values.forEach(({name,value,options})=>jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}));} catch { /* Read-only Server Component. Route handlers refresh sessions. */ }}}
  });
}
export async function getAdmin() {
  if(!databaseConfigured()) return null;
  const db=await supabaseServer();
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user) return null;
  const {data}=await db.from('tienda_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  return data ? user : null;
}
