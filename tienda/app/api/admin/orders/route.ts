import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validateOrderUpdate} from '@/lib/admin';
import {validateFulfillment} from '@/lib/fulfillment';
export async function PUT(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 try{
  const body=await readSmallJson(request);const {id,...data}=validateOrderUpdate(body);const db=await supabaseServer();
  const {data:current,error}=await db.from('tienda_pedidos').select('status,fulfillment_version').eq('id',id).maybeSingle();
  if(error)return adminReply({error:'No pudimos consultar el pedido.'},503);if(!current)return adminReply({error:'Pedido no disponible.'},404);
  if(body.fulfillment_version!==current.fulfillment_version)return adminReply({error:'El pedido cambió. Actualizá antes de guardar.'},409);
  validateFulfillment(data,current.status);
  const result=await db.from('tienda_pedidos').update({...data,fulfillment_version:current.fulfillment_version+1}).eq('id',id).eq('fulfillment_version',current.fulfillment_version).eq('status',current.status).select('id,customer_name,customer_email,total_cents,status,created_at,items,fulfillment_status,fulfillment_version,admin_notes,shipping_carrier,tracking_code').maybeSingle();
  if(result.error)return adminReply({error:'No pudimos guardar el pedido.'},500);if(!result.data)return adminReply({error:'El pedido cambió. Actualizá antes de guardar.'},409);
  return adminReply({order:result.data});
 }catch(e){return adminReply({error:e instanceof Error?e.message:'Pedido inválido.'},400);}
}
