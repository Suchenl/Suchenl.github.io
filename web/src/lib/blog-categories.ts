/** Blog post primary category = reading experience, not research topic. */
export const BLOG_CATEGORIES = ['深挖', '速记', '动手', '杂谈'] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_META: Record<
  BlogCategory,
  { zh: string; en: string; hintZh: string; hintEn: string }
> = {
  深挖: {
    zh: '深挖',
    en: 'Deep dive',
    hintZh: '长文机制、把几篇论文拧成一条线',
    hintEn: 'Long-form mechanism essays',
  },
  速记: {
    zh: '速记',
    en: 'Notes',
    hintZh: '短读后感、一页纸笔记',
    hintEn: 'Short notes and paper scraps',
  },
  动手: {
    zh: '动手',
    en: 'Builds',
    hintZh: '可复现的工程、脚本、踩坑',
    hintEn: 'How-tos, scripts, deploy notes',
  },
  杂谈: {
    zh: '杂谈',
    en: 'Aside',
    hintZh: '站点、随想、非技术主线',
    hintEn: 'Meta, site, soft thoughts',
  },
};
