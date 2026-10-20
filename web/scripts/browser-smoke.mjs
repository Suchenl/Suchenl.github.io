import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const origin='http://127.0.0.1:4321';
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4321'],{stdio:'pipe'});
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
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await check('Home '+width,async()=>{await navigate(page,'/');await noOverflow(page);assert(await page.getByText('精选研究成果').count()>0);});
  await check('Projects '+width,async()=>{await navigate(page,'/projects/');await noOverflow(page);assert(await page.getByText('公开研究实现').count()>0);});
  await check('Publications '+width,async()=>{
   await navigate(page,'/publications/');await noOverflow(page);
   const trigger=page.locator('.paper-zoom').first();await trigger.click();
   assert(await page.locator('#lightbox').isVisible());
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'lightbox-close');
   await page.keyboard.press('Escape');
   assert(!(await page.locator('#lightbox').isVisible()));
   assert(await trigger.evaluate(el=>el===document.activeElement));
  });
  await check('Blog filters '+width,async()=>{
   await navigate(page,'/blog/');await noOverflow(page);
   assert.equal(await page.locator('.cat-filter').getAttribute('role'),'group');
   const button=page.locator('.cat-chip:not([disabled]):not([data-cat="all"])').first();
   if(await button.count()){await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');}
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
   await page.locator('#rkd-personal-note summary').click();
   await page.locator('#rkd-personal-input').fill('Sample question for browser check');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#rkd-personal-note summary').click();
   assert((await page.locator('#rkd-personal-input').inputValue()).includes('Sample question'));
  });
  await check('Learning route '+width,async()=>{
   await navigate(page,'/research/paths/agent-post-training/');await noOverflow(page);
   assert.equal(await page.locator('[data-learning-step]').count(),7);
   await page.locator('[data-learning-step]').first().check();
   assert((await page.locator('#path-count').textContent()).includes('1 / 7'));
  });
  if(width===390){
   await check('Mobile menu',async()=>{await navigate(page,'/');await page.locator('#mobile-menu-toggle').click();assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'false');});
   await check('Research backup',async()=>{
    await navigate(page,'/research/');await page.locator('.lit-backup summary').click();
    const pending=page.waitForEvent('download');await page.locator('#lit-backup-export').click();
    const downloaded=await pending;const saved=await downloaded.path();assert(saved);
    const data=JSON.parse(readFileSync(saved,'utf8'));assert.equal(data.format,'suchenl-research-backup');
    assert(Object.keys(data.entries).some(key=>key.startsWith('research-personal-note-v1:')));
    page.on('dialog',d=>d.accept());
    await page.locator('#lit-backup-input').setInputFiles(saved);
    await page.waitForFunction(()=>document.getElementById('lit-backup-status')?.textContent?.includes('导入成功'));
   });
  }
  assert.deepEqual(errors,[],'Runtime errors in '+width+'px');
  await context.close();
 }
 console.log('Browser smoke PASS '+passed+' scenarios');
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill('SIGTERM');}
