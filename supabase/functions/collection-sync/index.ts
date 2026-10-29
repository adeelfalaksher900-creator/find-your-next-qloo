// Capability authentication is performed by the function and private RPC.
// The recovery/encryption key is never sent to this service.
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(status:number,body:unknown)=>new Response(status===204?null:JSON.stringify(body),{status,headers});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function body(req:Request){
  if(Number(req.headers.get('content-length')||0)>280000)throw new Error('size');
  const reader=req.body?.getReader();if(!reader)throw new Error('body');let size=0;const chunks:Uint8Array[]=[];
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>280000){await reader.cancel();throw new Error('size');}chunks.push(part.value);}
  const all=new Uint8Array(size);let at=0;for(const chunk of chunks){all.set(chunk,at);at+=chunk.length;}return JSON.parse(new TextDecoder().decode(all));
}
Deno.serve(async(req:Request)=>{
  if(!['GET','PUT','DELETE'].includes(req.method))return reply(405,{error:'Method not allowed.'});
  const id=new URL(req.url).searchParams.get('id')||'',token=req.headers.get('x-collection-token')||'';
  if(!/^[a-f0-9]{64}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))return reply(401,{error:'A valid sync key is required.'});
  let input:any={expectedRevision:0};
  if(req.method!=='GET'){
    if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply(415,{error:'Use JSON.'});
    try{input=await body(req);}catch{return reply(400,{error:'Invalid collection request.'});}
    if(!input||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)return reply(400,{error:'Invalid collection revision.'});
  }
  try{
    const modern=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
    const key=modern||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const url=Deno.env.get('SUPABASE_URL');if(!key||!url)return reply(503,{error:'Cloud collection is unavailable.'});
    const tokenHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
    const response=await fetch(url+'/rest/v1/rpc/collection_exchange',{method:'POST',headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key}),'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_token_hash:tokenHash,p_action:req.method.toLowerCase(),p_expected:input.expectedRevision,p_payload:input.box??null}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)return reply(503,{error:'Cloud collection is temporarily unavailable.'});
    const result=await response.json(),{status,...data}=result;if(![200,201,204,400,404,409,429].includes(status))return reply(503,{error:'Cloud collection is unavailable.'});
    return reply(status,data);
  }catch{return reply(503,{error:'Cloud collection could not be reached. Try again later.'});}
});
