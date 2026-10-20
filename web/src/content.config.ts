import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOG_CATEGORIES } from './lib/blog-categories';

// Blog — one folder per post:
//   src/content/blog/<slug>/source.md
//   src/content/blog/<slug>/images/   figures
//   src/content/blog/<slug>/scripts/  figure generators
//   src/content/blog/<slug>/tables/   optional table data
// Folder name = URL slug. `_template/` is the starter kit; never published.
const blog = defineCollection({
  loader: glob({
    pattern: ['*/source.md', '!_template/source.md'],
    base: './src/content/blog',
    generateId: ({ entry }) => entry.replace(/\/source\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // Reading experience (exactly one). Research topics go in tags.
    category: z.enum(BLOG_CATEGORIES),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['zh', 'en']).default('zh'),
    draft: z.boolean().default(false),
  }),
});

// Canonical research knowledge base, stored once at repository-root knowledge/.
// Only content, not AI maintenance files, is exposed as public research pages.
const knowledge = defineCollection({
  loader: glob({
    pattern: ['papers/**/*.md', 'topics/**/*.md', 'glossary/**/*.md', 'research/**/*.md', 'paths/**/*.md'],
    base: '../knowledge',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().optional(),
    shortName: z.string().min(1).optional(),
    aliases: z.array(z.string()).optional(),
    summaryZh: z.string().optional(),
    categories: z.array(z.string()).optional(),
    status: z.enum(['untracked','to-read','reading','read']).optional(),
    comparison: z.object({
      objective: z.string().optional(),
      training: z.string().optional(),
      signal: z.string().optional(),
      evidence: z.string().optional(),
      limitation: z.string().optional(),
    }).optional(),
    related: z.array(z.object({
      ref: z.string().min(1),
      type: z.enum(['compares','extends','requires','questions','supports']),
      note: z.string().min(1),
    })).optional(),
    steps: z.array(z.object({
      ref: z.string().min(1),
      why: z.string().min(1),
      stage: z.string().optional(),
    })).optional(),
  }).passthrough(),
});

export const collections = { blog, knowledge };
