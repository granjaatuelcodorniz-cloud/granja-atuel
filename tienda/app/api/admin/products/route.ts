import {supabaseServer} from '@/lib/supabase';
import {publicationActions,validateAdminProduct,validatePublication} from '@/lib/admin';
import {publicationOf} from '@/lib/catalog';
import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {readSmallJson} from '@/lib/request';
async function save(request:Request,create:boolean){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 let body,product;try{body=await readSmallJson(request);product=validateAdminProduct(body);}catch(e){return adminReply({error:e instanceof Error?e.message:'Producto inválido.'},400);}
 if(!create&&(typeof body.expected_updated_at!=='string'||!Number.isFinite(Date.parse(body.expected_updated_at))))return adminReply({error:'Actualizá el producto antes de guardarlo.'},400);
 const db=await supabaseServer();
 const {id,active,publication_state,...fields}=product;
 const row={...fields,updated_at:new Date().toISOString()};
 // Quantity is deliberately absent: only an audited stock movement may change it.
 const result=create?await db.from('tienda_productos').insert({...product,active:false,publication_state:'draft'}).select('*').single():await db.from('tienda_productos').update(row).eq('id',id).eq('updated_at',body.expected_updated_at).select('*').maybeSingle();
 if(result.error)return adminReply({error:result.error.code==='23505'?'Ese identificador o SKU ya existe.':'No pudimos guardar el producto.'},409);
 if(!result.data)return adminReply({error:'Este producto cambió en otra ventana. Actualizá el panel antes de editarlo.'},409);
 return adminReply({product:result.data});
}
export async function POST(r:Request){return save(r,true);}
export async function PUT(r:Request){return save(r,false);}
export async function PATCH(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 try{
  const {id,expected_updated_at,...update}=validatePublication(await readSmallJson(request));
  const db=await supabaseServer();
  const current=await db.from('tienda_productos').select('active,publication_state,updated_at').eq('id',id).maybeSingle();
  if(current.error)return adminReply({error:'No pudimos consultar la publicación.'},503);
  if(!current.data||current.data.updated_at!==expected_updated_at)return adminReply({error:'La publicación cambió. Actualizá el panel antes de continuar.'},409);
  if(!publicationActions[publicationOf(current.data)].includes(update.publication_state))return adminReply({error:'Ese cambio de estado no está disponible.'},409);
  const result=await db.from('tienda_productos').update({...update,updated_at:new Date().toISOString()}).eq('id',id).eq('updated_at',expected_updated_at).select('*').maybeSingle();
  if(result.error)return adminReply({error:'No pudimos cambiar el estado.'},500);
  if(!result.data)return adminReply({error:'La publicación cambió. Actualizá el panel antes de continuar.'},409);
  return adminReply({product:result.data});
 }catch(e){return adminReply({error:e instanceof Error?e.message:'Estado inválido.'},400);}
}
