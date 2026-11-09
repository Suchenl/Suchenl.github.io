---
contentType: review
domains: ["大模型与强化学习/信息检索与知识系统"]
title: "文本检索：从 grep、BM25 到语义检索与 Hybrid Search"
shortName: "Text Retrieval"
catalogTitleZh: "文本检索：匹配、排序与检索系统"
aliases: ["Information Retrieval", "IR", "grep", "ripgrep", "BM25", "TF-IDF", "倒排索引", "RAG 检索", "向量检索", "Hybrid Search", "ColBERT", "SPLADE"]
summaryZh: "从 grep 与关键词匹配出发，沿着倒排索引、TF-IDF/BM25、学习式稀疏与稠密检索、ColBERT、Hybrid Search、重排序和评测建立一条完整的文本检索技术主线，讨论 Agent/RAG 中的实际选型。"
readingOrder:
  - ref: topics/text-retrieval/reviews/grep-and-index
    stage: "从搜索工具到检索系统"
    why: "先区分字符串匹配、正则表达式、候选召回、倒排索引与相关性排序，避免把 grep 与 BM25 当成同层算法。"
  - ref: topics/text-retrieval/reviews/lexical-bm25
    stage: "经典词法排序"
    why: "用一个小语料解释 TF-IDF 与 BM25 的词频、稀有度和长度归一化，以及分词和精确短语的边界。"
  - ref: topics/text-retrieval/reviews/neural-retrieval
    stage: "从词到语义"
    why: "理解 Dual Encoder、Dense Embedding、SPLADE、ColBERT 和 Cross Encoder 的输出、训练信号及检索成本。"
  - ref: topics/text-retrieval/reviews/hybrid-reranking
    stage: "搭建现代检索流水线"
    why: "弄清多路召回、RRF 融合、重排序、Query Rewrite 与 Context Packaging 各自做什么。"
  - ref: topics/text-retrieval/reviews/evaluation-practice
    stage: "评价与工程选型"
    why: "掌握 Recall@K、MRR、nDCG、端到端答案质量与延迟成本评测，避免只看一项检索分数。"
  - ref: topics/text-retrieval/reviews/agent-retrieval
    stage: "进入 Agent 与 RAG"
    why: "把文本检索放回工具 Agent 的完整闭环，理解搜索策略、证据阅读和使用证据之间的差异。"
---

# 文本检索：从 grep、BM25 到语义检索与 Hybrid Search

> **专题定位**：整理 Information Retrieval（IR）的基础方法与现代实践，讨论的不是“搜索哪个工具最好”，而是**如何从海量文本中获得与当前问题有关的证据**。内容适用于代码库搜索、文献检索、知识库、RAG 和具有 Search Tool 的 Agent。最后核对：2026-11-09。

## 一句话建立全貌

**grep 回答“哪一行符合模式”；BM25 回答“哪篇文档的查询词匹配得更有价值”；Embedding Retrieval 回答“哪些内容即使不共享字面词也可能语义相近”。现代检索系统通常同时解决候选召回、排序、过滤、阅读与证据使用，而不是只运行一种算法。**

## 先把三个层级分开

| 层级 | 解决的问题 | 代表方法或技术 | 不应混淆的东西 |
| --- | --- | --- | --- |
| 匹配与相关性模型 | 什么算匹配，哪些结果应排前面？ | 字符串/正则、布尔检索、TF-IDF、BM25、SPLADE、Dense、ColBERT、Cross Encoder | BM25 是排序函数，不是“倒排索引”本身 |
| 索引与搜索执行 | 如何避免每次从头扫描全部数据？ | 词项倒排表、位置索引、ANN、HNSW、IVF、PQ | HNSW/IVF 不是判断文本语义好坏的模型 |
| 检索流水线 | 多条召回路径如何协作，如何交给下游模型？ | Hybrid、RRF、Rerank、Query Rewrite、Chunking、Context Assembly | 重排序不能凭空找回从未召回的文档 |

一个检索系统可能采用**倒排索引 + BM25 + 向量索引 + RRF + Cross Encoder**。这是一条系统流水线，而不是五个同类算法相互竞争。

## 方法地图：文本检索有哪些？

| 类别 | 代表 | 基本机制 | 优势 | 典型弱点 |
| --- | --- | --- | --- | --- |
| 精确/模式匹配 | grep、ripgrep、正则表达式、短语搜索 | 字面字符、词和模式 | 精确定位标识符、日志、代码 | 改写和同义语义不自然 |
| 布尔检索 | AND / OR / NOT | 根据词项集合过滤文档 | 可解释、可控 | 通常不提供细腻排序 |
| 经典词法排序 | TF-IDF、BM25、BM25F | 词频、文档频率、长度/字段统计 | 快、稳定、适合专有名词 | 对词汇不重合的语义表达敏感 |
| 学习式稀疏检索 | SPLADE 等 | 神经模型预测稀疏词项权重及词扩展 | 兼顾语义扩展与倒排检索 | 训练、编码和索引更新有成本 |
| 稠密向量检索 | DPR、E5、BGE 等双编码器 | 句子/段落压缩为向量，进行近邻搜索 | 词汇不同也能匹配概念 | 精确数字、编号、否定和细粒度区别可能丢失 |
| 多向量/后期交互 | ColBERT、ColBERTv2 | Query/Document 各保留 token 向量，MaxSim 评分 | 更细粒度的软匹配 | 存储/候选筛选复杂 |
| 交叉编码器重排序 | BERT Cross Encoder、LLM Reranker | 让 Query 与文档联合交互打相关性分 | 候选级精排较强 | 对大语料逐篇计算太贵 |
| 混合搜索 | BM25 + Dense + RRF | 融合不同检索器候选 | 兼顾字面词和语义 | 融合策略、重复项与延迟需调优 |

> **重要**：上述分类混合了“评分方法”和“流水线方法”的不同层次，用于做能力地图，并非互斥的算法类别。HNSW、IVF、PQ 属于底层索引/近邻搜索策略，在对应文章中单独讨论。

## 一套贯穿全文的例子

检索请求：**“如何让机器人仅凭相机画面纠正末端位姿误差？”**

- grep 搜索固定字符串 **visual servoing**：如果文档没写这个词，可能完全找不到。
- BM25 搜索 **visual servoing robot end effector**：更倾向包含这些词、且词频和文档长度合适的文本。
- Dense Retrieval：可能召回解释“根据图像特征误差闭环控制机械臂”的文章，即使没写相同词。
- Hybrid：结合专业名词的精确性和语言表达的多样性。
- Reranker：在几十篇候选文章中进一步判断哪篇真正解释控制机制，而非仅提到名词。

## 按问题阅读

| 顺序 | 文章 | 要回答的问题 |
| --- | --- | --- |
| 01 | [grep、正则与倒排索引](reviews/grep-and-index.md) | grep 和数据库搜索有什么不同？索引为什么使搜索更快？ |
| 02 | [TF-IDF 与 BM25](reviews/lexical-bm25.md) | 如何从“包含关键词”变成“按相关性排序”？ |
| 03 | [Dense、SPLADE 与 ColBERT](reviews/neural-retrieval.md) | 向量究竟编码什么？稀疏/稠密/多向量的本质区别是什么？ |
| 04 | [Hybrid Search 与 Reranking](reviews/hybrid-reranking.md) | BM25 与向量检索如何融合？为什么通常先召回再精排？ |
| 05 | [评测与选型](reviews/evaluation-practice.md) | Recall@K、MRR、nDCG 评的分别是什么？如何做公平对照？ |
| 06 | [Agent 与 RAG 中的检索](reviews/agent-retrieval.md) | 搜索策略、工具返回、证据覆盖与最终任务成功有什么关系？ |

建议先读 01–02 理解词法搜索，再读 03–04 理解现代检索系统，最后用 05–06 检验真实场景效果。

## 快速选型

| 当前需求 | 先从哪里开始 | 后续升级 |
| --- | --- | --- |
| 找代码符号、错误码、固定日志 | rg / grep、字段过滤 | 需要项目级检索再建索引 |
| 科研论文标题、术语、人名、型号 | BM25 + 过滤 | 加 Dense 和 Rerank，保留原始文档引用 |
| 自然语言问知识库 | Dense + BM25 Hybrid | 依据真实 query 集调整融合和重排序 |
| 文档规模巨大、需要低延迟 | 倒排索引或 ANN | HNSW/IVF/PQ 的质量—内存—延迟权衡 |
| 需要严格证据链的 Agent | Hybrid + 可审计的 docid/citation | 评价检索、阅读、引用和最终任务的不同指标 |

## 与已有知识体系的关系

- [Agent 长程推理与工具调用](../agent-reasoning/README.md)：模型如何决定何时调用搜索工具，并管理跨轮状态。
- [统一检索术语](../../glossary/information-retrieval.md)：可直接跳转到倒排索引、BM25、Dense、RRF 等独立定义。
- [个人知识库](https://suchenl.github.io/knowledge/)：专题位于“大模型与强化学习 / 信息检索与知识系统”，不是论文解读的附属章节。

## 核心参考资料与更新边界

- Manning、Raghavan、Schütze：[Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/)（经典基础体系）。
- [ripgrep 官方 FAQ](https://ripgrep.dev/docs/faq/)；[Elasticsearch Ranking and Reranking](https://www.elastic.co/docs/solutions/search/ranking)。
- [SPLADE v2](https://arxiv.org/abs/2109.10086)；[ColBERT](https://arxiv.org/abs/2004.12832)；[Faiss 官方文档](https://faiss.ai/)。
- [Azure Hybrid Search 文档](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)。

算法与索引结构的基本原理较稳定；具体模型 checkpoint、硬件效率与各平台默认参数会变化。本文不宣称这些方法在所有数据集上存在固定的性能排序。
