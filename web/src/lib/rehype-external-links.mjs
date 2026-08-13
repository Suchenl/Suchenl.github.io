/**
 * 给 markdown 里的 http(s) 外链加上 target=_blank 与 rel=noopener noreferrer。
 * 站内相对路径、锚点、mailto 不动。
 */
export default function rehypeExternalLinks() {
  return (tree) => walk(tree);
}

function walk(node) {
  if (node?.type === 'element' && node.tagName === 'a') {
    const href = node.properties?.href;
    if (typeof href === 'string' && /^https?:\/\//i.test(href)) {
      node.properties.target = '_blank';
      node.properties.rel = ['noopener', 'noreferrer'];
    }
  }
  for (const child of node.children ?? []) walk(child);
}
