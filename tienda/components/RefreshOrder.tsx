'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

export default function RefreshOrder({id,paymentId,status}:{id:string;paymentId?:string;status:string}){
 const router=useRouter(),first=useRef(true),inProgress=useRef(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function refresh(useReturnId=false){
  if(inProgress.current)return;
  inProgress.current=true;setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/pedidos/actualizar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,payment_id:useReturnId?paymentId:undefined})});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error);
   setMessage(d.matched?'Estado confirmado con Mercado Pago.':'Mercado Pago todavía no informó un pago para este pedido.');
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'No pudimos consultar el pago.');}
  finally{inProgress.current=false;setBusy(false);}
 }
 useEffect(()=>{if(first.current){first.current=false;if(!['approved','refunded','charged_back'].includes(status)||paymentId)void refresh(true);}},[id,paymentId,status]);
 return <div><button className="button" disabled={busy} onClick={()=>refresh()}>{busy?'Consultando el pago…':'Actualizar estado del pago'}</button><p className="inc-small" role="status">{message}</p></div>;
}
