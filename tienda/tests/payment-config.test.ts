import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {checkoutAvailable,paymentConfig,preferenceSeller,GranjaAtuelMercadoPagoApp,GranjaAtuelTestSeller} from '../lib/payment-config.ts';
import {validPayment} from '../lib/checkout.ts';
import {verifiedWebhookPaymentId} from '../lib/payment-webhook.ts';

const base={SUPABASE_SECRET_KEY:'fixture-db-secret',NEXT_PUBLIC_SUPABASE_URL:'https://database.example.invalid',MERCADOPAGO_TEST_SELLER_ID:GranjaAtuelTestSeller,MERCADOPAGO_ACCESS_TOKEN:'fixture-test',MERCADOPAGO_PRODUCTION_ACCESS_TOKEN:'fixture-production',MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET:'fixture-webhook'};
test('production credentials cannot open checkout in preview or open live checkout without the explicit switch',()=>{
 const preview={...base,VERCEL_ENV:'preview',MERCADOPAGO_MODE:'test'};
 assert.equal(paymentConfig(preview)?.token,'fixture-test');
 assert.equal(paymentConfig({...preview,MERCADOPAGO_TEST_SELLER_ID:'99'}),null);
 assert.equal(paymentConfig({...preview,MERCADOPAGO_MODE:'production',MERCADOPAGO_ENABLE_PRODUCTION:'true'}),null);
 const live={...base,VERCEL_ENV:'production',MERCADOPAGO_MODE:'production'};
 const config=paymentConfig(live);
 assert.equal(config?.token,'fixture-production');
 assert.equal(checkoutAvailable(config,live),false);
 assert.equal(checkoutAvailable(config,{...live,MERCADOPAGO_ENABLE_PRODUCTION:'true'}),true);
 assert.equal(paymentConfig({...live,MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET:''}),null);
 assert.equal(paymentConfig({...live,MERCADOPAGO_PRODUCTION_ACCESS_TOKEN:''}),null);
});
test('a preference must come from the Granja Atuel application or its verified test seller',()=>{
 const response={external_reference:'known-order',client_id:GranjaAtuelMercadoPagoApp,collector_id:12345};
 assert.equal(preferenceSeller(response,'known-order','production'),'12345');
 assert.equal(preferenceSeller({...response,client_id:'888888'},'known-order','production'),null);
 assert.equal(preferenceSeller({...response,client_id:undefined},'known-order','production'),null);
 assert.equal(preferenceSeller({...response,collector_id:GranjaAtuelTestSeller},'known-order','production'),null);
 assert.equal(preferenceSeller(response,'known-order','test'),null);
 assert.equal(preferenceSeller({...response,collector_id:GranjaAtuelTestSeller},'known-order','test'),GranjaAtuelTestSeller);
 assert.equal(preferenceSeller(response,'another-order','production'),null);
});
test('live payments must match the saved merchant and can never reconcile a sandbox payment',()=>{
 const order={id:'order123',total_cents:2500000};
 const live={live_mode:true,external_reference:order.id,collector_id:123,currency_id:'ARS',transaction_amount:25000,status:'approved',date_last_updated:'2026-11-20T15:00:00Z'};
 assert.ok(validPayment(live,order,'123','production'));
 assert.ok(!validPayment({...live,live_mode:false},order,'123','production'));
 assert.ok(!validPayment({...live,collector_id:GranjaAtuelTestSeller},order,GranjaAtuelTestSeller,'production'));
 assert.ok(!validPayment({...live,collector_id:124},order,'123','production'));
});
test('the Mercado Pago webhook verifier accepts a signed ID and rejects substitutions or unsigned events',()=>{
 const secret='fixture-webhook',id='999111',requestId='fixture-request',ts=String(Date.now());
 const h=createHmac('sha256',secret).update('id:'+id+';request-id:'+requestId+';ts:'+ts+';').digest('hex');
 const headers={'x-request-id':requestId,'x-signature':'ts='+ts+',v1='+h};
 const path='https://store.example.invalid/api/mercadopago/webhook?data.id=';
 assert.equal(verifiedWebhookPaymentId(new Request(path+id+'&type=payment',{headers}),secret),id);
 assert.equal(verifiedWebhookPaymentId(new Request(path+'2121&type=payment',{headers}),secret),null);
 assert.equal(verifiedWebhookPaymentId(new Request(path+id+'&type=payment'),secret),null);
 assert.equal(verifiedWebhookPaymentId(new Request(path+id+'&type=payment&data.id=2121',{headers}),secret),null);
});
