import {normalizeName} from '../public/core.js';
const TYPES=new Set(['tv_show','movie','videogame','artist','book','podcast','person','place','destination','brand']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=(message,status=502)=>Object.assign(new Error(message),{status});
export function validateRequest(input) {
  if(!input||!TYPES.has(input.target)||!Array.isArray(input.seeds)||input.seeds.length<1||input.seeds.length>4)return 'Select one to four interests and a valid category.';
  if(!input.seeds.every(s=>typeof s?.title==='string'&&s.title.trim().length>=2&&s.title.length<=150&&TYPES.has(s.qlooType)&&(s.year===undefined||(Number.isInteger(s.year)&&s.year>=1800&&s.year<=2100))))return 'An interest has an invalid name, category or year.';
  if(input.city!==undefined && (typeof input.city!=='string'||input.city.length>100))return 'Enter a city under 100 characters.';
  if(input.take!==undefined&&![12,24,48].includes(input.take))return 'Choose 12, 24 or 48 suggestions.';
  return null;
}
async function get(path,params,opts={}) {
  const key=opts.key??process.env.QLOO_API_KEY;if(!key)throw fail('Qloo is not connected yet.',503);
  const url=new URL(path,'https://hackathon.api.qloo.com');for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
  let response;try {response=await (opts.fetcher??fetch)(url,{headers:{'X-Api-Key':key,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw fail('Qloo could not be reached. Try again.');}
  if(response.status===429)throw fail('Qloo is rate limiting requests. Please wait and retry.',429);
  if(response.status===401||response.status===403)throw fail('Qloo rejected the configured key.',503);
  if(response.status===400)throw fail('Qloo could not use this combination. Try another interest, category or city.',422);
  if(!response.ok)throw fail('Qloo could not complete this request.');
  try{return await response.json();}catch{throw fail('Qloo returned an unreadable response.');}
}
export async function runDiscovery(input,opts={}) {
  const error=validateRequest(input);if(error)throw fail(error,400);
  const resolved=[],unresolved=[];
  for(const seed of input.seeds){
    const data=await get('/search',{query:seed.title.trim(),types:`urn:entity:${seed.qlooType}`,take:8},opts);
    const items=Array.isArray(data?.results)?data.results:data?.results?.entities;
    if(!Array.isArray(items))throw fail('Qloo returned an unexpected search response.');
    const matches=items.filter(x=>UUID.test(x?.entity_id??'')&&typeof x?.name==='string'&&normalizeName(x.name)===normalizeName(seed.title)&&(seed.year===undefined||x.properties?.release_year===seed.year));
    const unique=new Map(matches.map(x=>[x.entity_id.toLowerCase(),x]));
    if(unique.size===1){const match=[...unique.values()][0];resolved.push({id:match.entity_id,name:seed.year?`${match.name} (${seed.year})`:match.name});}else unresolved.push(seed.title);
  }
  if(!resolved.length)throw fail('Qloo could not match these interests exactly. For shows with several versions, add one from the catalog with its year.',422);
  const ids=[...new Set(resolved.map(x=>x.id))];
  const take=input.take??24;
  const params={'filter.type':`urn:entity:${input.target}`,'signal.interests.entities':ids.join(','),'filter.exclude.entities':ids.join(','),'feature.explainability':'true',take};
  if(input.target==='place'&&input.city?.trim()){params['filter.location.query']=input.city.trim();params['filter.location.radius']='0';}
  const data=await get('/v2/insights',params,opts);if(!Array.isArray(data?.results?.entities))throw fail('Qloo returned an unexpected insights response.');
  const sourceNames=new Map(resolved.map(x=>[x.id.toLowerCase(),x.name]));
  const valid=new Map();
  for(const x of data.results.entities){if(UUID.test(x?.entity_id??'')&&typeof x?.name==='string'&&x.name.trim()&&!valid.has(x.entity_id.toLowerCase()))valid.set(x.entity_id.toLowerCase(),x);}
  return {source:'Qloo',requestedCount:take,resolved:resolved.map(x=>x.name),unresolved,items:[...valid.values()].slice(0,take).map(x=>{
    const raw=x.query?.explainability?.['signal.interests.entities'];
    const evidence=Array.isArray(raw)?[...new Set(raw.map(e=>sourceNames.get(String(e?.entity_id??'').toLowerCase())).filter(Boolean))]:[];
    return {id:`qloo:${x.entity_id}`,title:x.name.slice(0,160),kind:input.target,qlooType:input.target,source:'Qloo',image:null,url:null,
      detail:'Qloo taste association · availability not verified',evidence};
  })};
}
