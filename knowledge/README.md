# 个人研究知识库

> **正式阅读入口**：[个人主页 · 研究知识库](https://suchenl.github.io/research/) · **唯一可编辑内容源**：本仓库 `knowledge/`。此前的 `Suchenl/sus_research_review` 仓库仅保留历史快照，不再更新。

> **定位**：以中文持续积累论文研究、技术概念、可证伪的研究判断与实验设计。  
> **最近核对**：2026-10-19 · **全部内容可直接使用 Markdown 阅读和维护**。

本仓库不要求把每个方向写成正式论文。最重要的是：**找得到、读得懂、可追溯、能更新、不会把猜想和论文结论混为一谈**。

## 快速入口

| 我想做什么 | 从哪里开始 |
|---|---|
| 阅读某个方向的文献综述 | [研究主题](topics/README.md) |
| 阅读第一篇综合综述：SFT × RL | [SFT、RL 与 Agent 后训练：协同范式和最新证据](topics/llm-agent-training/reviews/sft-rl-co-training.md) |
| 按论文查找独立解读 | [论文卡片索引](papers/README.md) |
| 查定义、数学符号、术语区别 | [共享术语](glossary/README.md) |
| 查看尚未得到验证的研究设想 | [研究问题](research/README.md) |
| 为知识库提交修改、要求 AI 维护 | [维护规范](CONTRIBUTING.md) · [AI 工作规范](AGENTS.md) |
| 查看本次修订具体加了什么 | [更新记录](CHANGELOG.md) |

## 目录与职责

```text
README.md                    首页/导航；不堆积长篇综述
AGENTS.md                    人类与 AI 共同遵循的维护原则
CONTRIBUTING.md              新增方向、文献与术语的统一流程
topics/                      问题导向、跨论文的综述（允许持续修订）
  llm-agent-training/
    README.md
    reviews/                 主题综述：归纳、对比、争议与证据边界
papers/                      每篇论文唯一 Markdown：元信息+阅读状态+可渐进扩展的笔记
  2025/ 2026/...
glossary/                    单一术语定义来源（通用/各领域）
research/                    作者自己的假设、设计、反例与待验证问题
templates/                   新增条目的简洁 Markdown 模板
scripts/                     本地一致性自检；无收费 Actions 依赖
CHANGELOG.md                 逐次更新摘要
```

## 写作与证据约定

- 所有解释、比较、建议用**中文**；只保留原始论文英文标题、算法缩写、引用和必要的代码符号。
- 所有论文都保留可打开的**原始链接**，优先会议官方页面、arXiv、官方项目主页；预印本不标为已录用。
- `**论文事实**` 与 `**我的解读 / 推论**` 分栏；跨领域应用不能当作原论文结论。
- 指标要同时记录数据集、模型规模、预算、基线和评价方式；不要脱离条件比较数字。
- 一篇论文一个 canonical 页面；在多个综述出现时只引用，不复制整篇解读。
- 当前时间标记是**上次人工/AI 核验时间，不是自动同步承诺**。

## 为什么选 Markdown

GitHub 原生显示公式、目录、代码和链接；每次更改都可以用 Git diff 查看；无需 LaTeX 或构建步骤；AI 很容易检索和编辑。以后如需全文检索、静态站点或 Zotero 导出，可在保持原 Markdown 路径的前提下加索引层，**不要为了展示功能改变唯一知识来源**。

## 统一浏览方式

网站使用 `/research/` 作为唯一入口：左侧文件夹式目录、右侧按论文与研究资料浏览。原 `/reading/` 自动跳转到 Research。原 `web/src/content/papers/` 的论文记录已并入 `knowledge/papers/`，不再创建第二份笔记。分类来自论文 frontmatter 的 `categories` 数组，一篇论文可以关联多个目录；原论文英文题目保留，摘要、笔记及分类中文优先。

阅读状态分为 `to-read`（想读）、`reading`（在读）、`read`（已读）和 `untracked`（未标记）。已有 AI 解读不等于用户本人已经读过，不应擅自标记为已读。
