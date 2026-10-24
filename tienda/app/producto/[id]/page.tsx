import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCatalog} from '@/lib/products';
import ProductDetail from '@/components/ProductDetail';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const {products}=await getCatalog();const p=products.find(p=>p.id===id);return {title:p?p.name+' · '+p.description+' | Granja Atuel':'Producto | Granja Atuel',description:p?.description};}
export default async function ProductPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const {products}=await getCatalog();const p=products.find(p=>p.id===id);if(!p)notFound();return <main className="inc-shell"><header className="inc-header"><Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link><Link className="text-link" href="/#tienda">← Volver a la tienda</Link></header><ProductDetail product={p}/></main>;}
