import Link from 'next/link';
import {getPurchaseMode} from '@/lib/current-purchase';
import CheckoutForm from '@/components/CheckoutForm';
import {getCatalog} from '@/lib/products';
import {getShopSettings} from '@/lib/shop-settings';
import {currentPaymentConfig} from '@/lib/order-server';
import {checkoutAvailable} from '@/lib/payment-config';
import {getPaymentLinks,linkOrdersConfigured} from '@/lib/payment-links-server';
import {paymentLinkFor} from '@/lib/payment-links';
import {canBuy,productInquiry} from '@/lib/catalog';

export const dynamic='force-dynamic';
export const metadata={title:'Datos de envío · Granja Atuel'};
export default async function Checkout({searchParams}:{searchParams:Promise<{producto?:string|string[]}>}){
 const mode=getPurchaseMode(),testMode=mode==='test';
 const [catalog,settings,params,links]=await Promise.all([getCatalog(),getShopSettings(),searchParams,mode==='links'?getPaymentLinks():undefined]);
 const product=catalog.products.find(p=>p.id===params.producto);
 const fixed=mode!=='test'&&product&&(mode==='links'?!!paymentLinkFor(product,links?.get(product.id)):canBuy(product));
 const enabled=catalog.source==='database'&&(mode==='links'?linkOrdersConfigured():checkoutAvailable(currentPaymentConfig(),process.env));
 const help=product?productInquiry(product,settings.whatsapp):'https://wa.me/'+settings.whatsapp;
 return <>
  {testMode&&<div className="preview-bar"><span>PRUEBA DE COMPRA</span>Sin venta, reserva ni entrega real</div>}
  <main className="inc-shell">
   <header className="inc-header"><Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link><Link className="text-link" href="/#productos">← Volver a la tienda</Link></header>
   <div style={{marginTop:25}}>
    {mode==='links'&&!fixed?<section className="inc-panel">
     <h1>Elegí una presentación</h1>
     <p>{params.producto?'Esta opción de compra no está disponible en este momento.':'Volvé al catálogo y elegí el producto que querés recibir.'}</p>
     <div className="inc-actions"><Link className="button" href="/#productos">Ver productos</Link><a className="text-link" href={help}>Consultar por WhatsApp</a></div>
    </section>:<CheckoutForm products={catalog.products} fixedProductId={fixed?product.id:undefined} enabled={enabled} mode={mode} requiresDni={settings.require_recipient_dni} help={help}/>}
   </div>
  </main>
 </>;
}
