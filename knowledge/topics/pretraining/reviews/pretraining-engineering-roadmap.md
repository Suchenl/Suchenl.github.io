---
contentType: review
domains: ["大模型与强化学习/预训练与模型架构"]
title: "预训练工程完整路线：数据、算力、Tokenizer、稳定性和研究问题"
shortName: "Pretraining Roadmap"
aliases: ["Pretrain", "LLM Pretraining", "Tokenizer", "CPT", "Continue Pretraining", "FineWeb", "Megatron Core", "Scaling Laws", "Data Mixture", "Chinchilla"]
summaryZh: "从数据治理、采样配比到分布式训练和可复现评测，区分经验文章与官方技术报告；包含可执行的小规模学习计划和关键反证问题。"
categories: ["大模型基础", "大模型基础/预训练"]
---

# 预训练工程完整路线

> **2026-10-20 学习笔记**。本文是对公开材料的独立结构化解读，不是转载或翻译原文章，也不意味着已经训练过下面的模型。参考的 [ybq《大模型预训练经验》](https://zhuanlan.zhihu.com/p/718354385) 是工程方法论材料，其中的比例、阈值与经验判断需要独立验证；技术细节以模型官方报告、数据项目和训练框架为准。

## 1. Pretraining 与 SFT/RL 有什么区别？

| 阶段 | 初始化与输入 | 主要优化目标 | 适合回答的研究问题 |
|---|---|---|---|
| 从零预训练 | 随机权重、大规模通用/领域 token | 自回归 next-token 预测损失 | 语言/世界知识、表征、代码等基础能力如何形成 |
| 继续预训练（CPT） | 现有 Base、更多指定领域语料 | 通常仍是 next-token 预测 | 如何补领域知识而尽量不忘原有能力 |
| SFT | 现有模型、经过筛选的任务演示 | 给定目标回答/动作的监督似然 | 如何跟随指令、工具格式、任务演示 |
| RL / 偏好优化 | 现有模型、奖励/偏好/可验证结果 | 策略相对奖励或偏好目标 | 如何探索更好推理路径与实际行为 |

若 token 序列为 $x_{1:T}$，典型 Decoder-only 预训练目标：

$$
L_{\mathrm{PT}}(\theta)=-\frac1T\sum_{t=1}^{T}\log p_\theta(x_t\mid x_{<t}).
$$

**关键边界**：Base 中已有的潜在能力很重要，但“预训练决定全部能力上限、后训练只能 unlock”不是严格定理。后训练也可能通过额外数据学到新知识/技能；能力变化依赖数据、模型和评测，不能仅凭 slogan 判断。

## 2. 原参考文章最值得保留的工程意识

作者 **ybq** 的[知乎原文](https://zhuanlan.zhihu.com/p/718354385)按背景、数据、训练各阶段讨论工程陷阱。值得学习的是**完整流水线意识**，不是直接照搬每一个数值配比：

| 经验主题 | 可保留的工程原则 | 容易误用之处 |
|---|---|---|
| 数据获取与合规 | 数据可用性、许可、版本、PDF/网页解析质量影响可训 token | “网上可以抓到”不代表有合法使用和发布权 |
| 数据清洗 | 混合启发式规则 + 质量打分，抽查**被过滤掉**的文档 | 无差别移除英文、代码、LaTeX、Markdown 容易误删重要能力数据 |
| 数据去重 | 相同/近重复污染会改变有效数据量，需按任务评测 | 固定一个 MinHash 阈值绝非全部数据集的最优解 |
| 数据配比 | 语言、代码、数学、STEM 和领域数据分桶独立采样 | 文章举出的“中:英:代码 = 4:4:2”是经验场景，不是通用最优配置 |
| 数据顺序 | Curriculum 和后期数据上采样可能改变能力与遗忘 | “好知识先学”缺少具体可操作的难度定义；顺序需消融 |
| 预处理 | 尽量离线 tokenization / packing，数据加载不能长期拖慢 GPU | 也需处理 shard 随机种子、断点恢复和确定性 |
| Checkpoint | 将优化器、随机状态、数据位置、权重状态一起保存 | 只保存模型权重，恢复后不等于从原点继续训练 |
| 小规模 Pilot | 先用小模型检验 loss、数据配比和系统瓶颈 | 小模型 loss 最好不保证大模型最终 benchmark 最优 |

来源说明：以上是对经验文章的**独立归纳和批判性补充**，不是对原文章所有主张的实证认同。

## 3. 数据：不要把“总 token 数”当作全部质量

可用的一条完整链路：

~~~text
来源/许可 → 解析 → PII 与安全处理 → 文档分类 →
质量过滤 → 近重复/跨集合去重 → 训练/验证污染检查 →
分桶与采样权重 → Tokenization → Packing/Shard →
Manifest（数据版本与抽样日志） → GPU 训练
~~~

**要分别追踪**：原始文档数量、原始字节、可用文档、有效 token、重复率、每个领域实际送入训练的 token、重复暴露次数。混合时还要存下随机种子和每个 shard 的哈希/版本。

**一个重要反例**：以“越多去重越干净”为唯一原则不可靠。[FineWeb 官方数据卡](https://huggingface.co/datasets/HuggingFaceFW/fineweb)记载了其 ablation：**每个 CommonCrawl dump 分开去重**，反而优于跨全部 dumps 一次性全局去重。这说明去重粒度是需要测的变量，不是越激进越好。

推荐了解 [DataTrove](https://github.com/huggingface/datatrove) 的质量处理、去重和数据管道；并针对语言/代码/数学各自定义过滤质量标准，而非使用一个全局 score。

## 4. Tokenizer：不仅是字节压缩

从 SentencePiece、BPE 或 byte-level BPE 开始：

- token 平均字符数/字节数和**不同语言/代码领域的压缩率**；
- 词表大小与 embedding、LM Head 的参数及输出投影计算；
- 数字、路径、标点、Unicode、CJK 与代码标识符的切分质量；
- FIM、工具标记、视觉 token、系统/用户角色、训练中的特殊 token；
- 训练/部署模型 tokenizer 不一致将导致 prompt 格式、模型嵌入和 decoder 错配。

**不要直接采纳**“将某业务词设为一个 token 就会显著提升能力”的结论：新 token 的 embedding 需要适应训练，词表变动还会影响现有切分和已学权重。只有在实际 tokenizer 分析与领域任务 benchmark 中才可判断是否值得。

入门动手：[karpathy/minbpe](https://github.com/karpathy/minbpe)。

## 5. Scaling Laws：参数数 N、数据 D、算力 C 怎么选？

简单的 Dense Transformer 训练主项粗估常写作：

$$
C_{\mathrm{train}}\approx 6ND.
$$

这里 $N$ 是模型参数数目、$D$ 是参与训练的 token 数；公式**省略注意力长序列开销、embedding、硬件利用率、优化器和 MoE 稀疏激活细节**，不能直接换算成 GPU-hours。

[Chinchilla / Hoffmann et al.](https://arxiv.org/abs/2203.15556)强调给定计算预算下，模型大小和训练 token 量需要联合优化，而非单纯加参数。它提出其拟合条件下的 compute-optimal 规律，**并非“所有部署场景都必须 N:D 固定”**：如果模型长期服务推理，最佳训练 token 量可能超出纯训练最优，因为小模型多训能降低推理成本。

**更有用的实践**：选 2–3 个小模型规模、2–3 档 token 预算，以及若干数据配比，拟合 held-out loss 并验证少量能力指标；再预测较大配置，不要直接按小模型单点 benchmark 排名选模型。

## 6. 分布式训练：每种并行到底拆了什么？

| 并行策略 | 拆解维度 | 主要解决的问题 |
|---|---|---|
| DP / DDP | Batch 维度 | 提高数据吞吐 |
| FSDP / ZeRO | 参数/梯度/优化器状态 | 降低每卡模型状态内存 |
| TP | 同一层的张量计算 | 单层放不下或算子要并行 |
| PP | Transformer 层 / Pipeline 阶段 | 非常深的模型 |
| CP / Sequence Parallel | 长序列中的序列维度（机制有别） | 长上下文激活内存、注意力相关瓶颈 |
| EP | MoE 专家 | 路由专家数量多、激活专家稀疏 |

官方参考：[NVIDIA Megatron Core 并行策略指南](https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html)。选择并行策略时，通信拓扑、激活重计算、模型结构和批次大小都不可省。

监控至少包括 **MFU、tokens/s/GPU、step time、最大 GPU Memory、梯度范数、loss spikes、padding/packing 效率、数据等待时间、checkpoint 恢复耗时**。仅汇报吞吐没有模型有效性结论。

## 7. 两个值得认真研读的实际预训练案例

### 7.1 Qwen3：数据配比与阶段切换

[Qwen3 官方技术介绍](https://qwenlm.github.io/zh/blog/qwen3/)报告约 **36T tokens**、覆盖 119 种语言/方言，三阶段分别强调：

1. **通用能力**：超过 30T token 的通用阶段（4K 上下文）。
2. **知识/推理与代码**：进一步增加 STEM、编程及合成推理数据的比例（约 5T）。
3. **长上下文能力**：高质量长上下文语料，扩展到 32K token。

此处有两个不同的**数据工程信号**：利用 Qwen2.5-VL 提取 PDF 文本并做文本精炼、利用专门模型生成数学/代码数据。由此可研究“数据来源变化”是否解释了能力增长，而不是把收益都归给新架构。

### 7.2 DeepSeek-V3：MoE 的计算与训练稳定性

[DeepSeek-V3 技术报告](https://arxiv.org/abs/2412.19437)报告 **671B 总参数、37B 每 token 激活参数、14.8T 训练 token**。核心研究点包括 MLA、DeepSeekMoE、auxiliary-loss-free load balancing、Multi-Token Prediction 和低精度训练的稳定性。

报告称完整训练消耗约 **2.788M H800 GPU-hours**，并且在其训练过程中没有无法恢复的 loss spike。这个数字**不是**“任意模型训练到同样能力只需要这些卡时”，也不意味着复制架构就能复制稳定性。应读其 optimizer、系统拓扑与 fault tolerance 细节，并在自己的实验中报告实际失败/恢复情况。

## 8. 预训练为什么会影响后训练？

- **奖励可验证性**：RL 可以改变给定 Base 的答案分布；若模型初始成功概率几乎为零，有限 rollout 难以发现成功样本。
- **数据分布**：预训练中过少的代码/工具 schema/视觉文本可能导致下游即使 SFT/RL 也很费监督数据。
- **长上下文**：训练长度、RoPE 扩展与真实 long-context 检索/行动性能不是同一回事。
- **继续预训练 vs SFT**：对于新术语和大量领域文献，CPT 往往是候选；对于格式与具体动作，SFT 或结果反馈可能更合适；需按任务设对照。

但也不能反过来说“预训练没见过的知识后训练不可能学会”——这不是现有模型的数学约束。

## 9. 建议的动手实验（不需要从零训练百亿模型）

**阶段 A：Data pilot。** 使用公开许可的数据子集做领域分类、质量打分与 MinHash，保留被过滤样例；比较三种清洗/去重策略的覆盖率和 held-out 变化。

**阶段 B：Tokenizer 评测。** 比较至少两套 tokenizer 在中英、代码、公式、文件路径上的 tokens/byte、长度分布和损失成本。**不需要**先训练巨模型。

**阶段 C：Tiny pretrain。** 使用小型 Decoder-only Transformer 做固定 token 预算的多种数据配比或顺序对照，记录 loss、吞吐、随机种子；确保能从 checkpoint 继续训练并重放数据顺序。

**阶段 D：CPT vs SFT。** 对同一个已公开 Base 和同一领域样本，在相同监督/计算口径下比较继续预训练、任务 SFT 与二者组合；测目标领域提升、旧能力保留和训练成本。

**停止准则**：若数据许可无法核对、验证集污染无法排除、训练指标记录缺失、checkpoint 无法恢复，先解决这些，不启动大规模预训练。

## 10. 参考资料与建议阅读路线

| 资料 | 先看什么 | 证据定位 |
|---|---|---|
| [ybq《大模型预训练经验》知乎原文](https://zhuanlan.zhihu.com/p/718354385) | 工程项目如何拆解：数据、配比、稳定性、资源 | **个人经验**，比例阈值不是统一基准 |
| [文章镜像（便于访问）](https://www.mlpod.com/papers/754) | 同一篇文章的公开转载 | 二次来源；以原文/授权为准 |
| [FineWeb Dataset Card](https://huggingface.co/datasets/HuggingFaceFW/fineweb) | CommonCrawl 数据清洗、去重消融 | 开放数据项目 |
| [DataTrove](https://github.com/huggingface/datatrove) | 实际数据处理流水线 | 开源工具实现 |
| [minbpe](https://github.com/karpathy/minbpe) | BPE 的可运行最小实现 | 教学代码 |
| [Chinchilla](https://arxiv.org/abs/2203.15556) | 计算最优模型与 token 预算 | 原始研究论文 |
| [Megatron Core](https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html) | TP/PP/CP/EP、优化器与并行部署 | 官方训练框架文档 |
| [Qwen3 官方说明](https://qwenlm.github.io/zh/blog/qwen3/) | 36T、分阶段预训练、PDF/合成数据 | 模型团队公开报告 |
| [DeepSeek-V3 报告](https://arxiv.org/abs/2412.19437) | MoE 训练、FP8、稳定性与 H800 GPU-hours | 原始技术报告 |

### 推荐的三份“真能照着代码学习”的参考

- **[FineWeb 原始 DataTrove 处理脚本](https://github.com/huggingface/datatrove/blob/main/examples/fineweb.py)**：能看到正文提取、语言及启发式质量过滤、PII 处理、逐 dump 的 MinHash 去重、抽样与中间数据输出。学习时不要直接处理完整 FineWeb；先改成一个小公开数据分片，核验删除/保留的样本。
- **[Megatron Core 官方 Quick Start](https://github.com/NVIDIA/Megatron-LM/blob/main/megatron/core/QuickStart.md)**：用小 GPU 设置走通并行 Transformer、最小训练迭代、分布式 Checkpoint 存取。它说明如何使用框架，不能视为复现了数十亿参数 LLM 的正式预训练。
- **[Megatron-LM 官方 Training Examples](https://github.com/NVIDIA/Megatron-LM/blob/main/docs/user-guide/training-examples.md)**：从 mock-data 的最小训练循环到多 GPU 架构配方。尤其区分**验证训练框架能跑**和**验证模型质量达到目标**这两类验收。

### 学完这一章以后，应该能自己回答

1. **数据**：同一组清洗规则在中英、代码、公式等不同领域如何改变保留率？如何检查数据漏删与测试污染？
2. **算力**：给定参数量、训练 token 数、吞吐量与有效 GPU 使用率，为什么训练预算估算不等于实际 GPU-hours？如何保存完整恢复所需状态？
3. **质量**：模型训练 loss 降了，为什么领域评测、异常恢复或长上下文性能仍可能退化？
4. **决策**：什么时候应先做 CPT，什么时候仅做 SFT 或 RL，而不是重新预训练一个 Base？

**自测问题**：为什么 aggressive dedup 可能比跨 dump 去重效果差？为什么 $6ND$ 不能直接得到某配置的真实训练 GPU-hours？在模型成功率很低时，如何判定问题源于缺预训练知识、缺 SFT 的任务演示，还是错误的 verifier？

---

**更新口径**：本章仅整理公开技术资料，不涉及任何私人仓库实现、未公开项目设置或私有实验。
