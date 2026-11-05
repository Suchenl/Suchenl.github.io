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
  from: string; to: string; kind: 'belongs_to' | 'references';
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
    /^topics\/[^/]+\/README$/.test(e.id));
  const topics=eligible.filter(e=>/^topics\/[^/]+\/README$/.test(e.id));
  const indexed=new Map(eligible.map(e=>[e.id,e]));
  const titleOf=(e:typeof eligible[number])=>e.data.title||
    (e.body||'').match(/^#\s+(.+)$/m)?.[1]||e.id;
  const firstDomain=(e:typeof eligible[number])=>(e.data.domains||[])[0]?.split('/')[0]||'';
  const areaIndex=new Map(taxonomy.domains.map((d,i)=>[d.id,i]));
  const roots=taxonomy.domains.filter(domain=>eligible.some(e=>
    (e.data.domains||[]).some(d=>d===domain.id||d.startsWith(domain.id+'/'))));
  const areas=roots.map((area)=>taxonomy.domains.indexOf(area));
  const nodes:KnowledgeNode[]=[];
  const edges:KnowledgeEdge[]=[];
  const used=new Set<string>();
  const addEdge=(from:string,to:string,kind:KnowledgeEdge['kind'])=>{
    if(from===to)return;
    const key=[from,to].sort().join('::');
    if(used.has(key))return;
    used.add(key);edges.push({from,to,kind});
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
      if(root)addEdge('area:'+root.slug,'doc:'+e.id,'belongs_to');
    }
  }
  const byId=new Map(nodes.map(n=>[n.id,n]));
  // Arrange real nodes around existing research areas, with deterministic positions.
  // The layout is stable across builds and never creates placeholder subjects.
  for(const area of roots){
    const hub=nodes.find(n=>n.id==='area:'+area.slug)!;
    const children=nodes.filter(n=>n.kind!=='area'&&n.group===area.id)
      .sort((a,b)=>Number(b.kind==='topic')-Number(a.kind==='topic')||
        stableHash(a.id)-stableHash(b.id));
    children.forEach((n,i)=>{
      const topic=n.kind==='topic';
      const h=stableHash(n.id)/4294967296;
      const angle=i*2.399963229728653+0.5+h*0.18;
      const radius=topic?74+i*13:84+Math.sqrt(i+2)*24;
      const r=Math.min(radius,238);
      n.x=hub.x+Math.cos(angle)*r;
      n.y=hub.y+Math.sin(angle)*r*.87;
    });
  }
  // A link is drawn only if the author linked an existing Markdown article.
  for(const e of eligible){
    const id='doc:'+e.id;
    for(const relation of e.data.related||[]){
      if(indexed.has(relation.ref))addEdge(id,'doc:'+relation.ref,'references');
    }
    for(const match of (e.body||'').matchAll(/\]\(([^)]+)\)/g)){
      const raw=resolveNoteLink(e.id,match[1]);
      if(!raw)continue;
      const target=indexed.has(raw)?raw:indexed.has(raw+'/README')?raw+'/README':null;
      if(target)addEdge(id,'doc:'+target,'references');
    }
    // Explicitly linked reviews and their real topic overview share a group.
    const topicName=e.id.match(/^topics\/([^/]+)\/reviews\//)?.[1];
    const overview=topicName&&'topics/'+topicName+'/README';
    if(overview&&indexed.has(overview))addEdge('doc:'+overview,id,'references');
  }
  // Make node size reflect actual, traceable references rather than invented scores.
  const degree=new Map<string,number>();
  for(const edge of edges){
    if(edge.kind==='references'){
      degree.set(edge.from,(degree.get(edge.from)||0)+1);
      degree.set(edge.to,(degree.get(edge.to)||0)+1);
    }
  }
  for(const node of nodes){
    if(node.kind==='document')node.radius=4.3+Math.min(4,Math.sqrt(degree.get(node.id)||0)*1.5);
    if(node.kind==='topic')node.radius=9+Math.min(4,Math.sqrt(degree.get(node.id)||0));
  }
  const linkedDocs=new Set(edges.filter(e=>e.kind==='references').flatMap(e=>[e.from,e.to]));
  return{
    nodes,edges,
    stats:{
      areas:roots.length,topics:topics.length,documents:eligible.length,
      links:edges.filter(e=>e.kind==='references').length,
      isolated:eligible.filter(e=>!linkedDocs.has('doc:'+e.id)).length
    },
    world:WORLD
  };
}