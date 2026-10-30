// Isolated UI regression: delayed configuration responses, no provider calls.
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const assert=require('node:assert/strict');
const base=process.env.FYN_BASE_URL||'http://127.0.0.1:3000/';
(async()=>{const browser=await chromium.launch(await require('./browser-runtime.cjs').launchOptions());
 try{for(const configured of [true,false])for(const route of ['home','group','for-you']){
  const context=await browser.newContext(),page=await context.newPage();let release;
  const pending=new Promise(resolve=>release=resolve);
  await page.route('**/api/discover',async request=>{await pending;return request.fulfill({json:{configured}});});
  await page.route('**/api/catalog**',request=>request.fulfill({json:{items:[],requiresQuery:true}}));
  await page.goto(base+'#/'+route,{waitUntil:'domcontentloaded'});
  const notice=page.locator('[data-qloo-notice]');await notice.waitFor();
  assert.match(await notice.innerText(),/Checking taste discovery/,'pending must not be reported as unavailable');
  let input;if(route==='home')input=page.locator('#home-search');if(route==='group')input=page.locator('#group-games-0');
  if(input)await input.fill('Keep this typed value');
  release();await page.waitForFunction(expected=>document.querySelector('#side-status').textContent===(expected?'Discover from your interests':'Taste discovery unavailable'),configured);
  if(configured)assert.equal(await notice.isVisible(),false,'ready must clear the initial notice');
  else{assert.equal(await notice.isVisible(),true);assert.match(await notice.innerText(),/temporarily unavailable/);}
  if(input)assert.equal(await input.inputValue(),'Keep this typed value');
  if(route==='group')assert.equal(await page.getByRole('button',{name:'Find new games together',exact:true}).isEnabled(),configured);
  await context.close();
 }
 console.log('PASS six delayed-readiness journeys: home, group, discovery; truthful pending/ready/unconfigured notices and typed input preserved.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
