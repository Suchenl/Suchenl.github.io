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
