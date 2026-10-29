import {validateRequest,runDiscovery} from '../src/agent.mjs';
import {reserveQuota,clientFingerprint} from '../src/quota.mjs';
import {blobQuotaStore} from '../src/blob-quota.mjs';
const configured=()=>Boolean(process.env.QLOO_API_KEY&&process.env.QLOO_PROXY_ENABLED==='true'&&process.env.BLOB_READ_WRITE_TOKEN&&process.env.RATE_LIMIT_SALT?.length>=32);
async function readBody(req){
  if(Number(req.headers['content-length']??0)>5000)throw Object.assign(new Error('Request too large.'),{status:413});
  if(req.body&&typeof req.body==='object'){if(JSON.stringify(req.body).length>5000)throw Object.assign(new Error('Request too large.'),{status:413});return req.body;}
  let data='';for await(const chunk of req){data+=chunk;if(data.length>5000)throw Object.assign(new Error('Request too large.'),{status:413});}try{return JSON.parse(data);}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}
}
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  if(req.method==='GET')return res.status(200).json({configured:configured()});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(String(req.headers['content-type']??'').split(';',1)[0].trim().toLowerCase()!=='application/json')return res.status(415).json({error:'Use JSON.'});
  try{const body=await readBody(req),error=validateRequest(body);if(error)return res.status(400).json({error});
    if(!configured())return res.status(503).json({error:'Qloo discovery is not connected yet.'});
    const address=req.headers['x-vercel-forwarded-for'];
    const client=clientFingerprint(address,process.env.RATE_LIMIT_SALT);
    await reserveQuota({store:blobQuotaStore(),client,cost:body.seeds.length+1});
    return res.status(200).json(await runDiscovery(body));
  }catch(error){return res.status(error.status??500).json({error:error.status?error.message:'Discovery failed. Please retry.'});}
}
