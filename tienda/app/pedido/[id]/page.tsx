import Link from 'next/link';
import {currentPaymentConfig,orderDb,visitor} from '@/lib/order-server';
import {paymentLabel,type OrderItem} from '@/lib/checkout';
import {orderIdPattern,paymentIdPattern} from '@/lib/payment-config';
import {money} from '@/lib/catalog';
import {fulfillmentLabels} from '@/lib/admin';
import RefreshOrder from '@/components/RefreshOrder';

export const dynamic='force-dynamic';
export default async function OrderPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {id}=await params;
 const payment=(await searchParams).payment_id;
 const paymentId=typeof payment==='string'&&paymentIdPattern.test(payment)?payment:undefined;
 const hash=await visitor(),config=currentPaymentConfig();
 let order=null;
 if(config&&hash&&orderIdPattern.test(id)){
  const result=await orderDb().from('tienda_pedidos').select('id,items,total_cents,status,created_at,checkout_url,expires_at,fulfillment_status,shipping_carrier,tracking_code').eq('mode',config.mode).eq('id',id).eq('visitor_hash',hash).maybeSingle();
  order=result.data;
 }
 const test=config?.mode==='test';
 return <main className="inc-shell">
  <Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link>
  <section className="inc-panel" style={{marginTop:30}}>
   {!order||!config?<><h1 style={{fontSize:36}}>Pedido no disponible.</h1><p>Abrí este pedido desde el navegador donde lo creaste.</p></>:<>
    <p className="eyebrow">{test?'PEDIDO DE PRUEBA · SIN ENTREGA REAL':'TU PEDIDO · GRANJA ATUEL'}</p>
    <h1 style={{fontSize:40,margin:'18px 0'}}>{paymentLabel(order.status,config.mode)}</h1>
    <p className="inc-small">Referencia: {order.id}</p>
    {(order.items as OrderItem[]).map(i=><div className="checkout-item" key={i.id}><span>{i.title} × {i.quantity}</span><strong>{money(i.unit_price*i.quantity)}</strong></div>)}
    <div className="checkout-item"><strong>Total con envío incluido</strong><strong>{money(Number(order.total_cents)/100)}</strong></div>
    {test&&<p className="admin-status">Esta operación es una simulación. No genera venta, reserva, retiro ni envío real.</p>}
    {order.status==='approved'&&<p>{test?'Preparación de prueba':'Preparación'}: <strong>{fulfillmentLabels[order.fulfillment_status]}</strong></p>}
    {order.shipping_carrier&&<p>Transportista: {order.shipping_carrier}</p>}
    {order.tracking_code&&<p>Código de seguimiento: {order.tracking_code}</p>}
    <RefreshOrder id={order.id} paymentId={paymentId} status={order.status}/>
    {!['approved','pending','refunded','charged_back'].includes(order.status)&&order.checkout_url&&Date.parse(order.expires_at)>Date.now()&&<a className="text-link" href={order.checkout_url}>Volver a Mercado Pago</a>}
   </>}
   <Link className="text-link" style={{margin:20}} href="/incubacion">Ir a mis incubaciones</Link>
   <Link className="text-link" href="/">Volver a la tienda</Link>
  </section>
 </main>;
}
