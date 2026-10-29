import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {validateRequest,runDiscovery} from '../src/agent.mjs';

test('rejects unapproved entity types and unbounded profiles', () => {
  assert.ok(validateRequest({seeds:[{title:'Game',qlooType:'../../secret'}],target:'book'}));
  assert.ok(validateRequest({seeds:[],target:'book'}));
  assert.equal(validateRequest({seeds:[{title:'Game',qlooType:'videogame'}],target:'book'}),null);
});

test('resolves only exact favorites and returns actual Qloo entities', async () => {
  const seen=[];
  const fetcher=async url=>{const u=new URL(url);seen.push(u);
    if(u.pathname==='/search')return {ok:true,json:async()=>({results:[{entity_id:'123e4567-e89b-12d3-a456-426614174000',name:'Portal 2'},{entity_id:'123e4567-e89b-12d3-a456-426614174001',name:'Portal'}]})};
    return {ok:true,json:async()=>({results:{entities:[{entity_id:'123e4567-e89b-12d3-a456-426614174002',name:'Book Result',query:{affinity:0.8,explainability:{'signal.interests.entities':[{entity_id:'123e4567-e89b-12d3-a456-426614174000',score:0.7}]}}}]}})};
  };
  const output=await runDiscovery({seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'}, {key:'test-key',fetcher});
  assert.equal(output.items[0].title,'Book Result');
  assert.equal(output.items[0].qlooType,'book');
  assert.deepEqual(output.items[0].evidence,['Portal 2']);
  assert.deepEqual(output.resolved,['Portal 2']);
  assert.equal(seen[1].searchParams.get('filter.type'),'urn:entity:book');
  assert.equal(seen[1].searchParams.get('signal.interests.entities'),'123e4567-e89b-12d3-a456-426614174000');
});

test('does not guess when no exact Qloo match is found', async () => {
  const fetcher=async()=>({ok:true,json:async()=>({results:[{name:'Similar but not exact',entity_id:'123e4567-e89b-12d3-a456-426614174000'}]})});
  await assert.rejects(runDiscovery({seeds:[{title:'Unknown',qlooType:'book'}],target:'artist'},{key:'test-key',fetcher}),/could not match/i);
});

test('requests the selected result count and never manufactures missing provider results',async()=>{
  const seed={title:'Portal 2',qlooType:'videogame'},calls=[];
  const fetcher=async url=>{const u=new URL(url);calls.push(u);return {ok:true,json:async()=>u.pathname==='/search'?{results:[{name:'Portal 2',entity_id:'123e4567-e89b-12d3-a456-426614174000'}]}:{results:{entities:Array.from({length:30},(_,i)=>({entity_id:`123e4567-e89b-12d3-a456-${String(i+100).padStart(12,'0')}`,name:'Provider result '+i}))}}};};
  const result=await runDiscovery({seeds:[seed],target:'book',take:48},{key:'synthetic',fetcher});assert.equal(calls[1].searchParams.get('take'),'48');assert.equal(result.items.length,30);assert.equal(result.requestedCount,48);assert.equal(result.source,'Qloo');
  for(const take of [0,100,'24',null,13])assert.ok(validateRequest({seeds:[seed],target:'book',take}));
});

test('does not guess when a title matches multiple Qloo entities', async () => {
  const fetcher=async()=>({ok:true,json:async()=>({results:[
    {name:'Portal',entity_id:'123e4567-e89b-12d3-a456-426614174000'},
    {name:'Portal',entity_id:'123e4567-e89b-12d3-a456-426614174001'}
  ]})});
  await assert.rejects(runDiscovery({seeds:[{title:'Portal',qlooType:'videogame'}],target:'book'},{key:'test-key',fetcher}),/could not match/i);
});

test('uses a verified show year to distinguish same-name Qloo results',async()=>{
  const urls=[];const fetcher=async url=>{const u=new URL(url);urls.push(u);return {ok:true,json:async()=>u.pathname==='/search'?{results:[
    {name:'One Piece',entity_id:'123e4567-e89b-12d3-a456-426614174000',properties:{release_year:2023}},
    {name:'One Piece',entity_id:'123e4567-e89b-12d3-a456-426614174001',properties:{release_year:1999}}
  ]}:{results:{entities:[{name:'A Game',entity_id:'123e4567-e89b-12d3-a456-426614174002'}]}}};};
  const result=await runDiscovery({seeds:[{title:'One Piece',qlooType:'tv_show',year:1999}],target:'videogame'},{key:'test-key',fetcher});
  assert.equal(result.items[0].title,'A Game');assert.equal(urls[1].searchParams.get('signal.interests.entities'),'123e4567-e89b-12d3-a456-426614174001');
  await assert.rejects(runDiscovery({seeds:[{title:'One Piece',qlooType:'tv_show',year:2000}],target:'videogame'},{key:'test-key',fetcher}),/could not match/i);
});

test('ignores malformed and duplicate provider entities without losing valid results', async () => {
  const fetcher=async url=>({ok:true,json:async()=>new URL(url).pathname==='/search'
    ? {results:[null,{}, {name:'Portal 2',entity_id:'123e4567-e89b-12d3-a456-426614174000'}]}
    : {results:{entities:[null,{}, {entity_id:'123e4567-e89b-12d3-a456-426614174002',name:'Book Result'},
      {entity_id:'123e4567-e89b-12d3-a456-426614174002',name:'Book Result'}]}}});
  const result=await runDiscovery({seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'},{key:'test-key',fetcher});
  assert.deepEqual(result.resolved,['Portal 2']);
  assert.deepEqual(result.items.map(item=>item.title),['Book Result']);
});

test('validates interest names, profile bounds and city input', () => {
  const valid={title:'Portal 2',qlooType:'videogame'};
  assert.ok(validateRequest({target:'book',seeds:Array(5).fill(valid)}));
  assert.ok(validateRequest({target:'book',seeds:[{...valid,title:' '}]}));
  assert.ok(validateRequest({target:'book',seeds:[{...valid,title:'a'.repeat(151)}]}));
  assert.ok(validateRequest({target:'book',seeds:[{...valid,year:'1999'}]}));
  assert.ok(validateRequest({target:'place',seeds:[valid],city:'x'.repeat(101)}));
  assert.equal(validateRequest({target:'place',seeds:[valid],city:'Lahore'}),null);
});

test('partial matches omit unresolved interests and apply a place filter', async () => {
  const urls=[];
  const fetcher=async url=>{const u=new URL(url);urls.push(u);if(u.pathname==='/search')return {ok:true,json:async()=>({results:u.searchParams.get('query')==='Portal 2'?[{entity_id:'123e4567-e89b-12d3-a456-426614174000',name:'Portal 2'}]:[]})};
    return {ok:true,json:async()=>({results:{entities:[{entity_id:'123e4567-e89b-12d3-a456-426614174002',name:'A place'}]}})};};
  const output=await runDiscovery({seeds:[{title:'Portal 2',qlooType:'videogame'},{title:'Missing',qlooType:'book'}],target:'place',city:'Lahore'},{key:'test-key',fetcher});
  assert.deepEqual(output.resolved,['Portal 2']);assert.deepEqual(output.unresolved,['Missing']);
  assert.deepEqual(output.items[0].evidence,[]);
  assert.equal(urls[2].searchParams.get('filter.location.query'),'Lahore');
  assert.equal(urls[2].searchParams.get('filter.location.radius'),'0');
  assert.equal(urls[2].searchParams.get('filter.exclude.entities'),'123e4567-e89b-12d3-a456-426614174000');
  assert.ok(urls.every(url=>url.origin==='https://hackathon.api.qloo.com'));
});

test('Qloo errors do not expose provider or credential details', async () => {
  const input={seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'};
  await assert.rejects(runDiscovery(input,{key:'test-key',fetcher:async()=>({ok:false,status:429})}),error=>error.status===429&&/rate limit/i.test(error.message));
  await assert.rejects(runDiscovery(input,{key:'test-key',fetcher:async()=>({ok:false,status:401})}),error=>error.status===503&&!error.message.includes('test-key'));
  await assert.rejects(runDiscovery(input,{key:'test-key',fetcher:async()=>({ok:false,status:400})}),error=>error.status===422&&/another interest, category or city/i.test(error.message));
  await assert.rejects(runDiscovery(input,{key:'test-key',fetcher:async()=>{throw new Error('private provider details');}}),error=>error.status===502&&!error.message.includes('private provider details'));
  await assert.rejects(runDiscovery(input,{key:'test-key',fetcher:async()=>({ok:true,json:async()=>({unexpected:true})})}),error=>error.status===502&&/unexpected/i.test(error.message));
});

test('a Qloo redirect cannot forward the API key to another origin', async () => {
  let forwarded=0;
  const recipient=createServer((req,res)=>{forwarded++;res.writeHead(200,{'content-type':'application/json'});res.end('{"results":[]}');});
  recipient.listen(0,'127.0.0.1');await once(recipient,'listening');
  const redirect=createServer((req,res)=>{res.writeHead(302,{location:`http://127.0.0.1:${recipient.address().port}/capture`});res.end();});
  redirect.listen(0,'127.0.0.1');await once(redirect,'listening');
  try {
    const input={seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'};
    const fetcher=(_url,options)=>fetch(`http://127.0.0.1:${redirect.address().port}/search`,options);
    await assert.rejects(runDiscovery(input,{key:'test-only-secret',fetcher}));
    assert.equal(forwarded,0,'A redirect must never receive the API key');
  } finally {await Promise.all([new Promise(resolve=>redirect.close(resolve)),new Promise(resolve=>recipient.close(resolve))]);}
});
