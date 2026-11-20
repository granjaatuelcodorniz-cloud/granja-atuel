'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,BookOpen,MapPin,MessageCircle,Plus,Save} from 'lucide-react';
import type {Media} from '@/lib/admin';
import {contentLabels,contentTitle,newContent,type SiteContent,type ContentKind} from '@/lib/site-content';
import {api,Empty,Message,Modal,Uploader} from './shared';

const panels=[
 {kind:'faq',singular:'pregunta',icon:MessageCircle,anchor:'/#faq',description:'Respondé las dudas que más se repiten, desde el costo hasta el despacho.'},
 {kind:'location',singular:'punto de venta',icon:MapPin,anchor:'/#puntos',description:'Mantené al día los comercios, direcciones y enlaces de mapa.'},
 {kind:'recipe',singular:'receta',icon:BookOpen,anchor:'/recetas',description:'Creá recetas y marcá las que querés destacar en el inicio (hasta tres, según el orden).'},
] as const;
export default function Content({entries,media,updated,uploaded}:{entries:SiteContent[];media:Media[];updated:(c:SiteContent)=>void;uploaded:(m:Media)=>void}){
 const [kind,setKind]=useState<ContentKind>('faq'),[editor,setEditor]=useState<SiteContent|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const panel=panels.find(p=>p.kind===kind)!;
 const rows=entries.filter(e=>e.kind===kind).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
 const shown=rows.filter(e=>[contentTitle(e),e.kind==='location'?e.data.city:''].join(' ').toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR')));
 function add(){
  const position=Math.min(9999,Math.max(-10,...rows.map(e=>e.position))+10);
  setEditor(newContent(kind,kind+'-'+crypto.randomUUID().slice(0,8),position));
 }
 async function toggle(entry:SiteContent){
  if(busy)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const d=await api('content','PUT',{...entry,published:!entry.published,expected_updated_at:entry.updated_at});
   updated(d.entry);setSuccess(entry.published?'Contenido oculto de la web.':'Contenido publicado en la web.');
  }catch(e){setError(e instanceof Error?e.message:'No pudimos actualizar el contenido.');}
  finally{setBusy(false);}
 }
 return <>
  <div className="dash-section-heading act-heading"><div><p className="eyebrow">EDITÁ TU SITIO PÚBLICO</p><h1>Contenido web</h1><p>Actualizá las secciones de la tienda desde el panel.</p></div><Link href={panel.anchor} target="_blank" className="dash-secondary">Ver en la web <ArrowUpRight size={17}/></Link></div>
  <div className="act-content-tabs" role="group" aria-label="Secciones de contenido">{panels.map(p=><button type="button" key={p.kind} aria-pressed={kind===p.kind} onClick={()=>{setKind(p.kind);setSearch('');setError('');setSuccess('');}}><p.icon size={17}/>{contentLabels[p.kind]}</button>)}</div>
  <Message error={error} success={success}/>
  <section className="dash-panel act-work">
   <div className="dash-panel-heading"><div><h2>{contentLabels[kind]}</h2><p className="act-helper">{panel.description}</p></div><button type="button" className="dash-primary" onClick={add}><Plus size={16}/> Agregar {panel.singular}</button></div>
   {rows.length>0&&<div className="dash-toolbar act-toolbar"><input aria-label={'Buscar en '+contentLabels[kind]} placeholder="Buscar por nombre o localidad…" value={search} onChange={e=>setSearch(e.target.value)}/></div>}
   {shown.length>0?<div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>Contenido</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{shown.map(e=><tr key={e.id}>
    <td><strong>{contentTitle(e)}</strong>{e.kind==='location'&&<small>{e.data.city} · {e.data.address}</small>}{e.kind==='recipe'&&e.data.featured&&<small>Destacada en el inicio</small>}</td>
    <td>{e.position}</td><td><span className={'dash-badge '+(e.published?'green':'neutral')}>{e.published?'Publicado':'Oculto'}</span></td>
    <td><div className="dash-inline"><button className="dash-secondary small" type="button" onClick={()=>setEditor(e)}>Editar</button><button className="dash-secondary small" type="button" disabled={busy} onClick={()=>toggle(e)}>{e.published?'Ocultar':'Publicar'}</button></div></td>
   </tr>)}</tbody></table></div>:<Empty title="No hay contenido para mostrar." description="Probá otra búsqueda o agregá una entrada."/>}
  </section>
  {editor&&<EditContent initial={editor} media={media} close={()=>setEditor(null)} saved={e=>{updated(e);setEditor(null);setSuccess('Contenido guardado.');}} uploaded={uploaded}/>}
 </>;
}
function EditContent({initial,media,close,saved,uploaded}:{initial:SiteContent;media:Media[];close:()=>void;saved:(c:SiteContent)=>void;uploaded:(m:Media)=>void}){
 const [e,setE]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const setValue=(key:string,value:string|boolean)=>setE(old=>({...old,data:{...old.data,[key]:value}} as SiteContent));
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{const d=await api('content',initial.updated_at?'PUT':'POST',{...e,expected_updated_at:initial.updated_at});saved(d.entry);}
  catch(err){setError(err instanceof Error?err.message:'No pudimos guardar.');}finally{setBusy(false);}
 }
 const image=e.kind==='recipe'?e.data.image:'';
 return <Modal title={(initial.updated_at?'Editar ':'Agregar ')+panels.find(p=>p.kind===e.kind)!.singular} close={()=>{if(!busy)close();}} wide={e.kind==='recipe'}>
  <form className="dash-form" onSubmit={save}>
   {e.kind==='faq'&&<><label>Pregunta<input required maxLength={180} value={e.data.question} onChange={ev=>setValue('question',ev.target.value)}/></label><label>Respuesta<textarea required maxLength={900} rows={5} value={e.data.answer} onChange={ev=>setValue('answer',ev.target.value)}/></label></>}
   {e.kind==='location'&&<><label>Nombre del comercio<input required maxLength={140} value={e.data.name} onChange={ev=>setValue('name',ev.target.value)}/></label><label>Dirección<input required maxLength={200} value={e.data.address} onChange={ev=>setValue('address',ev.target.value)}/></label><label>Localidad<input required maxLength={120} value={e.data.city} onChange={ev=>setValue('city',ev.target.value)}/></label><label>Enlace de Google Maps (opcional)<input type="url" maxLength={400} value={e.data.map_url} onChange={ev=>setValue('map_url',ev.target.value)}/><small>Si lo dejás vacío, se buscará la dirección en el mapa.</small></label></>}
   {e.kind==='recipe'&&<>
    <label>Título<input required maxLength={150} value={e.data.title} onChange={ev=>setValue('title',ev.target.value)}/></label>
    <div className="dash-field-row"><label>Tiempo<input required maxLength={50} placeholder="Ej. 20 min" value={e.data.time} onChange={ev=>setValue('time',ev.target.value)}/></label><label>Porciones<input maxLength={30} value={e.data.portions} onChange={ev=>setValue('portions',ev.target.value)}/></label></div>
    <label>Dificultad<input maxLength={50} value={e.data.difficulty} onChange={ev=>setValue('difficulty',ev.target.value)}/></label>
    <label>Ingredientes<textarea required maxLength={3200} rows={4} value={e.data.ingredients} onChange={ev=>setValue('ingredients',ev.target.value)}/></label>
    <label>Preparación<textarea required maxLength={3600} rows={5} value={e.data.steps} onChange={ev=>setValue('steps',ev.target.value)}/></label>
    <label>Imagen de la receta<select value={image} onChange={ev=>setValue('image',ev.target.value)}>{!media.some(m=>m.url===image)&&<option value={image}>Imagen actual</option>}{media.filter(m=>!m.archived||m.url===image).map(m=><option key={m.id} value={m.url}>{m.name}</option>)}</select></label>
    <img className="act-content-photo" src={image} alt="Vista previa de la receta"/>
    <Uploader onUpload={m=>{uploaded(m);setValue('image',m.url);}} onError={setError}/>
    <label className="dash-check"><input type="checkbox" checked={e.data.featured} onChange={ev=>setValue('featured',ev.target.checked)}/><span>Destacar en el inicio</span></label>
   </>}
   <div className="dash-field-row"><label>Orden<input type="number" required min={0} max={9999} step={1} value={e.position} onChange={ev=>setE(old=>({...old,position:Number(ev.target.value)}))}/><small>Los números más bajos aparecen primero.</small></label><label className="dash-check"><input type="checkbox" checked={e.published} onChange={ev=>setE(old=>({...old,published:ev.target.checked}))}/><span>Visible en la web</span></label></div>
   <Message error={error}/>
   <footer><button type="button" className="dash-secondary" onClick={close} disabled={busy}>Cancelar</button><button className="dash-primary" disabled={busy}><Save size={17}/>{busy?'Guardando…':'Guardar contenido'}</button></footer>
  </form>
 </Modal>;
}
