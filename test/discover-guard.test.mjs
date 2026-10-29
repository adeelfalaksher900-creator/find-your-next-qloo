import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/discover.js';

function response(){return {code:200,body:null,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
const body={seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'};
const keys=['QLOO_API_KEY','QLOO_PROXY_ENABLED','BLOB_READ_WRITE_TOKEN','RATE_LIMIT_SALT'];
test('discovery fails closed before provider calls without complete quota configuration',async()=>{
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Unexpected network call');};
  try{
    process.env.QLOO_API_KEY='test-key';process.env.QLOO_PROXY_ENABLED='true';delete process.env.BLOB_READ_WRITE_TOKEN;process.env.RATE_LIMIT_SALT='a'.repeat(40);
    let res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.body.configured,false);
    res=response();await handler({method:'POST',headers:{'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.10'},body},res);assert.equal(res.code,503);
    process.env.BLOB_READ_WRITE_TOKEN='test-token';process.env.RATE_LIMIT_SALT='short';
    res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.body.configured,false);
    process.env.RATE_LIMIT_SALT='a'.repeat(40);
    res=response();await handler({method:'POST',headers:{'content-type':'application/json','x-vercel-forwarded-for':'not-an-ip'},body},res);assert.equal(res.code,503);
    assert.equal(calls,0);
  }finally{globalThis.fetch=originalFetch;for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
