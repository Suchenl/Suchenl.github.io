---
title: "大模型预训练（Pretraining）：从数据工程到训练稳定性"
shortName: "LLM Pretraining"
aliases: ["预训练", "Pretraining", "Pretrain", "Tokenizer", "数据清洗", "数据配比", "Megatron", "Scaling Laws"]
summaryZh: "从零预训练和继续预训练的系统学习入口，重点包括数据质量、去重配比、Tokenization、分布式训练、算力预算、故障恢复、评测与复现。"
categories: ["大模型基础", "大模型基础/预训练"]
---

# 大模型预训练（Pretraining）

**建议开独立主题。** SFT/RL 解决的是已有基础模型如何跟随任务反馈更新；Pretraining 则处理**基础能力、数据分布、训练计算、优化稳定性**，是理解后训练边界的重要前提。

## 从这里开始

- [预训练实践地图：数据、Tokenizer、Scaling Laws、分布式训练与监控](reviews/pretraining-engineering-roadmap.md)——核心深度笔记，配实验清单与参考资料。
- [SFT 与 RL 的后训练路线](../llm-agent-training/README.md)——理解预训练与后训练的职责分界。
- [DeepSeek-R1](../../papers/2025/deepseek-r1.md)——区分强预训练 Base 与无推理 SFT 的 RL，不把 R1-Zero 误当从随机初始化训练。

## 推荐学习顺序

1. **数据**：来源、许可、清洗、去重、泄漏与采样配比。
2. **Tokenizer**：压缩率、词表、特殊 token、chat template 与兼容。
3. **基础训练目标**：next-token cross entropy、token/batch/step 关系。
4. **Scaling Laws 与预算**：小模型试验、验证集、token 与参数量权衡。
5. **分布式训练**：DP/FSDP、TP、PP、CP、MoE EP、通信与故障恢复。
6. **预训练评价**：perplexity、held-out loss、领域能力、污染检查与稳定性。
7. **继续预训练（CPT）**：在现有 Base 上改变领域分布和知识能力，与 SFT 做受控比较。

原始参考起点： [ybq《大模型预训练经验》（知乎）](https://zhuanlan.zhihu.com/p/718354385)。它是**工程经验分享而不是规范或可复现实验报告**。本专题将个人建议与论文/官方训练框架证据分开。
