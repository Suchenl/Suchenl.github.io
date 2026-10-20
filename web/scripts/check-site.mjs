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
check(blog.includes('cat-filter') && blogHtml.includes('role="group"') && !blogHtml.includes('role="tablist"'),'blog filters accessible');
check(pubs.includes('"@type":"ScholarlyArticle"') && pubs.includes('aria-modal="true"'),'publication metadata and image modal');
check(projects.includes('公开研究实现') && projects.includes('开源工具与开发项目'),'project sections');
check(research.includes('id="lit-backup-export"') && research.includes('id="lit-compare-link"'),'local backups and comparison entry');
check(compare.includes('id="compare-pick"') && compare.includes('compare-table'),'comparison page');
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
