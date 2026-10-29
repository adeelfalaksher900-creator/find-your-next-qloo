// Live smoke test: makes Qloo requests and consumes the configured quota.
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const assert=require('node:assert/strict');
const base=process.env.FYN_BASE_URL || 'https://find-your-next-qloo.vercel.app/';
if(process.env.FYN_LIVE_TEST!=='yes'){console.error('Set FYN_LIVE_TEST=yes to run the live quota-consuming browser check.');process.exit(1);}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.hero-search').waitFor({timeout:20000});
  const status=await page.request.get(new URL('/api/discover',base).href);assert.equal((await status.json()).configured,true);
  await page.locator('#home-search').fill('One Piece');await page.locator('.hero-search button').tap();
  await page.getByRole('button',{name:'Add interest: One Piece'}).first().waitFor({timeout:20000});await page.getByRole('button',{name:'Add interest: One Piece'}).first().tap();
  await page.locator(".bottom-nav a[href='#/for-you']").tap();await page.locator('#target-type').selectOption('videogame');await page.getByRole('button',{name:'Find suggestions'}).tap();
  await page.getByRole('heading',{name:'Suggestions from Qloo'}).waitFor({timeout:60000});
  assert.match(await page.locator('#app').innerText(),/One Piece \(1999\)/);assert.ok(await page.locator('.result-list .result-item').count()>0);
  console.log('PASS live anime-to-games: Qloo used the 1999 TVmaze title and returned suggestions');
  await page.locator(".bottom-nav a[href='#/group']").tap();await page.locator('#group-games-0').fill('Portal 2, Minecraft');await page.locator('#group-games-1').fill('Minecraft, Stardew Valley');
  await page.getByRole('button',{name:'Find new games together'}).tap();await page.getByRole('heading',{name:'Suggestions from Qloo'}).waitFor({timeout:60000});
  assert.match(await page.locator('#app').innerText(),/Based on: Portal 2, Minecraft/);assert.ok(await page.locator('.result-list .result-item').count()>0);
  assert.equal(await page.getByRole('button',{name:/Find PC prices for /}).first().isVisible(),true);
  for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+width);}
  assert.deepEqual(errors,[]);console.log('PASS live mobile group suggestions, price action and responsive width; no uncaught page errors');
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error('FAIL',error.stack||error);process.exitCode=1;});
