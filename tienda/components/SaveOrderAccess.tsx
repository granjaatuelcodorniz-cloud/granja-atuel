'use client';

import {useState} from 'react';

export default function SaveOrderAccess({path}:{path:string}){
 const [copied,setCopied]=useState(false);
 const [manualLink,setManualLink]=useState('');
 async function copy(){
  const link=new URL(path,window.location.origin).href;
  try{await navigator.clipboard.writeText(link);setCopied(true);}
  catch{setManualLink(link);}
 }
 return <aside className="order-support">
  <h2>Guardá el acceso a tu pedido</h2>
  <p>Con este enlace privado podés abrir el pedido desde otro dispositivo durante 30 días. Guardalo en un lugar seguro.</p>
  <div className="inc-actions">
   <button className="text-link" type="button" onClick={()=>void copy()}>{copied?'Enlace copiado':'Copiar enlace privado'}</button>
   {copied&&<span className="sr-only" role="status">Enlace privado copiado.</span>}
  </div>
  {manualLink&&<input className="order-access-copy" aria-label="Enlace privado del pedido" value={manualLink} readOnly onFocus={e=>e.currentTarget.select()}/>}
 </aside>;
}
