import {validateRequest,runDiscovery} from '../src/agent.mjs';
import {reserveQuota,clientFingerprint,trustedClientAddress} from '../src/quota.mjs';
import {blobQuotaStore} from '../src/blob-quota.mjs';
const configured=()=>Boolean(process.env.QLOO_API_KEY&&process.env.QLOO_PROXY_ENABLED==='true'&&process.env.BLOB_READ_WRITE_TOKEN&&process.env.RATE_LIMIT_SALT?.length>=32);
async function readBody(req){
  if(Number(req.headers['content-length']??0)>5000)throw Object.assign(new Error('Request too large.'),{status:413});
  let parsed;try{parsed=req.body;}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}
  if(parsed!==undefined){if(Buffer.byteLength(JSON.stringify(parsed))>5000)throw Object.assign(new Error('Request too large.'),{status:413});return parsed;}
  const chunks=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>5000)throw Object.assign(new Error('Request too large.'),{status:413});chunks.push(bytes);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}
}
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  if(req.method==='GET')return res.status(200).json({configured:configured()});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(String(req.headers['content-type']??'').split(';',1)[0].trim().toLowerCase()!=='application/json')return res.status(415).json({error:'Use JSON.'});
  try{const body=await readBody(req),error=validateRequest(body);if(error)return res.status(400).json({error});
    if(!configured())return res.status(503).json({error:'Qloo discovery is not connected yet.'});
    const address=trustedClientAddress(req.headers,process.env.VERCEL==='1');
    const client=clientFingerprint(address,process.env.RATE_LIMIT_SALT);
    await reserveQuota({store:blobQuotaStore(),client,cost:body.seeds.length+1});
    return res.status(200).json(await runDiscovery(body));
  }catch(error){
    // Fixed codes only: never log a request, key, address or stored quota state.
    if(['quota_configuration','quota_fingerprint','quota_read','quota_state','quota_write','quota_contention'].includes(error.code))console.warn('fyn_discovery',error.code);
    return res.status(error.status??500).json({error:error.status?error.message:'Discovery failed. Please retry.'});
  }
}
