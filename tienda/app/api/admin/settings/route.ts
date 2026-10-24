import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validateSettings} from '@/lib/admin';
export async function PUT(request:Request){const access=await authorizeAdmin(request);if(access.error)return access.error;try{const data=validateSettings(await readSmallJson(request));const db=await supabaseServer();const result=await db.from('tienda_configuracion').update({data,updated_at:new Date().toISOString()}).eq('id','main').select('id').single();if(result.error)return adminReply({error:'No pudimos guardar la configuración.'},500);return adminReply({settings:data});}catch(e){return adminReply({error:e instanceof Error?e.message:'Configuración inválida.'},400);}}
