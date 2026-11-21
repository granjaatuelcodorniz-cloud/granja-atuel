'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {Truck} from 'lucide-react';
import {money,normalizeCart,summarizeCart,stockLimit,type Product,type CartLine} from '@/lib/catalog';
import {provinces} from '@/lib/checkout';

export default function CheckoutForm({products,fixedProductId,enabled,testMode,requiresDni,help}:{products:Product[];fixedProductId?:string;enabled:boolean;testMode:boolean;requiresDni:boolean;help:string}){
 const [savedCart,setSavedCart]=useState<CartLine[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const attempt=useRef({body:'',key:''}),sending=useRef(false);
 const cart=fixedProductId?[{id:fixedProductId,quantity:1}]:savedCart;
 useEffect(()=>{if(fixedProductId)return;try{setSavedCart(normalizeCart(JSON.parse(localStorage.getItem('ga-preview-cart-v1')||'[]')));}catch{}setLoaded(true);},[fixedProductId]);
 const {items,total}=summarizeCart(cart,products);
 const changed=items.length!==cart.length||items.some(i=>i.quantity>stockLimit(i.product));
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!enabled||changed||sending.current)return;
  const f=new FormData(e.currentTarget);
  setError('');setBusy(true);sending.current=true;
  const body={name:f.get('name'),email:f.get('email'),cart,expected_total_cents:total*100,delivery_address:Object.fromEntries(['province','city','postal_code','address','phone','reference',...(requiresDni?['dni']:[])].map(k=>[k,f.get(k)]))};
  const signature=JSON.stringify(body);
  if(signature!==attempt.current.body)attempt.current={body:signature,key:crypto.randomUUID()};
  try{
   const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,request_key:attempt.current.key})});
   const d=await r.json();
   if(!r.ok||typeof d.redirect!=='string')throw new Error(d.error||'No pudimos guardar tu pedido.');
   window.location.assign(d.redirect);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos conectar. Intentá de nuevo.');sending.current=false;setBusy(false);}
 }
 if(!fixedProductId&&!loaded)return <p role="status">Cargando tu carrito…</p>;
 if(!items.length)return <section className="inc-empty"><h1>{cart.length?'Las publicaciones de tu pedido ya no están disponibles.':'Tu carrito está vacío.'}</h1><Link className="button" href="/#productos">Elegir productos</Link></section>;
 return <div className="checkout-grid">
  <section className="inc-panel checkout-summary" aria-label="Resumen del pedido">
   <h2>Tu pedido</h2>
   {items.map(({product:p,quantity})=><div className="checkout-item" key={p.id}><div><strong>{p.name}</strong><p>{p.description} × {quantity}</p></div><span>{money(p.price*quantity)}</span></div>)}
   <div className="checkout-item"><strong>Total con envío incluido</strong><strong>{money(total)}</strong></div>
   <p className="inc-small"><Truck size={16} style={{verticalAlign:'middle',marginRight:6}}/>Granja Atuel prepara y gestiona el envío.</p>
  </section>
  <form className="inc-panel inc-form checkout-fields" onSubmit={submit}>
   <p className="eyebrow">{testMode?'COMPRA DE PRUEBA':'ENVÍO · ANTES DE PAGAR'}</p><h1>Datos de envío</h1>
   {testMode?<p className="inc-small">Usá datos ficticios. Esta compra no genera una entrega ni reserva productos reales.</p>:<p className="inc-small">Ingresá los datos de quien va a recibir el pedido. Los usaremos para gestionar la entrega.</p>}
   <fieldset disabled={!enabled||busy}>
    <label>Nombre y apellido<input name="name" required minLength={2} maxLength={100} autoComplete="shipping name"/></label>
    {requiresDni&&<label>DNI de quien recibe
     <input name="dni" required inputMode="numeric" autoComplete="off" maxLength={12} aria-describedby="dni-help"/>
     <small id="dni-help">Ingresá solo el número. Lo usamos para preparar el envío con el transportista.</small>
    </label>}
    <label>Correo electrónico<input name="email" required type="email" maxLength={254} autoComplete="shipping email"/></label>
    <label>Teléfono<input name="phone" type="tel" required minLength={6} maxLength={32} autoComplete="shipping tel"/></label>
    <div className="checkout-field-row">
     <label>Provincia<select name="province" required defaultValue="" autoComplete="shipping address-level1"><option value="" disabled>Seleccioná</option>{provinces.map(p=><option key={p}>{p}</option>)}</select></label>
     <label>Localidad<input name="city" required minLength={2} maxLength={100} autoComplete="shipping address-level2"/></label>
    </div>
    <div className="checkout-field-row">
     <label>Calle y número<input name="address" required minLength={3} maxLength={180} autoComplete="shipping address-line1"/></label>
     <label>Código postal<input name="postal_code" required maxLength={10} placeholder="5600 o M5600AAA" autoComplete="shipping postal-code"/></label>
    </div>
    <label>Piso, departamento o referencias (opcional)<input name="reference" maxLength={240} autoComplete="shipping address-line2"/></label>
   </fieldset>
   {!enabled&&<p className="form-error">La compra en línea no está disponible ahora. <a href={help}>Consultanos por WhatsApp.</a></p>}
   {changed&&<p className="form-error">Cambió la disponibilidad de un producto. Volvé al catálogo para revisar el pedido.</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <button className="button" disabled={!enabled||changed||busy}>{busy?'Guardando los datos…':testMode?'Continuar a Mercado Pago de prueba':'Guardar datos y continuar al pago'}</button>
  </form>
 </div>;
}
