import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {databaseConfigured,supabaseServer} from '@/lib/supabase';
const previewOrigin='https://granja-atuel-tien-git-d38687-granjaatuelcodorniz-4243s-projects.vercel.app';
export async function GET(request:Request){
 const url=new URL(request.url);const recovery=(await cookies()).has('ga_recovery_requested');
 const origin=process.env.NODE_ENV==='production'?previewOrigin:url.origin;
 let ok=false;
 const code=url.searchParams.get('code');
 if(databaseConfigured()&&code&&!url.searchParams.has('error')){
 try{const db=await supabaseServer();const {data,error}=await db.auth.exchangeCodeForSession(code);ok=!error;
 if(ok&&recovery&&data.user){const jar=await cookies();jar.set('ga_recovery_verified',data.user.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});}}catch{/* Return a safe, retryable message, never provider details or tokens. */}
 }
 (await cookies()).delete('ga_recovery_requested');
 return NextResponse.redirect(new URL(recovery?(ok?'/incubacion/recuperar':'/incubacion/recuperar?error=enlace'):ok?'/incubacion':'/incubacion?acceso=error',origin),{status:303,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
