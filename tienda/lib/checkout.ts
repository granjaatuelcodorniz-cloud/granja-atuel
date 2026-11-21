import {GranjaAtuelTestSeller,type PaymentMode} from './payment-config.ts';
import {canBuy,stockLimit,type Product,type CartLine} from './catalog.ts';
export type OrderItem={id:string;title:string;quantity:number;unit_price:number};
export const provinces=['Buenos Aires','Ciudad Autónoma de Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'] as const;
export type DeliveryAddress={province:string;city:string;postal_code:string;address:string;phone:string;reference:string;dni?:string};
export function validateDeliveryAddress(value:unknown,requiresDni=false): DeliveryAddress {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Completá los datos de entrega.');
 const d=value as Record<string,unknown>;
 const field=(key:string,min:number,max:number)=>{
  const raw=d[key];if(typeof raw!=='string'||raw.trim().length<min||raw.length>max||/[\x00-\x1F\x7F]/.test(raw))throw new Error('Revisá los datos de entrega.');
  return raw.trim();
 };
 const province=field('province',1,40);
 if(!provinces.includes(province as typeof provinces[number]))throw new Error('Elegí la provincia de entrega.');
 const postal_code=field('postal_code',4,10).toUpperCase().replace(/\s/g,'');
 if(!/^(?:\d{4}|[A-Z]\d{4}[A-Z]{3})$/.test(postal_code))throw new Error('Ingresá un código postal de 4 números o un CPA completo.');
 const phone=field('phone',6,32);
 const digits=phone.replace(/\D/g,'').length;
 if(!/^\+?[\d ()-]+$/.test(phone)||digits<6||digits>15)throw new Error('Revisá el teléfono de entrega.');
 const address:DeliveryAddress={province,postal_code,phone,city:field('city',2,100),address:field('address',3,180),reference:field('reference',0,240)};
 if(requiresDni){
  const raw=d.dni;
  const dni=typeof raw==='string'&&/^[0-9. ]{1,12}$/.test(raw)?raw.replace(/[. ]/g,''):'';
  if(!/^[0-9]{5,8}$/.test(dni)||/^0+$/.test(dni))throw new Error('Ingresá el DNI de quien recibe, sin puntos. Si no ves el campo, volvé a cargar el formulario.');
  address.dni=dni;
 }
 return address;
}
export const statusLabels:Record<string,string>={awaiting_payment:'Esperando pago',pending:'Pago pendiente',approved:'Pago de prueba aprobado',rejected:'Pago rechazado',cancelled:'Pago cancelado',refunded:'Pago devuelto',charged_back:'Pago contracargado'};
export function validateCheckout(b:Record<string,unknown>,requiresDni=false){
 if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>100||/[\x00-\x1F\x7F]/.test(b.name)||typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email))throw new Error('Revisá el nombre y el correo.');
 if(typeof b.request_key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.request_key))throw new Error('Identificador de pedido inválido.');
 if(!Array.isArray(b.cart)||!b.cart.length||b.cart.length>20)throw new Error('Revisá tu carrito.');
 if(!Number.isSafeInteger(b.expected_total_cents)||Number(b.expected_total_cents)<100)throw new Error('Revisá el importe del pedido.');
 const seen=new Set<string>();const lines:CartLine[]=b.cart.map((l:unknown)=>{if(!l||typeof l!=='object')throw new Error('Carrito inválido.');const r=l as Record<string,unknown>;if(typeof r.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(r.id)||!Number.isInteger(r.quantity)||Number(r.quantity)<1||Number(r.quantity)>20||seen.has(r.id))throw new Error('Revisá las cantidades del carrito.');seen.add(r.id);return {id:r.id,quantity:Number(r.quantity)};});
 return {name:b.name.trim(),email:b.email.trim().toLowerCase(),request_key:b.request_key,expected_total_cents:Number(b.expected_total_cents),lines,delivery_address:validateDeliveryAddress(b.delivery_address,requiresDni)};
}
export function priceOrder(lines:CartLine[],products:Product[]){const items:OrderItem[]=lines.map(l=>{const p=products.find(p=>p.id===l.id&&canBuy(p)&&l.quantity<=stockLimit(p));if(!p||!Number.isSafeInteger(p.price)||p.price<1)throw new Error('Un producto cambió de disponibilidad. Volvé al catálogo.');return {id:p.id,title:p.name+' · '+p.description,quantity:l.quantity,unit_price:p.price};});const total_cents=items.reduce((s,i)=>s+i.unit_price*i.quantity*100,0);if(!Number.isSafeInteger(total_cents)||total_cents<100||total_cents>10000000000)throw new Error('El importe del pedido no es válido.');return {items,total_cents};}
// Test-user payments can arrive with live_mode=true for this isolated test seller.
export function validTestPaymentMode(p:Record<string,unknown>,sellerId:string){
 return p.live_mode===false||(p.live_mode===true&&sellerId===GranjaAtuelTestSeller&&String(p.collector_id)===GranjaAtuelTestSeller);
}
export function validPayment(p:Record<string,unknown>,order:{id:string;total_cents:number},sellerId:string,mode:PaymentMode='test'){
 const validMode=mode==='production'?p.live_mode===true&&sellerId!==GranjaAtuelTestSeller:validTestPaymentMode(p,sellerId);
 return validMode&&p.external_reference===order.id&&String(p.collector_id)===sellerId&&p.currency_id==='ARS'&&typeof p.transaction_amount==='number'&&Math.round(p.transaction_amount*100)===Number(order.total_cents)&&typeof p.status==='string'&&['pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back'].includes(p.status)&&typeof p.date_last_updated==='string'&&Number.isFinite(Date.parse(p.date_last_updated));
}
export const paymentLabel=(status:string,mode:PaymentMode='test')=>mode==='production'&&status==='approved'?'Pago aprobado':statusLabels[status]||'Verificando pago';
