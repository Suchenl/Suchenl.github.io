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
