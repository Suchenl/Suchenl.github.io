# Research 前端体验审查（2026-10-19）

> 此文记录已检查的交互决策、可复验的标准与仍需人工验证的情况。**构建成功不等于所有浏览器中都已通过视觉/交互验收。**

## 为什么改

- 旧目录把「选择目录」和「展开目录」拆成两套相邻的操作，点击分类名称时无法直接收起，需要精准点击 12–16px 的三角。
- 旧目录键盘无法使用标准方向键，更新 DOM 后容易丢失焦点；此前 URL 选择采用 `replaceState`，前进/后退不能恢复此前所选分类。
- 移动端原导航可自动换行占据数行；主内容缺少全站跳转入口，长文详情存在双 H1 的风险。
- 论文详情和目录的返回路径原来可能只回到默认主分类，忽视用户从次要分类进入的情境。

## 已实施的体验契约

| 区域 | 新交互 | 验证方式 |
|---|---|---|
| 左侧文件树 | 一个整行按钮包含图标、分类文字、计数；首次选择打开，再次选中收起 | 手工点击文字/箭头/数字及二次点击 |
| 目录键盘 | ↑↓ 节点移动，←→ 展开/收起或回父级，Home/End 跳首尾，Enter/Space 激活 | 键盘测试；源码静态检查 |
| 目录无障碍 | `role=tree/treeitem`、显式层级与展开状态、`aria-current`、可见焦点、44px 行高 | DOM 属性/读屏检查（读屏尚待人工验证） |
| 搜索与筛选 | 搜索不破坏文件树当前展开/滚动；已有 /、Ctrl/⌘K 和 Esc | 浏览器测试 |
| 历史导航 | 目录切换用 `pushState`，`popstate` 恢复；详情保存来源目录 | 浏览器前进/后退、次分类进出 |
| 论文列表 | 卡片正文大面积可点击；外部原始资料链接仍可单独打开 | 鼠标、Tab/Enter、外链检查 |
| 手机导航 | 44px 菜单按钮打开/关闭主导航，Escape/点外部可关闭 | 320px/390px/768px 视口 |
| 长文 | 正确隐藏重复 Markdown H1；移动目录跳转后关闭；专注模式隐藏目录 | 研究综述页滚动测试 |
| 通用无障碍 | 跳至主要内容、`:focus-visible`、`prefers-reduced-motion` | 键盘与系统偏好 |
| 数学公式 | KaTeX 预渲染+构建检查，公式横向溢出可滚动 | 生成 HTML 的公式计数 |

## 维护优先级

1. **P0 回归阻断**：数学公式渲染、内部链接、构建输出、导航入口、整行目录操作契约。通过 `web/scripts/check-research-render.mjs` 检查，但事件交互仍需浏览器实测。
2. **P1 人工交互验收**：Chrome、Safari（Mac/iOS）、窄屏触控、系统深色模式、200%/400% 缩放、VoiceOver、动态字号及低动作设置。
3. **P2 可选增强**：进一步考虑阅读进度跨设备同步、真正的页面内 Markdown 编辑（需要身份验证/授权）、论文 PDF 并排阅读；这些不应在静态页面伪装成已支持。

## 从规范到实现的取舍

- Nielsen Norman Group：控制权/自由、识别优于回忆、一致性和预防误操作（https://www.nngroup.com/articles/ten-usability-heuristics/）。
- W3C Tree View Pattern：导航模型与方向键规范（https://www.w3.org/WAI/ARIA/apg/patterns/treeview/）。
- WCAG 2.2：键盘操作、可见焦点、点击目标、移动端重排（https://www.w3.org/TR/WCAG22/）。

## MarkView-Pro 与部署

- `Suchenl/MarkView-Pro/components/Preview.tsx`：ReactMarkdown、remark-gfm、remark-math、rehype-katex、Prism 代码高亮。Research 采用 Astro + Remark + KaTeX/ Shiki，保持静态渲染，不必整体切换成 React。
- 个人主页公开仓库使用 GitHub 标准 Ubuntu runner 和 Pages 部署：公开标准 runner 免费，私有仓库计费分钟不因此减少；制品存储和平台运行限制仍需关注。
- 不强制在 Actions 编译：可本地 build 发布 `gh-pages` 分支；但切换 Pages 发布来源前不得删掉当前工作流，以免网站停止自动部署。
- 当前静态站内容及阅读状态仍需通过 GitHub Markdown 编辑；网页字号、专注模式、目录开合不是 GitHub 写入操作。

## 本次验收边界

已通过 Astro build + 静态 HTML 检查的内容记录在对应 Actions run；没有进行真实 Safari/iOS/VoiceOver 的端到端测试，因此不声称已经做到所有设备无障碍零缺陷。

## 第二轮：移动端分类发现与研究现场恢复

- 手机端的研究目录不再只露出 196px 的狭小滚动区域，改成带当前目录说明的折叠面板，展开可查看完整层级，选择之后关闭并恢复键盘焦点。
- 超过 12 条的结果分批显示，避免手机上默认出现过长的论文卡片列表；显示剩余数量，全文搜索仍覆盖全部数据。
- 查询 `q`、阅读筛选 `status`、排序 `sort` 与当前 `folder` 持久化到 URL；从搜索进入文献后，返回仍能恢复阅读现场，不依赖浏览器后退缓存。
- 新增强制回归检查覆盖移动面板、分页控制与搜索/排序回跳参数。
