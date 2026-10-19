import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
// Prevent a regression where LaTeX source appears as text rather than rendered math.
const targets = [
  ['topics/llm-agent-training/reviews/sft-rl-co-training', 4],
  ['research/robot-trajectory-reward', 4],
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


// Interaction contracts: do not regress to split caret/text click targets.
const fs = await import('node:fs');
const explorerSource = fs.readFileSync('src/pages/research/index.astro','utf8');
const readerSource = fs.readFileSync('src/pages/research/[...slug].astro','utf8');
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
if (!readerSource.includes("mobileToc.open = false") || !readerSource.includes('id="research-return"')) {
  throw new Error('Reading navigation contract regressed');
}
if (!base.includes('id="lit-tree"') || !base.includes('id="lit-search"')) {
  throw new Error('Research explorer output incomplete');
}
console.log('Research interaction contracts verified.');
