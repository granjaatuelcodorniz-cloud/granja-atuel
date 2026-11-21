import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {validPaymentLink} from '@/lib/payment-links';
import {readSmallJson} from '@/lib/request';

export async function PUT(request:Request){
 const access=await authorizeAdmin(request);
 if(access.error)return access.error;
 let body;
 try{body=await readSmallJson(request);}catch{return adminReply({error:'Revisá los datos del enlace.'},400);}
 const {product_id,amount_ars,expected_updated_at}=body;
 const url=typeof body.url==='string'?body.url.trim():'';
 if(typeof product_id!=='string'||!/^[a-z0-9-]{1,64}$/.test(product_id))return adminReply({error:'Publicación inválida.'},400);
 if(!validPaymentLink(url))return adminReply({error:'Pegá el enlace de cobro de Mercado Pago que comienza con https://mpago.la/.'},400);
 if(typeof amount_ars!=='number'||!Number.isSafeInteger(amount_ars)||amount_ars<1||amount_ars>100000000)
  return adminReply({error:'Ingresá el importe en pesos que cobra el enlace.'},400);
 if(expected_updated_at!==null&&(typeof expected_updated_at!=='string'||!Number.isFinite(Date.parse(expected_updated_at))))
  return adminReply({error:'Volvé a abrir la publicación antes de guardar el enlace.'},400);
 const table=access.db.from('tienda_enlaces_pago');
 const row={url,amount_ars,updated_at:new Date().toISOString()};
 const query=expected_updated_at===null?
  table.insert({...row,product_id}):
  table.update(row).eq('product_id',product_id).eq('updated_at',expected_updated_at);
 const {data,error}=await query.select('product_id,url,amount_ars,updated_at').maybeSingle();
 if(error?.code==='23505'||(!error&&!data))return adminReply({error:'El enlace cambió en otra ventana. Actualizá los datos del panel.'},409);
 if(error)return adminReply({error:'No pudimos guardar el enlace de cobro.'},503);
 return adminReply({link:data});
}
