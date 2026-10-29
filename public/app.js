import {catalogArtworkUrl as allowedImage,optimizedArtworkUrl} from './media.js';
import {createInstrument,updateInstrument,disposeInstruments} from './instrument.js';
import {CloudCollection} from './cloud.js';
import {commonGames,mergeInterests,selectionSummary,createManualInterest,summarizePlaytime,createLatestGate,createInFlightPool,checkDiscoveryAvailability,normalizeName,parseCollectionFile,mergeCollection} from './core.js';
const $=s=>document.querySelector(s), key='find-your-next-v1';
const validTypes=new Set(['tv_show','movie','videogame','artist','book','podcast','person','place','destination','brand']);
let cloud=null;const qlooWatchers=new Map();
let state={interests:[],saved:[],group:[{games:'',minutes:''},{games:'',minutes:''}]}, qlooReady=false, qlooPending=true, transferMessage='';
function tidy(item){if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id.trim()||typeof item.title!=='string'||!item.title.trim()||!validTypes.has(item.qlooType))return null;return {id:item.id.slice(0,200),title:item.title.slice(0,150),kind:String(item.kind??'').slice(0,30),qlooType:item.qlooType,source:String(item.source??'').slice(0,40),detail:String(item.detail??'').slice(0,150),year:Number.isInteger(item.year)&&item.year>=1800&&item.year<=2100?item.year:null,url:allowedUrl(item.url),image:allowedImage(item.image),imageFallback:allowedImage(item.imageFallback),heroImage:allowedImage(item.heroImage),price:typeof item.price==='string'&&/^\d+(\.\d{2})?$/.test(item.price)?item.price:null};}
function allowedUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['www.tvmaze.com','openlibrary.org','www.cheapshark.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
try{const stored=JSON.parse(localStorage.getItem(key)||'{}');for(const field of ['interests','saved'])if(Array.isArray(stored[field]))state[field]=stored[field].map(tidy).filter(Boolean).slice(0,60);if(Array.isArray(stored.group)&&stored.group.length>=2)state.group=stored.group.slice(0,4).map(p=>({games:String(p.games??'').slice(0,3000),minutes:String(p.minutes??'').slice(0,5)}));}catch{}
function saveState(notifyCloud=true){let saved=true;try{localStorage.setItem(key,JSON.stringify(state));}catch{saved=false;alert('This browser could not save your changes on this device.');}updateCounts();if(saved&&notifyCloud)cloud?.changed();return saved;}
function updateCounts(){document.querySelectorAll('[data-saved-count]').forEach(x=>x.textContent=String(state.saved.length));document.querySelectorAll('[data-taste-count]').forEach(x=>x.textContent=String(state.interests.length));const meter=$('[data-home-instrument]');if(meter){updateInstrument(meter,state.interests.length,state.interests.length?`${state.interests.length} saved · use up to 4 in a search`:'Start with something you love');}}
function el(tag,cls='',txt=''){const x=document.createElement(tag);if(cls)x.className=cls;if(txt)x.textContent=txt;return x;}
function btn(text,cls,fn){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function link(text,cls,href){const a=el('a',cls,text);a.href=href;return a;}
function external(text,href,cls=''){const a=link(text,cls,href);a.target='_blank';a.rel='noopener noreferrer';return a;}
function clear(node){disposeInstruments(node);for(const element of qlooWatchers.keys())if(node===element||node.contains(element))qlooWatchers.delete(element);node.replaceChildren();}
function heading(kicker,title,description,badge){const box=el('div','page-heading'),left=el('div');left.append(el('p','eyebrow',kicker),el('h1','',title),el('p','',description));box.append(left);if(badge)box.append(el('span','badge',badge));return box;}
function sectionTitle(title,sub,moreHref){const box=el('div','section-title'),left=el('div');left.append(el('h2','',title));if(sub)left.append(el('p','',sub));box.append(left);if(moreHref)box.append(link('See all →','',moreHref));return box;}
function empty(title,message){const box=el('div','empty');box.append(el('strong','',title),el('span','',message));return box;}
function inList(list,id){return state[list].some(x=>x.id===id);}
function toggle(list,item){const safe=tidy(item);if(!safe)return;if(inList(list,safe.id))state[list]=state[list].filter(x=>x.id!==safe.id);else{const stored={...safe};if(list==='saved')stored.price=null;state[list]=mergeInterests(state[list],stored);}saveState();}
function imageFrame(item,cls='item-image',priority=false){
  const frame=el('div',cls+' artwork-loading'),sources=[...new Set([item.image,item.imageFallback].map(allowedImage).filter(Boolean).flatMap(source=>[optimizedArtworkUrl(source),source]))];let attempt=0;
  const unavailable=failed=>{frame.classList.remove('artwork-loading');frame.classList.add('no-image');frame.dataset.imageStatus=failed?'load-failed':'not-supplied';
    const cover=el('div','title-artwork');cover.setAttribute('aria-hidden','true');cover.dataset.kind=item.qlooType;cover.append(el('span','artwork-kind',item.kind==='book'?'BOOK':item.qlooType==='videogame'?'GAME':item.qlooType==='tv_show'?'SCREEN':'INTEREST'),el('strong','artwork-title',item.title),el('span','artwork-note',failed?'Artwork could not load':item.source==='Qloo'?'Qloo suggestion':item.source==='Your entry'?'Your interest':'Artwork not supplied'));frame.append(cover);
    if(failed){const retry=btn('Retry artwork','artwork-retry',()=>{retry.remove();cover.remove();frame.classList.remove('no-image');frame.classList.add('artwork-loading');attempt=0;frame.append(img);img.src=sources[0];});frame.append(retry);}
  };
  const img=document.createElement('img');img.alt='';img.loading=priority?'eager':'lazy';img.decoding='async';img.fetchPriority=priority?'high':'auto';img.width=item.qlooType==='book'?210:460;img.height=item.qlooType==='book'?315:260;
  if(!sources.length){unavailable(false);return frame;}
  const fallback=()=>{if(++attempt<sources.length){img.src=sources[attempt];return;}img.remove();unavailable(true);};
  img.addEventListener('error',fallback);img.addEventListener('load',()=>{if(img.naturalWidth<=1||img.naturalHeight<=1){fallback();return;}frame.dataset.imageStatus='loaded';frame.classList.remove('artwork-loading');});
  frame.append(img);img.src=sources[0];return frame;
}
function card(item){
  const article=el('article',`item-card item-${item.kind}`),image=imageFrame(item);
  image.append(el('span','source-pill',item.source));
  const body=el('div','item-body');body.append(el('h3','',item.title),el('div','item-meta',item.detail));if(item.price!==null&&item.price!==undefined)body.append(el('div','item-price',`$${item.price} USD`));
  const actions=el('div','item-actions');
  const interest=btn(inList('interests',item.id)?'Added':'Add interest','button soft tiny',()=>{toggle('interests',item);const added=inList('interests',item.id);interest.textContent=added?'Added':'Add interest';interest.setAttribute('aria-pressed',String(added));interest.setAttribute('aria-label',`${added?'Added':'Add interest'}: ${item.title}`);if(location.hash.startsWith('#/taste'))render();});interest.setAttribute('aria-pressed',String(inList('interests',item.id)));interest.setAttribute('aria-label',`${inList('interests',item.id)?'Added':'Add interest'}: ${item.title}`);
  const bookmark=btn(inList('saved',item.id)?'Saved':'Save','button secondary tiny',()=>{toggle('saved',item);const saved=inList('saved',item.id);bookmark.textContent=saved?'Saved':'Save';bookmark.setAttribute('aria-pressed',String(saved));bookmark.setAttribute('aria-label',`${saved?'Saved':'Save'}: ${item.title}`);if(location.hash.startsWith('#/saved'))render();});bookmark.setAttribute('aria-pressed',String(inList('saved',item.id)));bookmark.setAttribute('aria-label',`${inList('saved',item.id)?'Saved':'Save'}: ${item.title}`);
  actions.append(interest,bookmark);const url=allowedUrl(item.url);if(url){const source=external('View source ↗',url,'button secondary tiny');source.setAttribute('aria-label',`View source for ${item.title} on ${item.source} (opens in a new tab)`);actions.append(source);}body.append(actions);article.append(image,body);return article;
}
const catalogPool=createInFlightPool(),catalogCache=new Map();
function catalog(kind,q='',page=0){const cacheKey=JSON.stringify([kind,q,page]),cached=catalogCache.get(cacheKey);if(cached&&Date.now()-cached.at<180000)return Promise.resolve(cached.data);
  return catalogPool.run(cacheKey,async()=>{const url=new URL('/api/catalog',location.origin);url.searchParams.set('kind',kind);if(q)url.searchParams.set('q',q);if(page)url.searchParams.set('page',String(page));let res;try{res=await fetch(url,{signal:AbortSignal.timeout(15000)});}catch{throw new Error('The source could not be reached. Please try again.');}let body;try{body=await res.json();}catch{throw new Error('The source returned an unreadable response.');}if(!res.ok)throw new Error(body.error||'Could not load this source.');catalogCache.set(cacheKey,{at:Date.now(),data:body});if(catalogCache.size>40)catalogCache.delete(catalogCache.keys().next().value);return body;});}
const searchGates=new WeakMap();
async function showCatalog(box,kind,q='',{preview=false}={}){
  let gate=searchGates.get(box);if(!gate){gate=createLatestGate();searchGates.set(box,gate);}const isCurrent=gate.begin();
  clear(box);box.setAttribute('aria-busy','true');box.append(el('p','loading','Loading from the source…'));
  const source=kind==='books'?'Open Library':kind==='games'?'CheapShark':'TVmaze',grid=el('div','cards'),summary=el('p','catalog-summary'),more=el('div','catalog-pagination');summary.setAttribute('role','status');const seen=new Set();let nextPage=0;
  const append=data=>{for(const candidate of (preview?data.items.slice(0,6):data.items)){const item=tidy(candidate);if(item&&!seen.has(item.id)){seen.add(item.id);grid.append(card(item));}}clear(more);
    summary.textContent=`${seen.size} ${source} result${seen.size===1?'':'s'}${Number.isSafeInteger(data.total)?' · '+data.total.toLocaleString()+' records found':''}. Catalog results; use For you for Qloo suggestions.`;
    if(!preview&&data.hasMore&&Number.isSafeInteger(data.nextPage)){nextPage=data.nextPage;const load=btn('Load more','button secondary',async()=>{load.disabled=true;load.textContent='Loading…';try{const next=await catalog(kind,q,nextPage);if(box.isConnected&&isCurrent())append(next);}catch(error){if(box.isConnected&&isCurrent()){load.disabled=false;load.textContent='Try loading more again';summary.textContent=error.message+' Existing results were kept.';}}});more.append(load);}
    else if(!preview)more.append(el('p','tip',kind==='shows'||kind==='anime'?'These are the matches returned by TVmaze. Refine your title to find another show.':data.pageLimitReached?'Refine your search to find more titles beyond this browsing limit.':data.hasMore?'Refine your search to find more titles.':'You have reached the end of these source results.'));
  };
  try{const data=await catalog(kind,q);if(!box.isConnected||!isCurrent())return;clear(box);if(data.requiresQuery){box.append(empty('Search the catalog','Enter at least two characters to find titles.'));return;}if(!data.items.length){box.append(empty('No results','Try a different search.'));return;}box.append(summary,grid,more);append(data);}
  catch(e){if(box.isConnected&&isCurrent()){clear(box);const error=empty('Could not load this source',e.message);error.append(btn('Try again','button secondary tiny',()=>showCatalog(box,kind,q,{preview})));box.append(error);}}
  finally{if(box.isConnected&&isCurrent())box.removeAttribute('aria-busy');}
}
const categories=[
  {icon:'◈',title:'Anime',detail:'Search series',href:'#/explore/anime'},
  {icon:'◉',title:'PC games',detail:'Browse live offers',href:'#/explore/games'},
  {icon:'▤',title:'Books',detail:'Search stories & authors',href:'#/explore/books'},
  {icon:'▶',title:'TV shows',detail:'Find a series',href:'#/explore/shows'},
  {icon:'✳',title:'Game night',detail:'Find games in common',href:'#/group'},
  {icon:'◇',title:'Gift ideas',detail:'Start with their interests',href:'#/for-you/gift',qloo:true},
  {icon:'⌖',title:'Travel & places',detail:'Discover by city',href:'#/for-you/travel',qloo:true},
  {icon:'♪',title:'Creators & artists',detail:'Explore cultural connections',href:'#/for-you/creators',qloo:true},
  {icon:'✳',title:'Event planning',detail:'Explore venues and artists',href:'#/for-you/events',qloo:true},
  {icon:'⌘',title:'Tech communities',detail:'Find places for a meetup',href:'#/for-you/meetups',qloo:true},
  {icon:'♫',title:'Music',detail:'Explore artists',href:'#/for-you/music',qloo:true},
  {icon:'▶',title:'Films',detail:'Discover screen stories',href:'#/for-you/screen',qloo:true},
  {icon:'◌',title:'Podcasts',detail:'Find something to hear',href:'#/for-you/podcasts',qloo:true},
  {icon:'◎',title:'Brands',detail:'Explore different styles',href:'#/for-you/brands',qloo:true}
];
function categoryCard(category){
  const paths={
    Anime:'m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3L2.8 9.7l6.4-.9L12 3Z',
    'PC games':'M7 7h10l4 9c.8 2.5-1.3 4-3 2l-3-3H9l-3 3c-1.7 2-3.8.5-3-2l4-9ZM7 10v4M5 12h4M16 11h.1M18 13h.1',
    Books:'M12 6C9 4 5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Zm0 0v14',
    'TV shows':'M3 5h18v13H3V5Zm5 16h8M12 18v3',
    'Game night':'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6M2 20c0-4 2-6 6-6s6 2 6 6m2-6c4 0 6 2 6 6',
    'Gift ideas':'M3 9h18v4H3V9Zm2 4v8h14v-8M12 9v12M12 9C3 9 5 1 9 4l3 5Zm0 0c9 0 7-8 3-5l-3 5Z',
    'Travel & places':'M12 21s7-7 7-12A7 7 0 0 0 5 9c0 5 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'Music':'M9 17V5l11-2v12M9 5l11-2M9 17c-4-2-7 0-6 3s6 1 6-3Zm11-2c-4-2-7 0-6 3s6 1 6-3Z'
  };
  const a=link('','category-card',category.href),icon=el('span','category-icon'),body=el('span');icon.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');svg.setAttribute('viewBox','0 0 24 24');path.setAttribute('d',paths[category.title]??'m12 3 9 9-9 9-9-9 9-9Zm0 5v8m-4-4h8');svg.append(path);icon.append(svg);
  body.append(el('strong','',category.title),el('small','',category.detail));a.append(icon,body);return a;
}
function instrument(count,caption){return createInstrument(count,caption);}
async function showFeature(target){
  target.setAttribute('aria-busy','true');target.append(el('p','feature-loading','Finding a current game offer…'));
  try{const data=await catalog('games');if(!target.isConnected)return;const items=data.items.map(tidy).filter(x=>x?.url);clear(target);const item=items.find(x=>x.heroImage)??items[0];
    if(!item){target.append(el('p','feature-loading','No current game offers are available.'));return;}
    const panel=el('div','feature-content'),image=imageFrame(item,'feature-image',true),copy=el('div','feature-copy');copy.append(el('span','feature-kicker','A LIVE PC GAME OFFER'),el('h2','',item.title));
    const price=item.price!==null?`$${item.price} USD · `:'',offer=external('View offer ↗',item.url,'button feature-button');offer.setAttribute('aria-label',`View offer for ${item.title} on CheapShark (opens in a new tab)`);copy.append(el('p','',`${price}via CheapShark · price may change`),offer);panel.append(image,copy);target.append(panel);
  }catch{if(target.isConnected){clear(target);target.append(el('p','feature-loading','Game offers are unavailable right now.'));}}
  finally{if(target.isConnected)target.removeAttribute('aria-busy');}
}
async function showExample(target,kind,query,kicker){
  target.setAttribute('aria-busy','true');target.append(el('p','example-loading','Loading a catalog example…'));
  try{
    const data=await catalog(kind,query);if(!target.isConnected)return;
    const items=data.items.map(tidy).filter(Boolean),item=items.find(x=>normalizeName(x.title)===normalizeName(query))??items[0];
    if(!item)throw new Error('No example was returned.');
    const cardLink=link('','example-card',`#/explore/${kind}?q=${encodeURIComponent(item.title)}`);
    const art=imageFrame(item,'example-image'),body=el('span','example-copy');
    body.append(el('span','example-kicker',kicker),el('strong','',item.title),el('small','',`From ${item.source}`),el('span','example-action','Explore title →'));
    cardLink.append(art,body);clear(target);target.append(cardLink);
  }catch{
    if(target.isConnected){clear(target);const fallback=el('div','example-fallback');fallback.append(el('strong','',`${kicker} catalog unavailable`),el('p','','You can search this catalog again.'),link('Open search →','text-link',`#/explore/${kind}`));target.append(fallback);}
  }finally{if(target.isConnected)target.removeAttribute('aria-busy');}
}
function home(root){
  const hero=el('section','hero'),copy=el('div','hero-copy');
  copy.append(el('p','eyebrow','A LITTLE CURIOSITY GOES A LONG WAY'),el('h1','','Find something you’ll love next.'),el('p','hero-description','A new story, a game for tonight, or a shared favorite with friends. It starts with what you love.'));
  const search=el('form','hero-search'),label=el('label','visually-hidden','Search titles');label.htmlFor='home-search';const input=document.createElement('input');input.id='home-search';input.type='search';input.maxLength=100;input.placeholder='Search an anime, game or book';const select=document.createElement('select');select.setAttribute('aria-label','Search category');for(const [value,name] of [['anime','Anime'],['games','PC games'],['books','Books'],['shows','TV shows']]){const option=el('option','',name);option.value=value;select.append(option);}const submit=el('button','button primary','Search');submit.type='submit';search.append(label,input,select,submit);search.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();location.hash=`#/explore/${select.value}${q?`?q=${encodeURIComponent(q)}`:''}`;});copy.append(search,el('p','hero-helper','Search live catalogs. Add favorites to make them yours.'));
  const quick=el('div','hero-quick');quick.append(el('span','','Or browse'),link('Anime','','#/explore/anime'),link('Games','','#/explore/games'),link('Books','','#/explore/books'));copy.append(quick);
  const feature=el('aside','hero-feature');feature.setAttribute('aria-label','Current game offer');hero.append(copy,feature);root.append(hero);showFeature(feature);
  if(!qlooReady){const note=el('div','service-note');note.append(el('span','service-dot'),el('span','','Personalized taste discovery is temporarily unavailable. Catalog search and game night are ready to explore.'));root.append(note);}
  const browse=el('section','section');browse.append(sectionTitle('Start exploring','Search real catalogs or find a game to play together.'));const grid=el('div','category-grid');for(const c of categories.filter(c=>!c.qloo))grid.append(categoryCard(c));browse.append(grid);root.append(browse);
  const examples=el('section','section example-section');examples.append(sectionTitle('A few places to start','Examples from real catalogs. Search for anything you like.'));const exampleGrid=el('div','example-grid'),animeExample=el('div','example-slot'),bookExample=el('div','example-slot');exampleGrid.append(animeExample,bookExample);examples.append(exampleGrid);root.append(examples);showExample(animeExample,'anime','One Piece','ANIME');showExample(bookExample,'books','Dune','BOOKS');
  const interestSection=el('section','interest-section'),interestCopy=el('div','interest-copy');interestCopy.append(el('p','eyebrow','MAKE IT YOURS'),el('h2','','Keep the things you love close.'),el('p','','Build your list of favorites on this device, ready for your next discovery.'),link('Manage interests →','text-link','#/taste'));const meter=instrument(Math.min(state.interests.length,4),state.interests.length?`${state.interests.length} saved · use up to 4 in a search`:'Start with something you love');meter.fig.dataset.homeInstrument='';interestSection.append(interestCopy,meter.fig);root.append(interestSection);
  const deals=el('section','section');deals.append(sectionTitle('A few PC games to explore','Live offers from CheapShark · USD prices may change.','#/explore/games'));const target=el('div');deals.append(target);root.append(deals);showCatalog(target,'games','',{preview:true});
  const more=el('section','section more-section');more.append(sectionTitle('More ways to discover','Use your interests to explore cross-category suggestions from Qloo.'));const moreGrid=el('div','category-grid');for(const c of categories.filter(c=>c.qloo))moreGrid.append(categoryCard(c));more.append(moreGrid);root.append(more);
}
function explore(root,requested='games',initialQuery=''){
  const allowed=['anime','games','books','shows'],kind=allowed.includes(requested)?requested:'games';
  root.append(heading('LIVE CATALOGS','Explore the things you love.','Browse the named catalogs, then use For you to discover Qloo taste connections.'));
  const bar=el('div','toolbar');for(const [value,label] of [['anime','Anime'],['games','PC games'],['books','Books'],['shows','TV shows']])bar.append(link(label,`chip${kind===value?' active':''}`,`#/explore/${value}`));root.append(bar);
  const notice=el('p','tip',kind==='anime'?'Anime results are shows labeled Anime by TVmaze; the catalog may not include every title.':kind==='games'?'Prices are supplied by CheapShark in USD, can change, and may vary by region.':kind==='books'?'Book records and covers are supplied by Open Library.':'Show records are supplied by TVmaze (CC BY-SA).');root.append(notice);
  const form=el('form','search-form'),field=el('div','field'),label=el('label','','Search titles');label.htmlFor='catalog-query';const input=document.createElement('input');input.id='catalog-query';input.type='search';input.maxLength=100;input.value=initialQuery.slice(0,100);input.placeholder=kind==='anime'?'Search an anime title':kind==='games'?'Search PC games':kind==='books'?'Search a book or author':'Search a TV show';field.append(label,input);const submit=el('button','button primary','Search');submit.type='submit';form.append(field,submit);root.append(form);
  const results=el('div');results.setAttribute('aria-live','polite');root.append(results);form.addEventListener('submit',e=>{e.preventDefault();showCatalog(results,kind,input.value.trim());});showCatalog(results,kind,input.value.trim());
}
const modes={
  all:{title:'Discover for you',desc:'Connect your favorites to something new.',targets:[['videogame','Games'],['tv_show','TV shows'],['book','Books'],['artist','Artists'],['movie','Films'],['podcast','Podcasts'],['brand','Brands'],['destination','Destinations'],['place','Places']]},
  gift:{title:'Find a thoughtful gift',desc:'Explore games, books or brands associated with the interests someone shared.',targets:[['videogame','PC game ideas'],['book','Book ideas'],['brand','Brand ideas']],note:'A Qloo suggestion is not a product listing. Check the store for price, availability and suitability.'},
  travel:{title:'Plan a more personal trip',desc:'Explore destinations and places connected to your taste.',targets:[['place','Places in a city'],['destination','Destinations']],note:'Opening hours, access and reservations are not verified. If a game does not work for destinations, try an artist, film or brand.'},
  creators:{title:'Explore creators and artists',desc:'Discover people and artists connected to your interests.',targets:[['artist','Artists'],['person','People']],note:'A match does not establish collaboration interest, audience overlap or contact details.'},
  events:{title:'Build an event idea',desc:'Start with places and artists your community may want to explore.',targets:[['place','Places in a city'],['artist','Artists']],note:'These are venue or artist ideas, not confirmed events. Dates and tickets need a separate event source.'},
  meetups:{title:'Find a place to gather',desc:'Explore places for a tech or gaming community meetup.',targets:[['place','Places in a city']],note:'These are place suggestions, not scheduled meetups. Verify suitability and availability with each venue.'},
  music:{title:'Explore music',desc:'Find artists connected to your interests.',targets:[['artist','Artists']]},
  screen:{title:'Find a screen story',desc:'Connect your favorite interests to films and television.',targets:[['movie','Films'],['tv_show','TV shows']],note:'TV suggestions may include non-anime; streaming availability is not verified.'},
  podcasts:{title:'Find a new listen',desc:'Explore podcasts related to your interests.',targets:[['podcast','Podcasts']]},
  brands:{title:'Explore brands',desc:'Discover brands connected to the things you enjoy.',targets:[['brand','Brands']],note:'A brand suggestion is not a product listing or a verified price.'},
  games:{title:'Discover more games',desc:'Explore games connected to your selected interests.',targets:[['videogame','Games']],note:'Check platform, price and availability separately.'},
  books:{title:'Discover books',desc:'Explore books connected to the things you enjoy.',targets:[['book','Books']]}
};
async function requestDiscovery(input){
  let res;try{res=await fetch('/api/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(75000)});}catch{throw new Error('Taste discovery could not be reached. Please wait a moment, then try again.');}
  let data;try{data=await res.json();}catch{throw new Error('The discovery service returned an unreadable response.');}
  if(!res.ok)throw new Error(data.error||'Could not find suggestions.');return data;
}
function showDiscovery(output,data){
  clear(output);output.append(sectionTitle('Suggestions from Qloo',`${data.items.length} returned · based on: ${data.resolved.join(', ')}. An association is not a guarantee.`));
  if(data.unresolved.length)output.append(el('p','notice',`Could not match exactly: ${data.unresolved.join(', ')}. These interests were not used.`));
  if(!data.items.length){output.append(empty('No suggestions returned','Try other favorites or another category.'));return;}
  const list=el('div','result-list');for(const item of data.items){const row=el('div','result-item'),text=el('div'),actions=el('div','result-actions');text.append(el('strong','',item.title),el('small','',item.detail));
    if(Array.isArray(item.evidence)&&item.evidence.length)text.append(el('small','','Qloo linked this to: '+item.evidence.join(', ')));
    const action=btn(inList('saved',item.id)?'Saved':'Save','button secondary tiny',()=>{toggle('saved',item);const saved=inList('saved',item.id);action.textContent=saved?'Saved':'Save';action.setAttribute('aria-label',`${saved?'Saved':'Save'}: ${item.title}`);action.setAttribute('aria-pressed',String(saved));});
    action.setAttribute('aria-label',`${inList('saved',item.id)?'Saved':'Save'}: ${item.title}`);action.setAttribute('aria-pressed',String(inList('saved',item.id)));actions.append(action);row.append(text,actions);list.append(row);
    if(item.qlooType==='videogame'){const price=btn('Find PC prices','button soft tiny',()=>{const holder=el('div');row.after(holder);price.disabled=true;showCatalog(holder,'games',item.title.slice(0,100));});price.setAttribute('aria-label',`Find PC prices for ${item.title}`);actions.append(price);}
    if(item.qlooType==='book'||item.qlooType==='tv_show'){const kind=item.qlooType==='book'?'books':'shows',label=item.qlooType==='book'?'Search book catalog':'Search TV catalog';const catalogLink=link(label,'button soft tiny',`#/explore/${kind}?q=${encodeURIComponent(item.title.slice(0,100))}`);catalogLink.setAttribute('aria-label',`${label} for ${item.title}`);actions.append(catalogLink);}
  }output.append(list);
}
function forYou(root,modeName='all'){
  const mode=modes[modeName]??modes.all;root.append(heading('QLOO TASTE DISCOVERY',mode.title,mode.desc));
  const connection=el('div','notice',qlooPending?'Checking taste discovery…':'Taste discovery is temporarily unavailable. You can still search real catalogs and build a local interests list.');connection.dataset.qlooNotice='';connection.hidden=qlooReady;root.append(connection);
  if(mode.note)root.append(el('p','tip',mode.note));
  if(!state.interests.length){const box=empty('Start with a few favorites','Add interests from the real catalogs first. Your list stays on this device.');box.append(link('Explore catalogs','button primary','#/explore'));root.append(box);return;}
  const panel=el('section','panel');panel.append(el('h2','','Choose interests to use'),el('p','tip','Select up to four. These names will be sent to Qloo when you request suggestions.'));
  const choices=el('div','profile-strip');state.interests.forEach((item,i)=>{const label=el('label','interest-chip'),input=document.createElement('input');input.type='checkbox';input.value=String(i);input.checked=i<4;label.append(input,document.createTextNode(`${item.title}${item.year?` · ${item.year}`:''}`));choices.append(label);});panel.append(choices);
  const meter=instrument(Math.min(state.interests.length,4),`${Math.min(state.interests.length,4)} of 4 interests selected`);meter.fig.classList.add('selection-instrument');meter.text.setAttribute('aria-live','polite');panel.append(meter.fig);
  const controls=el('div','row'),targetField=el('div','field'),label=el('label','','What would you like to discover?');label.htmlFor='target-type';const select=document.createElement('select');select.id='target-type';for(const [value,text] of mode.targets){const option=el('option','',text);option.value=value;select.append(option);}targetField.append(label,select);controls.append(targetField);const sizeField=el('div','field'),sizeLabel=el('label','','Number of suggestions');sizeLabel.htmlFor='suggestion-count';const size=document.createElement('select');size.id='suggestion-count';for(const value of [12,24,48]){const option=el('option','',`Up to ${value}`);option.value=String(value);option.selected=value===24;size.append(option);}sizeField.append(sizeLabel,size);controls.append(sizeField);
  let city;if(['travel','events','meetups'].includes(modeName)){const field=el('div','field'),cl=el('label','','City for place results');cl.htmlFor='city';city=document.createElement('input');city.id='city';city.placeholder='For example, Lahore';city.maxLength=100;field.append(cl,city);controls.append(field);}panel.append(controls);
  let discovering=false;const output=el('div','section spaced');output.setAttribute('aria-live','polite');const submit=btn('Find suggestions','button primary',async()=>{
    const selected=[...choices.querySelectorAll('input:checked')].map(x=>state.interests[Number(x.value)]).filter(Boolean);
    if(!selected.length||selected.length>4){clear(output);output.append(empty('Choose one to four interests','You can change your selection before trying again.'));return;}
    clear(output);output.append(el('p','loading','Checking your interests with Qloo…'));output.setAttribute('aria-busy','true');discovering=true;updateSelection();
    try{const data=await requestDiscovery({seeds:selected.map(x=>({title:x.title,qlooType:x.qlooType,...(Number.isInteger(x.year)?{year:x.year}:{})})),target:select.value,take:Number(size.value),city:city?.value?.trim()??''});if(!output.isConnected)return;showDiscovery(output,data);
    }catch(error){if(output.isConnected){clear(output);output.append(empty('Could not find suggestions',error.message));}}finally{if(output.isConnected)output.removeAttribute('aria-busy');discovering=false;updateSelection();}
  });const updateSelection=()=>{const summary=selectionSummary(choices.querySelectorAll('input:checked').length);meter.update(summary.frame,summary.label);submit.disabled=discovering||!qlooReady||!summary.valid;};choices.addEventListener('change',updateSelection);qlooWatchers.set(panel,updateSelection);updateSelection();panel.append(el('p','tip','Results depend on Qloo catalog coverage. For shows with the same name, add the version from our catalog so its year can help identify it.'),submit,output);root.append(panel);
}
function taste(root){
  root.append(heading('YOUR PROFILE','The things you enjoy.','Your interests stay on this device and can be used across discovery categories.'));
  const panel=el('section','panel manual-panel');panel.append(el('h2','','Add an interest'),el('p','tip','Enter an exact title or name. When Qloo is connected, it will try to match it before finding suggestions.'));
  const form=el('form','manual-form'),titleField=el('div','field'),titleLabel=el('label','','Name or title');titleLabel.htmlFor='manual-title';const input=document.createElement('input');input.id='manual-title';input.maxLength=150;input.required=true;input.placeholder='For example, Radiohead';titleField.append(titleLabel,input);
  const typeField=el('div','field'),typeLabel=el('label','','Category');typeLabel.htmlFor='manual-type';const type=document.createElement('select');type.id='manual-type';for(const [value,name] of [['artist','Artist'],['videogame','Game'],['tv_show','TV show / anime'],['movie','Film'],['book','Book'],['podcast','Podcast'],['person','Person'],['place','Place'],['destination','Destination'],['brand','Brand']]){const option=el('option','',name);option.value=value;type.append(option);}typeField.append(typeLabel,type);const add=el('button','button primary','Add interest');add.type='submit';form.append(titleField,typeField,add);const feedback=el('p','tip');feedback.setAttribute('role','status');panel.append(form,feedback);root.append(panel);
  form.addEventListener('submit',e=>{e.preventDefault();const item=createManualInterest(input.value,type.value);if(!item){feedback.textContent='Enter a name between 2 and 150 characters.';return;}if(inList('interests',item.id)){feedback.textContent='This interest is already on your list.';return;}if(state.interests.length>=60){feedback.textContent='Your list can hold up to 60 interests.';return;}state.interests=mergeInterests(state.interests,item);saveState();render();$('#manual-title')?.focus();});
  if(!state.interests.length){const box=empty('No interests yet','Add an interest above or find something in the catalogs.');box.append(link('Explore catalogs','button secondary','#/explore'));root.append(box);return;}
  const grid=el('div','cards');for(const item of state.interests)grid.append(card(item));root.append(grid);const actions=el('div','toolbar spaced');actions.append(link('Discover with Qloo','button primary','#/for-you'),btn('Clear interests','button secondary',()=>{if(confirm('Remove all interests from this device?')){state.interests=[];saveState();render();}}));root.append(actions);
}
function cloudPanel(){
  const panel=el('section','panel cloud-panel'),header=el('div','cloud-heading');header.append(el('h2','','Your collection, across devices'),el('span','badge','Optional'));panel.append(header,el('p','tip','Connect a private cloud collection to save changes automatically and pick up on another device. Game-night entries stay on this device.'));
  const status=el('p','cloud-status');status.setAttribute('role','status');const offline=el('div'),online=el('div');
  const create=btn('Create cloud collection','button primary',async()=>{try{await cloud.create();}catch{}});create.id='cloud-create';
  const form=el('form','cloud-connect'),field=el('div','field'),label=el('label','','Connect with a sync key');label.htmlFor='cloud-key';const input=document.createElement('input');input.id='cloud-key';input.type='password';input.autocomplete='off';input.spellcheck=false;input.maxLength=60;input.placeholder='fyn1_…';const connect=el('button','button secondary','Connect');connect.type='submit';field.append(label,input);form.append(field,connect);form.addEventListener('submit',async e=>{e.preventDefault();try{await cloud.connect(input.value);input.value='';}catch{}});
  offline.append(create,form);
  const actions=el('div','toolbar'),sync=btn('Sync now','button primary',()=>cloud.sync()),copy=btn('Copy sync key','button secondary',async()=>{try{await navigator.clipboard.writeText(cloud.key());status.textContent='Sync key copied. Keep it private.';}catch{status.textContent='Copy was unavailable. Reveal the key and copy it manually.';}}),show=btn('Show sync key','button secondary',()=>{const reveal=secret.type==='password';secret.type=reveal?'text':'password';secret.value=reveal?cloud.key():'';show.textContent=reveal?'Hide sync key':'Show sync key';show.setAttribute('aria-pressed',String(reveal));});sync.id='cloud-sync-now';show.setAttribute('aria-pressed','false');
  const secretLabel=el('label','field-label','Your private sync key');secretLabel.htmlFor='cloud-recovery-key';const secret=document.createElement('input');secret.id='cloud-recovery-key';secret.type='password';secret.readOnly=true;secret.autocomplete='off';secret.spellcheck=false;secret.placeholder='Use Show sync key or Copy sync key';
  const disconnect=btn('Disconnect this device','button secondary',()=>cloud.disconnect()),remove=btn('Delete cloud copy','button secondary',async()=>{if(confirm('Permanently delete this cloud copy? Local items on this device will stay.'))try{await cloud.deleteCloud();}catch{}});actions.append(sync,copy,show);const accountActions=el('div','toolbar spaced');accountActions.append(disconnect,remove);
  online.append(actions,secretLabel,secret,el('p','tip','Anyone with this key can connect to the collection. Keep it private; a lost key cannot be recovered by email.'),accountActions);panel.append(status,offline,online);
  const update=()=>{const connected=!!cloud?.context;offline.hidden=connected;online.hidden=!connected;status.textContent=cloud?.message||'Checking cloud collection…';status.classList.toggle('error',!!cloud?.error);for(const button of [create,connect,sync,disconnect,remove])button.disabled=!cloud?.configured||!!cloud?.busy;input.disabled=!cloud?.configured||!!cloud?.busy;if(!connected){secret.value='';secret.type='password';show.textContent='Show sync key';show.setAttribute('aria-pressed','false');}};
  update();const listener=()=>{if(!panel.isConnected){window.removeEventListener('cloud-status',listener);return;}update();};window.addEventListener('cloud-status',listener);return panel;
}
function collectionTransfer(){
  const panel=el('section','transfer-panel'),copy=el('div','transfer-copy');
  const icon=el('span','transfer-icon','↗');icon.setAttribute('aria-hidden','true');
  copy.append(icon,el('h2','','Take your collection with you'),el('p','','Download your interests and saved items, then import the file on another device. Changes do not sync automatically.'));
  const actions=el('div','transfer-actions'),status=el('p','transfer-status',transferMessage);status.setAttribute('role','status');status.tabIndex=-1;
  const download=btn('Download collection','button secondary',()=>{
    const data=JSON.stringify({format:'find-your-next',version:1,interests:state.interests,saved:state.saved},null,2);
    const address=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=address;a.download='find-your-next-collection.json';a.click();setTimeout(()=>URL.revokeObjectURL(address),1000);
    status.textContent='Collection downloaded. Keep the file private; it contains your selected interests.';
  });
  const label=el('label','button primary transfer-upload','Import collection'),input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.className='visually-hidden';input.setAttribute('aria-label','Import collection file');
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];input.value='';if(!file)return;
    try{
      if(file.size>200000)throw new Error('The file is too large. Choose a collection under 200 KB.');
      const imported=parseCollectionFile(await file.text()),merged=mergeCollection(state,imported,tidy);
      if(!confirm(`Add ${merged.added} item${merged.added===1?'':'s'} from this file? Your current collection will be kept.`)){status.textContent='Import cancelled. Your collection is unchanged.';return;}
      const previous=state;state={...state,interests:merged.interests,saved:merged.saved};
      if(!saveState()){state=previous;updateCounts();status.textContent='Import could not be saved. Your collection is unchanged.';return;}
      transferMessage=`Imported ${merged.added} item${merged.added===1?'':'s'}. Existing items were kept.${merged.invalid?' Some invalid items were skipped.':''}${merged.overflow?' Some items did not fit the 60-item limit.':''}`;
      render();document.querySelector('.transfer-status')?.focus();
    }catch(error){status.textContent=error.message||'The collection could not be read.';}
  });
  label.append(input);actions.append(download,label);panel.append(copy,actions,status,el('p','transfer-privacy','The downloaded file is not encrypted. It does not include game-night entries.'));return panel;
}
function saved(root){
  root.append(heading('YOUR COLLECTION','Saved for later.','Search and organize your saved titles. Connect a private cloud collection below to use another device.'));
  if(!state.saved.length){const box=empty('Nothing saved yet','Explore catalogs and save anything that catches your eye.');box.append(link('Explore','button primary','#/explore'));root.append(box,cloudPanel(),collectionTransfer());return;}
  let view='grid';try{view=localStorage.getItem('find-your-next-library-view')==='list'?'list':'grid';}catch{}
  const toolbar=el('div','library-toolbar'),searchField=el('div','field library-search'),label=el('label','','Search your collection');label.htmlFor='collection-query';
  const search=document.createElement('input');search.id='collection-query';search.type='search';search.placeholder='Find a saved title';search.maxLength=150;searchField.append(label,search);
  const tools=el('div','library-tools'),sort=document.createElement('select');sort.setAttribute('aria-label','Sort collection');for(const [value,name] of [['recent','Recently saved'],['title','Title: A to Z']]){const option=el('option','',name);option.value=value;sort.append(option);}
  const views=el('div','library-view');views.setAttribute('role','group');views.setAttribute('aria-label','Collection layout');const gridButton=btn('Grid','',()=>setView('grid')),listButton=btn('List','',()=>setView('list'));views.append(gridButton,listButton);tools.append(sort,views);toolbar.append(searchField,tools);
  const filters=el('div','collection-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Collection type');let category='all';const filterButtons=[];for(const [value,name] of [['all','All'],['book','Books'],['videogame','Games'],['tv_show','TV & anime'],['other','Other']]){const total=state.saved.filter(x=>value==='all'||(value==='other'?!['book','videogame','tv_show'].includes(x.qlooType):x.qlooType===value)).length;const button=btn(name+' '+total,'chip',()=>{category=value;draw();});button.dataset.category=value;filterButtons.push(button);filters.append(button);}const count=el('p','library-count');count.setAttribute('role','status');const results=el('div');root.append(toolbar,filters,count,results);
  function draw(){const query=normalizeName(search.value),items=state.saved.filter(item=>normalizeName(item.title).includes(query)&&(category==='all'||(category==='other'?!['book','videogame','tv_show'].includes(item.qlooType):item.qlooType===category)));for(const button of filterButtons)button.setAttribute('aria-pressed',String(button.dataset.category===category));if(sort.value==='title')items.sort((a,b)=>a.title.localeCompare(b.title));else items.reverse();
    count.textContent=`${items.length} of ${state.saved.length} saved item${state.saved.length===1?'':'s'}`;clear(results);results.className=view==='list'?'library-list':'cards';gridButton.setAttribute('aria-pressed',String(view==='grid'));listButton.setAttribute('aria-pressed',String(view==='list'));
    if(!items.length){results.className='';results.append(empty('No matching titles','Try a different name or clear your search.'));}else for(const item of items)results.append(card(item));
  }
  function setView(next){view=next;try{localStorage.setItem('find-your-next-library-view',view);}catch{}draw();}
  search.addEventListener('input',draw);sort.addEventListener('change',draw);draw();root.append(cloudPanel(),collectionTransfer());
}
function group(root){
  root.append(heading('PLAN TOGETHER','Make game night easier.','Find games in common and compare how long each person can play.'));
  root.append(el('p','tip','Enter what each person is willing to play. Titles are matched without case or punctuation differences; verify ownership, platform and game duration yourselves.'));
  const form=el('form','action-grid');state.group.forEach((person,i)=>{const panel=el('section','panel');panel.append(el('h2','',`Person ${i+1}`),el('p','','Add game titles separated by commas or new lines.'));
    const games=el('div','field'),gl=el('label','','Games');gl.htmlFor=`group-games-${i}`;const textarea=document.createElement('textarea');textarea.id=gl.htmlFor;textarea.maxLength=3000;textarea.value=person.games;textarea.placeholder='For example: Minecraft, Portal 2';textarea.addEventListener('input',()=>{state.group[i].games=textarea.value;saveState();});games.append(gl,textarea);
    const time=el('div','field'),tl=el('label','','Maximum playtime in minutes (optional)');tl.htmlFor=`group-minutes-${i}`;const input=document.createElement('input');input.id=tl.htmlFor;input.type='number';input.min='1';input.max='1440';input.step='1';input.value=person.minutes;input.addEventListener('input',()=>{state.group[i].minutes=input.value;saveState();});time.append(tl,input);panel.append(games,time);
    if(i>=2)panel.append(btn('Remove person','button secondary tiny',()=>{state.group.splice(i,1);saveState();render();}));form.append(panel);});root.append(form);
  const controls=el('div','toolbar spaced');const compare=btn('Find common games','button primary',()=>{
    const groups=state.group.map(p=>p.games.split(/[,\n]/).map(x=>x.trim()).filter(Boolean).slice(0,40));clear(result);
    if(groups.some(g=>!g.length)){result.append(empty('Add games for everyone','At least one title is needed for each person.'));return;}
    const playtime=summarizePlaytime(state.group.map(p=>p.minutes));if(playtime.error){result.append(empty('Check playtime',playtime.error));return;}
    const matches=commonGames(groups);if(!matches.length){result.append(empty('No titles in common','Try adding more games or check the spelling.'));return;}
    result.append(sectionTitle('Games in common','Names are matched locally; check that each person has the same platform.'));
    const list=el('div','result-list');for(const name of matches)list.append(el('div','result-item',name));result.append(list);
    if(playtime.minutes!==null)result.append(el('p','tip',`Shortest playtime entered: ${playtime.minutes} minutes. Choose a time together and check the game duration before deciding.`));
  });controls.append(compare);if(state.group.length<4)controls.append(btn('Add person','button secondary',()=>{state.group.push({games:'',minutes:''});saveState();render();}));root.append(controls);const result=el('div','section');result.setAttribute('aria-live','polite');root.append(result);
  const discovery=el('section','panel group-discovery');discovery.append(el('h2','','Find something new together'),el('p','tip','Qloo uses the first game listed for each person. Those titles are sent to Qloo; suggestions reflect combined associations and are not a promise that everyone will like them.'));
  if(!qlooReady)discovery.append(el('p','notice','Taste discovery is temporarily unavailable. You can still find games in common above.'));
  const suggestions=el('div','section spaced');suggestions.setAttribute('aria-live','polite');const find=btn('Find new games together','button primary',async()=>{
    const seeds=state.group.map(p=>p.games.split(/[,\n]/).map(x=>x.trim()).find(Boolean));clear(suggestions);
    if(seeds.some(title=>!title||title.length<2||title.length>150)){suggestions.append(empty('Add a game for everyone','Use a title between 2 and 150 characters as the first game for each person.'));return;}
    find.disabled=true;suggestions.setAttribute('aria-busy','true');suggestions.append(el('p','loading','Finding games connected to your group’s interests…'));
    try{const data=await requestDiscovery({seeds:seeds.map(title=>({title,qlooType:'videogame'})),target:'videogame'});if(suggestions.isConnected)showDiscovery(suggestions,data);}
    catch(error){if(suggestions.isConnected){clear(suggestions);suggestions.append(empty('Could not find suggestions',error.message));}}
    finally{if(suggestions.isConnected)suggestions.removeAttribute('aria-busy');find.disabled=!qlooReady;}
  });find.disabled=!qlooReady;qlooWatchers.set(discovery,()=>{find.disabled=!qlooReady;});discovery.append(find,suggestions);root.append(discovery);
}
function render({focus=false,preserveScroll=false}={}){
  const previousScroll=window.scrollY;
  const [path,query='']=(location.hash.replace(/^#\/?/,'')||'home').split('?'),parts=path.split('/'),route=parts[0],root=$('#app');clear(root);
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(route==='explore')explore(root,parts[1],new URLSearchParams(query).get('q')??'');else if(route==='for-you')forYou(root,parts[1]);else if(route==='group')group(root);else if(route==='saved')saved(root);else if(route==='taste')taste(root);else home(root);updateCounts();const title=root.querySelector('h1')?.textContent??'Find Your Next';document.title=`${title} — Find Your Next`;$('#main').setAttribute('aria-label',title);window.scrollTo(0,preserveScroll?previousScroll:0);if(focus)$('#main').focus({preventScroll:true});
}
$('.skip').addEventListener('click',event=>{event.preventDefault();$('#main').focus();});
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());$('#about-close').addEventListener('click',()=>$('#about-dialog').close());window.addEventListener('hashchange',()=>render({focus:true}));
function cleanCloudSnapshot(value){
  const result={interests:[],saved:[]};for(const field of ['interests','saved']){if(!Array.isArray(value[field])||value[field].length>60)throw new Error('The cloud collection is invalid or too large.');const unique=new Map();for(const candidate of value[field]){const item=tidy(candidate);if(item)unique.set(item.id,item);}result[field]=[...unique.values()];}return result;
}
cloud=new CloudCollection({
  getSnapshot:()=>structuredClone({interests:state.interests,saved:state.saved}),clean:cleanCloudSnapshot,
  applySnapshot:value=>{const next=cleanCloudSnapshot(value);if(JSON.stringify(next)===JSON.stringify({interests:state.interests,saved:state.saved}))return;const previous=state;state={...state,...next};if(!saveState(false)){state=previous;updateCounts();throw new Error('This browser could not save the synced collection. Your local items were kept.');}const active=document.activeElement;if(!active?.matches('input,textarea,select')){const id=active?.id;render({preserveScroll:true});if(id)document.getElementById(id)?.focus({preventScroll:true});}else{active.addEventListener('blur',()=>{if(active.isConnected)render({preserveScroll:true});},{once:true});}},
  onStatus:()=>window.dispatchEvent(new Event('cloud-status'))
});
window.addEventListener('online',()=>cloud.sync());let lastCloudFocus=0;window.addEventListener('focus',()=>{if(Date.now()-lastCloudFocus>10000){lastCloudFocus=Date.now();cloud.sync();}});
async function init(){render();qlooReady=await checkDiscoveryAvailability();qlooPending=false;$('#side-status').textContent=qlooReady?'Discover from your interests':'Taste discovery unavailable';document.querySelectorAll('[data-qloo-notice]').forEach(node=>{node.hidden=qlooReady;if(!qlooReady)node.textContent='Taste discovery is temporarily unavailable. You can still search real catalogs and build a local interests list.';});for(const [node,update] of qlooWatchers){if(node.isConnected)update();else qlooWatchers.delete(node);}}
init();cloud.init();
