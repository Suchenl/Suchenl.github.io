import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root='dist';
let failures=0;
function check(cond,label) {
  if(!cond){console.error('FAIL:',label);failures++;}
  else console.log('PASS:',label);
}
function page(route){
  const file=join(root,route,'index.html');
  check(existsSync(file),'route /'+route+'/');
  return existsSync(file) ? readFileSync(file,'utf8') : '';
}
const home=page('');
const blog=page('blog');
const questions=page('questions');
const questionDetail=page('research/research/action-sampling-frequency-bias');
const numberContinuityDetail=page('research/research/do-tokenizers-preserve-numerical-continuity');
// Guard route generation for public topic README pages.
const robotControl=page('research/topics/robot-control');
const robotControlLegacy=page('research/topics/robot-control/README');
const rlpdReview=page('research/papers/2023/rlpd');
const actorCriticQa=page('research/research/actor-critic-mutual-dependence');
check(robotControl.includes('弹簧') && robotControl.includes('Wrench') &&
      robotControl.includes('/research/figures/robot-control/spring-damper.svg'),
      'robot-control short URL serves the complete illustrated article');
check(robotControlLegacy.includes('阻抗控制'), 'robot-control old /README/ URL preserved');
check(rlpdReview.includes('怎样利用历史数据') && !rlpdReview.includes('为什么 Actor 和 Critic 互相依赖'),
      'RLPD title focuses on prior-data online learning');
check(actorCriticQa.includes('策略评价') && actorCriticQa.includes('策略改进'),
      'general Actor–Critic Q&A has its own route');
const supermimic=page('research/papers/2026/supermimic');
check(supermimic.includes('SuperMimic') && supermimic.includes('katex-display') &&
      supermimic.includes('/research/supermimic/training-loop.svg') &&
      supermimic.includes('/research/supermimic/failure-counts.svg') &&
      supermimic.includes('/research/supermimic/gradient-usefulness.svg') &&
      supermimic.includes('/research/supermimic/gradient-backprop-sketch.svg') &&
      supermimic.includes('/research/supermimic/gradient-comparison-original.svg') &&
      supermimic.includes('Gradient Usefulness') &&
      supermimic.includes('G3a') && supermimic.includes('G3b'),
  'SuperMimic paper renders math and local research figures');
for (const filename of ['training-loop.svg','visual-policy-proposal.svg','failure-counts.svg','rollout-speed.svg','gradient-usefulness.svg','gradient-backprop-sketch.svg','gradient-comparison-original.svg']) {
  check(existsSync(join(root,'research','supermimic',filename)), 'SuperMimic visual asset '+filename);
}
for (const filename of ['temporal-evidence-search.svg','reference-assessment-vs-2afc.svg']) {
  check(existsSync(join(root,'research','figures',filename)), 'Recovered research illustration '+filename);
}
const pubs=page('publications');
check((pubs.match(/class="paper-takeaway"/g)||[]).length === (pubs.match(/class="paper-entry/g)||[]).length,
  'all seven publications have reader-first visible takeaways');
check(pubs.includes('Group Isolation Attention') && pubs.includes('256 bits') && pubs.includes('85.24%') &&
      pubs.includes('0.968') && pubs.includes('43,013'),
  'paper summaries explain mechanism and grounded findings across research areas');
const projects=page('projects');

check(pubs.includes('More Memory, Better Videos? A Controlled Study of Visual Memory in Long-Video Generation') &&
      pubs.includes('https://arxiv.org/abs/2610.35001') && pubs.includes('https://github.com/Suchenl/VMem-Bench'),
      'VMem-Bench preprint and code published in publications');
check(pubs.includes('https://suchenl.github.io/VMem-Bench/') &&
      pubs.includes('https://huggingface.co/datasets/Suchenl/VMem-Bench') &&
      pubs.includes('16,548') && pubs.includes('2,824'),
      'VMem-Bench project, public dataset and source-grounded findings are linked');
check(projects.includes('VMem-Bench') &&
      projects.includes('https://github.com/Suchenl/VMem-Bench') &&
      projects.includes('https://arxiv.org/abs/2610.35001') &&
      projects.includes('https://huggingface.co/datasets/Suchenl/VMem-Bench'),
      'VMem-Bench research repository and paper are included under projects');
check(home.includes('VMem-Bench') && home.includes('2026.10.26'),
      'new video-memory preprint appears in homepage highlights and news');
const research=page('research');
const compare=page('research/compare');
const steps=page('research/paths/agent-post-training');
const blogHtml=readFileSync('src/pages/blog/index.astro','utf8');
check(home.includes('"@type":"ProfilePage"') && home.includes('"@type":"Person"'),'person structured data');
check(home.includes('href="/questions/"') && home.includes('home-question-card'),'homepage question teaser and link');
// Check against the current source data, not a hard-coded question that may
// legitimately fall outside the homepage's latest-three window.
const publicQuestions = readdirSync('../knowledge/research')
  .filter(name => name.endsWith('.md'))
  .map(name => {
    const source = readFileSync(join('..','knowledge','research',name),'utf8');
    const fm = source.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1] || '';
    return {
      id: 'research/' + name.replace(/\.md$/, ''),
      order: Number(fm.match(/^featuredOrder:\s*(\d+)/m)?.[1] || 100),
      isPublic: /^publicQuestion:\s*true\s*$/m.test(fm) &&
        /^contentType:\s*exploration\s*$/m.test(fm),
    };
  })
  .filter(entry => entry.isPublic)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const latestThree = publicQuestions.slice(0, 3);
check(latestThree.length === 3 &&
  latestThree.every(q => home.includes('href="/research/' + q.id + '/"')),
  'homepage teasers match three explicitly curated research questions');
check(questions.includes('/research/research/action-sampling-frequency-bias/') &&
      questions.includes('/research/research/do-tokenizers-preserve-numerical-continuity/'),
  'older and new research questions remain in the complete Questions index');
check(questionDetail.includes('RoboTwin') && questionDetail.includes('control_idx') &&
      questionDetail.includes('FurnitureBench'),
  'frequency research preserves RoboTwin rate-vs-interval correction');
check(questionDetail.includes('30 组') && questionDetail.includes('46 个') &&
      questionDetail.includes('UCSD Kitchen') && questionDetail.includes('GR00T N1'),
  'full current research compares 30 sources and 46 RDT pretraining sources');
check(!questionDetail.includes('扩展核查') && !questionDetail.includes('新增的真实') &&
      !questionDetail.includes('原先四个'),
  'reader should not expose editorial update history');
check(questionDetail.includes('目标 50 Hz') && questionDetail.includes('UCSD Kitchen') &&
      questionDetail.includes('RT-1') && questionDetail.includes('BridgeData V2'),
  'frequency research preserves original source-backed rate range');
check(numberContinuityDetail.includes('xVal') && numberContinuityDetail.includes('BitTokens') &&
      numberContinuityDetail.includes('ActionPiece') && numberContinuityDetail.includes('ProAct'),
  'numerical continuity study renders VLM and VLA source-backed comparisons');
check(questionDetail.includes('RH20T') && questionDetail.includes('Open X-Embodiment') && questionDetail.includes('尚未验证'),'research note separates audited facts and hypotheses');
check(questions.includes('action-sampling-frequency-bias') && questions.includes('question-entry'),'public Questions index');
check(questionDetail.includes('Chronos Policy') && questionDetail.includes('Offline Reinforcement Learning at Multiple Frequencies'),'question note has relevant literature');
check(readFileSync('src/config.ts','utf8').includes("href: '/questions/'"),'Questions main navigation');
check(!existsSync(join(root,'about','index.html')),'standalone About route removed');
check(!home.includes('href="/about/"') && !home.includes('href="/about"'),'no stale About links');
check(home.includes('href="/work/"') && !home.includes('href="/expertise/"'),'Experience entry remains; Expertise is not linked from homepage');
check(!readFileSync('src/config.ts','utf8').includes("href: '/expertise/'"),'Expertise navigation entry removed');
check(!existsSync(join(root,'expertise','index.html')),'Expertise not generated as a public route');
check(existsSync(join('src','archived','expertise','index.astro')) && existsSync(join('src','data','expertise.ts')),'Expertise page source and data are preserved');
check(!readFileSync('src/config.ts','utf8').includes("href: '/about/'"),'About navigation entry removed');
check(blog.includes('cat-filter') && blogHtml.includes('role="group"') && !blogHtml.includes('role="tablist"'),'blog filters accessible');
check(pubs.includes('"@type":"ScholarlyArticle"') && pubs.includes('pub-abstract') && !pubs.includes('paper-zoom-hint'),'publication metadata and clean summary');
check(!pubs.includes('pub-timeline') && !pubs.includes('研究成果时间线'),'no duplicate publication timeline');
check((pubs.match(/class="pub-source"/g)||[]).length===(pubs.match(/class="paper-entry/g)||[]).length,'all public summaries include traceable reference links');
check((pubs.match(/class="pub-abstract"/g) || []).length === (pubs.match(/class="paper-entry/g) || []).length,'every publication provides a summary');
check(home.includes('生成式 AI（AIGC）') && home.includes('AI + 医疗'),'original research tags restored');
check(home.includes('兴趣：多模态生成') && home.includes('仿真 · 游戏'),'original interests restored');
for (const match of pubs.matchAll(/src="(\/images\/frameworks\/[^"]+)"/g)) {
  check(existsSync(join(root, match[1].slice(1))), 'publication figure exists: ' + match[1]);
}
check(projects.includes('公开研究实现') && projects.includes('开源工具与开发项目'),'project sections');
check(!projects.includes('research-proj img') && !projects.includes('方法示意：'),'Projects implementation cards do not replicate publication figures');
check(!research.includes('id="lit-backup-export"') && research.includes('id="lit-compare-link"'),'local backups and comparison entry');
check(compare.includes('id="compare-search"') && compare.includes('id="compare-sections"') && !compare.includes('compare-table'),'responsive comparison reader');
check(research.includes('id="research-items-json"') && research.includes('shortName'),'research short name searchable source');
const r1=page('research/papers/2025/deepseek-r1');
check(r1.includes('15.6%') && r1.includes('77.9%') && r1.includes('R1-Distill'),'R1 primary evidence and distillation');
check(steps.includes('data-learning-step='),'guided learning steps');
const robots=join(root,'robots.txt');
check(existsSync(robots) && readFileSync(robots,'utf8').includes('sitemap-index.xml'),'robots.txt sitemap');
const index=join(root,'sitemap-index.xml');
check(existsSync(index),'sitemap index');
const rss=join(root,'rss.xml');check(existsSync(rss),'RSS');
const blogFiles=readFileSync('src/pages/blog/[...slug].astro','utf8');
check(blogFiles.includes("'@type':'BlogPosting'"),'article structured data authored');
const layout=readFileSync('src/layouts/Base.astro','utf8');
check(!layout.includes('fonts.googleapis.com'),'no render-blocking third-party fonts');
if(failures)process.exit(1);
console.log('Full-site static smoke checks passed.');
