import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin,readSmallJson} from '../lib/request.ts';
test('origin validation uses the incoming host even when the internal URL is localhost',()=>{assert.ok(sameOrigin(new Request('http://localhost:3000/api',{headers:{host:'preview.example','origin':'https://preview.example'}})));assert.ok(!sameOrigin(new Request('http://localhost:3000/api',{headers:{host:'preview.example',origin:'https://other.example'}})));assert.ok(!sameOrigin(new Request('http://localhost:3000/api')));});
test('JSON input size is bounded before parsing',async()=>{assert.deepEqual(await readSmallJson(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"price":25000}'})),{price:25000});await assert.rejects(()=>readSmallJson(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:'x'.repeat(17000)})})),/grande/);});
