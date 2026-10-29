export const normalizeName = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function commonGames(groups) {
  if (!Array.isArray(groups) || groups.length < 2 || groups.some(g => !Array.isArray(g))) return [];
  const first = new Map();
  for (const title of groups[0]) { const key=normalizeName(title); if(key && !first.has(key)) first.set(key,String(title).trim()); }
  for (const group of groups.slice(1)) {const values=new Set(group.map(normalizeName));for (const key of first.keys()) if(!values.has(key)) first.delete(key);}
  return [...first.values()];
}
export function summarizePlaytime(values) {
  const parsed=[];
  for(const value of values){
    const text=String(value??'').trim();
    if(!text){parsed.push(null);continue;}
    if(!/^\d+$/.test(text)||Number(text)<1||Number(text)>1440)return {minutes:null,error:'Enter a whole number between 1 and 1440 minutes, or leave the field empty.'};
    parsed.push(Number(text));
  }
  return {minutes:parsed.length&&parsed.every(x=>x!==null)?Math.min(...parsed):null,error:null};
}
export function createLatestGate() {
  let generation=0;
  return {begin(){const mine=++generation;return ()=>mine===generation;}};
}
// Share only concurrent identical requests; settled results are not retained here.
export function createInFlightPool() {
  const pending=new Map();
  return {run(key,work){
    if(pending.has(key))return pending.get(key);
    const result=Promise.resolve().then(work);
    pending.set(key,result);
    result.then(()=>pending.delete(key),()=>pending.delete(key));
    return result;
  }};
}
export async function checkDiscoveryAvailability(fetcher=fetch,timeoutMs=5000) {
  try{
    const response=await fetcher('/api/discover',{signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok)return false;
    return (await response.json()).configured===true;
  }catch{return false;}
}
export function mergeInterests(current, item) {
  if (!item?.id || current.some(existing => existing.id === item.id)) return current;
  return [...current,item].slice(0,60);
}
// Portable files move a collection manually; they do not provide account sync.
export function parseCollectionFile(text) {
  if (typeof text!=='string'||text.length>200000) throw new Error('The file is too large. Choose a collection under 200 KB.');
  let value;try{value=JSON.parse(text);}catch{throw new Error('This file is not a valid collection.');}
  if (!value||typeof value!=='object'||Array.isArray(value)||value.format!=='find-your-next'||value.version!==1) throw new Error('This collection format is not supported.');
  if (!Array.isArray(value.interests)||!Array.isArray(value.saved)||value.interests.length>120||value.saved.length>120) throw new Error('The collection lists are invalid or too large.');
  return {interests:value.interests,saved:value.saved};
}
export function mergeCollection(current, imported, sanitize) {
  const result={interests:[...current.interests],saved:[...current.saved],added:0,invalid:0,overflow:0};
  for(const field of ['interests','saved']) for(const candidate of imported[field]){
    const item=sanitize(candidate);
    if(!item?.id){result.invalid++;continue;}
    if(result[field].some(existing=>existing.id===item.id))continue;
    if(result[field].length>=60){result.overflow++;continue;}
    result[field].push(item);result.added++;
  }
  return result;
}
// Use compact 210px covers for thumbnails, including high-density phones.
// Larger presentation surfaces retain the original artwork.
export function chooseArtwork(item, cssWidth, pixelRatio=1) {
  const width=Number(cssWidth);
  if(item.source==='TVmaze'&&item.imageFallback?.includes('/medium_portrait/')&&width>0&&width<=200)return item.imageFallback;
  return item.image;
}
export function selectionSummary(count) {
  const value=Math.max(0,Math.floor(Number(count)||0));
  return {frame:Math.min(value,4),label:value>4?`${value} selected · choose no more than 4`:`${value} of 4 interests selected`,valid:value>=1&&value<=4};
}
export function createManualInterest(title,type) {
  const types=new Set(['tv_show','movie','videogame','artist','book','podcast','person','place','destination','brand']);
  if(typeof title!=='string'||!types.has(type))return null;
  const cleaned=title.trim(), normalized=normalizeName(cleaned);
  if(cleaned.length<2||cleaned.length>150||normalized.length<2)return null;
  return {id:`manual:${type}:${normalized}`,title:cleaned,kind:type,qlooType:type,source:'Your entry',detail:'Added by you',url:null,image:null,price:null};
}
