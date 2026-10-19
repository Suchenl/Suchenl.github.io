# 更新记录

## 2026-10-19
- **合并 Reading 与 Research**：以 `/research/` 为唯一入口，保留多层级分类树、检索、阅读状态与评分；旧 `/reading/` 重定向到 Research。
- 将 Reading 旧 8 篇论文卡片迁入唯一 `knowledge/papers/`，为原有 15 篇深度卡片加上 `categories` 与 `untracked`；不把 AI 阅读笔记误标为用户已读。
- 论文元数据支持一篇论文出现在多个研究分类；点击目录条目进入现有 Markdown 解读，原始英文标题保留、中文摘要和分类优先。
- 把「SFT、RL 与 LLM Agent 的协同训练：2025–2026 年中文文献综述」更名为「SFT、RL 与 LLM Agent 的协同训练：2025–2026 年文献综述」。
- 迁入个人主页仓库的 `knowledge/`，由 Astro 内容集合在 `/research/` 展示；旧仓库停止同步，未来只维护此处。
- 进一步检索 10 月近期研究，补充 TSRL（困难状态触发 SFT）、AgentTune（统一 EventLog）及腾讯混元 UniRL（多模式训练基础设施），均标注论文/仓库证据等级。
- 初始化中文 Markdown 个人研究知识库及 AI 维护规范。
- 建立 SFT、RL、RLVR、OPD、混合训练等共享术语。
- 创建首个主题：LLM/多模态 Agent 的 SFT × RL 协同训练综述。
- 收录 2025–2026 年代表文献的独立中文解读与来源链接。
- 单独保存“真实轨迹作为 RLVR 奖励、SFT Loss 不变”的研究方案及风险。
- 增加本地内部链接与重复路径检查；**不部署定时自动爬虫或收费 GitHub Actions**。
