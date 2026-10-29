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

test('catalogs prefer high-resolution covers and preserve a trusted fallback', async () => {
  const tvFetcher=async()=>({ok:true,json:async()=>[{show:{id:3,name:'A Show',genres:['Anime'],image:{original:'https://static.tvmaze.com/uploads/images/original_untouched/1/3.jpg',medium:'https://static.tvmaze.com/uploads/images/medium_portrait/1/3.jpg'}}}]});
  const tv=(await getCatalog('anime','show',{fetcher:tvFetcher})).items[0];
  assert.equal(tv.image,'https://static.tvmaze.com/uploads/images/original_untouched/1/3.jpg');
  assert.equal(tv.imageFallback,'https://static.tvmaze.com/uploads/images/medium_portrait/1/3.jpg');
  const booksFetcher=async()=>({ok:true,json:async()=>({docs:[{key:'/works/OL3W',title:'A Book',cover_i:123}]})});
  const book=(await getCatalog('books','book',{fetcher:booksFetcher})).items[0];
  assert.equal(book.image,'https://covers.openlibrary.org/b/id/123-L.jpg');
  assert.equal(book.imageFallback,'https://covers.openlibrary.org/b/id/123-M.jpg');
});

test('game covers use a numeric Steam app id with the provider thumbnail as fallback', async () => {
  const thumb='https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2347080/capsule_231x87.jpg';
  const fetcher=async()=>({ok:true,json:async()=>[
    {gameID:'2',title:'A Game',salePrice:'5',dealID:'one',steamAppID:'2347080',thumb},
    {gameID:'3',title:'Bad ID',salePrice:'5',dealID:'two',steamAppID:'../../bad',thumb:'https://evil.example/image.jpg'}
  ]});
  const [game,bad]=(await getCatalog('games','',{fetcher})).items;
  assert.equal(game.image,'https://cdn.cloudflare.steamstatic.com/steam/apps/2347080/header.jpg');
  assert.equal(game.heroImage,'https://cdn.cloudflare.steamstatic.com/steam/apps/2347080/library_hero.jpg');
  assert.equal(game.imageFallback,thumb);
  assert.equal(bad.image,null);
  assert.equal(bad.heroImage,null);
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
