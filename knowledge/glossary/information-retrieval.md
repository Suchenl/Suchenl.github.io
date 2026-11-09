---
title: "文本检索术语：grep、BM25、Dense 与 Hybrid"
contentType: glossary
domains: ["大模型与强化学习/信息检索与知识系统"]
summaryZh: "检索基础术语的唯一速查入口：词项、倒排索引、TF-IDF、BM25、Sparse/Dense Retrieval、ANN、ColBERT、Hybrid 与 RRF。"
aliases: ["Information Retrieval Glossary", "IR", "BM25", "TF-IDF", "Inverted Index", "HNSW", "RRF"]
---

# 文本检索术语

本词典收录的是可复用的技术定义；完整推导、实例和使用条件见[文本检索专题](../topics/text-retrieval/README.md)。

## grep / ripgrep

**定义**：按行查找与字符串或正则模式匹配的文本工具；**不是**文档相关性排序模型。grep 的 -F 是固定字符串搜索，-E 是扩展正则；rg 是为递归目录搜索与代码场景优化的工具。

**不等于**：BM25、Embedding、可持久化的文档索引。

## Tokenization / Analyzer

**定义**：把文本规范化并切分为可索引的词项的过程；常包括分词、大小写规范化、停用词和同义词处理。中文分词、缩写与字符 n-gram 会影响 BM25 的词项重合。

**不等于**：LLM 一定使用的生成式 Tokenizer；检索 Analyzer 与生成模型 Tokenizer 可不同。

## Inverted Index（倒排索引）

**定义**：从词项映射到包含它的文档 ID 集合或 Posting List，可保存词频和位置，用于候选检索、布尔运算、短语及 BM25 排序。

**不等于**：BM25 排序函数；也不能与向量索引中的 IVF 简单等同。

## TF-IDF

**定义**：用文档内词频和跨文档稀有度构造词项权重的经典表示/排序方法，有多种规范化变体。

**不等于**：完整语义理解。

## Okapi BM25

**定义**：基于 TF 饱和、IDF 与文档长度归一化的经典词法相关性排序函数。通常与倒排索引结合。

**不等于**：向量 Embedding、短语严格匹配或某篇文档正确的概率。

## Sparse Retrieval / SPLADE

**定义**：使用高维稀疏词项权重进行检索。经典 TF-IDF/BM25 是词法统计方法；SPLADE 则学习稀疏词项权重和扩展，以连接词法与语义匹配。

**不等于**：所有 Sparse 都是 BM25，也不等于所有 Sparse 都无需模型训练。

## Dense Retrieval / Dual Encoder

**定义**：把 Query 和文档各编码为稠密向量，通过相似度搜索近邻。文档向量可以离线预计算。

**不等于**：Cross Encoder 联合评分；向量相似也不必然意味着事实相同。

## ANN / HNSW / IVF / PQ

**定义**：ANN 是近似最近邻搜索；HNSW 是图索引；IVF 通常以向量簇限制搜索范围；PQ 是向量压缩量化技术。它们处理向量检索的速度、内存和召回权衡。

**不等于**：文本嵌入模型本身。

## ColBERT / Late Interaction

**定义**：对 Query 和 Document 分别生成多组 token 表示，通常通过 MaxSim 做细粒度匹配。与单向量 Dense 的粒度不同，也与 Cross Encoder 的全面联合编码不同。

## Cross Encoder / Reranker

**定义**：联合输入 Query 和文档候选，做精细相关性判断的模型；通常对小规模候选集重排。

**不等于**：能自己检索所有未进入候选池的文档。

## Hybrid Search / RRF

**定义**：Hybrid Search 融合词法、稠密或其他检索器结果。RRF（Reciprocal Rank Fusion）按排名而非原始分数进行融合，避免将异尺度分数直接相加。

**不等于**：Hybrid 一定更准，或 RRF 已完成最终语义重排。

## Recall@K / MRR / nDCG

**定义**：Recall@K 衡量相关文档召回覆盖；MRR 主要关注第一篇相关文档的排名；nDCG 衡量带有排名折损的分级相关性。它们度量的目标不同。

**不等于**：Agent 最终任务正确率。

**来源**：[Stanford IR 教材](https://nlp.stanford.edu/IR-book/) · [ripgrep 文档](https://ripgrep.dev/docs/faq/) · [Elasticsearch Ranking](https://www.elastic.co/docs/solutions/search/ranking) · [Faiss](https://faiss.ai/) · [ColBERT](https://arxiv.org/abs/2004.12832)。
