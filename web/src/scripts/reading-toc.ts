// Shared client-side chapter navigation for Research and Blog articles.
document.querySelectorAll<HTMLElement>('[data-reading-toc]').forEach(toc=>{
  const wrapper=toc.closest<HTMLElement>('.reading-with-toc');
  const nav=toc.querySelector<HTMLElement>('.reading-toc-links');
  const toggle=toc.querySelector<HTMLButtonElement>('.reading-toc-toggle');
  const close=toc.querySelector<HTMLButtonElement>('.reading-toc-close');
  const links=[...toc.querySelectorAll<HTMLAnchorElement>('a[data-toc-target]')];
  const location=toc.querySelector<HTMLElement>('.reading-toc-location');
  const article=document.querySelector<HTMLElement>(toc.dataset.articleSelector||'');
  if(!wrapper||!nav||!article||!links.length)return;
  const mobile=window.matchMedia('(max-width: 1000px)');
  const storageKey='site-reading-toc-collapsed';
  let collapsed=false;
  try{collapsed=localStorage.getItem(storageKey)==='1';}catch{}
  const setCollapsed=(next:boolean)=>{
    collapsed=next;
    toc.classList.toggle('is-collapsed',next);
    wrapper.classList.toggle('toc-collapsed',next);
    toggle?.setAttribute('aria-expanded',String(!next));
    toggle?.setAttribute('aria-label',next?'展开左侧目录':'收起左侧目录');
    if(!mobile.matches){try{localStorage.setItem(storageKey,next?'1':'0');}catch{}}
  };
  const applyViewport=()=>{setCollapsed(mobile.matches?true:collapsed);schedule();};
  setCollapsed(mobile.matches?true:collapsed);
  toggle?.addEventListener('click',()=>setCollapsed(!toc.classList.contains('is-collapsed')));
  close?.addEventListener('click',()=>setCollapsed(true));
  mobile.addEventListener('change',applyViewport);
  toc.querySelector<HTMLButtonElement>('.reading-toc-top')?.addEventListener('click',()=>{
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    if(mobile.matches)setCollapsed(true);
  });
  links.forEach(a=>a.addEventListener('click',()=>{if(mobile.matches)setCollapsed(true);}));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!toc.classList.contains('is-collapsed')){
      setCollapsed(true);toggle?.focus();
    }
  });
  document.addEventListener('pointerdown',event=>{
    if(mobile.matches&&!toc.classList.contains('is-collapsed') && event.target instanceof Node && !toc.contains(event.target))setCollapsed(true);
  });
  const targets=links.map(a=>({link:a,heading:document.getElementById(a.dataset.tocTarget||'')})).filter(x=>x.heading);
  const update=()=>{
    if(!targets.length)return;
    let chosen=targets[0];
    for(const x of targets){
      if(x.heading!.getBoundingClientRect().top<=Math.max(150,innerHeight*0.23))chosen=x;
      else break;
    }
    links.forEach(a=>{
      const active=a===chosen.link;
      a.classList.toggle('is-current',active);
      if(active)a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
    if(location)location.textContent='阅读位置 · '+(links.indexOf(chosen.link)+1)+' / '+links.length;
    // Use viewport-relative positions: offsetTop is relative to an offset parent,
    // which need not be the scrolling nav. Move only the outline's own scroller.
    if(!toc.classList.contains('is-collapsed')){
      const linkRect=chosen.link.getBoundingClientRect();
      const navRect=nav.getBoundingClientRect();
      const relativeTop=linkRect.top-navRect.top;
      const safeTop=navRect.height*0.22;
      const safeBottom=navRect.height*0.72;
      if(relativeTop<safeTop||relativeTop>safeBottom){
        const target=nav.scrollTop+relativeTop-navRect.height*0.4;
        nav.scrollTo({top:Math.max(0,target),behavior:'auto'});
      }
    }
  };
  let requested=false;
  const schedule=()=>{
    if(requested)return;requested=true;
    requestAnimationFrame(()=>{requested=false;update();});
  };
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  links.forEach(a=>a.addEventListener('click',()=>requestAnimationFrame(schedule)));
  update();
});
