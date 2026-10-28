---
contentType: paper
domains: ["大模型与强化学习/后训练与策略优化", "机器人与具身智能/策略学习与控制"]
title: "Efficient Online Reinforcement Learning with Offline Data"
shortName: "RLPD"
aliases: ["Reinforcement Learning with Prior Data", "离线数据与在线RL混合训练", "Actor Critic 双缓冲"]
year: 2023
categories: ["强化学习与 Agent/后训练", "机器人与具身智能/强化学习与策略学习"]
summaryZh: "从鸡生蛋的 Actor–Critic 问题入手，逐步解读 RLPD 如何混合历史数据与在线交互、更新 Q 和策略，以及其在机器人和工具 Agent 上的适用边界。"
status: untracked
rating: 0
authors: ["Philip J. Ball", "Laura Smith", "Ilya Kostrikov", "Sergey Levine"]
venue: "ICML 2023 · PMLR 202:1577–1594"
tags: ["RLPD", "SAC", "Actor-Critic", "Off-policy RL", "Replay Buffer", "LayerNorm", "REDQ", "Sample Efficiency"]
links:
  arxiv: "https://arxiv.org/abs/2302.02948"
  pdf: "https://proceedings.mlr.press/v202/ball23a/ball23a.pdf"
  code: "https://github.com/ikostrikov/rlpd"
  project: "https://proceedings.mlr.press/v202/ball23a.html"
---

# RLPD：为什么 Actor 和 Critic 互相依赖，却还能从少量示范学会新技能？

> **论文事实来源**：Ball et al., ICML 2023, [PMLR 正式论文](https://proceedings.mlr.press/v202/ball23a.html) 与 [PDF](https://proceedings.mlr.press/v202/ball23a/ball23a.pdf)。本页的 RAM 插入案例是帮助理解的教学类比，RAM 成功率来自另篇 [HIL-SERL](/research/papers/2024/hil-serl/)，**不能冒充原始 RLPD 的实验**。核验：2026-10-28。

## 一句话理解

**RLPD = Reinforcement Learning with Prior Data**，不是“先把人类示范做成 BC 策略，再额外执行一次 RL”，而是把已有数据和在线交互共同送进一个 Off-policy Actor–Critic 学习过程。它的论文标题是 **Efficient Online Reinforcement Learning with Offline Data**，而不是 RLPD 的英文全称。

### 概念速查

| 术语 | 在做什么 | 常见误解 |
|---|---|---|
| MDP | 定义状态、动作、转移、奖励和折扣 | 有动作日志就能自动得到全部反事实转移 |
| Actor / Policy | 给定状态输出动作分布 | 只需模仿示范动作 |
| Critic / Q | 估计动作之后的长期折扣回报 | Q 是真实概率，或者一开始已经正确 |
| Bellman Backup | 用即时奖励和后继价值构造目标 | 完全独立于当前网络的准确监督 |
| Off-policy | 用其他行为策略产生的真实转移训练当前策略 | 任意离线轨迹都可不经处理直接推导未执行动作的后果 |
| SAC | 最大熵 Off-policy Actor–Critic | 和纯 BC 是同一损失 |
| Prior Data | 人类示范、旧策略、次优探索数据 | 必须都是成功专家数据 |
| Symmetric Sampling | 线上和历史池各抽 50% 构成 Batch | 给人类动作加权成固定 50% |
| LayerNorm / Critic Ensemble | 控制 Q 外推和高更新频率下的不稳定 | 证明 Q 一定正确 |
| UTD | 每个环境交互步对应的梯度更新次数 | 增大即可无成本提高效果 |

## 一、为什么有 Critic 还要 Actor？鸡与蛋究竟从哪里启动？

**你的直觉有一半完全正确**：若有已知的最优函数，确实可直接利用它选动作：

$$
\pi^*(s)=\arg\max_a Q^*(s,a).
$$

但真实机器人动作可以是连续的六维速度；每一步都在巨大空间求 argmax 不现实。Actor 学习把“寻找高 Q 的动作”摊销为一次前向生成：

$$
a\sim\pi_\theta(\cdot\mid s).
$$

Critic 则接收状态和动作，回答“执行这个动作，再按策略继续，会得到多高的回报？”：

$$
Q^\pi(s,a)=\mathbb E_\pi\left[\sum_{k=0}^\infty\gamma^k r_{t+k}\mid s_t=s,a_t=a\right].
$$

**两个网络是同时迭代、相互推动的，不存在先训练出完美 Critic 才允许 Actor 学习的前提。**

![Actor、Critic、真实环境和 Bellman 修正循环](/research/figures/rlpd/actor-critic-loop.svg)

*自绘教学图：蓝色 Actor 决策，橙色 Critic 估值，绿色环境给出实际反馈；虚线表示 Critic 的自举目标有估计误差。不是原论文图。*

真实环境给出新数据：$(s,a,r,s',d)$。**奖励和后继状态是真实反馈；下一状态的 Q 仍是网络估计**。这使 Bellman 更新可以改进 Critic，也解释了为什么会出现价值高估、错误自举乃至发散。

### Actor 永远不能超过 Critic 的能力吗？

需要区分三件事：

1. **单次优化**：Actor 主要沿着当前 Critic 给出的高分方向更新，因此局部更新受 Q 质量约束。
2. **真实执行**：Actor 做出新动作后实际成绩可以比 Critic 预测更好或更差；成功/失败都会产生新证据。探索有机会发现 Critic 先前低估的动作。
3. **整个训练**：Critic 根据新经验更新，Actor 根据新 Critic 再更新。因此初始 Critic 不构成最终表现的硬上限；但固定的、错误的 Critic 可能持续误导，**没有普适的必然改进保证**。

“Q 是概率”也只在特定简化条件下近似成立。例如仅在最终成功时给 $r=1$、失败 $0$、$\gamma=1$ 且没有额外奖励时，$Q$ 可解释为到达成功的概率；带折扣、时间成本、动作惩罚及熵正则时，**Q 是期望回报，不直接等于成功概率**。

## 二、RLPD 怎么把旧数据与在线数据统一到一起？

![两个 Replay Buffer 混合采样、Critic 和 Actor 联合更新](/research/figures/rlpd/mixed-batch.svg)

*自绘教学图：50:50 是每次抽取的样本来源比例，不是两份 Loss 各占 50%，也不是强制复制专家动作。*

以示例 Batch Size 256 为例，分别从历史数据池和在线数据池抽取 128 条实际 transition，拼成一个 Batch：

$$
\mathcal B=
\mathcal B_{\mathrm{prior}}\cup\mathcal B_{\mathrm{online}},
\qquad
|\mathcal B_{\mathrm{prior}}|=|\mathcal B_{\mathrm{online}}|.
$$

**更新 Critic 时**，示范/在线数据一视同仁地携带已执行动作 $a$、环境奖励 $r$ 和真实后继状态 $s'$。在简化的软 Actor–Critic 写法中：

$$
y=r+\gamma(1-d)\,\mathbb E_{a'\sim\pi_\theta}
[Q_{\bar\phi}(s',a')-\alpha\log\pi_\theta(a'|s')],
$$

$$
\mathcal L_Q=\mathbb E_{\mathcal B}[(Q_\phi(s,a)-y)^2].
$$

注意这是为了理解的**简化 SAC 目标**。实际 RLPD 使用 Critic ensemble 和随机子集中的保守最小值构造 Target，不应把单 Critic 公式误当作源码全部细节。

**更新 Actor 时**，从 Batch 中取状态 $s$，让**当前 Actor 自己**输出候选 $a_\theta$，再由 Critic 评分：

$$
\mathcal L_\pi=\mathbb E_{s\sim\mathcal B,\,a\sim\pi_\theta}
[\alpha\log\pi_\theta(a|s)-Q_\phi(s,a)].
$$

这不是“对专家动作做交叉熵”，更没有要求当前 Actor 的动作一定接近 Batch 里的 $a_{\mathrm{human}}$。历史示范通过其**环境后果和状态覆盖**影响价值估计；在线新数据补充新状态覆盖并纠正估计误差。

### 一条 RAM 插入轨迹如何贡献学习？

以下是假设性类比，不是 RLPD 原文任务：

| 状态 | 动作来源 | 行为 | 即时奖励 | 后续 |
|---|---|---|---:|---|
| 插槽对齐 | 人类示范 | 缓慢插入 | 0 | 最后成功 |
| 插槽卡住 | 当前 Actor | 继续下压 | 0 | 最后失败 |
| 插槽卡住 | 人类纠正 | 退出并重新对齐 | 0 | 后续成功 |
| 重新对齐 | 当前 Actor | 调整后插入 | 1 | 任务完成 |

**“退出”虽然暂时没有奖励，但如果后面通常能成功，Bellman Backup 会逐渐给它较高长期价值。** Critic 学的是哪种动作更有希望带来未来成功；Actor 再学会生成这样的动作。

但请区别：**人类接管同时写入两个 Buffer 是 HIL-SERL 的系统设计，不是原始 RLPD 论文自身要求的采集步骤。**

## 三、原始 RLPD 相比简单 SAC + 混合数据多做了什么？

原论文并不是只说一句“各抽一半”。它指出**朴素混合 SAC 会出现不稳定**，并逐项消融：

| 设计 | 具体做法 | 解决问题 |
|---|---|---|
| Symmetric Sampling（§4.1） | 每批 50% 历史数据、50% 在线数据 | 避免历史经验被大量新交互稀释 |
| Critic Layer Normalization（§4.2） | 在 Q 网络中使用 LayerNorm | 缓解对离线数据未覆盖动作的灾难性 Q 过高估计 |
| 高 UTD + Critic Ensemble（§4.3） | 多次梯度更新、多 Q 网络、随机子集最小值（REDQ 风格） | 更充分使用昂贵的环境数据，并抑制高频更新的不稳定 |
| 环境敏感的超参选择（§4.4） | 比较不同任务的奖励尺度、探索等设置 | 不能把一个固定训练配方套在所有环境 |

这里 LayerNorm 的作用是缓解**数值与泛化不稳定性**，不能把它解释成“让 Critic 拥有真实世界的正确判断”。Ensemble 也并不是多个不同的 Agent 互相辩论。

### 它需要先完成离线预训练吗？

**不需要是 RLPD 的核心特点之一。** 先验数据直接进入在线训练使用，不要求先把策略完全训练到 BC 或 Offline RL 收敛，再单独启动微调阶段。

原论文报告在一系列不同场景中，相比其比较对象取得约 **2.5×** 效率优势；这是原文实验的汇总数字，不能直接转述成真实机器人技能训练统一快 2.5 倍。参考 [ICML 原论文](https://proceedings.mlr.press/v202/ball23a.html)、[公开代码](https://github.com/ikostrikov/rlpd)。

## 四、它能不能直接训练带思考与工具调用的 VLM Agent？

**不能直接套上去，但能借鉴其“先验经验 + 在线经验 + 可验证环境反馈”的思路。**

首先要看动作空间是什么：

| 传统 RLPD/SAC | 工具型 VLM Agent |
|---|---|
| 状态通常是固定维度本体/图像表示 | 历史对话、图像、机器人状态、工具回执、计划、可选 CoT |
| 动作是连续向量 | 动作首先是**离散工具名、JSON 参数和文本 token**；物理执行参数还可能连续 |
| 单步 $Q(s,a)$ 容易用连续 MLP 表达 | 动作粒度可按 token、完整 tool call、物理 execution window 或完整 episode 定义 |
| 每步获得物理后继状态 | 工具调用有延迟、拒绝、异步回执；思考 token 不等于环境发生一步转移 |
| SAC 对连续策略可重参数化优化 | 自回归 VLM 的 token 策略常用 SFT / 序列级策略梯度 / PPO、GRPO 等方法，不能直接复用 SAC 公式 |

### 具体有哪几种研究路线？

**A. 最低成本：示范条件化/检索。** 把已验证成功的观测—动作轨迹作为 Agent 可引用的外部参考，不改 VLM 参数。先测试它能否在新观测下选择合理的工具与动作，而不是原样复读整段历史。

**B. 有真实模型可见轨迹时：SFT。** 如果拥有当时模型能看到的图像/状态/指令与当时确实执行的工具调用，可以监督其工具选择和参数。**只有机器人本体状态与连续动作的日志，无法自动还原模型当时的 CoT 或为何调用某个工具。** 不能凭空补造这些决策标签。

**C. 有闭环环境和可信奖励时：Agentic RL。** 对完整工具调用及执行回执进行在线 rollout，以真实任务成功、安全、调用成本和失败恢复定义训练信号。此时仍可混入先验成功数据，但模型的 token-level 优化器通常已不是原始 RLPD 的连续 SAC。

**D. 分层训练：更接近原始 RLPD。** 低层连续控制策略在明确的物理状态/动作接口上使用 RLPD；高层 VLM 决定技能调用、计划、恢复和工具选择。两层可以共享奖励信息，但时间尺度与可训练变量需严格区分。

### 不能忽略的数据真实性

一个离线示范记录了真实 $(s,a,s')$，却**没有记录**“若在同一 $s$ 选择另一个动作 $a^*$，会发生什么”。离线数据无法单独提供未执行动作的真实后继状态。假如工具执行遭到控制器拒绝、场景重置或运动未达目标，也不能把示范视频的下一帧冒充当前动作的结果。

对工具 Agent 的启发是**把示范、真实结果与模型训练可见输入绑定**，而不是把 RLPD 当成能够直接从动作日志重建思考过程的魔法配方。对更多 SFT / RL Agent 方法的讨论见 [Agent 后训练综述](/research/topics/llm-agent-training/reviews/sft-rl-co-training/)。

## 五、RLPD 的适用边界与值得研究的反例

1. **Q 错误会误导 Actor**：固定 Critic 的一次优化受其价值估计制约；但真实交互可以让 Critic 改正，因此不能说整个策略最终性能被初始 Critic 永久封顶。
2. **高 Q 不是高成功概率的同义词**：折扣、时间成本、动作罚项、熵正则与奖励尺度都会改变价值含义。
3. **演示数据不是越多越好**：状态覆盖、任务分布与在线环境是否一致非常重要。对本任务次优乃至误导性的先验数据，50:50 也可能有害。
4. **没有可信真实后继状态就不等于 Off-policy RL**：只有视频或单帧动作，不足以计算同一 MDP 的 Bellman 更新。
5. **跨任务和跨机器人并非默认成立**：需要可比较的状态、动作、奖励语义与数据许可。

## 相关阅读与学习路线

- **最直接的机器人应用**：[HIL-SERL 深度解读](/research/papers/2024/hil-serl/)：看人类纠正怎样进入两个 Buffer。
- **底层动作如何真实执行**：[机器人控制专题](/research/topics/robot-control/)：PD、阻抗、参考限幅与 wrench。
- **LLM 训练的替代优化器**：[SFT、RL 与工具 Agent 后训练](/research/topics/llm-agent-training/reviews/sft-rl-co-training/)。
- **原论文**：[Ball et al., ICML 2023](https://proceedings.mlr.press/v202/ball23a.html) · [PDF](https://proceedings.mlr.press/v202/ball23a/ball23a.pdf) · [GitHub](https://github.com/ikostrikov/rlpd)。

**最后一句话**：RLPD 的创新不是“把专家动作变成模型预测目标”，而是**用真实 transition 更新价值函数，让新旧数据在同一种 Off-policy 更新目标下共同影响策略**。Critic 不完美，必须依赖在线探索、正则化与独立评测，而非被当作永远正确的老师。
