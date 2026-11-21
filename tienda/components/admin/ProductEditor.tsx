'use client';
import {useState,type FormEvent} from 'react';
import {ArrowUp,ArrowDown,Trash2,Save,Check} from 'lucide-react';
import {type ManagedProduct,type Media,type StockMovement,categoryLabels,managedProduct,publicationLabels} from '@/lib/admin';
import {money} from '@/lib/catalog';
import {purchaseStatus,validPaymentLink,type PaymentLink} from '@/lib/payment-links';
import type {PurchaseMode} from '@/lib/site-release';
import {Modal,Message,Uploader,api} from './shared';
import StockMovementDialog from './StockMovementDialog';

type Props={
 initial:ManagedProduct;isNew:boolean;media:Media[];purchaseMode:PurchaseMode;paymentLink?:PaymentLink;
 close:()=>void;saved:(p:ManagedProduct)=>void;uploaded:(m:Media)=>void;
 stockSaved:(p:ManagedProduct,m:StockMovement)=>void;linkSaved:(link:PaymentLink)=>void;
};

export default function ProductEditor({initial,isNew,media,purchaseMode,paymentLink,close,saved,stockSaved,linkSaved,uploaded}:Props){
 const [p,setP]=useState(initial),[section,setSection]=useState('general'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [stored,setStored]=useState(initial);
 const [stockOpen,setStockOpen]=useState(false),[linkOpen,setLinkOpen]=useState(false),[message,setMessage]=useState('');
 const update=(key:keyof ManagedProduct,value:unknown)=>setP(old=>({...old,[key]:value}));
 const images=p.gallery.length?p.gallery:(p.image!=='/producto-sin-imagen.svg'?[{url:p.image,alt:p.name}]:[]);
 function setImages(next:ManagedProduct['gallery']){setP(old=>({...old,gallery:next,image:next[0]?.url||'/producto-sin-imagen.svg'}));}
 function choose(m:Media){if(images.some(i=>i.url===m.url)||images.length>=8)return;setImages([...images,{url:m.url,alt:m.alt||p.name}]);}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const d=await api('products',isNew?'POST':'PUT',{...p,expected_updated_at:stored.updated_at});saved(d.product);}catch(e){setError(e instanceof Error?e.message:'No pudimos guardar.');}finally{setBusy(false);}}
 function recordStock(product:ManagedProduct,movement:StockMovement){
  const updated=managedProduct(product);
  const sameSettings=Object.entries(stored).every(([key,value])=>key==='stock_quantity'||key==='updated_at'||
   JSON.stringify(value)===JSON.stringify(updated[key as keyof ManagedProduct]));
  if(sameSettings)setStored(updated);
  setP(draft=>({...draft,stock_quantity:updated.stock_quantity}));
  stockSaved(updated,movement);
  setStockOpen(false);
  setMessage('Stock registrado.');
  setError(sameSettings?'':'La publicación cambió en otra ventana. Volvé a abrirla antes de guardar cambios en la ficha.');
 }
 return <><Modal title={isNew?'Nueva publicación':'Editar publicación'} close={close} wide><form onSubmit={save} className="dash-editor" onInvalidCapture={e=>{e.preventDefault();const input=e.target as HTMLInputElement;setSection(input.name==='stock_minimum'?'inventory':'general');setError('Revisá los campos requeridos y sus valores antes de guardar.');}}><nav className="dash-editor-tabs" aria-label="Secciones del producto">{[['general','Información'],['purchase','Compra'],['inventory','Inventario'],['images','Imágenes']].map(([id,label])=><button type="button" key={id} className={section===id?'selected':''} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</nav>
 <div className="dash-editor-grid"><div className="dash-editor-fields">
 <section hidden={section!=='general'}><h3>Información de la publicación</h3><p className="dash-muted">Nombre, presentación y todos los detalles que necesita el cliente.</p><label>Nombre del producto<input autoFocus required minLength={3} maxLength={100} value={p.name} onChange={e=>update('name',e.target.value)}/></label><div className="dash-field-row"><label>SKU / código interno<input maxLength={60} value={p.sku} placeholder="Ej. CON-05" onChange={e=>update('sku',e.target.value)}/></label><label>Categoría<select value={p.category} onChange={e=>update('category',e.target.value)}>{Object.entries(categoryLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div><label>Presentación o descripción corta<textarea rows={2} maxLength={500} value={p.description} placeholder="Ej. 5 docenas · 60 huevos" onChange={e=>update('description',e.target.value)}/></label><label>Descripción completa<textarea rows={7} maxLength={6000} value={p.details} placeholder="Características, conservación, uso y qué incluye." onChange={e=>update('details',e.target.value)}/></label><div className="dash-field-row"><label>Precio final en pesos (con envío incluido)<input type="number" required min={1} max={100000000} step={1} value={p.price||''} onChange={e=>update('price',Number(e.target.value))}/></label><label>Orden en la tienda<input type="number" min={0} max={9999} step={1} value={p.sort_order} onChange={e=>update('sort_order',Number(e.target.value))}/></label></div>{isNew&&<label>Identificador del enlace<input required pattern="[a-z0-9-]{1,64}" maxLength={64} value={p.id} onChange={e=>update('id',e.target.value)}/><small>Solo letras minúsculas, números y guiones. Se conserva al crear el producto.</small></label>}</section>
 <section hidden={section!=='images'}><h3>Mostralo desde todos los ángulos.</h3><p className="dash-muted">Hasta 8 imágenes. La primera es la portada de la tienda.</p><Uploader onUpload={m=>{uploaded(m);choose(m);}} onError={setError}/><div className="dash-gallery-editor">{images.map((image,index)=><article key={image.url}><img src={image.url} alt={image.alt||p.name}/><div><b>{index===0?'Portada':'Imagen '+(index+1)}</b><label>Descripción de la imagen<input maxLength={200} value={image.alt} onChange={e=>setImages(images.map((i,n)=>n===index?{...i,alt:e.target.value}:i))}/></label><div className="dash-inline"><button className="dash-icon" type="button" disabled={index===0} aria-label={'Mover imagen '+(index+1)+' antes'} onClick={()=>{const next=[...images];[next[index-1],next[index]]=[next[index],next[index-1]];setImages(next);}}><ArrowUp size={16}/></button><button className="dash-icon" type="button" disabled={index===images.length-1} aria-label={'Mover imagen '+(index+1)+' después'} onClick={()=>{const next=[...images];[next[index+1],next[index]]=[next[index],next[index+1]];setImages(next);}}><ArrowDown size={16}/></button><button className="dash-icon danger" type="button" aria-label={'Quitar imagen '+(index+1)+' del producto'} onClick={()=>setImages(images.filter((_,n)=>n!==index))}><Trash2 size={16}/></button></div></div></article>)}</div><h4>Elegir de la biblioteca</h4><div className="dash-image-picker">{media.filter(m=>!m.archived).map(m=><button type="button" key={m.id} title={m.name} disabled={images.some(i=>i.url===m.url)||images.length>=8} onClick={()=>choose(m)}><img src={m.url} alt={m.alt||m.name}/>{images.some(i=>i.url===m.url)&&<Check size={18}/>}</button>)}</div></section>
 <section hidden={section!=='purchase'}>
  <h3>Compra en línea</h3>
  <label className="dash-check"><input type="checkbox" checked={p.available} onChange={e=>update('available',e.target.checked)}/>
   <span>Habilitar compra cuando esté publicada<small>Destildalo para recibir consultas por WhatsApp.</small></span>
  </label>
  <p className="dash-note">{purchaseStatus(p,purchaseMode,paymentLink)}</p>
  {purchaseMode==='links'&&<div className="dash-editor-action">
   <div><strong>Enlace de cobro de Mercado Pago</strong>
    <p className="dash-muted">{paymentLink?<>Importe registrado <b>{money(paymentLink.amount_ars)}</b>.</>:'Todavía no hay un enlace asociado a esta presentación.'}</p>
    <small>El importe del enlace debe coincidir con el precio final de la ficha.</small>
   </div>
   {isNew?<small>Creá el borrador para configurar el enlace.</small>:<button type="button" className="dash-secondary" disabled={busy} onClick={()=>setLinkOpen(true)}>{paymentLink?'Editar enlace':'Agregar enlace'}</button>}
  </div>}
 </section>
 <section hidden={section!=='inventory'}>
  <h3>Inventario de la presentación</h3>
  <label className="dash-check"><input type="checkbox" checked={p.stock_tracking} onChange={e=>update('stock_tracking',e.target.checked)}/>
   <span>Controlar la cantidad disponible<small>Con el control activo y stock en cero, la compra queda pausada.</small></span>
  </label>
  <div className="dash-editor-action">
   <div><strong>Stock actual</strong><p><b>{p.stock_quantity}</b> {p.stock_quantity===1?'presentación':'presentaciones'}</p>
    <small>Cada presentación completa cuenta como una unidad.</small>
   </div>
   {isNew?<small>Creá el borrador para registrar el stock.</small>:<button type="button" className="dash-secondary" disabled={busy} onClick={()=>setStockOpen(true)}>Ajustar stock</button>}
  </div>
  <label>Avisar cuando queden<input name="stock_minimum" type="number" min={0} max={1000000} step={1} value={p.stock_minimum} onChange={e=>update('stock_minimum',Number(e.target.value))}/><small>Umbral de stock bajo, en presentaciones.</small></label>
 </section>

 </div><aside className="dash-product-preview"><img src={p.image} alt={p.name||'Vista previa del producto'}/><p className="eyebrow">VISTA PREVIA</p><h3>{p.name||'Nombre del producto'}</h3><p>{p.description||'La presentación aparece aquí.'}</p><strong>{money(p.price)}</strong><span className="dash-badge neutral">{publicationLabels[p.publication_state]}</span><small>{purchaseStatus(p,purchaseMode,paymentLink)}</small></aside></div>
 <Message error={error} success={message}/>
 <footer><button type="button" className="dash-secondary" onClick={close}>Cancelar</button><button className="dash-primary" disabled={busy}><Save size={17}/>{busy?'Guardando…':isNew?'Crear borrador':'Guardar publicación'}</button></footer></form></Modal>
 {stockOpen&&<StockMovementDialog product={p} recount close={()=>setStockOpen(false)} saved={recordStock}/>}
 {linkOpen&&<PaymentLinkDialog product={p} link={paymentLink} close={()=>setLinkOpen(false)} saved={link=>{linkSaved(link);setLinkOpen(false);setMessage('Enlace de cobro guardado.');}}/>}
 </>;
}

function PaymentLinkDialog({product,link,close,saved}:{product:ManagedProduct;link?:PaymentLink;close:()=>void;saved:(link:PaymentLink)=>void}){
 const [url,setUrl]=useState(link?.url??'');
 const [amount,setAmount]=useState(link?.amount_ars.toString()??'');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 async function save(event:FormEvent){
  event.preventDefault();
  if(busy)return;
  if(!validPaymentLink(url.trim())){setError('Pegá un enlace de Mercado Pago que comience con https://mpago.la/.');return;}
  setBusy(true);setError('');
  try{
   const result=await api('products/payment-link','PUT',{product_id:product.id,url,amount_ars:Number(amount),expected_updated_at:link?.updated_at??null});
   saved(result.link);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar el enlace.');}
  finally{setBusy(false);}
 }
 return <Modal title="Enlace de cobro" close={()=>{if(!busy)close();}}>
  <form className="dash-form" onSubmit={save}>
   <div className="dash-stock-summary"><div><h3>{product.name} · {product.description}</h3><p>Precio final de la ficha <b>{money(product.price)}</b></p></div></div>
   <label>Enlace de Mercado Pago<input type="url" maxLength={100} required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://mpago.la/…"/></label>
   <label>Importe que cobra el enlace en pesos<input type="number" min={1} max={100000000} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/>
    <small>Copiá el importe tal como figura en el enlace de la cuenta de Granja Atuel.</small>
   </label>
   <Message error={error}/>
   <footer><button type="button" className="dash-secondary" disabled={busy} onClick={close}>Cancelar</button><button className="dash-primary" disabled={busy}>{busy?'Guardando…':'Guardar enlace'}</button></footer>
  </form>
 </Modal>;
}
