// ────────────────────────────────────────────────────────────────────────────
// EXPERTISE DATA — edit this file freely.
//
// Two axes:
//   TRACK_RECORD  = 已验证的能力：有论文/落地/复现产出的方向（证明研究实力）
//   INTERESTS     = 兴趣与探索方向：我想深入、想找合作/工作的方向（可无产出）
//
// TRACK_RECORD levels (also shown in the "评定标准" section on the page):
//   proficient 精通 : 有一作论文 / 落地产出，能独立从想法到实现完成完整研究或工程。
//   advanced   熟练 : 有较多复现与实践经验，掌握主流方法，能快速上手推进。
//   growing    进阶中: 系统性阅读 + 初步实验/复现，正在积累。
//   familiar   了解 : 广泛涉猎，理解核心概念与前沿脉络。
// ────────────────────────────────────────────────────────────────────────────

export type Level = 'proficient' | 'advanced' | 'growing' | 'familiar';

export const LEVELS: Record<Level, { zh: string; en: string; pct: number; descZh: string; descEn: string }> = {
  proficient: {
    zh: '精通', en: 'Proficient', pct: 92,
    descZh: '有一作论文 / 落地产出，能独立从想法到实现完成完整研究或工程。',
    descEn: 'First-author papers or shipped systems; can drive a project end-to-end.',
  },
  advanced: {
    zh: '熟练', en: 'Advanced', pct: 74,
    descZh: '有较多复现与实践经验，掌握主流方法，能快速上手推进。',
    descEn: 'Solid hands-on and reproduction experience; can ramp up quickly.',
  },
  growing: {
    zh: '进阶中', en: 'Growing', pct: 54,
    descZh: '系统性阅读 + 初步实验/复现，正在积累。',
    descEn: 'Systematic reading plus early experiments; actively building up.',
  },
  familiar: {
    zh: '了解', en: 'Familiar', pct: 34,
    descZh: '广泛涉猎，理解核心概念与前沿脉络。',
    descEn: 'Broad exposure; understand core concepts and the research landscape.',
  },
};

export interface Evidence {
  zh: string;
  en: string;
  href?: string;
}

export interface Skill {
  zh: string;
  en: string;
  level: Level;
  didZh: string;
  didEn: string;
  evidence: Evidence[];
  tags: string[];
}

// ── 已验证的能力 ──────────────────────────────────────────────────────────────
export const TRACK_RECORD: Skill[] = [
  {
    zh: '生成式 AI · 图像/视频生成',
    en: 'Generative AI · Image & Video Generation',
    level: 'proficient',
    didZh: '一作提出 LAMIC（AAAI 2026），并在 Onestory 实习中落地进核心产品；目前在可灵从事视频生成方向。微调过 T2I/I2I 生成模型（LoRA / Flux-Kontext / EasyControl）并上线。',
    didEn: 'First-authored LAMIC (AAAI 2026), shipped into Onestory products; now working on video generation at Kling. Fine-tuned and deployed T2I/I2I models (LoRA / Flux-Kontext / EasyControl).',
    evidence: [
      { zh: 'LAMIC · AAAI 2026', en: 'LAMIC · AAAI 2026', href: '/publications/' },
      { zh: 'Onestory / 可灵 实习', en: 'Onestory / Kling internship', href: '/work/' },
    ],
    tags: ['Diffusion', 'DiT', 'T2I / I2I', 'Controllable Generation', 'Video Generation'],
  },
  {
    zh: '扩散模型',
    en: 'Diffusion Models',
    level: 'advanced',
    didZh: '在 LAMIC / TAG-WM 中深度使用多模态扩散 Transformer 与扩散反演；熟悉 DDPM/DDIM、Flow Matching 等采样与训练机制。',
    didEn: 'Heavily used multimodal diffusion transformers and diffusion inversion in LAMIC / TAG-WM; familiar with DDPM/DDIM and flow matching.',
    evidence: [],
    tags: ['DDPM / DDIM', 'Diffusion Inversion', 'Flow Matching', 'DiT'],
  },
  {
    zh: 'AI 安全 · 水印与篡改取证',
    en: 'AI Safety · Watermarking & Forensics',
    level: 'proficient',
    didZh: '一作提出 TAG-WM（ICCV 2025）与 Flow of Truth（面向图像到视频的时序取证），研究生成图像/视频的水印、版权保护与篡改定位。担任 AAAI 2026 审稿人。（非我主要兴趣，但代表我的研究产出）',
    didEn: 'First-authored TAG-WM (ICCV 2025) and Flow of Truth (temporal forensics for I2V). Reviewer for AAAI 2026. (Not my primary interest, but part of my research output.)',
    evidence: [
      { zh: 'TAG-WM · ICCV 2025', en: 'TAG-WM · ICCV 2025', href: '/publications/' },
      { zh: 'Flow of Truth', en: 'Flow of Truth', href: 'https://arxiv.org/abs/2604.15003' },
    ],
    tags: ['Generative Watermarking', 'Tamper Localization', 'Temporal Forensics'],
  },
];

// ── 兴趣与探索方向 ────────────────────────────────────────────────────────────
export interface Interest {
  zh: string;
  en: string;
  noteZh: string;
  noteEn: string;
  tags: string[];
  href?: string; // e.g. link to reading base
}

export const INTERESTS: Interest[] = [
  {
    zh: '多模态生成',
    en: 'Multimodal Generation',
    noteZh: '让 AI 跨模态地生成内容，从当前的图像/视频走向更统一的多模态生成——这是我最想深耕的方向。',
    noteEn: 'AI that generates across modalities, moving from image/video toward more unified multimodal generation — the direction I most want to pursue.',
    tags: ['Unified Generation', 'Any-to-Any', 'Cross-Modal'],
  },
  {
    zh: '多模态理解',
    en: 'Multimodal Understanding',
    noteZh: '让 AI 跨模态地理解世界；在可灵接触统一「理解-生成」，持续跟进 MLLM / VLM 与视觉 tokenizer。',
    noteEn: 'AI that understands the world across modalities; explored unified understanding-and-generation at Kling, tracking MLLM / VLM and visual tokenizers.',
    tags: ['MLLM', 'VLM', 'Unified Understanding & Generation'],
  },
  {
    zh: '机器人 · 具身智能',
    en: 'Robotics · Embodied AI',
    noteZh: '系统性阅读 VLA、世界-动作模型、模仿学习（占我近期阅读很大比重），正从阅读走向实践。',
    noteEn: 'Systematic reading on VLA, world-action models and imitation learning (a large part of my reading base); moving toward practice.',
    tags: ['VLA', 'World Action Models', 'Imitation Learning'],
  },
  {
    zh: '仿真 · 游戏（可交互世界）',
    en: 'Simulation · Games (interactive worlds)',
    noteZh: '关注可交互世界、游戏环境与 sim-to-real，作为让 AI 生成并栖居于世界的试验场。',
    noteEn: 'Interested in interactive worlds, game environments and sim-to-real as testbeds for AI that generates and inhabits worlds.',
    tags: ['World Models', 'Sim-to-Real', 'Interactive Environments'],
  },
  {
    zh: '强化学习与决策',
    en: 'Reinforcement Learning & Decision Making',
    noteZh: '关注 RL / RLHF 与决策智能，作为连接「生成」与「交互」的桥梁。',
    noteEn: 'Following RL / RLHF and decision making as the bridge between generation and interaction.',
    tags: ['RL / RLHF', 'Policy Learning', 'Agents'],
  },
];
