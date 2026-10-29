const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const base=process.env.FYN_BASE_URL||'http://127.0.0.1:3000/';
const live=process.env.FYN_CLOUD_BROWSER_LIVE==='yes';
const book={id:'openlibrary:/works/OL1W',title:'Dune',kind:'book',qlooType:'book',source:'Open Library',detail:'Frank Herbert',url:'https://openlibrary.org/works/OL1W',image:null};
(async()=>{
 const browser=await chromium.launch(await require('./browser-runtime.cjs').launchOptions());const contexts=[],records=new Map(),errors=[];let id,token,fixtureOffline=false;
 try{
  async function device(){const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/catalog**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[book]})}));
   await page.route('**/api/collection**',async route=>{const request=route.request(),url=new URL(request.url()),auth=request.headers().authorization;
    assert.equal(url.searchParams.has('key'),false);if(auth){id=url.searchParams.get('id');token=auth.slice(7);assert.equal(url.href.includes(token),false);}
    if(live)return route.continue();if(fixtureOffline)return route.abort('failed');
    const send=(status,data)=>route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(data)});
    if(!url.searchParams.get('id'))return send(200,{configured:true});const rid=url.searchParams.get('id'),record=records.get(rid),input=request.method()==='GET'?null:request.postDataJSON();
    if(request.method()==='PUT'&&!record&&input.expectedRevision===0){const record={token,revision:1,box:input.box};records.set(rid,record);return send(201,record);}
    if(!record||record.token!==token)return send(404,{error:'Collection not found or sync key invalid.'});if(request.method()==='GET')return send(200,record);
    if(input.expectedRevision!==record.revision)return send(409,{error:'Collection changed on another device.'});if(request.method()==='DELETE'){records.delete(rid);return send(204);}
    record.box=input.box;record.revision++;return send(200,record);
   });return page;}
  const a=await device(),b=await device();
  await a.goto(base+'#/taste');await a.locator('#manual-title').fill('Radiohead');await a.locator('.manual-form button').tap();
  await a.goto(base+'#/saved');await a.locator('#cloud-create').waitFor();await a.locator('#cloud-create:not([disabled])').waitFor();await a.locator('#cloud-create').tap();await a.getByText(/Saved to cloud\. Keep your sync key/).waitFor();
  await a.getByRole('button',{name:'Show sync key',exact:true}).tap();const key=await a.locator('#cloud-recovery-key').inputValue();assert.match(key,/^fyn1_/);await a.getByRole('button',{name:'Hide sync key',exact:true}).tap();assert.equal(await a.locator('#cloud-recovery-key').inputValue(),'');
  await b.goto(base+'#/saved');await b.locator('#cloud-key:not([disabled])').waitFor();await b.locator('#cloud-key').fill('invalid');await b.getByRole('button',{name:'Connect',exact:true}).tap();await b.getByText(/Enter the complete sync key/).waitFor();
  await b.locator('#cloud-key').fill(key);await b.getByRole('button',{name:'Connect',exact:true}).tap();await b.getByText('Collection is up to date.',{exact:true}).waitFor();
  await b.goto(base+'#/taste');await b.getByRole('heading',{name:'Radiohead',exact:true}).waitFor();
  await b.goto(base+'#/explore/books?q=Dune');await b.getByRole('button',{name:'Save: Dune',exact:true}).tap();await b.goto(base+'#/saved');await b.locator('#cloud-sync-now:not([disabled])').waitFor();await b.locator('#cloud-sync-now').tap();await b.getByText(/Saved to cloud\.|Collection is up to date\./).waitFor();
  await a.locator('#cloud-sync-now:not([disabled])').waitFor();await a.locator('#cloud-sync-now').tap();await a.getByRole('heading',{name:'Dune',exact:true}).waitFor();
  await a.reload();await a.getByRole('heading',{name:'Dune',exact:true}).waitFor();await a.locator('#cloud-sync-now:not([disabled])').waitFor();
  await a.getByRole('button',{name:'Saved: Dune',exact:true}).tap();await a.getByText('Nothing saved yet',{exact:true}).waitFor();await a.locator('#cloud-sync-now:not([disabled])').waitFor();await a.locator('#cloud-sync-now').tap();await a.getByText(/Saved to cloud\.|Collection is up to date\./).waitFor();
  await b.locator('#cloud-sync-now:not([disabled])').waitFor();await b.locator('#cloud-sync-now').tap();await b.getByText('Nothing saved yet',{exact:true}).waitFor();
  if(!live){fixtureOffline=true;await b.locator('#cloud-sync-now:not([disabled])').waitFor();await b.locator('#cloud-sync-now').tap();await b.getByText(/Cloud sync could not be reached/).waitFor();fixtureOffline=false;await b.locator('#cloud-sync-now:not([disabled])').waitFor();await b.locator('#cloud-sync-now').tap();await b.getByText('Collection is up to date.',{exact:true}).waitFor();}
  for(const page of [a,b])assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  a.once('dialog',dialog=>dialog.accept());await a.getByRole('button',{name:'Delete cloud copy',exact:true}).tap();await a.getByText('Cloud copy deleted. Local items were kept.',{exact:true}).waitFor();id=null;
  await a.goto(base+'#/taste');await a.getByRole('heading',{name:'Radiohead',exact:true}).waitFor();assert.deepEqual(errors,[]);
  console.log('PASS '+(live?'LIVE backend':'controlled backend')+' cloud UI: private key reveal/hide, invalid key, two isolated profiles, saved additions/removals, reload, delete cloud copy with local items retained, mobile layout'+(!live?', offline recovery':''));
 }finally{
  if(live&&id&&token){const current=await fetch(base+'api/collection?id='+id,{headers:{Authorization:'Bearer '+token}});if(current.ok){const data=await current.json();await fetch(base+'api/collection?id='+id,{method:'DELETE',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({expectedRevision:data.revision})});}}
  await Promise.all(contexts.map(c=>c.close()));await browser.close();
 }
})().catch(error=>{console.error('FAIL cloud UI',error.stack||error);process.exitCode=1;});
