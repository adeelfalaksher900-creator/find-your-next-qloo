const IMAGE_HOSTS = new Set(['static.tvmaze.com','covers.openlibrary.org','shared.fastly.steamstatic.com','cdn.cloudflare.steamstatic.com','images.gog-statics.com','cdn.akamai.steamstatic.com']);
const safeImage = value => {try {const u=new URL(value);return u.protocol==='https:'&&IMAGE_HOSTS.has(u.hostname)?u.href:null;} catch {return null;}};
const clean = (value, max=180) => typeof value==='string' ? value.trim().slice(0,max) : '';
const failure = (message,status=502) => Object.assign(new Error(message),{status});
const cache = new Map();
async function request(url, opts={}) {
  const key=url.toString(), cached=cache.get(key);
  if (!opts.fetcher && cached && Date.now()-cached.at<180000) return cached.data;
  let response;
  try {response=await (opts.fetcher ?? fetch)(url,{headers:{Accept:'application/json','User-Agent':'FindYourNext/0.1 (cross-category discovery project)'},signal:AbortSignal.timeout(12000)});}
  catch {throw failure('The source could not be reached. Please try again.');}
  if (response.status===429) throw failure('The source is rate limiting requests. Please wait and try again.',429);
  if (!response.ok) throw failure('The source could not complete this request.');
  let data;try {data=await response.json();}catch{throw failure('The source returned an unreadable response.');}
  if(!opts.fetcher){cache.set(key,{at:Date.now(),data});if(cache.size>100)cache.delete(cache.keys().next().value);}
  return data;
}
function tvmazeUrl(value) {try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.tvmaze.com'?u.href:null;}catch{return null;}}

export async function getCatalog(kind, query, opts={}) {
  const q=clean(query,100);
  if (!['anime','games','books','shows'].includes(kind)) throw failure('Choose a supported catalog.',400);
  if (kind!=='games' && q.length<2) return {items:[],requiresQuery:true};
  if (kind==='anime'||kind==='shows') {
    const url=new URL('https://api.tvmaze.com/search/shows');url.searchParams.set('q',q);
    const rows=await request(url,opts);if(!Array.isArray(rows))throw failure('TVmaze returned an unexpected response.');
    return {items:rows.map(x=>x.show).filter(x=>x?.name && (kind!=='anime'||x.genres?.includes('Anime'))).slice(0,12).map(x=>({
      id:`tvmaze:${x.id}`,title:clean(x.name),kind:kind==='anime'?'anime':'show',qlooType:'tv_show',source:'TVmaze',image:safeImage(x.image?.original)??safeImage(x.image?.medium),imageFallback:safeImage(x.image?.medium),url:tvmazeUrl(x.url),year:/^(18\d\d|19\d\d|20\d\d|2100)-/.test(x.premiered??'')?Number(x.premiered.slice(0,4)):null,
      detail:[...(Array.isArray(x.genres)?x.genres.slice(0,2):[]),x.premiered?.slice(0,4)].filter(Boolean).join(' · ')
    }))};
  }
  if (kind==='books') {
    const url=new URL('https://openlibrary.org/search.json');url.searchParams.set('q',q);url.searchParams.set('limit','12');url.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i');
    const data=await request(url,opts);if(!Array.isArray(data.docs))throw failure('Open Library returned an unexpected response.');
    return {items:data.docs.filter(x=>x.title && /^\/works\/OL[0-9]+W$/.test(x.key??'')).slice(0,12).map(x=>({
      id:`openlibrary:${x.key}`,title:clean(x.title),kind:'book',qlooType:'book',source:'Open Library',image:Number.isInteger(x.cover_i)&&x.cover_i>0?`https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`:null,imageFallback:Number.isInteger(x.cover_i)&&x.cover_i>0?`https://covers.openlibrary.org/b/id/${x.cover_i}-M.jpg`:null,url:`https://openlibrary.org${x.key}`,
      detail:[x.author_name?.[0],x.first_publish_year].filter(Boolean).join(' · ')
    }))};
  }
  const url=new URL('https://www.cheapshark.com/api/1.0/deals');url.searchParams.set('pageSize','12');url.searchParams.set('sortBy','DealRating');if(q)url.searchParams.set('title',q);
  const rows=await request(url,opts);if(!Array.isArray(rows))throw failure('CheapShark returned an unexpected response.');
  const offers=rows.filter(x=>x.title&&x.dealID).slice(0,12).map(x=>{
    let deal=x.dealID;try{deal=decodeURIComponent(deal);}catch{}const redirect=new URL('https://www.cheapshark.com/redirect');redirect.searchParams.set('dealID',deal);
    const thumb=safeImage(x.thumb);
    const thumbId=thumb?new URL(thumb).pathname.match(/\/steam\/apps\/(\d{1,12})(?:\/|$)/)?.[1]:null;
    const suppliedId=String(x.steamAppID??'');const steamId=/^\d{1,12}$/.test(suppliedId)?suppliedId:thumbId;
    const image=steamId?`https://cdn.cloudflare.steamstatic.com/steam/apps/${steamId}/header.jpg`:thumb;
    const heroImage=steamId?`https://cdn.cloudflare.steamstatic.com/steam/apps/${steamId}/library_hero.jpg`:null;
    const price=/^\d+(\.\d{1,2})?$/.test(String(x.salePrice??''))?Number(x.salePrice):NaN;return {id:`cheapshark:${String(x.gameID||x.dealID).slice(0,100)}`,title:clean(x.title),kind:'game',qlooType:'videogame',source:'CheapShark',image,imageFallback:thumb,heroImage,url:redirect.href,
      detail:'PC game · USD · price may change',price:Number.isFinite(price)&&price>=0?price.toFixed(2):null};
  });
  const unique=new Map();for(const offer of offers){const old=unique.get(offer.id);if(!old||(offer.price!==null&&(old.price===null||Number(offer.price)<Number(old.price))))unique.set(offer.id,offer);}
  return {items:[...unique.values()]};
}
