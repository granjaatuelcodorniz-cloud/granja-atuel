import './dashboard.css';
import {redirect} from 'next/navigation';
import {getAdmin,supabaseServer} from '@/lib/supabase';
import Dashboard from '@/components/admin/Dashboard';
import {managedProduct,defaultSettings,type AdminOrder,type Media,type StockMovement} from '@/lib/admin';
import type {Product} from '@/lib/catalog';
export const dynamic='force-dynamic';
export default async function Admin({searchParams}:{searchParams:Promise<{section?:string}>}){
 const section=(await searchParams).section;
 const user=await getAdmin();if(!user)redirect('/admin/login');
 const db=await supabaseServer();
 const [products,media,movements,orders,settings]=await Promise.all([
 db.from('tienda_productos').select('*').order('sort_order').order('name'),
 db.from('tienda_imagenes').select('*').order('created_at',{ascending:false}),
 db.from('tienda_stock_movimientos').select('id,product_id,delta,previous_quantity,new_quantity,reason,created_at').order('created_at',{ascending:false}).limit(100),
 db.from('tienda_pedidos').select('id,customer_name,customer_email,total_cents,status,created_at,items,fulfillment_status,admin_notes,shipping_carrier,tracking_code').order('created_at',{ascending:false}).limit(200),
 db.from('tienda_configuracion').select('data').eq('id','main').single()
 ]);
 const error=[products,media,movements,orders,settings].some(r=>r.error)?'No pudimos cargar una sección. Actualizá los datos antes de hacer cambios.':undefined;
 return <Dashboard initialTab={section} products={((products.data||[]) as Product[]).map(managedProduct)} media={(media.data||[]) as Media[]} movements={(movements.data||[]) as StockMovement[]} orders={(orders.data||[]) as AdminOrder[]} settings={{...defaultSettings,...settings.data?.data}} email={user.email||''} error={error}/>;
}
