import type {Product,CartLine} from './catalog';
export type OrderItem={id:string;title:string;quantity:number;unit_price:number};
export const statusLabels:Record<string,string>={awaiting_payment:'Esperando pago',pending:'Pago pendiente',approved:'Pago de prueba aprobado',rejected:'Pago rechazado',cancelled:'Pago cancelado',refunded:'Pago devuelto',charged_back:'Pago contracargado'};
export function validateCheckout(b:Record<string,unknown>){
 if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>100||typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email))throw new Error('Revisá el nombre y el correo.');
 if(typeof b.request_key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.request_key))throw new Error('Identificador de pedido inválido.');
 if(!Array.isArray(b.cart)||!b.cart.length||b.cart.length>20)throw new Error('Revisá tu carrito.');
 if(!Number.isSafeInteger(b.expected_total_cents)||Number(b.expected_total_cents)<100)throw new Error('Revisá el importe del pedido.');
 const seen=new Set<string>();const lines:CartLine[]=b.cart.map((l:unknown)=>{if(!l||typeof l!=='object')throw new Error('Carrito inválido.');const r=l as Record<string,unknown>;if(typeof r.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(r.id)||!Number.isInteger(r.quantity)||Number(r.quantity)<1||Number(r.quantity)>20||seen.has(r.id))throw new Error('Revisá las cantidades del carrito.');seen.add(r.id);return {id:r.id,quantity:Number(r.quantity)};});
 return {name:b.name.trim(),email:b.email.trim().toLowerCase(),request_key:b.request_key,expected_total_cents:Number(b.expected_total_cents),lines};
}
export function priceOrder(lines:CartLine[],products:Product[]){const items:OrderItem[]=lines.map(l=>{const p=products.find(p=>p.id===l.id&&p.active&&p.available);if(!p||!Number.isSafeInteger(p.price)||p.price<1)throw new Error('Un producto cambió de disponibilidad. Volvé al catálogo.');return {id:p.id,title:p.name+' · '+p.description,quantity:l.quantity,unit_price:p.price};});const total_cents=items.reduce((s,i)=>s+i.unit_price*i.quantity*100,0);if(!Number.isSafeInteger(total_cents)||total_cents<100||total_cents>10000000000)throw new Error('El importe del pedido no es válido.');return {items,total_cents};}
export function validPayment(p:Record<string,unknown>,order:{id:string;total_cents:number},sellerId:string){
 return p.live_mode===false&&p.external_reference===order.id&&String(p.collector_id)===sellerId&&p.currency_id==='ARS'&&typeof p.transaction_amount==='number'&&Math.round(p.transaction_amount*100)===Number(order.total_cents)&&typeof p.status==='string'&&['pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back'].includes(p.status)&&typeof p.date_last_updated==='string'&&Number.isFinite(Date.parse(p.date_last_updated));
}

export function validPreference(p:Record<string,unknown>,orderId:string,sellerId:string){return String(p.collector_id)===sellerId&&p.external_reference===orderId;}
