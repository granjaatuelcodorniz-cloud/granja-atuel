import {supabaseServer} from '@/lib/supabase';
import {validateAdminProduct} from '@/lib/admin';
import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {readSmallJson} from '@/lib/request';
async function save(request:Request,create:boolean){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 let body;try{body=await readSmallJson(request);body={...body,...validateAdminProduct(body)};}catch(e){return adminReply({error:e instanceof Error?e.message:'Producto inválido.'},400);}
 if(!create&&(typeof body.expected_updated_at!=='string'||!Number.isFinite(Date.parse(body.expected_updated_at))))return adminReply({error:'Actualizá el producto antes de guardarlo.'},400);
 const product=validateAdminProduct(body);const db=await supabaseServer();
 const {id,...fields}=product;
 const row={...fields,updated_at:new Date().toISOString()};
 // Quantity is deliberately absent: only an audited stock movement may change it.
 const result=create?await db.from('tienda_productos').insert(product).select('*').single():await db.from('tienda_productos').update(row).eq('id',product.id).eq('updated_at',body.expected_updated_at).select('*').maybeSingle();
 if(result.error)return adminReply({error:result.error.code==='23505'?'Ese identificador o SKU ya existe.':'No pudimos guardar el producto.'},409);
 if(!result.data)return adminReply({error:'Este producto cambió en otra ventana. Actualizá el panel antes de editarlo.'},409);
 return adminReply({product:result.data});
}
export async function POST(r:Request){return save(r,true);}
export async function PUT(r:Request){return save(r,false);}
