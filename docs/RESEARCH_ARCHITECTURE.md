# Research 前端结构与维护约定

## 2026-10-20 当前组织

| 文件 | 作用 |
|---|---|
| `web/src/pages/research/index.astro` | Library 的静态数据装配、目录和列表标记 |
| `web/src/scripts/research-library.ts` | 分类树、搜索、URL 状态、筛选、论文对比选择的客户端交互 |
| `web/src/styles/research-library.css` | Research library 样式，保留既有选择器 |
| `web/src/pages/research/[...slug].astro` | 阅读页的 Markdown 渲染、知识图谱关联与学习路径入口 |
| `web/src/scripts/research-reader.ts` | 阅读目录、上次章节、阅读字号、学习路线打勾等本机交互 |
| `web/src/styles/research-reader.css` | Research 阅读器样式 |
| `web/src/styles/reader.css` | Blog 与 Research 的共同长文排版规范 |
| `web/src/lib/research-graph.ts` | 从已有 Markdown 引用和显式 `related` 构建知识关系 |
| `knowledge/` | 论文、术语、专题综述、研究思路、学习路径的唯一 Markdown 内容源 |

## 边界和约束

- Astro 文件只负责语义标记、数据装配；浏览器交互集中在脚本，视觉调整集中在 CSS。不要重新把 25 KB 交互逻辑粘回 .astro。
- 一个论文只有一份 Markdown 主体。对比页的比较字段与相关研究类型由人工审核的 frontmatter 给出。
- URL 上的搜索、分类、排序、文献深链接要在往返导航后保持。
- Research 不包含个人学习笔记编辑器、笔记同步或笔记 JSON 备份。现存的本机阅读章节记录和学习路线进度只是用户端状态，不改写论文已读状态。
- 个人研究定位、兴趣描述禁止依据新项目重新生成；改动前应明确询问站点所有者。
- `node web/scripts/check-research-render.mjs` 的测试契约跨 Astro、脚本和 CSS 检查。移动文件时同步更新相应测试，不应回退重构来“修测试”。
- 部署前先跑 `cd web && npm run build`，再看 GitHub Actions 中 Chromium 320/390/1440px 实际交互结果。深色、减少动态效果与屏幕阅读器仍需额外覆盖；CI 结果不代表真实 Safari 实机验收。

## 未来值得继续但无需立即增加的工作

- 逐段核验论文深度笔记中的评测表、训练资源与原论文是否一致。
- 通过稳定的单项文献数据索引维护跨主题文献比较。
- 按实际使用反馈收敛重复的样式规则；避免以添加新功能代替解决可读性问题。

## 当前领域与类型架构（2026-10-27）

- `knowledge/taxonomy.json`：统一维护领域树与正文类型字典；`web/src/lib/research-taxonomy.ts` 读取同一源。不可将论文 frontmatter 的旧 `categories` 当作唯一研究领域。
- 各正式正文使用 `domains: ["一级/二级"]`、`contentType: paper|review|qa|exploration|plan|glossary|path`。既有文章原路径、URL 和正文保持不变。
- `web/src/pages/research/index.astro` 一次性聚合不同知识类型，术语章节可通过全站搜索定位但不重复计入领域计数。
- `web/src/scripts/research-library.ts` 创建跨类型的领域树，`type` 独立于 `folder`（领域）。查询参数保存筛选，返回链接复原；旧 `cat:` 和 `papers` 书签保持兼容。
- `web/src/lib/public-questions.ts` 只筛 `contentType: exploration && publicQuestion: true`，按人工 `featuredOrder` 排序。Questions 只做展示，不存第二份正文。
- `node web/scripts/check-knowledge-taxonomy.mjs`（需从 web 目录运行）验证每份正文的类型、领域和 Questions 约束，随 `npm run build` 自动执行；`check-research-render.mjs` 验证关键公式、OPD SVG 和精选边界。
- 论文对比、阅读状态只对论文开放；搜索、阅读目录、反向引用、学习路径以及中文优先原则沿用原系统。
