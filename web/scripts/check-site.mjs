import { existsSync, readFileSync } from 'node:fs';
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
const pubs=page('publications');
const projects=page('projects');
const research=page('research');
const compare=page('research/compare');
const steps=page('research/paths/agent-post-training');
const blogHtml=readFileSync('src/pages/blog/index.astro','utf8');
check(home.includes('"@type":"ProfilePage"') && home.includes('"@type":"Person"'),'person structured data');
check(!existsSync(join(root,'about','index.html')),'standalone About route removed');
check(!home.includes('href="/about/"') && !home.includes('href="/about"'),'no stale About links');
check(home.includes('href="/work/"') && home.includes('href="/expertise/"'),'Experience and Expertise remain directly reachable');
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
