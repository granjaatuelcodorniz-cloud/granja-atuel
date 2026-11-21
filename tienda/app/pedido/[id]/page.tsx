import Link from 'next/link';
import {headers} from 'next/headers';
import {MessageCircle} from 'lucide-react';
import {getShopSettings} from '@/lib/shop-settings';
import {currentPaymentConfig,orderDb,visitor} from '@/lib/order-server';
import {paymentLabel,type OrderItem} from '@/lib/checkout';
import {orderIdPattern,paymentIdPattern} from '@/lib/payment-config';
import {indexableHost} from '@/lib/site-release';
import {canOpenLinkPayment,linkOrdersConfigured,readLinkOrder,type LinkOrder} from '@/lib/link-orders';
import {money} from '@/lib/catalog';
import {fulfillmentLabels} from '@/lib/admin';
import RefreshOrder from '@/components/RefreshOrder';
import LinkPaymentReport from '@/components/LinkPaymentReport';

export const dynamic='force-dynamic';
export default async function OrderPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [{id},search,hash,h]=await Promise.all([params,searchParams,visitor(),headers()]);
 const paymentId=typeof search.payment_id==='string'&&paymentIdPattern.test(search.payment_id)?search.payment_id:undefined;
 const config=currentPaymentConfig();
 let linkOrder:LinkOrder|null=null,readFailed=false;
 let integrated=null;
 if(hash&&orderIdPattern.test(id)){
  if(indexableHost(h.get('host'))&&linkOrdersConfigured()){
   try{linkOrder=await readLinkOrder(id,hash);}catch{readFailed=true;}
  }
  if(!linkOrder&&config){
   const result=await orderDb().from('tienda_pedidos').select('id,items,total_cents,status,checkout_url,expires_at,fulfillment_status,shipping_carrier,tracking_code').eq('mode',config.mode).eq('payment_flow','checkout_pro').eq('id',id).eq('visitor_hash',hash).maybeSingle();
   readFailed ||= !!result.error;
   integrated=result.data;
  }
 }
 const order=linkOrder??integrated;
 const mode=linkOrder?'production':config?.mode??'test',test=mode==='test';
 const reference='#'+id.slice(0,8);
 const contact=order&&!test?await getShopSettings():null;
 const chat=contact?'https://wa.me/'+contact.whatsapp+'?text='+encodeURIComponent('Hola, quisiera consultar por el pedido '+reference+'.'):null;
 const email=contact?.contact_email?'mailto:'+encodeURIComponent(contact.contact_email).replace('%40','@')+'?subject='+encodeURIComponent('Consulta por el pedido '+reference):null;
 return <main className="inc-shell">
  <header className="inc-header"><Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link><Link className="text-link" href="/#productos">Volver a la tienda</Link></header>
  <section className="inc-panel" style={{marginTop:25}}>
   {!order?<><h1 style={{fontSize:36}}>{readFailed?'No pudimos consultar el pedido.':'Pedido no disponible.'}</h1>
    <p>{readFailed?'Volvé a intentar en unos segundos.':'Abrí este pedido desde el navegador donde lo creaste.'}</p></>:<>
    <p className="eyebrow">{test?'PEDIDO DE PRUEBA · SIN ENTREGA REAL':'TU PEDIDO · GRANJA ATUEL'}</p>
    <h1 style={{fontSize:40,margin:'15px 0'}}>{linkOrder?.link_reported_payment&&order.status==='awaiting_payment'?'Pago informado':paymentLabel(order.status,mode)}</h1>
    <p className="inc-small">Pedido {reference}</p>
    {(order.items as OrderItem[]).map(i=><div className="checkout-item" key={i.id}><span>{i.title} × {i.quantity}</span><strong>{money(i.unit_price*i.quantity)}</strong></div>)}
    <div className="checkout-item"><strong>Total con envío incluido</strong><strong>{money(Number(order.total_cents)/100)}</strong></div>
    {test&&<p className="admin-status">Esta operación es una simulación. No genera venta, reserva, retiro ni envío real.</p>}
    {order.status==='approved'&&<p>{test?'Preparación de prueba':'Preparación'}: <strong>{fulfillmentLabels[order.fulfillment_status]}</strong></p>}
    {order.shipping_carrier&&<p>Transportista: {order.shipping_carrier}</p>}
    {order.tracking_code&&<p>Código de seguimiento: {order.tracking_code}</p>}
    {linkOrder?<section className="link-order-pay">
     <p>Los datos de envío ya quedaron guardados.</p>
     {search.pago==='no-disponible'&&<p role="status">El enlace ya no está disponible. Si todavía no pagaste, revisá la presentación en el catálogo.</p>}
     {search.pago==='intentar'&&<p role="status">No pudimos abrir el enlace en este momento. Volvé a intentar.</p>}
     {canOpenLinkPayment(linkOrder)&&search.pago!=='no-disponible'&&<div className="inc-actions">
      <a className="button" href={'/pedido/'+id+'/pagar'} target="_blank" rel="noreferrer">Continuar a Mercado Pago</a>
      <p className="inc-small">El pago se abre en otra pestaña. Después, volvé acá para informarlo.</p>
     </div>}
     {order.status==='awaiting_payment'&&order.fulfillment_status!=='cancelled'&&<LinkPaymentReport key={linkOrder.link_reported_payment??'unreported'} id={id} reported={linkOrder.link_reported_payment}/>}
    </section>:<>
     <RefreshOrder id={order.id} paymentId={paymentId} status={order.status}/>
     {integrated&&!['approved','pending','refunded','charged_back'].includes(order.status)&&integrated.checkout_url&&Date.parse(order.expires_at)>Date.now()&&<a className="text-link" href={integrated.checkout_url}>Volver a Mercado Pago</a>}
    </>}
    {chat&&<aside className="order-support" aria-labelledby="order-help">
     <h2 id="order-help">¿Necesitás ayuda con este pedido?</h2>
     <p className="inc-small">Escribinos desde acá. El mensaje ya incluye la referencia {reference}.</p>
     <div className="inc-actions">
      <a className="button" href={chat} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true"/>Consultar por WhatsApp</a>
      {email&&<a className="text-link" href={email}>Escribinos por correo</a>}
     </div>
    </aside>}
   </>}
  </section>
 </main>;
}
