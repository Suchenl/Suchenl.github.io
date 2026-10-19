---
title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"
year: 2025
categories: ["强化学习与 Agent/推理与后训练"]
summaryZh: "DeepSeek-R1 的直接强化学习、冷启动与推理能力"
status: untracked
---

# DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning

- **中文主题**：R1-Zero 与 R1：Direct RL 的力量和冷启动的必要性
- **作者**：DeepSeek-AI 团队
- **首次公开 / 发表时间**：2025-01
- **发表状态**：官方技术报告 / arXiv
- **原始来源**：[论文或官方页面](https://arxiv.org/abs/2501.12948) · [代码/模型/其他官方资源](https://github.com/deepseek-ai/DeepSeek-R1)
- **标签**：RLVR / GRPO / 冷启动 / 推理 / 语言可读性
- **原文核验**：2026-10-19；核验范围：原文/官方摘要（方法及实验中的进一步细节需查原论文表格）

## 问题
长思维链能力是否一定需要人手编写完整的推理过程作为 SFT 目标？

## 对比路线
**R1-Zero**：预训练 Base 直接进入强化学习，没有额外的先行推理 SFT；在可验证问题上显著发展了长链推理行为。**R1**：使用高质量冷启动数据，然后继续 RL，并通过后续监督与对齐改善综合质量。两者证明“先做多少 SFT”不是逻辑必需条件，但对可读性、稳定性和任务边界有实际影响。

## 关键区别
RL 中的“答案对”来自可验证评分，不需要强教师解释每一个中间推理步骤；但 R1-Zero 出现重复、语言混用和阅读困难，说明结果成功未必包含所有人类期望的行为质量。

## 为什么与 ORA 有关
空间/时间等客观可验证问题可先测 Direct RLVR；机器人执行工具 schema、坐标单位、动作控制协议可以通过小量监督冷启动。机器人没有数学题那样便宜的仿真成功验证，所以不能直接复刻 R1-Zero 成功结论。

## 批判性分析
“从 Base 直接 RL”不是“完全从零学习”。Base 早已有丰富的文字、数学与动作先验；对初始正确率接近零的长程物理控制，奖励稀疏问题仍严重。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。
