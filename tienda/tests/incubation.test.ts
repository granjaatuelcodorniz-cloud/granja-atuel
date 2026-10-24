import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNewLot,validateEvent,elapsed,todayAR,addDays,percent,type Lot} from '../lib/incubation.ts';
const date='2026-10-20';
const basic={egg_count:100,start_date:'2026-10-01'};
const lot={...validateNewLot(basic,date),id:'x',owner_id:'owner',discarded:null,developing:null,candled_on:null,lockdown_on:null,born:null,hatched_on:null,incident:'',share_results:false,version:1,created_at:''} as Lot;
test('simple setup: quantity and start date only; dates are Argentina calendar dates',()=>{
 const created=validateNewLot(basic,date);assert.equal(created.egg_count,100);assert.equal(created.species,'coturnix');assert.equal(created.lockdown_day,14);assert.equal(created.hatch_day,16);
 assert.equal(todayAR(new Date('2026-10-21T01:00:00Z')),'2026-10-20');assert.equal(elapsed('2026-10-01','2026-10-01'),0);assert.equal(addDays('2026-12-25',17),'2027-01-11');
 assert.throws(()=>validateNewLot({...basic,start_date:'2026-02-30'},date));assert.throws(()=>validateNewLot({...basic,start_date:'2026-10-21'},date));assert.throws(()=>validateNewLot({...basic,egg_count:1.5},date));assert.throws(()=>validateNewLot({...basic,candling_day:18},date));
});
test('ovoscopy accepts discarded only, including zero and all, rejects impossible counts',()=>{
 assert.deepEqual(validateEvent({action:'candling',date,discarded:12},lot,date),{discarded:12,candled_on:date});
 assert.equal(validateEvent({action:'candling',date,discarded:0},lot,date).discarded,0);assert.equal(validateEvent({action:'candling',date,discarded:100},lot,date).discarded,100);
 for(const discarded of [-1,101,0.5,'12'])assert.throws(()=>validateEvent({action:'candling',date,discarded},lot,date));
});
test('birth totals use the remaining eggs, missing ovoscopy is not zero or fertility',()=>{
 const candled={...lot,discarded:12,developing:88,candled_on:'2026-10-11'};
 assert.equal(validateEvent({action:'hatch',date,born:88},candled,date).born,88);
 assert.throws(()=>validateEvent({action:'hatch',date,born:89},candled,date));
 assert.equal(validateEvent({action:'hatch',date,born:100},lot,date).born,100);
 assert.throws(()=>validateEvent({action:'hatch',date:'2026-10-10',born:80},candled,date));
 assert.equal(percent(0,100),'0%');assert.equal(percent(0,0),'—');
 assert.throws(()=>validateEvent({action:'candling',date,discarded:4},{...candled,born:80},date));
});

test('other supplier name is saved trimmed and cannot be omitted; hidden stale names are ignored',()=>{
 assert.equal(validateNewLot({...basic,source:'otro',provider_name:'  Criadero Los Álamos  '},date).provider_name,'Criadero Los Álamos');
 for(const provider_name of ['', '   ', 'x'.repeat(101)])assert.throws(()=>validateNewLot({...basic,source:'otro',provider_name},date));
 assert.equal(validateNewLot({...basic,source:'granja_atuel',provider_name:'Nombre anterior'},date).provider_name,'');
});

// The legacy flag must not become a publication permission or alter internal access.
test('birth recording does not require or change sharing authorization',()=>{
 const recorded=validateEvent({action:'hatch',date,born:80,share_results:true},lot,date);
 assert.deepEqual(recorded,{born:80,hatched_on:date,incident:''});
 assert.throws(()=>validateEvent({action:'consent',date,share_results:true},lot,date));
});
