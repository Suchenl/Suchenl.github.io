---
# ── 新文章模板（复制整个 _template/ 文件夹后改名）────────────────
# 每次写新博客：
#   1. 复制 web/src/content/blog/_template/ → web/src/content/blog/<slug>/
#   2. 文件夹名 <slug> 就是网址：/blog/<slug>/
#   3. 正文永远叫 source.md；图放 images/；画图脚本放 scripts/；表数据放 tables/
#   4. 写完把 draft 改成 false（或删掉那行）再提交发布
# 详见同级 ../README.md
# ────────────────────────────────────────────────────────────────

title: "文章标题（必填）"

# 一句话摘要：显示在博客列表、搜索引擎结果和社交分享卡片上（可选，建议写）
description: "一句话概括这篇文章讲了什么。"

# 发布时间会自动取该文件「首次 git 提交」的时间，之后修改会自动显示「更新于…」。
# 下面这个 date 只是本地预览 / 尚未提交时的占位，必填，格式 YYYY-MM-DD。
date: 2026-01-01

# 一级分类（必填，恰好选 1 个）= 阅读体验，不是研究方向：
#   深挖 = 长文机制 / 把几篇论文拧成一条线
#   速记 = 短读后感、一页纸笔记
#   动手 = 可复现工程、脚本、踩坑
#   杂谈 = 站点、随想、非技术主线
category: 深挖

# 细标签（可选）：研究方向、方法名等，可多个
tags: ["生成模型"]

# 语言：zh 或 en，默认 zh（可删）
lang: zh

# 草稿开关：true = 不发布（不进列表/RSS/网址）；正式发布改为 false 或删除本行。
draft: true

# 阅读统计（字数 / 图 / 表 / 公式 / 预计阅读时间）由页面模板自动算，标题下方展示；
# 不要在正文手写。见 web/src/lib/reading-stats.ts 与 pages/blog/[...slug].astro。
---

在这里用 **Markdown** 写正文。第一段通常作为开场。

<!--
排版说明（无需手动做，系统自动处理）：
- 章节会自动编号：H2 → 1、2、3；H3 → 1.1、1.2；H4 → 1.1.1。所以正文里
  直接写 `##` / `###` / `####` 即可，标题里不要自己敲数字。
- 文章顶部会自动生成「目录」，读者可点击跳转到对应章节（至少 2 个标题才显示）。
- 数学公式支持 LaTeX：行内用 $...$，独立成行用 $$...$$。
- 标题里禁止写 $...$（目录会重复渲染）；写成纯文本如 t\*。
-->

## 一级小标题（H2）

正文段落。支持 **加粗**、*斜体*、`行内代码` 和 [链接](https://example.com)。

- 无序列表项
- 另一项

1. 有序列表项
2. 另一项

### 二级小标题（H3）

> 这是一段引用（blockquote）。

```python
# 代码块（会自动语法高亮）
print("hello")
```

## 资源放哪、怎么引用

本文件夹约定结构（不要改名字）：

```text
<slug>/
  source.md      ← 正文（本文件）
  images/        ← 图（png / svg / webp …）
  scripts/       ← 画图 / 造表脚本
  tables/        ← 表格源数据（csv 等，可选）
```

图放进 `images/`，在正文里用相对路径引用：

```md
![图片说明](./images/your-figure.svg)
```

画图脚本放进 `scripts/`。优先纯 Python 无第三方依赖，运行时打印内嵌数据与出处，输出写到 `../images/`。复杂示意图若必须用 matplotlib，在脚本注释里写清依赖即可。

```bash
cd web/src/content/blog/<slug>/scripts
python3 make_figures.py
```

<!--
风格硬规则（交稿前跑）：
  python3 sus_utils/writing_utils/blog_skills/blog-writing/scripts/check_style.py path/to/source.md
破折号「——」≈ 0；加粗极省；标题里不要 $...$。
-->
