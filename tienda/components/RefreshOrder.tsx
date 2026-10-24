'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function RefreshOrder({id,paymentId}:{id:string;paymentId?:string}){const router=useRouter();const first=useRef(true);const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function refresh(){setBusy(true);setMessage('');try{const r=await fetch('/api/pedidos/actualizar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,payment_id:paymentId})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage('Estado consultado con Mercado Pago.');router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'No pudimos consultar el pago.');}finally{setBusy(false);}}
 useEffect(()=>{if(first.current){first.current=false;void refresh();}},[id]);
 return <div><button className="button" disabled={busy} onClick={refresh}>{busy?'Consultando el pago…':'Actualizar estado del pago'}</button><p className="inc-small" role="status">{message}</p></div>;
}
