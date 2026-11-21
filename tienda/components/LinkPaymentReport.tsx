'use client';

import {useRouter} from 'next/navigation';
import {useRef,useState} from 'react';

export default function LinkPaymentReport({id,reported}:{id:string;reported:string|null}){
 const router=useRouter();
 const [operation,setOperation]=useState(reported??''),[show,setShow]=useState(!reported),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const sending=useRef(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current)return;
  sending.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/pedidos/pago',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,payment_id:operation.trim()})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error);
   setShow(false);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'No pudimos informar el pago.');}
  finally{sending.current=false;setBusy(false);}
 }
 return <>
  {reported&&<p role="status">Operación {reported} informada. Revisaremos el pago para poder preparar tu envío.</p>}
  {reported&&!show&&<button type="button" className="text-link" onClick={()=>setShow(true)}>Corregir el número de operación</button>}
  {show&&<form className="inc-form" onSubmit={submit}>
   <p className="inc-small">Si ya pagaste, ingresá el número de operación que aparece en el comprobante de Mercado Pago.</p>
   <label>Número de operación<input name="payment_id" required autoComplete="off" inputMode="numeric" pattern="[0-9]{1,30}" maxLength={30} value={operation} onChange={e=>setOperation(e.target.value)}/></label>
   {error&&<p role="alert" className="form-error">{error}</p>}
   <div className="inc-actions"><button className="button" disabled={busy}>{busy?'Guardando…':'Informar el pago'}</button>
    {reported&&<button className="text-link" type="button" onClick={()=>{setOperation(reported);setError('');setShow(false);}}>Cancelar corrección</button>}
   </div>
  </form>}
 </>;
}
