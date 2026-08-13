/**
 * Estimate reading stats from raw Markdown body (no frontmatter).
 * Used by the blog post page template — authors should not hand-write these.
 */

export type ReadingStats = {
  /** Approximate character/word count for display ("字") */
  chars: number;
  images: number;
  tables: number;
  /** Display ($$) + inline ($) math occurrences */
  formulas: number;
  /** Estimated minutes, at least 1 */
  minutes: number;
};

/** Strip fenced code so code dumps don't inflate 字数 / 公式. */
function stripFencedCode(md: string): string {
  return md.replace(/```[\s\S]*?```/g, '\n');
}

function countImages(md: string): number {
  const mdImgs = md.match(/!\[[^\]]*]\([^)]+\)/g) ?? [];
  const htmlImgs = md.match(/<img\b[^>]*>/gi) ?? [];
  return mdImgs.length + htmlImgs.length;
}

function countTables(md: string): number {
  // A markdown table has a separator row like |---|---| or | :--- | ---: |
  const seps = md.match(/^\|?[\t ]*:?-{3,}[\t ]*(\|[\t ]*:?-{3,}[\t ]*)+\|?[\t ]*$/gm) ?? [];
  const html = md.match(/<table\b/gi) ?? [];
  return seps.length + html.length;
}

function countFormulas(md: string): number {
  // Reader-facing "公式": standalone equation blocks, not every $t$ / $v$.
  const display = md.match(/\$\$[\s\S]+?\$\$/g) ?? [];
  // Avoid double-counting $$ wrappers that also contain begin{aligned}.
  const withoutDisplay = md.replace(/\$\$[\s\S]+?\$\$/g, ' ');
  const envOnly = (
    withoutDisplay.match(/\\begin\{(?:equation\*?|align\*?|aligned|gather\*?|multline\*?)\}/g) ?? []
  ).length;
  return display.length + envOnly;
}

/**
 * Chinese-heavy posts: count CJK chars + latin/number tokens.
 * English-heavy: latin tokens dominate; still fine as a rough "字".
 */
function countChars(md: string): number {
  let text = stripFencedCode(md);
  // Drop math (already counted separately) so $a$ doesn't add noise.
  text = text.replace(/\$\$[\s\S]+?\$\$/g, ' ');
  text = text.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, ' ');
  // Images / links keep alt/label text only.
  text = text.replace(/!\[([^\]]*)]\([^)]+\)/g, ' $1 ');
  text = text.replace(/\[([^\]]*)]\([^)]+\)/g, ' $1 ');
  // HTML tags out.
  text = text.replace(/<[^>]+>/g, ' ');
  // Headings / quotes / lists markers.
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/[*_`~|]/g, ' ');

  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? [];
  const latin = text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? [];
  return cjk.length + latin.length;
}

/**
 * Technical Chinese reading: ~300 units/min, plus a small surcharge for
 * display-heavy math / figures (they slow scanning more than prose).
 */
export function estimateReadingStats(markdownBody: string): ReadingStats {
  const md = markdownBody ?? '';
  const images = countImages(md);
  const tables = countTables(md);
  const formulas = countFormulas(stripFencedCode(md));
  const chars = countChars(md);

  const baseMin = chars / 300;
  // Display equations & figures slow technical reading more than plain prose.
  const surcharge = images * 0.5 + tables * 0.4 + formulas * 0.6;
  const minutes = Math.max(1, Math.ceil(baseMin + surcharge));

  return { chars, images, tables, formulas, minutes };
}

export function formatChars(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)} 万`;
  return n.toLocaleString('zh-CN');
}
