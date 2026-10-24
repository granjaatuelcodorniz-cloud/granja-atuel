export const protocols = {
 coturnix:{label:'Codorniz japónica (Coturnix)',candling:10,lockdown:14,hatch:16},
 gallina:{label:'Gallina',candling:7,lockdown:18,hatch:21},
 personalizado:{label:'Otro protocolo',candling:10,lockdown:15,hatch:17}
} as const;
export type Species=keyof typeof protocols;
export type Lot={id:string;owner_id:string;name:string;species:Species;egg_count:number;start_date:string;candling_day:number;lockdown_day:number;hatch_day:number;source:string;provider_name:string;incubator:string;notes:string;discarded:number|null;developing:number|null;candled_on:string|null;lockdown_on:string|null;born:number|null;hatched_on:string|null;incident:string;share_results:boolean;version:number;created_at:string};
export function todayAR(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validDate(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function addDays(date:string,days:number){return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function elapsed(start:string,today=todayAR()){return Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);}
export function formatDate(date:string){return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
export function percent(n:number,d:number){return d>0?Math.round(n/d*100)+'%':'—';}
function integer(n:unknown,min:number,max:number):n is number{return typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;}
function text(v:unknown,max:number){return typeof v==='string'&&v.length<=max?v.trim():null;}
export function validateNewLot(b:Record<string,unknown>,today=todayAR()){
 if(!integer(b.egg_count,1,100000)||!validDate(b.start_date)||b.start_date>today||b.start_date<'2020-01-01')throw new Error('Revisá la cantidad y la fecha de inicio (no puede ser futura).');
 const species=(typeof b.species==='string'&&Object.hasOwn(protocols,b.species)?b.species:'coturnix') as Species;
 const p=protocols[species];const candling=b.candling_day??p.candling,lockdown=b.lockdown_day??p.lockdown,hatch=b.hatch_day??p.hatch;
 if(!integer(candling,1,59)||!integer(lockdown,2,60)||!integer(hatch,3,65)||candling>=lockdown||lockdown>=hatch)throw new Error('Las etapas deben seguir este orden: ovoscopía, fin del volteo y nacimiento.');
 const name=text(b.name??'',80),source=text(b.source??'sin_indicar',30),providerName=source==='otro'?text(b.provider_name??'',100):'',incubator=text(b.incubator??'',100),notes=text(b.notes??'',1500);
 if(name===null||incubator===null||notes===null||!['granja_atuel','otro','propio','sin_indicar'].includes(source??''))throw new Error('Revisá los datos opcionales.');
 if(source==='otro'&&!providerName)throw new Error('Ingresá el nombre del otro proveedor (hasta 100 caracteres).');
 return {egg_count:b.egg_count,start_date:b.start_date,species,candling_day:candling,lockdown_day:lockdown,hatch_day:hatch,name:name||`Incubación ${formatDate(b.start_date)}`,source:source!,provider_name:providerName!,incubator,notes};
}
export function validateEvent(b:Record<string,unknown>,lot:Lot,today=todayAR()){
 const date=b.date;
 if(!validDate(date)||date<lot.start_date||date>today)throw new Error('La fecha debe estar entre el inicio y hoy.');
 if(b.action==='candling'){
  if(lot.born!==null)throw new Error('La incubación ya tiene resultados de nacimiento.');
  if(!integer(b.discarded,0,lot.egg_count))throw new Error('Los descartados deben estar entre cero y la cantidad inicial.');
  return {discarded:b.discarded,candled_on:date};
 }
 if(b.action==='lockdown'){
  if(lot.born!==null)throw new Error('La incubación ya está cerrada.');
  return {lockdown_on:date};
 }
 if(b.action==='hatch'){
  if(date<(lot.candled_on??lot.start_date)||date<(lot.lockdown_on??lot.start_date))throw new Error('El nacimiento no puede ser anterior a las etapas registradas.');
  if(!integer(b.born,0,lot.developing??lot.egg_count))throw new Error('Los nacidos no pueden superar los huevos que continúan incubándose.');
  const incident=text(b.incident??'',1500);if(incident===null)throw new Error('Revisá las observaciones.');
  return {born:b.born,hatched_on:date,incident};
 }
 throw new Error('Acción no válida.');
}
