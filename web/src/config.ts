export const SITE = {
  title: 'Yuzhuo Chen',
  titleZh: '陈宇卓',
  description: '陈宇卓 (Yuzhuo Chen)：让 AI 理解、生成，并与世界交互。个人主页与博客。',
  url: 'https://suchenl.github.io',
  defaultLang: 'zh' as const,
};

export const AUTHOR = {
  name: 'Yuzhuo Chen',
  nameZh: '陈宇卓',
  avatar: '/images/avatar.jpg',
  affiliation: 'University of Science and Technology of China (USTC)',
  affiliationZh: '中国科学技术大学（USTC）',
  location: 'Hefei, China',
  locationZh: '中国·合肥',
  email: 'yz.chen@mail.ustc.edu.cn',
  taglineZh: '让 AI 理解、生成，并与世界交互',
  taglineEn: 'Teaching AI to understand, generate, and interact with the world',
  interestsZh: '兴趣：多模态生成 · 多模态理解 · 机器人 · 仿真 · 游戏 · 强化学习',
  interestsEn: 'Interests: multimodal generation · multimodal understanding · robotics · simulation · games · RL',
  links: {
    googlescholar: 'https://scholar.google.com/citations?hl=en&user=x63XNe0AAAAJ',
    github: 'https://github.com/Suchenl',
    linkedin: 'https://www.linkedin.com/in/suchenl/',
    orcid: 'https://orcid.org/0009-0003-5119-9646',
  },
};

// Optional integrations. Leave blank to disable.
export const FEATURES = {
  // Privacy-friendly analytics (GoatCounter). Put your site code here, e.g.
  // 'suchenl' → https://suchenl.goatcounter.com/count. Empty = disabled.
  // Kept as fallback while Cloudflare Web Analytics is wired up.
  goatcounter: 'suchenl',

  // Cloudflare Web Analytics (JS beacon). Free; no cookies.
  // 1) Dashboard → Web Analytics → Add site → copy beacon token below.
  // 2) Create API token (Account Analytics: Read) + note account id + site tag.
  // 3) Set GitHub Actions secrets: CF_ACCOUNT_ID, CF_API_TOKEN, CF_SITE_TAG.
  // Build fetches GraphQL → public/analytics/cloudflare.json (token never ships to browser).
  // Empty beaconToken = beacon off; UI still falls back to GoatCounter.
  cloudflareAnalytics: {
    // Public site token from Web Analytics snippet (safe in HTML).
    beaconToken: '1165cf5a2f8c4e37a4574725fd8fc925',
  },

  // Comments + reactions via giscus (GitHub Discussions). Fully configured;
  // only requires installing the giscus GitHub App on the repo once:
  //   https://github.com/apps/giscus  →  Only select repositories → Suchenl.github.io
  giscus: {
    enabled: true,
    repo: 'Suchenl/Suchenl.github.io',
    repoId: 'R_kgDOPh2dtA',
    category: 'Announcements',
    categoryId: 'DIC_kwDOPh2dtM4DC2NT',
  },
};

export const NAV: { zh: string; en: string; href: string }[] = [
  { zh: '首页', en: 'Home', href: '/' },
  { zh: '博客', en: 'Blog', href: '/blog/' },
  { zh: '论文', en: 'Publications', href: '/publications/' },
  { zh: '项目', en: 'Projects', href: '/projects/' },
  { zh: '经历', en: 'Experience', href: '/work/' },
  { zh: '能力', en: 'Expertise', href: '/expertise/' },
];
