import {NextResponse} from 'next/server';
import {supabaseServer,databaseConfigured} from '@/lib/supabase';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {validateNewLot,validateEvent,type Lot} from '@/lib/incubation';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!databaseConfigured())return reply({error:'La conexión no está disponible.'},503);
 const db=await supabaseServer();const {data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Ingresá para guardar tu incubación.'},401);
 let body;try{body=await readSmallJson(request);}catch{return reply({error:'Solicitud inválida.'},400);}
 try{
 if(body.action==='create'){
 const values=validateNewLot(body);
 if(values.delivery_id){const {data:delivery}=await db.from('incubacion_entregas').select('id,delivered_on,egg_count,active').eq('id',values.delivery_id).eq('owner_id',user.id).maybeSingle();if(!delivery||!delivery.active||values.start_date<delivery.delivered_on||values.egg_count>delivery.egg_count)return reply({error:'La entrega no coincide con tu cuenta, cantidad o fecha de inicio.'},400);}const {data,error}=await db.from('incubacion_lotes').insert(values).select().single();
 if(error)return reply({error:values.delivery_id?'No pudimos vincular la entrega. Comprobá que queden huevos sin asignar a otras incubaciones.':'No pudimos guardar la incubación. Intentá de nuevo.'},values.delivery_id?409:503);return reply({lot:data},201);
 }
 if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.id)||!Number.isInteger(body.version))return reply({error:'Incubación inválida.'},400);
 const {data:lot,error:readError}=await db.from('incubacion_lotes').select('*').eq('id',body.id).eq('owner_id',user.id).maybeSingle();
 if(readError)return reply({error:'No pudimos consultar la incubación.'},503);
 if(!lot)return reply({error:'No encontramos esa incubación.'},404);
 if(lot.version!==body.version)return reply({error:'Esta incubación cambió en otro dispositivo. Recargá antes de guardar.'},409);
 if(body.action==='delete'){
 const {data,error}=await db.from('incubacion_lotes').delete().eq('id',lot.id).eq('owner_id',user.id).eq('version',body.version).select('id');
 if(error)return reply({error:'No pudimos eliminarla.'},503);if(!data?.length)return reply({error:'La incubación cambió. Recargá la página.'},409);return reply({deleted:lot.id});
 }
 const values=validateEvent(body,lot as Lot);
 if('delivery_id' in values&&values.delivery_id){const {data:delivery}=await db.from('incubacion_entregas').select('id,delivered_on,egg_count,active').eq('id',values.delivery_id).eq('owner_id',user.id).maybeSingle();if(lot.source!=='granja_atuel'||!delivery||!delivery.active||lot.start_date<delivery.delivered_on||lot.egg_count>delivery.egg_count)return reply({error:'La entrega no coincide con el origen, cantidad o fecha de esta incubación.'},400);}
 const {data,error}=await db.from('incubacion_lotes').update({...values,version:lot.version+1}).eq('id',lot.id).eq('owner_id',user.id).eq('version',body.version).select().maybeSingle();
 if(error)return reply({error:body.action==='traceability'?'No pudimos vincular la entrega. Revisá que esté activa y tenga huevos sin asignar a otras incubaciones.':'No pudimos guardar. Revisá las cantidades y las fechas.'},400);
 if(!data)return reply({error:'La incubación cambió en otro dispositivo. Recargá la página.'},409);
 return reply({lot:data});
 }catch(e){return reply({error:e instanceof Error?e.message:'Revisá los datos.'},400);}
}
