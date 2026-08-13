import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from './src/lib/rehype-external-links.mjs';

// User GitHub Pages site (https://suchenl.github.io) serves from root, so base is '/'.
export default defineConfig({
  site: 'https://suchenl.github.io',
  base: '/',
  integrations: [
    // Keep the private reading base out of the public sitemap.
    sitemap({ filter: (page) => !page.includes('/reading') }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeExternalLinks],
  },
});
