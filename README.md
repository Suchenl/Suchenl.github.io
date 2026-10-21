# Suchenl.github.io

陈宇卓 (Yuzhuo Chen) 的个人主页与博客 — Personal homepage & blog.

Built with [Astro](https://astro.build/), deployed to GitHub Pages via GitHub Actions.
Live at <https://suchenl.github.io/>.

## Structure

The site source lives in [`web/`](./web):

- `web/src/pages/` — published routes (home, blog, publications, work, Questions & Explorations, unified research)
- `/questions/` — curated index of explicitly public open research questions, drawing from canonical `knowledge/research/*.md` notes
- `web/src/archived/expertise/index.astro` — preserved, unpublished Expertise page source; move back into `src/pages/expertise/` to restore it
- `web/src/data/expertise.ts` — preserved Expertise dataset (not publicly rendered)
- `web/src/content/` — blog content (the paper library lives only under knowledge/)
- `knowledge/` — canonical Chinese-first research library: paper metadata, detailed notes, topic reviews, glossary, hypotheses, AI maintenance rules (rendered at `/research/`)
- `web/src/pages/research/` — one Research UI combining the former Reading folder tree and deep research pages
- `/reading/` — legacy URL redirected to `/research/`
- `web/src/config.ts` — site metadata, navigation, bilingual (中文/EN) strings
- `web/src/data/` — structured data (publications and retained Expertise data)
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
- Reader-facing research and homepage content must always be an integrated current-state reference: consolidate every new dataset or result into the canonical tables and sections; do not publish incremental "newly added", "previous four", "extended research" or patch/changelog paragraphs. Preserve dates only for source-verification context; Git commits retain change history.

- Full UX review and limitations: docs/UX_AUDIT.md.

## Current product decisions (2026-10-20)

- Publications use unobstructed thumbnails and native expandable summaries for **every** paper. The duplicate public-release timeline was removed; there is no zoom overlay.
- Research **does not** include a personal learning-notebook editor or JSON notebook-backup interface. Do not reintroduce these based on historical documentation.
- The homepage favors specific current research descriptions over overlapping generic tags.
- Project descriptions avoid “side projects” and “小项目”.

- The owner's research areas and personal interests are author-controlled: restore/retain their original wording from Git history unless the owner explicitly requests a change. Do not rewrite them to match the latest research project.

## 研究页面维护入口（2026-10）

- [Research 前端架构](docs/RESEARCH_ARCHITECTURE.md)：Astro 页面、客户端脚本、共享阅读样式和知识图谱之间的职责边界。
- [论文简介证据核对](docs/PAPER_BRIEF_AUDIT.md)：Publications 每篇简介的核对来源、结论边界及后续维护规则。
- 检查顺序：`cd web && npm run build`，确认 GitHub Actions 的 [Browser UI smoke](https://github.com/Suchenl/Suchenl.github.io/actions/workflows/browser-smoke.yml) 通过。
- Safari、VoiceOver 等真实平台需要单独验收；Chromium 的深色及减少动态效果模拟不等同于全设备通过。

## Unpublished Expertise page (2026-10-21)

The owner chose to remove the subjective skill-rating page from the public site while keeping its complete source and data in Git. The saved page lives at `web/src/archived/expertise/index.astro`, outside Astro's `src/pages/` directory. The corresponding `web/src/data/expertise.ts` has not been changed. Do not link to `/expertise/` or republish it unless the owner explicitly asks to restore it. The homepage and the main navigation link directly to Experience instead.

## Questions & Explorations (2026-10-21)

The homepage highlights the two latest entries, and `/questions/` lists owner-approved research questions and interest surveys. Add a Markdown entry under `knowledge/research/` with `publicQuestion: true` and optional `questionKind: interest` for literature-based interest surveys, plus `title`, `questionTitleEn`, `summaryZh`, `questionSummaryEn`, and `questionDate`. Its full content remains in the Research Library at `/research/research/<slug>/`. Do not duplicate the note as a separate blog post or publish private repositories, experiments, or undisclosed project details. Distinguish literature-backed results, personal interests/perspectives, and unverified hypotheses. The adaptive-reasoning interest survey is maintained canonically at `knowledge/research/how-models-learn-adaptive-reasoning.md`; the cross-provider Agent protocol Q&A is at `knowledge/research/how-agent-reasoning-tools-and-state-work.md`.
