import type { KnowledgeNode, KnowledgeEdge } from '../lib/knowledge-network';

type Graph = { nodes:KnowledgeNode[];edges:KnowledgeEdge[];stats:{topics:number;ready:number;empty:number;areas:number;publicDocs:number} };
const source=document.getElementById('kn-data');
if(source){
  const graph=JSON.parse(source.textContent || '{}') as Graph;
  const byId=new Map(graph.nodes.map(n=>[n.id,n]));
  const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
  const search=$<HTMLInputElement>('kn-search');
  const svg=document.getElementById('kn-svg') as unknown as SVGSVGElement;
  const viewport=document.querySelector<HTMLElement>('.kn-viewport');
  const open=$<HTMLAnchorElement>('kn-open');
  const studied=$<HTMLButtonElement>('kn-studied');
  const ai=$<HTMLButtonElement>('kn-ai-prompt');
  const sources=$<HTMLUListElement>('kn-sources');
  const connections=$<HTMLElement>('kn-connections');
  const feedback=$<HTMLElement>('kn-feedback');
  const promptFallback=$<HTMLTextAreaElement>('kn-prompt-fallback');
  const filterButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-kn-filter]'));
  const mapNodes=Array.from(svg.querySelectorAll<SVGGElement>('[data-node-id]'));
  const mapEdges=Array.from(svg.querySelectorAll<SVGPathElement>('[data-edge-kind]'));
  const STORE='suchenl-knowledge-studied-v1';
  let marked=new Set<string>();
  try{
    const raw=JSON.parse(localStorage.getItem(STORE)||'[]') as unknown;
    if(Array.isArray(raw)) marked=new Set(raw.filter((x):x is string=>typeof x==='string'&&byId.get(x)?.kind==='topic'));
  }catch{}
  let selected='knowledge:root';
  let filter='all';
  const lang=()=>document.documentElement.getAttribute('data-lang')==='en'?'en':'zh';
  const tt=(zh:string,en:string)=>lang()==='zh'?zh:en;
  const label=(node:KnowledgeNode)=>lang()==='zh'?node.titleZh:node.titleEn;
  const say=(zh:string,en:string)=>{feedback.textContent=tt(zh,en);};
  const kindText=(n:KnowledgeNode)=>n.kind==='root'?tt('全站知识','KNOWLEDGE'):n.kind==='area'?tt('知识领域','AREA'):tt('知识专题','TOPIC');
  const phaseText=(n:KnowledgeNode)=>n.phase==='ready'?tt('已有公开资料','Has public content'):n.phase==='partial'?tt('部分覆盖','Partly covered'):tt('待建设','Uncovered');

  function related(node:KnowledgeNode){
    const ids=new Set<string>();
    for(const e of graph.edges){
      if(e.from===node.id)ids.add(e.to);
      if(e.to===node.id)ids.add(e.from);
    }
    ids.delete('knowledge:root');
    return [...ids].map(id=>byId.get(id)).filter((n):n is KnowledgeNode=>!!n).slice(0,10);
  }
  function renderSelection(){
    const n=byId.get(selected)||graph.nodes[0];
    $('kn-kind').textContent=kindText(n);
    $('kn-phase').textContent=phaseText(n);
    $('kn-detail-title').textContent=label(n);
    $('kn-detail-description').textContent=lang()==='zh'?n.descriptionZh:n.descriptionEn;
    $('kn-detail-count').textContent=String(n.count);
    $('kn-detail-progress').textContent=n.kind==='topic'?(marked.has(n.id)?tt('已学习','Studied'):tt('未标记','Not marked')):'—';
    open.hidden=!n.href;
    if(n.href){
      open.href=n.href;
      const z=open.querySelector('[data-l="zh"]');
      const e=open.querySelector('[data-l="en"]');
      if(z)z.textContent=n.kind==='area'?'进入领域':n.kind==='topic'?'阅读相关知识':'探索研究知识库';
      if(e)e.textContent=n.kind==='area'?'Open area':n.kind==='topic'?'Read this topic':'Explore research library';
    }
    studied.hidden=n.kind!=='topic';
    const zh=studied.querySelector('[data-l="zh"]');
    const en=studied.querySelector('[data-l="en"]');
    if(zh)zh.textContent=marked.has(n.id)?'取消已学习标记':'标记为已学习';
    if(en)en.textContent=marked.has(n.id)?'Remove studied mark':'Mark as studied';
    ai.hidden=n.kind==='root';
    const aizh=ai.querySelector('[data-l="zh"]');const aien=ai.querySelector('[data-l="en"]');
    if(aizh)aizh.textContent=n.phase==='empty'?'复制 AI 补全任务':'复制 AI 深入扩展任务';
    if(aien)aien.textContent=n.phase==='empty'?'Copy AI drafting task':'Copy AI extension task';
    sources.replaceChildren();
    if(n.resources.length===0){
      const li=document.createElement('li');li.textContent=tt('尚无已收录的公开文章','No categorized public articles yet');sources.append(li);
    }else for(const r of n.resources){
      const li=document.createElement('li');const a=document.createElement('a');
      a.href=r.href;a.textContent=r.title;li.append(a);sources.append(li);
    }
    connections.replaceChildren();
    const peers=related(n);
    if(peers.length===0){connections.textContent=tt('暂无明确关联','No confirmed connections');}
    for(const peer of peers){
      const btn=document.createElement('button');btn.type='button';btn.textContent=label(peer);
      btn.addEventListener('click',()=>select(peer.id,true));connections.append(btn);
    }
    for(const g of mapNodes){
      const isSelected=g.dataset.nodeId===n.id;
      g.classList.toggle('is-selected',isSelected);
      g.classList.toggle('is-studied',marked.has(g.dataset.nodeId||''));
      g.setAttribute('aria-pressed',String(isSelected));
      const node=byId.get(g.dataset.nodeId||'');
      if(node)g.setAttribute('aria-label',label(node)+' · '+phaseText(node));
    }
    for(const e of mapEdges){
      e.classList.toggle('kn-edge-active',e.dataset.from===n.id||e.dataset.to===n.id);
    }
  }
  function updateFilter(){
    const q=search.value.toLocaleLowerCase().trim();
    let visible=0;
    for(const g of mapNodes){
      const n=byId.get(g.dataset.nodeId||'');if(!n)continue;
      const matchText=!q||[n.titleZh,n.titleEn,n.shortZh,n.shortEn,n.descriptionZh,n.descriptionEn].some(s=>s.toLocaleLowerCase().includes(q));
      const matchStatus=filter==='all'||(filter==='ready'?n.phase!=='empty':n.phase==='empty');
      const dim=n.kind!=='root'&&!(matchText&&matchStatus);
      g.classList.toggle('is-muted',dim);
      if(!dim&&n.kind!=='root')visible++;
    }
    for(const edge of mapEdges){
      const from=svg.querySelector<SVGGElement>('[data-node-id="'+CSS.escape(edge.dataset.from||'')+'"]');
      const to=svg.querySelector<SVGGElement>('[data-node-id="'+CSS.escape(edge.dataset.to||'')+'"]');
      edge.classList.toggle('kn-edge-muted',!!from?.classList.contains('is-muted')||!!to?.classList.contains('is-muted'));
    }
    if(q&&visible===0)say('没有匹配的节点。试试更短的关键词。','No nodes match. Try a shorter search.');
    else if(q||filter!=='all')say(tt('匹配','Matching')+' '+visible+' '+tt('个节点','nodes'),'');
    else feedback.textContent='';
  }
  function scrollNodeIntoView(n:KnowledgeNode){
    if(!viewport)return;
    const scale=svg.getBoundingClientRect().width/1120;
    const wanted=n.x*scale-viewport.clientWidth/2;
    viewport.scrollTo({left:Math.max(0,wanted),behavior:'smooth'});
  }
  function select(id:string,scroll=false){
    const n=byId.get(id);if(!n)return;
    selected=id;
    promptFallback.hidden=true;feedback.textContent='';
    renderSelection();updateFilter();
    const url=new URL(location.href);
    if(id==='knowledge:root')url.searchParams.delete('node');else url.searchParams.set('node',id);
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    if(scroll) {
      scrollNodeIntoView(n);
      document.getElementById('kn-inspector')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
  for(const g of mapNodes){
    const id=g.dataset.nodeId||'';
    g.addEventListener('click',()=>select(id));
    g.addEventListener('keydown',ev=>{
      if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select(id);}
    });
  }
  document.querySelectorAll<HTMLButtonElement>('[data-kn-select]').forEach(button=>{
    button.addEventListener('click',()=>{
      const id=button.dataset.knSelect;
      if(id){
        select(id,true);
        document.getElementById('kn-title')?.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });
  filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
    filter=btn.dataset.knFilter||'all';
    filterButtons.forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    updateFilter();
  }));
  search.addEventListener('input',updateFilter);
  search.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'){
      const visible=mapNodes.find(g=>g.dataset.nodeId!=='knowledge:root'&&!g.classList.contains('is-muted'));
      if(visible){select(visible.dataset.nodeId||'');scrollNodeIntoView(byId.get(visible.dataset.nodeId||'')!);}
    }
  });
  studied.addEventListener('click',()=>{
    const n=byId.get(selected);if(!n||n.kind!=='topic')return;
    if(marked.has(n.id))marked.delete(n.id);else marked.add(n.id);
    try{localStorage.setItem(STORE,JSON.stringify([...marked]));}catch{}
    renderSelection();say('仅已更新当前浏览器中的学习标记。','Study mark updated in this browser only.');
  });
  ai.addEventListener('click',async()=>{
    const n=byId.get(selected);if(!n||n.kind==='root')return;
    const allNames=[n.titleZh,n.titleEn].filter(Boolean).join(' / ');
    const sources=n.resources.map(r=>r.href).join('、')||'暂无已公开资料';
    const prompt=[
      '请协助完善公开个人知识体系中的知识专题：'+allNames,
      '当前状态：'+(n.phase==='empty'?'尚无收录正文':'已有部分公开内容')+'；现有资料：'+sources,
      '工作要求：1. 先检索并查重已有公开 Markdown 与知识分类；2. 明确核心概念、先修内容、关键问题、机制、比较、实践、局限和可追溯的原始资料；3. 分开陈述已证实事实、作者分析与待验证假设；4. 给出可以人工审核的中文草稿以及它与相邻专题的有依据的链接；5. 只建议写入唯一 canonical Markdown，禁止复制正文、杜撰实验或录用状态；6. 不访问、推断、引用或公开任何私人仓库与未公开工作；7. 草稿未经作者核验授权不能直接发布；8. AI 生成不代表作者本人已经学习或掌握。',
      '请输出：知识定位 / 先修关系 / 文章结构 / 来源与核验清单 / 待作者确认的疑问 / 推荐学习顺序。'
    ].join('\n\n');
    try{
      await navigator.clipboard.writeText(prompt);
      promptFallback.hidden=true;
      say('AI 补全任务已复制。请在你选择的 AI 工具中审核使用。','AI drafting task copied. Review it in your preferred AI tool.');
    }catch{
      promptFallback.hidden=false;promptFallback.value=prompt;promptFallback.focus();promptFallback.select();
      say('请从下方文本框手动复制任务。','Copy the task manually from the text box.');
    }
  });
  new MutationObserver(()=>{renderSelection();updateFilter();search.placeholder=tt('搜索知识领域与主题…','Search topics and areas…');}).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  const start=new URL(location.href).searchParams.get('node')||'knowledge:root';
  if(byId.has(start)){selected=start;scrollNodeIntoView(byId.get(start)!);}
  renderSelection();updateFilter();
}
