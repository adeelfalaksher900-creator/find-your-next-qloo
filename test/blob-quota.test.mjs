import test from 'node:test';
import assert from 'node:assert/strict';
import {blobQuotaStore} from '../src/blob-quota.mjs';
import {reserveQuota} from '../src/quota.mjs';
import {BlobPreconditionFailedError,BlobError} from '@vercel/blob';

const client='a'.repeat(64);
const record={version:1,day:'2026-10-29',dailyCalls:2,totalCalls:2,clients:{}};
const stream=text=>new Response(text).body;

test('Blob quota round trip uses uncached reads and exact compare-and-set metadata',async()=>{
  let saved=null,revision=0;
  const sdk={
    async get(path,options){assert.equal(options.access,'private');assert.equal(options.useCache,false);return saved===null?null:{statusCode:200,stream:stream(saved),blob:{etag:`"${revision}"`,size:Buffer.byteLength(saved)}};},
    async put(path,text,options){assert.equal(path,'quota/test.json');assert.equal(options.addRandomSuffix,false);assert.equal(options.access,'private');assert.equal(options.allowOverwrite,saved!==null);assert.equal(options.ifMatch,saved===null?undefined:`"${revision}"`);saved=text;revision++;}
  };
  const store=blobQuotaStore('quota/test.json',async()=>sdk);
  await reserveQuota({store,client,cost:2});
  await reserveQuota({store,client,cost:2});
  const snapshot=await store.read();assert.equal(snapshot.state.dailyCalls,4);assert.equal(snapshot.etag,'"2"');
});

test('Blob reader bounds streamed content even without a truthful size header',async()=>{
  const store=blobQuotaStore('quota/test.json',async()=>({get:async()=>({statusCode:200,stream:stream('x'.repeat(131073)),blob:{size:0,etag:'"1"'}})}));
  await assert.rejects(store.read(),/too large/);
});

test('only actual conditional-write conflicts are retried',async()=>{
  for(const [error,etag] of [[new BlobPreconditionFailedError(),'"1"'],[new BlobError('This blob already exists.'),null]]){
    assert.equal(error.name,'Error');
    const store=blobQuotaStore('quota/test.json',async()=>({BlobPreconditionFailedError,BlobError,put:async()=>{throw error;}}));
    await assert.rejects(store.write(record,etag),e=>e.code==='QUOTA_CONFLICT');
  }
  let writes=0;
  await assert.rejects(reserveQuota({store:{read:async()=>null,write:async()=>{writes++;throw new Error('private detail');}},client,cost:2}),e=>e.status===503&&e.code==='quota_write'&&!e.message.includes('private detail'));
  assert.equal(writes,1);
});
