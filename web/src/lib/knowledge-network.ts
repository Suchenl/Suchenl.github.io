import { getCollection } from 'astro:content';
import taxonomy from '../../../knowledge/taxonomy.json';
import roadmap from '../../../knowledge/graph-roadmap.json';
import { domainMatches } from './research-taxonomy';

export type KnowledgeResource = { title: string; href: string; kind: string };
export type KnowledgeNode = {
  id: string; kind: 'root'|'area'|'topic'; parent?: string;
  titleZh: string; titleEn: string; shortZh: string; shortEn: string;
  descriptionZh: string; descriptionEn: string;
  phase: 'ready'|'partial'|'empty'; count: number; href: string;
  resources: KnowledgeResource[]; x: number; y: number; planned: boolean;
};
export type KnowledgeEdge = { from: string; to: string; kind: 'hierarchy'|'related'; source?: string };
const clusterPositions = [
  {x:145,y:126},{x:420,y:126},{x:700,y:126},{x:975,y:126},
  {x:145,y:463},{x:420,y:463},{x:700,y:463},{x:975,y:463}
];
const itemXOffset = (length:number, index:number) => length===1 ? 0 : length===2 ? [-64,64][index] : [-88,0,88][index];
const entryHref = (id:string) => '/research/'+(id.endsWith('/README') ? id.slice(0,-7) : id)+'/';

export async function createKnowledgeNetwork() {
  const entries = await getCollection('knowledge');
  const docs = entries.filter(e => (e.data.domains || []).length > 0 && !e.id.endsWith('papers/README') && !e.id.endsWith('topics/README'));
  const totalPublic = docs.length;
  const inDomain = (name:string) => docs.filter(e => domainMatches(e.data.domains,name));
  const resources = (items:typeof docs):KnowledgeResource[] => {
    const ordered = [...items].sort((a,b)=>{
      const score=(e:typeof docs[number])=>e.id.startsWith('topics/')&&e.id.endsWith('/README')?0:e.data.contentType==='review'?1:e.data.contentType==='path'?2:e.data.contentType==='qa'?3:4;
      return score(a)-score(b);
    });
    return ordered.slice(0,5).map(e=>({
      title:e.data.shortName || e.data.title || (e.body||'').match(/^#\s+(.+)$/m)?.[1] || e.id,
      href:entryHref(e.id),kind:e.data.contentType || 'review'
    }));
  };
  const nodes:KnowledgeNode[] = [{
    id:'knowledge:root', kind:'root', titleZh:'个人知识体系', titleEn:'Knowledge System',
    shortZh:'知识体系',shortEn:'Knowledge',descriptionZh:'一张连接公开知识、学习路径与待建设方向的地图。',descriptionEn:'A map of published knowledge and future learning directions.',
    phase:'partial', count:totalPublic, href:'/knowledge/', resources:[],x:560,y:335,planned:false
  }];
  const edges:KnowledgeEdge[] = [];
  for(const [i,area] of taxonomy.domains.entries()){
    const at=clusterPositions[i];
    const areaId='research:'+area.id;
    const list=inDomain(area.id);
    const children=area.children.map(child=>({name:child,list:inDomain(area.id+'/'+child)}));
    const covered=children.filter(c=>c.list.length>0).length;
    const short=roadmap.researchLabels[area.id as keyof typeof roadmap.researchLabels];
    nodes.push({
      id:areaId,kind:'area',titleZh:area.id,titleEn:area.en,shortZh:short.zh,shortEn:short.en,
      descriptionZh:area.description,descriptionEn:area.descriptionEn,
      phase:covered===0?'empty':covered===children.length?'ready':'partial',
      count:list.length, href:'/research/domains/'+area.slug+'/',resources:resources(list),
      x:at.x,y:at.y,planned:false
    });
    edges.push({from:'knowledge:root',to:areaId,kind:'hierarchy'});
    children.forEach((child,j)=>{
      const id=areaId+'/'+child.name;
      const label=short.topics[child.name as keyof typeof short.topics] as {zh:string;en:string};
      nodes.push({
        id,kind:'topic',parent:areaId,titleZh:child.name,titleEn:label?.en || child.name,
        shortZh:label?.zh || child.name.slice(0,5),shortEn:label?.en || child.name,
        descriptionZh:'按当前公开 Markdown 的 domains 分类统计。',descriptionEn:'Counted from published, categorized Markdown.',
        phase:child.list.length?'ready':'empty',count:child.list.length,
        href:child.list.length?entryHref((child.list.find(e=>e.id.endsWith('/README')) || child.list[0]).id):'',
        resources:resources(child.list),x:at.x+itemXOffset(children.length,j),y:at.y+90,planned:false
      });
      edges.push({from:areaId,to:id,kind:'hierarchy'});
    });
  }
  for(const [i,area] of roadmap.futureDomains.entries()){
    const at=clusterPositions[i+taxonomy.domains.length];
    const areaId='planned:'+area.id;
    nodes.push({
      id:areaId,kind:'area',titleZh:area.zh,titleEn:area.en,shortZh:area.shortZh,shortEn:area.shortEn,
      descriptionZh:area.descriptionZh,descriptionEn:area.descriptionEn,
      phase:'empty',count:0,href:'',resources:[],x:at.x,y:at.y,planned:true
    });
    edges.push({from:'knowledge:root',to:areaId,kind:'hierarchy'});
    area.topics.forEach((topic,j)=>{
      const id=areaId+'/'+topic.id;
      nodes.push({
        id,kind:'topic',parent:areaId,titleZh:topic.zh,titleEn:topic.en,
        shortZh:topic.shortZh,shortEn:topic.en,
        descriptionZh:'公开规划中的候选知识主题，尚无经过审核的正文。',
        descriptionEn:'A proposed topic without reviewed public material.',
        phase:'empty',count:0,href:'',resources:[],
        x:at.x+itemXOffset(area.topics.length,j),y:at.y+90,planned:true
      });
      edges.push({from:areaId,to:id,kind:'hierarchy'});
    });
  }
  const known=new Set(nodes.map(n=>n.id));
  for(const link of roadmap.crossLinks){
    if(known.has(link.from)&&known.has(link.to))edges.push({from:link.from,to:link.to,kind:'related',source:link.source});
  }
  const topics=nodes.filter(n=>n.kind==='topic');
  return {
    nodes,edges,
    stats:{areas:nodes.filter(n=>n.kind==='area').length, topics:topics.length, ready:topics.filter(n=>n.phase==='ready').length, empty:topics.filter(n=>n.phase==='empty').length, publicDocs:totalPublic}
  };
}
