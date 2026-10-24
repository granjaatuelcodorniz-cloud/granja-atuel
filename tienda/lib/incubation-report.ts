import {addDays,percent,todayAR,type Lot} from './incubation.ts';
export type Delivery={active:boolean;version:number;id:string;owner_id:string;batch_code:string;production_date:string;delivered_on:string;egg_count:number;purchase_reference:string};
export type ReportLot=Lot&{account:string;delivery?:Delivery};
export type Filters={search:string;owner:string;species:string;source:string;state:string;from:string;to:string;batch:string};
export function filterLots(lots:ReportLot[],f:Filters){return lots.filter(l=>(!f.owner||l.owner_id===f.owner)&&(!f.species||l.species===f.species)&&(!f.source||l.source===f.source)&&(!f.from||l.start_date>=f.from)&&(!f.to||l.start_date<=f.to)&&(!f.batch||l.delivery?.batch_code===f.batch)&&(f.state==='all'||(f.state==='closed'?l.born!==null:l.born===null))&&[l.name,l.account,l.provider_name,l.supplier_lot,l.purchase_reference,l.delivery?.batch_code,l.delivery?.purchase_reference,l.incubator].join(' ').toLocaleLowerCase('es').includes(f.search.trim().toLocaleLowerCase('es')));}
export function summarize(lots:Lot[]){const closed=lots.filter(l=>l.born!==null),candled=closed.filter(l=>l.developing!==null),eggs=closed.reduce((n,l)=>n+l.egg_count,0),born=closed.reduce((n,l)=>n+l.born!,0),developing=candled.reduce((n,l)=>n+l.developing!,0),bornCandled=candled.reduce((n,l)=>n+l.born!,0);return {lots:lots.length,active:lots.length-closed.length,closed:closed.length,eggs,born,candled:candled.length,hatchRate:percent(born,eggs),developmentRate:percent(bornCandled,developing)};}
export function monthlyResults(lots:Lot[]){const keys=[...new Set(lots.filter(l=>l.born!==null&&l.hatched_on).map(l=>l.hatched_on!.slice(0,7)))].sort();return keys.map(month=>({month,...summarize(lots.filter(l=>l.hatched_on?.startsWith(month)))}));}
export function nextTasks(lots:Lot[],today=todayAR()){
 return lots.filter(l=>l.born===null).flatMap(l=>[
  ...(!l.candled_on?[{kind:'candling',label:'Ovoscopía',date:addDays(l.start_date,l.candling_day)}]:[]),
  ...(!l.lockdown_on?[{kind:'lockdown',label:'Fin del volteo',date:addDays(l.start_date,l.lockdown_day)}]:[]),
  {kind:'hatch',label:'Nacimiento estimado',date:addDays(l.start_date,l.hatch_day)}
 ].map(t=>({...t,lot:l.id,name:l.name,overdue:t.date<today,today:t.date===today}))).sort((a,b)=>a.date.localeCompare(b.date));
}
const escapeIcs=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
// RFC 5545 lines are folded at 75 UTF-8 octets, including continuation whitespace.
function foldLine(line:string){let parts=[''],size=0;for(const c of line){const bytes=new TextEncoder().encode(c).length;if(size+bytes>75){parts.push(' ');size=1;}parts[parts.length-1]+=c;size+=bytes;}return parts.join('\r\n');}
export function calendarFor(lots:Lot[],now=new Date()){
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Granja Atuel//Incubaciones//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const t of nextTasks(lots)){lines.push('BEGIN:VEVENT',`UID:${t.lot}-${t.kind}@granjaatuel.com.ar`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${t.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${addDays(t.date,1).replaceAll('-','')}`,`SUMMARY:${escapeIcs(t.label+' · '+t.name)}`,'DESCRIPTION:Fecha orientativa. Revisá tu incubadora y registrá la etapa en Granja Atuel.','BEGIN:VALARM','TRIGGER:-PT12H','ACTION:DISPLAY','DESCRIPTION:Recordatorio de incubación','END:VALARM','END:VEVENT');}
 lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
}
