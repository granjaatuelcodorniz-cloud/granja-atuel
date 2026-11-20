import {validImageUrl} from './catalog.ts';

export type ContentData = {
 faq: {question:string; answer:string};
 location: {name:string; address:string; city:string; map_url:string};
 recipe: {title:string; image:string; time:string; portions:string; difficulty:string; ingredients:string; steps:string; featured:boolean};
};
export type ContentKind = keyof ContentData;
export type SiteContent = { [K in ContentKind]: {id:string;kind:K;data:ContentData[K];published:boolean;position:number;updated_at:string} }[ContentKind];
export const contentLabels = {faq:'Preguntas frecuentes',location:'Puntos de venta',recipe:'Recetas'} satisfies Record<ContentKind,string>;

export function contentTitle(entry:SiteContent) {
 if(entry.kind==='faq') return entry.data.question;
 if(entry.kind==='location') return entry.data.name;
 return entry.data.title;
}

export function newContent(kind:ContentKind, id:string, position:number):SiteContent {
 const base={id,position,published:false,updated_at:''};
 if(kind==='faq')return {...base,kind,data:{question:'',answer:''}};
 if(kind==='location')return {...base,kind,data:{name:'',address:'',city:'',map_url:''}};
 return {...base,kind,data:{title:'',image:'/producto-sin-imagen.svg',time:'',portions:'',difficulty:'Fácil',ingredients:'',steps:'',featured:false}};
}

function field(b:Record<string,unknown>,key:string,name:string,max:number,required=true) {
 const value=b[key];
 if(typeof value!=='string'||(required&&!value.trim())||value.length>max) throw new Error('Revisá '+name+'.');
 return value.trim();
}

function validMapUrl(value:string) {
 if(!value)return true;
 try {
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(
   url.hostname==='maps.app.goo.gl'||
   (url.hostname==='goo.gl'&&url.pathname.startsWith('/maps/'))||
   (['www.google.com','maps.google.com','www.google.com.ar','maps.google.com.ar'].includes(url.hostname)&&url.pathname.startsWith('/maps'))
  );
 } catch { return false; }
}
export function recipeImageAllowed(value:string) {
 return validImageUrl(value)||/^\/Recetas\/[\p{L}\p{M}\d _-]+\.webp$/u.test(value);
}
export function validateSiteContent(b:Record<string,unknown>):SiteContent {
 const {id,kind,position,published,data}=b;
 if(typeof id!=='string'||!/^[a-z0-9-]{1,64}$/.test(id)||typeof published!=='boolean'||!Number.isInteger(position)||Number(position)<0||Number(position)>9999||!data||typeof data!=='object'||Array.isArray(data)) throw new Error('Revisá el contenido y el orden.');
 const d=data as Record<string,unknown>;
 const base={id,position:Number(position),published,updated_at:''};
 if(kind==='faq')return {...base,kind,data:{question:field(d,'question','la pregunta',180),answer:field(d,'answer','la respuesta',900)}};
 if(kind==='location'){
  const map_url=field(d,'map_url','el enlace del mapa',400,false);
  if(!validMapUrl(map_url))throw new Error('Usá un enlace de Google Maps.');
  return {...base,kind,data:{name:field(d,'name','el nombre del comercio',140),address:field(d,'address','la dirección del comercio',200),city:field(d,'city','la localidad',120),map_url}};
 }
 if(kind==='recipe'){
  const image=field(d,'image','la imagen',300);
  if(!recipeImageAllowed(image)||typeof d.featured!=='boolean')throw new Error('Revisá la foto o el estado destacado.');
  return {...base,kind,data:{title:field(d,'title','el título',150),image,time:field(d,'time','el tiempo',50),portions:field(d,'portions','las porciones',30,false),difficulty:field(d,'difficulty','la dificultad',50,false),ingredients:field(d,'ingredients','los ingredientes',3200),steps:field(d,'steps','la preparación',3600),featured:d.featured}};
 }
 throw new Error('Sección inválida.');
}
