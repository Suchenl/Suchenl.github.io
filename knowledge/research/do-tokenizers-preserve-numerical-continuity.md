---
title: "目前的 Tokenizer，是否天然具备数值连续性？"
questionTitleEn: "Do Today's Tokenizers Inherently Preserve Numerical Continuity?"
publicQuestion: true
questionDate: "2026-10-21"
categories: ["多模态大模型", "机器人与具身智能", "数值表示与 Tokenization"]
tags: ["Numerical Tokenization", "VLM", "VLA", "Action Tokenizer", "Continuity", "Robot Learning"]
summaryZh: "普通语言 Tokenizer 不保证相近数值有相近表示；VLM 的连续视觉特征也不等于坐标输出具备连续性，而离散 Action Codebook 同样可能扭曲物理邻近关系。对照 xVal、BitTokens、Pix2Seq、FAST、X-Tokenizer、ActionPiece、ProAct 和连续动作头，提出几种可验证的改进路径。"
questionSummaryEn: "Text tokenization does not inherently preserve numerical distance. Continuous visual features do not guarantee metric output continuity, and discrete VLA action codes may distort physical neighborhoods. Review numerical encodings, action codecs, continuous heads, and testable research directions."
---

# 目前的 Tokenizer，是否天然具备数值连续性？

> **资料核查：2026-10-21。** 本文讨论的是一个开放研究问题，不是已经完成的实验。文中分别标注可从原始论文核对的机制和本文提出的判断；实验路线属于**待验证假设**。研究范围包括通用 LLM、VLM 的几何/数值输出，以及 VLA 的动作编码与控制。

## 一句话结论

**通常不天然具备。** 对普通文本 Tokenizer 而言，接近的实数不一定被编码为相近的 Token 序列，也没有机制保证其 Embedding 距离与数值距离单调对应。即便模型在训练中学会了部分数值规律，这种能力也不是 Tokenizer 本身的数学保证。

但“Token 是离散的”并不意味着“模型必然不能预测连续数值”：足够强的模型可以从数字字符的组合规律中学习插值、排序与计算；带数值编码的输入、连续输出头或者合适的损失函数也能提供连续性。**问题是表示、学习目标和物理决策三层是否一致，而非是否有一组专用 Token。**

对于 VLM，问题集中在**视觉连续特征 → 几何量 → 离散数值文本**；对于 VLA，问题进一步变为**连续物理状态和动作 → 量化编码 → 自回归预测 → 解码后的真实机器人轨迹**。

## 1. 首先定义：到底想让什么“连续”？

至少要区分四个不同的概念：

| 层次 | 希望成立的性质 | 常见误解 |
|---|---|---|
| 数值编码 | 数值 $x$ 与 $x+\epsilon$ 的表示应相近，并能可靠还原 | “Token ID 相邻，数值就相邻” |
| 模型表征 | 上下文中的数值与空间表示保留距离、顺序、尺度及单位 | “Tokenizer 不连续，因此 Transformer 肯定无法理解数字” |
| 输出训练信号 | 预测值误差应尽量对应真实数值/几何误差 | “Token CE 足以衡量机器人移动了多远” |
| 闭环行为 | 很小的观测或动作扰动不导致不合理、危险的控制突变 | “重建 MSE 小，任务成功率就必然高” |

令 $T(x)$ 表示对数值 $x$ 的 Token 序列，令 $\phi(T(x),c)$ 为在上下文 $c$ 下得到的表示。我们可以要求局部的数值邻近性：

$$
|x-y|\le \epsilon
\quad\Longrightarrow\quad
d\bigl(\phi(T(x),c),\phi(T(y),c)\bigr)\le L\epsilon+\delta.
$$

其中 $L$ 是局部变化尺度，$\delta$ 容许有限精度与数值解析误差。这里的 $d$ 既可取 Embedding 距离，也可取经过任务相关投影后的距离；**它是一个希望检验的性质，不是现有语言 Tokenizer 默认满足的定理**。而且 Embedding 距离只是诊断指标，不能代替实际模型表现。

举个直观例子：**“0.999” 与 “1.001”** 相差 $0.002$；**“1.001” 与 “8.001”** 相差 $7$。文本 Tokenizer 会根据词表合并规则将字符串拆成若干子词，不承诺前一对在 Embedding 空间比后一对更近。模型可以通过数字训练弥补这种偏置，但需要额外学习。

进一步地，分段函数的数学连续性、预测值的数值精度和闭环控制的鲁棒性不能互相替代：离散编码会在量化边界发生跳变；连续输出头也可能学到一个对图像扰动非常敏感的策略。

## 2. VLM：视觉 Embedding 连续，不代表输出的数值连续

### 2.1 输入图像与视觉 Token 的“连续性”是什么？

典型 VLM 用视觉编码器把图像分成 Patch、计算浮点特征，再映射到语言模型的隐空间。**浮点视觉特征可以随像素变化而变化**，但视觉编码器、量化/采样、非线性操作和训练目标均不保证其对所有几何扰动严格平滑，也不保证保留真实米制距离。

尤其要分清三个位置：

1. **像素/视觉特征**：图像本身为采样数据；视觉特征一般是连续向量，存在分辨率、遮挡、视角与尺度限制。
2. **位置编码**：Patch 位置、二维/三维位置或时间位置编码为模型提供位置信息，但它们本身不等于对物体长度、相机深度或距离估计的正确标定。
3. **最终坐标输出**：如果 VLM 用普通文本输出 “[312, 157]” 或 “0.234 m”，预测仍受数字 Token 划分、文本概率和监督目标影响。

因此，“视觉 Token 是连续向量”不能推出“VLM 的数值预测天然具备连续性”。即使输出文本可以解析为任意小数，也不意味着模型会给出恰当的精度。

### 2.2 离散坐标 Token：明确可执行，但存在量化边界

[Pix2Seq（Google Research）](https://www.research.google/blog/pix2seq-a-new-language-interface-for-object-detection/) 把检测框坐标归一化，再量化为有限的整数 Bin，用自回归序列预测。**优点**是让检测统一到序列生成；**代价**是固定离散粒度与 Bin 边界。

若某一归一化坐标 $u\in[0,1]$ 使用 $B$ 个均匀 Bin，则：

$$
q(u)=\operatorname{round}\bigl((B-1)u\bigr),\qquad
\hat u=\frac{q(u)}{B-1}.
$$

理想无裁剪情况下，单个量化值的最大舍入误差约为 $1/[2(B-1)]$。**这是编码器的数值误差上界，不是 VLM 最终定位误差上界**：模型也可能预测错误 Bin；图像证据也可能根本无法支持高精度坐标。

### 2.3 自然语言数字：有语义能力，不自带可微数值几何

对距离、深度、3D 坐标、速度、角度、物体尺寸等量，通用 VLM 常通过文本或结构化数值序列输出。问题包括：

- **序列化不唯一**：“0.50 m”“50 cm”“500 mm”数值含义相同，字符串与 Token 序列可能完全不同。
- **大小关系缺乏内置约束**：Token CE 对两种不同错误的代价不按物理距离分配。
- **物理尺度需要视觉证据**：单目绝对尺度具有歧义，误差不应全归因于 Tokenizer；相机标定、参照物与三维数据同样关键。
- **几何空间有特殊拓扑**：角度 $179^\circ$ 与 $-179^\circ$ 实际很近，但它们的普通数值差是 $358^\circ$；旋转应使用适合 $SO(3)$ 的距离，而不是盲目逐轴比较文本差异。

[SpatialVLM（CVPR 2024）](https://spatial-vlm.github.io/) 研究通过大规模空间数据提高定量空间推理能力；[Metric-Bench（2026-09 预印本）](https://arxiv.org/abs/2609.25841) 进一步考察以图像内已知尺寸参照进行米制空间推理。它们说明 **数据与空间监督非常重要**，但并不构成“修改 Tokenizer 就能解决绝对尺度推理”的证据。

### 2.4 已有直接针对数值连续性的设计

| 路线 | 主要机制 | 能解决什么 | 仍需注意 |
|---|---|---|---|
| [xVal](https://arxiv.org/abs/2310.02989)（2023） | 使用数值占位 Token，并用标量缩放相应 Embedding，配合数值预测方式 | 直接为实数输入提供连续归纳偏置，减少把每个数拆成数字序列的负担 | 需要相应的模型输入与输出设计；原论文的从头训练结果不能直接外推到现成 VLM |
| [BitTokens](https://proceedings.mlr.press/v306/kreitner26a.html)（ICML 2026） | 用 IEEE 754 二进制数值编码及专用 Embedding 处理数值 | 改善数值表示效率与算术任务表现 | **位编码不等于天然的欧氏距离连续性**；作者在多种数值表示性质间做了权衡 |
| 数值/几何回归 Head | 由 Transformer 隐状态直接预测 $\mathbb R^n$ | 可以直接优化坐标、深度或姿态误差，绕开生成小数字符串 | 需要结构化数据和额外输出/服务适配，可能牺牲纯文本接口的简单性 |
| 几何一致性学习 | 对邻近值、单位变换、旋转等价类设计一致性损失 | 鼓励输出符合数值/物理几何，而不仅“字面一样” | 如果没有可信度量或标定，损失也可能引导错误的结果 |

**个人判断（待验证）**：对 VLM 的米制深度/空间坐标任务，通常应先比较“普通文本数值 + 好的数据”“连续数值输入/回归 Head”“几何一致性损失”，再决定是否有必要扩充数值词表。单改 Tokenizer 未必解决尺度来源不足的问题。

## 3. VLA：Action Tokenizer 也不保证物理邻近性

VLA 要把动作作用到物理世界，数值表示的误差可能变成轨迹偏移、接触失败甚至碰撞。需要区分**动作值连续**、**解码轨迹连续**和**策略对观测扰动稳定**，它们不是同一件事。

### 3.1 文本浮点数和逐维 Bin，都没有天然完美答案

一条动作可以写成结构化数值，例如：

    {"delta_position_cm": [2.15, -0.80, 0.30], "gripper": "hold"}

**JSON 字段是数值类型，但模型生成这些数值时依然可能使用语言 Tokenizer。** 这种接口易于调试、可由机器人能力约束独立检查，也能保持跨本体语义；不足之处是自回归 CE 并不直接惩罚物理误差。

[OpenVLA 的公开 ActionTokenizer 源码](https://github.com/openvla/openvla/blob/main/prismatic/vla/action_tokenizer.py) 将动作逐维量化到约 256 个 Bin，并使用语言词表尾部的 Token 编码。这证明专用动作符号可以通过语言建模使用，**但离散化并不自动让相邻 Bin 的 Embedding 更近**。把另一个 VLA 的 Token ID 直接移植到基础模型里，也不会连同它学到的动作知识一起迁移。

若动作范围为 $[-a,a]$，使用 $B$ 个均匀量化中心，则粒度约为：

$$
\Delta=\frac{2a}{B-1}.
$$

更大的词表可降低理想量化误差，却可能增加预测类别复杂度、对数据规模的要求，以及控制维度之间缺乏共享的风险。对不同自由度还需要不同单位、范围和标定；不能只靠一个固定的“256-bin 通用动作空间”。

### 3.2 频域和残差 Tokenization：更高效，但物理几何未必保留

- **[FAST / FAST+（2025）](https://arxiv.org/abs/2501.09747)**：把动作时间序列变换到频率域并压缩成更短的离散序列。其研究明确指出，逐维逐帧量化在高频精细操作中可能表现不佳。它尤其适合 Action Chunk，而不必然是每次决策只输出单步动作时的最优方案。
- **[X-Tokenizer（2026-06）](https://arxiv.org/abs/2606.14752)**：通过 Semantic Residual Quantization，用较高层离散码捕捉粗动作意图，再用残差码保留精度；作者同时进行多模态语义对齐。[官方代码](https://github.com/X-Square-Robot/X-Tokenizer) 提供跨本体动作编码/解码接口。这启发了“语义意图 + 数值残差”的层级表征。
- **[ActionPiece（2026-09）](https://arxiv.org/abs/2609.18487)**：指出低 MSE 仍可能丢失动作之间应有的物理距离排序，提出 *Physical Rank Consistency*（PRC），在编码、量化表示之间加强邻近关系约束；这是直接针对“动作 Token 是否保留连续动作关系”的研究。
- **[ProAct（2026-10）](https://arxiv.org/abs/2610.09170)**：指出仅优化 Action Tokenizer 的动作重建还不够，还要考虑**下游策略能否正确预测这些 Token**，以及预测错误后 Decoder 是否输出合理动作。作者报告了跨多个机器人基准的 Rollout 成功率改进。这是目前最值得结合政策学习研究的角度。

这些研究的共同点不是“离散动作 Token 已经连续”，而是**在离散表示的约束下，额外优化几何保真、可预测性、压缩效率和下游执行鲁棒性**。

### 3.3 为什么连续动作 Head 也是重要对照？

离散 Action Tokenizer 并不是 VLA 唯一的高性能路线：

- **[$\pi_0$（RSS 2025）](https://arxiv.org/abs/2410.24164)**：在预训练 VLM 上引入基于 Flow Matching 的连续动作生成机制，不要求每个连续动作分量都变成语言词表中的离散 Token。
- **[OpenVLA-OFT（2025）](https://openvla-oft.github.io/)**：组合连续动作表示、并行解码、Action Chunking 和 L1 回归，其官方实现也提供不同动作 Head 的配置。

因此必须把 **Tokenizer 改动带来的收益**，与 **Action Chunking、并行预测、Head 容量、训练损失和时间尺度** 的收益分开比较。仅观察一项 VLA 的高成功率不能证明扩词表是因果主因。

## 4. 数值连续性为什么比重建精度更难？

考虑动作 $a_1,a_2,a_3$，其中 $a_1$ 和 $a_2$ 很近，但 $a_3$ 很远。一个 Tokenizer 可能都能较准确地还原这三个动作，却让预测 $a_1$ 时第二高概率的 Token 对应 $a_3$。如果策略偶然选错 Code，物理后果可能严重。

**重建保真、Token 可预测性和错误鲁棒性必须联合评价**：

$$
\underbrace{\lVert a-D(E(a))\rVert}_{\text{重建误差}}
\quad\neq\quad
\underbrace{\mathbb E_{z\sim p_\theta(\cdot\mid o)}
[d_{\mathrm{phys}}(D(z),a^\star)]}_{\text{策略预测后的物理误差}}.
$$

其中 $E,D$ 是动作编解码器，$o$ 为当前观测，$p_\theta$ 是策略对动作码的预测分布，$a^\star$ 是有证据的目标动作。第二项不等同于真实闭环成功率；还需要通过物理执行验证。

空间度量也不是普遍的欧氏距离：

- 平移要考虑**机器人局部坐标系、单位、工作空间和限幅**；
- 旋转要使用 $SO(3)$ 的测地距离，并处理角度周期性与等价表示；
- 关节、末端、底盘、灵巧手自由度的结构不同，不应未经标定混用数值尺度；
- 高采样频率与低采样频率的同样位移增量，可能意味着截然不同的速度、加速度和接触风险；
- 对接触丰富的任务，还需要考虑**速度、夹爪力、接触事件和后续状态**，不能只对单步位置做 MSE。

这说明“Action Tokenizer 是否连续”最终是**含本体、时间与接触约束的动作空间几何问题**，而不是把 Token ID 重新编号的问题。

## 5. 值得探索的五条优化方向

以下都是**研究假设**，并非我们已证明的结果。

### A. 数值专用输入/输出：从“字符相似”转向“量值相似”

对 VLM 的深度、距离、位置和大小等数值：探索单数值 Token + 连续 Value Embedding（参考 xVal）或更稳定的数值编码（参考 BitTokens），输出端使用回归或分布式数值 Head。加入单位规范化、单位等价扰动、一致性回归训练。

**核心检验**：数值邻近性、单位变换一致性、数值插值/外推、绝对尺度误差、是否损伤通用 VQA 能力。要注意：对现成 VLM 增加这样的输入并不是“仅修改 Tokenizer 配置”，可能需要改前向传参、Embedding 方式和输出 Head。

### B. 几何感知的离散 Tokenizer

对于 VLA，先在同一份数据上比较普通 Float JSON、Scalar Bin 和几何约束码本。对近邻动作、远邻动作施加排序损失，例如：

$$
\mathcal L_{\mathrm{rank}}
=
\max\bigl(0,\,
m+d_{\mathrm{code}}(a,a^+)-d_{\mathrm{code}}(a,a^-)
\bigr),
$$

其中 $a^+$ 物理上比 $a^-$ 更接近 $a$，$m$ 是间隔。注意不能凭 Token 的整数编号直接定义 Code 距离；应根据量化表示、Codeword 或最终解码动作定义。该思路受到 ActionPiece 启发，但不等于复现其完整算法。

**核心检验**：近邻排序保持率、量化误差、Token 预测准确度、错误 Token 的解码严重度，以及真实闭环成功率。

### C. 粗意图 + 连续残差：兼顾语言推理和精度

探索让通用 Agent 负责选择**运动意图、目标对象、操作模式、工具调用**，而由专用数值分支预测**连续增量、精细接触修正或短 Action Chunk**。

一种可检验设计是：

$$
a=\operatorname{Project}_{\mathcal C(e,s)}
\bigl(D(z_{\mathrm{coarse}})+r_\theta(o,s,z_{\mathrm{coarse}})\bigr),
$$

其中 $e$ 是本体、$s$ 是本体状态，$\mathcal C(e,s)$ 是工作空间和执行约束，$D(z_{\mathrm{coarse}})$ 为粗动作，$r_\theta$ 是连续残差，$\operatorname{Project}$ 表示执行前物理可行性约束。**这只是一个候选设计**；物理约束投影的不可微性、错误模式和延迟都需要单独验证。

它可能比“为每个小数创建一个新 Token”更适合同时保留通用语言能力和细粒度操作。

### D. 时间尺度与跨本体 Tokenizer

对动作 Chunk 使用频率域或分层残差编码，同时条件化：本体能力、自由度类型、执行时长 $\Delta t$、目标参考坐标系、动作限幅和不同手指/关节的掩码。

**核心检验**：相同轨迹在不同采样频率下的解码一致性、未见本体的动作几何、接触事件保存率、延迟和控制稳定性。需区分采样频率改变引起的实际运动语义变化与编码误差。

### E. 从 Token 重建转向策略友好的表示学习

参考 ProAct，将下游动作预测难度与错误恢复纳入设计；不仅检查动作 Decoder 能否精确重建已有轨迹，还检查当前观测下模型是否容易选对 Token，以及错一个 Token 后最坏可能发生什么。

可以比较独立训练 Tokenizer 与“Tokenizer + Policy 联合训练”，评估是否牺牲了压缩率却换来更高的闭环成功和更低危险动作率。**不能假设联合训练必优；也不能用单纯 Token CE 替代真实物理代价。**

## 6. 怎样设计一组公平、低成本且能回答问题的实验？

### 阶段 I：先做纯编码诊断，不训练大 VLA

固定几类动作数据：单步末端平移、周期性旋转、关节控制、双臂动作，以及包含多种采样频率的短轨迹。用完全一致的原始动作和本体归一化对照：

1. 数值文本 Token（直接记录原有 Tokenizer 的分词和长度）；
2. 均匀 Scalar Bin；
3. 几何距离约束的离散 Codebook；
4. FAST / 残差码本等 Chunk 方法；
5. 无需离散码的连续预测 Head（作为上界性质不同的对照）。

测量量化 MAE / RMSE、旋转测地误差、PRC / 邻近排序保持、Token 长度、编解码延迟和码本使用率；区分**编码能力**和**模型预测能力**。

### 阶段 II：固定视觉主干和数据，比较真正的模型学习效果

用相同训练集、可见图像/状态、任务划分、总计算预算，比较：

- 原始浮点文本输出 + 语言 CE；
- Scalar Action Token + CE；
- 具物理距离监督的 Token + CE；
- 连续动作回归 Head 或 Flow Head；
- 如场景需高频动作，再比较 FAST / Chunk 方案。

对 VLM 另行测试：物体中心/检测框、相机几何、深度与尺寸；严格分开像素误差和米制误差。对 VLA 测 action prediction 误差、错误恢复、非法运动和同预算**闭环任务成功率**。不要拿不同模型容量或是否用了 Action Chunking 混合解释 Tokenizer 的因果作用。

### 阶段 III：验证连续性是否真正提高泛化

重点做三个迁移维度：**未见数值范围、未见机器人本体、未见控制时间尺度**。同时改变相机视角与遮挡，检验模型不是仅记住训练集的数字格式。记录任务成功率与推理成本的 Pareto 对照，而不是只报告 Tokenizer 重建分数。

一项重要消融是**人为使 Codebook 的邻近关系混乱而保持词表大小和 Decoder 容量相同**。如果几何感知表示确实重要，应能在相同编码容量下改善模型对邻近动作的预测和闭环策略；否则增益也许主要来自数据、模型容量或压缩率。

## 7. 目前的个人判断与尚未解决的问题

**当前判断**：普通文本 Tokenizer 在数值几何上缺乏天然保证；VLM 需要更合理的**数值/几何表征与监督**，VLA 除此之外还需兼顾**动作可预测性、物理度量、执行频率和错误鲁棒性**。离散 Token 和连续 Head 各有成本，任何一种都不应该仅凭最新论文或更低重建误差被认定为最佳方案。

值得持续追踪的开放问题：

1. **现成 VLM 到底在多大程度上已经通过训练学会了数值邻近性？** 是否可以仅靠表示探针/数据增强解决，而无需重新设计 Tokenizer？
2. **数值专用 Token 与连续回归 Head，哪种更能在不破坏语言能力的条件下提升 VLM 的三维距离预测？**
3. **对 VLA，维护物理邻近关系是否比追求最低重建 MSE 更有效？** 需要怎样定义旋转、接触和不同本体之间的正确距离？
4. **更容易被 Agent 预测的 Action Token，是否比压缩率更高的 Token 更值得使用？**
5. **连续预测 Head 与层级离散 Action Codec 能否协作，而不是二选一？**
6. **跨采样率、跨本体的动作表示怎样避免学到数据集身份捷径？** 时间步长应该作为条件输入还是采用物理时间规范化？

**最终想回答的不是“能否发明一个更复杂的 Tokenizer”，而是：在相同训练数据、模型规模和交互预算下，更符合数值与物理几何的表示，能否让模型更准确、更稳定、更容易迁移？**

## 可直接核查的核心来源

以下优先列原始论文、官方研究页或官方开源实现，便于后续补充实测。

| 主题 | 工作与时间 | 为什么重要 |
|---|---|---|
| 通用数值 Token | [xVal（2023）](https://arxiv.org/abs/2310.02989) | 连续数值 Embedding 与数值回归思路 |
| 通用数值 Token | [BitTokens（ICML 2026）](https://proceedings.mlr.press/v306/kreitner26a.html) · [官方代码](https://github.com/KreitnerL/BitTokens) | 系统比较数值编码的连续性、范围、稳定性与算术性质 |
| VLM 离散坐标 | [Pix2Seq（Google Research，2022）](https://www.research.google/blog/pix2seq-a-new-language-interface-for-object-detection/) | 检测框从连续坐标到离散 Bin 的具体实现动机 |
| VLM 定量空间 | [SpatialVLM（CVPR 2024）](https://spatial-vlm.github.io/) | 米制空间监督与三维定量推理 |
| VLM 定量空间 | [Metric-Bench（2026-09）](https://arxiv.org/abs/2609.25841) | 参照尺度与定量空间推理的训练/评测 |
| VLA 逐维离散 | [OpenVLA ActionTokenizer（2024）](https://github.com/openvla/openvla/blob/main/prismatic/vla/action_tokenizer.py) | 逐维 Bin 及词表 Token 的具体接口 |
| VLA 频率压缩 | [FAST / FAST+（2025）](https://arxiv.org/abs/2501.09747) | 高频动作轨迹的频域编码与压缩 |
| VLA 连续动作 | [$\pi_0$（RSS 2025）](https://arxiv.org/abs/2410.24164) · [OpenVLA-OFT（2025）](https://openvla-oft.github.io/) | 反例：精确动作不必依赖自回归离散 Token |
| 多本体残差码 | [X-Tokenizer（2026-06）](https://arxiv.org/abs/2606.14752) · [官方代码](https://github.com/X-Square-Robot/X-Tokenizer) | 语义粗码、残差细化、跨本体共享接口 |
| 物理邻近性 | [ActionPiece（2026-09）](https://arxiv.org/abs/2609.18487) · [代码](https://github.com/DeepCybo-PhysAI/ActionPiece) | PRC：Tokenization 是否保留动作局部物理距离 |
| 策略鲁棒性 | [ProAct（2026-10）](https://arxiv.org/abs/2610.09170) | 解码保真之外还要优化预测难度和错误动作鲁棒性 |

> **边界说明**：文中列出的各论文实验采用不同数据、主干、训练设置及机器人任务，其报告的性能数字不可直接横向排名。新增专用 Token、扩词表或冻结 Action Tokenizer 也不自动迁移任何已有 VLA 权重中学到的动作语义。应以公平控制实验来决定技术路线。
