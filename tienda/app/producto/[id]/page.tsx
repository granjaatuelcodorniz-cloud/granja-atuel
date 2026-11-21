import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCatalog} from '@/lib/products';
import {getShopSettings} from '@/lib/shop-settings';
import {legacyPurchaseLink} from '@/lib/legacy-purchases';
import {getPurchaseMode} from '@/lib/current-purchase';
import {publicMetadata} from '@/lib/seo';
import ProductDetail from '@/components/ProductDetail';

export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};

export async function generateMetadata({params}:Props){
 const {id}=await params;
 const p=(await getCatalog()).products.find(p=>p.id===id);
 if(!p)return {title:'Producto | Granja Atuel'};
 return publicMetadata('/producto/'+p.id,p.name+' · '+p.description+' | Granja Atuel',
  p.details||p.description+'. Precio con envío incluido. Granja Atuel, San Rafael, Mendoza.',p.image);
}
export default async function ProductPage({params}:Props){
 const {id}=await params;
 const [catalog,settings]=await Promise.all([getCatalog(),getShopSettings()]);
 const p=catalog.products.find(p=>p.id===id);
 if(!p)notFound();
 const mode=getPurchaseMode();
 return <main className="inc-shell"><header className="inc-header">
  <Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link>
  <Link className="text-link" href="/#productos">← Volver a la tienda</Link>
 </header><ProductDetail product={p} purchaseMode={mode} linkPurchase={mode==='links'&&!!legacyPurchaseLink(p)} whatsapp={settings.whatsapp}/></main>;
}
