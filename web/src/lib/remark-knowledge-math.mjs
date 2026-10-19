// Render fenced ```math blocks in older knowledge notes as KaTeX display equations.
// Ordinary fenced code blocks and other site content remain unchanged.
export default function remarkKnowledgeMath() {
  return (tree, file) => {
    const path = String(file?.path || '').replaceAll('\\', '/');
    if (!path.includes('/knowledge/')) return;
    const walk = (node) => {
      if (Array.isArray(node?.children)) {
        node.children = node.children.map((child) => {
          if (child.type === 'code' && child.lang === 'math') {
            return { type: 'math', value: child.value, position: child.position };
          }
          walk(child);
          return child;
        });
      }
    };
    walk(tree);
  };
}
