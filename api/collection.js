const bad=(message,status=400)=>Object.assign(new Error(message),{status});
async function readJson(req){
  if(String(req.headers['content-type']??'').split(';')[0].trim().toLowerCase()!=='application/json')throw bad('Use JSON.',415);
  if(Number(req.headers['content-length']??0)>280000)throw bad('Collection is too large.',413);
  let parsed;try{parsed=req.body;}catch{throw bad('Invalid collection request.');}
  if(parsed!==undefined){if(Buffer.byteLength(JSON.stringify(parsed))>280000)throw bad('Collection is too large.',413);return parsed;}
  const parts=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>280000)throw bad('Collection is too large.',413);parts.push(bytes);}
  try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw bad('Invalid collection request.');}
}
export function collectionHandler(fetcher=fetch){return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const base=process.env.COLLECTION_SYNC_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
  const configured=typeof base==='string'&&/^https:\/\/[a-z0-9]{20}\.supabase\.co\/functions\/v1\/collection-sync$/.test(base)&&typeof key==='string'&&key.length>=20;
  const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');
  if(req.method==='GET'&&!id)return res.status(200).json({configured});
  if(!['GET','PUT','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
  if(!configured)return res.status(503).json({error:'Cloud collection is unavailable.'});
  const auth=req.headers.authorization;
  if(!/^[a-f0-9]{64}$/.test(id??'')||typeof auth!=='string'||!/^Bearer [a-f0-9]{64}$/.test(auth))return res.status(401).json({error:'A valid sync key is required.'});
  try{
    const input=req.method==='GET'?undefined:await readJson(req);
    if(req.method!=='GET'&&(!input||typeof input!=='object'||Array.isArray(input)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0))throw bad('Invalid collection revision.');
    const response=await fetcher(base+'?id='+id,{method:req.method,headers:{apikey:key,'X-Collection-Token':auth.slice(7),...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{}),redirect:'error',signal:AbortSignal.timeout(12000)});
    if(response.status===204){res.status(204);return res.end();}
    if(![200,201,400,401,404,409,413,415,429,503].includes(response.status))throw bad('Cloud collection could not be reached. Please retry.',502);
    const data=await response.json();return res.status(response.status).json(data);
  }catch(error){return res.status(error.status??502).json({error:error.status?error.message:'Cloud collection could not be reached. Please retry.'});}
};}
export default collectionHandler();
