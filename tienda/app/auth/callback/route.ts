import {NextResponse} from 'next/server';
import {databaseConfigured,supabaseServer} from '@/lib/supabase';
const previewOrigin='https://granja-atuel-tien-git-d38687-granjaatuelcodorniz-4243s-projects.vercel.app';
export async function GET(request:Request){
 const url=new URL(request.url);
 const origin=process.env.NODE_ENV==='production'?previewOrigin:url.origin;
 let ok=false;
 const code=url.searchParams.get('code');
 if(databaseConfigured()&&code&&!url.searchParams.has('error')){
 try{const db=await supabaseServer();const {error}=await db.auth.exchangeCodeForSession(code);ok=!error;}catch{/* Return a safe, retryable message, never provider details or tokens. */}
 }
 return NextResponse.redirect(new URL(ok?'/incubacion':'/incubacion?acceso=error',origin),{status:303,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
