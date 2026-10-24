import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validateOrderUpdate} from '@/lib/admin';
export async function PUT(request:Request){const access=await authorizeAdmin(request);if(access.error)return access.error;try{const {id,...data}=validateOrderUpdate(await readSmallJson(request));const db=await supabaseServer();const result=await db.from('tienda_pedidos').update(data).eq('id',id).select('id,customer_name,customer_email,total_cents,status,created_at,items,fulfillment_status,admin_notes,shipping_carrier,tracking_code').single();if(result.error)return adminReply({error:'No pudimos guardar el pedido.'},500);return adminReply({order:result.data});}catch(e){return adminReply({error:e instanceof Error?e.message:'Pedido inválido.'},400);}}
