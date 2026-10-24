import {NextResponse} from 'next/server';
import {databaseConfigured,supabaseServer} from '@/lib/supabase';
const previewOrigin='https://granja-atuel-tien-git-d38687-granjaatuelcodorniz-4243s-projects.vercel.app';
export async function GET(request:Request){
 // OAuth cookies and the callback must use the same stable host, even when a
 // visitor arrived through an immutable Vercel deployment URL.
 const url=new URL(request.url);
 const origin=process.env.NODE_ENV==='production'?previewOrigin:url.origin;
 if(process.env.NODE_ENV==='production'&&request.headers.get('host')!==new URL(previewOrigin).host)return NextResponse.redirect(new URL('/api/incubacion/google',origin),{status:307,headers:{'Cache-Control':'no-store'}});
 const failure=()=>NextResponse.redirect(new URL('/incubacion?acceso=error',origin),{status:303,headers:{'Cache-Control':'no-store'}});
 if(!databaseConfigured())return failure();
 try{
 const db=await supabaseServer();
 const {data,error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/auth/callback',skipBrowserRedirect:true}});
 if(error||!data.url)return failure();
 return NextResponse.redirect(data.url,{status:303,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{return failure();}
}
