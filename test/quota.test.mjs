import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveQuota,clientFingerprint} from '../src/quota.mjs';

function memoryStore(){
  let record=null,revision=0;
  return {
    async read(){await Promise.resolve();return record?{state:structuredClone(record),etag:String(revision)}:null;},
    async write(next,etag){await Promise.resolve();if((record?String(revision):null)!==etag)throw new Error('conflict');record=structuredClone(next);revision++;},
    inspect(){return structuredClone(record);}
  };
}
const A='a'.repeat(64),B='b'.repeat(64),time=Date.UTC(2026,9,29,12),limits={daily:8,total:12,perClient:2};

test('reserves provider calls before use and enforces a shared daily budget',async()=>{
  const store=memoryStore();
  await reserveQuota({store,client:A,cost:5,now:time,limits});
  await reserveQuota({store,client:B,cost:3,now:time,limits});
  await assert.rejects(reserveQuota({store,client:B,cost:2,now:time,limits}),e=>e.status===429);
  assert.equal(store.inspect().dailyCalls,8);assert.equal(store.inspect().totalCalls,8);
});

test('enforces visitor and lifetime caps even across daily resets',async()=>{
  const store=memoryStore();
  await reserveQuota({store,client:A,cost:2,now:time,limits});
  await reserveQuota({store,client:A,cost:2,now:time,limits});
  await assert.rejects(reserveQuota({store,client:A,cost:2,now:time,limits}),e=>e.status===429);
  await reserveQuota({store,client:A,cost:5,now:time+86400000,limits});
  await assert.rejects(reserveQuota({store,client:B,cost:5,now:time+86400000,limits}),e=>e.status===429);
  assert.equal(store.inspect().totalCalls,9);
});

test('concurrent requests cannot exceed the shared quota',async()=>{
  const store=memoryStore(),limit={daily:6,total:100,perClient:100};
  const outcomes=await Promise.allSettled(Array.from({length:20},()=>reserveQuota({store,client:A,cost:2,now:time,limits:limit})));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,3);
  assert.equal(store.inspect().dailyCalls,6);
});

test('fails closed when the quota store is unavailable or corrupt',async()=>{
  const broken={read:async()=>{throw new Error('private details');},write:async()=>{}};
  await assert.rejects(reserveQuota({store:broken,client:A,cost:2,now:time,limits}),e=>e.status===503&&!e.message.includes('private details'));
  const corrupt={read:async()=>({state:{dailyCalls:-3},etag:'1'}),write:async()=>{throw new Error('must not write');}};
  await assert.rejects(reserveQuota({store:corrupt,client:A,cost:2,now:time,limits}),e=>e.status===503);
  let writes=0;const emptyRecord={read:async()=>({state:null,etag:'1'}),write:async()=>{writes++;}};
  await assert.rejects(reserveQuota({store:emptyRecord,client:A,cost:2,now:time,limits}),e=>e.status===503);
  assert.equal(writes,0);
});

test('hashes visitor addresses without storing them in the quota record',async()=>{
  const fingerprint=clientFingerprint('192.0.2.10','a'.repeat(40));
  assert.match(fingerprint,/^[a-f0-9]{64}$/);assert.notEqual(fingerprint,clientFingerprint('192.0.2.11','a'.repeat(40)));
  assert.throws(()=>clientFingerprint('', 'a'.repeat(40)));assert.throws(()=>clientFingerprint('192.0.2.10','short'));
  const store=memoryStore();await reserveQuota({store,client:fingerprint,cost:2,now:time,limits});
  assert.equal(JSON.stringify(store.inspect()).includes('192.0.2.10'),false);
});
