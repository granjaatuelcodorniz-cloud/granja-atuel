'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {Truck} from 'lucide-react';
import {money,normalizeCart,summarizeCart,stockLimit,type Product,type CartLine} from '@/lib/catalog';
import {provinces} from '@/lib/checkout';

export default function CheckoutForm({products,enabled}:{products:Product[];enabled:boolean}){
 const [cart,setCart]=useState<CartLine[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const attempt=useRef({body:'',key:''});
 useEffect(()=>{try{setCart(normalizeCart(JSON.parse(localStorage.getItem('ga-preview-cart-v1')||'[]')));}catch{}setLoaded(true);},[]);
 const {items,total}=summarizeCart(cart,products);
 const changed=items.length!==cart.length||items.some(i=>i.quantity>stockLimit(i.product));
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!enabled||changed||busy)return;
  setError('');setBusy(true);
  const f=new FormData(e.currentTarget);
  const body={name:f.get('name'),email:f.get('email'),cart,expected_total_cents:total*100,delivery_address:Object.fromEntries(['province','city','postal_code','address','phone','reference'].map(k=>[k,f.get(k)]))};
  const signature=JSON.stringify(body);
  if(signature!==attempt.current.body)attempt.current={body:signature,key:crypto.randomUUID()};
  try{
   const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,request_key:attempt.current.key})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   window.location.assign(d.redirect);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos conectar. Intentá de nuevo.');setBusy(false);}
 }
 if(!loaded)return <p role="status">Cargando tu carrito…</p>;
 if(!items.length)return <section className="inc-empty"><h2>{cart.length?'Las publicaciones de tu carrito ya no están disponibles.':'Tu carrito está vacío.'}</h2><Link className="button" href="/#tienda">Elegir productos</Link></section>;
 return <div className="checkout-grid">
  <form className="inc-panel inc-form" onSubmit={submit}>
   <p className="eyebrow">COMPRA DE PRUEBA</p><h2>Datos de entrega</h2>
   <p className="inc-small">Usá datos ficticios. Esta compra no genera una entrega ni reserva productos reales.</p>
   <label>Nombre y apellido<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>
   <label>Correo del pedido<input name="email" required type="email" maxLength={254} autoComplete="email"/></label>
   <label>Teléfono de entrega<input name="phone" type="tel" required minLength={6} maxLength={32} autoComplete="tel"/></label>
   <label>Provincia<select name="province" required defaultValue="" autoComplete="address-level1"><option value="" disabled>Seleccioná una provincia</option>{provinces.map(p=><option key={p}>{p}</option>)}</select></label>
   <label>Localidad<input name="city" required minLength={2} maxLength={100} autoComplete="address-level2"/></label>
   <label>Código postal<input name="postal_code" required maxLength={10} placeholder="5600 o M5600AAA" autoComplete="postal-code"/></label>
   <label>Calle y número<input name="address" required minLength={3} maxLength={180} autoComplete="address-line1"/></label>
   <label>Piso, departamento o indicaciones (opcional)<input name="reference" maxLength={240} autoComplete="address-line2"/></label>
   {!enabled&&<p className="form-error">El pago de prueba todavía no está habilitado.</p>}
   {changed&&<p className="form-error">Cambió la disponibilidad de un producto. Volvé al carrito para revisarlo.</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <button className="button" disabled={!enabled||changed||busy}>{busy?'Preparando tu pedido…':'Continuar a Mercado Pago de prueba'}</button>
   <Link className="text-link" href="/#tienda">Volver a la tienda</Link>
  </form>
  <section className="inc-panel">
   <h2>Tu pedido</h2>
   {items.map(({product:p,quantity})=><div className="checkout-item" key={p.id}><div><strong>{p.name}</strong><p>{p.description} × {quantity}</p></div><span>{money(p.price*quantity)}</span></div>)}
   <div className="checkout-item"><strong>Total con envío incluido</strong><strong>{money(total)}</strong></div>
   <p className="inc-small"><Truck size={16} style={{verticalAlign:'middle',marginRight:6}}/>Granja Atuel prepara y gestiona el envío.</p>
  </section>
 </div>;
}
