'use client';

import {useRef,useState} from 'react';

type Factor={id:string;name:string};
type Setup={factorId:string;qr:string;secret:string};

export default function AdminVerification({factors,unavailable}:{factors:Factor[];unavailable:boolean}){
 const [factor,setFactor]=useState(factors[0]?.id??'');
 const [setup,setSetup]=useState<Setup|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const working=useRef(false);

 async function send(action:'enroll'|'verify',code?:FormDataEntryValue|null){
  if(working.current)return;
  working.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/seguridad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,factorId:setup?.factorId??factor,code})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error);
   if(result.verified){window.location.replace('/admin');return;}
   setSetup(result);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos completar la verificación.');}
  finally{working.current=false;setBusy(false);}
 }

 return <main className="login-page"><section className="login-card admin-verification">
  <img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/>
  <h1>Verificación en dos pasos</h1>
  {unavailable?<p role="alert">No pudimos consultar tu configuración. Actualizá la página e intentá de nuevo.</p>:<>
   {setup?<><p>Escaneá el QR con tu aplicación autenticadora. Después ingresá el código que genere.</p>
    <img className="admin-verification-qr" src={setup.qr} alt="Código QR para activar la aplicación autenticadora" width={180} height={180}/>
    <details><summary>Ingresar la clave manualmente</summary><code>{setup.secret}</code></details>
   </>:factors.length?<p>Ingresá el código actual de tu aplicación autenticadora para abrir el panel.</p>:<p>Configurá una aplicación autenticadora para proteger el acceso a pedidos y datos de despacho.</p>}
   {setup||factors.length>0?<form className="inc-form" onSubmit={e=>{e.preventDefault();void send('verify',new FormData(e.currentTarget).get('code'));}}>
    {factors.length>1&&<label>Aplicación<select value={factor} onChange={e=>setFactor(e.target.value)}>{factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
    <label>Código de seis dígitos<input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} disabled={busy}/></label>
    <button className="button" disabled={busy}>{busy?'Verificando…':'Verificar y abrir el panel'}</button>
   </form>:<button className="button" onClick={()=>void send('enroll')} disabled={busy}>{busy?'Preparando…':'Configurar aplicación autenticadora'}</button>}
  </>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <form action="/api/admin/logout" method="post"><button className="text-link" type="submit">Cerrar sesión</button></form>
 </section></main>;
}
