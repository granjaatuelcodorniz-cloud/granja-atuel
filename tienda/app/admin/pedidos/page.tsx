import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin,supabaseServer} from '@/lib/supabase';
import {statusLabels} from '@/lib/checkout';
import {money} from '@/lib/catalog';
export const dynamic='force-dynamic';
export default async function Orders(){if(!await getAdmin())redirect('/admin/login');const db=await supabaseServer();const {data,error}=await db.from('tienda_pedidos').select('id,customer_name,customer_email,total_cents,status,created_at').order('created_at',{ascending:false}).limit(100);return <main className="admin-shell"><Link className="text-link" href="/admin">← Administración</Link><h1 style={{fontSize:42,margin:'30px 0'}}>Pedidos de prueba</h1><p className="admin-status">Últimos 100 pedidos simulados. No generan ventas ni movimientos de stock.</p>{error?<p className="form-error">No pudimos consultar los pedidos.</p>:data?.length?<div className="admin-grid">{data.map(o=><article className="inc-panel" key={o.id}><p className="eyebrow">{statusLabels[o.status]}</p><h3>{o.customer_name}</h3><p>{o.customer_email}</p><p>{money(Number(o.total_cents)/100)}</p><p className="inc-small">{o.id}</p></article>)}</div>:<p>Todavía no hay pedidos de prueba.</p>}</main>;}
