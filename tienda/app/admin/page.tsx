import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin,supabaseServer} from '@/lib/supabase';
import AdminCatalog from '@/components/AdminCatalog';
import type {Product} from '@/lib/catalog';
export const dynamic='force-dynamic';
export default async function Admin(){
 const user=await getAdmin();if(!user)redirect('/admin/login');
 const db=await supabaseServer();const {data,error}=await db.from('tienda_productos').select('*').order('sort_order');
 return <main className="admin-shell"><header className="admin-top"><Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link><div><Link className="text-link" href="/">Ver tienda ↗</Link><form action="/api/admin/logout" method="POST"><button className="add-button">Cerrar sesión</button></form></div></header><div className="admin-intro"><div><p className="eyebrow">ADMINISTRACIÓN · ENTORNO DE DESARROLLO</p><h1>Tu catálogo, al día.</h1><p>Los cambios se aplican a la nueva tienda en paralelo.</p></div></div><div className="admin-health"><span>Catálogo: conectado a Supabase</span><span>Mercado Pago: pendiente</span><span>Correo Argentino: pendiente</span><span>Andreani: pendiente</span></div><p className="admin-status">La compra está deshabilitada. La disponibilidad se controla manualmente; todavía no hay reservas ni descuento automático de stock.</p>{error?<p role="alert" className="form-error">No pudimos cargar los productos. Volvé a intentar.</p>:<AdminCatalog products={data as Product[]}/>}</main>;
}
