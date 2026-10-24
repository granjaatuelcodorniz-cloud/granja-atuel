import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,filterLots,monthlyResults,nextTasks,calendarFor,type ReportLot} from '../lib/incubation-report.ts';
import {validateNewLot,validateEvent,type Lot} from '../lib/incubation.ts';
function lot(overrides:Partial<ReportLot>={}):ReportLot{return {...validateNewLot({egg_count:100,start_date:'2026-10-01'},'2026-10-24'),id:'a0000000-0000-4000-8000-000000000001',owner_id:'owner',account:'cliente@example.invalid',discarded:null,developing:null,candled_on:null,lockdown_on:null,born:null,hatched_on:null,incident:'',share_results:false,version:1,created_at:'',...overrides};}
test('reports weight egg counts, count only completed lots and keep missing ovoscopy out of development rates',()=>{
 const s=summarize([lot({egg_count:10,born:10,hatched_on:'2026-10-20',developing:10}),lot({egg_count:990,born:100,hatched_on:'2026-10-21'}),lot({egg_count:9000})]);
 assert.equal(s.hatchRate,'11%');assert.equal(s.developmentRate,'100%');assert.equal(s.closed,2);assert.equal(s.active,1);assert.equal(s.eggs,1000);assert.equal(s.candled,1);assert.equal(summarize([]).hatchRate,'—');
});
test('customer, date, source and confirmed batch filters combine without accepting a client-written batch as confirmed',()=>{
 const rows=[lot({source:'granja_atuel',supplier_lot:'GA-A'}),lot({id:'b',owner_id:'other',delivery:{id:'d',owner_id:'other',batch_code:'GA-A',production_date:'2026-09-28',delivered_on:'2026-09-30',egg_count:100,purchase_reference:'Pedido 1',active:true,version:1}})];
 const f={search:'',owner:'',species:'coturnix',source:'',state:'all',from:'2026-10-01',to:'2026-10-01',batch:'GA-A'};assert.equal(filterLots(rows,f).length,1);assert.equal(filterLots(rows,{...f,owner:'owner'}).length,0);assert.equal(filterLots(rows,{...f,batch:'',owner:'owner',source:'granja_atuel',search:'ga-a'}).length,1);assert.equal(filterLots(rows,{...f,batch:'',state:'closed'}).length,0);
});
test('monthly results use the hatch month and do not invent empty historical results',()=>{assert.deepEqual(monthlyResults([lot()]),[]);assert.equal(monthlyResults([lot({born:50,hatched_on:'2026-11-01'})])[0].month,'2026-11');});
test('agenda omits completed steps and closed lots and uses Coturnix days 10, 14, 16',()=>{
 const rows=[lot(),lot({id:'closed',born:80})];const tasks=nextTasks(rows,'2026-10-15');assert.deepEqual(tasks.map(t=>t.date),['2026-10-11','2026-10-15','2026-10-17']);assert.equal(tasks[0].overdue,true);assert.equal(tasks[1].today,true);assert.equal(nextTasks([lot({candled_on:'2026-10-11',lockdown_on:'2026-10-15'})]).length,1);
});
test('calendar escapes user text, folds UTF-8 lines and provides stable event identifiers',()=>{
 const ics=calendarFor([lot({name:'Lote áááááááááááááááááááááááááááááááááááááááááááááááááááááááááááá\r\nBEGIN:VEVENT,otra;nota'})],new Date('2026-10-24T15:00:00Z'));
 assert.equal((ics.match(/^BEGIN:VEVENT$/gm)||[]).length,3);assert.match(ics,/DTSTART;VALUE=DATE:20261015/);assert.match(ics,/TRIGGER:-PT12H/);assert.ok(ics.split('\r\n').every(line=>Buffer.byteLength(line,'utf8')<=75));assert.match(ics,/DTSTAMP:20261024T150000Z/);
});
test('self reported trace references are bounded, and legacy sharing never enters a traceability update',()=>{const l=lot();assert.deepEqual(validateEvent({action:'traceability',supplier_lot:' A ',purchase_reference:' V-1 ',share_results:true},l),{supplier_lot:'A',purchase_reference:'V-1',delivery_id:null});assert.throws(()=>validateNewLot({egg_count:100,start_date:'2026-10-01',source:'otro',provider_name:'Otro',delivery_id:l.id}));assert.throws(()=>validateEvent({action:'traceability',delivery_id:'someone'},l));assert.throws(()=>validateEvent({action:'traceability',purchase_reference:'x'.repeat(101)},l));});
