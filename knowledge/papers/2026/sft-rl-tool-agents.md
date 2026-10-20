---
shortName: "SFT vs RL · Tool Calling"
aliases: ["Tool-Calling SFT/RL","SFT or RL for Tool-Calling Agents"]
comparison:
  objective: "工具调用中分离数据集、规模与 SFT/GRPO 配方影响"
  training: "Qwen3 0.6B–32B 六档；LoRA-SFT、GRPO、SFT 后 GRPO"
  signal: "标注函数调用监督 versus 可验证函数调用奖励"
  evidence: "域内 SFT 在 15/18 条件最好；跨数据集 GRPO 在 29/54 条件最好，平均仅领先 SFT 不到 1 个百分点"
  limitation: "以结构化函数调用表现为主，不能替代端到端环境成功与机器人恢复评测"
title: "SFT or RL for Tool-Calling Agents? A Controlled Study Across Data, Method, and Scale"
year: 2026
categories: ["强化学习与 Agent/工具与训练框架"]
summaryZh: "工具调用 Agent 中 SFT 与 RL 的受控比较"
status: untracked
---

# SFT or RL for Tool-Calling Agents? A Controlled Study Across Data, Method, and Scale

- **中文主题**：工具 Agent：SFT 与 GRPO 在匹配数据条件下谁更强
- **作者**：Md Tahmid Rahman Laskar、Xue-Yong Fu、Shashi Bhushan TN
- **首次公开 / 发表时间**：2026-09-15
- **发表状态**：arXiv 预印本；截至核验未将其标为正式录用
- **原始来源**：[论文或官方页面](https://arxiv.org/abs/2609.17848)
- **标签**：Tool Calling / GRPO / SFT / LoRA / 受控对照
- **原文核验**：2026-10-19；核验范围：原文/官方摘要（方法及实验中的进一步细节需查原论文表格）

## 为什么最值得读
此前许多工作各自展示“RL 工具调用提升了”，但使用了不同基座、数据和训练预算，无法说明 RL 本身优于 SFT。此文统一比较三种训练方法：LoRA-SFT、Direct GRPO、SFT→GRPO。

## 细节
六个 Qwen3 规模（0.6B–32B），数据包括 xLAM/APIGen、ToolACE、Glaive-FC-v2 及其混合；作者统一 Prompt、去重并评估分布内与跨数据集泛化。SFT→GRPO 把训练集分成不重叠的两半，减少数据重用带来的比较混淆。

## 主要发现（论文报告）
分布内的 18 个模型×数据条件里，SFT 获得 **15/18** 最佳；跨数据集的 54 个条件中，GRPO 获得 **29/54** 最佳，但对 SFT 的平均领先不到 **1 个百分点**。SFT→GRPO 少有稳定最优。**数据集混合**对跨域表现特别重要，说明方法选择与数据多样性一样关键。作者还报告 LoRA 相对全参微调更有利于保留基座已有工具行为。

## 批判性分析
它主要评测可结构化评分的函数调用，而不是需要多次物理交互的长程 Agent。不能把 Exact-Match 调用准确率直接等价于真实任务成功；先后两个阶段数据各半也不同于“全部 SFT 后 RL 全数据复用”的训练配方。

## ORA 启发
必须保留匹配数据、算力、工具定义的 SFT 基线，不要假设加 GRPO 必然提升。甚至更应优先审计工具调用数据是否合理、多样、非脚本依赖。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。


## 研究设计究竟控制了什么？

作者在六档 Qwen3、不同工具调用训练数据和方法之间进行系统对照。15/18 与 29/54 的分母分别是实验条件数，而不是任务完成率或统计独立的随机实验数量。

| 维度 | 已公开结论 | 尚不能仅凭摘要判断 |
|---|---|---|
| 训练配方 | LoRA-SFT 在域内 15/18 条件最好 | 各方法是否严格匹配 GPU-hours、rollout token 和调参预算 |
| 数据来源 | 数据混合提高跨数据集迁移稳健性 | 收益中多少来自多样化数据，而非优化算法 |
| 泛化 | GRPO 在跨数据集 29/54 条件最好，平均领先 SFT 不足 1 个百分点 | 是否意味着所有多轮工具调用/异常恢复任务都更好 |
| 模型适配 | 作者报告 LoRA 相对全参更新更好保留预训练工具能力 | 是否可迁移到机器人动作 token 与视觉输入 |

**潜在隐藏混杂**：若 GRPO 消耗更多生成/验证成本，SFT 和 RL 之间的性能差不能直接解释为算法效率差；如果数据混合改变训练支持集，更不能把数据覆盖带来的改善归给 RL。

## 更强的反证实验建议（非作者已做）

同一个模型、同一个工具目录和相同测试任务，比 A：SFT；B：GRPO；C：SFT→GRPO；D：混合数据 SFT；E：C 加真实工具执行反馈。分别报告 JSON 合法率、函数名和参数正确率、执行成功率、失败后恢复率、最终任务成功率及 GPU-hours。

**反例**：如果 D 在真正任务完成率上不低于 E，且更便宜，就不能说为该任务采用 RL 是必需的；如果 E 主要提高失败恢复，就应区分新状态覆盖与算法本身的收益。

来源：[arXiv 2609.17848 官方摘要](https://arxiv.org/abs/2609.17848)。作者报告的 15/18 与 29/54 仅说明指定条件下的获胜频次，不能充当一般化胜率。
