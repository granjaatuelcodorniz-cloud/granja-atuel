'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Archive,Copy,ExternalLink,Pause,Play,Plus,RotateCcw} from 'lucide-react';
import {categoryLabels,managedProduct,publicationLabels,type ManagedProduct} from '@/lib/admin';
import {money,type PublicationState} from '@/lib/catalog';
import {purchaseStatus,type PaymentLink} from '@/lib/payment-links';
import type {PurchaseMode} from '@/lib/site-release';
import {api,Empty,Message,Modal} from './shared';

const states:Record<PublicationState,string>={draft:'neutral',published:'green',paused:'gold',archived:'neutral'};
const actionNames:Partial<Record<PublicationState,string>>={draft:'Recuperar',published:'Publicar',paused:'Pausar',archived:'Archivar'};
type Props={products:ManagedProduct[];purchaseMode:PurchaseMode;paymentLinks:Record<string,PaymentLink>;onNew:()=>void;onEdit:(p:ManagedProduct)=>void;onDuplicate:(p:ManagedProduct)=>void;onUpdate:(p:ManagedProduct)=>void};
export default function Publications({products,purchaseMode,paymentLinks,onNew,onEdit,onDuplicate,onUpdate}:Props){
 const [search,setSearch]=useState(''),[category,setCategory]=useState('all'),[visibility,setVisibility]=useState('current'),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[confirm,setConfirm]=useState<ManagedProduct|null>(null);
 const shown=products.filter(p=>
  (visibility==='all'||(visibility==='current'?p.publication_state!=='archived':p.publication_state===visibility))&&
  (category==='all'||p.category===category)&&[p.name,p.description,p.sku,p.id].join(' ').toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR'))
 );
 async function changeState(p:ManagedProduct,state:PublicationState){
  if(busy)return;
  setBusy(p.id);setError('');setMessage('');
  try{
   const result=await api('products','PATCH',{id:p.id,publication_state:state,expected_updated_at:p.updated_at});
   onUpdate(managedProduct(result.product));
   setMessage({draft:'Recuperada como borrador.',published:'Publicada y visible en la tienda.',paused:'Pausada y oculta de la tienda.',archived:'Archivada. Podés recuperarla desde el filtro Archivadas.'}[state]);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos cambiar el estado.');}
  finally{setBusy('');setConfirm(null);}
 }
 return <>
  <div className="dash-section-heading act-heading"><div><p className="eyebrow">CATÁLOGO Y PRECIOS</p><h1>Publicaciones</h1><p>Administrá las presentaciones y su precio final con envío incluido.</p></div><button className="dash-primary" type="button" onClick={onNew}><Plus size={18}/> Nueva publicación</button></div>
  <Message error={error} success={message}/>
  <div className="dash-panel">
   <div className="dash-toolbar act-toolbar">
    <input aria-label="Buscar publicaciones" placeholder="Buscar por nombre, presentación o SKU…" value={search} onChange={e=>setSearch(e.target.value)}/>
    <select aria-label="Filtrar categoría" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Todas las categorías</option>{Object.entries(categoryLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
    <select aria-label="Filtrar estado" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="current">Publicaciones vigentes</option><option value="published">Publicadas</option><option value="paused">Pausadas</option><option value="draft">Borradores</option><option value="archived">Archivadas</option><option value="all">Todos los estados</option></select>
   </div>
   {shown.length>0?<div className="dash-table-wrap"><table className="dash-table act-publications"><thead><tr><th>Publicación</th><th>Precio final</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{shown.map(p=>{
    const next:PublicationState=p.publication_state==='archived'?'draft':p.publication_state==='published'?'paused':'published';
    const label=p.publication_state==='paused'?'Reactivar':actionNames[next];
    const Icon=next==='paused'?Pause:next==='draft'?RotateCcw:Play;
    return <tr key={p.id}>
     <td><button className="dash-product-cell" type="button" onClick={()=>onEdit(p)}><img src={p.image} alt=""/><span><strong>{p.name}</strong><small>{p.description}</small><small>{categoryLabels[p.category]}{p.sku?' · '+p.sku:''}</small></span></button></td>
     <td><strong>{money(p.price)}</strong><small>Envío incluido</small></td>
     <td><span className={'dash-badge '+states[p.publication_state]}>{publicationLabels[p.publication_state]}</span>{p.active&&<small className="dash-purchase-status">{purchaseStatus(p,purchaseMode,paymentLinks[p.id])}</small>}{p.stock_tracking&&<small>{p.stock_quantity} en stock</small>}</td>
     <td><div className="dash-inline act-row-actions">
      <button className="dash-secondary small" type="button" onClick={()=>onEdit(p)}>Editar</button>
      <button className="dash-secondary small" type="button" disabled={!!busy} onClick={()=>changeState(p,next)}><Icon size={14}/>{busy===p.id?'Guardando…':label}</button>
      <button className="dash-icon" type="button" title="Duplicar como borrador" aria-label={'Duplicar '+p.name+' · '+p.description} onClick={()=>onDuplicate(p)}><Copy size={17}/></button>
      {p.active&&<Link className="dash-icon" href={'/producto/'+p.id} target="_blank" aria-label={'Ver ficha de '+p.name+' · '+p.description}><ExternalLink size={17}/></Link>}
      {p.publication_state!=='archived'&&<button className="dash-icon danger" type="button" title="Archivar" aria-label={'Archivar '+p.name+' · '+p.description} disabled={!!busy} onClick={()=>setConfirm(p)}><Archive size={17}/></button>}
     </div></td>
    </tr>;
   })}</tbody></table></div>:<Empty title="No hay publicaciones para mostrar." description="Cambiá los filtros o creá un borrador para empezar."/>}
  </div>
  <p className="dash-footnote">{shown.length} de {products.length} publicaciones · Pausar las oculta temporalmente. Archivar conserva la ficha y el historial.</p>
  {confirm&&<Modal title="Archivar publicación" close={()=>{if(!busy)setConfirm(null);}}>
   <div className="act-confirm"><p><b>{confirm.name} · {confirm.description}</b> dejará de aparecer en la tienda. La podés recuperar como borrador.</p><div className="dash-inline"><button className="dash-secondary" type="button" onClick={()=>setConfirm(null)} disabled={!!busy}>Cancelar</button><button className="dash-primary" type="button" onClick={()=>changeState(confirm,'archived')} disabled={!!busy}>{busy?'Archivando…':'Archivar publicación'}</button></div></div>
  </Modal>}
 </>;
}
