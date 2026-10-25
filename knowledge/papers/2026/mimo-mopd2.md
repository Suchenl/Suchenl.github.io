---
shortName: "MiMo-V2.6"
aliases: ["MOPD2", "MiMo-V2.6-Pro-RL", "Groupwise Agentic Grading", "Multi-Harness Training"]
title: "MiMo-V2.6: Scaling Reinforcement Learning Towards Self-Improvement"
year: 2026
categories: ["强化学习与 Agent/后训练", "强化学习与 Agent/蒸馏与能力融合", "强化学习与 Agent/工具与训练框架"]
summaryZh: "完整解读 MiMo-V2.6 的混合 Agentic RL：多环境与多 Harness、GRS/GAR 组内评分、长轨迹训练基础设施、MOPD2 蒸馏及证据边界。"
status: untracked
rating: 0
authors: ["Xiaomi LLM-Core Team"]
venue: "2026 官方技术报告 / arXiv 预印本"
tags: ["Agentic RL", "GRPO", "GRS", "GAR", "Multi-Harness", "MOPD2", "长时 Agent", "奖励设计"]
links:
  arxiv: "https://arxiv.org/abs/2610.11959"
  pdf: "https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL/blob/main/MiMo_V2_6_technical_report.pdf"
  code: "https://github.com/XiaomiMiMo/verl"
  project: "https://mimo.mi.com/docs/en-US/news/latest/v2-6"
---

# MiMo-V2.6: Scaling Reinforcement Learning Towards Self-Improvement

> **文献状态**：Xiaomi LLM-Core Team，2026 年官方技术报告 / arXiv 预印本，非独立同行评审的会议接收结论。**本次核验：2026-10-25**。核验来源为 [技术报告及权重](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL/blob/main/MiMo_V2_6_technical_report.pdf)、[arXiv](https://arxiv.org/abs/2610.11959)、[官方发布说明](https://mimo.mi.com/docs/en-US/news/latest/v2-6)；技术报告页所列具体表格/公式以 PDF 当前版本为准。本文图为根据工作机制**重新绘制的可编辑 SVG**，不是论文原图。定量结果均为作者报告，未经独立复测。

## 一、一句话结论：这篇工作的研究价值是什么？

MiMo-V2.6 真正值得研究的，不只是万亿参数的规模，而是**如何将可交互环境、可验证反馈、多种 Agent Harness 和大规模 RL 训练组织为一套能够持续改善模型行为的体系**。

传统预训练主要学习既有数据中的知识与行为模式；这篇报告强调，让模型在长链路任务中真正尝试工具调用、执行与验证，再用完成结果和轨迹质量更新策略。

作者把路线描述为面向 **Recursive Self-Improvement（RSI）** 的探索，但这并不表示模型已经可以完全自主地重写、重新训练自己。更准确地说，它在**人工设计的环境、验证器、训练系统与评分器**下，通过迭代 Agentic RL 改进任务表现。

核心扩展有三个维度：更大训练计算量、更丰富的交互环境、更精细的 Grader 计算量。它们互相制约：采样再多，环境不可验证就学不到可信信号；环境再丰富，奖励不区分好坏，也容易学出冗长的成功路径。

![Agentic RL 从训练计算、环境规模和 Grader 三个维度扩展](/research/figures/mimo-v2-6/scaling.svg)

> **关键问题**：同一道题的两条轨迹都通过测试，但一条只改必要代码、十轮结束，另一条绕了很久才勉强通过。传统的二元成功奖励凭什么偏好前者？这是 Groupwise Agentic Grading 要解决的问题。

## 二、模型本身：架构和算力规模

两个主要模型都是支持文本、视觉、视频、音频输入的稀疏 MoE 架构。下面保留报告 Table 1 的关键量级：

| 参数 | MiMo-V2.6-Flash | MiMo-V2.6-Pro |
|---|---:|---:|
| 总参数 | 310B | 1.02T |
| 激活参数 | 15B | 42B |
| Transformer 层数 | 48 | 70 |
| SWA / Global Attention 层数 | 39 / 9 | 60 / 10 |
| 隐藏维度 | 4096 | 6144 |
| 专家数量 | 256 | 384 |
| 每 Token 激活专家 | 8 | 8 |
| SWA 窗口 | 128 | 128 |
| 最终上下文 | 1M Token | 1M Token |

### 2.1 Hybrid-SWA + MoE 为什么适合长时 Agent？

- **SWA（Sliding Window Attention）**以局部窗口注意力降低大部分层的长上下文代价。
- **GA（Global Attention）**提供周期性的跨窗口信息整合，所以「窗口 128」不代表整个模型只能记住最近 128 个 Token。
- **MoE**使用少量激活专家提供较大的总容量，减少每 Token 的稠密计算需求。

长时 Agent 的一次任务可能包含工具输出、终端日志、图片及数百轮中间状态。如果每层都完整全局注意力，运行成本很容易成为训练瓶颈。

### 2.2 多模态编码与推测解码

视觉侧使用 MiMo-ViT（约 681M 参数），结合局部与全局注意力，利用行优先、列优先的 Token 排列改善二维信息交互。音频使用编码器和离散量化表征并接入共享主干。

作者还设计了受 DFlash 启发的推测解码器：轻量 Drafter 约 5 层，一次提出后续约 7 个 Token，再交由主模型验证。它优化的是**生成吞吐与延迟**，不等于换了一种 RL 目标。

需要区分：**具备视觉输入能力，不自动意味着具备可靠的三维感知或物理控制能力**；后者必须由具身任务独立验证。

## 三、训练路线：RL 之前到底做了什么？

![预训练、中期训练、SFT、Mixed RL、MOPD2 五阶段训练路径](/research/figures/mimo-v2-6/training-stages.svg)

| 阶段 | 主要作用 | 不能误解为 |
|---|---|---|
| Pre-training | 大规模文本与多模态知识/表示学习 | 单纯工具使用训练 |
| Mid-training | 加入 Agent 轨迹、交互数据、长上下文训练 | 只增加常识语料 |
| Short SFT | 提供稳定的初始工具调用与任务策略 | 完全跳过模仿学习 |
| Mixed Agentic RL | 多任务、多 Harness、GRPO、细粒度评分 | 只做数学题 RL |
| MOPD2 | 多教师在线策略蒸馏与能力融合 | 继续只做二元奖励 RL |

报告披露 Flash 文本阶段约 **26T**、多模态阶段约 **22T** Token；Pro 分别约 **27T** 和 **3T** Token。总预训练 Token 数 Flash 反而更多，因此最后的性能差异不能简单归因于“Pro 看到了更多 Token”。

Mid-training 的意义在于扩大后续 RL 能够搜索的策略空间。完全没有工具调用或多轮执行能力的模型，直接去高难环境做稀疏结果奖励，通常很难探索到成功行为。该阶段还涉及上下文扩展到 1M、优化器调整以及 MXFP4 量化感知训练。

**重要结论**：作者展示的是 **Pretraining → Agent-centric Mid-training → SFT → RL → Distillation** 的整体配方；不能由这篇论文推出“完全不需要 SFT”。

## 四、一轮 Agentic RL 究竟怎样运行？

最直观的规模关系是：

| 项目 | 规模 |
|---|---:|
| 每次更新的 Prompt 数 | 1,568 |
| 每 Prompt 的 Rollout 数 | 16 |
| 每次更新的总轨迹 | 25,088 |
| 每次更新训练 Token | 约 2.7–3.7B |
| 训练可支持上下文 | 最高 1M Token |

一次 **Rollout 是一整条 Agent 执行序列**，不等于模型只回答一次。以软件工程任务为例，一条 Rollout 可以包括读取仓库、定位问题、修改源代码、执行测试、分析失败并重试。

![1,568 个任务各采样 16 条长时轨迹，经 Verifier 和 Grader 评分后做 GRPO 更新](/research/figures/mimo-v2-6/rollout.svg)

### 4.1 GRPO 的基本直觉

对于同一个 Prompt，采样多个结果，按组内表现得到相对优势，再更新策略。为了说明直觉，可以先写一个简化形式：

$$
A_i = R_i - \bar R
$$

这里 $R_i$ 是某条轨迹的奖励、$\bar R$ 是同组平均奖励。实际训练还处理 Importance Sampling、Clip、离策略样本、Mask 等问题，不能把这条教学公式当作完整的实现细节。

作者还采用 **Prompt-mean Loss Aggregation**，防止长轨迹仅仅因为生成 Token 多就不合理地主导训练目标。

### 4.2 报告中的 RL 规模与趋势

| 设置 | Flash | Pro |
|---|---:|---:|
| RL 更新轮数 | 30 | 30 |
| 报告运行时长 | 81.8 h | 123.1 h |
| RL 计算成本（作者估计） | 约 $0.9M | 约 $2.6M |
| DeepSWE v1.1 初始 | 48.7 | 58.4 |
| DeepSWE v1.1 结束 | 65.7 | 72.6 |

![Flash 和 Pro 在 DeepSWE v1.1 上 RL 前后的作者报告分数](/research/figures/mimo-v2-6/deep-swe.svg)

这些成本只覆盖报告讨论的 RL 运行，不是从零训练整个模型的总成本。它们说明**固定模型规模之后，交互式 RL 仍能明显改进任务表现**，但不同训练阶段或不同 Benchmark 口径不能混用。

## 五、环境设计：不只是把 Benchmark 搬进训练集

这是容易被忽略但非常重要的一环：**能否可信地定义任务和验证器，本身决定 RL 的训练上限。**

| 环境类型 | 任务示例 | 主要验证思路 |
|---|---|---|
| Code Agent | 修复真实仓库 Issue、实现功能、修改项目 | 独立可执行测试 + 测试质量审计 |
| General Agent | 跨文件、数据库、办公工具完成工作流 | 规则校验、状态检查与模型评分 |
| Visual Agent | 网站、SVG、PPT、游戏、3D 场景、Figma 等 | 功能与审美 Rubric、参考图相似度 |
| Cyber Agent | 定向复现软件漏洞 | 漏洞类型、崩溃位置等确定性条件 |

### 5.1 为什么“测试通过”还不够？

测试可能错误放行（False Positive），也可能将实际上满足需求的补丁误判为失败（False Negative）。作者会让 Coding Agent 多次执行任务，再由 Auditing Agent 检查问题描述、补丁和测试结果之间是否真正一致；对具有参考补丁的任务，还会多次重复测试以发现不稳定性。

通用任务采用可重置的软件环境，便于大量并行执行。代价是模拟环境未必覆盖在线真实系统全部复杂状态。

### 5.2 Reward Hacking：模型为什么可能越学越会钻空子？

假设要求模型修复旧版本 Bug，它直接检索到未来版本补丁，复制进去并通过测试。环境给了成功奖励，但模型没真正学会分析问题。

因此作者需要清理可能泄漏答案的 Git 历史、缓存与残留；隔离网络；使用 Hack Agent 主动寻找可利用漏洞；发现作弊时将轨迹奖励置零。

报告中的**已识别** Reward Hacking 比例低于 2%，这并不代表未知作弊概率等于零，也不证明 Verifier 完全可靠。

## 六、核心创新：Groupwise Agentic Grading

对应报告 §4.3。需要将 **结果奖励** 与 **成功轨迹之间的质量差异**分开理解。

| 轨迹 | Binary Reward | 实际表现 |
|---|---:|---|
| A | 1 | 完成任务，修改精准、步骤精简 |
| B | 1 | 也完成任务，但反复试错、改动粗糙 |
| C | 0 | 任务失败 |

如果只使用 $R_A=R_B=1$、$R_C=0$，模型可以学会成功比失败好，却没有足够信号理解为什么 A 比 B 更好。

![Groupwise Grader 对多个成功轨迹进行质量比较，然后重分配 Advantage](/research/figures/mimo-v2-6/grading.svg)

### 6.1 GRS：Groupwise Reward Synthesis

**先离线整理评价标准，再在在线 RL 中评分。**

对同一任务收集多条轨迹，让 Grader 总结：

- **Solution Rubric**：最终方案质量（正确性、边界情况、是否引入无关修改）。
- **Behavior Rubric**：执行过程质量（是否查验证据、是否测试、有没有无效或危险操作）。

报告给出的核心组合形式是：

$$
R_i = R_i^{test}\cdot S_i^{sol}\cdot S_i^{beh}
$$

例如测试通过，Solution 评分为 0.9、Behavior 评分为 0.8，组合奖励就是 0.72；失败轨迹不会因为过程看似优雅就自动得到成功奖励。

GRS 尤其适合已经拥有较多成功轨迹、可以归纳有辨识度 Rubric 的任务。

### 6.2 GAR：Groupwise Advantage Redistribution

GAR 则在**当前采样组里直接比较**，不必先为所有题写完固定的质量 Rubric。

最核心的动作不是给所有通过测试的样本随意加分，而是**把成功轨迹的正向 Advantage 重新分配**：更优成功轨迹获得更多学习权重，较差成功轨迹获得更少。

设 $P$ 是成功轨迹集合、$f_i$ 是 Grader 给成功轨迹的相对质量因子，论文使用类似下式的归一化：

$$
\lambda = \frac{\sum_{j\in P} A_j}{\sum_{j\in P} f_j A_j}
$$

$$
A_i' =
\begin{cases}
\lambda f_i A_i,& i\in P,\\
A_i,& i\notin P.
\end{cases}
$$

实际实现还包括缩放和中心化等处理。为直观理解，可以取三个轨迹的初始优势：

$$
A_A=\tfrac13,\qquad A_B=\tfrac13,\qquad A_C=-\tfrac23.
$$

如果 A 的质量因子为 $1$、B 为 $0.5$，重新归一化后可得到 $A_A'=4/9$、$A_B'=2/9$、$A_C'=-2/3$。**这是教学性的数值例子，不是论文实验数据。**

### 6.3 GAR 到底验证了什么？

作者对 Flash 进行了 Code-only RL 对照。没有 GAR 时，轨迹的轮数和长度增长较快，部分成功解越来越冗长，且容易出现粗糙修改；加入 GAR 能在保持较稳定交互长度的同时继续改进表现。

但需要注意：GAR 主要是 **Sequence-level Advantage** 的再分配，并不等于精确计算每个工具动作的因果贡献。长时 Credit Assignment 没有因此完全解决。

## 七、训练效率：如何避免“越强越啰嗦”？

作者加入 Group-Relative Length Penalty，但其策略不是对所有任务设置同样的 Token 上限：

- 简单任务的成功率高时，可以比较成功轨迹长度，对明显冗长的轨迹扣分；
- 高难任务成功率还很低时，不能急着惩罚长探索，否则可能直接抑制发现成功方案；
- 对无效工具调用、格式错误、重复内容等，还使用 Segment-level Penalty 进行局部处理。

| 场景 | 轨迹 | 奖励设计倾向 |
|---|---|---|
| 简单任务 | 2K / 3K / 15K 都成功 | 更偏好简短、质量相当的解法 |
| 困难任务 | 60K / 120K，成功率极低 | 不能过早压缩探索空间 |
| 已熟练任务 | 大多数 Rollout 都成功 | 更强调质量、稳定性和执行代价 |

**这与真正的 Adaptive Reasoning 仍有区别。** 减少过长轨迹不等于模型学会判断“此时多思考一个 Token 究竟值不值”。若要证明固定延迟/计算预算下的生产率提升，还需要固定预算的严格对照。

## 八、Multi-Harness Training：学会任务，还是只学会框架？

同一软件工程任务可能在 Codex、Claude Code 或其他 Harness 中有不同的工具形式、上下文组织和自动流程。只在一个框架中训练，模型可能学到特定框架习惯，而不是真正通用的策略。

作者因此设计 **Mini-Harness**，将可控变化收敛在三个模块：

| 可变组件 | 承担的任务 |
|---|---|
| System Prompt | 规则与执行行为边界 |
| Tools | 工具可用能力及输入输出形式 |
| Context Management | 向模型展示哪些信息、如何组织历史 |

这里的核心不是用生产级 Harness 不断堆功能。作者指出，生产框架大量附加约束未必能通过任务最终奖励评估，多个机制耦合后也难以归因。

### 8.1 是否真的获得了跨框架泛化？

作者用四种 Mini-Harness 训练，再到未见过的 Codex、Claude Code、mini-swe-agent 上评估，报告三个未见 Harness 的平均 Pass@1 大约从 50% 提升到 66%。

另一个更便于后续研究参考的是 9B 模型实验：

| Benchmark（七种 Harness 平均） | 原始 9B | 蒸馏 SFT | Multi-Harness RL |
|---|---:|---:|---:|
| SWE-bench Verified | 53.1 | 62.3 | 65.7 |
| SWE-bench Pro | 27.5 | 44.4 | 46.5 |
| MiMo Code Bench mini | 15.3 | 53.1 | 59.0 |

结论应当精确表述为：**该训练配方得到的模型在若干未见 Harness 上表现改善。** 如果没有完整的同预算、同数据、最佳单 Harness 对照，就不能将全部提升唯一归因于“Harness 数量增加”。

## 九、RL 基础设施：长时 Agent 不只是更长的文本

作者将轨迹拆成四个层级：

![Sample、Sequence、Context、Segment 的层级组织](/research/figures/mimo-v2-6/trace-hierarchy.svg)

- **Sample**：一个训练 Prompt 及相关 Rollout。
- **Sequence**：一个完整 Agent Loop，包含环境生命周期。
- **Context**：对话分支、上下文和前缀复用的单位。
- **Segment**：一次生成、一次工具结果或一段消息；可指定 Loss Mask。

这使多分支工具使用、上下文恢复和训练投影拥有更清晰的表示。

### 9.1 Harness Pool

通过持久化 Worker/Actor 池承载大量并发 Agent Loop，不必每条轨迹都重新初始化全部 Harness 资源。

### 9.2 Payload Porter

分离控制平面的轻量调度信息和数据平面的重型轨迹数据。对于多模态 Agent，图像、长日志或上下文不应反复通过中心 Driver 整体搬运。

### 9.3 Sample Mixer

不同环境平均运行时长可相差数十倍。如果按“谁先跑完就收谁”的方式组合训练 Batch，最终可能被简单快速任务主导。

Sample Mixer 结合任务来源、运行时间和期望比例动态调度，避免复杂但慢的任务在训练中被系统性低采样。

### 9.4 Training–Inference Consistency

在 MoE 场景下，作者使用 **R3（Rollout Routing Replay）**复用采样时选中的专家路由，也保存 top-p 采样的候选集合，尽量让训练概率计算与实际 Rollout 一致。

另一个工程实验是 **Router Freezing**：发现 RL 训练中专家负载漂移后，冻结 Router 可缓解失衡，作者报告性能没有明显下降。

这些是针对其 MoE RL 系统的问题，不应无差别移植给稠密模型。

## 十、MOPD2：为什么大规模 RL 后还要蒸馏？

**MOPD2（Multi-Prefix Multi-Teacher On-Policy Distillation）**用于融合多个领域的专长，尤其处理难以提供统一、可靠结果奖励的任务。

两类重要的思路：

1. **Standard MOPD**：Student 自己执行轨迹，Teacher 在 Student 实际产生的前缀/输出上提供 Token-level 学习信号。
2. **Prefix-conditioned OPD**：从 Teacher 轨迹或 SFT 样本提取多个历史前缀，Student 从该前缀出发自己预测下一段，再由 Teacher 监督。公开模型卡进一步区分 Teacher-Prefix 和 SFT-Prefix 两种流。

这种 Prefix OPD 不是把教师完整轨迹全部当成唯一答案强制模仿：**历史状态可以由教师提供，下一步仍由 Student 当前策略生成。**

但它也不是纯环境奖励 RLVR：Teacher 的 Token 分布仍是重要训练信号，其可靠性与前缀分布偏移依然需要评估。

现有专题索引中的 MOPD2 内容已经合并进本卡，不再维护第二份狭窄解读。

## 十一、实验：成绩强，但不要只看排行榜

### 11.1 Pro 的作者报告结果

| Benchmark | MiMo-Pro | Claude Opus 5 | GPT-5.6 Sol |
|---|---:|---:|---:|
| DeepSWE v1.1 | 71.9 | 74.0 | 73.0 |
| ProgramBench | 26.5 | 37.0 | 25.0 |
| AutomationBench | 53.1 | 50.3 | 45.8 |
| Toolathlon-Verified | 76.9 | 80.6 | 74.9 |
| Terminal Bench 4.0 | 34.9 | 49.0 | 39.9 |
| OSWorld-Verified | 82.0 | 83.4 | 83.0 |
| ExploitBench | 47.9 | 70.0 | 78.5 |
| MiMo Visual Coding | 72.3 | 70.0 | 73.4 |

*以上是报告 Table 3 的当时模型及测试设置下的作者数据，不是实时排行榜；不同 Harness、采样、评测口径可能影响结论。*

在 Terminal Bench 和 ExploitBench 上仍存在明显差距，因此不能表述为所有 Agent 维度均领先。

### 11.2 公开的 9B 路线更适合研究验证

| Benchmark | Distill SFT | 进一步 RL |
|---|---:|---:|
| SWE-bench Verified | 61.1 | 66.2 |
| Terminal Bench 2.1 | 37.1 | 52.8 |
| MiMo Cyber Bench mini | 31.3 | 47.0 |
| MiMo Visual Coding mini | 64.0 | 72.4 |

![Distill-Qwen-9B 在 SFT 和 RL 后的四项指标比较](/research/figures/mimo-v2-6/distill-9b.svg)

作者报告 11 项评测均比蒸馏 SFT 初始化有所改善。但部分属于内部测试集，独立可复核程度不完全相同。

## 十二、开源到了什么程度？

| 资源 | 官方入口 | 需要注意 |
|---|---|---|
| MiMo-V2.6-Pro-RL | [Hugging Face 模型](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL) | 万亿参数运行成本高 |
| MiMo-V2.6-Distill-Qwen-9B | [Hugging Face 模型](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B) | 更适合作为中小规模训练初始化 |
| RL 任务环境与数据 | [MiMo-V2.6-RL-oss](https://huggingface.co/datasets/XiaomiMiMo/MiMo-V2.6-RL-oss) | 包含多类环境，但不等于内部全部数据 |
| RL 训练代码 | [XiaomiMiMo/verl](https://github.com/XiaomiMiMo/verl) | 需要按实际分支检查可执行配方 |
| Agent 框架 | [uni-agent](https://github.com/XiaomiMiMo/uni-agent) | 应分清训练网关和具体 Agent Loop 职责 |

官方披露了大量可验证任务环境和训练框架。由此可研究小模型版 Agentic RL，但**不能认为万亿参数模型的全部训练数据、计算资源与内部服务都已经一键可复现**。

## 十三、局限：哪些问题还没有被解决？

### 13.1 成功率提升与效率改善不是同一个结论

GAR、长度惩罚能够抑制部分低效路径，但总体 Mixed RL 中 Token 使用量仍可能增加。真正比较生产效率，需要固定 Token、工具调用次数或墙钟时间预算。

### 13.2 多 Harness 泛化仍然可能带有框架偏置

在未见框架上分数提高，不代表已经学到完全与工具定义、上下文顺序无关的通用策略。需要增加同预算单框架控制组和对模块变化的独立消融。

### 13.3 Verifier 和 Grader 都可能出现系统性误差

对于代码测试，最终成功相对容易验证；对于科学发现、开放式视觉创作和复杂长时系统，精确、廉价、可信的环境奖励仍非常困难。

### 13.4 长时 Credit Assignment 仍然粗糙

GAR 的优势重分配主要发生在轨迹级别。一个 Episode 内第几个工具调用真正导致成功，仍然是开放问题。

### 13.5 Tool-call Repetition 并未自然消失

小米后续 [工具调用重复问题报告](https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition) 显示，一些 Harness 内仍出现重复甚至无意义工具调用。作者利用专门 Teacher 和 MOPD 进行修复。它提示：**只优化任务最终通过率，即使带长度正则，也不保证学会什么时候停止或观察够了。**

## 十四、我的理解：这篇论文真正提供了什么启发？

我更愿意把它理解成**Agentic RL 的完整系统工程研究**，而不只是一个新的策略梯度技巧。

首先，它把环境、任务构造、Verifier、Grader 和 Harness 明确放进训练设计的核心，而不是把这些看成 RL 算法外的无关附件。

其次，它提出一个值得继续追问的问题：**模型究竟是在学解决任务，还是在学某个 Agent 框架里的固定操作习惯？** Multi-Harness 的实验给出初步证据，但机制因果归因还可以继续做得更严格。

再次，它说明“任务完成”不一定足以定义“值得学习的成功轨迹”。成功之后的行为质量、成本、可维护性和风险都可能影响最终的策略。

最后，关于自适应推理，我认为还值得进一步研究：在相同在线时长与 Token 预算下，模型能否通过学会分配思考与行动的机会，完成更多可靠任务？减少无用轨迹只是起点，不等于真正学会推理资源调度。这个思考是**个人研究判断**，不是 MiMo 已经证实的贡献。

## 十五、建议阅读顺序与进一步问题

如果希望真正理解核心贡献，可以按 **§4.2.5 Multi-Harness → §4.3 Groupwise Grading → §5.3 跨 Harness 实验 → §6 Agent RL Infrastructure → §5.6 MOPD2** 的顺序精读。模型参数与常规 Benchmark 排名可以放在第二轮。

阅读结束后，我更关心以下问题：

- 同样通过测试的轨迹，应该怎样定义“更好”？质量、风险、代价能否拥有彼此独立的证据？
- 如果 Harness 本身改变了模型所见的信息，如何设计公平的多 Harness 训练与测试？
- 什么情况下应该奖励更短执行，什么情况下又应该允许模型继续探索？
- Sequence-level Reward、Segment-level Penalty 与真正逐决策 Credit Assignment 之间有多大差距？
- 当 Grader 也由模型承担时，如何防止质量偏见或 Reward Hacking 被不断放大？

> **结论**：MiMo-V2.6 证明大规模可交互任务与可验证反馈是一条有效的能力扩展路线；它没有证明 Harness 选择、长时决策成本分配和通用可验证奖励已经被完全解决。这些恰恰是值得后续研究的部分。

**原始参考**：[MiMo-V2.6 技术报告 PDF](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL/blob/main/MiMo_V2_6_technical_report.pdf) · [arXiv](https://arxiv.org/abs/2610.11959) · [官方技术说明](https://mimo.mi.com/docs/en-US/news/latest/v2-6) · [工具调用重复诊断](https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition)
