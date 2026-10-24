import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFulfillment} from '../lib/fulfillment.ts';
import {validPayment} from '../lib/checkout.ts';
test('unpaid, rejected and refunded orders cannot be prepared or dispatched; dispatch requires tracking',()=>{
 const d={fulfillment_status:'dispatched',shipping_carrier:'Andreani',tracking_code:'TEST-1'};
 for(const status of ['awaiting_payment','pending','rejected','refunded','charged_back'])assert.throws(()=>validateFulfillment(d,status));
 assert.doesNotThrow(()=>validateFulfillment(d,'approved'));assert.throws(()=>validateFulfillment({...d,tracking_code:''},'approved'));assert.doesNotThrow(()=>validateFulfillment({...d,fulfillment_status:'new',shipping_carrier:'',tracking_code:''},'pending'));
});
test('rejected/refunded notifications still require matching authoritative seller, amount and reference',()=>{
 const order={id:'a0000000-0000-4000-8000-000000000001',total_cents:2500000};
 for(const status of ['rejected','refunded','charged_back']){const p={live_mode:false,external_reference:order.id,collector_id:'3450457878',currency_id:'ARS',transaction_amount:25000,status,date_last_updated:'2026-10-24T10:00:00Z'};assert.equal(validPayment(p,order,'3450457878'),true);assert.equal(validPayment({...p,transaction_amount:1},order,'3450457878'),false);assert.equal(validPayment({...p,external_reference:'other'},order,'3450457878'),false);}
});
