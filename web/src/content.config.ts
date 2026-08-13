import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOG_CATEGORIES } from './lib/blog-categories';

// Literature base — deliberately simple, Finder-like.
// One Markdown file per paper, placed in a folder. Reorganize = move the file
// into another folder (any depth), exactly like your local AI Papers.
// The folder is derived from the file's location (or overridden via `folder`).
const papers = defineCollection({
  // Keep the original folder path & casing as the id (don't slugify), so the
  // on-disk folder structure maps 1:1 to the tree shown on the site.
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/papers',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()).default([]),
    year: z.number().optional(),
    venue: z.string().optional(),
    folder: z.string().optional(), // optional override; normally derived from path
    tags: z.array(z.string()).default([]),
    status: z.enum(['to-read', 'reading', 'read']).default('to-read'),
    rating: z.number().min(0).max(5).optional(),
    links: z
      .object({
        arxiv: z.string().optional(),
        pdf: z.string().optional(),
        code: z.string().optional(),
        project: z.string().optional(),
      })
      .partial()
      .default({}),
    abstract: z.string().optional(),
    added: z.coerce.date().optional(),
  }),
});

// Blog — one folder per post: src/content/blog/<slug>/index.md, with that
// post's images colocated in the same folder (referenced as ./image.svg).
// generateId maps <slug>/index.md → <slug> (a flat <slug>.md still works too).
const blog = defineCollection({
  loader: glob({
    // Only post folders: <slug>/index.md. Root helpers like _template.md are excluded.
    pattern: '**/index.md',
    base: './src/content/blog',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
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

export const collections = { papers, blog };
