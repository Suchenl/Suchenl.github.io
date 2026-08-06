// ────────────────────────────────────────────────────────────────────────────
// PROJECTS — side projects / open-source tools. Add new entries freely.
//   repo : "owner/name" — used for the GitHub link and the live star badge.
//   url  : optional live demo / homepage.
// ────────────────────────────────────────────────────────────────────────────

export interface Project {
  name: string;
  emoji: string;
  repo: string;
  url?: string;
  descZh: string;
  descEn: string;
  tags: string[];
}

export const PROJECTS: Project[] = [
  {
    name: 'LivingSurvey',
    emoji: '📚',
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
    repo: 'Suchenl/MarkView-Pro',
    descZh: '免费的网页应用，支持 Markdown 实时编辑与编译预览，随写随看。',
    descEn: 'A free web app for real-time Markdown editing and compiled preview.',
    tags: ['TypeScript', 'Web App', 'Markdown'],
  },
  {
    name: 'AI Beacon',
    emoji: '🧠',
    repo: 'Suchenl/AI-Beacon-Web',
    descZh:
      '本地优先、AI 驱动的个人知识库（PKB），用于追踪 AI 的演进：整理论文、抓取实时引用、绘制前沿脉络。',
    descEn:
      'A local-first, AI-powered personal knowledge base (PKB) for tracking the evolution of AI: organize papers, fetch live citations, and map the frontier.',
    tags: ['TypeScript', 'PKB', 'AI'],
  },
];
