import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

// These probes run against an isolated local server and never contact Qloo or catalog providers.
const port=22000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
let server;
before(async()=>{
  server=spawn(process.execPath,['src/server.mjs'],{env:{...process.env,PORT:String(port),QLOO_API_KEY:'',QLOO_PROXY_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
  await Promise.race([once(server.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Server startup timed out')),5000))]);
});
after(()=>server?.kill());

test('sensitive and traversal-like paths are not served',async()=>{
  for(const path of ['/.env','/.git/config','/src/agent.mjs','/%2e%2e%2f.env','/public/../.env']){
    const response=await fetch(base+path);assert.equal(response.status,404,path);
  }
});

test('untrusted discovery shapes and unauthorized catalog kinds fail before an upstream request',async()=>{
  const headers={'content-type':'application/json'};
  for(const body of [null,[],{seeds:[{title:'Portal 2',qlooType:'../../other'}],target:'book'},{seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'https://other.example/'}]){
    const response=await fetch(`${base}/api/discover`,{method:'POST',headers,body:JSON.stringify(body)});
    assert.equal(response.status,400);
    assert.doesNotMatch(await response.text(),/stack|QLOO_API_KEY|test-only-secret/i);
  }
  assert.equal((await fetch(`${base}/api/catalog?kind=https%3A%2F%2Fother.example&q=x`)).status,400);
});
