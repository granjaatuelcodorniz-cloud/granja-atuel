import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {digest} from './order-server';
import {databaseConfigured} from './supabase';
import {getCatalog} from './products';
import {legacyPurchaseLink} from './legacy-purchases';
import {orderIdPattern} from './payment-config';
import type {OrderItem,validateCheckout} from './checkout';

type CheckoutInput=ReturnType<typeof validateCheckout>;
export type LinkOrder={
 id:string;items:OrderItem[];total_cents:number;status:string;expires_at:string;
 fulfillment_status:string;shipping_carrier:string;tracking_code:string;link_reported_payment:string|null;
};
export const linkOrdersConfigured=()=>databaseConfigured()&&/^[a-f0-9]{64}$/.test(process.env.ATUEL_LINK_ORDERS_KEY??'');
function linkDb(){
 if(!linkOrdersConfigured())throw new LinkOrderError('La compra en línea no está disponible ahora.',503);
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(8000)})},
 });
}
export class LinkOrderError extends Error {
 constructor(message:string,public status:number){super(message);this.name='LinkOrderError';}
}
export async function saveLinkOrder(input:CheckoutInput,hash:string){
 const [line]=input.lines;
 if(input.lines.length!==1||line.quantity!==1)throw new LinkOrderError('Elegí una presentación para pagar con este enlace.',409);
 const catalog=await getCatalog();
 if(catalog.source!=='database')throw new LinkOrderError('No pudimos verificar el catálogo. Intentá de nuevo.',503);
 const product=catalog.products.find(p=>p.id===line.id);
 if(!product||!legacyPurchaseLink(product)||product.price*100!==input.expected_total_cents)throw new LinkOrderError('Cambió el precio o la disponibilidad. Revisá la presentación antes de pagar.',409);
 const requestHash=digest(JSON.stringify([input.name,input.email,input.delivery_address,input.lines,input.expected_total_cents]));
 const {data,error}=await linkDb().rpc('tienda_create_link_order',{
  p_key:process.env.ATUEL_LINK_ORDERS_KEY,p_visitor:hash,p_request_key:input.request_key,p_request_hash:requestHash,
  p_product:product.id,p_total_cents:input.expected_total_cents,p_name:input.name,p_email:input.email,p_delivery:input.delivery_address,
 });
 if(error?.message==='LINK_ORDER_LIMIT')throw new LinkOrderError('Hiciste varios intentos. Abrí tu pedido anterior o consultanos por WhatsApp.',429);
 if(error?.message==='LINK_ORDER_CHANGED'||error?.message==='LINK_ORDER_CONFLICT')throw new LinkOrderError('El pedido cambió. Volvé al catálogo para revisarlo.',409);
 if(error||typeof data!=='string'||!orderIdPattern.test(data))throw new LinkOrderError('No pudimos guardar tus datos. Intentá de nuevo.',503);
 return data;
}
export async function readLinkOrder(id:string,hash:string):Promise<LinkOrder|null>{
 const {data,error}=await linkDb().rpc('tienda_read_link_order',{p_key:process.env.ATUEL_LINK_ORDERS_KEY,p_visitor:hash,p_order:id});
 if(error)throw new LinkOrderError('No pudimos consultar el pedido. Volvé a intentar.',503);
 return data as LinkOrder|null;
}
export async function reportLinkPayment(id:string,hash:string,payment:string){
 const {data,error}=await linkDb().rpc('tienda_report_link_payment',{p_key:process.env.ATUEL_LINK_ORDERS_KEY,p_visitor:hash,p_order:id,p_payment:payment});
 if(error)throw new LinkOrderError('No pudimos guardar el número de operación. Intentá de nuevo.',503);
 return data===true;
}
export function canOpenLinkPayment(order:LinkOrder){
 return order.status==='awaiting_payment'&&order.fulfillment_status!=='cancelled'&&!order.link_reported_payment&&Date.parse(order.expires_at)>Date.now();
}
export async function currentLinkForOrder(order:LinkOrder){
 if(!canOpenLinkPayment(order)||order.items.length!==1||order.items[0].quantity!==1)return null;
 const catalog=await getCatalog(),item=order.items[0];
 const p=catalog.products.find(p=>p.id===item.id);
 return catalog.source==='database'&&p&&p.price*100===Number(order.total_cents)?legacyPurchaseLink(p):null;
}
