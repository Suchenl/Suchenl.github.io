import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
// Prevent a regression where LaTeX source appears as text rather than rendered math.
const targets = [
  ['topics/llm-agent-training/reviews/sft-rl-co-training', 4],
  ['research/robot-trajectory-reward', 4],
  ['research/opd-forward-reverse-kl-qa', 6],
];
for (const [slug, required] of targets) {
  const file = path.join('dist', 'research', slug, 'index.html');
  if (!existsSync(file)) throw new Error('Missing research output: ' + file);
  const html = readFileSync(file, 'utf8');
  const count = (html.match(/class="katex-display"/g) || []).length;
  if (count < required) throw new Error('Math rendering failed: ' + slug + ': expected ' + required + ', got ' + count);
  console.log('KaTeX verified:', slug, '(' + count + ' display equations)');
}
console.log('Research math regression checks passed.');

const reviewPath = path.join('dist', 'research', 'topics', 'llm-agent-training', 'reviews', 'sft-rl-co-training', 'index.html');
const review = readFileSync(reviewPath, 'utf8');
if (!review.includes('href="/research/papers/2026/bridge/"')) {
  throw new Error('Review links should resolve to the canonical internal BRIDGE paper page');
}
const library = readFileSync(path.join('dist', 'research', 'index.html'), 'utf8');
for (const marker of ['lit-shortcuts', 'lit-search', 'lit-context', 'lit-sort']) {
  if (!library.includes(marker)) throw new Error('Missing library UI: ' + marker);
}
if (!existsSync(path.join('dist', 'reading', 'index.html'))) throw new Error('Missing deprecated /reading/ redirect');
console.log('Research routes, navigation and internal paper links verified.');

for (const label of ['data-type="qa"', 'data-type="exploration"', 'data-type="plan"', 'data-type="paper"']) {
 if (!library.includes(label)) throw new Error('Missing content-type facet: ' + label);
}
for(const phrase of ['大模型与强化学习/后训练与策略优化','机器人与具身智能/数据与动作表示']) {
 if(!library.includes(phrase))throw new Error('Missing cross-type canonical domain: '+phrase);
}
const questionsHtml=readFileSync(path.join('dist','questions','index.html'),'utf8');
if(questionsHtml.includes('opd-forward-reverse-kl-qa') || questionsHtml.includes('how-agent-reasoning-tools-and-state-work'))
  throw new Error('Technical Q&A leaked into curated Questions');
for(const figure of ['forward-kl.svg','reverse-kl.svg','mode-seeking-covering.svg','opd-flow.svg']){
 if(!existsSync(path.join('dist','research','opd',figure)))throw new Error('Missing OPD SVG '+figure);
}
const opdHtml=readFileSync(path.join('dist','research','research','opd-forward-reverse-kl-qa','index.html'),'utf8');
if(!opdHtml.includes('mode-seeking-covering.svg')||!opdHtml.includes('opd-flow.svg'))
  throw new Error('OPD article lost one of its original diagrams');
console.log('Domain/type facets, curated Questions boundaries, OPD figures verified.');



// Interaction contracts: do not regress to split caret/text click targets.
const fs = await import('node:fs');
// Contract checks follow the actual component boundary rather than assuming
// interaction logic and CSS are embedded in a single .astro page.
const explorerSource = [
  'src/pages/research/index.astro',
  'src/scripts/research-library.ts',
  'src/styles/research-library.css',
].map(file=>fs.readFileSync(file,'utf8')).join('\n');
const readerSource = [
  'src/pages/research/[...slug].astro',
  'src/scripts/research-reader.ts',
  'src/styles/research-reader.css',
].map(file=>fs.readFileSync(file,'utf8')).join('\n');
const headerSource = fs.readFileSync('src/components/Header.astro','utf8');
const base = readFileSync(path.join('dist','research','index.html'),'utf8');
for (const text of [
  'role="treeitem"', "e.key === 'ArrowLeft'", "e.key === 'ArrowRight'",
  "e.key === 'ArrowDown'", "e.key === 'Home'", "window.addEventListener('popstate'",
  'min-height:44px', 'selectView(key,true)',
]) {
  if (!explorerSource.includes(text)) throw new Error('Missing tree interaction contract: ' + text);
}
if (explorerSource.includes('data-toggle=')) throw new Error('Split caret-only toggle was reintroduced');
for (const text of ['id="main-content"','href="#main-content"','aria-current','id="mobile-menu-toggle"']) {
  const source = text === 'id="main-content"' || text === 'href="#main-content"' ? fs.readFileSync('src/layouts/Base.astro','utf8') : headerSource;
  if (!source.includes(text)) throw new Error('Missing global accessibility feature: ' + text);
}
if (!readerSource.includes('id="research-return"') || !fs.readFileSync('src/components/ReadingToc.astro','utf8').includes('data-reading-toc')) {
  throw new Error('Shared left reading navigation contract regressed');
}
if (!base.includes('id="lit-tree"') || !base.includes('id="lit-search"')) {
  throw new Error('Research explorer output incomplete');
}
console.log('Research interaction contracts verified.');


const explorer = explorerSource;
const article = readerSource;
for (const contract of ['id="lit-mobile-folder-toggle"','id="lit-more-button"',"persistUrl('replace')","state.visibleLimit+=12","params.get('q')","setMobileDirectory(false,true)"]) {
  if (!explorer.includes(contract)) throw new Error('Research navigation usability regression: '+contract);
}
for(const contract of ["ret.searchParams.set('q'","ret.searchParams.set('sort'","ret.searchParams.set('status'"]) {
  if (!article.includes(contract)) throw new Error('Reader return state lost: '+contract);
}
console.log('Mobile directory, incremental results and search restoration contracts verified.');


// Knowledge-to-learning route integration (actual generated pages, not only source strings).
const learningHtmlFile = path.join('dist','research','paths','agent-post-training','index.html');
if (!existsSync(learningHtmlFile)) throw new Error('Missing learning path page');
const learningHtml = readFileSync(learningHtmlFile,'utf8');
const stepCount = (learningHtml.match(/data-learning-step=/g)||[]).length;
if (stepCount !== 7) throw new Error('Expected 7 curated learning steps, got '+stepCount);
for(const ref of ['/research/glossary/core/','/research/papers/2026/bridge/','/research/research/robot-trajectory-reward/']) {
  if(!learningHtml.includes(ref)) throw new Error('Missing learning path target '+ref);
}
const bridge = readFileSync(path.join('dist','research','papers','2026','bridge','index.html'),'utf8');
if(!bridge.includes('哪些内容链接到这里') || !bridge.includes('/research/paths/agent-post-training/')) {
  throw new Error('Learning-path backlink missing from BRIDGE');
}
if(!library.includes('条术语速查') || !library.includes('glossary/agent-training#')) {
  throw new Error('Glossary heading deep-link index is missing');
}
if(!readerSource.includes('research-last-read-v1') || !readerSource.includes('rkd-recall')) {
  throw new Error('Resume-reading and recall prompt contract missing');
}
console.log('Knowledge graph, seven-step learning path, term deep links, and recall checks passed.');




// Pretraining should ship from public references; private bridge implementation must not be included.
for (const slug of ['topics/pretraining/README','topics/pretraining/reviews/pretraining-engineering-roadmap']) {
 const file=path.join('dist','research',slug,'index.html');
 if(!existsSync(file))throw new Error('Pretraining topic missing: '+slug);
}
const privateNames=['local-workbench','model_bridge.py','model_bridge.log','ytech_milm'];
const topic=readFileSync(path.join('dist','research','topics','agent-reasoning','reviews','cot-tool-use-and-thinking-scheduling','index.html'),'utf8');
for(const phrase of privateNames)if(topic.includes(phrase))throw new Error('Private implementation reference exposed: '+phrase);
const tocSource=fs.readFileSync('src/scripts/reading-toc.ts','utf8');
for(const phrase of ['data-toc-target','aria-current','nav.scrollTo','site-reading-toc-collapsed'])if(!tocSource.includes(phrase))throw new Error('Left reading TOC contract missing: '+phrase);
console.log('Pretraining topic, privacy exclusions and shared left TOC contract verified.');


// A public page must never expose private repository names or implementation paths.
// This scans all generated HTML, not only the initial Research topic.
const privateMarkers = [
  'local-workbench','model_bridge.py','model_bridge.log',
  'Open-Robot-Agent','UniRobo-Data','AgentHarness3D','VMem-Bench',
  'ytech_milm_intern', 'cursor-agent-store', 'reasoning.sqlite',
  'Codex→GLM Bridge 的 SQLite', 'Suchenl/local-workbench'
];
const walkHtml = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
  const full = path.join(dir,entry.name);
  return entry.isDirectory() ? walkHtml(full) : entry.name.endsWith('.html') ? [full] : [];
});
for (const file of walkHtml('dist')) {
  const html=fs.readFileSync(file,'utf8');
  for (const sensitive of privateMarkers) if(html.includes(sensitive))
    throw new Error('Private project marker leaked in public output: '+sensitive+' in '+file);
}
console.log('Generated public pages contain no named private repository markers.');
