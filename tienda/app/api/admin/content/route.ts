import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validateSiteContent} from '@/lib/site-content';
import {contentFields} from '@/lib/site-content-server';

async function save(request:Request, create:boolean) {
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 try{
  const body=await readSmallJson(request);
  const {id,kind,data,position,published}=validateSiteContent(body);
  if(!create&&(typeof body.expected_updated_at!=='string'||!Number.isFinite(Date.parse(body.expected_updated_at))))return adminReply({error:'Actualizá el contenido antes de guardar.'},409);
  const db=await supabaseServer();
  const fields={data,position,published,updated_at:new Date().toISOString()};
  const result=create
   ?await db.from('tienda_contenidos').insert({id,kind,...fields}).select(contentFields).single()
   :await db.from('tienda_contenidos').update(fields).eq('id',id).eq('kind',kind).eq('updated_at',body.expected_updated_at).select(contentFields).maybeSingle();
  if(result.error)return adminReply({error:result.error.code==='23505'?'Ese contenido ya existe.':'No pudimos guardar el contenido.'},409);
  if(!result.data)return adminReply({error:'El contenido cambió en otra ventana. Actualizá el panel antes de continuar.'},409);
  return adminReply({entry:result.data},create?201:200);
 }catch(e){return adminReply({error:e instanceof Error?e.message:'Contenido inválido.'},400);}
}
export async function POST(r:Request){return save(r,true);}
export async function PUT(r:Request){return save(r,false);}
