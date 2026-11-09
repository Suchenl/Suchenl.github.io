---
title: "Hybrid Search 与 Reranking：如何组合不同检索器"
contentType: review
domains: ["大模型与强化学习/信息检索与知识系统"]
summaryZh: "解释多路候选召回、BM25 与 Dense 结果融合、RRF 公式、Cross Encoder 重排序、Query Rewrite、Chunking 和上下文组装。"
aliases: ["Hybrid Search", "Reciprocal Rank Fusion", "RRF", "Reranking", "Two-stage Retrieval", "Query Rewriting"]
---

# Hybrid Search 与 Reranking：如何组合不同检索器

## 一句话总结

**Hybrid Search 的核心不是“选 BM25 还是 Embedding”，而是让互补的检索器各自寻找候选，再做融合与精排。Retrieval 负责找得到，Reranking 负责把相关结果排到更前；两者都不能直接保证最终答案正确。**

## 1. 一条常见的现代检索流水线

~~~text
用户 Query
   ├─ Query Parsing / Rewrite（可选）
   ├─ 词法召回：BM25 + 倒排索引 ────┐
   └─ 语义召回：Embedding + ANN ───┤
                                   ↓
                      候选合并、去重、过滤
                                   ↓
                      RRF / 加权分数融合
                                   ↓
                       Cross Encoder Rerank
                                   ↓
                    Chunk / Metadata / Citation
                                   ↓
                           Agent 或 RAG 读取
~~~

检索器、融合器、重排器和最终阅读器各有职责。比如 BM25 找到作者名、项目名等精确词项，Dense 找到表达不同但语义接近的段落。

## 2. 为什么不能直接把 BM25 分数加上余弦相似度？

BM25 的数值依赖词项统计、查询词和语料，余弦相似度的尺度则来自向量模型。直接相加会让数值较大的一边支配结果，未必体现实际相关性。

可以先校准或归一化分数，也可以只合并排名。后者的经典方法就是 **RRF（Reciprocal Rank Fusion）**：

$$
\operatorname{RRF}(d)=\sum_{r\in\mathcal R}\frac{1}{c+\operatorname{rank}_r(d)}
$$

其中 \(\mathcal R\) 为检索结果列表集合；未在某一列表中出现的文档不贡献该列表的分数，c 常用 60 作为起点（不是对所有场景都最优）。

例如 BM25 对 D1 排第 1，Dense 排第 3；D2 在 BM25 排第 4、Dense 排第 1：

$$
\operatorname{RRF}(D1)=\frac1{61}+\frac1{63}
$$

$$
\operatorname{RRF}(D2)=\frac1{64}+\frac1{61}
$$

D1 因两路排序综合略领先。RRF 不需要 BM25 分数与向量相似度处于同一数值尺度。

## 3. Reranker 会做什么？

假设初次召回 50 个候选段落。Cross Encoder 将 Query 与各候选联合编码，给候选重新排序，最终保留 Top-5 或 Top-10。

它可能改善**候选内的排序**，但如果关键证据从未进入候选池，Reranker 无法凭空恢复。

因此要分别测量：

- **Recall@50**：候选阶段是否召回足够多的相关文档。
- **nDCG@10 / MRR@10**：最终相关文档排在什么位置。
- **端到端回答质量**：模型是否真的利用证据完成任务。

## 4. Query Rewrite、Expansion、HyDE 处在哪一层？

这些主要属于**查询构造策略**，不是与 BM25/HNSW 平级的检索评分算法。

- **Rewrite**：把口语问题改写为更适合检索的表达。
- **Multi-query**：生成多个不同说法，并融合结果。
- **Expansion**：加入同义词、缩写或技术术语。
- **HyDE**：先生成假设文档式文本，用其表示去找相近文档；假设文本不是真实证据。

扩大查询覆盖面也可能带来噪声、误召回和额外延迟。尤其在科研问题上，自动扩展不能把生成文本视为事实。

## 5. Chunking 影响什么？

一个文档如果超过模型编码窗口，需要切成块。但块的大小、重叠长度、标题与父文档 ID 保留方式，都影响召回和后续证据使用。

- 太小：丢上下文，术语与限定条件被拆开。
- 太大：主题混杂，稠密向量压缩可能模糊精确信息。
- 只返回块：可能丢失原文出处。
- 只返回摘要：可能丢失用于验证结论的原始句子。

可考虑 Child-Chunk Retrieval + Parent-Section Expansion：先检索更短的段落，再把上一级上下文呈现给阅读器，但必须评估 Token 成本与答案收益。

## 6. 不要盲目堆系统组件

“BM25 + Dense + SPLADE + ColBERT + Cross Encoder + LLM Judge”并不自动得到最佳效果。更长的流水线可能使延迟、显存、索引维护、分数校准和错误传播更加复杂。

一个合理的基线顺序是：

1. 先固定语料、Query 和相关性标注，建立 BM25 与 Dense 单独基线。
2. 测量 Union Recall，再尝试 RRF。
3. 只有当候选 Recall 充足但 Top-K 排序不理想时，优先测试 Reranker。
4. 结合端到端答案表现、P95 延迟、Token 和成本选择是否保留组件。

继续：[评测与选型](evaluation-practice.md) · [Agent 与 RAG](agent-retrieval.md)。

**原始资料**：[Elasticsearch Ranking and Reranking](https://www.elastic.co/docs/solutions/search/ranking) · [Azure Hybrid Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview) · [Microsoft RRF 说明](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-information-retrieval)。
