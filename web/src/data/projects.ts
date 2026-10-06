// ────────────────────────────────────────────────────────────────────────────
// PROJECTS — side projects / open-source tools. Add new entries freely.
//   repo : "owner/name" — used for the GitHub link and the live star badge.
//   url  : optional live demo / homepage.
// ────────────────────────────────────────────────────────────────────────────

export interface Project {
  name: string;
  emoji: string;
  icon?: string; // path under /public; falls back to emoji when absent
  repo: string;
  url?: string;
  descZh: string;
  descEn: string;
  tags: string[];
}

export const PROJECTS: Project[] = [
  {
    name: 'Cursor Remote Lite',
    emoji: '📱',
    repo: 'Suchenl/cursor-remote-lite',
    url: 'https://www.bilibili.com/video/BV1HFaz6bEj3',
    descZh:
      '在手机上接着用电脑里真实的 Cursor：回答 Agent 提问、批准命令、布置下一个任务、逐个保留 / 撤销改动；本地与 SSH 远程窗口都能用。免费、MIT 开源、自托管。',
    descEn:
      'Use the real Cursor on your computer from your phone: answer the Agent, approve runs, queue the next task, keep or undo changes. Works with local and SSH remote windows. Free, MIT, self-hosted.',
    tags: ['Node.js', 'Android', 'AI Coding'],
  },
  {
    name: 'LivingSurvey',
    emoji: '📚',
    icon: '/images/projects/livingsurvey.png',
    repo: 'Suchenl/LivingSurvey',
    descZh:
      '本地优先、确定性运行的科研文献追踪与综述写作工具：多源抓取元数据、去重打分、本地检索与笔记，帮助持续维护一份「活的」综述。',
    descEn:
      'A local-first, deterministic toolkit for literature tracking and survey writing: multi-source metadata fetching, dedup & scoring, local search and notes to maintain a "living" survey.',
    tags: ['Python', 'Research Tooling', 'Local-first'],
  },
  {
    name: 'MarkView-Pro',
    emoji: '📝',
    icon: '/images/projects/markview.svg',
    repo: 'Suchenl/MarkView-Pro',
    descZh: '免费的网页应用，支持 Markdown 实时编辑与编译预览，随写随看。',
    descEn: 'A free web app for real-time Markdown editing and compiled preview.',
    tags: ['TypeScript', 'Web App', 'Markdown'],
  },
  {
    name: 'AI Beacon',
    emoji: '🧠',
    icon: '/images/projects/ai-beacon.png',
    repo: 'Suchenl/AI-Beacon-Web',
    descZh:
      '本地优先、AI 驱动的个人知识库（PKB），用于追踪 AI 的演进：整理论文、抓取实时引用、绘制前沿脉络。',
    descEn:
      'A local-first, AI-powered personal knowledge base (PKB) for tracking the evolution of AI: organize papers, fetch live citations, and map the frontier.',
    tags: ['TypeScript', 'PKB', 'AI'],
  },
];
