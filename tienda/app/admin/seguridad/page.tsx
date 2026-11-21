import {redirect} from 'next/navigation';
import {getAdminSession} from '@/lib/supabase';
import AdminVerification from '@/components/admin/AdminVerification';

export const metadata={title:'Verificación del administrador · Granja Atuel'};

export default async function AdminSecurity(){
 const session=await getAdminSession();
 if(!session)redirect('/admin/login');
 if(session.verified)redirect('/admin');
 const {data,error}=await session.db.auth.mfa.listFactors();
 return <AdminVerification factors={data?.totp.map(({id,friendly_name})=>({id,name:friendly_name||'Aplicación autenticadora'}))??[]} unavailable={!!error}/>;
}
