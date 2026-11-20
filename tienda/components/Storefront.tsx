'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Check,ChefHat,ChevronDown,Egg,Leaf,MapPin,Menu,Minus,Package,Plus,ShoppingBag,Store,Truck,X} from 'lucide-react';
import {canBuy,money,normalizeCart,stockLimit,summarizeCart,type CartLine,type Product} from '@/lib/catalog';
import type {ShopSettings} from '@/lib/admin';
import type {SiteContent} from '@/lib/site-content';
import type {PurchaseMode} from '@/lib/site-release';
import {legacyPurchaseLink,productInquiry} from '@/lib/legacy-purchases';

const categories=[['todos','Todas'],['consumo','Para tu mesa'],['fertiles','Para incubar'],['insumos','Insumos']] as const;
type Category=typeof categories[number][0];
const directions=(p:{map_url:string;name:string;address:string;city:string})=>p.map_url||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.name,p.address,p.city].join(', '));
const storeUrl='https://www.mercadolibre.com.ar/tienda/granja-atuel';
const cartKey='ga-preview-cart-v1';

export default function Storefront({products,source,settings,content,purchaseMode,legacyIncubation,recipePaths,recipeAliases}:{products:Product[];source:string;settings:ShopSettings;content:SiteContent[];purchaseMode:PurchaseMode;legacyIncubation:boolean;recipePaths:Record<string,string>;recipeAliases:Record<string,string>}){
 const testMode=purchaseMode==='test',cartEnabled=purchaseMode!=='links';
 const [category,setCategory]=useState<Category>('todos');
 const [cart,setCart]=useState<CartLine[]>([]);
 const [ready,setReady]=useState(false);
 const [open,setOpen]=useState(false);
 const [menu,setMenu]=useState(false);
 const [notice,setNotice]=useState('');
 const [city,setCity]=useState('');
 const [showAllPoints,setShowAllPoints]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const {items,total,count}=summarizeCart(cart,products);
 const shown=products.filter(p=>p.active&&(category==='todos'||p.category===category));
 const faqs=content.filter(c=>c.kind==='faq');
 const recipes=content.filter(c=>c.kind==='recipe');
 const picks=recipes.filter(r=>r.data.featured).slice(0,3);
 const points=content.filter(c=>c.kind==='location');
 const cities=Array.from(new Set(points.map(p=>p.data.city))).sort((a,b)=>a.localeCompare(b,'es-AR'));
 const cityPoints=city?points.filter(p=>p.data.city===city):points;
 const visiblePoints=showAllPoints?cityPoints:cityPoints.slice(0,6);
 const wa='https://wa.me/'+settings.whatsapp;
 const logo=<img src="/logo-granja-atuel-web.webp" width={140} height={70} alt={settings.business_name}/>;

 useEffect(()=>{
  const followOldRecipe=()=>{
   let hash:string;try{hash=decodeURIComponent(location.hash.slice(1));}catch{return;}
   if(Object.hasOwn(recipeAliases,hash))location.replace('/recetas/'+recipeAliases[hash]);
  };
  followOldRecipe();
  window.addEventListener('hashchange',followOldRecipe);
  return ()=>window.removeEventListener('hashchange',followOldRecipe);
 },[recipeAliases]);
 useEffect(()=>{if(!cartEnabled)return;try{setCart(normalizeCart(JSON.parse(localStorage.getItem(cartKey)||'[]')));}catch{}setReady(true);},[cartEnabled]);
 useEffect(()=>{if(ready)try{localStorage.setItem(cartKey,JSON.stringify(cart));}catch{}},[cart,ready]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current.close();},[open]);

 function add(p:Product){
  if(!cartEnabled||!canBuy(p))return;
  setCart(old=>normalizeCart([...old.filter(l=>l.id!==p.id),{id:p.id,quantity:Math.min(stockLimit(p),(old.find(l=>l.id===p.id)?.quantity||0)+1)}]));
  setNotice(p.name+' · '+p.description+' agregado a tu carrito.');
  setOpen(true);
 }
 function change(p:Product,delta:number){
  setCart(lines=>lines.map(l=>l.id===p.id?{...l,quantity:Math.min(stockLimit(p),l.quantity+delta)}:l).filter(l=>l.quantity>0));
 }
 function closeMenu(){setMenu(false);}
 return <div className="sf">
  <a className="sf-skip" href="#contenido">Saltar al contenido</a>
  <div className="sf-utility"><Truck size={16}/><span><b>Envío incluido</b> en todas las opciones de compra</span>{testMode&&<small>VISTA DE PRUEBAS</small>}</div>
  <header className="sf-header"><div className="sf-wrap sf-header-inner">
   <Link href="/" className="sf-brand" aria-label={settings.business_name+', inicio'}>{logo}</Link>
   <nav id="menu-granja" className={'sf-nav'+(menu?' is-open':'')} aria-label="Navegación principal">
    <a href="#productos" onClick={closeMenu}>Productos</a><a href="#recetas" onClick={closeMenu}>Recetas</a><a href="#puntos" onClick={closeMenu}>Dónde comprar</a><a href="#mayoristas" onClick={closeMenu}>Mayoristas</a>
   </nav>
   <div className="sf-header-actions">
    {cartEnabled&&<button className="sf-cart-trigger" type="button" onClick={()=>setOpen(true)} aria-label={'Abrir carrito, '+count+' productos'}><ShoppingBag size={20}/><span>Carrito</span><b>{count}</b></button>}
    <button className="sf-menu-trigger" type="button" aria-label={menu?'Cerrar menú':'Abrir menú'} aria-controls="menu-granja" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={24}/>:<Menu size={24}/>}</button>
   </div>
  </div></header>
  {settings.notice&&<div className="sf-announcement"><div className="sf-wrap">{settings.notice}</div></div>}
  <main id="contenido">
   <section className="sf-hero" id="inicio">
    <div className="sf-wrap sf-hero-grid">
     <div className="sf-hero-content">
      <p className="sf-kicker"><MapPin size={15}/>{settings.location}</p>
      <h1>{settings.hero_title}{settings.hero_accent&&<><br/><em>{settings.hero_accent}</em></>}</h1>
      <p className="sf-lead">{settings.hero_description}</p>
      <div className="sf-actions"><a className="sf-button" href="#productos">Ver opciones de compra <ArrowRight size={19}/></a><a className="sf-link" href="#origen">Conocé la granja <ArrowUpRight size={17}/></a></div>
     </div>
     <div className={'sf-hero-visual'+(settings.hero_image==='/el-corazon-esta-en-cada-detalle.webp'?' sf-hero-editorial':'')}>
      <img className="sf-hero-photo" src={settings.hero_image} alt={settings.hero_alt} fetchPriority="high" width={800} height={800}/>
      <span className="sf-hero-caption"><Leaf size={17}/><span><small>GRANJA ATUEL</small><b>Producción propia</b></span></span>
     </div>
    </div>
   </section>
   <section className="sf-wrap sf-intents" aria-label="Qué estás buscando">
    <a href="#productos" onClick={()=>setCategory('consumo')}><i><ChefHat size={24}/></i><span><b>Para tu mesa</b><small>Huevos frescos para cocinar</small></span><ArrowUpRight size={19}/></a>
    <Link href="/huevos-fertiles" id="fertiles"><i><Egg size={24}/></i><span><b>Para incubar</b><small>Huevos fértiles y cuaderno de incubación</small></span><ArrowUpRight size={19}/></Link>
    <a href="#mayoristas"><i><Store size={24}/></i><span><b>Para tu negocio</b><small>Consultas y pedidos por volumen</small></span><ArrowUpRight size={19}/></a>
   </section>
   <section className="sf-wrap sf-section sf-catalog" id="tienda">
    <div id="productos" className="sf-heading">
     <div><p className="sf-kicker">COMPRÁ DIRECTO A LA GRANJA</p><h2>Huevos de codorniz e insumos</h2></div>
     <span className="sf-delivery"><Truck size={20}/> Precio final con envío incluido</span>
    </div>
    <div className="sf-tabs" role="group" aria-label="Filtrar productos">{categories.map(([id,label])=><button key={id} type="button" aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
    {source==='unavailable'?<div className="sf-empty">El catálogo no está disponible por el momento. <a href={wa}>Consultanos por WhatsApp</a>.</div>:shown.length===0?<div className="sf-empty">No hay publicaciones en esta categoría por el momento.</div>:
     <div className="sf-products">{shown.map(p=>{
      const payment=cartEnabled?null:legacyPurchaseLink(p);
      return <article className="sf-product" key={p.id}>
      <Link href={'/producto/'+p.id} className="sf-product-photo" aria-label={'Ver '+p.name+' · '+p.description}>
       <img src={p.image} alt={p.gallery?.[0]?.alt||p.name} width={600} height={400} loading="lazy"/>
       <span>{p.category==='consumo'?'CONSUMO':p.category==='fertiles'?'INCUBACIÓN':'INSUMOS'}</span>
      </Link>
      <div className="sf-product-main">
       <h3><Link href={'/producto/'+p.id}>{p.name}</Link></h3><p>{p.description}</p>
       <div className="sf-product-price"><strong>{money(p.price)}</strong><span><Truck size={14}/> Envío incluido</span></div>
       {payment?<a className="sf-buy" href={payment} target="_blank" rel="noreferrer">Comprar con Mercado Pago <ArrowUpRight size={17}/></a>:cartEnabled&&canBuy(p)?<button className="sf-buy" type="button" onClick={()=>add(p)} aria-label={'Agregar '+p.name+' · '+p.description}>Agregar al carrito <Plus size={18}/></button>:<a href={productInquiry(p,settings.whatsapp)} className="sf-buy is-unavailable">{canBuy(p)?'Consultar por WhatsApp':'Consultar disponibilidad'} <ArrowUpRight size={17}/></a>}
      </div>
     </article>;})}</div>}
   </section>

   <section className="sf-origin" id="origen"><div className="sf-wrap sf-origin-grid">
    <div className="sf-origin-photo"><img src={settings.about_image} alt={settings.about_alt} width={700} height={460} loading="lazy"/></div>
    <div className="sf-origin-content"><p className="sf-kicker">NUESTRO ORIGEN</p><h2>{settings.about_title}</h2><p>{settings.about_description}</p>
     <ul><li><Leaf size={18}/> Producción propia</li><li><Package size={18}/> Embalaje preparado en la granja</li><li><MapPin size={18}/> {settings.location}</li></ul>
     <Link className="sf-link" href="/buenas-practicas">Conocé nuestras buenas prácticas <ArrowUpRight size={17}/></Link>
    </div>
   </div></section>

   <section className="sf-wrap sf-section sf-food" id="nutricion">
    <div><p className="sf-kicker">DE LA GRANJA A TU MESA</p><h2>Huevos de codorniz para cocinar</h2>
     <p>Su tamaño los hace prácticos para picadas, ensaladas, canapés y platos al paso. Podés servirlos duros en una ensalada, incorporarlos a un revuelto o usarlos para terminar una tostada.</p>
     <a className="sf-link" href="#recetas">Ver ideas y preparaciones <ArrowRight size={17}/></a>
    </div>
   </section>
   <section className="sf-wrap sf-section" id="recetas">
    <div className="sf-heading"><div><p className="sf-kicker">IDEAS PARA TU MESA</p><h2>Recetas con huevos de codorniz</h2></div><Link href="/recetas" className="sf-link">Todas las recetas <ArrowRight size={18}/></Link></div>
    {picks.length>0?<div className="sf-recipes">{picks.map(r=><Link href={'/recetas/'+recipePaths[r.id]} className="sf-recipe" key={r.id}>
     <img alt="" src={r.data.image} width={400} height={260} loading="lazy"/><div><p className="sf-kicker">{[r.data.time,r.data.difficulty].filter(Boolean).join(' · ')}</p><h3>{r.data.title}</h3><ArrowUpRight size={20}/></div>
    </Link>)}</div>:<p className="sf-section-note">{recipes.length?'Encontrá ideas para cocinar en nuestra colección de recetas.':'Estamos preparando nuevas recetas.'}</p>}
   </section>

   <section className="sf-locations" id="puntos"><div className="sf-wrap sf-section">
    <div className="sf-heading"><div><p className="sf-kicker">PUNTOS DE VENTA</p><h2>Encontranos cerca.</h2></div>
     {points.length>0&&<div className="sf-location-choice"><label htmlFor="sf-location">Localidad</label><select id="sf-location" value={city} onChange={e=>{setCity(e.target.value);setShowAllPoints(false);}}><option value="">Todas las localidades</option>{cities.map(c=><option key={c}>{c}</option>)}</select></div>}
    </div>
    <p className="sf-section-note">Consultá la disponibilidad con cada comercio antes de acercarte.</p>
    {points.length>0?<><div className="sf-points">{visiblePoints.map(p=><a className="sf-point" key={p.id} href={directions(p.data)} target="_blank" rel="noreferrer">
     <MapPin size={19}/><div><strong>{p.data.name}</strong><span>{p.data.address}</span><small>{p.data.city}</small></div><ArrowUpRight size={17}/>
    </a>)}</div>{cityPoints.length>6&&<button className="sf-point-toggle sf-link" type="button" onClick={()=>setShowAllPoints(!showAllPoints)}>{showAllPoints?'Mostrar menos':'Ver los '+cityPoints.length+' comercios'} <ChevronDown size={18} className={showAllPoints?'is-flipped':''}/></button>}</>:<p>No hay puntos publicados en este momento.</p>}
   </div></section>
   <section className="sf-wrap sf-section" id="mayoristas"><div className="sf-wholesale">
    <div><p className="sf-kicker"><Store size={17}/> VENTA MAYORISTA</p><h2>{settings.wholesale_title}</h2><p>{settings.wholesale_description}</p></div>
    <a href={wa+'?text='+encodeURIComponent('Hola, quiero consultar por compra mayorista para mi negocio.')} target="_blank" rel="noreferrer" className="sf-button sf-button-gold">Consultar por mayor <ArrowUpRight size={19}/></a>
   </div></section>

   <section className="sf-wrap sf-faq sf-section" id="faq"><div>
    <p className="sf-kicker">ANTES DE COMPRAR</p><h2>Preguntas frecuentes.</h2>
    <p>Si necesitás ayuda con una presentación o un pedido, escribinos.</p>
    <a className="sf-link" href={wa} target="_blank" rel="noreferrer">Hablar por WhatsApp <ArrowUpRight size={17}/></a>
   </div><div className="sf-questions">{faqs.map(q=><details key={q.id}><summary>{q.data.question}<Plus size={18}/></summary><p>{purchaseMode==='links'&&q.id==='pregunta-2'?'Preparamos y embalamos tu pedido en San Rafael, Mendoza. Escribinos por WhatsApp para coordinar el despacho y consultar el seguimiento.':q.data.answer}</p></details>)}</div></section>
   <section className="sf-wrap sf-section" id="testimonios">
    <div className="sf-heading"><div><p className="sf-kicker">OPINIONES DE COMPRADORES</p><h2>Lo que dicen nuestros clientes</h2></div><a className="sf-link" href={storeUrl} target="_blank" rel="noreferrer">Ver tienda en Mercado Libre <ArrowUpRight size={16}/></a></div>
    <div className="sf-testimonials">
     <figure><blockquote>«Super recomendable. Alta tasa de fertilidad. ¡Los míos ya nacieron!»</blockquote><figcaption>Mercado Libre · Agosto de 2025</figcaption></figure>
     <figure><blockquote>«Muy buenos resultados, excelente calidad. Nacieron casi todos.»</blockquote><figcaption>Mercado Libre · Agosto de 2024</figcaption></figure>
     <figure><blockquote>«Nacieron la mayoría. El producto es bueno, tasa de éxito 70%. Excelente calidad.»</blockquote><figcaption>Mercado Libre · Enero de 2026</figcaption></figure>
    </div>
   </section>
  </main>

  <footer className="sf-footer"><div className="sf-wrap">
   <div className="sf-footer-main">
    <div>{logo}<p>{settings.location}</p></div>
    <div><h2>Explorá</h2><a href="#productos">Productos</a><Link href="/recetas">Recetas</Link><a href="#puntos">Puntos de venta</a></div>
    <div><h2>Te acompañamos</h2>{legacyIncubation?<a href="/incubacion">Control de incubaciones</a>:<Link href="/incubacion">Mis incubaciones</Link>}<Link href="/buenas-practicas">Buenas prácticas</Link><a href="#faq">Preguntas frecuentes</a></div>
    <div><h2>Contacto</h2><a href={wa} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={14}/></a>{settings.contact_email&&<a href={'mailto:'+settings.contact_email}>Correo electrónico</a>}{settings.instagram&&<a href={settings.instagram} target="_blank" rel="noreferrer">Instagram</a>}</div>
   </div>
   <div className="sf-footer-bottom"><span>© {new Date().getFullYear()} {settings.business_name}</span><Link href="/admin">Administración</Link></div>
  </div></footer>

  <div className="sr-only" role="status">{notice}</div>
  {cartEnabled&&<dialog ref={dialog} className="cart-dialog sf-cart" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} aria-labelledby="cart-title">
   <div className="cart-heading"><div><p className="sf-kicker">TU PEDIDO · ENVÍO INCLUIDO</p><h2 id="cart-title">Tu carrito <small>({count})</small></h2></div><button className="icon-button" type="button" aria-label="Cerrar carrito" onClick={()=>setOpen(false)}><X/></button></div>
   {!items.length?<div className="cart-empty"><ShoppingBag size={40}/><h3>Tu carrito está vacío.</h3><p>Elegí una presentación para empezar.</p><button className="sf-button" type="button" onClick={()=>setOpen(false)}>Seguir explorando <ArrowRight size={17}/></button></div>:<>
    <div className="cart-items">{items.map(({product:p,quantity})=><div className="cart-item" key={p.id}><img src={p.image} alt=""/><div><h3><Link href={'/producto/'+p.id}>{p.name}</Link></h3><p>{p.description}</p><div className="quantity"><button type="button" aria-label={'Quitar una unidad de '+p.description} onClick={()=>change(p,-1)}><Minus size={14}/></button><span>{quantity}</span><button type="button" disabled={quantity>=stockLimit(p)} aria-label={'Sumar una unidad de '+p.description} onClick={()=>change(p,1)}><Plus size={14}/></button></div></div><strong>{money(p.price*quantity)}</strong></div>)}</div>
    <div className="cart-summary"><div><span>Total con envío incluido</span><strong>{money(total)}</strong></div>{testMode&&<p>Esta compra es una prueba y no genera un despacho.</p>}<Link className="sf-button" href="/checkout">{testMode?'Continuar a la compra de prueba':'Finalizar compra'} <Check size={18}/></Link><button type="button" className="continue-link" onClick={()=>setOpen(false)}>Seguir mirando</button></div>
   </>}
  </dialog>}
 </div>;
}
