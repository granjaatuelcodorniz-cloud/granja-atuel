'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ShoppingBag,Check,ArrowRight,ArrowUpRight} from 'lucide-react';
import {canBuy,stockLimit,money,normalizeCart,productInquiry,type Product} from '@/lib/catalog';
import type {PurchaseMode} from '@/lib/site-release';

export default function ProductDetail({product:p,purchaseMode,linkPurchase,whatsapp}:{product:Product;purchaseMode:PurchaseMode;linkPurchase:boolean;whatsapp:string}){
 const gallery=p.gallery?.length?p.gallery:[{url:p.image,alt:p.name}];
 const [image,setImage]=useState(0),[qty,setQty]=useState(1),[message,setMessage]=useState(''),[added,setAdded]=useState(false);
 const test=purchaseMode==='test';
 function add(){
  try{
   const cart=normalizeCart(JSON.parse(localStorage.getItem('ga-preview-cart-v1')||'[]'));
   const current=cart.find(i=>i.id===p.id)?.quantity||0;
   if(current+qty>stockLimit(p)){setMessage('La cantidad supera el stock disponible o el máximo de 20 por pedido.');return;}
   const next=normalizeCart([...cart,{id:p.id,quantity:qty}]);
   localStorage.setItem('ga-preview-cart-v1',JSON.stringify(next));
   setAdded(true);setMessage('Producto agregado al carrito.');
  }catch{setMessage('No pudimos guardar el carrito en este navegador.');}
 }
 return <>{test&&<div className="preview-bar" style={{marginBlock:25}}>VISTA PREVIA · Las compras son simuladas.</div>}
  <section className="detail-grid"><div>
   <img className="detail-photo" src={gallery[image].url} alt={gallery[image].alt||p.name}/>
   {gallery.length>1&&<div className="detail-thumbs">{gallery.map((i,n)=><button type="button" key={i.url} onClick={()=>setImage(n)} aria-label={'Ver imagen '+(n+1)} aria-pressed={image===n}><img src={i.url} alt={i.alt||p.name}/></button>)}</div>}
  </div><div className="detail-copy">
   <p className="eyebrow">DE NUESTRA GRANJA A VOS</p><h1>{p.name}</h1><p className="detail-presentation">{p.description}</p>
   <strong className="detail-price">{money(p.price)}</strong><p className="detail-availability"><b>Envío incluido en el precio</b></p>
   <p className="detail-availability">{canBuy(p)?'Disponible':'Sin disponibilidad por el momento'}</p>
   {linkPurchase?<Link className="button" href={'/checkout?producto='+p.id}>Comprar <ArrowRight size={18}/></Link>:
    purchaseMode==='links'||!canBuy(p)?<a className="button" href={productInquiry(p,whatsapp)}>Consultar por WhatsApp <ArrowUpRight size={18}/></a>:<>
    <label className="detail-quantity">Cantidad de presentaciones<input type="number" min={1} max={stockLimit(p)||1} value={qty} onChange={e=>setQty(Math.max(1,Math.min(stockLimit(p)||1,Number(e.target.value))))}/></label>
    <button className="button" type="button" onClick={add}>{added?<Check size={18}/>:<ShoppingBag size={18}/>}Agregar al carrito</button>
    <p role="status" className="inc-small" style={{marginTop:15}}>{message}</p>
    {added&&<Link href="/checkout" className="text-link">{test?'Continuar a la compra de prueba':'Finalizar compra'} <ArrowRight size={16}/></Link>}
   </>}
   <div className="detail-description"><h2>Sobre este producto</h2><p>{p.details||p.description}</p></div>
   {p.sku&&<small className="inc-small">Código: {p.sku}</small>}
  </div></section>
 </>;
}
