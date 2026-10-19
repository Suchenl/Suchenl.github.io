---
title: "DAPO: An Open-Source LLM Reinforcement Learning System at Scale"
year: 2025
categories: ["强化学习与 Agent/强化学习算法"]
summaryZh: "DAPO 的长思维链强化学习工程优化方法"
status: untracked
---

# DAPO: An Open-Source LLM Reinforcement Learning System at Scale

- **中文主题**：从 GRPO 实际训练瓶颈出发的高效 RL 配方
- **作者**：Qiying Yu、Zheng Zhang 等
- **首次公开 / 发表时间**：2025-03；后续 NeurIPS 2025
- **发表状态**：NeurIPS 2025 论文，官方代码/数据/模型公开
- **原始来源**：[论文或官方页面](https://arxiv.org/abs/2503.14476) · [代码/模型/其他官方资源](https://github.com/BytedTsinghua-SIA/DAPO)
- **标签**：RLVR / Clip-Higher / 动态采样 / 长思维链
- **原文核验**：2026-10-19；核验范围：原文/官方摘要（方法及实验中的进一步细节需查原论文表格）

## 问题
即使有准确可验证奖励，朴素大规模 GRPO 也可能遇到熵塌缩、全错或全对组浪费采样、长文本更新不稳定和超长截断惩罚误伤有效推理。

## 四个核心机制
**Clip-Higher**：放宽比率裁剪的上边界以改善探索空间压缩问题。**Dynamic Sampling**：过滤全错或全对等无相对奖励差异的组，增加有效组的比例。**Token-Level Policy Gradient Loss**：减少长回答相对短回答的梯度尺度失衡。**Overlong Reward Shaping**：避免简单把截断的潜在正确推理当成同样严重错误。

## 实验结论
官方在 Qwen2.5-32B Base 和数学任务上报告 AIME 2024 得分约 50，且代码、训练记录、数据可取得。单一基准的结果不能外推到有昂贵仿真与多轮观察的机器人 Agent。

## 对 ORA
比复制全功能算法更重要的是实际记录：有效组率、采样长度、KL/熵、奖励方差、rollout wall-time、环境失败与模型失败分离。若 Base 在目标任务的成功概率太低，Dynamic Sampling 只会反复采样，无法凭空解决探索问题。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。
