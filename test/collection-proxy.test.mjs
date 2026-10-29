import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {collectionHandler} from '../api/collection.js';
const previous={url:process.env.COLLECTION_SYNC_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY};
process.env.COLLECTION_SYNC_URL='https://'+'a'.repeat(20)+'.supabase.co/functions/v1/collection-sync';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_only_not_a_real_key';
after(()=>{for(const [key,value] of [['COLLECTION_SYNC_URL',previous.url],['SUPABASE_PUBLISHABLE_KEY',previous.key]])if(value===undefined)delete process.env[key];else process.env[key]=value;});
async function call(method,{id='a'.repeat(64),auth='Bearer '+'b'.repeat(64),body,contentType='application/json',fetcher=()=>{throw new Error('Unexpected upstream');}}={}){
  const req=Readable.from(body===undefined?[]:[typeof body==='string'?body:JSON.stringify(body)]);Object.assign(req,{method,url:'/api/collection'+(id===null?'':'?id='+id),headers:{authorization:auth,'content-type':contentType}});
  const res={headers:{},code:200,setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;},end(){return this;}};await collectionHandler(fetcher)(req,res);return res;
}
test('collection proxy reveals only configuration and rejects methods, credentials, malformed and oversized requests',async()=>{
  assert.deepEqual((await call('GET',{id:null})).body,{configured:true});assert.equal((await call('POST')).code,405);assert.equal((await call('GET',{id:'../x'})).code,401);assert.equal((await call('GET',{auth:'Bearer wrong'})).code,401);
  for(const body of ['null','[]','{',{}, {expectedRevision:-1},{expectedRevision:1.5}])assert.equal((await call('PUT',{body})).code,400);
  assert.equal((await call('PUT',{body:{expectedRevision:0},contentType:'text/plain'})).code,415);assert.equal((await call('PUT',{body:'x'.repeat(280001)})).code,413);
});
test('collection proxy converts a platform body-parser exception to a safe client error',async()=>{const req={method:'PUT',url:'/api/collection?id='+'a'.repeat(64),headers:{authorization:'Bearer '+'b'.repeat(64),'content-type':'application/json'}};Object.defineProperty(req,'body',{get(){throw new SyntaxError('Private parser details');}});const res={setHeader(){},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};await collectionHandler(()=>{throw Error('Unexpected upstream');})(req,res);assert.equal(res.code,400);assert.equal(res.body.error,'Invalid collection request.');});
test('collection proxy uses a fixed trusted endpoint, forwards only the public key and capability, and refuses redirects',async()=>{
  let seen;const response=await call('PUT',{body:{expectedRevision:0,box:{v:1}},fetcher:async(url,options)=>{seen={url,options};return new Response(JSON.stringify({revision:1}),{status:201,headers:{'content-type':'application/json'}});}});
  assert.equal(response.code,201);assert.equal(seen.url,process.env.COLLECTION_SYNC_URL+'?id='+'a'.repeat(64));assert.equal(seen.options.headers['X-Collection-Token'],'b'.repeat(64));assert.equal(seen.options.headers.Authorization,undefined);assert.equal(seen.options.redirect,'error');assert.equal(response.headers['Cache-Control'],'no-store');
  const failed=await call('GET',{fetcher:()=>{throw new Error('raw secret upstream failure');}});assert.equal(failed.code,502);assert.equal(JSON.stringify(failed.body).includes('secret'),false);
  const unexpected=await call('GET',{fetcher:async()=>new Response('private raw error',{status:500})});assert.equal(unexpected.code,502);assert.equal(JSON.stringify(unexpected.body).includes('private'),false);
});
