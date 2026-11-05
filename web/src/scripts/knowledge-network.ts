import type { KnowledgeNode, KnowledgeEdge } from '../lib/knowledge-network';

type Graph={
  nodes:KnowledgeNode[];edges:KnowledgeEdge[];
  stats:{areas:number;topics:number;documents:number;links:number;isolated:number};
  world:{width:number;height:number};
};
const src=document.getElementById('kn-data');
if(src){
  const graph=JSON.parse(src.textContent||'{}') as Graph;
  const byId=new Map(graph.nodes.map(n=>[n.id,n]));
  const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
  const svg=document.getElementById('kn-svg') as unknown as SVGSVGElement;
  const world=document.getElementById('kn-world') as unknown as SVGGElement;
  const viewport=$<HTMLDivElement>('kn-viewport');
  const panel=$<HTMLElement>('kn-inspector');
  const search=$<HTMLInputElement>('kn-search');
  const open=$<HTMLAnchorElement>('kn-open');
  const studied=$<HTMLButtonElement>('kn-studied');
  const ai=$<HTMLButtonElement>('kn-ai-prompt');
  const sources=$<HTMLUListElement>('kn-sources');
  const connections=$<HTMLDivElement>('kn-connections');
  const tooltip=$<HTMLDivElement>('kn-tooltip');
  const fallback=$<HTMLTextAreaElement>('kn-prompt-fallback');
  const feedback=$<HTMLElement>('kn-feedback');
  const groups=[...svg.querySelectorAll<SVGGElement>('[data-node-id]')];
  const edgeEls=[...svg.querySelectorAll<SVGPathElement>('.kn-edge')];
  const els=new Map(groups.map(el=>[el.dataset.nodeId||'',el]));
  const edgeElements=graph.edges.map((e,i)=>({...e,el:edgeEls[i]}));
  const filters=[...document.querySelectorAll<HTMLButtonElement>('[data-kn-filter]')];
  const viewButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-kn-view]')];
  const resultBox=$<HTMLDivElement>('kn-search-results');
  const back=$<HTMLButtonElement>('kn-back');
  const contextLabel=$<HTMLElement>('kn-context-label');
  const visibleCount=$<HTMLElement>('kn-visible-count');
  const STORE='suchenl-knowledge-studied-v2';
  const priorSTORE='suchenl-knowledge-studied-v1';
  let marks=new Set<string>();
  try{
    const raw=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(priorSTORE)||'[]') as unknown;
    if(Array.isArray(raw))marks=new Set(raw.filter((v):v is string=>
      typeof v==='string'&&byId.has(v)));
  }catch{}
  const isEn=()=>document.documentElement.getAttribute('data-lang')==='en';
  const t=(zh:string,en:string)=>isEn()?en:zh;
  const title=(n:KnowledgeNode)=>isEn()?n.titleEn:n.titleZh;
  const kindLabel=(n:KnowledgeNode)=>
    n.kind==='area'?t('研究领域','AREA'):n.kind==='topic'?t('知识专题','TOPIC'):
    n.contentType==='paper'?t('论文笔记','PAPER'):n.contentType==='qa'?t('技术问答','QUESTION'):
    n.contentType==='exploration'?t('研究探索','EXPLORATION'):t('知识文章','KNOWLEDGE NOTE');
  let selected:string|null=null;
  let hovered:string|null=null;
  let filter='all';
  let view:'overview'|'all'|'area'|'local'='overview';
  let returnView:'overview'|'all'='overview';
  let areaFocus:string|null=null;
  let localFocus:string|null=null;

  const typed=graph.edges.filter(e=>['references','semantic','reading_step'].includes(e.kind));
  const citeDegree=new Map<string,number>();
  for(const e of typed){
    citeDegree.set(e.from,(citeDegree.get(e.from)||0)+1);
    citeDegree.set(e.to,(citeDegree.get(e.to)||0)+1);
  }
  // Overview includes only existing domain hubs, real topic overviews, and
  // three linked documents per domain. No synthetic nodes are created.
  const overview=new Set(graph.nodes.filter(n=>n.kind==='area'||n.kind==='topic').map(n=>n.id));
  for(const area of graph.nodes.filter(n=>n.kind==='area')){
    const items=graph.nodes.filter(n=>n.kind==='document'&&n.group===area.group);
    items.sort((a,b)=>(citeDegree.get(b.id)||0)-(citeDegree.get(a.id)||0)||
      a.titleZh.localeCompare(b.titleZh,'zh'));
    items.slice(0,3).forEach(n=>overview.add(n.id));
  }
  const direct=new Map<string,Set<string>>();
  for(const e of graph.edges.filter(e=>e.kind!=='belongs_to')){
    if(!direct.has(e.from))direct.set(e.from,new Set());
    if(!direct.has(e.to))direct.set(e.to,new Set());
    direct.get(e.from)!.add(e.to);direct.get(e.to)!.add(e.from);
  }
  const localSet=()=>{
    const ids=new Set<string>();
    if(!localFocus)return ids;
    ids.add(localFocus);
    const selectedNode=byId.get(localFocus);
    if(selectedNode?.parent)ids.add(selectedNode.parent);
    direct.get(localFocus)?.forEach(id=>ids.add(id));
    return ids;
  };
  const showNode=(n:KnowledgeNode)=>{
    if(view==='all')return true;
    if(view==='overview')return overview.has(n.id);
    if(view==='area'){
      if(n.id===areaFocus)return true;
      const a=areaFocus?byId.get(areaFocus):null;
      return !!a&&n.group===a.group&&n.kind!=='area';
    }
    return localSet().has(n.id);
  };
  const viewLabel=()=>{
    if(view==='overview')return t('先看已有领域、专题和重要知识入口','Explore areas, real topics and linked entry points');
    if(view==='all')return t('全部真实条目 · 连线仅呈现可核实的关系','All published notes · Only evidence-backed lines');
    const n=byId.get(view==='area'?areaFocus||'':localFocus||'');
    return n?t((view==='area'?'领域：':'局部关联：')+n.titleZh,(view==='area'?'Area: ':'Local: ')+n.titleEn):'';
  };
  function refreshViewControls(){
    viewButtons.forEach(b=>{
      const active=b.dataset.knView===view;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    back.hidden=view==='overview'||view==='all';
    contextLabel.textContent=viewLabel();
  }
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
  // Camera interpolates with one requestAnimationFrame loop, not CSS transform chains.
  const current={x:0,y:0,s:1};
  const target={x:0,y:0,s:1};
  let animating=false;
  function paintCamera(){
    world.setAttribute('transform',
      'translate('+current.x.toFixed(3)+' '+current.y.toFixed(3)+') scale('+current.s.toFixed(4)+')');
  }
  function frame(){
    const ease=reduceMotion?1:.2;
    current.x+=(target.x-current.x)*ease;
    current.y+=(target.y-current.y)*ease;
    current.s+=(target.s-current.s)*ease;
    paintCamera();
    if(Math.abs(target.x-current.x)+Math.abs(target.y-current.y)+
       Math.abs(target.s-current.s)*100>.08)requestAnimationFrame(frame);
    else{
      current.x=target.x;current.y=target.y;current.s=target.s;
      paintCamera();animating=false;
    }
  }
  function animate(){
    if(!animating){animating=true;requestAnimationFrame(frame);}
  }
  function svgPoint(clientX:number,clientY:number){
    const ctm=svg.getScreenCTM();
    const pt=svg.createSVGPoint();
    pt.x=clientX;pt.y=clientY;
    return ctm?pt.matrixTransform(ctm.inverse()):{x:clientX,y:clientY};
  }
  function zoomAt(factor:number,x=graph.world.width/2,y=graph.world.height/2){
    const s=clamp(target.s*factor,.65,4.4);
    const actual=s/target.s;
    target.x=x-(x-target.x)*actual;
    target.y=y-(y-target.y)*actual;
    target.s=s;animate();
  }
  function centerOn(id:string,scale=1.9){
    const n=byId.get(id);if(!n)return;
    const s=clamp(scale,.65,4.4);
    target.s=s;
    target.x=graph.world.width*(window.innerWidth<=650?.5:.32)-n.x*s;
    target.y=graph.world.height*.50-n.y*s;
    animate();
  }
  function nodeMatches(n:KnowledgeNode){
    const q=search.value.trim().toLocaleLowerCase();
    const text=!q||[n.titleZh,n.titleEn,n.shortZh,n.shortEn,n.descriptionZh,n.descriptionEn]
      .some(s=>s.toLocaleLowerCase().includes(q));
    const type=filter==='all'||
      (filter==='topic'&&n.kind==='topic')||
      (filter==='paper'&&n.contentType==='paper')||
      (filter==='question'&&['qa','exploration'].includes(n.contentType))||
      (filter==='unstudied'&&n.kind!=='area'&&!marks.has(n.id));
    return text&&type;
  }
  function neighbours(id:string){
    const out=new Set<string>([id]);
    for(const e of graph.edges){
      if(e.from===id)out.add(e.to);
      if(e.to===id)out.add(e.from);
    }
    return out;
  }
  function restyle(){
    const local=localSet();
    const active=hovered||selected;
    const connected=active?neighbours(active):null;
    let visible=0;
    for(const g of groups){
      const n=byId.get(g.dataset.nodeId||'');
      if(!n)continue;
      const shown=showNode(n);
      g.classList.toggle('is-hidden',!shown);
      g.setAttribute('tabindex',shown?'0':'-1');
      if(!shown)continue;
      visible++;
      const matching=nodeMatches(n);
      const dim=(!matching&&n.id!==active)||(connected&&!connected.has(n.id));
      g.classList.toggle('is-dim',!!dim);
      g.classList.toggle('is-active',n.id===active);
      g.classList.toggle('is-studied',marks.has(n.id));
      g.classList.toggle('is-key',overview.has(n.id)&&n.kind==='document');
      g.classList.toggle('is-local',view==='local'&&local.has(n.id));
      g.setAttribute('aria-pressed',String(n.id===selected));
      g.setAttribute('aria-label',title(n)+' · '+kindLabel(n));
    }
    for(const e of edgeElements){
      const a=byId.get(e.from),b=byId.get(e.to);
      // Domain membership influences positions and color, not visible spokes.
      // Other edge types only appear when both real endpoints are visible.
      const drawn=(e.kind!=='belongs_to'||view==='overview')&&!!a&&!!b&&showNode(a)&&showNode(b);
      e.el.classList.toggle('is-hidden',!drawn);
      if(!drawn)continue;
      const important=!!active&&(e.from===active||e.to===active);
      const filtered=!!a&&!!b&&nodeMatches(a)&&nodeMatches(b);
      e.el.classList.toggle('kn-edge-focus',important);
      e.el.classList.toggle('kn-edge-dim',!important&&(!!active||!filtered));
    }
    visibleCount.textContent=t(visible+' 个节点',''+visible+' nodes');
    refreshViewControls();
  }
  function connectionList(id:string){
    const priority=(e:KnowledgeEdge)=>e.kind==='semantic'?0:e.kind==='reading_step'?1:
      e.kind==='references'?2:e.kind==='topic_contains'?3:4;
    const seen=new Set<string>();
    return graph.edges.filter(e=>e.from===id||e.to===id)
      .sort((a,b)=>priority(a)-priority(b))
      .filter(e=>{
        const key=e.from===id?e.to:e.from;
        if(seen.has(key))return false;
        seen.add(key);return true;
      }).slice(0,12);
  }
  function edgeLabel(e:KnowledgeEdge){
    if(e.kind==='semantic'){
      const labels:Record<string,[string,string]>={
        requires:['前置知识','Prerequisite'],
        compares:['比较','Comparison'],
        extends:['后续扩展','Extends'],
        questions:['提出问题','Questions'],
        supports:['支持证据','Supports']
      };
      const pair=labels[e.relation||''];
      return pair?t(pair[0],pair[1]):t('人工注明关系','Typed relation');
    }
    return e.kind==='references'?t('正文链接','Text link'):
      e.kind==='reading_step'?t('学习路线步骤','Reading path'):
      e.kind==='topic_contains'?t('专题收录','Topic membership'):
      t('领域归属','Domain category');
  }
  function renderPanel(){
    const n=selected?byId.get(selected):null;
    if(!n){panel.hidden=true;restyle();return;}
    panel.hidden=false;
    $('kn-kind').textContent=kindLabel(n).toLocaleUpperCase();
    $('kn-phase').textContent=t('真实公开内容','PUBLISHED CONTENT');
    $('kn-detail-title').textContent=title(n);
    $('kn-detail-description').textContent=isEn()?n.descriptionEn:n.descriptionZh;
    $('kn-detail-count').textContent=String(n.count);
    $('kn-detail-progress').textContent=n.kind==='area'?'—':marks.has(n.id)?t('已学习','Studied'):t('未标记','Unmarked');
    open.href=n.href;
    const z=open.querySelector('[data-l="zh"]');
    const en=open.querySelector('[data-l="en"]');
    if(z)z.textContent=n.kind==='area'?'进入研究领域':n.kind==='topic'?'打开专题':'阅读原始文章';
    if(en)en.textContent=n.kind==='area'?'Open research area':n.kind==='topic'?'Open topic':'Read source article';
    studied.hidden=n.kind==='area';
    const sz=studied.querySelector('[data-l="zh"]');
    const se=studied.querySelector('[data-l="en"]');
    if(sz)sz.textContent=marks.has(n.id)?'取消已学习标记':'标记为已学习';
    if(se)se.textContent=marks.has(n.id)?'Remove studied mark':'Mark as studied';
    sources.replaceChildren();
    for(const resource of n.resources){
      const li=document.createElement('li'),a=document.createElement('a');
      a.href=resource.href;a.textContent=resource.title;
      li.append(a);sources.append(li);
    }
    connections.replaceChildren();
    const links=connectionList(n.id);
    if(!links.length)connections.textContent=t('暂无明确连接，可阅读当前正文。','No direct connections yet; open the article to explore.');
    for(const edge of links){
      const targetId=edge.from===n.id?edge.to:edge.from;
      const peer=byId.get(targetId);
      if(!peer)continue;
      const item=document.createElement('div');
      item.className='kn-connection-item';
      const row=document.createElement('div');
      row.className='kn-connection-head';
      const button=document.createElement('button');
      button.type='button';button.className='kn-connection-target';
      button.textContent=title(peer);
      button.addEventListener('click',()=>select(peer.id,true));
      const badge=document.createElement('span');
      badge.className='kn-connection-kind kn-connection-'+edge.kind;
      badge.textContent=edgeLabel(edge);
      const direction=document.createElement('small');
      direction.className='kn-connection-direction';
      direction.textContent=edge.from===n.id?t('本页链接至对方 →','Outward →'):t('← 对方链接至本页','← Inbound');
      row.append(button,badge);item.append(row,direction);
      if(edge.evidence){
        const evidence=document.createElement('p');
        evidence.className='kn-connection-evidence';
        evidence.textContent=edge.evidence;
        item.append(evidence);
      }
      if(edge.sourceHref){
        const link=document.createElement('a');
        link.className='kn-connection-source';
        link.href=edge.sourceHref;
        link.textContent=t('查看关系出处 ↗','View source ↗');
        item.append(link);
      }
      connections.append(item);
    }
    fallback.hidden=true;feedback.textContent='';
    restyle();
  }
  function select(id:string,focus=false){
    const n=byId.get(id);
    if(!n)return;
    if(view==='all'||view==='overview')returnView=view;
    hovered=null;selected=id;
    areaFocus=n.kind==='area'?id:null;
    localFocus=n.kind==='area'?null:id;
    view=n.kind==='area'?'area':'local';
    tooltip.hidden=true;resultBox.hidden=true;
    renderPanel();
    centerOn(id,n.kind==='area'?1.28:1.83);
    const url=new URL(location.href);
    url.searchParams.set('node',id);
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  function clearSelection(){
    hovered=null;selected=null;areaFocus=null;localFocus=null;
    view=returnView;
    panel.hidden=true;tooltip.hidden=true;
    const url=new URL(location.href);url.searchParams.delete('node');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    restyle();
    if(view==='overview'||view==='all')return;
    target.x=0;target.y=0;target.s=1;animate();
  }
  // Hover: reveal the local one-hop neighbourhood instead of a noisy entire graph.
  function showHover(id:string|null,e?:PointerEvent){
    if(hovered===id&&id&&e){placeTooltip(e);return;}
    hovered=id;
    if(id){
      const n=byId.get(id);
      if(n){
        $('kn-tooltip-title').textContent=title(n);
        $('kn-tooltip-kind').textContent=kindLabel(n).toLocaleUpperCase();
        tooltip.hidden=!e;
        if(e)placeTooltip(e);
      }
    }else tooltip.hidden=true;
    restyle();
  }
  function placeTooltip(e:PointerEvent){
    const rect=viewport.getBoundingClientRect();
    const x=clamp(e.clientX-rect.left+14,8,Math.max(8,rect.width-254));
    const y=clamp(e.clientY-rect.top+16,8,Math.max(8,rect.height-125));
    tooltip.style.left=x+'px';tooltip.style.top=y+'px';
  }
  function redrawLinks(id:string){
    for(const e of edgeElements){
      if(e.from!==id&&e.to!==id)continue;
      const a=byId.get(e.from)!,b=byId.get(e.to)!;
      e.el.setAttribute('d','M '+a.x+' '+a.y+' L '+b.x+' '+b.y);
    }
  }
  // Pointer gestures: drag the background, reposition a node, pinch to zoom.
  const points=new Map<number,{x:number;y:number}>();
  let gesture:{id:number;kind:'node'|'pan';node?:string;lastX:number;lastY:number;startX:number;startY:number;moved:boolean}|null=null;
  let pinchDistance=0, pinchCenter:{x:number;y:number}|null=null;
  function worldHit(e:PointerEvent){
    return (e.target as Element).closest?.('[data-node-id]') as SVGGElement|null;
  }
  viewport.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    const el=worldHit(e);
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(points.size===1){
      gesture={id:e.pointerId,kind:el?'node':'pan',node:el?.dataset.nodeId,
        lastX:e.clientX,lastY:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
      if(el)el.classList.add('is-dragging');
      else viewport.classList.add('is-panning');
    }else{
      gesture=null;
      const pp=[...points.values()];
      pinchDistance=Math.hypot(pp[0].x-pp[1].x,pp[0].y-pp[1].y);
      pinchCenter={x:(pp[0].x+pp[1].x)/2,y:(pp[0].y+pp[1].y)/2};
    }
    viewport.setPointerCapture(e.pointerId);
    tooltip.hidden=true;hovered=null;
  });
  viewport.addEventListener('pointermove',e=>{
    const pt=points.get(e.pointerId);
    if(!pt){
      const el=worldHit(e);
      showHover(el?.dataset.nodeId||null,e);
      return;
    }
    const dx=e.clientX-pt.x,dy=e.clientY-pt.y;
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(points.size>=2){
      const pair=[...points.values()];
      const dist=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
      const center={x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2};
      if(pinchCenter&&pinchDistance){
        const sp=svgPoint(center.x,center.y);
        const previous=svgPoint(pinchCenter.x,pinchCenter.y);
        target.x+=sp.x-previous.x;target.y+=sp.y-previous.y;
        zoomAt(clamp(dist/pinchDistance,.8,1.25),sp.x,sp.y);
      }
      pinchDistance=dist;pinchCenter=center;
      return;
    }
    if(!gesture||gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>5)gesture.moved=true;
    const last=svgPoint(gesture.lastX,gesture.lastY),now=svgPoint(e.clientX,e.clientY);
    const sx=now.x-last.x,sy=now.y-last.y;
    if(gesture.kind==='pan'){
      target.x+=sx;target.y+=sy;animate();
    }else if(gesture.node&&gesture.moved){
      const n=byId.get(gesture.node)!;
      n.x+=sx/target.s;n.y+=sy/target.s;
      els.get(n.id)?.setAttribute('transform','translate('+n.x+' '+n.y+')');
      redrawLinks(n.id);
    }
    gesture.lastX=e.clientX;gesture.lastY=e.clientY;
  });
  function endPointer(e:PointerEvent){
    const was=gesture?.id===e.pointerId?gesture:null;
    if(was?.node&&!was.moved)select(was.node,false);
    if(was?.node)els.get(was.node)?.classList.remove('is-dragging');
    points.delete(e.pointerId);
    if(points.size===0){gesture=null;viewport.classList.remove('is-panning');}
    else gesture=null;
    pinchDistance=0;pinchCenter=null;
    if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  }
  viewport.addEventListener('pointerup',endPointer);
  viewport.addEventListener('pointercancel',endPointer);
  viewport.addEventListener('pointerleave',()=>{if(points.size===0)showHover(null);});
  svg.addEventListener('wheel',e=>{
    e.preventDefault();
    const p=svgPoint(e.clientX,e.clientY);
    zoomAt(Math.exp(-e.deltaY*.00145),p.x,p.y);
  },{passive:false});
  svg.addEventListener('dblclick',e=>{
    const node=worldHit(e);if(node?.dataset.nodeId){e.preventDefault();select(node.dataset.nodeId,true);}
    else{target.x=0;target.y=0;target.s=1;animate();}
  });
  groups.forEach(group=>{
    group.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();if(group.dataset.nodeId)select(group.dataset.nodeId,true);
      }
    });
    group.addEventListener('focus',()=>showHover(group.dataset.nodeId||null));
    group.addEventListener('blur',()=>showHover(null));
  });
  viewport.addEventListener('keydown',e=>{
    if(e.target!==viewport)return;
    if(e.key==='+'||e.key==='='){zoomAt(1.24);e.preventDefault();}
    if(e.key==='-'){zoomAt(1/1.24);e.preventDefault();}
    if(e.key==='ArrowLeft'){target.x+=45;animate();e.preventDefault();}
    if(e.key==='ArrowRight'){target.x-=45;animate();e.preventDefault();}
    if(e.key==='ArrowUp'){target.y+=45;animate();e.preventDefault();}
    if(e.key==='ArrowDown'){target.y-=45;animate();e.preventDefault();}
    if(e.key==='Escape'){clearSelection();e.preventDefault();}
  });
  $('kn-zoom-in').addEventListener('click',()=>zoomAt(1.24));
  $('kn-zoom-out').addEventListener('click',()=>zoomAt(1/1.24));
  $('kn-reset').addEventListener('click',()=>{
    target.x=0;target.y=0;target.s=1;animate();
    clearSelection();
  });
  $('kn-close').addEventListener('click',clearSelection);
  document.querySelectorAll<HTMLButtonElement>('[data-kn-select]').forEach(button=>{
    button.addEventListener('click',()=>{
      const id=button.dataset.knSelect;
      if(id){select(id,true);document.getElementById('kn-title')?.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });
  filters.forEach(b=>b.addEventListener('click',()=>{
    filter=b.dataset.knFilter||'all';
    filters.forEach(button=>{
      const active=button===b;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    restyle();
    if(search.value.trim())renderSearch();
  }));
  viewButtons.forEach(button=>button.addEventListener('click',()=>{
    const next=button.dataset.knView==='all'?'all':'overview';
    if(view===next&&selected===null)return;
    selected=null;hovered=null;localFocus=null;areaFocus=null;
    view=next;returnView=next;panel.hidden=true;tooltip.hidden=true;
    const url=new URL(location.href);url.searchParams.delete('node');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    target.x=0;target.y=0;target.s=1;animate();
    restyle();
  }));
  back.addEventListener('click',()=>{
    clearSelection();
    target.x=0;target.y=0;target.s=1;animate();
  });
  function renderSearch(){
    const query=search.value.trim().toLocaleLowerCase();
    resultBox.replaceChildren();
    if(!query){resultBox.hidden=true;return;}
    const score=(n:KnowledgeNode)=>{
      const needle=n.titleZh.toLocaleLowerCase(),eng=n.titleEn.toLocaleLowerCase();
      const q=query;
      return needle===q||eng===q?0:needle.startsWith(q)||eng.startsWith(q)?1:
        needle.includes(q)||eng.includes(q)?2:n.shortZh.toLocaleLowerCase().includes(q)?3:4;
    };
    const matches=graph.nodes.filter(n=>nodeMatches(n))
      .sort((a,b)=>score(a)-score(b)||
        (citeDegree.get(b.id)||0)-(citeDegree.get(a.id)||0)||
        a.titleZh.localeCompare(b.titleZh,'zh')).slice(0,8);
    if(!matches.length){
      const empty=document.createElement('p');
      empty.className='kn-search-empty';
      empty.textContent=t('没有匹配的已收录知识','No published notes match');
      resultBox.append(empty);
    }
    for(const n of matches){
      const button=document.createElement('button');
      button.type='button';button.setAttribute('role','option');
      button.className='kn-search-option';
      const kind=document.createElement('small');
      kind.textContent=kindLabel(n);
      const name=document.createElement('strong');
      name.textContent=title(n);
      button.append(kind,name);
      button.addEventListener('click',()=>{
        search.value='';resultBox.hidden=true;
        select(n.id,true);search.blur();
      });
      resultBox.append(button);
    }
    resultBox.hidden=false;
  }
  search.addEventListener('input',()=>{
    hovered=null;
    restyle();
    renderSearch();
  });
  search.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){
      const first=resultBox.querySelector<HTMLButtonElement>('button');
      if(first){e.preventDefault();first.focus();}
    }else if(e.key==='Enter'){
      const first=resultBox.querySelector<HTMLButtonElement>('button');
      if(first){e.preventDefault();first.click();}
    }else if(e.key==='Escape'){
      search.value='';resultBox.hidden=true;showHover(null);restyle();
    }
  });
  resultBox.addEventListener('keydown',e=>{
    const active=document.activeElement as HTMLElement;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      const options=Array.from(resultBox.querySelectorAll<HTMLButtonElement>('button'));
      const idx=options.indexOf(active as HTMLButtonElement);
      const next=options[clamp(idx+(e.key==='ArrowDown'?1:-1),0,options.length-1)];
      if(next){e.preventDefault();next.focus();}
    }else if(e.key==='Escape'){resultBox.hidden=true;search.focus();}
  });
  document.addEventListener('pointerdown',e=>{
    const el=e.target as Node;
    if(!resultBox.contains(el)&&!search.contains(el))resultBox.hidden=true;
  });
  document.addEventListener('keydown',e=>{
    const target=e.target as HTMLElement;
    if(e.key==='/'&&!/^(INPUT|TEXTAREA)$/.test(target.tagName)){
      e.preventDefault();search.focus();
    }
  });
  studied.addEventListener('click',()=>{
    const n=selected?byId.get(selected):null;
    if(!n||n.kind==='area')return;
    if(marks.has(n.id))marks.delete(n.id);else marks.add(n.id);
    try{localStorage.setItem(STORE,JSON.stringify([...marks]));}catch{}
    renderPanel();feedback.textContent=t('当前浏览器的学习标记已更新。','Study mark updated in this browser.');
  });
  ai.addEventListener('click',async()=>{
    const n=selected?byId.get(selected):null;
    if(!n)return;
    const prompt=[
      '请围绕我知识库中已存在的公开知识节点「'+n.titleZh+'」辅助我系统学习与完善现有知识。',
      '已有正文链接：'+n.href+'；相关内容：'+n.resources.map(x=>x.href).join('、'),
      '请先阅读并核验现有公开内容和来源，不创建虚构的主题、论文或知识图谱关系。',
      '请输出：一句话理解、关键概念与先修知识、机制解释、真实案例、容易混淆之处、证据与适用边界、尚需验证的问题、循序渐进的学习步骤和自测问题。',
      '区分事实、他人观点、我的推论与未验证猜想；明确可靠原始来源；所有新链接必须指向真实资源。',
      '如需补充正文，只修改已有唯一 Markdown 主文档；不得自动公开私人仓库、内部实验和未发表材料；所有改动须由作者审核。',
      'AI 起草、自动总结或联网搜索不代表我已经阅读或掌握该主题。'
    ].join('\n\n');
    try{
      await navigator.clipboard.writeText(prompt);
      fallback.hidden=true;
      feedback.textContent=t('已复制深入学习任务。','Deep-dive study task copied.');
    }catch{
      fallback.hidden=false;fallback.value=prompt;fallback.focus();fallback.select();
      feedback.textContent=t('请从文本框手动复制任务。','Please copy the task manually.');
    }
  });
  new MutationObserver(()=>{
    restyle();if(selected)renderPanel();
    search.placeholder=t('搜索知识、论文或专题…','Search notes, papers and topics…');
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  const fromURL=new URL(location.href).searchParams.get('node');
  if(fromURL&&byId.has(fromURL))select(fromURL,true);
  restyle();paintCamera();
}
