import { getCatalog } from '@/lib/products';
import { getShopSettings } from '@/lib/shop-settings';
import { getPublicContent } from '@/lib/site-content-server';
import Storefront from '@/components/Storefront';
import './storefront.css';

export const dynamic='force-dynamic';
export const metadata={title:'Huevos de codorniz en San Rafael, Mendoza · Granja Atuel',description:'Huevos de codorniz para consumo e incubación. Producción propia en San Rafael, Mendoza, con envío incluido en las opciones de compra.'};
export default async function Home(){
 const [catalog,settings,content]=await Promise.all([getCatalog(),getShopSettings(),getPublicContent()]);
 return <Storefront {...catalog} settings={settings} content={content}/>;
}
