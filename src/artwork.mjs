import {catalogArtworkUrl} from '../public/media.js';
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
const bytesLimit=2000000,cache=new Map(),pending=new Map();let cacheBytes=0;
function sourceUrl(value,redirect=false){
  let url;try{url=new URL(value);}catch{throw bad('Invalid artwork URL.');}
  const archive=redirect&&url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&!url.hash&&(url.hostname==='archive.org'||/^[a-z0-9-]+\.us\.archive\.org$/.test(url.hostname))&&/^\/(download\/|\d+\/items\/)/.test(url.pathname);
  if(archive)return url;
  if(!catalogArtworkUrl(url.href))throw bad('Choose artwork from a supported catalog.');
  const path=url.pathname,host=url.hostname;
  const valid=host==='static.tvmaze.com'?/^\/uploads\/images\/(medium_portrait|original_untouched)\/\d+\/\d+\.(jpg|jpeg|png|webp)$/i.test(path):host==='covers.openlibrary.org'?/^\/b\/id\/[1-9]\d{0,11}-[SML]\.(jpg|png)$/i.test(path):host==='sttc.gamersgate.com'?/^\/images\/product\/[a-z0-9-]+\/cover-\d+-[a-f0-9]+\.(jpg|png|webp)$/i.test(path):host==='images.gog-statics.com'?/^\/[a-f0-9]{16,}[a-z0-9_-]*\.(jpg|jpeg|png|webp)$/i.test(path):/^\/(store_item_assets\/)?steam\/(apps|subs|bundles)\/\d{1,12}\/[a-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(path);
  const query=[...url.searchParams].every(([key,value])=>(key==='default'&&value==='false'&&host==='covers.openlibrary.org')||(key==='t'&&/^\d{1,16}$/.test(value)));
  if(!valid||!query)throw bad('Invalid catalog artwork path.');return url;
}
export async function optimizedArtwork(value,width=320,fetcher=fetch){
  if(![320,640].includes(width))throw bad('Choose a supported artwork size.');const initial=sourceUrl(value),key=initial.href+'|'+width,cached=cache.get(key);
  if(fetcher===fetch&&cached&&Date.now()-cached.at<3600000)return cached.result;
  if(fetcher===fetch&&pending.has(key))return pending.get(key);
  if(pending.size>=8)throw bad('Artwork is busy. Please retry.',503);
  const work=async()=>{let url=initial,response;
    const signal=AbortSignal.timeout(12000);
    for(let redirects=0;redirects<=3;redirects++){
      response=await fetcher(url,{redirect:'manual',signal,headers:{Accept:'image/avif,image/webp,image/jpeg,image/png','User-Agent':'FindYourNext/0.1 (catalog artwork)'}});
      if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');await response.body?.cancel();if(!next||redirects===3)throw bad('Artwork redirect could not be used.',502);url=sourceUrl(new URL(next,url).href,true);continue;}break;
    }
    if(!response.ok||!/^image\/(jpeg|png|webp|avif|gif)(;|$)/i.test(response.headers.get('content-type')||''))throw bad('Catalog artwork is unavailable.',502);
    if(Number(response.headers.get('content-length')||0)>bytesLimit){await response.body?.cancel();throw bad('Artwork exceeds the size limit.',413);}
    let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.byteLength;if(size>bytesLimit)throw bad('Artwork exceeds the size limit.',413);chunks.push(Buffer.from(chunk));}
    const input=Buffer.concat(chunks),{default:sharp}=await import('sharp'),image=sharp(input,{limitInputPixels:16000000,failOn:'warning',pages:1});const metadata=await image.metadata();
    if(!['jpeg','png','webp','avif','gif','heif'].includes(metadata.format)||metadata.width<=1||metadata.height<=1)throw bad('Catalog artwork is unavailable.',502);
    const buffer=await image.resize({width,height:width*2,fit:'inside',withoutEnlargement:true}).webp({quality:78,effort:4}).toBuffer();const result={buffer,type:'image/webp'};
    if(fetcher===fetch){if(cache.has(key))cacheBytes-=cache.get(key).result.buffer.byteLength;cache.set(key,{at:Date.now(),result});cacheBytes+=buffer.byteLength;while(cacheBytes>16000000||cache.size>120){const first=cache.keys().next().value;cacheBytes-=cache.get(first).result.buffer.byteLength;cache.delete(first);}}
    return result;
  };
  const promise=work();if(fetcher===fetch)pending.set(key,promise);try{return await promise;}finally{if(fetcher===fetch)pending.delete(key);}
}
