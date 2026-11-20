import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validDate,todayAR} from '@/lib/incubation';
export async function POST(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 try{
  const b=await readSmallJson(request);const today=todayAR();
  if(typeof b.owner_id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.owner_id)||typeof b.batch_code!=='string'||!b.batch_code.trim()||b.batch_code.length>80||!validDate(b.production_date)||b.production_date<'2020-01-01'||!validDate(b.delivered_on)||b.production_date>b.delivered_on||b.delivered_on>today||!Number.isInteger(b.egg_count)||Number(b.egg_count)<1||Number(b.egg_count)>100000||typeof b.purchase_reference!=='string'||b.purchase_reference.length>100)return adminReply({error:'Revisá el cliente, la partida, las fechas y la cantidad.'},400);
  const db=await supabaseServer();
  // A known app customer, never an arbitrary Auth identifier supplied by the form.
  const {data:customer,error:readError}=await db.from('incubacion_lotes').select('id').eq('owner_id',b.owner_id).limit(1).maybeSingle();
  if(readError)return adminReply({error:'No pudimos comprobar el cliente.'},503);
  if(!customer)return adminReply({error:'El cliente debe tener al menos una incubación registrada.'},400);
  const {data,error}=await db.from('incubacion_entregas').insert({owner_id:b.owner_id,batch_code:b.batch_code.trim(),production_date:b.production_date,delivered_on:b.delivered_on,egg_count:b.egg_count,purchase_reference:b.purchase_reference.trim()}).select('*').single();
  if(error)return adminReply({error:'No pudimos registrar la entrega.'},503);
  return adminReply({delivery:data});
 }catch{return adminReply({error:'Solicitud inválida.'},400);}
}
export async function PUT(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 try{const b=await readSmallJson(request);if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||typeof b.active!=='boolean'||!Number.isInteger(b.version))return adminReply({error:'Entrega inválida.'},400);
 const db=await supabaseServer();const {data,error}=await db.from('incubacion_entregas').update({active:b.active,version:Number(b.version)+1}).eq('id',b.id).eq('version',b.version).select('*').maybeSingle();
 if(error)return adminReply({error:'No pudimos actualizar la entrega.'},503);if(!data)return adminReply({error:'La entrega cambió. Actualizá el historial.'},409);return adminReply({delivery:data});
 }catch{return adminReply({error:'Solicitud inválida.'},400);}
}
