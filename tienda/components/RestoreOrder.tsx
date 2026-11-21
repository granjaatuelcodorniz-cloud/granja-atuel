'use client';

import {useRef,useState} from 'react';

export default function RestoreOrder({id}:{id:string}){
 const token=useRef('');
 const sending=useRef(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 async function restore(){
  if(sending.current)return;
  sending.current=true;setBusy(true);setError('');
  if(!token.current){
   token.current=window.location.hash.slice(1);
   window.history.replaceState(window.history.state,'',window.location.pathname);
  }
  try{
   const response=await fetch('/api/pedidos/recuperar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,token:token.current})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error);
   window.location.replace(result.redirect);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos abrir tu pedido.');}
  finally{sending.current=false;setBusy(false);}
 }

 return <div className="restore-order-action">
  <button className="button" onClick={()=>void restore()} disabled={busy}>{busy?'Abriendo…':'Abrir mi pedido'}</button>
  {error&&<p role="alert" className="form-error">{error}</p>}
 </div>;
}
