// Explicit opt-in: creates and removes one synthetic encrypted collection only.
import assert from 'node:assert/strict';
import {createSyncKey,deriveCollection,encryptCollection,decryptCollection} from '../public/cloud.js';
if(process.env.FYN_CLOUD_LIVE!=='yes')throw new Error('Set FYN_CLOUD_LIVE=yes to run the bounded live cloud check.');
const base=process.env.COLLECTION_SYNC_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/functions\/v1\/collection-sync$/.test(base??'')||!key)throw new Error('Cloud configuration is required.');
const c=await deriveCollection(createSyncKey());let revision=0;
const value={interests:[{id:'manual:book:cloud verification',title:'Synthetic cloud verification',kind:'book',qlooType:'book',source:'Your entry',url:null,image:null}],saved:[]};
async function request(method,input,token=c.token){const res=await fetch(base+'?id='+c.id,{method,headers:{apikey:key,'x-collection-token':token,...(input?{'content-type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});const data=res.status===204?null:await res.json();return {status:res.status,data};}
try{
  const box=await encryptCollection(c,value);assert.equal(JSON.stringify(box).includes(value.interests[0].title),false);
  const created=await request('PUT',{expectedRevision:0,box});assert.equal(created.status,201,JSON.stringify(created.data));revision=created.data.revision;assert.equal(revision,1);
  const loaded=await request('GET');assert.equal(loaded.status,200);assert.deepEqual(await decryptCollection(c,loaded.data.box),value);
  assert.equal((await request('GET',undefined,'0'.repeat(64))).status,404);
  assert.equal((await request('PUT',{expectedRevision:0,box})).status,409);
  assert.equal((await request('DELETE',{expectedRevision:0})).status,409);
  assert.equal((await request('PUT',{expectedRevision:revision,box:{v:1,iv:'bad',ciphertext:'bad'}})).status,400);
  assert.equal((await request('PUT',{expectedRevision:revision,box:{...box,v:'1'}})).status,400);
  const next={interests:value.interests,saved:[value.interests[0]]};const updated=await request('PUT',{expectedRevision:revision,box:await encryptCollection(c,next)});assert.equal(updated.status,200);revision=updated.data.revision;assert.equal(revision,2);assert.deepEqual(await decryptCollection(c,updated.data.box),next);
  const origin=new URL(base).origin;
  const table=await fetch(origin+'/rest/v1/collection_vaults?select=id',{headers:{apikey:key},redirect:'error'});assert.equal(table.status,401);
  const rpc=await fetch(origin+'/rest/v1/rpc/collection_exchange',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({p_id:c.id,p_token_hash:'0'.repeat(64),p_action:'get'}),redirect:'error'});assert.equal(rpc.status,401);
  console.log('PASS live encrypted create/read/update, wrong-token denial, stale-write/delete conflict, envelope validation, anonymous table/RPC denial');
}finally{
  if(revision){const current=await request('GET');if(current.status===200){const removed=await request('DELETE',{expectedRevision:current.data.revision});assert.equal(removed.status,204);assert.equal((await request('GET')).status,404);console.log('PASS synthetic cloud collection deleted; no user records touched');}}
}
