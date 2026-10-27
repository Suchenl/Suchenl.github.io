import { domainCatalog, domainMatches, domainTitle, typeLabel, legacyCategoryRoots } from '../lib/research-taxonomy';

type Item = {
    kind: string; id: string; href: string; title: string; summary: string; shortName?: string; aliases?: string[];
    authors?: string[]; year?: number; venue?: string; categories?: string[]; domains?: string[];
    tags?: string[]; status?: string; rating?: number; searchText?: string; added?: string; external?: string; noteDepth?: string;
  };
  type Folder = { name: string; path: string; count: number; children: Map<string, Folder> };
  const ALL: Item[] = JSON.parse(document.getElementById('research-items-json')?.textContent || '[]');
  const state = { selected: 'all', type: 'all', query: '', status: 'all', sort: 'year', visibleLimit: 12 };
  const compareIds = new Set<string>();
  const expanded = new Set<string>(['all']);
  const statusLabel: Record<string, string> = { 'to-read': '想读', reading: '在读', read: '已读', untracked: '未标记' };
  const labels: Record<string, string> = { all: '全部内容' };
  const escapeHtml = (s: string) => String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] as string));

  function makeTree(): Folder[] {
    // Domain tree is derived from ALL canonical articles, never papers alone.
    // Individual glossary headings are search-only and are not separate library items.
    const root: Folder = {
      name: '全部内容', path: 'all',
      count: ALL.filter(item => item.kind !== 'term').length,
      children: new Map(),
    };
    const entries = ALL.filter(item => item.kind !== 'term');
    for (const domain of domainCatalog) {
      if (!entries.some(item => domainMatches(item.domains, domain.id))) continue;
      const top: Folder = {
        name: domain.id, path: 'domain:' + domain.id, count: 0, children: new Map(),
      };
      root.children.set(domain.id, top);
      for (const childName of domain.children) {
        const full = domain.id + '/' + childName;
        if (entries.some(item => domainMatches(item.domains, full))) {
          top.children.set(childName, {
            name: childName, path: 'domain:' + full, count: 0, children: new Map(),
          });
        }
      }
    }
    const count = (node: Folder) => {
      if (node.path.startsWith('domain:')) {
        node.count = entries.filter(item => domainMatches(item.domains, node.path.slice(7))).length;
      }
      node.children.forEach(count);
    };
    count(root);
    return [root];
  }
  const roots = makeTree();
  // One full-row control per folder: click selects it and opens/closes its subtree.
  // Flat ARIA tree levels keep the visual hierarchy understandable to keyboard and screen-reader users.
  const sortedChildren = (n: Folder) => [...n.children.values()].sort((a,b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
  function treeNode(n: Folder, depth: number, position: number, setsize: number): string {
    const children = sortedChildren(n);
    const open = expanded.has(n.path);
    const hasChildren = children.length > 0;
    const selected = state.selected === n.path;
    const arrow = hasChildren
      ? '<span class="caret' + (open ? ' open' : '') + '" aria-hidden="true">▸</span>'
      : '<span class="caret-sp" aria-hidden="true"></span>';
    const button = '<button type="button" class="tnode-select" role="treeitem" data-path="' + escapeHtml(n.path)
      + '" data-depth="' + depth + '" data-has-children="' + hasChildren + '" aria-level="' + (depth + 1)
      + '" aria-posinset="' + position + '" aria-setsize="' + setsize + '"'
      + (hasChildren ? ' aria-expanded="' + open + '"' : '')
      + (selected ? ' aria-current="true"' : '')
      + ' tabindex="' + (n.path === focusPath ? '0' : '-1') + '"'
      + ' style="padding-left:' + (10 + depth * 13) + 'px">'
      + arrow + '<span class="tname">' + escapeHtml(n.name)
      + '</span><span class="tcount">' + n.count + '</span></button>';
    return '<div class="tnode' + (selected ? ' sel' : '') + '" role="none">' + button + '</div>'
      + (hasChildren && open ? children.map((c,i) => treeNode(c,depth+1,i+1,children.length)).join('') : '');
  }

  let focusPath = 'all';
  function parentOf(selectedPath: string): string | null {
    if (selectedPath === 'all') return null;
    if (!selectedPath.startsWith('domain:')) return 'all';
    const name = selectedPath.slice(7);
    return name.includes('/') ? 'domain:' + name.slice(0, name.lastIndexOf('/')) : 'all';
  }
  function exposeAncestors(selectedPath: string) {
    for (let p = parentOf(selectedPath);p;p = parentOf(p)) expanded.add(p);
  }
  function currentFolderFromUrl(): string {
    const folder = new URLSearchParams(window.location.search).get('folder') || 'all';
    if (folder.startsWith('domain:') && findFolder(folder)) return folder;
    // Keep bookmarked legacy paper-category filters usable without moving any article.
    if (folder.startsWith('cat:')) {
      const old = folder.slice(4);
      const domain = legacyCategoryRoots[old.split('/')[0]];
      if (domain && findFolder('domain:' + domain)) return 'domain:' + domain;
    }
    return 'all';
  }
  function syncExpandLabel() {
    const control = document.getElementById('lit-expand');
    if (!control) return;
    const paths: string[] = [];
    const scan = (n: Folder) => { if (n.children.size) paths.push(n.path); n.children.forEach(scan); };
    roots.forEach(scan);
    control.textContent = paths.length && paths.every(p => expanded.has(p)) ? '折叠全部' : '展开全部';
  }
  function renderTree(focus?: string) {
    const host = document.getElementById('lit-tree')!;
    const side = host.closest('.lit-sidebar');
    const scroll = side?.scrollTop || 0;
    const oldFocus = host.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.path : undefined;
    focusPath = focus || oldFocus || focusPath;
    const html = roots.map((n,i) => treeNode(n,0,i+1,roots.length)).join('');
    host.innerHTML = html;
    if (!host.querySelector('[data-path="' + CSS.escape(focusPath) + '"]')) focusPath = state.selected;
    if (!host.querySelector('[data-path="' + CSS.escape(focusPath) + '"]')) focusPath = 'all';
    host.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(b => b.tabIndex = b.dataset.path === focusPath ? 0 : -1);
    if (side) side.scrollTop = scroll;
    const needsFocus = Boolean(focus || oldFocus);
    if (needsFocus) {
      const b = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-path]')).find(x=>x.dataset.path===focusPath);
      b?.focus({ preventScroll:true });
    }
    syncExpandLabel();
  }
  function persistUrl(mode: 'push' | 'replace' = 'replace') {
    const next = new URL(window.location.href);
    for (const key of ['folder','type','q','status','sort']) next.searchParams.delete(key);
    if (state.selected !== 'all') next.searchParams.set('folder',state.selected);
    if (state.type !== 'all') next.searchParams.set('type',state.type);
    if (state.query.trim()) next.searchParams.set('q',state.query.trim());
    if (state.status !== 'all') next.searchParams.set('status',state.status);
    if (state.sort !== 'year') next.searchParams.set('sort',state.sort);
    history[mode === 'push' ? 'pushState' : 'replaceState'](null,'',next.pathname+next.search+next.hash);
  }
  const mobileDirectoryButton = document.getElementById('lit-mobile-folder-toggle') as HTMLButtonElement;
  const sidebar = document.getElementById('lit-sidebar') as HTMLElement;
  const isMobile = () => window.matchMedia('(max-width:700px)').matches;
  const setMobileDirectory = (open: boolean, returnFocus = false) => {
    sidebar.classList.toggle('is-open',open);
    mobileDirectoryButton.setAttribute('aria-expanded',String(open));
    if (returnFocus) mobileDirectoryButton.focus({preventScroll:true});
  };
  mobileDirectoryButton.addEventListener('click', () => setMobileDirectory(!sidebar.classList.contains('is-open')));
  function selectView(view: string, fromRow = false, historyMode: 'push' | 'replace' | 'none' = 'push') {
    const same = state.selected === view;
    const n = findFolder(view);
    if (n?.children.size) {
      if (fromRow && same && expanded.has(view)) expanded.delete(view);
      else expanded.add(view);
    }
    exposeAncestors(view);
    state.selected = view;
    state.query = '';
    state.status = 'all';
    state.visibleLimit = 12;
    (document.getElementById('lit-search') as HTMLInputElement).value = '';
    if (historyMode !== 'none' && !same) persistUrl(historyMode);
    focusPath = view;
    render();
    if (isMobile() && fromRow) setMobileDirectory(false,true);
  }
  function findFolder(path: string): Folder | undefined {
    const pending = roots.slice();
    while(pending.length) {
      const n = pending.shift()!;
      if (n.path === path) return n;
      pending.push(...n.children.values());
    }
    return undefined;
  }
  function focusButton(button: HTMLButtonElement | undefined) {
    if (!button) return;
    focusPath = button.dataset.path || 'papers';
    const host = document.getElementById('lit-tree')!;
    host.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(b=>b.tabIndex=b===button?0:-1);
    button.focus();
  }
  const treeHost = document.getElementById('lit-tree')!;
  treeHost.setAttribute('role','tree');
  treeHost.addEventListener('click',e=>{
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-path]');
    if (!button) return;
    selectView(button.dataset.path || 'papers',true);
  });
  treeHost.addEventListener('keydown',e=>{
    const target = (e.target as Element).closest<HTMLButtonElement>('button[data-path]');
    if (!target) return;
    const visible = Array.from(treeHost.querySelectorAll<HTMLButtonElement>('button[data-path]'));
    const i = visible.indexOf(target);
    const key = target.dataset.path || 'papers';
    let destination: HTMLButtonElement | undefined;
    if (e.key === 'ArrowDown') destination=visible[Math.min(visible.length-1,i+1)];
    else if (e.key === 'ArrowUp') destination=visible[Math.max(0,i-1)];
    else if (e.key === 'Home') destination=visible[0];
    else if (e.key === 'End') destination=visible[visible.length-1];
    else if (e.key === 'ArrowRight') {
      if (target.dataset.hasChildren === 'true' && !expanded.has(key)) {
        expanded.add(key);
        e.preventDefault();
        renderTree(key);
        return;
      }
      const next = visible[i+1];
      if (next && Number(next.dataset.depth) > Number(target.dataset.depth)) destination=next;
    } else if (e.key === 'ArrowLeft') {
      if (expanded.has(key) && target.dataset.hasChildren === 'true') {
        expanded.delete(key);
        e.preventDefault();
        renderTree(key);
        return;
      }
      const parent=parentOf(key);
      destination=parent ? visible.find(x=>x.dataset.path===parent) : undefined;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectView(key,true);
      return;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const search=e.key.toLocaleLowerCase();
      destination=visible.slice(i+1).concat(visible.slice(0,i+1)).find(x=>(x.querySelector('.tname')?.textContent || '').toLocaleLowerCase().startsWith(search));
    }
    if (destination) {
      e.preventDefault();
      focusButton(destination);
    }
  });
  function filteredItems(): Item[] {
    let values: Item[];
    const q = state.query.trim().toLowerCase();
    if (q) {
      values = ALL.filter(p => [p.shortName || '', (p.aliases || []).join(' '), p.title, p.summary,
        p.id, p.searchText || '', (p.authors || []).join(' '), (p.tags || []).join(' '),
        (p.categories || []).join(' '), (p.domains || []).join(' ')]
        .join(' ').toLowerCase().includes(q));
    } else if (state.selected.startsWith('domain:')) {
      values = ALL.filter(p => p.kind !== 'term' && domainMatches(p.domains, state.selected.slice(7)));
    } else {
      values = ALL.filter(p => p.kind !== 'term');
    }
    if (state.type !== 'all') {
      values = values.filter(p => state.type === 'glossary'
        ? p.kind === 'glossary' || (q && p.kind === 'term')
        : p.kind === state.type);
    }
    if (state.status !== 'all') values = values.filter(p => p.kind === 'paper' && p.status === state.status);
    const kindOrder = (k: string) => ({ review: 0, qa: 1, exploration: 2, paper: 3, path: 4, plan: 5, glossary: 6, term: 7 }[k] ?? 8);
    const relevance = (p: Item) => {
      if (!q) return 0;
      const title = p.title.toLowerCase();
      const short = (p.shortName || '').toLowerCase();
      const aliases = (p.aliases || []).join(' ').toLowerCase();
      const tags = (p.tags || []).join(' ').toLowerCase();
      const summary = (p.summary || '').toLowerCase();
      const category = (p.categories || []).join(' ').toLowerCase();
      // Search the whole body, but prioritize the user's likely intention: named concepts and titles.
      return (short === q ? 340 : short.startsWith(q) ? 235 : short.includes(q) ? 120 : 0)
        + (aliases.split(' ').includes(q) ? 220 : aliases.includes(q) ? 90 : 0)
        + (title === q ? 200 : title.startsWith(q) ? 120 : title.includes(q) ? 85 : 0)
        + (p.kind === 'term' && title.includes(q) ? 40 : 0)
        + (tags.includes(q) ? 35 : 0)
        + (summary.includes(q) ? 20 : 0)
        + (category.includes(q) ? 10 : 0)
        + ((p.searchText || '').toLowerCase().includes(q) ? 1 : 0);
    };
    return values.sort((a,b) => {
      if (q && state.sort === 'year') {
        return relevance(b)-relevance(a) || kindOrder(a.kind)-kindOrder(b.kind) || (b.year || 0)-(a.year || 0);
      }
      if (state.sort === 'rating') return (b.rating || 0) - (a.rating || 0) || (b.year || 0) - (a.year || 0);
      if (state.sort === 'added') return (b.added || '').localeCompare(a.added || '') || (b.year || 0) - (a.year || 0);
      if (state.sort === 'title') return a.title.localeCompare(b.title);
      return kindOrder(a.kind) - kindOrder(b.kind) || (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title);
    });
  }
  function itemRow(p: Item): string {
    // Preserve the chosen directory across detail navigation without changing canonical IDs.
    const returnFolder = state.selected;
    const destination = new URLSearchParams();
    destination.set('from',returnFolder);
    if (state.type !== 'all') destination.set('type',state.type);
    if (state.query.trim()) destination.set('q',state.query.trim());
    if (state.status !== 'all') destination.set('status',state.status);
    if (state.sort !== 'year') destination.set('sort',state.sort);
    const hashIndex = p.href.indexOf('#');
    const baseHref = hashIndex >= 0 ? p.href.slice(0, hashIndex) : p.href;
    const fragment = hashIndex >= 0 ? p.href.slice(hashIndex) : '';
    const detailHref = baseHref + '?' + destination.toString() + fragment;
    const paper = p.kind === 'paper';
    const title = escapeHtml(p.title);
    const acronym = paper && p.shortName ? '<span class="lit-short-name">' + escapeHtml(p.shortName) + '</span>' : '';
    const category = (p.domains || [])[0] || '';
    const kind = p.kind === 'term' ? '术语速查' : (typeLabel[p.kind] || '研究资料');
    const year = paper ? [p.year || '', p.venue || ''].filter(Boolean).join(' · ') : kind;
    const chips = paper ? (p.tags || []).slice(0,3).map(tag => '<span class="lit-chip">' + escapeHtml(tag) + '</span>').join('') : '';
    const rating = paper && p.rating && p.rating > 0 ? '<span class="lit-rating">' + '★'.repeat(p.rating) + '☆'.repeat(Math.max(0,5-p.rating)) + '</span>' : '';
    const compareAction = paper && (state.type === 'paper' || compareIds.size > 0) ? '<button type="button" class="lit-compare-pick" data-compare-id="' + escapeHtml(p.id) + '" aria-pressed="' + compareIds.has(p.id) + '">' + (compareIds.has(p.id) ? '✓ 已选对比' : '＋ 加入对比') + '</button>' : '';
    const external = paper && p.external && /^https?:\/\//.test(p.external)
      ? '<a class="lit-external" href="' + escapeHtml(p.external) + '" target="_blank" rel="noopener noreferrer" aria-label="在新标签页打开 ' + title + ' 的原始来源">原始资料 ↗</a>' : '';
    return '<article class="row">'
      + '<div class="row-main"><div class="lit-row-eyebrow"><span>' + escapeHtml(year) + '</span><span>' + escapeHtml(kind) + '</span></div>'
      + '<div class="row-title">' + acronym + '<a href="' + escapeHtml(detailHref) + '">' + title + '</a></div>'
      + (p.summary ? '<p class="row-abs">' + escapeHtml(p.summary) + '</p>' : '')
      + '<div class="lit-row-bottom"><span class="lit-category">' + escapeHtml(domainTitle(category)) + '</span>' + chips + '</div></div>'
      + '<div class="row-meta">' + (paper ? '<span class="st st-' + escapeHtml(p.status || 'untracked') + '">' + statusLabel[p.status || 'untracked'] + '</span>' : '')
      + rating + compareAction + '<span class="lit-card-links">' + external + '<a href="' + escapeHtml(detailHref) + '">' + (paper ? '阅读笔记 →' : '查看内容 →') + '</a></span></div></article>';
  }
  function renderContext() {
    const host = document.getElementById('lit-context');
    if (!host) return;
    if (state.query.trim() || !state.selected.startsWith('domain:')) {
      host.innerHTML = ''; return;
    }
    const selected = state.selected.slice(7);
    const domain = domainCatalog.find(item => item.id === selected);
    const descriptor = domain?.description || '本领域的技术原理、代表工作与开放问题都集中在下面，可继续按内容类型筛选。';
    const kinds = ALL.filter(p => p.kind !== 'term' && domainMatches(p.domains, selected))
      .reduce<Record<string, number>>((acc,p)=>{acc[p.kind]=(acc[p.kind]||0)+1;return acc;},{});
    const counts = Object.entries(kinds).map(([kind,n]) => typeLabel[kind] + ' ' + n).join(' · ');
    host.innerHTML = '<div class="lit-context"><div class="lit-context-title">'
      + escapeHtml(domainTitle(selected)) + '</div><p>' + escapeHtml(descriptor)
      + '</p><div class="lit-domain-counts">' + escapeHtml(counts) + '</div></div>';
  }
  function render() {
    renderTree();
    renderContext();
    const data = filteredItems();
    const current = state.selected.startsWith('domain:') ? domainTitle(state.selected.slice(7)) : '全部内容';
    const label = state.query.trim() ? '搜索 “' + escapeHtml(state.query.trim()) + '”' : escapeHtml(current);
    document.getElementById('lit-crumb')!.innerHTML = '<strong>' + label + '</strong><span>' + data.length + ' 条结果</span>';
    updateCompareBar();
    compareBar.hidden = !(state.type === 'paper' || compareIds.size > 0);
    document.getElementById('lit-body')!.innerHTML = data.length ? '<div class="view-list">' + data.slice(0,state.visibleLimit).map(itemRow).join('') + '</div>' : '<div class="lit-empty">没有匹配内容。试试其他关键词或清除筛选条件。</div>';
    const more = document.getElementById('lit-more') as HTMLElement;
    const remaining = Math.max(0,data.length-state.visibleLimit);
    more.hidden = remaining===0;
    (document.getElementById('lit-more-button') as HTMLButtonElement).textContent = '显示更多 · 剩余 '+remaining+' 条';
    (document.getElementById('lit-mobile-active') as HTMLElement).textContent = '浏览研究领域：' + current;
    const showingPapers = !state.query.trim() && state.type === 'paper';
    (document.getElementById('lit-filters') as HTMLElement).hidden = !showingPapers;
    (document.querySelector('.lit-sort-label') as HTMLElement).hidden = !showingPapers && !state.query.trim();
    (document.getElementById('lit-clear') as HTMLButtonElement).hidden = !state.query.trim();
    const defaultSort = document.querySelector<HTMLOptionElement>('#lit-sort option[value="year"]');
    if (defaultSort) defaultSort.textContent = state.query.trim() ? '相关度优先' : state.type === 'paper' ? '年份：新到旧' : '推荐阅读顺序';
    document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(button => button.classList.toggle('active', button.dataset.status === state.status));
    document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(button => button.classList.toggle('active', button.dataset.type === state.type));
  }
  const compareBar = document.querySelector('.lit-compare-bar') as HTMLElement;
  const compareStatus = document.getElementById('lit-compare-status')!;
  const compareLink = document.getElementById('lit-compare-link') as HTMLAnchorElement;
  function updateCompareBar(){
    compareStatus.textContent = compareIds.size
      ? '已选 '+compareIds.size+' / 3 篇论文；'+(compareIds.size<2?'请再选一篇':'可以开始比较')
      : '选择 2–3 篇论文进行横向比较';
    const active = compareIds.size>=2;
    compareLink.href=active ? '/research/compare/?papers='+encodeURIComponent([...compareIds].join(',')) : '/research/compare/';
    compareLink.setAttribute('aria-disabled',String(!active));
    compareBar.classList.toggle('lit-compare-ready',active);
  }
  document.getElementById('lit-body')!.addEventListener('click',e=>{
    const el=(e.target as Element).closest<HTMLButtonElement>('[data-compare-id]');
    if(!el)return;
    const id=el.dataset.compareId || '';
    if(compareIds.has(id))compareIds.delete(id);
    else if(compareIds.size<3)compareIds.add(id);
    else {compareStatus.textContent='最多比较 3 篇，请先取消一篇';return;}
    render();
  });
  compareLink.addEventListener('click',e=>{if(compareIds.size<2){e.preventDefault();compareStatus.textContent='请至少选择 2 篇论文';}});
  document.getElementById('lit-compare-clear')!.addEventListener('click',()=>{compareIds.clear();render();});
  // Continue the previous section locally; never equate visits with true "已读".
  const continueBox = document.getElementById('lit-continue') as HTMLElement;
  const continueLink = document.getElementById('lit-continue-link') as HTMLAnchorElement;
  const previous = (() => {
    try { return JSON.parse(localStorage.getItem('research-last-read-v1') || 'null'); } catch { return null; }
  })();
  if (previous && typeof previous.id === 'string') {
    const match = ALL.find(p => p.id === previous.id);
    if (match) {
      const fragment = typeof previous.section === 'string' && /^[\p{L}\p{N}_%-]+$/u.test(previous.section) ? '#' + encodeURIComponent(previous.section) : '';
      continueLink.href = match.href + fragment;
      continueLink.textContent = '接着阅读：' + match.title + (previous.heading ? ' · ' + String(previous.heading) : '') + ' →';
      continueBox.hidden = false;
    }
  }
  document.getElementById('lit-continue-dismiss')?.addEventListener('click', () => { continueBox.hidden = true; });
  const searchField = document.getElementById('lit-search') as HTMLInputElement;
  searchField.addEventListener('input', () => {
    state.query = searchField.value;
    state.status = 'all';
    state.visibleLimit = 12;
    persistUrl('replace');
    render();
  });
  document.getElementById('lit-clear')!.addEventListener('click', () => {
    state.query = '';
    state.visibleLimit = 12;
    searchField.value = '';
    persistUrl('replace');
    render();
    searchField.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-status]').forEach(button => button.addEventListener('click', () => {
    state.status = button.dataset.status || 'all';
    state.visibleLimit = 12;
    persistUrl('replace');
    render();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(button => button.addEventListener('click', () => {
    state.type = button.dataset.type || 'all';
    state.status = 'all';
    state.visibleLimit = 12;
    persistUrl('push');
    render();
  }));
  document.getElementById('lit-expand')!.addEventListener('click', () => {
    const all: string[] = [];
    const visit=(n:Folder)=>{if(n.children.size)all.push(n.path);n.children.forEach(visit);};
    roots.forEach(visit);
    const expand=all.some(x=>!expanded.has(x));
    for (const p of all) { if(expand) expanded.add(p); else expanded.delete(p); }
    // Collapsed subtrees must never retain invisible keyboard focus.
    focusPath='all';
    renderTree();
  });
  const sortField = document.getElementById('lit-sort') as HTMLSelectElement;
  sortField.addEventListener('change', () => {
    state.sort = sortField.value;
    state.visibleLimit = 12;
    persistUrl('replace');
    render();
  });
  document.getElementById('lit-more-button')!.addEventListener('click',()=>{
    state.visibleLimit+=12;
    render();
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const editing = target?.matches('input,textarea,select,[contenteditable="true"]');
    if (((event.key === '/' && !editing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'))) {
      event.preventDefault();
      searchField.focus();
      searchField.select();
    } else if (event.key === 'Escape' && document.activeElement === searchField) {
      searchField.value = '';
      state.query = '';
      state.visibleLimit = 12;
      searchField.blur();
      persistUrl('replace');
      render();
    }
  });
  const restoreFromHistory = () => {
    const params = new URLSearchParams(window.location.search);
    state.selected = currentFolderFromUrl();
    const requestedType = params.get('type') || ({ papers: 'paper', reviews: 'review', ideas: 'exploration', paths: 'path', glossary: 'glossary' }[params.get('folder') || ''] || 'all');
    state.type = ['all','paper','review','qa','exploration','plan','glossary','path'].includes(requestedType) ? requestedType : 'all';
    const status = params.get('status')||'all';
    const sort = params.get('sort')||'year';
    state.status = ['all','read','reading','to-read','untracked'].includes(status) ? status : 'all';
    state.sort = ['year','added','rating','title'].includes(sort) ? sort : 'year';
    state.query = (params.get('q')||'').slice(0,300);
    state.visibleLimit = 12;
    (document.getElementById('lit-search') as HTMLInputElement).value=state.query;
    (document.getElementById('lit-sort') as HTMLSelectElement).value=state.sort;
    exposeAncestors(state.selected);
    focusPath = state.selected;
    render();
  };
  window.addEventListener('popstate',restoreFromHistory);
  restoreFromHistory();
