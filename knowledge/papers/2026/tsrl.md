---
comparison:
  objective: "持续训练 Agent 时按困难状态触发专家监督，保留旧技能"
  training: "RL 主干 + 基于组成功率的监督触发 + 随时间衰减监督强度"
  signal: "在线奖励和当前策略失败状态 + 额外可信专家演示"
  evidence: "作者在 ALFWorld、WebShop、Deep Search 报告旧任务能力最多多保持 9.6 个百分点"
  limitation: "需要困难状态专家，且低成功率可能来自验证器失误或工具不可用"
shortName: "TSRL"
title: "TSRL: Trigger-based Supervised Reinforcement Learning for Continual Agent Training"
year: 2026
categories: ["强化学习与 Agent/SFT 与 RL 协同"]
summaryZh: "在难状态触发专家监督以辅助强化学习"
status: untracked
---

# TSRL: Trigger-based Supervised Reinforcement Learning for Continual Agent Training

- **中文标题**：触发式 SFT + RL：只在 Agent 无法解决的困难状态使用专家监督
- **作者**：Yuqian Fu、Kaiwen Jiang、Zijun Song、Jiawei Wang、Yuanheng Zhu、Dongbin Zhao
- **首次公开**：2026-10-13
- **状态**：arXiv 预印本，尚不标为已接收会议
- **原始链接**：https://arxiv.org/abs/2610.17726
- **核验**：2026-10-19；查阅 arXiv HTML 方法及摘要

## 一句话解读

TSRL 是目前与“让 RL 为主、必要时再补 SFT”最直接相关的一项近期研究：**用 RL 维持当前策略的在线探索，在困难/失败状态触发局部监督，并随着训练进展逐步减少 SFT 强度。**

## 1. 为什么不是继续先 SFT 后 RL？

作者认为：若在所有专家样本上直接 SFT，模型可能覆盖基座已经形成的其他行为模式，产生严重遗忘；纯 RL 又缺少高效注入全新技能的途径。传统先 SFT 后 RL 即使能修复部分能力，也可能已经在前一阶段损坏了原有分布。

## 2. 触发与优化机制

每个状态从当前策略采样多个响应，计算 Group Success Rate（组成功比例）。当它低于预设阈值时，说明当前策略难以解决问题，才启用相应专家演示的交叉熵监督。否则以 RL 优化为主。论文还使用逐步降低监督强度的时间退火，避免训练后期持续把策略拉向教师模式。

数学直觉：设 `I_hard(s)` 表示触发标志，则可以将训练思想写成 `L ≈ L_RL + λ_t I_hard(s) L_SFT`。这是对概念的压缩解释；具体组成功率阈值、批次与优化器实现以论文原文为准。

## 3. 理论与实验

作者通过先验分布 Fisher 信息矩阵的局部二次近似，建立遗忘与 Fisher 加权参数偏移的联系，说明有选择地减少监督更新可降低相关上界。此结论依赖局部假设，**不等于任意深度网络、任意训练超参下严格不会遗忘**。

作者在 ALFWorld、WebShop、Deep Search 的 Agent 基准和多个 4B、7B、32B 模型上试验，报告在持续学习场景较 SFT→RL 基线最多保留 **9.6 个百分点**的先前任务能力，同时保持/提升新任务效果。这是作者实验，非机器人通用结论。

## 4. ORA 启发和批判性问题

最吸引人的不是设一个复杂触发器，而是**不用在完整机器人轨迹里盲目插入每一次工具调用监督**。如果当前策略能判断任务状态并选择工具，就让 RL 继续；若它连基本动作协议或接触操作也无法生成，才用真实示范纠正。

问题是 TSRL **仍需要在困难状态获得可信专家示范**，而现实机器人偏离轨迹后的专家动作未必已有；这恰好是 ORA 的限制。也不能只用 Group Success Rate 的数值决定是否“缺新知识”，因为错误奖励、工具不可用或环境噪声都可能让成功率很低。

## 5. 推荐对照

RL Only / SFT→RL / ReLIFT 定向 SFT / TSRL 触发 SFT；统一演示预算、RL Rollout、GPU-hours；同时测机器人成功率、旧技能保留、触发比例和教师调用成本。