import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const port=21000+Math.floor(Math.random()*15000),base=`http://127.0.0.1:${port}`;let server;
before(async()=>{server=spawn(process.execPath,['src/server.mjs'],{env:{...process.env,PORT:String(port),QLOO_API_KEY:'',QLOO_PROXY_ENABLED:'false'},stdio:['ignore','pipe','pipe']});await Promise.race([once(server.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Server startup timed out')),5000))]);});
after(()=>server?.kill());
test('serves the app and reports Qloo as unavailable without a key',async()=>{const html=await fetch(base);assert.equal(html.status,200);assert.match(await html.text(),/Find Your Next/);const status=await (await fetch(`${base}/api/discover`)).json();assert.equal(status.configured,false);});
test('serves all five instrument states as SVG',async()=>{for(let count=0;count<=4;count++){const res=await fetch(`${base}/instrument/count-${count}.svg`);assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/image\/svg\+xml/);assert.match(await res.text(),/<svg/);}});
test('rejects invalid catalog categories and fails closed for Qloo',async()=>{
  assert.equal((await fetch(`${base}/api/catalog?kind=other`)).status,400);
  const res=await fetch(`${base}/api/discover`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({seeds:[{title:'Portal 2',qlooType:'videogame'}],target:'book'})});assert.equal(res.status,503);
  assert.equal((await fetch(`${base}/api/discover`,{method:'POST',body:'{}'})).status,415);
  assert.equal((await fetch(`${base}/api/discover`,{method:'POST',headers:{'content-type':'application/jsonp'},body:'{}'})).status,415);
  assert.equal((await fetch(`${base}/unknown`)).status,404);
});

test('discovery validates method, body size and JSON before attempting an upstream call',async()=>{
  assert.equal((await fetch(`${base}/api/discover`,{method:'PUT'})).status,405);
  assert.equal((await fetch(`${base}/api/catalog?kind=games`,{method:'POST'})).status,405);
  const headers={'content-type':'application/json'};
  assert.equal((await fetch(`${base}/api/discover`,{method:'POST',headers,body:'{'})).status,400);
  assert.equal((await fetch(`${base}/api/discover`,{method:'POST',headers,body:JSON.stringify({seeds:[],target:'book'})})).status,400);
  assert.equal((await fetch(`${base}/api/discover`,{method:'POST',headers,body:JSON.stringify({value:'x'.repeat(6000)})})).status,413);
  assert.equal((await fetch(`${base}/api/catalog?kind=books&q=${'x'.repeat(101)}`)).status,400);
});

test('a short catalog search returns a prompt rather than fabricated results',async()=>{
  const res=await fetch(`${base}/api/catalog?kind=books&q=x`);
  assert.equal(res.status,200);assert.deepEqual(await res.json(),{items:[],requiresQuery:true});
});
