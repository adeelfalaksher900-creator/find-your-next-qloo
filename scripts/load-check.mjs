// A bounded local smoke load test. It does not call third-party catalogs or Qloo.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';

const port=23000+Math.floor(Math.random()*12000);
const base=`http://127.0.0.1:${port}`;
const total=600, concurrency=20;
const targets=[['/',200],['/api/discover',200],['/api/catalog?kind=books&q=x',200]];
const child=spawn(process.execPath,['src/server.mjs'],{
  env:{...process.env,PORT:String(port),QLOO_API_KEY:'',QLOO_PROXY_ENABLED:'false'},
  stdio:['ignore','pipe','pipe']
});
const started=once(child.stdout,'data');
try {
  await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Local server did not start')),5000))]);
  const durations=[],statuses={};let next=0,failed=0;
  const begin=performance.now();
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(true){
      const id=next++;if(id>=total)break;
      const [path,expected]=targets[id%targets.length],at=performance.now();
      try {
        const response=await fetch(base+path,{signal:AbortSignal.timeout(5000)});
        await response.arrayBuffer();statuses[response.status]=(statuses[response.status]??0)+1;
        if(response.status!==expected)failed++;
      } catch {failed++;statuses.network_error=(statuses.network_error??0)+1;}
      durations.push(performance.now()-at);
    }
  }));
  const elapsed=(performance.now()-begin)/1000;durations.sort((a,b)=>a-b);
  const percentile=p=>Number(durations[Math.min(durations.length-1,Math.ceil(p*durations.length)-1)].toFixed(2));
  console.log(JSON.stringify({scope:'local single process, no external providers',total,concurrency,failed,statuses,seconds:Number(elapsed.toFixed(2)),requestsPerSecond:Number((total/elapsed).toFixed(1)),latencyMs:{p50:percentile(.5),p95:percentile(.95),p99:percentile(.99)}},null,2));
  if(failed)process.exitCode=1;
} finally {child.kill();}
