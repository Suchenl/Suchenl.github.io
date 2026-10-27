import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('..', 'knowledge');
const taxonomy = JSON.parse(readFileSync(path.join(root, 'taxonomy.json'), 'utf8'));
const domainPaths = new Set(taxonomy.domains.flatMap(d => d.children.map(c => d.id + '/' + c)));
const types = new Set(taxonomy.contentTypes.map(x => x.id));
const curatedOrders = new Map();
const counts = new Map();
let checked = 0;
const problems = [];
const scan = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? scan(full) : entry.name.endsWith('.md') ? [full] : [];
});
const check = (ok, relative, message) => { if (!ok) problems.push(relative + ': ' + message); };
for (const file of scan(root)) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (!/^(papers\/20\d\d\/|topics\/.*\/reviews\/|glossary\/|research\/|paths\/)/.test(relative)
      || relative.endsWith('/README.md')) continue;
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  check(Boolean(match), relative, 'missing frontmatter');
  if (!match) continue;
  checked += 1;
  const field = name => match[1].match(new RegExp('^' + name + ':\\s*(.*)$', 'm'))?.[1]?.trim() || '';
  const kind = field('contentType');
  check(types.has(kind), relative, 'invalid contentType: ' + kind);
  counts.set(kind, (counts.get(kind) || 0) + 1);
  const expected = relative.startsWith('papers/') ? 'paper' :
    relative.startsWith('topics/') ? 'review' :
    relative.startsWith('glossary/') ? 'glossary' :
    relative.startsWith('paths/') ? 'path' : null;
  if (expected) check(kind === expected, relative, 'contentType does not match canonical storage class');
  if (relative.startsWith('research/'))
    check(['qa','exploration','plan'].includes(kind), relative, 'research article must be qa/exploration/plan');
  let domains = [];
  try { domains = JSON.parse(field('domains')); } catch { problems.push(relative + ': invalid domains JSON'); }
  check(Array.isArray(domains) && domains.length > 0, relative, 'empty domains');
  if (Array.isArray(domains)) {
    check(new Set(domains).size === domains.length, relative, 'duplicate domains');
    for (const domain of domains) check(domainPaths.has(domain), relative, 'unknown domain: ' + domain);
  }
  if (field('publicQuestion') === 'true') {
    check(kind === 'exploration', relative, 'technical Q&A and plans cannot enter Questions');
    check(['"interest"','"question"','interest','question'].includes(field('questionKind')),
      relative, 'invalid questionKind');
    check(Boolean(field('questionTitleEn') && field('questionSummaryEn') && field('summaryZh')),
      relative, 'missing bilingual Questions metadata');
    const order = Number(field('featuredOrder'));
    check(Number.isInteger(order) && order >= 0 && field('featuredOrder') !== '',
      relative, 'invalid featuredOrder');
    check(!curatedOrders.has(order), relative, 'duplicate featuredOrder with ' + curatedOrders.get(order));
    curatedOrders.set(order, relative);
  } else {
    check(!field('featuredOrder'), relative, 'non-curated entry cannot have featuredOrder');
  }
}
check(curatedOrders.size > 0, 'questions', 'no curated questions');
for (const domain of taxonomy.domains) {
  check(domain.children.length > 0, 'taxonomy', 'empty domain: ' + domain.id);
}
if (problems.length) {
  problems.forEach(message => console.error('FAIL', message));
  process.exit(1);
}
console.log('Research taxonomy OK:', checked, 'canonical articles;',
  [...counts].map(([kind,n]) => kind + '=' + n).join(', '),
  '; curated Questions=' + curatedOrders.size);
