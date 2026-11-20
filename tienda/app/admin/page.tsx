import './dashboard.css';

import {redirect} from 'next/navigation';
import {getAdmin,supabaseServer} from '@/lib/supabase';
import Dashboard from '@/components/admin/Dashboard';
import {adminOrderFields,managedProduct,resolveSettings,type AdminOrder,type Media,type StockMovement} from '@/lib/admin';
import type {Product} from '@/lib/catalog';
import type {SiteContent} from '@/lib/site-content';
import {contentFields} from '@/lib/site-content-server';
import {shopMode} from '@/lib/payment-config';

export const dynamic='force-dynamic';
export default async function Admin({searchParams}:{searchParams:Promise<{section?:string}>}){
 const section=(await searchParams).section;
 const user=await getAdmin();if(!user)redirect('/admin/login');
 const db=await supabaseServer();
 const mode=shopMode(process.env);
 const [products,media,movements,orders,settings,content]=await Promise.all([
  db.from('tienda_productos').select('*').order('sort_order').order('name'),
  db.from('tienda_imagenes').select('*').order('created_at',{ascending:false}),
  db.from('tienda_stock_movimientos').select('id,product_id,delta,previous_quantity,new_quantity,reason,created_at').order('created_at',{ascending:false}).limit(100),
  db.from('tienda_pedidos').select(adminOrderFields).eq('mode',mode).order('created_at',{ascending:false}).limit(200),
  db.from('tienda_configuracion').select('data,updated_at').eq('id','main').single(),
  db.from('tienda_contenidos').select(contentFields).order('position').order('id').limit(500),
 ]);
 const failed=([[products,'publicaciones'],[media,'imágenes'],[movements,'inventario'],[orders,'pedidos'],[settings,'portada y contacto'],[content,'contenido web']] as const).filter(([result])=>result.error).map(([,name])=>name);
 const error=failed.length?'No pudimos cargar '+failed.join(', ')+'. Actualizá los datos antes de hacer cambios.':undefined;
 return <Dashboard initialTab={section} products={((products.data||[]) as Product[]).map(managedProduct)} media={(media.data||[]) as Media[]} movements={(movements.data||[]) as StockMovement[]} orders={(orders.data||[]) as AdminOrder[]} settings={resolveSettings(settings.data?.data)} settingsVersion={settings.data?.updated_at??''} content={(content.data||[]) as SiteContent[]} email={user.email||''} error={error} testMode={mode==='test'}/>;
}
