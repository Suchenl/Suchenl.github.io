---
title: "OPD 为什么使用反向 KL？正向和反向 KL 如何定义，为什么不一起使用？"
summaryZh: "原样收录关于 OPD 的正向 / 反向 KL 定义、Mode-Covering 与 Mode-Seeking、Student 采样监督、混合 KL 与 EOPD 的完整问答，保留公式、表格和 SVG 示意图。"
categories: ["强化学习与 Agent", "强化学习与 Agent/后训练与策略蒸馏"]
---

# 提问

为啥OPD用反向KL，而不是正反一起用，以及，反向正向到底怎么定义

# 回答

OPD（On-Policy Distillation，在线策略蒸馏）通常使用**反向 KL（Reverse KL）**，主要因为它与 Student 自己采样、Teacher 提供反馈的训练方式非常契合，而且能够让 Student 优先强化 Teacher 认可的已有行为。

但你问的第二点其实很关键：

**为什么不把正向 KL 和反向 KL 一起用？**

答案是：**完全可以，而且已经有 ICML 2026 的工作验证了这种思路。** 只是两种 KL 的优化偏好不同，直接相加不一定是最优方案。[论文](https://proceedings.mlr.press/v306/jin26e.html)

## 一、正向 KL 和反向 KL 到底怎么定义？

先定义两个分布：

- $P$：Teacher 模型的输出概率分布。
- $Q$：Student 模型的输出概率分布。

我们希望 Student 学习 Teacher，也就是让 $Q$ 尽量接近 $P$。

### 1. 正向 KL（Forward KL）

$$
D_{\mathrm{KL}}(P\|Q)=\sum_x P(x)\log\frac{P(x)}{Q(x)}
$$

这里的方向是：

![Teacher P 指向 Student Q](https://suchenl.github.io/research/opd/forward-kl.svg)

按 Teacher 的概率分布加权，要求 Student 覆盖 Teacher 认可的输出。

直觉上，正向 KL 的意思是：

**Teacher 认为哪些答案有可能是正确的，Student 就应该尽量都学会。**

例如 Teacher 认为解决一个数学问题有两条同样合理的推理路径：

- 路径 A：50%
- 路径 B：50%

如果 Student 只会 A，几乎不会 B，正向 KL 就会强烈惩罚 Student，因为它漏掉了 Teacher 认可的重要路径。

这种倾向称为 **Mode-Covering（模式覆盖）**。

### 2. 反向 KL（Reverse KL）

$$
D_{\mathrm{KL}}(Q\|P)=\sum_x Q(x)\log\frac{Q(x)}{P(x)}
$$

方向正好相反：

![Student Q 指向 Teacher P](https://suchenl.github.io/research/opd/reverse-kl.svg)

按 Student 的概率分布加权，重点纠正它当前倾向产生、但 Teacher 不认可的输出。

直觉上：

**Student 目前倾向做什么，就先检查这些行为是否符合 Teacher 的判断。**

如果 Student 已经很擅长路径 A，而几乎不会路径 B，反向 KL 通常会优先让它把 A 学得更稳定，而不是强烈要求它掌握 B。

这种倾向称为 **Mode-Seeking（模式寻优）**。

## 二、用一张图理解区别

假设 Teacher 认可两条推理路线 A、B，但 Student 当前几乎只会 A。

**不同 KL 对 Student 学习方向的影响**

![不同 KL 对 Student 学习方向的影响](https://suchenl.github.io/research/opd/mode-seeking-covering.svg)

*示意图。两种 KL 在理论上的全局最优解都是 Student 与 Teacher 的分布完全一致；不同之处主要体现在模型表达能力有限、采样有限以及实际优化过程中的偏好。*

所以，正向和反向并不是谁更正确，而是强调不同：

| 比较 | 正向 KL | 反向 KL |
|---|---|---|
| 定义 | $KL(P\|Q)$ | $KL(Q\|P)$ |
| 概率权重 | Teacher | Student |
| 优化倾向 | Mode-Covering | Mode-Seeking |
| 主要优势 | 学习 Teacher 的多样性 | 聚焦 Student 已有行为的优化 |
| 主要风险 | 可能学习 Teacher 的低质量分支 | 可能漏掉重要的推理路径 |

## 三、为什么 OPD 更倾向使用反向 KL？

关键在于 **OPD 是 Student 自己生成轨迹，再由 Teacher 对这些轨迹提供监督**。

![OPD 学生生成轨迹、教师评分及反向 KL 更新流程](https://suchenl.github.io/research/opd/opd-flow.svg)

假设 Student 生成了一个 token $a_t$。

我们让 Teacher 和 Student 分别计算这个 token 的概率：

$$
q_t=\pi_\theta(a_t\mid s_t)
$$

$$
p_t=\pi_T(a_t\mid s_t)
$$

于是可以计算：

$$
r_t=\log p_t-\log q_t
$$

这个值可以作为 OPD 的 token-level 训练信号：

- Teacher 比 Student 更认可这个 token：$r_t>0$，倾向于提高它的概率。
- Teacher 比 Student 更不认可：$r_t<0$，倾向于降低它的概率。

因为 token 是由 Student 采样的，所以其期望恰好对应反向 KL 的负值：

$$
\mathbb E_{a_t\sim Q}[r_t]=-D_{\mathrm{KL}}(Q\|P)
$$

因此反向 KL 有三个实际优势：

1. **采样契合**：使用 Student 自己生成的 token 就能构造反向 KL 的 Monte Carlo 估计。
2. **计算成本低**：采用 sampled-token 方案时，Teacher 只需返回采样 token 的 logprob，不必传输整个词表的概率分布。
3. **方便接入 RL**：可以把 Teacher 与 Student 的 logprob 差转换成 token-level advantage，复用策略梯度训练框架。

这正是 [Thinking Machines Lab](https://thinkingmachines.ai/) 公开的 OPD 实现所采用的路线。

但要特别注意：

**On-policy 不等于必须用反向 KL。**

On-policy 定义的是训练轨迹来自 Student；正向还是反向 KL，定义的是如何衡量 Student 与 Teacher 的分布差异。

如果在 Student 访问过的状态上获取 Teacher 的完整词表概率，一样可以使用正向 KL。verl 的 GKD OPD 实现就支持这种方式。

## 四、那为什么不把两种 KL 一起使用？

数学上完全没问题：

$$
\mathcal L=\alpha D_{\mathrm{KL}}(Q\|P)+(1-\alpha)D_{\mathrm{KL}}(P\|Q)
$$

其中 $\alpha\in[0,1]$。

这样既能保留反向 KL 的模式寻优，又能引入正向 KL 的模式覆盖。

不过它有两个现实问题。

**第一，Teacher 并不是任何时候都值得完整模仿。**

例如在一个确定性很强的数学计算步骤，Teacher 明确认为 token A 的概率是 99%，其他 token 只有 1%。

此时，反向 KL 已经能够很好地发挥作用，再引入正向 KL 可能并没有多少额外收益。

反过来，如果 Teacher 对多个合理推理路径都保持较高概率，正向 KL 就有助于防止 Student 只学会其中一种。

**第二，计算成本和优化复杂度可能增加。**

在只提供 sampled-token logprob 的 OPD 系统中，增加正向 KL 通常需要更多 Teacher 概率信息，或者使用额外的采样与估计方法。

而且混合系数 $\alpha$ 如何设定，本身又成为一个优化问题。

## 五、其实已经有人这么做了

<img src="https://paper-assets.alphaxiv.org/figures-normalized/figures/2603.07079v3/x5.png" alt="Entropy-Aware On-Policy Distillation of Language Models EOPD 论文相关图" width="112" height="140" style="object-fit:cover;float:left;margin:0 16px 8px 0;border-radius:8px;" />

**[Entropy-Aware On-Policy Distillation of Language Models](https://proceedings.mlr.press/v306/jin26e.html)**

ICML 2026 · EOPD

它提出根据 Teacher 的预测熵，在 OPD 中自适应引入正向 KL，而不是无差别地把两种 KL 相加。

[论文全文与实验结果](https://proceedings.mlr.press/v306/jin26e.html)

<div style="clear:both;"></div>

它的核心思路是：

- **Teacher 低熵、高置信度时**：主要使用反向 KL，让 Student 学会确定的行为。
- **Teacher 高熵、存在多个合理选择时**：额外引入正向 KL，让 Student 保留更多可能的推理路径。

研究报告显示，相比普通 OPD，EOPD 在六个数学推理基准中提高了生成多样性，并改善了部分模型的 Pass@8 表现。

---

## 六、我认为真正值得思考的是

对于推理模型，甚至机器人策略学习，**我们是否应该让 Student 完整继承 Teacher 的概率分布？**

未必。

假设 Teacher 面对某个问题，会尝试三种推理策略。Student 只能高质量掌握其中一种，那么反向 KL 的模式寻优倾向可能恰恰是有价值的：它帮助较小模型集中有限的表达能力。

但如果某些状态具有多种正确动作，例如机器人抓取同一个物体可以选择不同方向，那么过度压缩策略分布又可能损害泛化能力。

因此，一个值得实验的设计是：

**让 KL 的方向和权重取决于状态的不确定性、任务所需的多样性，以及 Student 当前的能力，而不是整个训练过程固定使用一种 KL。**

不过，Teacher 熵高不一定代表多个选择都正确，也可能代表 Teacher 不知道答案。所以，仅依据 Teacher 熵切换 KL 仍有局限。

**总结：正向 KL 倾向于让 Student 学会 Teacher 知道的各种可能性；反向 KL 倾向于让 Student 改进自己已经能够产生的行为。OPD 偏好反向 KL，既有采样与 RL 实现上的便利，也有优化行为上的考虑，但这并不是一个必须遵守的理论约束。**
