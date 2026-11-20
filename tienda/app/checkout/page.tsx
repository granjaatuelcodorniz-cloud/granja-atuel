import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getPurchaseMode} from '@/lib/current-purchase';
import CheckoutForm from '@/components/CheckoutForm';
import {getCatalog} from '@/lib/products';
import {currentPaymentConfig} from '@/lib/order-server';
import {checkoutAvailable} from '@/lib/payment-config';

export const dynamic='force-dynamic';
export const metadata={title:'Finalizar pedido · Granja Atuel'};
export default async function Checkout(){
 const mode=getPurchaseMode();
 if(mode==='links')redirect('/#productos');
 const catalog=await getCatalog(),testMode=mode==='test';
 return <>
  {testMode&&<div className="preview-bar"><span>PRUEBA DE COMPRA</span>Sin venta, reserva ni entrega real</div>}
  <main className="inc-shell">
   <Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link>
   <div style={{marginTop:35}}><CheckoutForm products={catalog.products} enabled={checkoutAvailable(currentPaymentConfig(),process.env)&&catalog.source==='database'} testMode={testMode}/></div>
  </main>
 </>;
}
