'use client';

import {useState} from 'react';
import {ChevronRight,ClipboardCopy,MapPin,RefreshCw} from 'lucide-react';
import {type AdminOrder,fulfillmentLabels} from '@/lib/admin';
import {money} from '@/lib/catalog';
import {paymentLabel,statusLabels} from '@/lib/checkout';
import {api,Modal,Message,Empty,date} from './shared';

export default function Orders({orders,updated,verified,initialOrderId,testMode}:{orders:AdminOrder[];updated:(o:AdminOrder)=>void;verified:(o:AdminOrder)=>void;initialOrderId?:string;testMode:boolean}){
 const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[prep,setPrep]=useState('all'),[selected,setSelected]=useState<AdminOrder|null>(orders.find(o=>o.id===initialOrderId)??null);
 const term=search.trim().replace(/^#(?=[a-f0-9])/i,'').toLowerCase();
 const shown=orders.filter(o=>(status==='all'||o.status===status)&&(prep==='all'||o.fulfillment_status===prep)&&[o.customer_name,o.customer_email,o.id,o.delivery_address?.city,o.link_reported_payment,o.link_verified_payment,o.tracking_code].join(' ').toLowerCase().includes(term));
 return <>
  <div className="dash-section-heading act-heading"><div><p className="eyebrow">PAGO, PREPARACIÓN Y DESPACHO</p><h1>Pedidos</h1><p>Revisá los últimos 200 pedidos y registrá el seguimiento cuando despaches.</p></div>{testMode&&<span className="dash-badge gold">ENTORNO DE PRUEBAS</span>}</div>
  <div className="dash-note">El envío está incluido en el total. Desde el detalle podés copiar los datos del destinatario y registrar el envío que gestionaste por tu cuenta.</div>
  <div className="dash-panel"><div className="dash-toolbar act-toolbar">
   <input aria-label="Buscar pedidos" placeholder="Nombre, correo, localidad o referencia…" value={search} onChange={e=>setSearch(e.target.value)}/>
   <select aria-label="Filtrar estado del pago" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos los pagos</option>{Object.keys(statusLabels).map(id=><option key={id} value={id}>{paymentLabel(id,testMode?'test':'production')}</option>)}</select>
   <select aria-label="Filtrar preparación" value={prep} onChange={e=>setPrep(e.target.value)}><option value="all">Toda la preparación</option>{Object.entries(fulfillmentLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
  </div>
  {shown.length?<div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Preparación</th><th></th></tr></thead><tbody>{shown.map(o=><tr key={o.id}>
   <td><strong>#{o.id.slice(0,8)}</strong><small>{date(o.created_at)}</small></td><td><strong>{o.customer_name}</strong><small>{[o.delivery_address?.city,o.delivery_address?.province].filter(Boolean).join(', ')||o.customer_email}</small></td><td>{money(o.total_cents/100)}</td><td><span className={'dash-badge '+(o.status==='approved'?'green':o.status==='rejected'?'red':'neutral')}>{o.link_reported_payment&&o.status==='awaiting_payment'?'Pago informado':paymentLabel(o.status,o.mode)}</span></td><td>{fulfillmentLabels[o.fulfillment_status]}</td><td><button className="dash-icon" type="button" aria-label={'Abrir pedido '+o.id.slice(0,8)} onClick={()=>setSelected(o)}><ChevronRight size={18}/></button></td>
  </tr>)}</tbody></table></div>:<Empty title="No hay pedidos para mostrar." description="Probá con otro filtro o volvé cuando entre un pedido."/>}</div>
  {selected&&<OrderEditor order={selected} verified={verified} close={()=>setSelected(null)} saved={o=>{updated(o);setSelected(null);}}/>}
 </>;
}
function OrderEditor({order,close,saved,verified}:{order:AdminOrder;close:()=>void;saved:(o:AdminOrder)=>void;verified:(o:AdminOrder)=>void}){
 const [o,setO]=useState(order),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const [checking,setChecking]=useState(false),[paymentMessage,setPaymentMessage]=useState(''),[paymentId,setPaymentId]=useState(order.link_reported_payment??''),[confirmed,setConfirmed]=useState(false);
 const linkPayment=o.payment_flow==='payment_link';
 const address=o.delivery_address;
 const [showDni,setShowDni]=useState(false),[dniCopied,setDniCopied]=useState(false);
 async function copyDni(){
  if(!address?.dni)return;
  try{await navigator.clipboard.writeText(address.dni);setDniCopied(true);}
  catch{setShowDni(true);setError('Seleccioná el DNI para copiarlo desde este navegador.');}
 }
 async function verifyPayment(){
  if(checking||busy||(linkPayment&&(!confirmed||!/^\d{1,30}$/.test(paymentId.trim()))))return;
  setChecking(true);setError('');setPaymentMessage('');
  try{
   const d=await api('orders/payment','POST',{id:o.id,...(paymentId.trim()?{payment_id:paymentId.trim()}:{}),...(linkPayment?{manual_confirmed:confirmed}:{})});
   setO(old=>({...old,status:d.order.status,link_reported_payment:d.order.link_reported_payment,link_verified_payment:d.order.link_verified_payment}));
   verified(d.order);
   setPaymentMessage(d.manual?'Pago confirmado en el pedido.':d.matched?'Estado confirmado con Mercado Pago.':'Mercado Pago todavía no informó un pago para este pedido.');
  }catch(e){setError(e instanceof Error?e.message:'No pudimos consultar Mercado Pago.');}
  finally{setChecking(false);}
 }
 async function copyAddress(){
  if(!address)return;
  const details=[o.customer_name,address.address,address.reference,[address.postal_code,address.city,address.province].join(' · '),address.phone,o.customer_email].filter(Boolean);
  try{await navigator.clipboard.writeText(details.join('\n'));setCopied(true);}
  catch{setError('No pudimos copiar desde este navegador. Podés seleccionar los datos y copiarlos.');}
 }
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||checking)return;
  setBusy(true);setError('');
  try{
   const {id,fulfillment_version,fulfillment_status,admin_notes,shipping_carrier,tracking_code}=o;
   const d=await api('orders','PUT',{id,fulfillment_version,fulfillment_status,admin_notes,shipping_carrier,tracking_code});saved(d.order);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar.');}
  finally{setBusy(false);}
 }
 return <Modal title={'Pedido #'+o.id.slice(0,8)} close={()=>{if(!busy&&!checking)close();}}>
  <form className="dash-form" onSubmit={save}>
   <div className="dash-order-client"><h3>{o.customer_name}</h3><p>{o.customer_email}</p><small>{date(o.created_at)}</small></div>
   <div className="act-delivery">
    <h3>Pago en Mercado Pago</h3>
    <div className="dash-inline" style={{flexWrap:'wrap',marginTop:8}}>
     <span className={'dash-badge '+(o.status==='approved'?'green':'neutral')}>{o.link_reported_payment&&o.status==='awaiting_payment'?'Pago informado':paymentLabel(o.status,o.mode)}</span>
     {!linkPayment&&<button className="dash-secondary small" type="button" onClick={verifyPayment} disabled={checking||busy}><RefreshCw size={15}/>{checking?'Consultando…':'Consultar estado del pago'}</button>}
    </div>
    {linkPayment?<div className="act-link-payment">
     {o.link_verified_payment?<p>Operación confirmada: {o.link_verified_payment}</p>:o.status==='awaiting_payment'&&o.fulfillment_status!=='cancelled'?<>
      <p>Comprobá en Mercado Pago de Granja Atuel que la operación esté aprobada y que el importe sea {money(o.total_cents/100)}.</p>
      <label>Número de operación<input value={paymentId} inputMode="numeric" maxLength={30} onChange={e=>{setPaymentId(e.target.value);setConfirmed(false);}} readOnly={!!o.link_reported_payment}/></label>
      <label className="dash-inline"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Verifiqué la operación y el importe en Mercado Pago.</label>
      <button className="dash-secondary small" type="button" onClick={verifyPayment} disabled={checking||busy||!confirmed||!/^\d{1,30}$/.test(paymentId.trim())}>{checking?'Confirmando…':'Confirmar pago'}</button>
     </>:null}
    </div>:<details style={{marginTop:8}}><summary>Buscar por número de pago</summary><label>Número de pago en Mercado Pago<input value={paymentId} inputMode="numeric" maxLength={30} onChange={e=>setPaymentId(e.target.value)}/></label></details>}
    {paymentMessage&&<p role="status">{paymentMessage}</p>}
   </div>
   <div className="act-delivery">
    <h3><MapPin size={17}/> Datos de entrega</h3>
    {address?<><p>{address.address}{address.reference?' · '+address.reference:''}<br/>{address.postal_code} · {address.city}, {address.province}<br/>{address.phone}</p><button className="dash-secondary small" type="button" onClick={copyAddress}><ClipboardCopy size={15}/>{copied?'Datos copiados':'Copiar datos para el despacho'}</button><span className="sr-only" role="status">{copied?'Datos de entrega copiados.':''}</span>
    {address.dni&&<div className="act-order-dni">
     <p>DNI de quien recibe: <strong>{showDni?address.dni:'•••• '+address.dni.slice(-3)}</strong></p>
     <div className="dash-inline">
      <button className="dash-secondary small" type="button" onClick={()=>setShowDni(v=>!v)}>{showDni?'Ocultar DNI':'Mostrar DNI'}</button>
      <button className="dash-secondary small" type="button" onClick={copyDni}>{dniCopied?'DNI copiado':'Copiar DNI'}</button>
     </div>
    </div>}</>:<p>Pedido de prueba anterior, sin domicilio registrado.</p>}
   </div>
   <div className="dash-order-items">{o.items.map(i=><div key={i.id}><span>{i.title} × {i.quantity}</span><strong>{money(i.unit_price*i.quantity)}</strong></div>)}<div><b>Total con envío incluido</b><b>{money(o.total_cents/100)}</b></div></div>
   <label>Estado de preparación<select value={o.fulfillment_status} onChange={e=>setO({...o,fulfillment_status:e.target.value})}>{Object.entries(fulfillmentLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <div className="dash-field-row"><label>Transportista<input maxLength={80} value={o.shipping_carrier} onChange={e=>setO({...o,shipping_carrier:e.target.value})}/></label><label>Código de seguimiento<input maxLength={120} value={o.tracking_code} onChange={e=>setO({...o,tracking_code:e.target.value})}/></label></div>
   <label>Notas internas<textarea rows={4} maxLength={2000} value={o.admin_notes} onChange={e=>setO({...o,admin_notes:e.target.value})}/></label>
   <small>Para marcar el despacho, el pago debe estar aprobado y tenés que cargar transportista y seguimiento. El cliente podrá verlos en su pedido.</small>
   <Message error={error}/>
   <footer><button type="button" className="dash-secondary" onClick={close} disabled={busy||checking}>Cerrar</button><button className="dash-primary" disabled={busy||checking}>{busy?'Guardando…':'Guardar seguimiento'}</button></footer>
  </form>
 </Modal>;
}
