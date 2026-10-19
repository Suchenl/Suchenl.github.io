# 中文研究知识库维护手册

> 本文维护唯一内容源 `Suchenl/Suchenl.github.io/knowledge/`，网页展示入口为 `https://suchenl.github.io/research/`。不要手工复制 Markdown 到 Astro 博客文章，也不要更新旧 `sus_research_review` 镜像。

## 增加新主题

优先建立 `topics/<英文稳定目录名>/README.md` 与 `reviews/<中文或英文短名>.md`。主题页面解释核心问题、当前共识、代表方法、争议、文献入口和下一轮待核验方向，不必写成会议论文格式。

## 增加一篇论文

1. 先通过题目/arXiv ID/DOI 在 `papers/README.md` 和现有文件中查重。
2. 在 `papers/<首次公开年份>/<英文短名>.md` 创建**唯一**论文卡片。文件名创建后尽量不改，避免断链。不得另建 `web/src/content/papers/` 论文副本。
3. 初次收藏至少记录标题、可核验的权威链接、中文简述及 `categories`；详细解读可逐渐补充作者、发表状态、方法步骤、训练目标、实验结果、局限、个人判断。未核验信息明确标注，不能假装完整。
4. 数值后面明确说明在哪个模型/基准/预算比较；不能将未验证的推测放进“论文结果”。
5. frontmatter 使用英文原始 `title`、`year`、中文层级 `categories` 数组、`summaryZh`；如有用户提供的阅读状态才填写 `status: to-read | reading | read`，否则使用 `untracked`。在多个主题出现时添加分类，不复制 Markdown。最后更新全局文献索引、相关综述和 `CHANGELOG.md`。

## 增加术语

共享术语优先记在 `glossary/core.md`；特定研究方向术语在 `glossary/<领域>.md`。定义包括：中文、英文、公式/精确定义、非等价的相似概念、一个简短例子。综述链接术语，不复制整段定义。

## 文献链接与版本

优先官方会议目录、arXiv、作者官方项目主页、官方仓库。预印本必须标明“尚未从该来源确认正式接收”，不因其他博客转载就升格成正式发表。发布日期与核对日期不同。发生版本更新时，补“修订记录”而不是直接覆盖以前的历史结论。

## 建议的增量维护频率

日常新增随读随记；同一主题的系统检索可以每周或每月集中进行。仓库**不会自动**执行检索：如需定期自动发现或自动提交，要另外配置有权限的 Agent/计划任务，更新必须可审计，不能默认直接覆盖人工评价。

## 完成核对

运行 `python knowledge/scripts/check_kb.py`；查看 Git diff；确认只调整被授权的内容；小批提交并推送。

## 数学公式与研究阅读页（2026-10）

- 行内公式写为 `$x_t$`，独立公式写为成对 `$$ ... $$`。不要把展示公式当作普通文本或代码块。
- `remark-math` + `rehype-katex` 负责渲染。此前自定义 Markdown 公式节点转换器因未设置 HTML 渲染信息已移除，不要恢复。
- `npm run build` 自动运行 `scripts/check-research-render.mjs`，核对数学公式、研究内部链接和主页面必需元素。
- `/research/` 仅做静态浏览；笔记和阅读状态修改通过详情页的 GitHub 编辑链接及 Markdown frontmatter 完成。网页本身不提供直接写回仓库的保存操作。

## 维护学习路线和双向关联

新增学习路线存放在 `paths/<英文短名>.md`，使用 `templates/learning-path.md`。`steps.ref` 必须是现有内容的唯一稳定 ID（例如 `papers/2026/bridge`），`steps.why` 解释这一步训练什么理解能力。绝对不要把一篇论文的全文复制到路线里。

新增术语只需在 `glossary/*.md` 下编写 `## 术语名`，Research 会用 Astro 渲染生成的准确 heading slug 为它建搜索入口。不要求作者手工编写容易失效的锚点。

综述引用独立论文时使用正常 Markdown 相对链接；详情页自动显示逆向导航。给出的「引用」仅指知识库内部 Markdown 关联，不宣称代表学术论文之间的引文。

每次维护运行 `python knowledge/scripts/check_kb.py` 和 `cd web && npm run build`，后者检查学习路线、KaTeX、内部路径等静态产物。真正的点击和移动端布局还应按 `docs/UX_AUDIT.md` 验收。

## 个人学习笔记的处理约定

站点阅读器下方的「我的学习笔记」使用浏览器 localStorage，仅保存于当前设备的当前浏览器。它不是仓库的 Markdown 文件，也不代表已同步、正式发表或已完成阅读。用户可以点击「复制为 Markdown」手动转存；浏览器禁用存储时页面会提示备份。任何未来自动同步方案都必须得到明确授权，不能默认把本地草稿上传远端。
