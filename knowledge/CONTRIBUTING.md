# 中文研究知识库维护手册

> 本文维护唯一内容源 `Suchenl/Suchenl.github.io/knowledge/`，网页展示入口为 `https://suchenl.github.io/research/`。不要手工复制 Markdown 到 Astro 博客文章，也不要更新旧 `sus_research_review` 镜像。

## 增加新主题

优先建立 `topics/<英文稳定目录名>/README.md` 与 `reviews/<中文或英文短名>.md`。主题页面解释核心问题、当前共识、代表方法、争议、文献入口和下一轮待核验方向，不必写成会议论文格式。

## 增加一篇论文

1. 先通过题目/arXiv ID/DOI 在 `papers/README.md` 和现有文件中查重。
2. 在 `papers/<年份>/<英文短名>.md` 创建**唯一**论文卡片，明确文件夹年份表示首次公开还是会议发表；已有路径不要为了修年份而直接重命名。文件名创建后尽量不改，避免断链。不得另建 `web/src/content/papers/` 论文副本。
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

## 比较字段与有类型研究关系

- 可在论文 frontmatter 添加 comparison.objective、comparison.training、comparison.signal、comparison.evidence、comparison.limitation。信息不足不要猜测，页面会显示待整理。
- 相关方法的 related 项必须具有 ref（已有知识库 ID）、type（compares/extends/requires/questions/supports）和 note（关联依据）。目标不存在时构建报错。
- 浏览器上的论文比较由读者选择 2–3 篇。不同论文采用不同基准/资源时，作者报告的数值不可直接相减推断排名。
- 当前 Research 没有个人学习笔记或 JSON 备份界面；仅保留本地阅读偏好和路线进度，不会向 GitHub 自动写入。


## 研究结论三级标注及核对优先级

对于每篇有公式、数值实验的论文，按以下顺序整理：

1. **作者事实**：会议/arXiv 版本、任务与训练数据、验证器、核心方法、实验结果（保留原指标口径与基线）。
2. **解释和推导**：独立用清楚的符号写出优化目标、一个数值/反例，并标注「简化推导，不是论文原公式」。
3. **研究推测**：假设迁移到机器人或 Agent 时，需要哪些额外条件？什么对照实验会否定自己的想法？
4. **完整性边界**：摘要已核对，不等于表格、附录、消融与复现全部已审计；用「待核对」记录未解决问题，而不是猜。
5. **代码/数据证据**：检查训练脚本、环境、模型 checkpoint、数据/Verifier 是否真正可下载和可运行，不能只保存仓库 URL。

审稿式审查应特别留意：来源版本变化、没有对齐训练预算的跨论文指标、理论假设的偷换、结果奖励的代理目标、无反事实记录却声称物理 on-policy 环境反馈。
