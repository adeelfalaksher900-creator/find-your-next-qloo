import {commonGames,mergeInterests,selectionSummary,createManualInterest,summarizePlaytime,createLatestGate,createInFlightPool,checkDiscoveryAvailability,normalizeName,parseCollectionFile,mergeCollection,chooseArtwork} from './core.js';
const $=s=>document.querySelector(s), key='find-your-next-v1';
const validTypes=new Set(['tv_show','movie','videogame','artist','book','podcast','person','place','destination','brand']);
let state={interests:[],saved:[],group:[{games:'',minutes:''},{games:'',minutes:''}]}, qlooReady=false, transferMessage='';
function tidy(item){if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id.trim()||typeof item.title!=='string'||!item.title.trim()||!validTypes.has(item.qlooType))return null;return {id:item.id.slice(0,200),title:item.title.slice(0,150),kind:String(item.kind??'').slice(0,30),qlooType:item.qlooType,source:String(item.source??'').slice(0,40),detail:String(item.detail??'').slice(0,150),year:Number.isInteger(item.year)&&item.year>=1800&&item.year<=2100?item.year:null,url:allowedUrl(item.url),image:allowedImage(item.image),imageFallback:allowedImage(item.imageFallback),heroImage:allowedImage(item.heroImage),price:typeof item.price==='string'&&/^\d+(\.\d{2})?$/.test(item.price)?item.price:null};}
function allowedUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['www.tvmaze.com','openlibrary.org','www.cheapshark.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
function allowedImage(value){try{const u=new URL(value);return u.protocol==='https:'&&['static.tvmaze.com','covers.openlibrary.org','shared.fastly.steamstatic.com','cdn.cloudflare.steamstatic.com','images.gog-statics.com','cdn.akamai.steamstatic.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
try{const stored=JSON.parse(localStorage.getItem(key)||'{}');for(const field of ['interests','saved'])if(Array.isArray(stored[field]))state[field]=stored[field].map(tidy).filter(Boolean).slice(0,60);if(Array.isArray(stored.group)&&stored.group.length>=2)state.group=stored.group.slice(0,4).map(p=>({games:String(p.games??'').slice(0,3000),minutes:String(p.minutes??'').slice(0,5)}));}catch{}
function saveState(){let saved=true;try{localStorage.setItem(key,JSON.stringify(state));}catch{saved=false;alert('This browser could not save your changes on this device.');}updateCounts();return saved;}
function updateCounts(){document.querySelectorAll('[data-saved-count]').forEach(x=>x.textContent=String(state.saved.length));document.querySelectorAll('[data-taste-count]').forEach(x=>x.textContent=String(state.interests.length));const meter=$('[data-home-instrument]');if(meter){meter.querySelector('img').src=`/instrument/count-${Math.min(state.interests.length,4)}.svg`;meter.querySelector('figcaption').textContent=state.interests.length?`${state.interests.length} saved · use up to 4 in a search`:'Start with something you love';}}
function el(tag,cls='',txt=''){const x=document.createElement(tag);if(cls)x.className=cls;if(txt)x.textContent=txt;return x;}
function btn(text,cls,fn){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function link(text,cls,href){const a=el('a',cls,text);a.href=href;return a;}
function external(text,href,cls=''){const a=link(text,cls,href);a.target='_blank';a.rel='noopener noreferrer';return a;}
function clear(node){node.replaceChildren();}
function heading(kicker,title,description,badge){const box=el('div','page-heading'),left=el('div');left.append(el('p','eyebrow',kicker),el('h1','',title),el('p','',description));box.append(left);if(badge)box.append(el('span','badge',badge));return box;}
function sectionTitle(title,sub,moreHref){const box=el('div','section-title'),left=el('div');left.append(el('h2','',title));if(sub)left.append(el('p','',sub));box.append(left);if(moreHref)box.append(link('See all →','',moreHref));return box;}
function empty(title,message){const box=el('div','empty');box.append(el('strong','',title),el('span','',message));return box;}
function inList(list,id){return state[list].some(x=>x.id===id);}
function toggle(list,item){const safe=tidy(item);if(!safe)return;if(inList(list,safe.id))state[list]=state[list].filter(x=>x.id!==safe.id);else{const stored={...safe};if(list==='saved')stored.price=null;state[list]=mergeInterests(state[list],stored);}saveState();}
function imageFrame(item,cls='item-image'){
  const image=el('div',cls);const unavailable=()=>{image.classList.add('no-image');image.append(el('span','image-missing','Cover unavailable'));};
  if(!item.image){unavailable();return image;}
  const img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';let triedFallback=false;
  const fallback=()=>{const next=img.dataset.smallArtwork?item.image:item.imageFallback;delete img.dataset.smallArtwork;if(!triedFallback&&next&&next!==img.src){triedFallback=true;img.src=next;return;}img.remove();unavailable();};
  img.addEventListener('error',()=>{image.dataset.imageStatus='load-failed';fallback();});img.addEventListener('load',()=>{if(img.naturalWidth<img.getBoundingClientRect().width*.9){image.dataset.imageStatus='too-small';fallback();}else image.dataset.imageStatus='loaded';});
  image.append(img);requestAnimationFrame(()=>{if(!img.isConnected)return;const source=chooseArtwork(item,image.getBoundingClientRect().width,window.devicePixelRatio||1);if(source===item.imageFallback&&source!==item.image)img.dataset.smallArtwork=item.image;img.src=source;});return image;
}
window.addEventListener('resize',()=>{for(const img of document.querySelectorAll('img[data-small-artwork]')){if(img.getBoundingClientRect().width*(window.devicePixelRatio||1)>190){img.src=img.dataset.smallArtwork;delete img.dataset.smallArtwork;}}},{passive:true});
function card(item){
  const article=el('article',`item-card item-${item.kind}`),image=imageFrame(item);
  image.append(el('span','source-pill',item.source));
  const body=el('div','item-body');body.append(el('h3','',item.title),el('div','item-meta',item.detail));if(item.price!==null&&item.price!==undefined)body.append(el('div','item-price',`$${item.price} USD`));
  const actions=el('div','item-actions');
  const interest=btn(inList('interests',item.id)?'Added':'Add interest','button soft tiny',()=>{toggle('interests',item);const added=inList('interests',item.id);interest.textContent=added?'Added':'Add interest';interest.setAttribute('aria-pressed',String(added));interest.setAttribute('aria-label',`${added?'Added':'Add interest'}: ${item.title}`);if(location.hash.startsWith('#/taste'))render();});interest.setAttribute('aria-pressed',String(inList('interests',item.id)));interest.setAttribute('aria-label',`${inList('interests',item.id)?'Added':'Add interest'}: ${item.title}`);
  const bookmark=btn(inList('saved',item.id)?'Saved':'Save','button secondary tiny',()=>{toggle('saved',item);const saved=inList('saved',item.id);bookmark.textContent=saved?'Saved':'Save';bookmark.setAttribute('aria-pressed',String(saved));bookmark.setAttribute('aria-label',`${saved?'Saved':'Save'}: ${item.title}`);if(location.hash.startsWith('#/saved'))render();});bookmark.setAttribute('aria-pressed',String(inList('saved',item.id)));bookmark.setAttribute('aria-label',`${inList('saved',item.id)?'Saved':'Save'}: ${item.title}`);
  actions.append(interest,bookmark);const url=allowedUrl(item.url);if(url){const source=external('View source ↗',url,'button secondary tiny');source.setAttribute('aria-label',`View source for ${item.title} on ${item.source} (opens in a new tab)`);actions.append(source);}body.append(actions);article.append(image,body);return article;
}
const catalogPool=createInFlightPool();
function catalog(kind,q=''){return catalogPool.run(JSON.stringify([kind,q]),async()=>{const url=new URL('/api/catalog',location.origin);url.searchParams.set('kind',kind);if(q)url.searchParams.set('q',q);let res;try{res=await fetch(url,{signal:AbortSignal.timeout(15000)});}catch{throw new Error('The source could not be reached. Please try again.');}let body;try{body=await res.json();}catch{throw new Error('The source returned an unreadable response.');}if(!res.ok)throw new Error(body.error||'Could not load this source.');return body;});}
const searchGates=new WeakMap();
async function showCatalog(box,kind,q=''){
  let gate=searchGates.get(box);if(!gate){gate=createLatestGate();searchGates.set(box,gate);}const isCurrent=gate.begin();
  clear(box);box.setAttribute('aria-busy','true');box.append(el('p','loading','Loading from the source…'));
  try{const data=await catalog(kind,q);if(!box.isConnected||!isCurrent())return;clear(box);if(data.requiresQuery){box.append(empty('Search the catalog','Enter at least two characters to find titles.'));return;}if(!data.items.length){box.append(empty('No results','Try a different search.'));return;}const grid=el('div','cards');for(const item of data.items){const safe=tidy(item);if(safe)grid.append(card(safe));}box.append(grid);}
  catch(e){if(box.isConnected&&isCurrent()){clear(box);const error=empty('Could not load this source',e.message);error.append(btn('Try again','button secondary tiny',()=>showCatalog(box,kind,q)));box.append(error);}}
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
function categoryCard(category){const a=link('','category-card',category.href),icon=el('span','category-icon',category.icon),body=el('span');icon.setAttribute('aria-hidden','true');body.append(el('strong','',category.title),el('small','',category.detail));a.append(icon,body);return a;}
function instrument(count,caption){const fig=el('figure','instrument'),image=document.createElement('img');image.src=`/instrument/count-${Math.min(4,Math.max(0,count))}.svg`;image.alt='';image.width=520;image.height=280;const text=el('figcaption','instrument-caption',caption);fig.append(image,text);return {fig,image,text};}
async function showFeature(target){
  target.setAttribute('aria-busy','true');target.append(el('p','feature-loading','Finding a current game offer…'));
  try{const data=await catalog('games');if(!target.isConnected)return;const items=data.items.map(tidy).filter(x=>x?.url);clear(target);const item=items.find(x=>x.heroImage)??items[0];
    if(!item){target.append(el('p','feature-loading','No current game offers are available.'));return;}
    const panel=el('div','feature-content'),image=imageFrame({...item,image:item.heroImage??item.image,imageFallback:item.heroImage?item.image:item.imageFallback},'feature-image'),copy=el('div','feature-copy');copy.append(el('span','feature-kicker','A LIVE PC GAME OFFER'),el('h2','',item.title));
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
  const deals=el('section','section');deals.append(sectionTitle('A few PC games to explore','Live offers from CheapShark · USD prices may change.','#/explore/games'));const target=el('div');deals.append(target);root.append(deals);showCatalog(target,'games');
  const more=el('section','section more-section');more.append(sectionTitle('More ways to discover',qlooReady?'Explore across your interests.':'These experiences require taste discovery, which is currently unavailable.'));const moreGrid=el('div','category-grid');for(const c of categories.filter(c=>c.qloo))moreGrid.append(categoryCard(c));more.append(moreGrid);root.append(more);
}
function explore(root,requested='games',initialQuery=''){
  const allowed=['anime','games','books','shows'],kind=allowed.includes(requested)?requested:'games';
  root.append(heading('LIVE CATALOGS','Explore the things you love.','Search real sources, then add your favorites to your interests.'));
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
  const res=await fetch('/api/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  let data;try{data=await res.json();}catch{throw new Error('The discovery service returned an unreadable response.');}
  if(!res.ok)throw new Error(data.error||'Could not find suggestions.');return data;
}
function showDiscovery(output,data){
  clear(output);output.append(sectionTitle('Suggestions from Qloo',`Based on: ${data.resolved.join(', ')}. An association is not a guarantee.`));
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
  if(!qlooReady)root.append(el('div','notice','Taste discovery is temporarily unavailable. You can still search real catalogs and build a local interests list.'));
  if(mode.note)root.append(el('p','tip',mode.note));
  if(!state.interests.length){const box=empty('Start with a few favorites','Add interests from the real catalogs first. Your list stays on this device.');box.append(link('Explore catalogs','button primary','#/explore'));root.append(box);return;}
  const panel=el('section','panel');panel.append(el('h2','','Choose interests to use'),el('p','tip','Select up to four. These names will be sent to Qloo when you request suggestions.'));
  const choices=el('div','profile-strip');state.interests.forEach((item,i)=>{const label=el('label','interest-chip'),input=document.createElement('input');input.type='checkbox';input.value=String(i);input.checked=i<4;label.append(input,document.createTextNode(`${item.title}${item.year?` · ${item.year}`:''}`));choices.append(label);});panel.append(choices);
  const meter=instrument(Math.min(state.interests.length,4),`${Math.min(state.interests.length,4)} of 4 interests selected`);meter.fig.classList.add('selection-instrument');meter.text.setAttribute('aria-live','polite');panel.append(meter.fig);
  const controls=el('div','row'),targetField=el('div','field'),label=el('label','','What would you like to discover?');label.htmlFor='target-type';const select=document.createElement('select');select.id='target-type';for(const [value,text] of mode.targets){const option=el('option','',text);option.value=value;select.append(option);}targetField.append(label,select);controls.append(targetField);
  let city;if(['travel','events','meetups'].includes(modeName)){const field=el('div','field'),cl=el('label','','City for place results');cl.htmlFor='city';city=document.createElement('input');city.id='city';city.placeholder='For example, Lahore';city.maxLength=100;field.append(cl,city);controls.append(field);}panel.append(controls);
  let discovering=false;const output=el('div','section spaced');output.setAttribute('aria-live','polite');const submit=btn('Find suggestions','button primary',async()=>{
    const selected=[...choices.querySelectorAll('input:checked')].map(x=>state.interests[Number(x.value)]).filter(Boolean);
    if(!selected.length||selected.length>4){clear(output);output.append(empty('Choose one to four interests','You can change your selection before trying again.'));return;}
    clear(output);output.append(el('p','loading','Checking your interests with Qloo…'));output.setAttribute('aria-busy','true');discovering=true;updateSelection();
    try{const data=await requestDiscovery({seeds:selected.map(x=>({title:x.title,qlooType:x.qlooType,...(Number.isInteger(x.year)?{year:x.year}:{})})),target:select.value,city:city?.value?.trim()??''});if(!output.isConnected)return;showDiscovery(output,data);
    }catch(error){if(output.isConnected){clear(output);output.append(empty('Could not find suggestions',error.message));}}finally{if(output.isConnected)output.removeAttribute('aria-busy');discovering=false;updateSelection();}
  });const updateSelection=()=>{const summary=selectionSummary(choices.querySelectorAll('input:checked').length);meter.image.src=`/instrument/count-${summary.frame}.svg`;meter.text.textContent=summary.label;submit.disabled=discovering||!qlooReady||!summary.valid;};choices.addEventListener('change',updateSelection);updateSelection();panel.append(el('p','tip','Results depend on Qloo catalog coverage. For shows with the same name, add the version from our catalog so its year can help identify it.'),submit,output);root.append(panel);
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
function saved(root){root.append(heading('YOUR COLLECTION','Saved for later.','Your saved items are kept in this browser. You can move your collection to another device below.'));if(!state.saved.length){const box=empty('Nothing saved yet','Explore catalogs and save anything that catches your eye.');box.append(link('Explore','button primary','#/explore'));root.append(box);}else{const grid=el('div','cards');for(const item of state.saved)grid.append(card(item));root.append(grid);}root.append(collectionTransfer());}
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
  });find.disabled=!qlooReady;discovery.append(find,suggestions);root.append(discovery);
}
function render({focus=false}={}){
  const [path,query='']=(location.hash.replace(/^#\/?/,'')||'home').split('?'),parts=path.split('/'),route=parts[0],root=$('#app');clear(root);
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(route==='explore')explore(root,parts[1],new URLSearchParams(query).get('q')??'');else if(route==='for-you')forYou(root,parts[1]);else if(route==='group')group(root);else if(route==='saved')saved(root);else if(route==='taste')taste(root);else home(root);updateCounts();const title=root.querySelector('h1')?.textContent??'Find Your Next';document.title=`${title} — Find Your Next`;$('#main').setAttribute('aria-label',title);window.scrollTo(0,0);if(focus)$('#main').focus({preventScroll:true});
}
$('.skip').addEventListener('click',event=>{event.preventDefault();$('#main').focus();});
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());$('#about-close').addEventListener('click',()=>$('#about-dialog').close());window.addEventListener('hashchange',()=>render({focus:true}));
async function init(){qlooReady=await checkDiscoveryAvailability();$('#side-status').textContent=qlooReady?'Taste discovery enabled · service may vary':'Taste discovery unavailable';render();}
init();
