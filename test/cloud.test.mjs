import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudCollection,createSyncKey,deriveCollection,encryptCollection,decryptCollection,mergeCloudCollections,collectionTransport} from '../public/cloud.js';
const blank=()=>({interests:[],saved:[]});
const item=id=>({id,title:id,kind:'book',qlooType:'book',source:'Test',url:null,image:null});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function service(){const records=new Map();let fail=false,conflict=false;return {records,set offline(x){fail=x;},set conflict(x){conflict=x;},async transport(method,credentials,input){
  if(fail)throw new Error('Offline');if(!credentials)return {configured:true};const record=records.get(credentials.id);
  if(method==='PUT'&&!record&&input.expectedRevision===0){const v={token:credentials.token,revision:1,box:input.box};records.set(credentials.id,v);return structuredClone(v);}
  if(!record||credentials.token!==record.token)throw Object.assign(new Error('Not found'),{status:404});
  if(method==='GET')return structuredClone(record);
  if(conflict||input.expectedRevision!==record.revision){conflict=false;throw Object.assign(new Error('Conflict'),{status:409});}
  if(method==='DELETE'){records.delete(credentials.id);return {status:204};}
  record.box=input.box;record.revision++;return structuredClone(record);
}};}
function device(server,initial=blank(),remember=storage()){let value=structuredClone(initial);const statuses=[];const cloud=new CloudCollection({getSnapshot:()=>structuredClone(value),applySnapshot:x=>{value=structuredClone(x);},onStatus:x=>statuses.push(x),storage:remember,transport:server.transport.bind(server)});return {cloud,remember,statuses,get value(){return value;},set value(x){value=x;},close(){clearTimeout(cloud.timer);}};}
test('sync keys have independent derivations and authenticated encryption rejects wrong keys and tampering',async()=>{
  const key=createSyncKey(),a=await deriveCollection(key),b=await deriveCollection(key),other=await deriveCollection(createSyncKey());
  assert.match(key,/^fyn1_[A-Za-z0-9_-]{43}$/);assert.equal(a.id,b.id);assert.equal(a.token,b.token);assert.notEqual(a.id,a.token);assert.notEqual(a.id,other.id);assert.equal(a.cipher.extractable,false);
  const value={interests:[item('Dune')],saved:[item('Portal 2')]},first=await encryptCollection(a,value),second=await encryptCollection(a,value);
  assert.notEqual(first.iv,second.iv);assert.equal(JSON.stringify(first).includes('Dune'),false);assert.deepEqual(await decryptCollection(b,first),value);
  await assert.rejects(decryptCollection(other,first),/decrypted/);await assert.rejects(decryptCollection(a,{...first,ciphertext:(first.ciphertext[0]==='A'?'B':'A')+first.ciphertext.slice(1)}),/decrypted/);
  await assert.rejects(deriveCollection('fyn1_'+'A'.repeat(42)+'B'),/invalid/);
});
test('three-way merge combines offline additions, honors removals and rejects overflow without discarding data',()=>{
  const a=item('a'),b=item('b'),c=item('c'),base={interests:[a],saved:[a]};
  assert.deepEqual(mergeCloudCollections(base,{interests:[a,b],saved:[]},{interests:[a,c],saved:[a,c]}),{interests:[a,c,b],saved:[c]});
  const local={interests:Array.from({length:60},(_,i)=>item('local'+i)),saved:[]};
  assert.throws(()=>mergeCloudCollections(blank(),local,{interests:[item('remote')],saved:[]}),/full/);assert.equal(local.interests.length,60);
});
test('independent devices connect, merge offline additions/removals, reload and delete only the cloud copy',async()=>{
  const server=service(),a=device(server,{interests:[item('a')],saved:[item('old')]}),b=device(server,{interests:[item('b')],saved:[]});
  try{await a.cloud.init();await a.cloud.create();const key=a.cloud.key();await b.cloud.init();await b.cloud.connect(key);await a.cloud.sync();assert.deepEqual(a.value.interests.map(x=>x.id),['a','b']);
    server.offline=true;a.value.saved=[];a.value.interests.push(item('left'));await a.cloud.sync();assert.equal(a.cloud.error,true);assert.equal(a.value.interests.length,3);
    b.value.saved.push(item('new'));b.value.interests.push(item('right'));server.offline=false;await b.cloud.sync();await a.cloud.sync();await b.cloud.sync();
    assert.deepEqual(new Set(b.value.interests.map(x=>x.id)),new Set(['a','b','left','right']));assert.deepEqual(b.value.saved.map(x=>x.id),['new']);
    const reload=device(server,a.value,a.remember);try{await reload.cloud.init();assert.equal(reload.cloud.key(),key);assert.equal(reload.cloud.error,false);}finally{reload.close();}
    await a.cloud.deleteCloud();assert.equal(server.records.size,0);assert.equal(a.cloud.key(),'');assert.equal(a.value.interests.length,4);assert.equal(a.remember.getItem('find-your-next-cloud-v1'),null);
  }finally{a.close();b.close();}
});
test('revision conflicts retry, invalid keys preserve local items and storage failure leaves a visible warning',async()=>{
  const server=service(),a=device(server),b=device(server,{interests:[item('safe')],saved:[]});
  try{await a.cloud.init();await a.cloud.create();await b.cloud.init();await assert.rejects(b.cloud.connect(createSyncKey()),/Not found/);assert.equal(b.value.interests[0].id,'safe');assert.equal(b.cloud.context,null);
    a.value.saved.push(item('new'));server.conflict=true;await a.cloud.sync();assert.equal(a.cloud.error,false);assert.equal(a.cloud.context.revision,2);
    const blocked=device(server,blank(),{getItem:()=>null,setItem:()=>{throw new Error('Quota');},removeItem:()=>{}});try{await blocked.cloud.init();await blocked.cloud.connect(a.cloud.key());assert.match(blocked.statuses.at(-1).message,/could not remember/);assert.equal(blocked.statuses.at(-1).error,true);}finally{blocked.close();}
  }finally{a.close();b.close();}
});
test('changes made during initial cloud creation are queued for synchronization',async()=>{
  const server=service();let release,waiting=new Promise(resolve=>release=resolve),seen;const started=new Promise(resolve=>seen=resolve);const d=device(server);
  const original=d.cloud.transport;d.cloud.transport=async(method,c,input)=>{if(method==='PUT'){seen();await waiting;}return original(method,c,input);};
  try{await d.cloud.init();const creating=d.cloud.create();await started;d.value.saved.push(item('added-during-request'));release();await creating;assert.ok(d.cloud.timer);clearTimeout(d.cloud.timer);await d.cloud.sync();const record=[...server.records.values()][0];assert.equal((await decryptCollection(d.cloud.context.credentials,record.box)).saved[0].id,'added-during-request');}finally{release();d.close();}
});
test('transport keeps access tokens in headers, bounds requests and preserves safe conflict status',async()=>{
  let request;const transport=collectionTransport('/api/collection',async(url,options)=>{request={url,options};return new Response(JSON.stringify({error:'Changed'}),{status:409,headers:{'content-type':'application/json'}});});
  await assert.rejects(transport('GET',{id:'a'.repeat(64),token:'b'.repeat(64)}),e=>e.status===409);assert.equal(request.url.includes('b'.repeat(64)),false);assert.equal(request.options.headers.Authorization,'Bearer '+'b'.repeat(64));assert.ok(request.options.signal);
});
