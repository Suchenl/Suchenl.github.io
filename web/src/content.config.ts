import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

export const collections = { papers };
