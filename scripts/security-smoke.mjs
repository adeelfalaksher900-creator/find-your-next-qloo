// Bounded owner-authorized checks. Invalid discovery requests do not call Qloo.
import assert from 'node:assert/strict';
const base=new URL(process.env.FYN_BASE_URL||'http://127.0.0.1:3000/');
if(!['localhost','127.0.0.1'].includes(base.hostname)&&process.env.FYN_SECURITY_LIVE!=='yes')throw new Error('Set FYN_SECURITY_LIVE=yes for the explicitly authorized live target.');
if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('Live checks require HTTPS.');
let checks=0;
async function check(path,status,options={}){const res=await fetch(new URL(path,base),{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(res.status,status,path+' unexpected HTTP status');checks++;return res;}
const root=await check('/',200),html=await root.text();
await Promise.all(['/.env','/.git/config','/package.json','/src/agent.mjs','/supabase/schema.sql','/scripts/verify-qloo.mjs'].map(path=>check(path,404)));
const json={'content-type':'application/json'},discovery='/api/discover',collection='/api/collection';
await check('/api/artwork?url=http%3A%2F%2F127.0.0.1%2Fprivate',400);await check('/api/artwork',405,{method:'POST'});await check(discovery,405,{method:'PUT'});await check('/api/catalog?kind=games',405,{method:'POST'});await check(collection,405,{method:'POST'});
await check(discovery,415,{method:'POST',headers:{'content-type':'text/plain'},body:'{}'});
await Promise.all(['{','null','[]',JSON.stringify({target:'../../internal',seeds:[]}),JSON.stringify({target:'book',seeds:Array(5).fill({title:'Portal 2',qlooType:'videogame'})}),JSON.stringify({target:'book',seeds:[{title:'x'.repeat(151),qlooType:'videogame'}]}),JSON.stringify({target:'book',take:999,seeds:[{title:'Portal 2',qlooType:'videogame'}]})].map(body=>check(discovery,400,{method:'POST',headers:json,body})));
await check(discovery,413,{method:'POST',headers:json,body:JSON.stringify({oversized:'x'.repeat(5100)})});
await check('/api/catalog?kind=../../internal',400);await check('/api/catalog?kind=books&q='+('x'.repeat(101)),400);await check('/api/catalog?kind=books&q=Dune&page=21',400);
await check(collection+'?id=invalid',401);await check(collection+'?id='+'a'.repeat(64),401,{method:'PUT',headers:json,body:'{"expectedRevision":0}'});
const cross=await check(collection,405,{method:'OPTIONS',headers:{Origin:'https://untrusted.invalid','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(cross.headers.get('access-control-allow-origin'),null);
const configured=await check(discovery,200);assert.deepEqual(Object.keys(await configured.json()),['configured']);assert.equal(configured.headers.get('cache-control'),'no-store');
if(base.protocol==='https:'){const policy=root.headers.get('content-security-policy');for(const directive of ["script-src 'self'","object-src 'none'","frame-ancestors 'none'","connect-src 'self'"])assert.ok(policy?.includes(directive),'missing '+directive);assert.equal(root.headers.get('x-content-type-options'),'nosniff');assert.ok(root.headers.get('strict-transport-security'));}
const client=await (await check('/app.js',200)).text(),cloud=await (await check('/cloud.js',200)).text();for(const text of [html,client,cloud])assert.equal(/sb_secret_[A-Za-z0-9_-]{20,}|vercel_blob_rw_[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text),false);
console.log(JSON.stringify({checks,passed:true,scope:'source exposure, malformed and oversized input, unsupported methods, result-count bounds, capability admission, cross-origin preflight, public credential-pattern scan, production headers',qlooProviderCalls:0,limitations:'Bounded checks; not an independent comprehensive penetration test.'},null,2));
