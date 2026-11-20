import {cookies,headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {previewAuthOrigin} from '@/lib/auth-origin';
import RecoverAccount from '@/components/RecoverAccount';
import {supabaseServer,databaseConfigured} from '@/lib/supabase';
export const dynamic='force-dynamic';
export const metadata={title:'Recuperar acceso · Granja Atuel',referrer:'no-referrer' as const};
export default async function RecoverPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(process.env.NODE_ENV==='production'&&(await headers()).get('host')!==new URL(previewAuthOrigin).host)redirect(previewAuthOrigin+'/incubacion/recuperar');
 const jar=await cookies();let verified=false;
 if(jar.has('ga_recovery_verified')&&databaseConfigured()){const db=await supabaseServer();const {data:{user}}=await db.auth.getUser();verified=!!user&&jar.get('ga_recovery_verified')?.value===user.id;}
 return <main className="inc-shell"><RecoverAccount verified={verified} failed={!!(await searchParams).error}/></main>;
}
