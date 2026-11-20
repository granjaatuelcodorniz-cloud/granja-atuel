import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {supabaseServer} from '@/lib/supabase';
import {readSmallJson} from '@/lib/request';
import {validateStock} from '@/lib/admin';
export async function POST(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 let b;try{b=validateStock(await readSmallJson(request));}catch(e){return adminReply({error:e instanceof Error?e.message:'Movimiento inválido.'},400);}
 try{const db=await supabaseServer();const result=await db.rpc('tienda_adjust_stock_as_admin',{p_product_id:b.product_id,p_delta:b.delta,p_reason:b.reason,p_request_key:b.request_key,p_expected_quantity:b.expected_quantity});
 if(result.error)return adminReply({error:'No se aplicó el movimiento. Actualizá el stock y revisá la cantidad y el motivo.'},409);
 const {data:product}=await db.from('tienda_productos').select('*').eq('id',b.product_id).single();const {data:movement}=await db.from('tienda_stock_movimientos').select('id,product_id,delta,previous_quantity,new_quantity,reason,created_at').eq('request_key',b.request_key).single();
 return adminReply({product,movement});}catch{return adminReply({error:'No pudimos conectar con el inventario.'},503);}
}
