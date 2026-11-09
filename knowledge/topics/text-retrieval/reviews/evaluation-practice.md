---
title: "文本检索如何评测：Recall、MRR、nDCG 与端到端质量"
contentType: review
domains: ["大模型与强化学习/信息检索与知识系统"]
summaryZh: "面向研究和工程对照，解释 Recall@K、Precision@K、MRR、nDCG、相关性标注、召回/重排的指标分工及延迟、内存和成本边界。"
aliases: ["Recall@K", "MRR", "nDCG", "Precision@K", "Retrieval Evaluation", "IR metrics"]
---

# 文本检索如何评测：Recall、MRR、nDCG 与端到端质量

## 一句话总结

**检索“召回了多少相关证据”、检索“相关证据排得多靠前”和 Agent“最终是否正确使用证据”是三个不同的评价问题；它们不能用一个 Top-K 指标相互代替。**

## 1. 首先建立 Query–Document 相关性标注

评测通常需要：一组真实查询、固定语料、文档或段落 ID，以及每个 Query 对应的 Relevant Documents（可二值，也可分等级）。

没有可信相关性标注，就不能把“BM25 返回了某文档”当成“该文档正确相关”的证据。

可借助人工标注、已有 Benchmark 标签或独立验证程序，但应记录标注是否不完整、不同查询是否来自相同任务以及信息泄漏风险。

## 2. 常见指标直观解释

| 指标 | 问题 | 适合看什么 |
| --- | --- | --- |
| Precision@K | Top-K 中有多少是相关结果？ | 上下文有限时的噪声 |
| Recall@K | 全部相关文档中，有多少进入 Top-K？ | 第一阶段召回充分性 |
| MRR@K | 第一篇相关文档出现得有多早？ | 找到至少一个答案来源的效率 |
| MAP | 各相关文档的排序整体表现如何？ | 多个二值相关文档的排序 |
| nDCG@K | 分等级相关性与排名衰减结合后表现如何？ | 高相关文档是否排在最前 |

例如：某查询恰好有四篇相关文档，Top-5 中命中两篇，则 Recall@5=2/4=0.5，Precision@5=2/5=0.4。

MRR 只看**第一篇相关结果的位置**，不要求多篇关键证据都被覆盖。因此多跳问答不能只用 MRR 判断是否找齐链条。

## 3. 两个公式

对查询 q：

$$
\operatorname{Recall@K}(q)=
\frac{|\operatorname{TopK}(q)\cap \operatorname{Relevant}(q)|}
{|\operatorname{Relevant}(q)|}
$$

相关文档总数为零时，需要明确评测协议对该查询是跳过、记零还是另行处理，不应默认分母合法。

$$
\operatorname{DCG@K}=
\sum_{i=1}^K\frac{2^{rel_i}-1}{\log_2(i+1)}
$$

$$
\operatorname{nDCG@K}=\frac{\operatorname{DCG@K}}{\operatorname{IDCG@K}}
$$

IDCG 是理想排序的 DCG。nDCG 适合分级相关性，但相关性标签本身的质量仍然决定指标的意义。

## 4. 为什么必须分别评估 Retrieve 与 Rerank？

假设第一阶段召回 100 个候选，正确答案文档根本不在其中。

即使 Reranker 能在候选之间完美排序，也不能找回它。

推荐记录：

| 阶段 | 指标 | 常见误解 |
| --- | --- | --- |
| 候选召回 | Recall@50 / 100 | 不代表最终 Top-5 的质量 |
| 融合/精排 | nDCG@10、MRR@10 | 不代表覆盖所有多跳证据 |
| 证据阅读 | 引用准确性、证据是否支持答案 | 有引用不等于引用正确 |
| Agent 最终任务 | Answer Accuracy / Task Success | 错误可能来自推理而不是检索 |
| 系统成本 | P50/P95 延迟、Tokens、内存、GPU、索引更新 | 单纯比较准确率不够 |

## 5. 可复现的最小对照实验

在同一个语料版本上，使用相同 Query、相关性集合和候选预算：

| 系统 | First-stage | Fusion | Rerank |
| --- | --- | --- | --- |
| A | BM25 | 无 | 无 |
| B | Dense + ANN | 无 | 无 |
| C | BM25 + Dense | RRF | 无 |
| D | BM25 + Dense | RRF | Cross Encoder |

比较 Recall@K、nDCG@K、P95 延迟、单位查询成本和最终回答表现。模型、索引版本、Chunking、Metadata Filtering 与 Query Rewrite 应记录清楚，不能在比较不同检索器时悄悄改变。

特别要区分：
- 检索算法的分数差异。
- ANN 索引近似误差（和 Exact KNN 对照）。
- 数据切块与查询改写造成的差异。
- 下游 Agent 自己的检索策略与回答错误。

## 6. 研究判断与边界

“BM25 不如 Dense”或“Hybrid 一定优于单路”都不是在任何数据集下成立的定理。准确结论应包含语料、Query 分布、相关性标签、模型、Top-K、延迟预算与统计不确定性。

基准可以用通用 IR 评测集，但应保留真实应用中的专有名词、代码符号、长文档、缩写、模糊提问和多证据查询，避免评测集对某个方法形成系统偏好。

继续：[Agent 与 RAG](agent-retrieval.md)。

**原始资料**：[Stanford IR 教材及 Evaluation 章节](https://nlp.stanford.edu/IR-book/) · [Faiss 官方文档](https://faiss.ai/) · [Azure Retrieval 指南](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-information-retrieval)。
