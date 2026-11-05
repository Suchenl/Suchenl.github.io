---
contentType: review
domains: ["大模型与强化学习/预训练与模型架构"]
title: "大模型预训练（Pretraining）：从数据工程到训练稳定性"
shortName: "LLM Pretraining"
aliases: ["预训练", "Pretraining", "Pretrain", "Tokenizer", "数据清洗", "数据配比", "Megatron", "Scaling Laws"]
summaryZh: "按数据治理、Tokenizer、训练目标、Scaling Laws、分布式并行、训练稳定性与评测组织预训练知识；延伸讨论连续数值表示与预训练和后训练的边界。"
categories: ["大模型基础", "大模型基础/预训练"]
readingOrder:
  - ref: topics/pretraining/reviews/pretraining-engineering-roadmap
    stage: "预训练全貌"
    why: "先建立数据清洗、Tokenization、训练并行、预算和评测的工程主线。"
  - ref: research/do-tokenizers-preserve-numerical-continuity
    stage: "专题延伸"
    why: "沿 Tokenization 方向检查数值连续性的边界与相关研究，属于延伸问题而非预训练必修步骤。"
  - ref: research/how-general-agents-unify-discrete-language-and-continuous-numerical-prediction
    stage: "跨主题探索"
    why: "进一步思考离散语言输出与连续预测头的统一，属于开放研究而非确定结论。"
catalogTitleZh: "大模型预训练：数据到训练稳定性"
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

原始参考起点：[ybq《LLM训练-pretrain》（知乎原文）](https://zhuanlan.zhihu.com/p/718354385)；[作者授权转载（火山引擎开发者社区）](https://developer.volcengine.com/articles/7451506255211790348)。这篇资料聚焦数据、训练与评估工程的实践经验，**不是规范或完整可复现实验报告**。另外参考 [DataTrove / FineWeb 实现](https://github.com/huggingface/datatrove/blob/main/examples/fineweb.py) 与 [Megatron Core 示例](https://github.com/NVIDIA/Megatron-LM/blob/main/docs/user-guide/training-examples.md)，逐项实践。本专题将个人建议与论文/官方训练框架证据分开。
