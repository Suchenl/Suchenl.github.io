const reader = document.getElementById('research-reader') as HTMLElement | null;
const readerMotion: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (reader) {
    // A research page can be visited directly or through any of the paper's classifications.
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const back = document.getElementById('research-return') as HTMLAnchorElement | null;
    const validFrom = from && /^(papers|paths|reviews|glossary|ideas|cat:[^?#]+)$/.test(from);
    if (back) {
      const ret = new URL('/research/',window.location.origin);
      if (validFrom && from !== 'papers') ret.searchParams.set('folder',from);
      const q=params.get('q'),status=params.get('status'),sort=params.get('sort');
      if(q)ret.searchParams.set('q',q.slice(0,300));
      if(status && ['read','reading','to-read','untracked'].includes(status))ret.searchParams.set('status',status);
      if(sort && ['year','added','rating','title'].includes(sort))ret.searchParams.set('sort',sort);
      back.href=ret.pathname+ret.search;
    }
    const articleId = reader.dataset.documentId || '';
    const articleTitle = reader.dataset.documentTitle || '';
    const safeStored = (key: string) => {
      try { return localStorage.getItem(key); } catch { return null; }
    };
    const save = (key: string, value: string) => {
      try { localStorage.setItem(key, value); return true; } catch { return false; }
    };
    const note = document.getElementById('rkd-tool-note');
    const resume = document.getElementById('rkd-resume') as HTMLButtonElement | null;
    const storedSection = safeStored('research-read-position-v1:' + articleId);
    if (resume && storedSection && document.getElementById(storedSection)) {
      resume.hidden = false;
      resume.addEventListener('click', () => {
        document.getElementById(storedSection)?.scrollIntoView({behavior:readerMotion,block:'start'});
      });
    }
    const stepBoxes = Array.from(reader.querySelectorAll<HTMLInputElement>('[data-learning-step]'));
    if (stepBoxes.length) {
      const key = 'research-path-checked-v1:' + articleId;
      let checked: number[] = [];
      try {
        const parsed = JSON.parse(safeStored(key) || '[]');
        if (Array.isArray(parsed)) checked = parsed.filter(n => Number.isInteger(n) && n >= 0 && n < stepBoxes.length);
      } catch { /* no stored state */ }
      stepBoxes.forEach(c => c.checked = checked.includes(Number(c.dataset.learningStep)));
      const progress = document.getElementById('path-progress') as HTMLProgressElement | null;
      const count = document.getElementById('path-count');
      const refresh = () => {
        const done = stepBoxes.filter(c => c.checked).length;
        if (progress) progress.value = done;
        if (count) count.textContent = done + ' / ' + stepBoxes.length + ' 步';
      };
      stepBoxes.forEach(c => c.addEventListener('change', () => {
        save(key, JSON.stringify(stepBoxes.filter(b=>b.checked).map(b=>Number(b.dataset.learningStep))));
        refresh();
      }));
      refresh();
    }
    const sizes = [15, 16, 17, 18, 19, 20];
    let size = Number(safeStored('research-font-size') || '17');
    if (!sizes.includes(size)) size = 17;
    const setSize = (n: number) => {
      size = Math.max(15, Math.min(20, n));
      reader.style.setProperty('--reader-font', size + 'px');
      save('research-font-size', String(size));
      if (note) note.textContent = '正文 ' + size + 'px';
    };
    setSize(size);
    document.querySelectorAll<HTMLButtonElement>('[data-font]').forEach(button => {
      button.addEventListener('click', () => setSize(size + (button.dataset.font === 'up' ? 1 : -1)));
    });
    const focusButton = document.getElementById('rkd-focus');
    const setFocus = (enabled: boolean) => {
      reader.classList.toggle('focus-mode', enabled);
      focusButton?.setAttribute('aria-pressed', String(enabled));
      if (focusButton) focusButton.textContent = enabled ? '显示目录' : '专注阅读';
      save('research-focus-mode', enabled ? '1' : '0');
    };
    setFocus(safeStored('research-focus-mode') === '1');
    focusButton?.addEventListener('click', () => setFocus(!reader.classList.contains('focus-mode')));
    document.getElementById('rkd-copy-link')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        if (note) note.textContent = '链接已复制';
      } catch {
        if (note) note.textContent = '复制失败，请使用浏览器地址栏复制';
      }
    });
    document.getElementById('rkd-top-outline')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const backTop = document.getElementById('rkd-back-top');
    backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const progress = document.getElementById('reading-progress');
    let savedAt = 0;
    const readingHeadings = Array.from(reader.querySelectorAll<HTMLElement>('.rkd-prose h2[id], .rkd-prose h3[id]'));
    const storeReading = () => {
      if (!articleId || window.scrollY < 220) return;
      const now = Date.now();
      if (now - savedAt < 1500) return;
      savedAt = now;
      let current: HTMLElement | undefined;
      for (const el of readingHeadings) {
        if (el.getBoundingClientRect().top < 190) current = el;
        else break;
      }
      const section = current?.id || '';
      if (section) save('research-read-position-v1:' + articleId,section);
      save('research-last-read-v1',JSON.stringify({
        id:articleId,heading:(current?.textContent || '').trim().slice(0,70),
        section,title:articleTitle,time:now
      }));
    };
    const updateProgress = () => {
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      const pct = travel > 0 ? Math.min(100, Math.max(0, window.scrollY / travel * 100)) : 100;
      if (progress) progress.style.width = pct + '%';
      backTop?.classList.toggle('visible', window.scrollY > 520);
      storeReading();
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
    const mobileToc = document.querySelector<HTMLDetailsElement>('.rkd-mobile-toc');
    mobileToc?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { mobileToc.open = false; }));
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('.rkd-outline nav a'));
    const targetById = anchors.map(a => ({ anchor: a, target: document.getElementById(decodeURIComponent(a.hash.slice(1))) })).filter(x => x.target);
    if (targetById.length) {
      const updateActive = () => {
        let active = targetById[0].anchor;
        for (const x of targetById) {
          if (x.target && x.target.getBoundingClientRect().top < 170) active = x.anchor;
        }
        anchors.forEach(a => {
          a.classList.toggle('is-current', a === active);
          if (a === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      };
      window.addEventListener('scroll', updateActive, { passive: true });
      updateActive();
    }
  }
