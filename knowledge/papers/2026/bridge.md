---
related:
  - ref: papers/2026/relift
    type: compares
    note: "ReLIFT 通过在线插入定向监督帮助探索困难题；BRIDGE 通过奖励反馈协调同时存在的 SFT/RL 目标。比较时应控制训练成本与奖励条件。"
  - ref: papers/2025/deepseek-r1
    type: requires
    note: "先区分 Base 直接 RL 与冷启动 SFT，再讨论监督梯度是否帮助最终 RL 奖励。"

comparison:
  objective: "使 SFT 更新对最终 RL 奖励有利，而非简单叠加损失"
  training: "维护联合 SFT/RL 基模型、纯 RL 辅助参数及 LoRA 协调参数；用一阶惩罚式双层近似交替优化"
  signal: "监督对数似然 + RL 奖励 + 联合策略相对纯 RL 辅助策略的增益信号"
  evidence: "论文在数学基准上报告相对所选两阶段与混训基线平均绝对提升超过 3 个百分点"
  limitation: "增益代理依赖奖励质量和辅助策略；新增 RL 对照分支计算，论文的代码仓库尚无训练实现"
title: "Beyond Two-Stage Training: Cooperative SFT and RL for LLM Reasoning"
year: 2026
categories: ["强化学习与 Agent/SFT 与 RL 协同"]
summaryZh: "利用奖励反馈协调 SFT 与 RL 更新方向"
status: untracked
---


# Beyond Two-Stage Training: Cooperative SFT and RL for LLM Reasoning

> **证据层级**：论文正式版 [ICML 2026 / PMLR](https://proceedings.mlr.press/v306/chen26an.html) 以及[作者的算法展示材料](https://chanliang.github.io/talks/bridge.pdf)（特别是算法 2）。下文区分原文方法、便于理解的局部推导与我对 Agent 迁移的判断。
>
> **代码核对（2026-10-20）**：[作者 BRIDGE 仓库](https://github.com/ChanLiang/BRIDGE) 的 README 仍写着实现将随后发布，当前没有可直接复现的完整训练代码。不要把「有 GitHub 链接」误写成「训练代码已开源」。

## 一句话理解

BRIDGE 不只是「把 SFT 和 RL 的 loss 相加」。它试图让 SFT 的帮助接受 RL 奖励的检验：**同一迭代中维护联合训练的基模型与纯 RL 对照，更新轻量 LoRA，使联合训练相对纯 RL 的增益更大**。研究目标有说服力，但这不等于算法能对任何模型、任何奖励函数保证更高的最终回报。

## 1. 为什么不能固定混合 Loss？

为了保持符号清楚，定义 **需要最小化** 的两个损失：

$$
g_s=\nabla_\theta L_{\mathrm{SFT}}(\theta),
\qquad
g_r=\nabla_\theta L_{\mathrm{RL}}(\theta).
$$

固定加权更新 $\Delta\theta=-\eta(\alpha g_s+\beta g_r)$。仅考虑这一步 SFT 部分对 RL 损失的局部影响：

$$
\Delta L_{\mathrm{RL}}\approx
g_r^\top(-\eta\alpha g_s)=-\eta\alpha\,g_r^\top g_s.
$$

如果 $g_s^\top g_r<0$，SFT 部分在**一阶近似**下会升高 RL 损失；但这只是局部方向分析，不保证完整混合梯度一步必然有害，也不能用一次 minibatch 的余弦相似度判断长期效果。

**最简单的反例**：假设某个监督动作是演示者惯用的短步，而环境奖励鼓励安全区域中的长步。两个目标可能在部分参数上产生相反方向，**都“符合各自标签”并不代表对同一优化目标同样有益**。

## 2. 实际优化结构：三类参数与两条策略

论文使用最大化记号 $J$（所以与上述最小化 $L$ 的梯度符号相反）。

- $\theta$：接受 SFT 与 RL 联合信息更新的基模型参数。
- $\widehat{\theta}$：**辅助的纯 RL 对照参数**，用于估计如果不采用联合更新会如何；这不是部署时必须保留的第二个模型。
- $w$：轻量 LoRA 参数，在辅助比较信号下协调两种训练目标。

其理想化双层式是：

$$
\max_w J_{\mathrm{SFT}}(\theta^*(w),w),
\qquad
\theta^*(w)\in\arg\max_\theta J_{\mathrm{RL}}(\theta,w).
$$

这表示上层监督优化必须考虑下层 RL 的解；**不是**「上层直接等于验证集成功率」，也不是实际实现能精确求解 $\arg\max$。作者使用一阶的惩罚式近似，将其变成可计算的更新。

在作者算法 2 的简化写法中，三个相关目标可表达为：

$$
\begin{aligned}
J_{\mathrm{joint}}(\theta,w)
&=(1-\lambda)J_{\mathrm{SFT}}(\theta,w)+\lambda J_{\mathrm{RL}}(\theta,w),\\
J_{\mathrm{gain}}(\theta,\widehat\theta,w)
&=(1-\lambda)J_{\mathrm{SFT}}(\theta,w)\\
&\quad+\lambda\big[J_{\mathrm{RL}}(\theta,w)-J_{\mathrm{RL}}(\widehat\theta,w)\big].
\end{aligned}
$$

这里 $J_{\mathrm{SFT}}$ 是**最大化的对数似然**，与负交叉熵 $L_{\mathrm{SFT}}$ 的符号相反；上述权重沿用作者的简化定义，不能与综述里随意定义的 $\lambda_s,\lambda_r$ 逐项等同。

一次迭代中：

1. 在监督与 RL 数据上计算联合模型的两个目标，并计算辅助纯 RL 模型的 RL 目标。
2. 对 $\theta$ 沿 $J_{\mathrm{joint}}$ 的梯度更新。
3. 对 $\widehat{\theta}$ 只按 $J_{\mathrm{RL}}$ 更新。
4. 对 $w$ 按 $J_{\mathrm{gain}}$ 更新，借助两条分支的 RL 信号比较来协调 SFT 的帮助。

这是**算法流程的抽象**，实际仍有采样、梯度估计、优化器和惩罚近似细节。

## 3. 证据支持到哪一步？

[正式论文摘要](https://proceedings.mlr.press/v306/chen26an.html)报告：三个 LLM、五个数学推理基准下，BRIDGE 相比两阶段冷启动、朴素混合与若干单阶段基线的平均准确率**绝对提升超过 3 个百分点**；还报告逻辑推理迁移，以及未额外训练的代码和科学 OOD 任务结果。

**注意四件事：**

- 这是跨论文所选实验设置的*平均百分点*，不是每一个模型/每一道题必然 +3%，也不是相对增长 3%。
- 论文所称 cooperative gain 是优化中使用的**对照目标/代理信号**；训练并不能在每一步无误差地观测“纯 RL 的真实反事实结果”。
- 数学答题的验证成本、奖励密度、采样分布都与多轮工具 Agent 或机器人环境不同。
- 模型能力、训练时长和精度之间有多目标取舍；必要时要检查完整表格、误差条及额外分支成本，不能只引用摘要均值。

## 4. 容易被忽视的缺陷

**（A）梯度冲突 ≠ 必须用 BRIDGE。** 一次负余弦可能是正常的任务权衡；如果简单交替 SFT/RL 已足够稳定，双层机制不一定带来性价比。

**（B）纯 RL 辅助分支有额外成本。** 算法为了构造增益信号维护 $\widehat\theta$ 及其奖励评估。比较计算预算时不能只计最终模型的更新；还要算额外参数状态、rollout/verifier、LoRA 更新及通信。

**（C）奖励代理会改变「好监督」的意义。** 如果 RL 奖励只检查动作是不是接近演示，协同更新可能优化 imitation proxy，却不能据此断定提高物理任务成功率。

**（D）辅助对照并非独立随机实验。** $\widehat\theta$ 与联合分支沿训练动态分叉，彼此的采样分布和优化轨迹不同；两者奖励差还受到方差、数据与估计误差影响。它提供可训练的协同信号，不能直接被解释成对 SFT 的无偏因果归因。

## 5. 推荐给 Agent 的最小可证伪对照

固定同一 Base、相同可验证任务与总 GPU-hours，至少比较：

| 配方 | 为什么不可省 |
|---|---|
| 纯 RLVR | 判断本任务是否真的需要额外监督 |
| SFT → RL | 简单且广泛使用的冷启动基线 |
| 交替 SFT / RL | 隔离「持续提供监督」带来的收益 |
| 同一步固定权重联合 Loss | 判断复杂协调是否必要 |
| BRIDGE 类三分支协调 | 只有预算足够，且前面的简单方法不能解决问题时才值得上 |

要报告奖励质量、最终任务成功率、模型正确率、三分支训练的总成本、KL/熵、SFT/RL 梯度夹角随训练的变化、置信区间，以及在动作失败状态下能否恢复。

**对 ORA 的研究判断（不是论文原结论）**：先确认自动化验证器的反馈能代表实际任务成功，再决定是否研究梯度合作；不要在无法验证物理结果时，仅靠更复杂的优化形式制造“Agent 能力提升”。

## 6. 阅读时的自测问题

1. 为什么 $\widehat\theta$ 必须与 $\theta$ 分开？删除它后如何定义「相对纯 RL 的增益」？
2. 作者双层式的上层最大化的是哪个目标？它和实际算法的 $J_{\mathrm{gain}}$ 是否完全相同？
3. 为什么某个局部 $g_s^\top g_r<0$ 既值得监控，又不足以证明 SFT 在长期无益？
4. 如果带有额外 RL 分支的 BRIDGE 在同样训练 step 下更好，却在相同 GPU-hours 下更差，你会如何报告结论？

**原始依据**：[ICML 2026 正式论文](https://proceedings.mlr.press/v306/chen26an.html) · [作者方法/算法 2](https://chanliang.github.io/talks/bridge.pdf) · [代码发布状态](https://github.com/ChanLiang/BRIDGE)。
