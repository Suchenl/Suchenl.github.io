const root = document.getElementById('kl-page');
if (root) {
  const cards = [...root.querySelectorAll<HTMLElement>('.kl-note')];
  const articleHost = root.querySelector<HTMLElement>('#kl-articles')!;
  const supplementHeading = root.querySelector<HTMLElement>('#kl-supplement-head')!;
  const guides = [...root.querySelectorAll<HTMLElement>('[data-kl-topic-guide]')];
  const topicQuickstart = root.querySelector<HTMLElement>('#kl-topic-quickstart')!;
  const topicPreviewGroups = [...root.querySelectorAll<HTMLElement>('[data-kl-subarea-topics]')];
  const readingOrders = new Map(guides.map(g=>[
    g.dataset.klTopicGuide || '',
    (g.dataset.klRefs || '').split('|').filter(Boolean)
  ]));
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.kl-tree [data-kl-scope]')];
  const scopes = new Map(buttons.map(b => [b.dataset.klScope || 'all', b]));
  const search = root.querySelector<HTMLInputElement>('#kl-search')!;
  const type = root.querySelector<HTMLSelectElement>('#kl-type')!;
  const counter = root.querySelector<HTMLElement>('#kl-results-count')!;
  const heading = root.querySelector<HTMLElement>('#kl-current-title')!;
  const locationLine = root.querySelector<HTMLElement>('#kl-location')!;
  const more = root.querySelector<HTMLButtonElement>('#kl-more')!;
  const empty = root.querySelector<HTMLElement>('#kl-empty')!;
  const clear = root.querySelector<HTMLButtonElement>('#kl-clear')!;
  const options = [
    ['all','全部类型','All types'],['topic','专题','Topics'],['review','综述','Reviews'],
    ['paper','论文解读','Paper notes'],['qa','技术问答','Q&A'],
    ['exploration','问题与探索','Explorations'],['path','学习路线','Learning paths'],
    ['glossary','概念','Concepts'],['plan','研究计划','Research plans']
  ];
  const allowed = new Set(options.map(o => o[0]));
  const initialLimit = 12;
  let scope = 'all';
  let limit = initialLimit;
  const language = () => document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  const tr = (zh:string,en:string) => language() === 'en' ? en : zh;

  function isMatching(card:HTMLElement) {
    const select = scopes.get(scope);
    const domain = select?.dataset.klDomainId;
    const child = select?.dataset.klChildId;
    const topic = select?.dataset.klTopic;
    const belongs = topic
      ? (card.dataset.klId === 'topics/' + topic + '/README' ||
         card.dataset.klId?.startsWith('topics/' + topic + '/reviews/') ||
         (readingOrders.get(topic) || []).includes(card.dataset.klId || ''))
      : !domain || (card.dataset.klDomains || '').split('|').some(key => {
          const wanted = child ? domain + '/' + child : domain;
          return key === wanted || key.startsWith(wanted + '/');
        });
    return belongs &&
      (type.value === 'all' || type.value === card.dataset.klType) &&
      (!search.value.trim() || (card.dataset.klSearch || '').includes(search.value.trim().toLocaleLowerCase()));
  }
  function render() {
    const matching = cards.filter(isMatching);
    const query = search.value.trim().toLocaleLowerCase();
    const selected = scopes.get(scope) || scopes.get('all')!;
    const topic = selected.dataset.klTopic;
    const steps = topic ? (readingOrders.get(topic) || []) : [];
    const guideMode = !!topic && !query && type.value === 'all' && steps.length>0;
    const preview = !topic && !query && type.value === 'all';
    const activeGroups = topicPreviewGroups.filter(g=>preview && g.dataset.klSubareaTopics === scope);
    topicQuickstart.hidden = activeGroups.length === 0;
    topicPreviewGroups.forEach(g=>g.hidden = !activeGroups.includes(g));
    for (const guide of guides) guide.hidden = !guideMode || guide.dataset.klTopicGuide !== topic;
    if (topic && !query) {
      const order = readingOrders.get(topic) || [];
      const rank = (card:HTMLElement) => {
        const id = card.dataset.klId || '';
        if (id === 'topics/' + topic + '/README') return -1;
        const index = order.indexOf(id);
        return index>=0 ? index : 1000;
      };
      matching.sort((a,b)=>rank(a)-rank(b)||
        Number(a.dataset.klOrder)-Number(b.dataset.klOrder));
    }
    if (query) {
      // Direct title and acronym hits should beat a generic taxonomy/summary
      // mention; the default no-query reading order stays unchanged.
      const rank = (card:HTMLElement) => {
        const title = card.dataset.klTitle || '';
        const aliases = (card.dataset.klAliases || '').split('|');
        return title === query ? 0 : title.startsWith(query) ? 1 :
          aliases.includes(query) ? 2 : title.includes(query) ? 3 :
          aliases.some(a=>a.startsWith(query)) ? 4 : 5;
      };
      matching.sort((a,b) => rank(a)-rank(b));
    }
    // The DOM reading order follows the curated topic sequence or search
    // relevance. Simply hiding cards is insufficient: the old CSS grid
    // otherwise silently reorders them by original publication type.
    // A topic's reading steps already act as linked article cards. Do not
    // duplicate them below; show only real, not-yet-curated additions.
    const listed = guideMode ? matching.filter(card=>{
      const id=card.dataset.klId || '';
      return id !== 'topics/' + topic + '/README' && !steps.includes(id);
    }) : matching;
    const matchedSet = new Set(listed);
    const ordered = [...listed,...cards.filter(card=>!matchedSet.has(card))];
    ordered.forEach(card=>articleHost.appendChild(card));
    const visible = new Set(listed.slice(0,limit));
    for (const card of cards) card.hidden = !visible.has(card);
    supplementHeading.hidden = !guideMode || listed.length===0;
    articleHost.hidden = guideMode && listed.length===0;
    empty.hidden = matching.length !== 0;
    more.hidden = listed.length <= limit;
    counter.textContent = tr(matching.length + ' 篇', matching.length + ' notes');
    const nameZh = selected.dataset.klNameZh || '全部知识';
    const nameEn = selected.dataset.klNameEn || 'All notes';
    const zh = heading.querySelector<HTMLElement>('[data-l="zh"]');
    const en = heading.querySelector<HTMLElement>('[data-l="en"]');
    if (zh) zh.textContent = nameZh;
    if (en) en.textContent = nameEn;
    const zpath = locationLine.querySelector<HTMLElement>('[data-l="zh"]');
    const epath = locationLine.querySelector<HTMLElement>('[data-l="en"]');
    const area = selected.dataset.klDomainId;
    const child = selected.dataset.klChildId;
    if (zpath) zpath.textContent = '知识库 / ' + (area ? area + (child ? ' / ' + child : '') : '全部知识');
    if (epath) epath.textContent = 'Library / ' + nameEn;
    buttons.forEach(b => {
      const active = b.dataset.klScope === scope;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
  function currentUrl() {
    const next = new URL(location.href);
    for (const key of ['scope','type','q','limit']) next.searchParams.delete(key);
    if (scope !== 'all') next.searchParams.set('scope', scope);
    if (type.value !== 'all') next.searchParams.set('type', type.value);
    const q = search.value.trim();
    if (q) next.searchParams.set('q', q.slice(0, 200));
    if (limit > initialLimit) next.searchParams.set('limit', String(limit));
    return next.pathname + next.search + next.hash;
  }
  function persist(mode:'push'|'replace') {
    history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', currentUrl());
  }
  function setScope(next:string) {
    if (!scopes.has(next)) return;
    scope = next;
    limit = initialLimit;
    const chosen = scopes.get(next)!;
    const parent = chosen.closest('details');
    if (parent) parent.open = true;
    render();
    persist('push');
  }
  function restore() {
    const params = new URL(location.href).searchParams;
    scope = scopes.has(params.get('scope') || '') ? params.get('scope')! : 'all';
    const kind = params.get('type') || 'all';
    type.value = allowed.has(kind) ? kind : 'all';
    search.value = (params.get('q') || '').slice(0,200);
    const parsed = Number(params.get('limit'));
    limit = Number.isFinite(parsed) && parsed > initialLimit ? Math.min(96, Math.ceil(parsed / 12) * 12) : initialLimit;
    const parent = scopes.get(scope)?.closest('details');
    if (parent) parent.open = true;
    render();
  }
  buttons.forEach(button => button.addEventListener('click', () => setScope(button.dataset.klScope || 'all')));
  root.querySelectorAll<HTMLButtonElement>('[data-kl-open-topic]').forEach(button=>
    button.addEventListener('click',()=>{
      setScope(button.dataset.klOpenTopic||'all');
      const selection = scopes.get(scope);
      if(selection)selection.focus({preventScroll:true});
    })
  );
  search.addEventListener('input', () => {limit = initialLimit;render();persist('replace');});
  type.addEventListener('change', () => {limit = initialLimit;render();persist('push');});
  more.addEventListener('click', () => {limit += initialLimit;render();persist('replace');});
  clear.addEventListener('click', () => {
    const changed = scope !== 'all' || type.value !== 'all' || search.value !== '';
    scope = 'all';type.value = 'all';search.value = '';limit = initialLimit;
    render(); if (changed) persist('push');
    search.focus({preventScroll:true});
  });
  // Open the existing canonical article while carrying only the current
  // Knowledge filters required for a predictable return link.
  root.querySelectorAll<HTMLAnchorElement>('.kl-note a[href^="/research/"], .kl-topic-guide a[href^="/research/"]').forEach(link =>
    link.addEventListener('click', () => {
      // Recompute from the canonical href so an older scope cannot leak into
      // a later click on the same article after filters have changed.
      const target = new URL(link.dataset.klCanonicalHref || link.getAttribute('href')!, location.origin);
      if (!link.dataset.klCanonicalHref) link.dataset.klCanonicalHref = target.pathname;
      for (const key of ['source','scope','type','q','limit']) target.searchParams.delete(key);
      target.searchParams.set('source','knowledge');
      if (scope !== 'all') target.searchParams.set('scope', scope);
      if (type.value !== 'all') target.searchParams.set('type', type.value);
      const q = search.value.trim();
      if (q) target.searchParams.set('q', q.slice(0,200));
      if (limit > initialLimit) target.searchParams.set('limit', String(limit));
      link.href = target.pathname + target.search;
    })
  );
  document.addEventListener('keydown', e => {
    const target = e.target as HTMLElement;
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
      e.preventDefault();
      search.focus({preventScroll:true});
    }
  });
  function translate() {
    search.placeholder = tr('搜索标题、关键词或文章简介…','Search titles, keywords or summaries…');
    for (const [value,zh,en] of options) {
      const item = type.querySelector<HTMLOptionElement>('option[value="'+value+'"]');
      if (item) item.textContent = tr(zh,en);
    }
    render();
  }
  window.addEventListener('popstate', restore);
  new MutationObserver(translate).observe(document.documentElement,
    {attributes:true,attributeFilter:['data-lang']});
  restore();
  translate();
}