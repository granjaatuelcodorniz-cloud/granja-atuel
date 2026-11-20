import Link from 'next/link';
import CheckoutForm from '@/components/CheckoutForm';
import {getCatalog} from '@/lib/products';
import {currentPaymentConfig} from '@/lib/order-server';
import {checkoutAvailable,shopMode} from '@/lib/payment-config';

export const dynamic='force-dynamic';
export const metadata={title:'Finalizar pedido · Granja Atuel'};
export default async function Checkout(){
 const catalog=await getCatalog(),testMode=shopMode(process.env)==='test';
 return <>
  {testMode&&<div className="preview-bar"><span>PRUEBA DE COMPRA</span>Sin venta, reserva ni entrega real</div>}
  <main className="inc-shell">
   <Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link>
   <div style={{marginTop:35}}><CheckoutForm products={catalog.products} enabled={checkoutAvailable(currentPaymentConfig(),process.env)&&catalog.source==='database'} testMode={testMode}/></div>
  </main>
 </>;
}
