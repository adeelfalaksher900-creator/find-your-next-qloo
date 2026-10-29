const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const axePath=process.env.AXE_CORE_PATH||require.resolve('axe-core/axe.min.js');
const base=process.env.FYN_BASE_URL||'http://127.0.0.1:3000/';
(async()=>{const browser=await chromium.launch(await require('./browser-runtime.cjs').launchOptions());let violations=false;
 try{for(const width of [390,1440]){const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),page=await context.newPage();let record;
  await page.route('**/api/collection**',route=>{const request=route.request(),id=new URL(request.url()).searchParams.get('id');if(!id)return route.fulfill({json:{configured:true}});if(request.method()==='GET')return route.fulfill({json:record});const input=request.postDataJSON();record={revision:1,box:input.box};return route.fulfill({status:201,json:record});});
  async function check(state){await page.addScriptTag({path:axePath});const out=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};});if(out.violations.length)violations=true;console.log(JSON.stringify({width,route:state,...out}));}
  await page.goto(base+'#/saved');await page.locator('#cloud-create:not([disabled])').waitFor();await check('cloud-connect');
  await page.locator('#cloud-key').fill('invalid');await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByText(/Enter the complete sync key/).waitFor();await check('cloud-error');
  await page.locator('#cloud-create').click();await page.getByText(/Saved to cloud\. Keep your sync key/).waitFor();await check('cloud-connected');
  await page.getByRole('button',{name:'Show sync key',exact:true}).click();await check('cloud-key-revealed');
  await page.locator('#about-button').click();await check('privacy-dialog-after-cloud');await context.close();
 }}finally{await browser.close();}if(violations)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
