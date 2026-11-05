import { getCollection } from 'astro:content';
import taxonomy from '../../../knowledge/taxonomy.json';

export type KnowledgeResource = { title: string; href: string; kind: string };
export type KnowledgeNode = {
  id: string; kind: 'area' | 'topic' | 'document'; parent?: string;
  titleZh: string; titleEn: string; shortZh: string; shortEn: string;
  descriptionZh: string; descriptionEn: string;
  contentType: string; count: number; href: string; resources: KnowledgeResource[];
  color: string; x: number; y: number; radius: number; group: string;
};
export type KnowledgeEdge = {
  from: string; to: string;
  kind: 'belongs_to' | 'topic_contains' | 'references' | 'semantic';
  evidence: string; sourceHref: string; relation?: string;
};
const PALETTE = ['#79b6ff','#a89cfa','#65d6bd','#f2b872'];
const CENTERS = [
  {x:330,y:260},{x:980,y:260},{x:330,y:690},{x:980,y:690}
];
const WORLD = {width:1310,height:960};
const clean = (value:string) => value.replace(/^\s+|\s+$/g,'');
const entryHref = (id:string) => '/research/' +
  (id.endsWith('/README') ? id.slice(0,-'/README'.length) : id) + '/';
function stableHash(text:string){
  let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return h>>>0;
}
function shortTitle(text:string,max=15){
  const t=clean(text.replace(/\s*[:：]\s*/g,' · '));
  return Array.from(t).length>max?Array.from(t).slice(0,max-1).join('')+'…':t;
}
function resolveNoteLink(sourceId:string,link:string){
  let raw=link.trim().replace(/^<|>$/g,'').split(/\s+["']/)[0].split(/[?#]/)[0];
  if(!raw||/^(https?:|mailto:|data:|javascript:)/i.test(raw))return null;
  let bits:string[];
  if(raw.startsWith('/research/')){
    bits=raw.slice('/research/'.length).split('/');
  }else if(raw.startsWith('/')){
    return null;
  }else{
    bits=[...sourceId.split('/').slice(0,-1),...raw.split('/')];
  }
  const normalized:string[]=[];
  for(const part of bits){
    if(!part||part==='.')continue;
    if(part==='..')normalized.pop();
    else normalized.push(part);
  }
  return normalized.join('/').replace(/\.md$/,'').replace(/\/$/,'');
}
export async function createKnowledgeNetwork(){
  const entries=(await getCollection('knowledge')).filter(e=>e.id!=='topics/README'&&
    e.id!=='papers/README'&&e.id!=='glossary/README'&&e.id!=='research/README'&&
    e.id!=='paths/README');
  // A node is permitted only when its underlying public Markdown actually exists.
  // A category is permitted only when at least one such article is assigned to it.
  const eligible=entries.filter(e=>e.data.domains?.length||
    /^topics\/[^/]+\/README$/.test(e.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const topics=eligible.filter(e=>/^topics\/[^/]+\/README$/.test(e.id));
  const indexed=new Map(eligible.map(e=>[e.id,e]));
  const titleOf=(e:typeof eligible[number])=>e.data.title||
    (e.body||'').match(/^#\s+(.+)$/m)?.[1]||e.id;
  const firstDomain=(e:typeof eligible[number])=>(e.data.domains||[])[0]?.split('/')[0]||'';
  const areaIndex=new Map(taxonomy.domains.map((d,i)=>[d.id,i]));
  const roots=taxonomy.domains.filter(domain=>eligible.some(e=>
    (e.data.domains||[]).some(d=>d===domain.id||d.startsWith(domain.id+'/'))));
  const nodes:KnowledgeNode[]=[];
  const edges:KnowledgeEdge[]=[];
  const used=new Set<string>();
  const addEdge=(from:string,to:string,kind:KnowledgeEdge['kind'],evidence:string,sourceHref:string,relation?:string)=>{
    if(from===to)return;
    const key=[from,to,kind].join('::');
    if(used.has(key))return;
    used.add(key);edges.push({from,to,kind,evidence,sourceHref,relation});
  };
  for(const area of roots){
    const index=areaIndex.get(area.id)??0;
    const members=eligible.filter(e=>(e.data.domains||[]).some(
      d=>d===area.id||d.startsWith(area.id+'/')));
    nodes.push({
      id:'area:'+area.slug,kind:'area',titleZh:area.id,titleEn:area.en,
      shortZh:area.id,shortEn:area.en,descriptionZh:area.description,
      descriptionEn:area.descriptionEn,contentType:'area',count:members.length,
      href:'/research/domains/'+area.slug+'/',
      resources:members.slice(0,6).map(e=>({title:titleOf(e),href:entryHref(e.id),
        kind:e.data.contentType||'review'})),
      color:PALETTE[index],x:CENTERS[index].x,y:CENTERS[index].y,
      radius:17,group:area.id
    });
  }
  for(const e of eligible){
    const primary=firstDomain(e);
    const groupIdx=areaIndex.get(primary)??0;
    const areaId='area:'+(taxonomy.domains[groupIdx]?.slug||'');
    const isTopic=/^topics\/[^/]+\/README$/.test(e.id);
    const title=titleOf(e);
    nodes.push({
      id:'doc:'+e.id,kind:isTopic?'topic':'document',parent:areaId,
      titleZh:title,titleEn:title,
      shortZh:isTopic?(e.data.shortName||shortTitle(title,16)):shortTitle(e.data.shortName||title,18),
      shortEn:isTopic?(e.data.shortName||shortTitle(title,16)):shortTitle(e.data.shortName||title,18),
      descriptionZh:e.data.summaryZh||'已公开的知识正文，点击进入阅读。',
      descriptionEn:e.data.summaryZh||'A published knowledge note. Open the article to read.',
      contentType:e.data.contentType||'review',count:1,href:entryHref(e.id),
      resources:[{title,href:entryHref(e.id),kind:e.data.contentType||'review'}],
      color:PALETTE[groupIdx],x:0,y:0,radius:isTopic?10:4.2,group:primary
    });
    // An area connection is backed by the entry's explicit domains metadata.
    for(const domain of e.data.domains||[]){
      const root=taxonomy.domains.find(d=>domain===d.id||domain.startsWith(d.id+'/'));
      if(root)addEdge('area:'+root.slug,'doc:'+e.id,'belongs_to',domain,entryHref(e.id));
    }
  }
  // Semantic links only from public Markdown; structural relations stay distinct.
  for(const e of eligible){
    const id='doc:'+e.id;
    const source=entryHref(e.id);
    for(const relation of e.data.related||[]){
      if(indexed.has(relation.ref))
        addEdge(id,'doc:'+relation.ref,'semantic',relation.note,source,relation.type);
    }
    const withoutCode=(e.body||'').replace(/[\u0060]{3,}[\s\S]*?[\u0060]{3,}/g,'')
      .replace(/[\u0060][^\u0060\n]+[\u0060]/g,'');
    for(const match of withoutCode.matchAll(/(?<!!)\[([^\]\n]+)\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']+["'])?\)/g)){
      const raw=resolveNoteLink(e.id,match[2]);
      if(!raw)continue;
      const target=indexed.has(raw)?raw:indexed.has(raw+'/README')?raw+'/README':null;
      if(target)addEdge(id,'doc:'+target,'references','正文链接：'+match[1].trim().slice(0,100),source);
    }
    const topicName=e.id.match(/^topics\/([^/]+)\/reviews\//)?.[1];
    const overview=topicName&&'topics/'+topicName+'/README';
    if(overview&&indexed.has(overview)){
      addEdge('doc:'+overview,id,'topic_contains','正文位于该公开专题的 reviews/ 子目录',source);
    }
  }
  // Make node size reflect actual, traceable references rather than invented scores.
  const degree=new Map<string,number>();
  for(const edge of edges){
    if(edge.kind==='references'||edge.kind==='semantic'){
      degree.set(edge.from,(degree.get(edge.from)||0)+1);
      degree.set(edge.to,(degree.get(edge.to)||0)+1);
    }
  }
  for(const node of nodes){
    if(node.kind==='document')node.radius=4.3+Math.min(4,Math.sqrt(degree.get(node.id)||0)*1.5);
    if(node.kind==='topic')node.radius=9+Math.min(4,Math.sqrt(degree.get(node.id)||0));
  }
  layoutByRelations(nodes,edges);
  const linkedDocs=new Set(edges.filter(e=>e.kind==='references'||e.kind==='semantic').flatMap(e=>[e.from,e.to]));
  return{
    nodes,edges,
    stats:{
      areas:roots.length,topics:topics.length,documents:eligible.length,
      links:edges.filter(e=>e.kind==='references'||e.kind==='semantic').length,
      isolated:eligible.filter(e=>!linkedDocs.has('doc:'+e.id)).length
    },
    world:WORLD,
    layout:'relationship-force-v2'
  };
}

/**
 * Deterministic, relation-driven layout:
 * 1) Arrange the existing *area* hubs so areas with more cross-area references
 *    occupy neighbouring slots (this layer is a map, not a semantic embedding).
 * 2) Use their positions ONLY as seeds/soft anchors.
 * 3) Attract nodes along author-backed links; explicit references are stronger
 *    than taxonomy membership. Repel non-linked nodes and prevent collisions.
 * 4) Never create or infer an edge. Distance represents graph layout pressure,
 *    not a calibrated semantic-similarity score.
 */
function layoutByRelations(nodes:KnowledgeNode[],edges:KnowledgeEdge[]) {
  const areaNodes=nodes.filter(n=>n.kind==='area');
  const areas=areaNodes.map(n=>n.id);
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const allNodes=nodes.filter(n=>n.kind!=='area');
  const groups=new Map<string,KnowledgeNode[]>();
  for(const n of allNodes){
    if(!groups.has(n.parent||''))groups.set(n.parent||'',[]);
    groups.get(n.parent||'')!.push(n);
  }
  // The four existing clusters get reproducible centres. Their order is
  // optimized against the actual number of cross-area references.
  const slots=[
    {x:345,y:250},{x:965,y:295},{x:860,y:705},{x:335,y:705},
  ];
  const cross=new Map<string,number>();
  for(const edge of edges){
    if(edge.kind!=='references'&&edge.kind!=='semantic')continue;
    const aa=byId.get(edge.from)?.parent;
    const bb=byId.get(edge.to)?.parent;
    if(!aa||!bb||aa===bb)continue;
    const key=[aa,bb].sort().join('|');
    cross.set(key,(cross.get(key)||0)+1);
  }
  const cost=(order:string[])=>{
    let result=0;
    for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
      const weight=cross.get([order[i],order[j]].sort().join('|'))||0;
      result+=weight*Math.hypot(slots[i].x-slots[j].x,slots[i].y-slots[j].y);
    }
    return result;
  };
  const list=areas.slice();
  let best=list.slice(),bestCost=cost(best);
  const visit=(prefix:string[],rest:string[])=>{
    if(rest.length===0){
      const score=cost(prefix);
      if(score<bestCost-.001){bestCost=score;best=prefix.slice();}
      return;
    }
    for(let i=0;i<rest.length;i++)visit([...prefix,rest[i]],rest.filter((_,j)=>j!==i));
  };
  if(list.length===slots.length)visit([list[0]],list.slice(1));
  best.forEach((id,i)=>{
    const n=byId.get(id);
    if(n){n.x=slots[i].x;n.y=slots[i].y;}
  });
  // Golden-angle seeding avoids exact overlap, but contributes NO final
  // distance rule. The graph forces below determine the eventual layout.
  for(const [areaId,children] of groups){
    const hub=byId.get(areaId);
    const cx=hub?.x||WORLD.width/2,cy=hub?.y||WORLD.height/2;
    children.sort((a,b)=>Number(b.kind==='topic')-Number(a.kind==='topic')||
      stableHash(a.id)-stableHash(b.id));
    children.forEach((n,i)=>{
      const phase=i*2.399963229728653+(stableHash(n.id)%31)/50;
      const r=(n.kind==='topic'?70:87)+Math.sqrt(i)*24;
      n.x=cx+Math.cos(phase)*r;
      n.y=cy+Math.sin(phase)*r*.81;
    });
  }
  // Real topic-overview links are particularly useful initial guides.
  const reviewOf=(id:string)=>id.match(/^doc:topics\/([^/]+)\/reviews\//)?.[1];
  for(const n of allNodes){
    const topic=reviewOf(n.id);
    if(!topic)continue;
    const parent=byId.get('doc:topics/'+topic+'/README');
    if(!parent)continue;
    const angle=(stableHash(n.id)%6283)/1000;
    n.x=parent.x+Math.cos(angle)*55;
    n.y=parent.y+Math.sin(angle)*55;
  }
  const vx=new Float64Array(nodes.length);
  const vy=new Float64Array(nodes.length);
  const fx=new Float64Array(nodes.length);
  const fy=new Float64Array(nodes.length);
  const index=new Map(nodes.map((n,i)=>[n.id,i]));
  const validEdges=edges.map(e=>({
    i:index.get(e.from)!,j:index.get(e.to)!,
    kind:e.kind,
  })).filter(e=>Number.isInteger(e.i)&&Number.isInteger(e.j));
  const initial=nodes.map(n=>({x:n.x,y:n.y}));
  const restDistance=(a:KnowledgeNode,b:KnowledgeNode)=>{
    if(a.kind==='area'&&b.kind==='area')return 340;
    if(a.kind==='area'||b.kind==='area')return b.kind==='topic'||a.kind==='topic'?105:132;
    const same=a.group===b.group;
    if(a.kind==='topic'||b.kind==='topic')return same?71:160;
    return same?79:215;
  };
  for(let tick=0;tick<460;tick++){
    fx.fill(0);fy.fill(0);
    const cooling=.7+.3*(1-tick/460);
    // Gentle hub attraction preserves readable clusters without fixing
    // article coordinates or overriding strong citation relationships.
    for(let i=0;i<nodes.length;i++){
      const n=nodes[i];
      if(n.kind==='area'){
        fx[i]+=(initial[i].x-n.x)*.085;
        fy[i]+=(initial[i].y-n.y)*.085;
      }else{
        const hub=byId.get(n.parent||'');
        if(hub){
          fx[i]+=(hub.x-n.x)*.004;
          fy[i]+=(hub.y-n.y)*.004;
        }
      }
      // A small boundary pressure keeps nodes and their hit targets visible.
      const pad=n.kind==='area'?83:27;
      if(n.x<pad)fx[i]+=(pad-n.x)*.06;
      if(n.x>WORLD.width-pad)fx[i]+=(WORLD.width-pad-n.x)*.06;
      if(n.y<pad)fy[i]+=(pad-n.y)*.06;
      if(n.y>WORLD.height-pad)fy[i]+=(WORLD.height-pad-n.y)*.06;
    }
    // Springs: every force is backed by a graph edge.
    for(const edge of validEdges){
      const a=nodes[edge.i],b=nodes[edge.j];
      const dx=b.x-a.x,dy=b.y-a.y;
      const dist=Math.max(1,Math.hypot(dx,dy));
      const reference=edge.kind==='references'||edge.kind==='semantic';
      const desired=reference?restDistance(a,b):
        edge.kind==='topic_contains'?75:a.kind==='topic'||b.kind==='topic'?113:145;
      const k=edge.kind==='semantic'?0.125:
        edge.kind==='references'?0.092:edge.kind==='topic_contains'?0.065:0.018;
      const force=(dist-desired)*k;
      const px=force*dx/dist,py=force*dy/dist;
      if(a.kind==='area'&&edge.kind==='belongs_to'){
        fx[edge.j]-=px;fy[edge.j]-=py;
      }else if(b.kind==='area'&&edge.kind==='belongs_to'){
        fx[edge.i]+=px;fy[edge.i]+=py;
      }else{
        fx[edge.i]+=px;fy[edge.i]+=py;
        fx[edge.j]-=px;fy[edge.j]-=py;
      }
    }
    // Short-range charge plus hard collision avoidance; no artificial link.
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];
      let dx=b.x-a.x,dy=b.y-a.y;
      let dist=Math.hypot(dx,dy);
      if(dist<.001){const ang=((stableHash(a.id+b.id)%6283)/1000);dx=Math.cos(ang);dy=Math.sin(ang);dist=1;}
      const bothAreas=a.kind==='area'&&b.kind==='area';
      const oneArea=a.kind==='area'||b.kind==='area';
      const bothTopics=a.kind==='topic'&&b.kind==='topic';
      const oneTopic=a.kind==='topic'||b.kind==='topic';
      const minDist=bothAreas?245:oneArea?82:bothTopics?64:oneTopic?40:19;
      const maxRepel=bothAreas?390:oneArea?160:oneTopic?110:72;
      if(dist>maxRepel)continue;
      const collision=Math.max(0,minDist-dist)*.23;
      const charge=(maxRepel-dist)/maxRepel*(oneArea ? 0.9 : 0.55);
      const force=collision+charge;
      const px=force*dx/dist,py=force*dy/dist;
      if(a.kind==='area'&&!bothAreas){
        fx[j]+=px;fy[j]+=py;
      }else if(b.kind==='area'&&!bothAreas){
        fx[i]-=px;fy[i]-=py;
      }else{
        fx[i]-=px;fy[i]-=py;
        fx[j]+=px;fy[j]+=py;
      }
    }
    for(let i=0;i<nodes.length;i++){
      const n=nodes[i];
      vx[i]=Math.max(-10,Math.min(10,(vx[i]+fx[i]*cooling)*.75));
      vy[i]=Math.max(-10,Math.min(10,(vy[i]+fy[i]*cooling)*.75));
      n.x+=vx[i];
      n.y+=vy[i];
    }
  }
  // Respect actual boundaries in the published SVG viewBox.
  for(const n of nodes){
    const pad=n.kind==='area'?82:20;
    n.x=Math.min(WORLD.width-pad,Math.max(pad,n.x));
    n.y=Math.min(WORLD.height-pad,Math.max(pad,n.y));
    n.x=Math.round(n.x*10)/10;
    n.y=Math.round(n.y*10)/10;
  }
}
