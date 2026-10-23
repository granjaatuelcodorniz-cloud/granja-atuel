import { getCatalog } from '@/lib/products';
import Storefront from '@/components/Storefront';
export const dynamic='force-dynamic';
export default async function Home(){const catalog=await getCatalog();return <Storefront {...catalog}/>;}
