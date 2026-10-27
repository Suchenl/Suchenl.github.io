import path from 'node:path';

export type KnowledgeRecord = {
  id: string;
  body?: string;
  data: Record<string, unknown>;
};
export type KnowledgeNode = {
  id: string;
  title: string;
  kind: 'paper' | 'review' | 'qa' | 'exploration' | 'plan' | 'glossary' | 'path' | 'other';
  summary: string;
  href: string;
};
export type LearningStep = { ref: string; why: string; stage?: string };

function kindOf(id: string, declared?: unknown): KnowledgeNode['kind'] {
  if (typeof declared === 'string' && ['paper','review','qa','exploration','plan','glossary','path'].includes(declared)) return declared as KnowledgeNode['kind'];
  if (id.startsWith('papers/')) return 'paper';
  if (id.startsWith('glossary/')) return 'glossary';
  if (id.startsWith('research/')) return 'exploration';
  if (id.startsWith('paths/')) return 'path';
  if (id.includes('/reviews/')) return 'review';
  return 'other';
}
function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
export function titleOf(entry: KnowledgeRecord): string {
  return asString(entry.data.title) || (entry.body || '').match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.id.split('/').pop() || entry.id;
}
export function readingSteps(entry: KnowledgeRecord): LearningStep[] {
  if (kindOf(entry.id, entry.data.contentType) !== 'path') return [];
  const raw = entry.data.steps;
  if (!Array.isArray(raw)) return [];
  return raw.map((step, index) => {
    if (!step || typeof step !== 'object' || typeof step.ref !== 'string' ||
        typeof step.why !== 'string' || !step.ref.trim() || !step.why.trim()) {
      throw new Error('Invalid learning step ' + (index + 1) + ' in ' + entry.id);
    }
    return { ref: step.ref.trim(), why: step.why.trim(), stage: asString(step.stage) };
  });
}
function targetOf(sourceId: string, url: string): string | null {
  const cleaned = url.replace(/^<|>$/g, '').split('#')[0].split('?')[0];
  if (!cleaned || /^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(cleaned)) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(cleaned); } catch { return null; }
  if (decoded.startsWith('/research/')) return decoded.replace(/^\/research\//, '').replace(/\/$/, '');
  if (!decoded.endsWith('.md')) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourceId), decoded)).replace(/\.md$/, '');
}
export function buildKnowledgeGraph(entries: KnowledgeRecord[]) {
  const nodes = new Map<string, KnowledgeNode>();
  for (const e of entries) {
    nodes.set(e.id, {
      id: e.id,
      title: titleOf(e),
      summary: asString(e.data.summaryZh),
      kind: kindOf(e.id, e.data.contentType),
      href: '/research/' + e.id + '/',
    });
  }
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  const register = (source: string, target: string) => {
    if (source === target || !nodes.has(target) || target.endsWith('/README') || target === 'papers/README') return;
    if (!outgoing.has(source)) outgoing.set(source, new Set());
    if (!incoming.has(target)) incoming.set(target, new Set());
    outgoing.get(source)!.add(target);
    incoming.get(target)!.add(source);
  };
  for (const e of entries) {
    const body = (e.body || '').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/`[^`\n]+`/g, '');
    const linkPattern = /!?\[[^\]]*]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']+["'])?\)/g;
    for (const m of body.matchAll(linkPattern)) {
      const target = targetOf(e.id, m[1]);
      if (target) register(e.id, target);
    }
    // Explicit semantic relationships are authored, not guessed from shared tags.
    const typed=e.data.related;
    if (typed !== undefined && !Array.isArray(typed)) throw new Error('related must be an array in '+e.id);
    for(const relation of (Array.isArray(typed) ? typed : [])){
      if (!relation || typeof relation.ref!=='string' ||
          !['compares','extends','requires','questions','supports'].includes(relation.type) ||
          typeof relation.note!=='string' || !relation.note.trim()) {
        throw new Error('Invalid related item in '+e.id);
      }
      if(!nodes.has(relation.ref)) throw new Error('Missing related target '+relation.ref+' in '+e.id);
      register(e.id,relation.ref);
    }
    for (const step of readingSteps(e)) {
      if (!nodes.has(step.ref)) throw new Error('Missing learning target ' + step.ref + ' in ' + e.id);
      if (step.ref === e.id) throw new Error('Learning path cannot link to itself: ' + e.id);
      register(e.id, step.ref);
    }
  }
  const toNodes = (ids: Iterable<string>) =>
    [...ids].map(id => nodes.get(id)!).filter(Boolean).sort((a,b) => {
      const order = { path: 0, review: 1, qa: 2, glossary: 3, paper: 4, exploration: 5, plan: 6, other: 7 };
      return order[a.kind] - order[b.kind] || a.title.localeCompare(b.title, 'zh');
    });
  return {
    nodes,
    outgoingFor: (id: string) => toNodes(outgoing.get(id) || []),
    incomingFor: (id: string) => toNodes(incoming.get(id) || []),
    pathsFor: (id: string) => toNodes(incoming.get(id) || []).filter(n => n.kind === 'path'),
  };
}
