---
title: "Agent 与 RAG 的检索：搜索策略、证据利用和奖励的边界"
contentType: review
domains: ["大模型与强化学习/信息检索与知识系统", "大模型与强化学习/推理与 Agent 系统"]
summaryZh: "把搜索工具、Query 规划、检索器、证据读取与最终任务成功放在同一流程中，解释为何覆盖标注证据和使用证据不是同一个指标。"
aliases: ["Search Agent", "RAG", "Agent Retrieval", "Evidence Coverage", "Tool-use Search"]
---

# Agent 与 RAG 的检索：搜索策略、证据利用和奖励的边界

## 一句话总结

**Retriever 负责给定 Query 后找相关材料；Agent 还必须决定搜索什么、何时修改查询、哪些证据可信、何时停止并如何利用结果。一个检索器的高 Recall，并不自动等于 Agent 的任务成功。**

## 1. 谁负责什么？

~~~text
用户目标 / 问题
    ↓
Agent 选择搜索意图、范围、Query
    ↓
Search Tool：BM25 / Dense / Hybrid / Web Search
    ↓
返回 Top-K 文档、Snippet、DocID、来源
    ↓
Agent 阅读、筛选、提出新查询、验证
    ├─ 不足：再次搜索
    └─ 足够：使用证据形成答案
    ↓
最终答案 + 可追溯引用
~~~

当某个 Agent 说“我要搜索更多”，这是**策略决策**；BM25 根据 Query 返回 Top-K 文档，是**检索工具内部的相关性计算**。不要把两者混成一个算法。

## 2. 一个易错的例子

问题：某项技术是哪篇论文首次提出的？

- Step 1：Agent 搜索宽泛关键词，返回 5 篇综述。
- Step 2：搜索技术缩写，找到原始论文。
- Step 3：又检索多个转载页面。
- Step 4：把后续论文误认为首发论文，回答错误。

从检索器角度看，Step 2 已经成功取回了关键证据；从 Agent 角度看，任务仍然失败。

因此要分开：
- **Document Retrieval / Coverage**：是否拿到了证据？
- **Evidence Selection / Grounding**：是否识别了真正支持结论的证据？
- **Reasoning / Answering**：是否正确使用证据？
- **Task Outcome**：最终任务是否满足要求？

## 3. 与 Group-relative RL 的联系

当多个尝试都失败时，二值 Outcome Reward 无法给出组内差异。可以用 Retrieval Coverage、搜索效率或 Rubric Score 作为更多的过程参考，但这些参考不自动是真正的 Progress。

例如“首次检索到 Gold Document”是一个可观察事件，却不必然等于真正推动最终正确答案的因果动作。若要识别动作对最终回报的影响，更有力的证据往往需要明确可复现的环境状态与 Counterfactual Continuation，而不只是 Judge 读取轨迹后解释。

## 4. 为 Search Agent 选择检索器的实验矩阵

| 变量 | 控制方式 | 衡量对象 |
| --- | --- | --- |
| 检索器 | 固定策略，比较 BM25 / Dense / Hybrid | Retriever 的变化 |
| Agent 策略 | 固定 Retriever，比较 Query Rewrite、预算、停止条件 | 搜索决策的变化 |
| 阅读方式 | 固定候选，比较 Snippet 长度、扩展上下文、重排 | 证据使用的变化 |
| 训练奖励 | 固定任务和预算，比较 Outcome 与 Process 评价 | 对后续学习的影响 |

把变量一次性全部打开，很难知道最终性能变化来自哪里。

## 5. 长上下文与证据选择

检索结果不应该无条件全部塞进上下文。相关文档很长时，需要同时权衡：
- 召回是否遗漏关键证据；
- 相似文档是否重复；
- Snippet 是否截断关键限定条件；
- 原始引用、时间、版本与文档来源是否保留；
- Token、工具调用数和延迟是否可控。

要特别警惕“找到了文档”被错误解释为“知道了答案”，或者把生成的查询扩展文本当成真实证据。

## 6. 建议的学习顺序

先理解 [grep 与倒排索引](grep-and-index.md)，再看 [BM25](lexical-bm25.md) 和 [神经检索](neural-retrieval.md)，最后用 [评测与选型](evaluation-practice.md) 做受控比较。有关工具调用和跨轮状态，回到 [Agent 长程推理与工具调用](../../agent-reasoning/README.md)。

**参考**：[Stanford IR 教材](https://nlp.stanford.edu/IR-book/) · [Microsoft RAG 技术综述](https://www.microsoft.com/en-us/microsoft-cloud/blog/2025/02/04/common-retrieval-augmented-generation-rag-techniques-explained/) · [Elasticsearch Ranking](https://www.elastic.co/docs/solutions/search/ranking)。
