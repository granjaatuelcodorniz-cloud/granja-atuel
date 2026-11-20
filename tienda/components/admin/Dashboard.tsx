'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Boxes,ChevronRight,Egg,ExternalLink,Image,LayoutDashboard,LogOut,Menu,Package,PanelsTopLeft,RefreshCw,Settings as SettingsIcon,ShoppingBag} from 'lucide-react';
import {managedProduct,type ManagedProduct,type Media,type StockMovement,type AdminOrder,type ShopSettings} from '@/lib/admin';
import type {SiteContent} from '@/lib/site-content';
import ProductEditor from './ProductEditor';
import Inventory from './Inventory';
import MediaLibrary from './MediaLibrary';
import Orders from './Orders';
import Settings from './Settings';
import Overview from './Overview';
import Publications from './Publications';
import Content from './Content';
import {Message} from './shared';

const sections=[
 {id:'overview',label:'Central de acción',icon:LayoutDashboard},
 {id:'products',label:'Publicaciones',icon:Package},
 {id:'orders',label:'Pedidos',icon:ShoppingBag},
 {id:'inventory',label:'Inventario',icon:Boxes},
 {id:'content',label:'Contenido web',icon:PanelsTopLeft},
 {id:'media',label:'Imágenes',icon:Image},
 {id:'settings',label:'Portada y contacto',icon:SettingsIcon},
] as const;
type Tab=typeof sections[number]['id'];
const tabOf=(value?:string|null):Tab=>sections.find(t=>t.id===value)?.id||'overview';
type Props={products:ManagedProduct[];media:Media[];movements:StockMovement[];orders:AdminOrder[];settings:ShopSettings;settingsVersion:string;content:SiteContent[];email:string;testMode:boolean;error?:string;initialTab?:string};

export default function Dashboard(props:Props){
 const [tab,setTab]=useState(tabOf(props.initialTab)),[products,setProducts]=useState(props.products.map(managedProduct)),[media,setMedia]=useState(props.media),[movements,setMovements]=useState(props.movements),[orders,setOrders]=useState(props.orders),[settings,setSettings]=useState(props.settings),[settingsVersion,setSettingsVersion]=useState(props.settingsVersion),[content,setContent]=useState(props.content);
 const [editor,setEditor]=useState<{p:ManagedProduct;isNew:boolean}|null>(null),[toast,setToast]=useState(''),[mobile,setMobile]=useState(false),[orderFocus,setOrderFocus]=useState<string>();
 const low=products.filter(p=>p.active&&p.stock_tracking&&p.stock_quantity<=p.stock_minimum);
 const pending=orders.filter(o=>o.status==='approved'&&['new','preparing','ready'].includes(o.fulfillment_status));
 useEffect(()=>{
  function onHistory(){setTab(tabOf(new URLSearchParams(window.location.search).get('section')));setOrderFocus(undefined);setMobile(false);}
  window.addEventListener('popstate',onHistory);return ()=>window.removeEventListener('popstate',onHistory);
 },[]);

 function go(id:Tab,order?:string){
  setOrderFocus(order);setMobile(false);setToast('');
  if(tab!==id)window.history.pushState(null,'',id==='overview'?'/admin':'/admin?section='+id);
  setTab(id);
  window.scrollTo({top:0,behavior:'instant'});
 }
 function sortNext(){return Math.min(9999,Math.max(0,...products.map(p=>p.sort_order))+10);}
 function newProduct(){
  setEditor({isNew:true,p:managedProduct({id:'producto-'+crypto.randomUUID().slice(0,8),name:'',description:'',category:'consumo',price:0,image:'/producto-sin-imagen.svg',active:false,available:true,weight_grams:null,height_cm:null,width_cm:null,length_cm:null,sort_order:sortNext()})});
 }
 function duplicate(p:ManagedProduct){
  setEditor({isNew:true,p:{...p,id:p.id.slice(0,40)+'-'+crypto.randomUUID().slice(0,8),name:p.name.slice(0,92)+' (copia)',sku:'',active:false,publication_state:'draft',stock_quantity:0,updated_at:'',sort_order:sortNext()}});
 }
 function productUpdated(p:ManagedProduct){
  setProducts(old=>(old.some(x=>x.id===p.id)?old.map(x=>x.id===p.id?managedProduct(p):x):[...old,managedProduct(p)]).sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name,'es-AR')));
 }
 function productSaved(p:ManagedProduct){
  productUpdated(p);
  if(editor?.isNew){go('products');setToast('Borrador creado. Podés revisarlo y publicarlo desde Publicaciones.');}
  else setToast('Publicación guardada.');
  setEditor(null);
 }
 function uploaded(m:Media){setMedia(old=>[m,...old]);setToast('Imagen lista en tu biblioteca.');}

 return <div className="dashboard action-centre">
  <aside className={'dash-sidebar '+(mobile?'mobile-open':'')}>
   <Link href="/admin" className="dash-brand"><img src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/><span>GESTIÓN DE LA TIENDA</span></Link>
   <nav aria-label="Administración">
    {sections.map(s=><button key={s.id} className={tab===s.id?'active':''} aria-current={tab===s.id?'page':undefined} onClick={()=>go(s.id)}><s.icon size={18}/><span>{s.label}</span>{s.id==='inventory'&&low.length>0&&<b>{low.length}</b>}{s.id==='orders'&&pending.length>0&&<b>{pending.length}</b>}</button>)}
    <Link href="/admin/incubaciones"><Egg size={18}/><span>Incubaciones</span><ArrowUpRight size={14}/></Link>
    <Link href="/admin/estado"><SettingsIcon size={18}/><span>Estado de la tienda</span></Link>
   </nav>
   <div className="dash-sidebar-bottom">
    {props.testMode&&<div className="dash-environment"><span className="dash-dot"/><strong>Vista de pruebas</strong><p>Compras y despachos de prueba.</p></div>}
    <a href="/" target="_blank" rel="noreferrer"><ExternalLink size={16}/> Ver mi tienda <ArrowUpRight size={15}/></a>
    <form action="/api/admin/logout" method="POST"><button><LogOut size={16}/> Cerrar sesión</button></form>
   </div>
  </aside>
  {mobile&&<button className="dash-mobile-backdrop" type="button" aria-label="Cerrar navegación" onClick={()=>setMobile(false)}/>}
  <div className="dash-main">
   <header className="dash-topbar">
    <div><button className="dash-icon dash-mobile-toggle" type="button" aria-label="Abrir navegación" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}><Menu size={21}/></button><span>Granja Atuel <ChevronRight size={13}/> <strong>{sections.find(s=>s.id===tab)?.label}</strong></span></div>
    <div>{props.testMode&&<span className="dash-test-tag">PRUEBAS</span>}<span className="dash-avatar" title={props.email}>{props.email.charAt(0).toUpperCase()||'A'}</span></div>
   </header>
   <main className="dash-content">
    <Message error={props.error} success={toast}/>
    {tab==='overview'&&<Overview products={products} pending={pending} low={low} onNew={newProduct} openOrder={o=>go('orders',o.id)} openProduct={p=>setEditor({p,isNew:false})} go={go} testMode={props.testMode}/>}
    {tab==='products'&&<Publications products={products} onNew={newProduct} onEdit={p=>setEditor({p,isNew:false})} onDuplicate={duplicate} onUpdate={productUpdated}/>}
    {tab==='orders'&&<Orders orders={orders} initialOrderId={orderFocus} testMode={props.testMode} verified={o=>setOrders(old=>old.map(x=>x.id===o.id?o:x))} updated={o=>{setOrders(old=>old.map(x=>x.id===o.id?o:x));setToast('Seguimiento guardado.');}}/>}
    {tab==='inventory'&&<Inventory products={products} movements={movements} saved={(p,m)=>{productUpdated(p);setMovements(old=>[m,...old.filter(x=>x.id!==m.id)].slice(0,100));setToast('Movimiento registrado.');}}/>}
    {tab==='content'&&<Content entries={content} media={media} updated={entry=>setContent(old=>[...old.filter(c=>c.id!==entry.id),entry])} uploaded={uploaded}/>}
    {tab==='media'&&<MediaLibrary media={media} uploaded={uploaded} updated={m=>setMedia(old=>old.map(x=>x.id===m.id?m:x))}/>}
    {tab==='settings'&&<Settings initial={settings} version={settingsVersion} media={media} uploaded={uploaded} saved={(s,revision)=>{setSettings(s);setSettingsVersion(revision);}}/>}
    <div className="dash-bottomline"><span>Central de acción · Granja Atuel</span><button type="button" onClick={()=>window.location.reload()}><RefreshCw size={14}/> Actualizar datos</button></div>
   </main>
  </div>
  {editor&&<ProductEditor initial={editor.p} isNew={editor.isNew} media={media} close={()=>setEditor(null)} saved={productSaved} uploaded={uploaded}/>}
 </div>;
}
