import test from 'node:test';
import assert from 'node:assert/strict';
import {openOrderAccess,sealOrderAccess} from '../lib/order-access-token.ts';

const first='9cd2e767-f30a-4cd2-9046-3ad97df1c9bd';
const second='7aecd8b0-b89c-43b7-92c7-03099c3208f8';
const key='local-test-only';
const hash='c'.repeat(64);
const expiresAt=1_800_000_000_000;

test('un acceso recuperado se limita a su pedido, propósito y vencimiento',()=>{
 const token=sealOrderAccess(key,first,hash,expiresAt,'restore');
 assert.deepEqual(openOrderAccess(key,first,token,'restore',expiresAt-1),{hash,expiresAt});
 assert.equal(openOrderAccess(key,second,token,'restore',expiresAt-1),null);
 assert.equal(openOrderAccess(key,first,token,'session',expiresAt-1),null);
 assert.equal(openOrderAccess(key,first,token,'restore',expiresAt),null);
});

test('cada enlace usa un nonce nuevo y requiere el secreto del entorno que lo emitió',()=>{
 const token=sealOrderAccess(key,first,hash,expiresAt,'session');
 assert.notEqual(token,sealOrderAccess(key,first,hash,expiresAt,'session'));
 assert.equal(openOrderAccess('different-local-secret',first,token,'session',expiresAt-1),null);
 assert.equal(openOrderAccess(key,first,'', 'session',expiresAt-1),null);
});
