import {adminReply,authorizeAdmin} from '@/lib/admin-server';
import {recoveryPath} from '@/lib/order-access';
import {orderIdPattern} from '@/lib/payment-config';
import {readSmallJson} from '@/lib/request';
import {indexableHost,siteOrigin} from '@/lib/site-release';

export async function POST(request:Request){
 const access=await authorizeAdmin(request);
 if(access.error)return access.error;
 if(!indexableHost(request.headers.get('host')))return adminReply({error:'Abrí Pedidos desde el dominio oficial de la tienda.'},403);
 let input;
 try{input=await readSmallJson(request);}catch{return adminReply({error:'Revisá el pedido.'},400);}
 if(typeof input.id!=='string'||!orderIdPattern.test(input.id))return adminReply({error:'Pedido inválido.'},400);
 const {data,error}=await access.db.from('tienda_pedidos').select('id,visitor_hash,customer_email').eq('id',input.id).eq('mode','production').maybeSingle();
 if(error)return adminReply({error:'No pudimos consultar el pedido. Intentá de nuevo.'},503);
 if(!data)return adminReply({error:'Pedido no disponible.'},404);
 const email=data.customer_email;
 if(typeof email!=='string'||!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email))return adminReply({error:'El pedido no tiene un correo válido.'},409);
 const path=recoveryPath(data.id,data.visitor_hash,'email');
 if(!path)return adminReply({error:'El enlace de recuperación no está disponible.'},503);
 const link=new URL(path,siteOrigin).href;
 const reference='#'+data.id.slice(0,8);
 const subject='Acceso a tu pedido '+reference+' de Granja Atuel';
 const message='Hola,\n\nPodés abrir tu pedido '+reference+' con este enlace privado. Vence en 24 horas.\n\n'+link+'\n\nGranja Atuel';
 const draft='mailto:'+encodeURIComponent(email).replace('%40','@')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
 return adminReply({draft});
}
