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
   if(width<=390){assert.equal(await page.locator('#primary-navigation').isVisible(),false,'Mobile nav should start collapsed');assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'false');}assert(await page.getByText('精选研究产出').count()>0);
   assert((await page.locator('.chips .tag-chip').count())===5,'Original research tags must remain');
   assert((await page.locator('.hero-interests').textContent()).includes('多模态生成'),'Original interests must remain');});
  await check('Experience navigation and unpublished Expertise '+width,async()=>{
   const nav=page.locator('#primary-navigation');
   const experience=nav.locator('a[href="/work/"]');
   assert.equal(await nav.locator('a[href="/about/"]').count(),0,'About should not remain a navigation item');
   assert.equal(await experience.count(),1,'Experience should be a main navigation item');
   assert.equal(await nav.locator('a[href="/expertise/"]').count(),0,'Expertise should not remain in main navigation');
   await navigate(page,'/');
   assert.equal(await page.locator('a[href="/expertise/"]').count(),0,'Homepage must not link to hidden Expertise');
   assert.equal(await page.locator('.home-profile-path > a[href="/work/"]').count(),1,'Homepage retains Experience link');
   await navigate(page,'/work/');
   assert.equal(await experience.getAttribute('aria-current'),'page');
   await noOverflow(page);
   if(width===1440){
    const response=await page.goto(origin+'/expertise/',{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),404,'Expertise must not be a published page');
   }
  });
  await check('Real Knowledge constellation and smooth exploration '+width,async()=>{
   await navigate(page,'/knowledge/');await noOverflow(page);
   if(width===1440)await page.screenshot({path:'visual-qa/knowledge-atlas-overview-initial.png',fullPage:true});
   assert.equal(await page.locator('.kn-overview-panel').count(),4,'Each active area has an overview region');
   assert.equal(await page.locator('#kn-svg').count(),1,'Source-backed constellation is visible');
   const graph=JSON.parse(await page.locator('#kn-data').textContent());
   assert(graph.stats.documents>35 && graph.stats.areas>=3 && graph.stats.links>0,'Graph uses real published articles and links');
   assert.equal(graph.nodes.some(node=>node.id.startsWith('planned:')),false,'No speculative nodes may be rendered');
   assert(graph.nodes.every(node=>node.kind==='area'||node.id.startsWith('doc:')),'Every node must be an area with articles or an actual Markdown note');
   assert.equal(await page.locator('.kn-node').count(),graph.nodes.length,'Rendered graph exactly matches source data');
   const overviewCount=await page.locator('.kn-node:not(.is-hidden)').count();
   assert(overviewCount<graph.nodes.length && overviewCount>=graph.stats.areas,
    'Overview hides low-priority details without removing published notes');
   assert.equal(await page.locator('button[data-kn-view="overview"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('.kn-node.is-key').count(),graph.nodes.filter(n=>n.featured&&n.kind==='document').length,'SSR overview and client choose the same real notes');
   assert.equal(await page.locator('.kn-edge-belongs_to:not(.is-hidden)').count()>0,true,'Overview uses a few real domain-assignment edges');
   assert.equal(await page.locator('[data-kn-filter="empty"]').count(),0,'No empty-theme filter');
   assert((await page.locator('.kn-node-topic').count())>=3,'Actual topic overview files become nodes');
   await page.locator('#kn-search').fill('深度');
   assert((await page.locator('.kn-search-option').count())>=1,'Search offers clickable source-backed results');
   assert((await page.locator('.kn-node:not(.is-hidden):not(.is-dim)').count())>=1,'Search keeps visible relevant areas/topics');
   await page.locator('#kn-search').fill('');
   await page.locator('button[data-kn-view="all"]').click();
   assert.equal(await page.locator('.kn-node:not(.is-hidden)').count(),graph.nodes.length,'Full-network lens reveals all real nodes');
   await page.locator('button[data-kn-view="overview"]').click();
   assert.equal(await page.locator('.kn-node:not(.is-hidden)').count(),overviewCount,'Returning to overview restores progressive disclosure');
   await page.locator('#kn-reset').click();
   const world=page.locator('#kn-world');
   await page.locator('#kn-zoom-in').click();
   await page.waitForTimeout(240);
   assert.notEqual(await world.getAttribute('transform'),'translate(0.000 0.000) scale(1.0000)','Zoom moves the camera');
   await page.locator('#kn-reset').click();
   await page.waitForTimeout(240);
   await page.locator('[data-node-id="doc:topics/robot-control/README"]').focus();
   await page.keyboard.press('Enter');
   assert((await page.locator('#kn-detail-title').innerText()).includes('机器人控制'),'Keyboard focus opens actual knowledge');
   assert((await page.locator('#kn-sources a[href="/research/topics/robot-control/"]').count())===1,'Original topic link preserved');
   assert(await page.locator('#kn-back').isVisible(),'Local lens provides a return path');
   assert((await page.locator('#kn-connections .kn-connection-item').count())>=1,'Inspector lists source-backed relations');
   assert((await page.locator('#kn-connections .kn-connection-source').count())>=1,'Relations expose a real source link');
   assert(await page.locator('#kn-ai-prompt').isVisible(),'AI deep-dive task is available on real notes');
   await page.locator('#kn-studied').click();
   assert.equal(await page.locator('#kn-detail-progress').innerText(),'已学习','Study mark is independent of published content');
   assert.equal(await page.locator('.kn-node.is-studied').count(),1,'Study mark highlights one actual note');
   await page.locator('[data-kn-filter="paper"]').click();
   assert.equal(await page.locator('[data-kn-filter="paper"]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-kn-filter="all"]').click();
   await page.locator('#kn-close').click();
   assert.equal(await page.locator('#kn-inspector').isVisible(),false,'Details dismiss without navigating away');
   await page.locator('[data-kn-select="area:robotics"]').click();
   assert((await page.locator('.kn-node:not(.is-hidden)').count())>4,'Area view expands real documents');
   assert((await page.locator('#kn-detail-title').innerText()).includes('机器人'),'Area expansion opens a real domain');
   await page.locator('#kn-back').click();
   assert.equal(await page.locator('.kn-node:not(.is-hidden)').count(),overviewCount,'Back returns to overview');
   await noOverflow(page);
   if(width===1440)await page.screenshot({path:'visual-qa/knowledge-atlas-desktop.png',fullPage:true});
  });
  await check('Open research Questions '+width,async()=>{
   await navigate(page,'/');
   assert.equal(await page.locator('#primary-navigation a[href="/knowledge/"]').count(),1,'Knowledge is a primary navigation entry');
   assert.equal(await page.locator('#primary-navigation a[href="/questions/"]').count(),0,'Questions has moved to Research secondary navigation');
   assert.equal(await page.locator('.home-question-card').count(),2,'Homepage should show two curated public question teasers');
   assert.equal(await page.locator('.question-evidence-chip').count(),0,'Full evidence belongs in the Research article rather than the homepage');
   await navigate(page,'/questions/'); await noOverflow(page);
   assert.equal(await page.locator('#primary-navigation a[href="/knowledge/"]').getAttribute('aria-current'),'page');
   assert.equal(await page.locator('.section-nav a[href="/questions/"]').getAttribute('aria-current'),'page');
   assert((await page.locator('.question-entry').count())>=1,'Published questions and interests should be listed');
   const target=page.locator('.question-entry h2 a[href*="action-sampling-frequency-bias"]');
   assert.equal(await target.count(),1,'Canonical robot-frequency note should remain visible in Questions index');
   const href=await target.getAttribute('href');
   await navigate(page,href); await noOverflow(page);
   assert((await page.locator('.rkd-prose').innerText()).includes('Chronos Policy'),'Full research note is readable');
  });
  await check('Robot control topic / short route '+width,async()=>{
   await navigate(page,'/research/topics/robot-control/');
   const articleText=await page.locator('.rkd-prose').innerText();
   assert(articleText.includes('阻抗控制') && articleText.includes('Wrench'),'Control article did not render');
   assert.equal(await page.locator('img[src*="spring-damper.svg"]').count(),1,'Spring-damper diagram missing');
   await noOverflow(page);
  });
  await check('Projects '+width,async()=>{
   await navigate(page,'/projects/');await noOverflow(page);
   assert(await page.getByText('公开研究实现').count()>0);
   const research=page.locator('.research-proj').filter({hasText:'VMem-Bench'});
   assert.equal(await research.count(),1,'VMem-Bench should appear once as a public research implementation');
   assert.equal(await research.locator('a[href="https://github.com/Suchenl/VMem-Bench"]').count(),1,'Project code link');
   assert.equal(await research.locator('a[href="https://arxiv.org/abs/2610.35001"]').count(),1,'Project paper link');
   assert.equal(await research.locator('a[href="https://huggingface.co/datasets/Suchenl/VMem-Bench"]').count(),1,'Project data link');
  });
  await check('Publications '+width,async()=>{
   await navigate(page,'/publications/');await noOverflow(page);
   assert.equal(await page.locator('.pub-timeline').count(),0,'Redundant timeline must stay removed');
   const newPaper=page.locator('.paper-entry').filter({hasText:'More Memory, Better Videos?'});
   assert.equal(await newPaper.count(),1,'VMem-Bench preprint should be listed once');
   assert.equal(await newPaper.locator('h3 a[href="https://arxiv.org/abs/2610.35001"]').count(),1,'arXiv paper title link should be present');
   assert.equal(await newPaper.locator('.paper-links a.repo-link[href="https://github.com/Suchenl/VMem-Bench"]').count(),1,'GitHub code link should be present');
   assert.equal(await page.locator('.paper-entry').count(),await page.locator('.pub-abstract').count(),'Every paper gets the same summary control');
   assert.equal(await page.locator('.paper-takeaway').count(),await page.locator('.paper-entry').count(),'All papers show a concise takeaway');
   assert((await page.locator('.paper-takeaway').first().innerText()).length>25,'Takeaway must provide substance at first glance');
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
    if(width===1440){
     const rail=await aside.boundingBox();
     const before=await page.locator('.post-body').boundingBox();
     assert(rail.x<=48,'Blog chapter rail must be near viewport left: '+rail.x);
     assert(rail.x<before.x,'Blog left TOC must precede article');
     await aside.locator('.reading-toc-close').click();
     assert.equal(await btn.getAttribute('aria-expanded'),'false');
     const after=await page.locator('.post-body').boundingBox();
     assert(Math.abs(before.x-after.x)<=2,'Collapsing Blog TOC should not shift the article');
     await btn.click();assert.equal(await btn.getAttribute('aria-expanded'),'true');
    }
    else{assert(await btn.isVisible(),'Mobile left TOC toggle must be visible');await btn.click();assert(await aside.locator('.reading-toc-panel').isVisible());await aside.locator('.reading-toc-close').click();}
   }
  });
  await check('Research comparison '+width,async()=>{
   await navigate(page,'/research/');await noOverflow(page);
   if(width<700){await page.locator('#lit-mobile-folder-toggle').click();await page.locator('#lit-mobile-folder-toggle').click();}
   await page.locator('[data-type="paper"]').click();
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
  await check('Research area-first navigation '+width,async()=>{
    await navigate(page,'/research/');await noOverflow(page);
    assert.equal(await page.locator('.research-area-card').count(),4,'Four canonical research areas');
    await navigate(page,'/research/domains/robotics/');await noOverflow(page);
    assert((await page.locator('.ra-topics a[href="/research/topics/robot-control/"]').count())>=1,'Robotics area should link to existing control topic');
    await navigate(page,'/outputs/');await noOverflow(page);
    assert.equal(await page.locator('.section-nav a[href="/outputs/"]').getAttribute('aria-current'),'page');
    assert((await page.locator('a[href="/publications/"]').count())>=1,'Outputs link to publications');
  });
  await check('Research domains and typed Q&A '+width,async()=>{
   await navigate(page,'/research/');await noOverflow(page);
   assert.equal(await page.locator('[data-type="qa"]').count(),1,'Technical Q&A must have an explicit filter');
   if(width<700)await page.locator('#lit-mobile-folder-toggle').click();
   await page.locator('[data-path="domain:大模型与强化学习"]').click();
   assert((await page.locator('#lit-crumb').innerText()).includes('大模型与强化学习'));
   await page.locator('[data-type="qa"]').click();
   assert((await page.locator('.row-title').allTextContents()).some(t=>t.includes('OPD')),'OPD appears in domain Q&A');
   assert((await page.locator('.row-title').allTextContents()).some(t=>t.includes('Agent')),'Agent protocol Q&A shares domain view');
   const href=await page.locator('.row-title a').first().getAttribute('href');
   assert(href?.includes('type=qa'),'Reader links must preserve content-type selection');
   await navigate(page,href);
   assert((await page.locator('#research-return').getAttribute('href')).includes('type=qa'),'Return navigation restores type filter');
   await noOverflow(page);
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
   if(width===1440){
    const rail=await toc.boundingBox();
    assert(rail.x<=48,'Research chapter rail must be near viewport left: '+rail.x);
    assert(rail.x<(await page.locator('.rkd-prose').boundingBox()).x,'Research TOC should be left');
    const first=page.locator('.reading-toc-link').first();await first.click();await page.waitForTimeout(300);assert.equal(await first.getAttribute('aria-current'),'location','Active section should update');
    const current=page.locator('.reading-toc-location');assert((await current.textContent()).includes('阅读位置'),'Outline gives section progress');
    // Scroll the DOCUMENT, rather than clicking a TOC item. The outline itself
    // should follow the active section, without jumping the main reading page.
    const items=toc.locator('.reading-toc-link');
    const targetIndex=Math.min(10,(await items.count())-2);
    if(targetIndex>2){
      const anchor=await items.nth(targetIndex).getAttribute('href');
      await page.evaluate(id=>{document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});},anchor.slice(1));
      await page.waitForTimeout(250);
      assert.equal(await items.nth(targetIndex).getAttribute('aria-current'),'location','Current outline should follow document scrolling');
      const geometry=await page.evaluate(()=>{
       const nav=document.querySelector('.reading-toc-links'),a=document.querySelector('.reading-toc-link.is-current'),panel=document.querySelector('.reading-toc');
       const nr=nav.getBoundingClientRect(),ar=a.getBoundingClientRect(),pr=panel.getBoundingClientRect();
       return {visible:ar.top>=nr.top-2 && ar.bottom<=nr.bottom+2,sticky:pr.top>=70&&pr.top<130};
      });
      assert(geometry.visible,'Active outline item should be visible after scrolling '+JSON.stringify(geometry));
      assert(geometry.sticky,'Outline should follow reading viewport '+JSON.stringify(geometry));
    }
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
  await check('Paper Notes portal '+width,async()=>{
    await navigate(page,'/paper-notes/');await noOverflow(page);
    assert.equal(await page.locator('#primary-navigation a[href="/knowledge/"]').getAttribute('aria-current'),'page');
     assert.equal(await page.locator('.section-nav a[href="/paper-notes/"]').getAttribute('aria-current'),'page');
    const cards=page.locator('.pn-item');
    assert((await cards.count())>=15,'The independent portal should reuse the canonical paper collection');
    await page.locator('#pn-search').fill('HIL-SERL');
    assert(await page.locator('.pn-item:not([hidden])').count()>=1,'Paper search should return HIL-SERL');
    await page.locator('#pn-depth').selectOption('note');
    assert.equal(await page.locator('.pn-item:not([hidden])').count(),0,'Depth filter should exclude deep paper');
    await page.locator('#pn-reset').click();
    assert.equal(await page.locator('.pn-item:not([hidden])').count(),await cards.count());
    await noOverflow(page);
  });
  await check('Paper Notes reading modes and answers '+width,async()=>{
    await navigate(page,'/research/papers/2024/hil-serl/?source=paper-notes');await noOverflow(page);
    const modes=page.locator('[data-paper-reading-modes]');
    assert(await modes.count()===1,'Paper reading modes must appear on paper detail');
    assert.equal(await page.locator('#research-return').getAttribute('href'),'/paper-notes/');
    await modes.locator('[data-reading-mode="overview"]').click();
    assert(await page.locator('#pn-mode-overview').isVisible());
    assert((await page.locator('#pn-mode-overview a').count())>0,'Overview must link to real headings');
    await modes.locator('[data-reading-mode="evidence"]').click();
    assert(await page.locator('#pn-mode-evidence').isVisible());
    assert((await page.locator('#pn-mode-evidence a').count())>0,'Evidence lens must link to paper content');
    await modes.locator('[data-reading-mode="full"]').click();
    assert.equal(await page.locator('[data-reading-mode="full"]').getAttribute('aria-pressed'),'true');
    assert(!(await page.locator('#pn-mode-evidence').isVisible()));
    const selftest=page.locator('.rkd-prose details').filter({has:page.locator('summary:text("问题 1")')}).first();
    assert(await page.locator('.rkd-prose details').count()>=3,'Deep sample must contain 3 self checks');
    assert((await page.locator('.rkd-prose').innerText()).includes('阅读前的核心概念'));
    await noOverflow(page);
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
