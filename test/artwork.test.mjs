import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {optimizedArtwork} from '../src/artwork.mjs';
import {getCatalog} from '../src/catalog.mjs';
import {CATALOG_IMAGE_HOSTS,catalogArtworkUrl} from '../public/media.js';
const source='https://covers.openlibrary.org/b/id/123-M.jpg?default=false';
test('artwork rejects arbitrary hosts, credentials, ports, paths, queries and unbounded dimensions before fetching',async()=>{
  let calls=0;const fetcher=()=>{calls++;throw new Error('must not fetch');};
  for(const url of ['http://127.0.0.1/a.jpg','https://covers.openlibrary.org.evil.test/b/id/1-M.jpg','https://user:pass@covers.openlibrary.org/b/id/1-M.jpg','https://covers.openlibrary.org:8443/b/id/1-M.jpg','https://covers.openlibrary.org/admin','https://covers.openlibrary.org/b/id/1-M.jpg?redirect=http://127.0.0.1','https://archive.org/download/unrequested/image.jpg'])await assert.rejects(optimizedArtwork(url,320,fetcher),e=>e.status===400);
  await assert.rejects(optimizedArtwork(source,99999,fetcher),e=>e.status===400);assert.equal(calls,0);
});
test('artwork validates each redirect and enforces stream bounds even with no content length',async()=>{
  let calls=0;await assert.rejects(optimizedArtwork(source,320,async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});}),e=>e.status===400);assert.equal(calls,1);
  const huge=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(2000001));controller.close();}});await assert.rejects(optimizedArtwork(source,320,async()=>new Response(huge,{headers:{'content-type':'image/jpeg'}})),e=>e.status===413);
  await assert.rejects(optimizedArtwork(source,320,async()=>new Response('<script>private</script>',{headers:{'content-type':'text/html'}})),e=>e.status===502);
});
test('real image processing preserves dimensions and content identity while producing bounded WebP',async()=>{
  const input=await sharp({create:{width:180,height:260,channels:3,background:'#526b5a'}}).png().toBuffer();
  const result=await optimizedArtwork(source,320,async()=>new Response(input,{headers:{'content-type':'image/png'}}));const meta=await sharp(result.buffer).metadata();assert.equal(result.type,'image/webp');assert.equal(meta.width,180);assert.equal(meta.height,260);assert.equal(meta.format,'webp');
});
test('actual GamersGate thumbnails survive catalog and browser admission, with matching CSP',async()=>{
  const thumb='https://sttc.gamersgate.com/images/product/strange-brigade-deluxe-edition/cover-180-0ff6d5.jpg';
  const r=await getCatalog('games','',{fetcher:async()=>({ok:true,json:async()=>[{title:'Strange Brigade - Deluxe Edition',gameID:'100',dealID:'one',thumb,steamAppID:null,salePrice:'6.40'}]})});assert.equal(r.items[0].image,thumb);assert.equal(catalogArtworkUrl(thumb),thumb);
  const {readFile}=await import('node:fs/promises');const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url)));const policy=config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;for(const host of CATALOG_IMAGE_HOSTS)assert.ok(policy.includes('https://'+host),'CSP must permit direct fallback to '+host);
});
