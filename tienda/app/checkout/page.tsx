import Link from 'next/link';
import CheckoutForm from '@/components/CheckoutForm';
import {getCatalog} from '@/lib/products';
import {checkoutReady} from '@/lib/order-server';
export const dynamic='force-dynamic';
export const metadata={title:'Pedido de prueba · Granja Atuel'};
export default async function Checkout(){const catalog=await getCatalog();return <><div className="preview-bar"><span>PRUEBA DE COMPRA</span>Sin venta, reserva ni entrega real</div><main className="inc-shell"><Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link><div style={{marginTop:35}}><CheckoutForm products={catalog.products} enabled={checkoutReady()&&catalog.source==='database'}/></div></main></>;}
