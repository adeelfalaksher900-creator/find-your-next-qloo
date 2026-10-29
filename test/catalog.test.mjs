import test from 'node:test';
import assert from 'node:assert/strict';
import {getCatalog} from '../src/catalog.mjs';

test('anime search only shows shows TVmaze labels Anime', async () => {
  const fetcher=async()=>({ok:true,json:async()=>[
    {show:{id:1,name:'Anime One',genres:['Anime'],url:'https://www.tvmaze.com/shows/1/anime-one',image:null}},
    {show:{id:2,name:'Other Show',genres:['Drama'],url:'https://www.tvmaze.com/shows/2/other',image:null}}
  ]});
  const response=await getCatalog('anime','on',{fetcher});
  assert.deepEqual(response.items.map(x=>x.title),['Anime One']);
  assert.equal(response.items[0].source,'TVmaze');
});

test('retains a show premiere year for matching versions with the same title',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>[{show:{id:1,name:'One Piece',genres:['Anime'],premiered:'1999-10-20'}}]});
  const result=await getCatalog('anime','One Piece',{fetcher});assert.equal(result.items[0].year,1999);
});

test('game offers use CheapShark links and display the actual USD price', async () => {
  const fetcher=async()=>({ok:true,json:async()=>[{gameID:'1',title:'A Game',salePrice:'4.50',dealID:'safe%2Bdeal',thumb:'https://example.com/a.jpg'}]});
  const result=await getCatalog('games','',{fetcher});
  assert.equal(result.items[0].price,'4.50');
  assert.match(result.items[0].url,/^https:\/\/www\.cheapshark\.com\/redirect\?dealID=/);
  assert.equal(result.items[0].image,null);
});

test('duplicate offers for one game display the lowest returned price once', async () => {
  const fetcher=async()=>({ok:true,json:async()=>[
    {gameID:'1',title:'A Game',salePrice:'10.00',dealID:'first'},
    {gameID:'1',title:'A Game',salePrice:'4.50',dealID:'second'}
  ]});
  const result=await getCatalog('games','',{fetcher});
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].price,'4.50');
  assert.match(result.items[0].url,/second/);
});

test('books need a query and preserve Open Library source attribution', async () => {
  const empty=await getCatalog('books',''); assert.equal(empty.requiresQuery,true);
  const fetcher=async()=>({ok:true,json:async()=>({docs:[{key:'/works/OL1W',title:'A Book',author_name:['A Writer'],first_publish_year:2000}]})});
  const result=await getCatalog('books','book',{fetcher});
  assert.equal(result.items[0].url,'https://openlibrary.org/works/OL1W');
  assert.equal(result.items[0].source,'Open Library');
});

test('catalog cards prefer compact covers and preserve the same source artwork as fallback', async () => {
  const tvFetcher=async()=>({ok:true,json:async()=>[{show:{id:3,name:'A Show',genres:['Anime'],image:{original:'https://static.tvmaze.com/uploads/images/original_untouched/1/3.jpg',medium:'https://static.tvmaze.com/uploads/images/medium_portrait/1/3.jpg'}}}]});
  const tv=(await getCatalog('anime','show',{fetcher:tvFetcher})).items[0];
  assert.equal(tv.image,'https://static.tvmaze.com/uploads/images/medium_portrait/1/3.jpg');
  assert.equal(tv.imageFallback,'https://static.tvmaze.com/uploads/images/original_untouched/1/3.jpg');
  const booksFetcher=async()=>({ok:true,json:async()=>({docs:[{key:'/works/OL3W',title:'A Book',cover_i:123}]})});
  const book=(await getCatalog('books','book',{fetcher:booksFetcher})).items[0];
  assert.equal(book.image,'https://covers.openlibrary.org/b/id/123-M.jpg?default=false');
  assert.equal(book.imageFallback,'https://covers.openlibrary.org/b/id/123-L.jpg?default=false');
});

test('game covers prefer the actual provider thumbnail and never request a speculative library hero', async () => {
  const thumb='https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2347080/capsule_231x87.jpg';
  const fetcher=async()=>({ok:true,json:async()=>[
    {gameID:'2',title:'A Game',salePrice:'5',dealID:'one',steamAppID:'2347080',thumb},
    {gameID:'3',title:'Bad ID',salePrice:'5',dealID:'two',steamAppID:'../../bad',thumb:'https://evil.example/image.jpg'}
  ]});
  const [game,bad]=(await getCatalog('games','',{fetcher})).items;
  assert.equal(game.image,thumb);
  assert.equal(game.heroImage,null);
  assert.equal(game.imageFallback,'https://shared.fastly.steamstatic.com/steam/apps/2347080/header.jpg');
  assert.equal(bad.image,null);
  assert.equal(bad.heroImage,null);
});

test('book pages use Open Library pagination and report real totals without a twelve-title cutoff',async()=>{
  const urls=[];
  const fetcher=async value=>{const url=new URL(value);urls.push(url);const page=Number(url.searchParams.get('page'));return {ok:true,json:async()=>({numFound:49,docs:Array.from({length:page===3?1:24},(_,i)=>({key:`/works/OL${(page-1)*24+i+1}W`,title:`Book ${(page-1)*24+i+1}`}))})};};
  const first=await getCatalog('books','books',{fetcher});const second=await getCatalog('books','books',{fetcher,page:1});const last=await getCatalog('books','books',{fetcher,page:2});
  assert.equal(first.items.length,24);assert.equal(first.source,'Open Library');assert.equal(first.total,49);assert.equal(first.hasMore,true);assert.equal(first.nextPage,1);
  assert.equal(second.items[0].id,'openlibrary:/works/OL25W');assert.equal(second.nextPage,2);assert.equal(last.items.length,1);assert.equal(last.hasMore,false);assert.equal(last.nextPage,null);
  assert.deepEqual(urls.map(u=>u.searchParams.get('page')),['1','2','3']);assert.ok(urls.every(u=>u.searchParams.get('limit')==='24'));
});

test('game pages follow the source last-page header and preserve descriptive requests',async()=>{
  const urls=[];
  const fetcher=async(value,options)=>{const url=new URL(value);urls.push(url);assert.match(options.headers['User-Agent'],/FindYourNext/);return {ok:true,headers:{get:name=>name==='x-total-page-count'?'1':null},json:async()=>Array.from({length:24},(_,i)=>({title:`Game ${i}`,gameID:String(i),dealID:`deal-${i}`,salePrice:'2.50'}))};};
  const first=await getCatalog('games','game',{fetcher}),last=await getCatalog('games','game',{fetcher,page:1});
  assert.equal(first.items.length,24);assert.equal(first.hasMore,true);assert.equal(first.nextPage,1);assert.equal(last.hasMore,false);assert.equal(last.nextPage,null);assert.equal(first.total,undefined);
  assert.deepEqual(urls.map(u=>u.searchParams.get('pageNumber')),['0','1']);assert.ok(urls.every(u=>u.searchParams.get('pageSize')==='24'&&u.searchParams.get('title')==='game'));
});

test('TVmaze returns its complete matching search set and does not invent another page',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>Array.from({length:15},(_,i)=>({show:{id:i+1,name:`A Show ${i}`,genres:['Drama']}}))});
  const result=await getCatalog('shows','show',{fetcher});assert.equal(result.items.length,15);assert.equal(result.searchComplete,true);assert.equal(result.hasMore,false);assert.equal(result.nextPage,null);
  await assert.rejects(getCatalog('shows','show',{fetcher,page:1}),e=>e.status===400&&/single search result/.test(e.message));
});

test('pagination rejects invalid bounds and distinguishes the app page boundary from source exhaustion',async()=>{
  const fetcher=async()=>{throw new Error('Must reject before requesting a provider');};
  for(const page of [-1,21,1.5,'1',NaN])await assert.rejects(getCatalog('games','',{fetcher,page}),e=>e.status===400);
  const limited=await getCatalog('books','book',{page:20,fetcher:async()=>({ok:true,json:async()=>({num_found:1000,docs:[{key:'/works/OL100W',title:'A Book'}]})})});
  assert.equal(limited.hasMore,false);assert.equal(limited.pageLimitReached,true);assert.equal(limited.total,1000);
});

test('catalog HTTP handler rejects malformed page values without touching a provider',async()=>{
  const {default:handler}=await import('../api/catalog.js');
  for(const page of ['-1','1.5','21','00','1e1','%20','not-a-page']){
    const response={code:200,setHeader(){},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};
    await handler({method:'GET',url:'/api/catalog?kind=games&page='+page},response);assert.equal(response.code,400);
  }
});

test('production image policy permits Open Library cover redirects', async () => {
  const {readFile}=await import('node:fs/promises');
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  const policy=config.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value;
  const images=policy.split(';').map(x=>x.trim()).find(x=>x.startsWith('img-src '));
  assert.ok(images.includes('https://covers.openlibrary.org'));
  assert.ok(images.split(/\s+/).includes('https://archive.org'));
  assert.ok(images.includes('https://*.us.archive.org'));
});

test('catalog failures give safe and actionable errors', async () => {
  await assert.rejects(getCatalog('games','',{fetcher:async()=>({status:429,ok:false})}),error=>error.status===429&&/rate limit/i.test(error.message));
  await assert.rejects(getCatalog('games','',{fetcher:async()=>{throw new Error('internal secret');}}),error=>error.status===502&&!error.message.includes('internal secret'));
  await assert.rejects(getCatalog('books','Dune',{fetcher:async()=>({ok:true,json:async()=>{throw new Error('invalid JSON');}})}),error=>error.status===502&&/unreadable/i.test(error.message));
  await assert.rejects(getCatalog('anime','Dune',{fetcher:async()=>({ok:true,json:async()=>({unexpected:true})})}),error=>error.status===502&&/unexpected/i.test(error.message));
});
