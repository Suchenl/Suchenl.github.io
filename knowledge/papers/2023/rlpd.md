---
contentType: paper
domains: ["大模型与强化学习/后训练与策略优化", "机器人与具身智能/策略学习与控制"]
title: "Efficient Online Reinforcement Learning with Offline Data"
shortName: "RLPD"
aliases: ["Reinforcement Learning with Prior Data", "离线数据与在线RL混合训练", "Efficient Online Reinforcement Learning with Offline Data"]
year: 2023
categories: ["强化学习与 Agent/后训练", "机器人与具身智能/强化学习与策略学习"]
summaryZh: "精读 ICML 2023 RLPD：先验与在线数据对称采样、统一 Off-policy Actor–Critic 更新、Critic LayerNorm、Ensemble、高 UTD 与跨任务适用边界。"
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

# RLPD：怎样利用历史数据，加速在线强化学习？

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

## 一、RLPD 究竟试图解决什么问题？

在线强化学习虽然能利用环境反馈持续改进，但真实交互往往昂贵、缓慢，甚至存在安全风险。与其让策略从随机探索重新发现所有可行行为，更合理的问题是：**能否直接利用已有的真实转移数据，帮助在线 RL 更快学会高回报策略？**

RLPD 的答案不是另加一个模仿学习目标，而是将已有数据与在线采集数据**混合进入同一个 Off-policy Actor–Critic 更新**。历史数据可以来自专家，也可以来自旧策略或非最优行为；真正必要的是数据中的状态、实际动作、奖励、后继状态语义一致。

本文重点拆解三件事：**新旧数据怎样采样？Critic 和 Actor 分别拿这些数据学习什么？为什么简单地把两种数据混合，并不足以保证训练稳定？**

> **前置概念**：Actor 与 Critic 为什么需要互相更新、二者是否存在“鸡生蛋”问题，是所有 Actor–Critic 方法共有的基础问题，并不是 RLPD 的独有贡献。其完整分析、Q 值与成功概率的关系、策略改进的误差边界，统一放在独立的 [Actor–Critic 技术问答](/research/research/actor-critic-mutual-dependence/) 中。

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

1. **价值估计误差仍会影响训练**：历史数据覆盖不足、离线 Q 过高估计都可能误导当前策略；这属于 Actor–Critic 的一般问题，进一步见 [独立技术问答](/research/research/actor-critic-mutual-dependence/)。
2. **高 Q 不是高成功概率的同义词**：折扣、时间成本、动作罚项、熵正则与奖励尺度都会改变价值含义。
3. **演示数据不是越多越好**：状态覆盖、任务分布与在线环境是否一致非常重要。对本任务次优乃至误导性的先验数据，50:50 也可能有害。
4. **没有可信真实后继状态就不等于 Off-policy RL**：只有视频或单帧动作，不足以计算同一 MDP 的 Bellman 更新。
5. **跨任务和跨机器人并非默认成立**：需要可比较的状态、动作、奖励语义与数据许可。

## 相关阅读与学习路线

- **基础算法原理**：[Actor–Critic 为什么能够共同改进？](/research/research/actor-critic-mutual-dependence/)：评估、改进与自举误差。
- **最直接的机器人应用**：[HIL-SERL 深度解读](/research/papers/2024/hil-serl/)：看人类纠正怎样进入两个 Buffer。
- **底层动作如何真实执行**：[机器人控制专题](/research/topics/robot-control/)：PD、阻抗、参考限幅与 wrench。
- **LLM 训练的替代优化器**：[SFT、RL 与工具 Agent 后训练](/research/topics/llm-agent-training/reviews/sft-rl-co-training/)。
- **原论文**：[Ball et al., ICML 2023](https://proceedings.mlr.press/v202/ball23a.html) · [PDF](https://proceedings.mlr.press/v202/ball23a/ball23a.pdf) · [GitHub](https://github.com/ikostrikov/rlpd)。

**最后一句话**：RLPD 的创新不是“把专家动作变成模型预测目标”，而是**用真实 transition 更新价值函数，让新旧数据在同一种 Off-policy 更新目标下共同影响策略**。Critic 不完美，必须依赖在线探索、正则化与独立评测，而非被当作永远正确的老师。
