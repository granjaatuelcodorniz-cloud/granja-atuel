'use client';

import {useRef,useState,type FormEvent} from 'react';
import type {ManagedProduct,StockMovement} from '@/lib/admin';
import {api,Message,Modal} from './shared';

type Props={
 product:ManagedProduct;
 recount?:boolean;
 close:()=>void;
 saved:(product:ManagedProduct,movement:StockMovement)=>void;
};

export default function StockMovementDialog({product,recount=false,close,saved}:Props){
 const [kind,setKind]=useState(recount?'set':'in');
 const [quantity,setQuantity]=useState('');
 const [reason,setReason]=useState(recount?'Recuento de stock':'');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const attempt=useRef({signature:'',key:''});
 const count=Number(quantity);
 const delta=kind==='set'?count-product.stock_quantity:kind==='out'?-count:count;
 const next=product.stock_quantity+delta;
 const valid=quantity!==''&&Number.isInteger(count)&&count>=(kind==='set'?0:1)&&next>=0&&next<=1000000;

 async function submit(event:FormEvent){
  event.preventDefault();
  if(busy||!valid||delta===0)return;
  setBusy(true);setError('');
  const body={product_id:product.id,delta,reason,expected_quantity:product.stock_quantity};
  const signature=JSON.stringify(body);
  if(signature!==attempt.current.signature)attempt.current={signature,key:crypto.randomUUID()};
  try{
   const result=await api('inventory','POST',{...body,request_key:attempt.current.key});
   saved(result.product,result.movement);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar el movimiento.');}
  finally{setBusy(false);}
 }

 return <Modal title={recount?'Ajustar stock':'Registrar movimiento'} close={()=>{if(!busy)close();}}>
  <form className="dash-form" onSubmit={submit}>
   <div className="dash-stock-summary">
    <img src={product.image} alt=""/>
    <div><h3>{product.name}</h3><p>{product.description}</p><strong>{product.stock_quantity} presentaciones en stock</strong></div>
   </div>
   <label>Tipo de movimiento<select value={kind} onChange={e=>setKind(e.target.value)}>
    <option value="in">Ingreso de stock</option><option value="out">Salida de stock</option><option value="set">Ajuste por recuento</option>
   </select></label>
   <label>{kind==='set'?'Stock real contado':'Cantidad de presentaciones'}
    <input autoFocus type="number" min={kind==='set'?0:1} max={1000000} step={1} required value={quantity} onChange={e=>setQuantity(e.target.value)}/>
    <small>Contá cada presentación completa como una unidad.</small>
   </label>
   <label>Motivo<textarea minLength={3} maxLength={300} required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ej. Producción del día, venta presencial, recuento…"/></label>
   <div className="dash-note">Stock después del movimiento <strong>{valid?next:'—'}</strong></div>
   {quantity!==''&&!valid&&<Message error="Revisá la cantidad. El stock final debe quedar entre 0 y 1.000.000."/>}
   <Message error={error}/>
   <footer>
    <button type="button" className="dash-secondary" onClick={close} disabled={busy}>Cancelar</button>
    <button className="dash-primary" disabled={busy||!valid||delta===0||reason.trim().length<3}>{busy?'Registrando…':'Registrar movimiento'}</button>
   </footer>
  </form>
 </Modal>;
}
