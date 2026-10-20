import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const origin='http://127.0.0.1:4321';
const server=spawn('./node_modules/.bin/astro',['preview','--host','127.0.0.1','--port','4321'],{stdio:'pipe'});
server.stderr.on('data',v=>process.stderr.write(String(v)));
const pause=n=>new Promise(resolve=>setTimeout(resolve,n));
let browser; let passed=0;
const check=async(label,fn)=>{await fn();passed++;console.log('PASS '+label);};
const navigate=async(page,route)=>{const r=await page.goto(origin+route,{waitUntil:'domcontentloaded'});assert(r?.ok(),'Failed to load '+route);};
const noOverflow=async(page)=>{const [scroll,viewport]=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);assert(scroll<=viewport+2,'Horizontal overflow '+scroll+' > '+viewport);};
try {
 let available=false;
 for(let attempt=0;attempt<90;attempt++){try{available=(await fetch(origin+'/')).ok;}catch{} if(available)break;await pause(350);}
 assert(available,'Astro preview did not start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,colorScheme:width===390?'dark':'light',reducedMotion:width===390?'reduce':'no-preference'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await check('Home '+width,async()=>{await navigate(page,'/');await noOverflow(page);assert(await page.getByText('精选研究成果').count()>0);
   assert((await page.locator('.chips .tag-chip').count())===5,'Original research tags must remain');
   assert((await page.locator('.hero-interests').textContent()).includes('多模态生成'),'Original interests must remain');});
  await check('Projects '+width,async()=>{await navigate(page,'/projects/');await noOverflow(page);assert(await page.getByText('公开研究实现').count()>0);});
  await check('Publications '+width,async()=>{
   await navigate(page,'/publications/');await noOverflow(page);
   assert.equal(await page.locator('.pub-timeline').count(),0,'Redundant timeline must stay removed');
   assert.equal(await page.locator('.paper-entry').count(),await page.locator('.pub-abstract').count(),'Every paper gets the same summary control');
   assert((await page.locator('.paper-no-image').count())>=2,'Papers without figures must retain a card');
   const imageHealth=await page.locator('.paper-image img').evaluateAll(async images=>{
     const outcomes=await Promise.all(images.map(img=>img.decode().then(()=>img.naturalWidth>0).catch(()=>false)));
     return {loaded:outcomes.filter(Boolean).length,total:outcomes.length};
   });
   assert(imageHealth.total>=4 && imageHealth.loaded===imageHealth.total,'Broken publication thumbnail '+JSON.stringify(imageHealth));
   assert.equal(await page.locator('.pub-source').count(),6,'All papers must disclose an auditable summary source');
   const disclosure=page.locator('.pub-abstract').first();await disclosure.locator('summary').click();assert.equal(await disclosure.locator('.pub-brief-row').count(),4);
   const noImageDisclosure=page.locator('.paper-no-image .pub-abstract').first();await noImageDisclosure.locator('summary').click();assert.equal(await noImageDisclosure.locator('.pub-brief-row').count(),4);
  });
  await check('Blog filters '+width,async()=>{
   await navigate(page,'/blog/');await noOverflow(page);
   assert.equal(await page.locator('.cat-filter').getAttribute('role'),'group');
   const button=page.locator('.cat-chip:not([disabled]):not([data-cat="all"])').first();
   if(await button.count()){await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');}
   const articleLink=await page.locator('.post-link').first().getAttribute('href');assert(articleLink);
   await navigate(page,articleLink);await noOverflow(page);assert(await page.locator('.post-body').count()===1,'Blog and Research should use shared reading styles');
  });
  await check('Research comparison '+width,async()=>{
   await navigate(page,'/research/');await noOverflow(page);
   if(width<700){await page.locator('#lit-mobile-folder-toggle').click();await page.locator('#lit-mobile-folder-toggle').click();}
   assert(await page.locator('.lit-compare-pick').count()>=2);
   await page.locator('.lit-compare-pick').nth(0).click();
   await page.locator('.lit-compare-pick').nth(1).click();
   assert.equal(await page.locator('#lit-compare-link').getAttribute('aria-disabled'),'false');
   const href=await page.locator('#lit-compare-link').getAttribute('href');assert(href);
   await navigate(page,href);assert.equal(await page.locator('.compare-chip').count(),2);
   assert(await page.locator('.compare-table tr').count()>=6);await noOverflow(page);
  });
  await check('Long reading and draft '+width,async()=>{
   await navigate(page,'/research/topics/llm-agent-training/reviews/sft-rl-co-training/');
   await noOverflow(page);assert(await page.locator('.katex-display').count()>=4);
   assert.equal(await page.locator('.rkd-prose').count(),1);
   if(width===390)assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),'Reduced motion profile must be active');
   assert.equal(await page.locator('#rkd-personal-note').count(),0);
  });
  await check('Learning route '+width,async()=>{
   await navigate(page,'/research/paths/agent-post-training/');await noOverflow(page);
   assert.equal(await page.locator('[data-learning-step]').count(),7);
   await page.locator('[data-learning-step]').first().check();
   assert((await page.locator('#path-count').textContent()).includes('1 / 7'));
  });
  if(width===390){
   await check('Mobile menu',async()=>{await navigate(page,'/');await page.locator('#mobile-menu-toggle').click();assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'false');});
   await check('No personal notebook UI',async()=>{await navigate(page,'/research/');assert.equal(await page.locator('.lit-backup').count(),0);});
  }
  assert.deepEqual(errors,[],'Runtime errors in '+width+'px');
  await context.close();
 }
 console.log('Browser smoke PASS '+passed+' scenarios');
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill('SIGTERM');}
