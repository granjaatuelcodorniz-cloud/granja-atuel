import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validateSettings} from '@/lib/admin';
export async function PUT(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 try{
  const body=await readSmallJson(request);const data=validateSettings(body);
  if(typeof body.expected_updated_at!=='string'||!Number.isFinite(Date.parse(body.expected_updated_at)))return adminReply({error:'Actualizá el panel antes de guardar.'},409);
  const db=await supabaseServer();
  const result=await db.from('tienda_configuracion').update({data,updated_at:new Date().toISOString()}).eq('id','main').eq('updated_at',body.expected_updated_at).select('updated_at').maybeSingle();
  if(result.error)return adminReply({error:'No pudimos guardar la configuración.'},500);
  if(!result.data)return adminReply({error:'La configuración cambió en otra ventana. Actualizá el panel para ver la versión guardada.'},409);
  return adminReply({settings:data,updated_at:result.data.updated_at});
 }catch(e){return adminReply({error:e instanceof Error?e.message:'Configuración inválida.'},400);}
}
