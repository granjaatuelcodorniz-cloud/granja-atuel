import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
// Refresh private app sessions. Authorization is still enforced by routes and RLS.
export async function proxy(request:NextRequest){
  let response=NextResponse.next({request});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return response;
  const db=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}));}}});
  await db.auth.getUser();
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config={matcher:['/admin/:path*','/api/admin/:path*','/incubacion/:path*','/api/incubacion/:path*']};
