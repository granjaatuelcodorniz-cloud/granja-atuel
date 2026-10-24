import { getCatalog } from '@/lib/products';
import {getShopSettings} from '@/lib/shop-settings';
import Storefront from '@/components/Storefront';
export const dynamic='force-dynamic';
export default async function Home(){const [catalog,settings]=await Promise.all([getCatalog(),getShopSettings()]);return <Storefront {...catalog} settings={settings}/>;}
