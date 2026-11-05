const root=document.getElementById('kl-page');
if(root){
  const entries=[...root.querySelectorAll<HTMLElement>('.kl-note')];
  const scopeButtons=[...root.querySelectorAll<HTMLButtonElement>('[data-kl-scope]')];
  const search=root.querySelector<HTMLInputElement>('#kl-search')!;
  const type=root.querySelector<HTMLSelectElement>('#kl-type')!;
  const count=root.querySelector<HTMLElement>('#kl-results-count')!;
  const heading=root.querySelector<HTMLElement>('#kl-current-title')!;
  const more=root.querySelector<HTMLButtonElement>('#kl-more')!;
  const empty=root.querySelector<HTMLElement>('#kl-empty')!;
  const clear=root.querySelector<HTMLButtonElement>('#kl-clear')!;
  const container=root.querySelector<HTMLElement>('#knowledge-browser')!;
  let selected:HTMLButtonElement=scopeButtons.find(b=>b.dataset.klScope==='all')!;
  let visibleLimit=12;
  const lang=()=>document.documentElement.getAttribute('data-lang')==='en'?'en':'zh';
  const translated=(zh:string,en:string)=>lang()==='en'?en:zh;
  const label=()=>selected.dataset[lang()==='en'?'klNameEn':'klNameZh']||translated('全部知识','All notes');
  function inScope(card:HTMLElement){
    const scope=selected.dataset.klScope||'all';
    if(scope==='all')return true;
    const d=selected.dataset.klDomainId||'';
    const c=selected.dataset.klChildId||'';
    return (card.dataset.klDomains||'').split('|').some(key=>{
      if(!key||!d)return false;
      const target=c?d+'/'+c:d;
      return key===target||key.startsWith(target+'/');
    });
  }
  function update(keepLimit=false){
    if(!keepLimit)visibleLimit=12;
    const q=search.value.trim().toLocaleLowerCase();
    const kind=type.value;
    let matches=0;
    let shown=0;
    for(const card of entries){
      const qualifies=inScope(card)&&
        (kind==='all'||card.dataset.klType===kind)&&
        (!q||(card.dataset.klSearch||'').includes(q));
      if(qualifies)matches++;
      const show=qualifies&&shown<visibleLimit;
      if(show)shown++;
      card.hidden=!show;
    }
    // Fill the first page with qualifying notes, even if earlier cards were hidden.
    const allQualifying=entries.filter(card=>inScope(card)&&(kind==='all'||card.dataset.klType===kind)&&
      (!q||(card.dataset.klSearch||'').includes(q)));
    entries.forEach(card=>card.hidden=!allQualifying.slice(0,visibleLimit).includes(card));
    empty.hidden=matches!==0;
    more.hidden=matches<=visibleLimit;
    count.textContent=translated(matches+' 篇',matches+' notes');
    const zh=heading.querySelector<HTMLElement>('[data-l="zh"]');
    const en=heading.querySelector<HTMLElement>('[data-l="en"]');
    if(zh)zh.textContent=selected.dataset.klNameZh||'全部知识';
    if(en)en.textContent=selected.dataset.klNameEn||'All notes';
    scopeButtons.forEach(b=>{
      const active=b.dataset.klScope===selected.dataset.klScope;
      if(b.closest('.kl-tree')){
        b.classList.toggle('is-active',active);
        b.setAttribute('aria-pressed',String(active));
      }
    });
  }
  scopeButtons.forEach(b=>b.addEventListener('click',()=>{
    selected=b;
    const belongs=b.closest('.kl-tree');
    if(!belongs){
      const match=root.querySelector<HTMLButtonElement>('.kl-tree [data-kl-scope="'+CSS.escape(b.dataset.klScope||'')+'"]');
      const details=match?.closest('details');
      if(details)details.open=true;
    }
    update();
    if(!belongs)container.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  search.addEventListener('input',()=>update());
  type.addEventListener('change',()=>update());
  more.addEventListener('click',()=>{
    visibleLimit+=12;
    update(true);
  });
  clear.addEventListener('click',()=>{
    search.value='';type.value='all';
    selected=scopeButtons.find(b=>b.dataset.klScope==='all')!;
    update();
    search.focus();
  });
  document.addEventListener('keydown',e=>{
    const target=e.target as HTMLElement;
    if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)){
      e.preventDefault();search.focus();
    }
  });
  const options=[
    ['all','全部类型','All types'],['topic','专题','Topics'],['review','综述','Reviews'],
    ['paper','论文解读','Paper notes'],['qa','技术问答','Q&A'],['exploration','问题与探索','Explorations'],
    ['path','学习路线','Learning paths'],['glossary','概念','Concepts'],['plan','研究计划','Research plans']
  ];
  function translateControls(){
    search.placeholder=translated('搜索标题、关键词或内容简介…','Search titles, keywords or summaries…');
    for(const [key,zh,en] of options){
      const option=type.querySelector<HTMLOptionElement>('option[value="'+key+'"]');
      if(option)option.textContent=translated(zh,en);
    }
    update(true);
  }
  new MutationObserver(translateControls).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  translateControls();
}
