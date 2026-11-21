'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Save} from 'lucide-react';
import type {ShopSettings,Media} from '@/lib/admin';
import {api,Message,Uploader} from './shared';
type Props={initial:ShopSettings;version:string;media:Media[];saved:(s:ShopSettings,version:string)=>void;uploaded:(m:Media)=>void};

export default function Settings({initial,version,media,saved,uploaded}:Props){
 const [s,setS]=useState(initial),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
 const update=<K extends keyof ShopSettings,>(key:K,value:ShopSettings[K])=>setS(old=>({...old,[key]:value}));
 function imagePicker(label:string,imageKey:'hero_image'|'about_image',altKey:'hero_alt'|'about_alt'){
  const selected=s[imageKey];
  return <>
   <label>{label}<select value={selected} onChange={e=>{const url=e.target.value;setS(old=>({...old,[imageKey]:url,[altKey]:media.find(m=>m.url===url)?.alt||''}));}}>
    {!media.some(m=>m.url===selected)&&<option value={selected}>Imagen actual</option>}
    {media.filter(m=>!m.archived||m.url===selected).map(m=><option key={m.id} value={m.url}>{m.name}</option>)}
   </select></label>
   <label>Texto alternativo de la foto<input maxLength={200} value={s[altKey]} onChange={e=>update(altKey,e.target.value)}/></label>
   <img className="dash-cover-preview" src={selected} alt="Vista previa de la foto"/>
   <Uploader onUpload={m=>{uploaded(m);setS(old=>({...old,[imageKey]:m.url,[altKey]:m.alt||''}));}} onError={setError}/>
  </>;
 }
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const d=await api('settings','PUT',{...s,expected_updated_at:version});
   setS(d.settings);saved(d.settings,d.updated_at);setSuccess('Cambios guardados. Ya podés verlos en la tienda.');
  }catch(err){setError(err instanceof Error?err.message:'No pudimos guardar.');}
  finally{setBusy(false);}
 }
 return <>
  <div className="dash-section-heading act-heading"><div><p className="eyebrow">IDENTIDAD Y CONTACTO</p><h1>Portada y contacto</h1><p>Editá lo primero que ve el cliente y cómo se comunica con vos.</p></div><Link href="/" target="_blank" className="dash-secondary">Ver la tienda <ArrowUpRight size={17}/></Link></div>
  <form className="dash-settings dash-form" onSubmit={save}>
   <section className="dash-panel">
    <h2>Aviso de tienda</h2><label>Mensaje arriba de la portada<textarea maxLength={200} rows={2} value={s.notice} placeholder="Ej. Esta semana despachamos hasta el jueves." onChange={e=>update('notice',e.target.value)}/><small>Dejalo vacío para ocultar el aviso.</small></label>
   </section>
   <section className="dash-panel">
    <h2>Portada</h2><label>Título principal<input required maxLength={200} value={s.hero_title} onChange={e=>update('hero_title',e.target.value)}/></label>
    <label>Segunda línea (opcional)<input maxLength={200} value={s.hero_accent} onChange={e=>update('hero_accent',e.target.value)}/></label>
    <label>Descripción<textarea required maxLength={700} rows={3} value={s.hero_description} onChange={e=>update('hero_description',e.target.value)}/></label>
    {imagePicker('Imagen de portada','hero_image','hero_alt')}
   </section>
   <section className="dash-panel">
    <h2>Nuestro origen</h2>
    <label>Título<input required maxLength={200} value={s.about_title} onChange={e=>update('about_title',e.target.value)}/></label>
    <label>Presentación de la granja<textarea required maxLength={700} rows={4} value={s.about_description} onChange={e=>update('about_description',e.target.value)}/></label>
    {imagePicker('Imagen de la granja','about_image','about_alt')}
   </section>
   <section className="dash-panel">
    <h2>Venta mayorista</h2>
    <label>Título<input required maxLength={200} value={s.wholesale_title} onChange={e=>update('wholesale_title',e.target.value)}/></label>
    <label>Texto para comercios<textarea required maxLength={700} rows={4} value={s.wholesale_description} onChange={e=>update('wholesale_description',e.target.value)}/></label>
   </section>
   <section className="dash-panel">
    <h2>Datos de contacto</h2>
    <div className="dash-field-row"><label>Nombre comercial<input required maxLength={200} value={s.business_name} onChange={e=>update('business_name',e.target.value)}/></label><label>Localidad y provincia<input required maxLength={200} value={s.location} onChange={e=>update('location',e.target.value)}/></label></div>
    <div className="dash-field-row"><label>WhatsApp<input required inputMode="numeric" pattern="[0-9]{8,15}" value={s.whatsapp} onChange={e=>update('whatsapp',e.target.value)}/><small>País + área + número, sin espacios.</small></label><label>Correo de contacto<input type="email" maxLength={200} value={s.contact_email} onChange={e=>update('contact_email',e.target.value)}/></label></div>
    <label>Perfil de Instagram (opcional)<input type="url" placeholder="https://www.instagram.com/granjaatuel" maxLength={200} value={s.instagram} onChange={e=>update('instagram',e.target.value)}/></label>
   </section>
   <section className="dash-panel">
    <h2>Datos de envío</h2>
    <label className="recipient-dni-setting"><input type="checkbox" checked={s.require_recipient_dni} onChange={e=>update('require_recipient_dni',e.target.checked)}/> Pedir DNI de quien recibe</label>
    <small>Activá esta opción cuando tu transportista te pida el número para generar el envío. Se solicitará en los próximos pedidos, antes del pago.</small>
   </section>
   <div className="act-settings-save"><Message error={error} success={success}/><button className="dash-primary" disabled={busy||!version}><Save size={17}/>{busy?'Guardando…':'Guardar cambios'}</button></div>
  </form>
 </>;
}
