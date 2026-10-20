# Suchenl.github.io

陈宇卓 (Yuzhuo Chen) 的个人主页与博客 — Personal homepage & blog.

Built with [Astro](https://astro.build/), deployed to GitHub Pages via GitHub Actions.
Live at <https://suchenl.github.io/>.

## Structure

The site source lives in [`web/`](./web):

- `web/src/pages/` — routes (home, blog, publications, work, expertise, unified research)
- `web/src/content/` — blog content (the paper library lives only under knowledge/)
- `knowledge/` — canonical Chinese-first research library: paper metadata, detailed notes, topic reviews, glossary, hypotheses, AI maintenance rules (rendered at `/research/`)
- `web/src/pages/research/` — one Research UI combining the former Reading folder tree and deep research pages
- `/reading/` — legacy URL redirected to `/research/`
- `web/src/config.ts` — site metadata, navigation, bilingual (中文/EN) strings
- `web/src/data/` — structured data (publications, expertise)
- `web/public/` — static assets (images, favicons)

## Local development

```bash
cd web
npm install
npm run dev      # start dev server
npm run build    # production build to web/dist
npm run preview  # preview the production build
```

## Deployment

Pushing to `main` (changes under `web/**`) triggers
[`.github/workflows/deploy-astro.yml`](./.github/workflows/deploy-astro.yml),
which builds `web/` (including formula and navigation checks via `scripts/check-research-render.mjs`) and publishes to GitHub Pages.

Research content is browsed at `/research/` and maintained as Markdown under `knowledge/`. The deprecated `/reading/` URL redirects to the unified Research page.

> The previous Jekyll (academicpages) site is preserved on the `legacy-jekyll` branch.



## Development and site quality

- Build: cd web && npm ci && npm run build. This checks generated research math, links, routes and public-page smoke conditions.
- Browser QA: .github/workflows/browser-smoke.yml tests desktop/mobile Chromium, modal focus, category filters, comparison, learning progress and local data backup.
- Performance: .github/workflows/lighthouse.yml records laboratory metrics for Home, Research and Publications. Do not treat Lighthouse numbers as real-user Core Web Vitals.
- Content policy: keep publication facts in web/src/data.ts, tool project facts in web/src/data/projects.ts, and research Markdown in knowledge/ as a single source of truth. Never automatically publish private repositories or user-local study notes.
- Full UX review and limitations: docs/UX_AUDIT.md.