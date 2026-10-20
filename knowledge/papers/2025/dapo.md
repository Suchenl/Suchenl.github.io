---
comparison:
  objective: "在可验证数学推理中提高 RL 的有效探索和长链训练稳定性"
  training: "Clip-Higher、Dynamic Sampling、Token-Level PG Loss、Overlong Reward Shaping 四项配方"
  signal: "答案正确性规则奖励 + 组相对优势；更新前的无效组需额外生成和过滤"
  evidence: "作者官方项目在 Qwen2.5-32B Base / AIME 2024 报告约 50 分，并公布训练配方与资源"
  limitation: "被过滤组和额外采样仍计入 GPU-hours；数学规则验证不自动迁移真实 Agent"
shortName: "DAPO"
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

1. **Clip-Higher**：放宽重要性比裁剪上界，缓解正优势动作更新被过早限制的探索问题；也可能增加更新幅度与方差，并非越高越好。
2. **Dynamic Sampling**：对于常见二元奖励与组内相对优势，将全对/全错组从训练更新中排除，增加保留组的有效信号比例；不保证以固定生成预算也能提高效率。
3. **Token-Level Policy Gradient Loss**：按当前更新中所有有效输出 token 归一化，而非先平均每条回复再对回复求平均。两者对不同长度回复的**相对权重**不同。
4. **Overlong Reward Shaping**：处理因长度上限截断造成的错误惩罚信号；不能替代正确性验证。

### Token-level loss 的精确直觉

记第 $i$ 条回复有效长度 $T_i$、每 token 损失 $\ell_{it}$。省略 PPO 裁剪和优势估计的简化示意为：

$
L_{\mathrm{sample}}=\frac1B\sum_{i=1}^B\frac1{T_i}\sum_{t=1}^{T_i}\ell_{it},
\qquad
L_{\mathrm{token}}=\frac{\sum_i\sum_{t=1}^{T_i}\ell_{it}}{\sum_iT_i}.
$

前者给予每条回复相同的总权重；后者让较长回复在总 token 损失中占更多份额。这既能改善特定长 CoT 训练问题，也会改变训练分布，不能将其描述为不影响目标的“纯工程优化”。

### 被过滤的样本也花了计算

报告 Dynamic Sampling 的效率时需要记录生成/验证的**全部**尝试、拒绝组数、最终保留组、总生成 token 与 GPU-hours，而不是仅看被保留样本的数量。若 Base 几乎不能答对，过滤无效组可能意味着大量无用的反复采样。

## 实验结论
[DAPO 官方项目页](https://dapo-sia.github.io/)报告 Qwen2.5-32B Base 在 AIME 2024 的约 50 分结果，公开 DAPO-Math-17k、验证器、训练脚本、模型等，并写明公开训练使用 128 张 H20 GPU。单一基准的结果不能外推到有昂贵仿真与多轮观察的机器人 Agent。

## 对 ORA
比复制全功能算法更重要的是实际记录：有效组率、采样长度、KL/熵、奖励方差、rollout wall-time、环境失败与模型失败分离。若 Base 在目标任务的成功概率太低，Dynamic Sampling 只会反复采样，无法凭空解决探索问题。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。
