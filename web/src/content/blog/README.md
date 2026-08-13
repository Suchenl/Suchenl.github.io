# 博客内容目录

每篇文章一个文件夹；**文件夹名 = 网址 slug**（`/blog/<slug>/`）。

## 目录约定（不要改名）

```text
blog/
  README.md                 ← 本说明
  _template/                ← 新文章起点（不会发布）
    source.md
    images/
    scripts/
    tables/
  <slug>/                   ← 一篇文章
    source.md               ← 正文（固定叫 source.md）
    images/                 ← 图
    scripts/                ← 画图 / 造表脚本
    tables/                 ← 表格源数据（可选）
```

`_template/` 只作样板，内容集合加载器会排除它。

## 写新博客（每次都这样做）

1. **整夹复制** `_template/`，改名为英文短横线 slug，例如 `my-new-post/`。
2. 打开新文件夹里的 `source.md`，改 frontmatter（标题、摘要、`category`、`tags`、`date`）。
3. 写正文；图放 `images/`，用 `![说明](./images/xxx.svg)` 引用。
4. 需要可复现的图：脚本放 `scripts/`，输出写到 `images/`。
5. 本地预览：`cd web && npm run dev`（`draft: true` 时生产构建不会收录）。
6. 准备上线：把 `draft` 改成 `false`（或删掉该行），提交并推送。

不要从别处随手新建空目录；**一律从 `_template` 拷贝**，以免漏掉 `images/` / `scripts/` / `tables/`。

## 分类 vs 标签

- `category`（必填，恰好 1 个）= 阅读体验：`深挖` | `速记` | `动手` | `杂谈`
- `tags`（可选，多个）= 研究方向 / 方法名

## 风格与校验

见仓库内 `sus_utils/writing_utils/blog_skills/`（苏神风写作 + 审稿）。交稿前：

```bash
python3 sus_utils/writing_utils/blog_skills/blog-writing/scripts/check_style.py \
  web/src/content/blog/<slug>/source.md
```
