const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const assert=require('node:assert/strict');
const base=process.env.FYN_BASE_URL || 'http://127.0.0.1:3000/';
const fixtures={
 anime:{id:'tvmaze:1',title:'One Piece',kind:'anime',qlooType:'tv_show',source:'TVmaze',detail:'Anime · 1999',year:1999,url:'https://www.tvmaze.com/shows/1/example',image:null},
 books:{id:'openlibrary:/works/OL1W',title:'Dune',kind:'book',qlooType:'book',source:'Open Library',detail:'Frank Herbert',url:'https://openlibrary.org/works/OL1W',image:null},
 games:{id:'cheapshark:1',title:'Portal 2',kind:'game',qlooType:'videogame',source:'CheapShark',detail:'PC game · USD',url:'https://www.cheapshark.com/redirect?dealID=one',image:null,price:'3.00'},
 shows:{id:'tvmaze:2',title:'Breaking Bad',kind:'show',qlooType:'tv_show',source:'TVmaze',detail:'Drama',url:'https://www.tvmaze.com/shows/2/example',image:null}
};
(async()=>{
 const browser=await chromium.launch(await require('./browser-runtime.cjs').launchOptions());
 try {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let failCatalog=false;
 await page.route('**/api/catalog**',async route=>{if(failCatalog)return route.abort('failed');const kind=new URL(route.request().url()).searchParams.get('kind');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[fixtures[kind]]})});});
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.hero-search').waitFor();
 assert.equal(await page.locator('.bottom-nav').isVisible(),true);
 await page.locator('#home-search').fill('One Piece');await page.locator('.hero-search button').tap();
 await page.getByRole('button',{name:'Save: One Piece'}).waitFor();await page.getByRole('button',{name:'Save: One Piece'}).tap();
 await page.locator(".bottom-nav a[href='#/saved']").tap();await page.getByRole('heading',{name:'One Piece'}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'One Piece'}).waitFor();
 await page.getByRole('button',{name:'Saved: One Piece'}).tap();await page.getByText('Nothing saved yet').waitFor();
 console.log('PASS mobile touch: search, save, reload, remove');
 await page.goto(base+'#/explore/anime?q=One%20Piece');await page.getByRole('button',{name:'Add interest: One Piece'}).tap();await page.getByRole('button',{name:'Save: One Piece'}).tap();
 await page.goto(base+'#/saved');const downloadWait=page.waitForEvent('download');await page.getByRole('button',{name:'Download collection'}).tap();const download=await downloadWait;
 const exported=await require('node:fs/promises').readFile(await download.path());const portable=JSON.parse(exported.toString());assert.equal(portable.format,'find-your-next');assert.equal(portable.interests.length,1);assert.equal(portable.saved.length,1);assert.equal(portable.group,undefined);
 const other=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),otherPage=await other.newPage();
 await otherPage.route('**/api/catalog**',route=>{const kind=new URL(route.request().url()).searchParams.get('kind');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[fixtures[kind]]})});});
 await otherPage.goto(base+'#/saved');otherPage.once('dialog',dialog=>dialog.accept());await otherPage.getByLabel('Import collection file').setInputFiles({name:'collection.json',mimeType:'application/json',buffer:exported});
 await otherPage.getByText('Imported 2 items. Existing items were kept.').waitFor();await otherPage.getByRole('heading',{name:'One Piece'}).waitFor();await otherPage.reload();await otherPage.getByRole('heading',{name:'One Piece'}).waitFor();
 await otherPage.getByLabel('Import collection file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await otherPage.getByText('This file is not a valid collection.').waitFor();await otherPage.getByRole('heading',{name:'One Piece'}).waitFor();
 const hostile={format:'find-your-next',version:1,interests:[],saved:[{id:'hostile:1',title:'<img src=x onerror=alert(1)>',kind:'book',qlooType:'book',source:'Test',url:'javascript:alert(1)',image:'https://evil.example/image.jpg'}]};
 otherPage.once('dialog',dialog=>dialog.accept());await otherPage.getByLabel('Import collection file').setInputFiles({name:'hostile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(hostile))});
 const hostileCard=otherPage.locator('.item-card').filter({has:otherPage.getByRole('heading',{name:hostile.saved[0].title})});await hostileCard.waitFor();assert.equal(await hostileCard.locator('img[onerror]').count(),0);assert.equal(await hostileCard.getByRole('link',{name:/View source/}).count(),0);
 console.log('PASS hostile import renders text and rejects untrusted URLs');
 await other.close();console.log('PASS collection download and import across isolated browser profiles; invalid file preserves existing items');
 await page.goto(base+'#/explore/games');await page.getByRole('button',{name:'Save: Portal 2',exact:true}).tap();
 await page.goto(base+'#/saved');await page.getByRole('button',{name:'List',exact:true}).tap();
 assert.equal(await page.locator('.library-list .item-card').count(),2);
 await page.reload();await page.locator('.library-list .item-card').first().waitFor();
 assert.equal(await page.getByRole('button',{name:'List',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByLabel('Search your collection').fill('not a saved title');await page.getByText('No matching titles').waitFor();
 await page.getByLabel('Search your collection').fill('');await page.getByLabel('Sort collection').selectOption('title');
 assert.deepEqual(await page.locator('.library-list h3').allTextContents(),['One Piece','Portal 2']);
 await page.getByRole('button',{name:'Grid',exact:true}).tap();assert.equal(await page.locator('.cards .item-card').count(),2);
 console.log('PASS collection list/grid, search, alphabetical sort and saved layout preference');
 await page.locator(".bottom-nav a[href='#/group']").tap();
 await page.locator('#group-games-0').fill('Portal 2, Minecraft');await page.locator('#group-games-1').fill('portal 2, Stardew Valley');
 await page.locator('#group-minutes-0').fill('0');await page.getByRole('button',{name:'Find common games'}).tap();await page.getByText('Check playtime').waitFor();
 await page.locator('#group-minutes-0').fill('90');await page.locator('#group-minutes-1').fill('60');await page.getByRole('button',{name:'Find common games'}).tap();
 await page.getByRole('heading',{name:'Games in common'}).waitFor();assert.match(await page.locator('.result-list').innerText(),/Portal 2/);
 await page.getByRole('button',{name:'Add person'}).tap();await page.locator('#group-games-2').waitFor();await page.getByRole('button',{name:'Remove person'}).tap();
 console.log('PASS mobile touch: group, invalid duration, result, add/remove person');
 await page.locator('.top-action').tap();await page.locator('#manual-title').waitFor();
 const payload='<img src=x onerror="document.body.dataset.redteam=1">';
 await page.locator('#manual-title').fill(payload);await page.locator('.manual-form button[type=submit]').tap();
 await page.getByRole('heading',{name:payload}).waitFor();assert.equal(await page.evaluate(()=>document.body.dataset.redteam),undefined);
 assert.equal(await page.locator('img[onerror]').count(),0);
 console.log('PASS local DOM injection probe: hostile title displayed as text');
 await page.locator('#about-button').tap();await page.locator('#about-dialog[open]').waitFor();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#about-dialog[open]').count(),0);
 console.log('PASS privacy dialog opens and closes with Escape');
 failCatalog=true;await page.locator(".bottom-nav a[href='#/explore']").tap();await page.getByRole('button',{name:'Try again'}).waitFor();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'main');assert.match(await page.title(),/Explore the things you love/);
 failCatalog=false;await page.getByRole('button',{name:'Try again'}).tap();await page.getByRole('heading',{name:'Portal 2'}).waitFor();
 console.log('PASS failure and retry; route updates document title and focus');
 for(const [kind,query,title] of [['anime','One Piece','One Piece'],['books','Dune','Dune'],['shows','Breaking Bad','Breaking Bad']]){
   await page.goto(base+'#/explore/'+kind+'?q='+encodeURIComponent(query));await page.getByRole('heading',{name:title}).waitFor();
 }
 console.log('PASS anime, book and television catalog routes with controlled responses');
 for(const [mode,title] of [['gift','Find a thoughtful gift'],['travel','Plan a more personal trip'],['creators','Explore creators and artists'],['events','Build an event idea'],['meetups','Find a place to gather'],['music','Explore music'],['screen','Find a screen story'],['podcasts','Find a new listen'],['brands','Explore brands']]){
   await page.goto(base+'#/for-you/'+mode);await page.getByRole('heading',{name:title}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Find suggestions'}).isDisabled(),true);
 }
 console.log('PASS all nine unavailable taste modes explain their state and keep discovery disabled');
 await page.goto(base+'#/group');await page.reload();await page.locator('#group-games-0').waitFor();
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>location.hash),'#/group');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
 console.log('PASS keyboard skip link preserves the current page');
 for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:844});
   const size=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
   assert.ok(size.document<=size.viewport+1,'horizontal overflow at '+width+': '+JSON.stringify(size));
 }
 console.log('PASS no document horizontal overflow at 320, 390, 768, 1024, 1440 CSS px');
 assert.deepEqual(errors,[]);console.log('PASS no uncaught page errors during fixture journeys');
 await context.close();
 const discoveryContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const discoveryPage=await discoveryContext.newPage();let providerStatus=200,lastDiscovery=null;const discoveryErrors=[];
 discoveryPage.on('pageerror',error=>discoveryErrors.push(error.message));
 await discoveryPage.route('**/api/catalog**',route=>{const kind=new URL(route.request().url()).searchParams.get('kind');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[fixtures[kind]]})});});
 await discoveryPage.route('**/api/discover',route=>{
   if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true})});
   if(providerStatus!==200)return route.fulfill({status:providerStatus,contentType:'application/json',body:JSON.stringify({error:'Qloo is rate limiting requests. Please wait and retry.'})});
   lastDiscovery=route.request().postDataJSON();const target=lastDiscovery.target;
   const title=target==='book'?'Dune':target==='videogame'?'Stardew Valley':'Breaking Bad';
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({resolved:lastDiscovery.seeds.map(x=>x.title),unresolved:[],items:[{id:'qloo:123e4567-e89b-12d3-a456-426614174002',title,kind:target,qlooType:target,source:'Qloo',detail:'Fixture association',evidence:[lastDiscovery.seeds[0].title]}]})});
 });
 await discoveryPage.goto(base+'#/explore/anime?q=One%20Piece');await discoveryPage.getByRole('button',{name:'Add interest: One Piece'}).tap();
 await discoveryPage.goto(base+'#/for-you');await discoveryPage.locator('#target-type').selectOption('book');await discoveryPage.getByRole('button',{name:'Find suggestions'}).tap();
 await discoveryPage.getByText('Qloo linked this to: One Piece').waitFor();
 assert.equal(lastDiscovery.seeds[0].year,1999);
 assert.equal(await discoveryPage.locator('[aria-live="polite"]').filter({hasText:'Suggestions from Qloo'}).count(),1);
 for(const width of [320,390]){await discoveryPage.setViewportSize({width,height:844});assert.ok(await discoveryPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'result overflow at '+width);}
 await discoveryPage.getByRole('link',{name:'Search book catalog for Dune'}).tap();await discoveryPage.getByRole('heading',{name:'Dune'}).waitFor();
 assert.equal(await discoveryPage.locator('#catalog-query').inputValue(),'Dune');
 await discoveryPage.goto(base+'#/for-you');await discoveryPage.locator('#target-type').selectOption('tv_show');await discoveryPage.getByRole('button',{name:'Find suggestions'}).tap();
 await discoveryPage.getByRole('link',{name:'Search TV catalog for Breaking Bad'}).tap();await discoveryPage.getByRole('heading',{name:'Breaking Bad'}).waitFor();
 await discoveryPage.goto(base+'#/group');await discoveryPage.locator('#group-games-0').fill('Portal 2, Minecraft');await discoveryPage.locator('#group-games-1').fill('Minecraft, Stardew Valley');
 await discoveryPage.getByRole('button',{name:'Find new games together'}).tap();await discoveryPage.getByText('Stardew Valley',{exact:true}).waitFor();
 assert.deepEqual(lastDiscovery.seeds.map(x=>x.title),['Portal 2','Minecraft']);assert.equal(lastDiscovery.target,'videogame');
 assert.equal(await discoveryPage.getByRole('button',{name:'Find PC prices for Stardew Valley'}).isVisible(),true);
 console.log('PASS group taste discovery sends the first game from each person with controlled Qloo responses');
 providerStatus=429;await discoveryPage.goto(base+'#/for-you');await discoveryPage.getByRole('button',{name:'Find suggestions'}).tap();await discoveryPage.getByText('Qloo is rate limiting requests. Please wait and retry.').waitFor();
 assert.deepEqual(discoveryErrors,[]);console.log('PASS mobile discovery results, accessible status, catalog links and rate-limit feedback using simulated Qloo responses');
 await discoveryContext.close();
 } finally {await browser.close();}
})().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1;});
