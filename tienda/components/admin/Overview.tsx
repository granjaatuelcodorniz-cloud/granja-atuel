import {ArrowRight,ArrowUpRight,Boxes,CheckCircle2,Image as ImageIcon,Package,Pause,Plus,ShoppingBag} from 'lucide-react';
import type {AdminOrder,ManagedProduct} from '@/lib/admin';
import {fulfillmentLabels} from '@/lib/admin';
import {money} from '@/lib/catalog';

type Props={
 products:ManagedProduct[];pending:AdminOrder[];low:ManagedProduct[];onNew:()=>void;
 openOrder:(o:AdminOrder)=>void;openProduct:(p:ManagedProduct)=>void;
 go:(tab:'products'|'orders'|'inventory'|'content'|'settings')=>void;
};
export default function Overview({products,pending,low,onNew,openOrder,openProduct,go}:Props){
 const drafts=products.filter(p=>p.publication_state==='draft');
 const missingPhotos=products.filter(p=>p.active&&p.image==='/producto-sin-imagen.svg');
 const metrics=[
  {icon:Package,value:products.filter(p=>p.active).length,label:'Publicadas',detail:drafts.length+' borradores',tab:'products'},
  {icon:Pause,value:products.filter(p=>p.publication_state==='paused').length,label:'Pausadas',detail:'Fuera de la tienda',tab:'products'},
  {icon:ShoppingBag,value:pending.length,label:'Pedidos por resolver',detail:'Pagos aprobados de prueba',tab:'orders'},
  {icon:Boxes,value:low.length,label:'Alertas de stock',detail:'Presentaciones publicadas',tab:'inventory'},
 ] as const;
 return <>
  <div className="dash-section-heading act-heading">
   <div><p className="eyebrow">GRANJA ATUEL · TU TIENDA</p><h1>Central de acción</h1><p>Revisá qué requiere atención y administrá la tienda desde acá.</p></div>
   <button type="button" className="dash-primary" onClick={onNew}><Plus size={18}/> Nueva publicación</button>
  </div>
  <div className="dash-kpis">{metrics.map(m=><button type="button" className="dash-kpi act-kpi" key={m.label} onClick={()=>go(m.tab)}><div><span>{m.label}</span><m.icon size={19}/></div><strong>{m.value}</strong><p>{m.detail}</p></button>)}</div>
  <div className="act-overview-grid">
   <section className="dash-panel act-work">
    <div className="dash-panel-heading"><div><p className="eyebrow">OPERACIÓN</p><h2>Para resolver</h2></div><button className="dash-link" onClick={()=>go('orders')}>Ir a pedidos <ArrowRight size={16}/></button></div>
    {!pending.length&&!low.length?<div className="act-caught-up"><CheckCircle2 size={25}/><div><h3>Sin pendientes de preparación o stock.</h3><p>Acá vas a ver los pedidos aprobados y las presentaciones que necesiten reposición.</p></div></div>:null}
    {pending.slice(0,6).map(o=><button type="button" className="act-task" key={o.id} onClick={()=>openOrder(o)}><i><ShoppingBag size={20}/></i><span><b>{fulfillmentLabels[o.fulfillment_status]} · #{o.id.slice(0,8)}</b><small>{o.customer_name} · {money(o.total_cents/100)}</small></span><ArrowUpRight size={17}/></button>)}
    {low.slice(0,5).map(p=><button type="button" className="act-task" key={p.id} onClick={()=>go('inventory')}><i><Boxes size={20}/></i><span><b>{p.name} · {p.description}</b><small>{p.stock_quantity} en stock · mínimo {p.stock_minimum}</small></span><ArrowUpRight size={17}/></button>)}
   </section>
   <section className="dash-panel act-work">
    <div className="dash-panel-heading"><div><p className="eyebrow">LA WEB</p><h2>Prepará tu próxima publicación</h2></div><Package size={22}/></div>
    {missingPhotos.slice(0,3).map(p=><button type="button" className="act-task" key={p.id} onClick={()=>openProduct(p)}><i><ImageIcon size={20}/></i><span><b>Falta una foto: {p.name}</b><small>{p.description}</small></span><ArrowUpRight size={17}/></button>)}
    {drafts.slice(0,3).map(p=><button type="button" className="act-task" key={p.id} onClick={()=>openProduct(p)}><i><Package size={20}/></i><span><b>Borrador: {p.name}</b><small>{p.description||'Completá la ficha antes de publicar'}</small></span><ArrowUpRight size={17}/></button>)}
    {!drafts.length&&!missingPhotos.length&&<p className="act-helper">Podés crear un borrador, cambiar un precio o actualizar la portada en minutos.</p>}
    <div className="act-shortcuts"><button type="button" className="dash-secondary" onClick={()=>go('products')}>Editar catálogo</button><button type="button" className="dash-secondary" onClick={()=>go('content')}>Editar contenido</button><button type="button" className="dash-secondary" onClick={()=>go('settings')}>Cambiar portada</button></div>
   </section>
  </div>
 </>;
}
