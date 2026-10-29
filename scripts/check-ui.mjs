// Run isolated fixture journeys; no Qloo key or provider quota is used.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const port=23000+Math.floor(Math.random()*10000);
const env={...process.env,PORT:String(port),FYN_BASE_URL:`http://127.0.0.1:${port}/`,QLOO_API_KEY:'',QLOO_PROXY_ENABLED:'false'};
const server=spawn(process.execPath,['src/server.mjs'],{env,stdio:['ignore','pipe','inherit']});
try{
  await Promise.race([once(server.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Local server did not start')),5000))]);
  for(const script of ['browser-check.cjs','accessibility-check.cjs']){
    const child=spawn(process.execPath,['scripts/'+script],{env,stdio:'inherit'});
    const [code]=await once(child,'exit');if(code!==0)throw new Error(script+' failed');
  }
}finally{server.kill();}
