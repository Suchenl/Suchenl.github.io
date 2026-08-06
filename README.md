# Suchenl.github.io

陈宇卓 (Yuzhuo Chen) 的个人主页与博客 — Personal homepage & blog.

Built with [Astro](https://astro.build/), deployed to GitHub Pages via GitHub Actions.
Live at <https://suchenl.github.io/>.

## Structure

The site source lives in [`web/`](./web):

- `web/src/pages/` — routes (home, blog, publications, work, expertise, reading)
- `web/src/content/` — content collections (blog posts, papers)
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
which builds `web/` and publishes to GitHub Pages.

> The previous Jekyll (academicpages) site is preserved on the `legacy-jekyll` branch.
