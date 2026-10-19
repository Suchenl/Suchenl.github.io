// Preserve working GitHub relative Markdown links while rendering them as /research/ URLs.
// Only rewrite links in knowledge/; blog and other site content are untouched.
import path from 'node:path';

export default function remarkKnowledgeLinks() {
  return (tree, file) => {
    const filename = String(file?.path || '').replaceAll('\\', '/');
    const marker = '/knowledge/';
    const at = filename.lastIndexOf(marker);
    if (at < 0) return;
    const rel = filename.slice(at + marker.length);
    const parent = path.posix.dirname(rel);
    const walk = (node) => {
      if (node?.type === 'link' && typeof node.url === 'string') {
        const url = node.url;
        if (url && !url.startsWith('#') && !/^[a-z]+:/i.test(url) && !url.startsWith('/')) {
          const hashIndex = url.indexOf('#');
          const raw = hashIndex < 0 ? url : url.slice(0, hashIndex);
          const frag = hashIndex < 0 ? '' : url.slice(hashIndex);
          if (raw.endsWith('.md')) {
            const target = path.posix.normalize(path.posix.join(parent, raw));
            if (target !== '..' && !target.startsWith('../')) {
              node.url = '/research/' + target.replace(/\.md$/, '') + '/' + frag;
            }
          }
        }
      }
      if (Array.isArray(node?.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}
