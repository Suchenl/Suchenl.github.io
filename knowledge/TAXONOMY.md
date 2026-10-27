# Research 分类与内容治理规范

本文件与 `taxonomy.json` 一起定义唯一的分类体系；正文只维护在原 Markdown，不按目录复制。

## 两个互相独立的维度

- **领域（domains）**：从 `taxonomy.json` 选一到多个完整路径，例如 `大模型与强化学习/后训练与策略优化`；领域树由**所有内容类型**生成，不局限论文。一个条目允许属于多个领域，但不得使用只存在于历史 `categories` 的散乱名字。
- **内容类型（contentType）**：每份正式正文必须有一个明确类型：`paper`、`review`、`qa`、`exploration`、`plan`、`glossary`、`path`。原有目录只用于存储/URL 兼容，不决定展示类型。`categories` 保留为历史细分标签供检索/迁移参考。
- **发表/阅读状态**只属于 `paper`；不能因为 AI 写过文章就标注已读。搜索、筛选、目录计数按照内容类型分别计算。

## Research 与 Questions

- **Research**：所有知识与研究积累的总目录。左侧领域树，右侧以内容类型筛选，所有资源共用一套搜索及语义关联。
- **Questions**：从 Research **精选**真正持续关心的研究兴趣/开放问题；并非第二个知识库。仅 `contentType: exploration` 且 `publicQuestion: true` 的文档可出现，需提供中英标题/概述、`questionKind` 和 `featuredOrder`。普通技术问答、论文、内部实验计划不进入。
- `featuredOrder` 是明确的人工展示顺序（数字越小越靠前），不靠伪造同一天的发布日期。 `questionDate` 若展示只能表示真实记录日期。
- 研究探索区分：现有事实、作者判断、未经验证的假设；不会将可证伪实验设想包装成已完成实验。

## 更新、兼容和审查

1. 新增前先找唯一正文，给它完整 `domains` 路径与 `contentType`；重复问题只建立内链，不再复制。
2. 更新 Question 精选需用户主动同意；技术 QA 不能只因标题带问号就进入。
3. 不移动既有 Markdown、不修改既有 `/research/...` URL；必要时迁移必须建立 301/301 等价重定向并检查反向链接。
4. 不披露私有仓库内容或实验数据；公开研究文章只依据公开论文/文档。
5. 运行 `python knowledge/scripts/check_kb.py`、`cd web && npm run build`，检查领域/类型校验、图示、公式、检索和 Questions 入口。
