import {redirect} from 'next/navigation';
import {getAdmin,supabaseServer} from '@/lib/supabase';
import {adminService} from '@/lib/admin-server';
import type {Lot} from '@/lib/incubation';
import type {Delivery} from '@/lib/incubation-report';
import IncubationReport from '@/components/admin/IncubationReport';
export const dynamic='force-dynamic';
export default async function IncubationReports(){
 if(!await getAdmin())redirect('/admin/login');
 const db=await supabaseServer();let lots:Lot[]=[],deliveries:Delivery[]=[];
 // Explicit pagination avoids silently truncating histories at the API row limit.
 for(const table of ['incubacion_lotes','incubacion_entregas'] as const){
  for(let offset=0;;offset+=1000){
   const {data,error}=await db.from(table).select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+999);
   if(error)return <main className="admin-shell"><h1>No pudimos cargar el historial completo.</h1><p>Actualizá antes de consultar resultados o registrar entregas.</p></main>;
   if(table==='incubacion_lotes')lots.push(...data as Lot[]);else deliveries.push(...data as Delivery[]);
   if(data.length<1000)break;
  }
 }
 const accounts=new Map<string,string>();for(const id of new Set([...lots.map(l=>l.owner_id),...deliveries.map(d=>d.owner_id)]))accounts.set(id,id);
 if(process.env.SUPABASE_SECRET_KEY){const service=adminService();const ids=[...accounts.keys()];for(let i=0;i<ids.length;i+=10)await Promise.all(ids.slice(i,i+10).map(async id=>{try{const {data}=await service.auth.admin.getUserById(id);if(data.user?.email)accounts.set(id,data.user.email);}catch{/* Retain stable identifier. */}}));}
 const deliveriesById=new Map(deliveries.map(d=>[d.id,d]));
 return <IncubationReport lots={lots.map(l=>({...l,account:accounts.get(l.owner_id)!,delivery:l.delivery_id?deliveriesById.get(l.delivery_id):undefined}))} deliveries={deliveries} accounts={[...accounts].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label))}/>;
}
