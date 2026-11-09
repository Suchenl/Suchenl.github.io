---
title: "神经文本检索：Dense、SPLADE、ColBERT 与 Cross Encoder"
contentType: review
domains: ["大模型与强化学习/信息检索与知识系统"]
summaryZh: "分类理解单向量 Dense Retrieval、学习式 Sparse Retrieval、ColBERT 多向量后期交互与 Cross Encoder 精排；解释训练目标、索引方法和语义/精确性边界。"
aliases: ["Dense Retrieval", "DPR", "SPLADE", "ColBERT", "Late Interaction", "Cross Encoder", "HNSW", "Faiss"]
---

# 神经文本检索：Dense、SPLADE、ColBERT 与 Cross Encoder

## 一句话总结

**“神经检索”不是单一算法，而是一组表示与匹配方式：单向量 Dense 把文本压缩成一个向量，SPLADE 预测稀疏词项权重，ColBERT 为每个 token 保留上下文向量，而 Cross Encoder 对查询与候选联合编码、通常用于精排。**

## 1. 为什么需要词法检索以外的方法？

同一个语义可能写成：

- Query：如何根据图像反馈控制机械臂？
- Document：Image-based closed-loop manipulation using camera observations.

基本 BM25 依靠词项重合。如果语言、缩写、同义词不相同，召回容易受损。神经表示学习尝试让语义接近的查询和文档在表示空间内接近。

但语义“看起来很像”并不保证事实精确。例如两个不同的机器人型号、不同的失败条件，单向量编码可能区分不足。

## 2. Dense Retrieval：Dual Encoder

常见做法是两个编码过程（可以共享参数）：

$$
\mathbf q=f_\theta(q), \qquad \mathbf d=g_\theta(d)
$$

然后计算：

$$
s(q,d)=\mathbf q^\top\mathbf d
$$

若向量做 L2 归一化，点积等价于余弦相似度。

训练通常利用相关 Query–Document 正样本与难负样本，将正例的分数推高。一个典型对比学习目标是：

$$
\mathcal L=-\log\frac{\exp(s(q,d^+)/T)}
{\exp(s(q,d^+)/T)+\sum_j\exp(s(q,d^-_j)/T)}
$$

T 为温度，负样本选择会影响模型具体学到什么。检索模型不是只凭“语义通顺”就自动可靠，训练数据和任务定义同样重要。

### 单向量为什么高效？

可以离线预计算全部文档的向量；查询时只编码 Query，再使用 KNN 或 ANN 检索近邻。

但压缩为一个固定长度向量可能丢失词位置、精确数字、否定以及多个独立事实之间的差异。长文档通常还需要 Chunking。

## 3. 近邻索引：Flat、HNSW、IVF、PQ 到底是什么？

这几个词经常与 Dense Model 并列，但其实属于**如何搜索向量库**，不是如何把文本变成语义向量。

| 方法 | 核心作用 | 典型权衡 |
| --- | --- | --- |
| Flat / Exact KNN | 与全部向量直接比较 | 精确，规模大时搜索较贵 |
| HNSW | 多层近邻图中导航 | 低延迟，额外图索引占内存 |
| IVF | 向量先分簇，查询时只访问部分簇 | 搜索速度与漏召回的权衡 |
| PQ | 将向量分块量化、压缩存储 | 节省内存，近似计算可能失真 |
| IVF-PQ | 候选分簇 + 向量压缩 | 适合内存预算受限的大规模场景 |

注意：IR 中“词项倒排索引”与 Faiss 里的 IVF（Inverted File for vector cells）不能直接当成一个东西。前者以**词项**组织 Posting，后者通常以**向量簇**组织候选。

## 4. Sparse Neural Retrieval：SPLADE

传统 BM25 的权重主要来自词频与文档频率统计。SPLADE 让模型学习“哪些词项应该有权重，以及是否该扩展出原文未显式出现的词”。

可把 Query 和 Document 表示为词表维度上的稀疏向量：

$$
\mathbf z_q,\mathbf z_d\in\mathbb R^{|V|},\quad
s(q,d)=\mathbf z_q^\top\mathbf z_d
$$

大部分维度为 0，因此可使用与词项相关的高效稀疏索引。

直观上，SPLADE 同时保留“可索引的词项结构”与学习式词扩展。它不是将所有文本都转换成普通稠密向量，也不等于原样 BM25。

## 5. ColBERT：Late Interaction

Dense 的单向量方法将整个段落压缩成一个向量，ColBERT 则保留 Query 和 Document 中每个 token 的上下文向量。

典型 MaxSim 评分可写成：

$$
s(q,d)=\sum_{i\in q}\max_{j\in d}\langle \mathbf q_i,\mathbf d_j\rangle
$$

也就是对每个 Query token，找到 Document 中最匹配的 token，然后汇总。

与 Cross Encoder 不同，ColBERT 可预先编码文档 token 向量，因此具有候选检索与较细粒度匹配的可能。不过多向量存储和高效索引更复杂。

ColBERTv2 进一步通过压缩和训练改进来缓解存储开销。

## 6. Cross Encoder：为什么常用于 Rerank？

Cross Encoder 把 Query 与一个候选文档一起输入编码器，允许二者 token 在模型内部直接交互，然后输出相关性分数：

$$
s(q,d)=h_\phi([q;d])
$$

它能做细致的 Query–Document 交互，但对大量文档逐个运行非常昂贵，也很难像 Dual Encoder 一样预计算独立文档向量。因此通常用于候选集精排。

LLM Reranker 也可以对候选进行点式打分或成对比较，但其吞吐、成本、位置偏差和校准需要单独评价。

## 7. 四种架构对照

| 架构 | 文档表示 | 交互时机 | 候选检索 | 主要成本 |
| --- | --- | --- | --- | --- |
| Dense Dual Encoder | 单向量 | 向量相似度 | KNN / ANN | 向量索引、编码与召回误差 |
| SPLADE | 高维稀疏词项向量 | 稀疏点积 | 稀疏/倒排检索 | 模型编码、稀疏索引规模 |
| ColBERT | Token 多向量 | Late Interaction / MaxSim | 专门的多向量检索 | 向量存储与 token 级匹配 |
| Cross Encoder | Query–Document 联合表示 | 深度联合交互 | 多作为 Rerank，不负责全库初筛 | 每个候选都要跑模型 |

## 8. 该怎么理解“语义检索更先进”？

不能把方法按年份排序就当成普适强弱排名：

- 精确的文档 ID、API 名、模型型号常更适合词法检索。
- 同义改写、跨表达方式问答可能更需要语义表示。
- 具体 Query 分布、语料范围、Embedding 训练域和上下文预算决定实际收益。
- Dense 与 SPLADE/ColBERT 不是简单的“旧技术→新技术”替代关系。

下一步：[Hybrid Search 与 Reranking](hybrid-reranking.md)。

**原始依据**：[DPR](https://arxiv.org/abs/2004.04906) · [SPLADE v2](https://arxiv.org/abs/2109.10086) · [ColBERT](https://arxiv.org/abs/2004.12832) · [ColBERTv2](https://arxiv.org/abs/2112.01488) · [Faiss](https://faiss.ai/) · [Faiss Indexes](https://github.com/facebookresearch/faiss/wiki/Faiss-indexes)。
