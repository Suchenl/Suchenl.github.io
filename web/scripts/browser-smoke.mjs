import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const origin='http://127.0.0.1:4321';
const server=spawn('./node_modules/.bin/astro',['preview','--host','127.0.0.1','--port','4321'],{stdio:'pipe'});
server.stderr.on('data',v=>process.stderr.write(String(v)));
const pause=n=>new Promise(resolve=>setTimeout(resolve,n));
let browser; let passed=0;
const check=async(label,fn)=>{await fn();passed++;console.log('PASS '+label);};
const navigate=async(page,route)=>{const r=await page.goto(origin+route,{waitUntil:'domcontentloaded'});assert(r?.ok(),'Failed to load '+route);};
const noOverflow=async(page)=>{const info=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,6).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,70),right:Math.round(e.getBoundingClientRect().right)}))}));assert(info.width<=info.viewport+2,'Horizontal overflow '+JSON.stringify(info));};
try {
 let available=false;
 for(let attempt=0;attempt<90;attempt++){try{available=(await fetch(origin+'/')).ok;}catch{} if(available)break;await pause(350);}
 assert(available,'Astro preview did not start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 mkdirSync('visual-qa',{recursive:true});
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,colorScheme:width===390?'dark':'light',reducedMotion:width===390?'reduce':'no-preference'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await check('Home '+width,async()=>{await navigate(page,'/');await noOverflow(page);
   if(width<=390){assert.equal(await page.locator('#primary-navigation').isVisible(),false,'Mobile nav should start collapsed');assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'false');}assert(await page.getByText('精选研究成果').count()>0);
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
   assert.equal(await page.locator('.pub-source').count(),await page.locator('.paper-entry').count(),'Every paper must disclose an auditable summary source');
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
   if(await page.locator('[data-reading-toc]').count()){
    const aside=page.locator('[data-reading-toc]');const btn=aside.locator('.reading-toc-toggle');
    if(width===1440){assert((await aside.boundingBox()).x < (await page.locator('.post-body').boundingBox()).x,'Blog left TOC must precede article');await aside.locator('.reading-toc-close').click();assert.equal(await btn.getAttribute('aria-expanded'),'false');await btn.click();assert.equal(await btn.getAttribute('aria-expanded'),'true');}
    else{assert(await btn.isVisible(),'Mobile left TOC toggle must be visible');await btn.click();assert(await aside.locator('.reading-toc-panel').isVisible());await aside.locator('.reading-toc-close').click();}
   }
  });
  await check('Research comparison '+width,async()=>{
   await navigate(page,'/research/');await noOverflow(page);
   if(width<700){await page.locator('#lit-mobile-folder-toggle').click();await page.locator('#lit-mobile-folder-toggle').click();}
   assert(await page.locator('.lit-compare-pick').count()>=2);
   await page.locator('.lit-compare-pick').nth(0).click();
   await page.locator('.lit-compare-pick').nth(1).click();
   assert.equal(await page.locator('#lit-compare-link').getAttribute('aria-disabled'),'false');
   const href=await page.locator('#lit-compare-link').getAttribute('href');assert(href);
   await navigate(page,href);
   assert.equal(await page.locator('.compare-selected').count(),2,'Selected papers');
   assert.equal(await page.locator('.compare-dimension').count(),5,'Five readable dimensions');
   assert.equal(await page.locator('.compare-evidence-card').count(),10,'Two cards per dimension');
   await noOverflow(page);
   await navigate(page,'/research/compare/?papers=papers/2025/deepseek-r1,papers/2026/relift');
   assert.equal(await page.locator('.compare-selected').count(),2);
   assert.equal(await page.locator('#compare-results[hidden]').count(),1,'No results panel when search is empty');
   assert(await page.locator('.compare-suggest').count()>=5,'Quick-pick acronyms visible without typing');
   assert(await page.locator('.compare-suggestions').isVisible(),'Quick-picks must be visible initially');
   await page.screenshot({path:'visual-qa/compare-'+width+'.png',fullPage:true});
   await page.locator('#compare-search').fill('brIdGe');
   assert((await page.locator('.compare-option-abbr').allTextContents()).some(x=>x.toLowerCase()==='bridge'),'Acronym search case insensitive');
   await page.locator('.compare-option').first().click();
   assert.equal(await page.locator('.compare-selected').count(),3);
   await noOverflow(page);
   if(width===1440)await page.screenshot({path:'visual-qa/compare-3papers-desktop.png',fullPage:true});
  });
  await check('Acronym search and R1 article '+width,async()=>{
   await navigate(page,'/research/');
   await page.locator('#lit-search').fill('r1-zero');
   assert((await page.locator('.row-title').allTextContents()).some(t=>t.includes('DeepSeek-R1')),'Alias R1-Zero must search R1');
   await page.locator('#lit-search').fill('BRIDGE');
   assert((await page.locator('.lit-short-name').allTextContents()).some(t=>t==='BRIDGE'),'Canonical acronym searchable');
   await navigate(page,'/research/papers/2025/deepseek-r1/');
   assert.equal(await page.locator('.rkd-short-name').innerText(),'DeepSeek-R1');
   assert((await page.getByText('804,745',{exact:false}).count())>0,'R1 data composition');
   assert((await page.locator('.katex-display').count())>=2,'R1 mathematical display');
   await noOverflow(page);
  });
  await check('Long-form Research reader '+width,async()=>{
   await navigate(page,'/research/topics/llm-agent-training/reviews/sft-rl-co-training/');
   await noOverflow(page);assert(await page.locator('.katex-display').count()>=4);
   assert.equal(await page.locator('.rkd-prose').count(),1);
   const toc=page.locator('[data-reading-toc]');assert.equal(await toc.count(),1,'Research has shared left TOC');
   if(width===1440){assert((await toc.boundingBox()).x < (await page.locator('.rkd-prose').boundingBox()).x,'Research TOC should be left');
    const first=page.locator('.reading-toc-link').first();await first.click();await page.waitForTimeout(300);assert.equal(await first.getAttribute('aria-current'),'location','Active section should update');
    await toc.locator('.reading-toc-close').click();assert.equal(await toc.locator('.reading-toc-toggle').getAttribute('aria-expanded'),'false');}
   else{await toc.locator('.reading-toc-toggle').click();assert(await toc.locator('.reading-toc-panel').isVisible());await page.keyboard.press('Escape');assert(!(await toc.locator('.reading-toc-panel').isVisible()));}
   if(width===390)assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),'Reduced motion profile must be active');
   assert.equal(await page.locator('#rkd-personal-note').count(),0);
  });
  await check('Pretraining topic and privacy '+width,async()=>{
   await navigate(page,'/research/topics/pretraining/reviews/pretraining-engineering-roadmap/');await noOverflow(page);
   assert(await page.getByText('预训练工程完整路线',{exact:false}).count()>0);
   await navigate(page,'/research/topics/agent-reasoning/reviews/cot-tool-use-and-thinking-scheduling/');
   const txt=await page.locator('.rkd-prose').innerText();
   for(const secret of ['local-workbench','model_bridge.py','model_bridge.log'])assert(!txt.includes(secret),'Public topic exposes private workbench details: '+secret);
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
