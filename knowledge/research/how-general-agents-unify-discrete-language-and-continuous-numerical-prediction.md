---
contentType: exploration
domains: ["大模型与强化学习/预训练与模型架构","机器人与具身智能/数据与动作表示"]
featuredOrder: 30
title: "通用 Agent 如何统一学习离散语言决策与连续数值预测？"
questionTitleEn: "How Can General Agents Jointly Learn Discrete Language Decisions and Continuous Numerical Prediction?"
publicQuestion: true
questionKind: "question"
questionDate: "2026-10-21"
categories: ["强化学习与 Agent", "多模态大模型", "数值表示与 Tokenization", "机器人与具身智能"]
tags: ["Discrete-Continuous Modeling", "Numerical Head", "Flow Matching", "Multimodal Agent", "Output Routing", "VLA"]
summaryZh: "在不牺牲语言推理和工具调用能力的前提下，通用 Agent 如何预测连续数值、选择不同输出 Head，并把数值结果继续用于推理？比较 xVal、Number Token Loss、Transfusion、BLIP3-o、Beyond Language Modeling、OpenVLA-OFT 与 π0.5，澄清特殊 Token 路由、训练时模态监督和真正自主决策的区别，并提出可验证的实验。"
questionSummaryEn: "How can a general agent combine language-token decisions with continuous numeric outputs, learn when to invoke each head, and reuse predicted values? A critical comparison of xVal, Transfusion, Beyond Language Modeling, robotic action heads, and testable routing objectives."
related:
  - ref: "research/do-tokenizers-preserve-numerical-continuity"
    type: "requires"
    note: "前置问题讨论数值 Tokenizer 是否保留邻近性；本文追问统一模型中的输出机制、路由和训练。"
---

# 通用 Agent 如何统一学习离散语言决策与连续数值预测？

> **资料核查：2026-10-21。** 这是一个有大量相关前作的开放研究问题，不是“首次提出双 Head”的原创性声明，也不是已经完成的实验。以下明确区分**论文已实现的机制**、**对机制的推论**和**尚待验证的研究假设**。本文面向通用 LLM/VLM Agent，也考虑坐标、机器人动作、物理状态和结构化工具参数；不依赖任何私人仓库实现。

## 一句话结论

**同一个 Agent 同时使用离散语言 Head 与连续数值 Head，在技术上已经被证明可行。** 真正值得追问的不是“能不能再加一个回归层”，而是三个递进的问题：

1. **表示和预测：** 怎样让连续值以恰当的数值、几何损失被监督，而不是一律转换为数字字符串再以 Token CE 学习？
2. **选择与切换：** 模型究竟是自主决定什么时候需要数值/动作生成，还是只在固定格式、特定 Prompt 或特殊标记出现时被程序切换？
3. **统一闭环：** 数值 Head 的结果能否重新作为模型的上下文参与后续推理、工具调用和动作修正；切换策略能否针对任务正确率、成本和物理反馈持续改进？

一个重要反例是：**输出连续物理量，并不等于连续 Head 一定比离散 Head 更好。** 两者还涉及分布建模、时序相关性、延迟、数值精度和下游闭环稳定性。

关联的基础问题：[目前的 Tokenizer，是否天然具备数值连续性？](do-tokenizers-preserve-numerical-continuity.md)。前一篇重点讨论**数值如何表示及保持邻近关系**；这里重点讨论**统一 Agent 怎样生成、路由和利用不同类型的输出**，不重复定义 Tokenizer 的所有问题。

## 1. 为什么这是 Agent 问题，而不只是 Tokenizer 问题？

通用 Agent 既要作出**离散语义决策**（解释、计划、选工具、决定是否继续观察），也要预测**连续数值**（距离、坐标、角度、速度、时间、关节值、轨迹）。例如：

- 决策：是否调用机器人动作工具、需要控制哪个对象、是移动还是夹取；
- 数值：末端目标坐标、关节变化、移动速度或动作持续时间；
- 闭环：执行后取得新观测，计算误差，并把连续状态重新交给 Agent 决定下一步。

普通语言生成采用 $p_\theta(w_t\mid c)$：对词表做分类并优化交叉熵（CE）。如果把连续坐标直接序列化为文本，CE 不保证错误大小符合几何距离。相对地，预测实数 $\hat x\in\mathbb R^d$ 可以直接用回归损失，复杂动作分布则可以使用 Flow Matching、Diffusion 或其他分布预测器。

但**预测目标连续、隐藏状态为浮点数、使用连续 Head、对输入扰动保持闭环稳定**是四种不同的性质。使用回归 Head 只直接改变输出及其监督方式，不会自动补足视觉尺度、物理语义和控制鲁棒性。

## 2. 现有研究走到哪里？

| 工作 | 时间 | 连续与离散如何结合 | “切换”由谁决定？ | 主要启示及边界 |
|---|---|---|---|---|
| [xVal](https://arxiv.org/abs/2310.02989) | 2023 | 数字以带标量的 [NUM] 表示；文本 Token Head + 标量 Number Head | Token Head 预测 [NUM]，程序读取数值 Head | **与数值输出最直接相关**；原始结果来自专门训练的模型，不能直接外推到任意现成 LLM |
| [Transfusion](https://arxiv.org/abs/2408.11039) | 2024 / ICLR 2025 | 文本 next-token CE + 图像连续表征的 Diffusion | 模态边界、序列格式与采样程序共同决定 | 证明共享 Transformer 可联合训练两类生成目标 |
| [Regress, Don't Guess / Number Token Loss](https://proceedings.mlr.press/v267/zausinger25a.html) | ICML 2025 | 不新建数值 Head，在离散 Number Token 上加入距离敏感损失 | 不涉及双 Head 切换 | 重要**低复杂度基线**：连续 Head 不是数值改进的唯一途径 |
| [BLIP3-o](https://arxiv.org/abs/2505.09568) | 2025 | 预训练视觉语言主干 + 对 CLIP 视觉特征进行生成的 Diffusion/Flow 模块 | 图像生成任务接口/模型组织主导 | 对**给现成 VLM 增加连续生成能力**有借鉴价值，但不等于通用数值路由 |
| [$\pi_0$](https://arxiv.org/abs/2410.24164) | RSS 2025 | VLM 条件表示 + Flow Matching 连续动作生成 | 动作生成路径由控制任务组织 | 连续动作无需逐维转成普通语言 Token |
| [OpenVLA-OFT](https://openvla-oft.github.io/) | RSS 2025 | 连续动作表示、L1 回归、并行预测与 Action Chunking | 动作接口和训练配置规定 | 验证直接回归的实用性；性能提升不能全部归因于 Head |
| [$\pi_{0.5}$](https://www.pi.website/blog/pi05) | 2025 | 高层自回归子任务文本 + 低层 Flow Matching Action Expert | 高层→低层的分层推理流程 | 语言决策与连续控制已在同一 VLA 中结合；仍不是任意位置的自由数值切换 |
| [Beyond Language Modeling](https://arxiv.org/abs/2603.03276) | ICML 2026 | 共享 Transformer；文本 CE + 视觉 Flow Matching | 预测 `<BOI>` 触发程序进入 Flow；完成后程序插入 `<EOI>` | **切换机制最明确**；论文附录 B 可以核对训练和推理细节 |
| [When Do Discrete Actions Make Good Continuous Controllers?](https://arxiv.org/abs/2610.20429) | 2026-10 | 受控比较离散/连续、单步回归/迭代 Flow 四种动作预测器 | 主要比较预测参数化，并非自主路由 | 在其设置下离散动作可匹敌甚至超过连续动作；分布因子化错误比量化精度更关键 |

**如何解读这张表：** 前几项回答“能否表示/生成连续值”，中间几项回答“怎样用于机器人动作”，而最后一个问题——**由 Agent 在真实交互中学习何时选择哪种输出机制**——并未被这些工作共同、完整地解决。不能将“具有两个 Head”直接写成“模型已学会自主选择 Head”。

## 3. 最直接的数值方案：xVal 如何使用两个 Head？

[xVal（2023）](https://arxiv.org/abs/2310.02989) 不是为每一个数值增加一个 Token，而是把数字替换为 [NUM] 标记并附带实际标量 $x$。一种核心编码形式为

$$
e(x)=x\,e_{\mathrm{NUM}},
$$

从而直接为**数值输入**提供连续归纳偏置（实际训练需要关注数值规范化、动态范围和 LayerNorm 等影响）。Transformer 输出后具有两个预测分支：

- **Token Head：** 预测普通文本 Token 以及 [NUM] 这样的类型标记；
- **Number Head：** 预测该位置的连续标量，使用 MSE 等数值损失。

生成时可以概括为：

**Text → Token Head 预测 [NUM] → Number Head 输出 $0.023$ → 将这个值连同其类型继续写回序列。**

关键细节是：**它不是拿 Token Head 与 Number Head 的“分数”做直接比较。** 由于分类概率与连续密度不能直接比较，通常由离散的 [NUM] 标记先作模式选择，再读取回归分支。训练时数字位置的 Token 类型和对应数值都有监督。

xVal 的实验主要针对科学数值数据、采用为此修改并训练的模型，尚不能推出“给现成大 VLM 临时加一层就会继承数值能力”。同时也要追问：输出数值是否作为标量信息反馈到后续 Hidden State？若仅把数值转成文本打印，可能丢失此前设计连续通路的部分好处。

## 4. 谢赛宁参与的 Flow 工作：模型究竟如何学会切换？

最适合研究“切换”本身的是 [Beyond Language Modeling: An Exploration of Multimodal Pretraining](https://proceedings.mlr.press/v306/tong26c.html)（ICML 2026，Saining Xie 等），而非简单把所有带 Flow Matching 的模型视作同一种机制。

### 4.1 训练：通过序列边界做已知位置的监督路由

其混合序列包含文本和带有边界标记的视觉 Latents，例如：

> 文本 → `<BOI>` → 一帧连续视觉 Latents → `<EOI>` → 后续文本

训练时视觉区域和文本区域是**已知的**，不需要模型凭空猜一个未知的监督标签。文中使用两类损失：

$$
\mathcal L
=\lambda_{\mathrm{LM}}\mathcal L_{\mathrm{CE}}
+\lambda_{\mathrm{flow}}\mathcal L_{\mathrm{FM}}.
$$

文本位置的 Hidden State 投影到词表 Head，并对下一 Token 计算 CE；`<BOI>` 与 `<EOI>` 之间的视觉位置投影到连续速度场 Head，学习 Flow Matching。视觉 Patch 在同一帧内可双向注意，跨帧/跨文本边界保持相应的因果约束。**训练时路由是根据样本的位置/模态掩码明确规定的**，不是一场两个 Head 的无监督竞争。

### 4.2 推理：模型预测触发标记，程序执行生成模式切换

论文 [附录 B：Modal-switching inference algorithm](https://arxiv.org/html/2603.03276v1) 的流程可以直观写为：

1. **Text mode：** Token Head 按自回归方式产生语言；
2. **触发：** Token Head 预测到 `<BOI>`，推理程序暂停文本采样；
3. **Flow mode：** 程序向上下文插入噪声视觉 Latents，在同一条件上下文中通过 Flow Head 迭代更新；
4. **返回：** 视觉生成完成后，程序插入 `<EOI>` 并恢复文本预测。

论文示例使用 25 步 Euler 采样。**生成图片结束的条件及 `<EOI>` 的插入不是模型在任意时刻自由选择的行为，而是采样程序实现的一部分。**

### 4.3 这与真正的自主路由还差什么？

- **模型学到的：** 在什么语言上下文下预测出“进入某模态”的边界 Token；
- **程序预先规定的：** 某个标记对应什么 Head、如何初始化连续状态、要迭代多少次以及何时返回文本；
- **未直接证明的：** 当同一目标既可以输出离散数字又可以输出连续值时，模型会基于预期误差、计算成本与下游物理结果**自主选择更优表示**。

此外，论文观察到的 MoE **内部专家模态分工**与这里的**最终输出 Head 切换**是不同层面的路由机制，不能混淆。更早的 [Transfusion（2024）](https://arxiv.org/abs/2408.11039) 已经提出文本预测与连续视觉生成联合训练的框架，因此不应把“混合 Head + 模态边界”说成 2026 年才首次实现。

### 4.4 BLIP3-o 和这篇有什么本质区别？

[BLIP3-o](https://arxiv.org/abs/2505.09568) 更像是在已有 VLM 上组织一个条件视觉生成模块，重点研究视觉特征空间、训练顺序以及理解能力是否保留；**它的图像生成任务接口**与 Beyond Language Modeling 通过混合序列、`<BOI>` 和采样程序进行切换的设计不应混为一谈。

对研究兴趣而言，**要学习现成 VLM + 连续生成模块看 BLIP3-o；要学习输出阶段如何从 AR Token 进入 Flow，再回到 AR，看 Beyond Language Modeling 的第 2 节和附录 B。**

## 5. 机器人是很好的压力测试，但不要把动作 Head 等同于 Numeric Head

[$\pi_{0.5}$](https://www.pi.website/blog/pi05) 给出了具有现实意义的分层例子：先自回归生成高层语言子任务，再在该语义条件下用 Flow Matching 的 Action Expert 输出连续动作 Chunk。论文的训练方案包括离散 Token 训练，以及后训练阶段引入连续动作 Expert。

但在这个例子中，**“先想高层子任务、再发低层动作”是模型/系统组织好的执行流程**。它不能直接证明 Agent 已经能在任意语言句子、任意数值字段之间自主选择不同 Head。

如果目标只是输出一个有确定监督值的三维坐标或距离，轻量回归 Head 可能已经足够；如果需要预测多峰、高维、跨时间相关的动作分布，Flow Matching 才更有价值。这两种情形不应混为一谈：

| 连续预测对象 | 应优先考虑的基线 | 使用 Flow Head 的理由 |
|---|---|---|
| 一个距离、时间或置信度标量 | 标准 Token CE、Number Token Loss、标量回归 | 通常不能仅因“数值连续”就证明必要 |
| 三维位置、姿态与少量关节目标 | 带几何度量的回归、预测分布 | 存在明显多解、强相关或复杂不确定性时可能有帮助 |
| 多步机器人 Action Chunk | 并行回归、离散动作预测、离散 Flow、连续 Flow | 对联合多峰轨迹分布、时间相关性进行建模 |

尤其需要注意 [When Do Discrete Actions Make Good Continuous Controllers?（2026-10）](https://arxiv.org/abs/2610.20429)：作者在多组机器人任务中观察到，简单离散 Bin 动作策略在任务成功率上也能达到或超过连续方法，并将关键限制更多归因于跨时间/维度的**独立分布因子化误差**，而不仅是量化精度。因此，本问题不能预设“连续 Head 天然赢过离散 Head”；**公平基线和闭环实验才有决定权**。

## 6. 我更关心什么样的统一 Agent？

在保留通用语言、工具调用和长程推理的同时，可以探索**语言负责决定何事、何时做；数值分支负责需要物理精度的量值**。一种候选表示为：

> 语言：调用移动操作工具 → 目标位置：[NUM, NUM, NUM] → 夹爪：关闭 → Harness 验证并执行 → 获取新观测

这不是“专用机器人 VLA 替换掉通用 Agent”，而是让同一个模型在**工具参数内部**也能生成经过直接数值监督的结果。工具名、字段名与枚举值继续走离散 Token Head；明确的浮点字段可以由 Numeric Head 输出。

### 6.1 三种路由选择

| 方案 | 模型学到了什么 | 优点 | 核心限制 |
|---|---|---|---|
| **A. Schema 决定** | 学习连续字段的值；Harness 按字段类型选 Head | 简单、可校验、利于研究消融 | 模型并未真正选择表示方式 |
| **B. Special Token 决定** | Token Head 学会输出 [NUM]、`<ACTION>` 等触发标记，Handler 激活对应 Head | 与 xVal / Transfusion 机制接近，可混合语言与连续值 | 仍依赖样本格式及明确的切换语义 |
| **C. Learned Router 决定** | 增加路由策略，在若干等价表达/计算模式之间选择 | 研究自主性与成本—精度权衡 | 训练标签、信用分配、可比性和错路由风险更复杂 |

**我倾向的工程起点是 B + A：** 模型通过标记提出连续值，Harness 按工具 Schema 验证类型、单位、坐标系、维度与限幅。它不需要再引入一个单独的 Router 网络，也不会将安全/执行约束交给一个未经验证的浮点 Head。

### 6.2 真正困难的是：数值生成以后怎么办？

假设 Numeric Head 产生 $x=0.023$。后续文本生成仍需要利用这个值：例如估计还差多少距离、判断是否应该观察、改变下一轮动作。如果把 $x$ 只提供给外部机器人，却不把预测值作为**可感知的连续输入**返回模型，那么它容易退化为一次性输出器。

一个候选闭环为

$$
h_t \xrightarrow{\mathrm{token\ head}} [\mathrm{NUM}]
\xrightarrow{\mathrm{numeric\ head}} \hat x_t
\xrightarrow{\mathrm{value\ embedding}} e(\hat x_t)
\xrightarrow{\mathrm{context}} h_{t+1}.
$$

这里的 **value embedding** 可以参考 xVal，但还需要研究范围规范化、量纲与单位编码、预测不确定性、梯度路径以及是否从预测值回传梯度。**这是可讨论的架构假设，不是说当前通用 LLM API 已默认支持这种反馈。**

对姿态/旋转还应考虑 $SO(3)$ 几何；对动作要记录时间尺度和机器人本体约束；对不确定数值可以保留置信区间或分布，而非强行只生成一个点估计。

## 7. “模型自己学会切换”需要怎样的训练信号？

先区分两类截然不同的目标。

### 7.1 SFT 能学会**格式选择**，却未必学会**最佳策略选择**

若每个训练样本明确告诉模型何处用 [NUM]、何处用文本，CE 能教会它复制这种分布；对应连续位置再用回归或 Flow 损失：

$$
\mathcal L_{\mathrm{base}}
=
\mathcal L_{\mathrm{CE}}(m,w)
+\lambda_{\mathrm{num}}\,\mathbb{1}[m=\mathrm{num}]\,\mathcal L_{\mathrm{numeric}}
+\lambda_{\mathrm{flow}}\,\mathbb{1}[m=\mathrm{flow}]\,\mathcal L_{\mathrm{FM}}.
$$

这里 $m$ 是训练序列中**已知的输出类型标签**，两种指示函数确保缺乏对应监督的位置不错误更新专用 Head。上式是一般化的研究设计，不是任何一篇论文的原样损失公式。

但如果同一个答案既允许以文本数字输出，也允许以 Numeric Head 输出，SFT 标签中的格式偏好可能只是标注者或数据生成程序的偏好。它无法自动告诉模型“哪种选择更准确、更省计算”。

### 7.2 真正的策略学习必须定义**路由的价值**

可以把输出方式 $m\in\{\text{text},\text{numeric},\text{flow}\}$ 看作策略动作，让模型根据上下文选择 $m$，随后由对应 Head 生成输出。理想目标应考虑端到端任务收益与成本：

$$
\max_\pi\;\mathbb E\left[
R_{\mathrm{task}}
-\alpha C_{\mathrm{latency}}
-\beta C_{\mathrm{compute}}
-\gamma C_{\mathrm{invalid}}
\right].
$$

其中 $C_{\mathrm{invalid}}$ 可以包含违反 Schema 的字段、超限动作、单位错误等；机器人还应把安全约束作为**不可妥协的执行条件**，不能仅以一个可抵消的奖励惩罚代替安全保障。

**这仍是待验证假设。** 对同一个任务的反事实路由结果很难同时观察；例如某一次使用回归 Head 成功，不意味着改用文本 Head 就一定失败。需要随机化受控比较、可验证数值标签、成本测量和任务反馈，避免把“学会模仿切换符号”错误地宣称为“学会最优切换”。

### 7.3 不应强迫模型在所有数值位置都自主探索路由

通用 Agent 的部分字段有明确语义：布尔值/枚举值应是离散的；需要可审计的对外回答可以使用文本；连续物理量适合精度感知预测。**自主路由只应该在确实存在多个有效候选表示、且可以评价优劣的场景中进行。** 否则人为增加 Router 只是额外复杂度与错误来源。

## 8. 怎样做一组能真正回答问题的实验？

### 阶段 I：固定模型与数据，先检验 Numeric Head 本身

同一批有可信数值标签的样本（距离、坐标、姿态、时间估计），用同一个视觉/语言主干与训练/计算预算比较：

1. **Float 文本 + CE**；
2. **Float 文本 + Number Token Loss**（不增加 Head 的强基线）；
3. **[NUM] + Scalar/Vector Regression Head**；
4. **[NUM] + Value Embedding 反馈到后续上下文**。

报告 MAE/RMSE、距离与方向误差、未见数值范围泛化、单位等价性、文本任务质量、数值 Token 数及端到端时延。**额外 Head 容量和训练数据量必须记录**，否则差异不能归结为连续表示。

### 阶段 II：同一架构，对比路由究竟有没有“学会”

在相同样本可用两种表示的条件下，比较：

- **固定 Schema 路由**（A）；
- **SFT Special Token 路由**（B）；
- **带成本/正确率反馈的可学习路由**（C）；
- **Oracle 路由上界**：利用真值或离线两路评测信息选择（仅用于评估，不能在部署时偷看答案）。

不仅要记录 Head 选择准确率，还应报告**同一输入下不同 Head 的反事实性能、路由后质量、失配率、延迟、计算消耗以及未见 Schema 泛化**。如果训练只是复现预先写好的格式标签，就不应称为“自主优化”。

### 阶段 III：在闭环 Agent 与机器人任务中验证实际价值

对工具参数和动作生成，在相同机器人、本体状态、动作时长及训练预算下比较文本浮点数、标量 Bin、Numeric Head、回归 Action Chunk、连续 Flow 和离散 Flow。跨任务保持相同动作表达能力与安全检查。

重点看：任务成功率、预测误差、工具参数合法性、重试次数、闭环延迟、推理成本、未见机器人/采样频率/坐标系，以及模型能否**根据执行反馈修正后续数值预测**。

**可以证伪的预测：** 如果联合的连续数值通路与 learned routing 真有独立价值，应在固定预算下改善任务正确率—时延的 Pareto 前沿，并在数值扰动、未见场景和跨本体迁移中保持收益。如果简单 Number Token Loss、固定 Schema + MLP 或离散 Flow 已达到相同效果，那么复杂的自主路由未必值得引入。

## 9. 当前判断：研究空间到底在哪里？

**已被覆盖的部分：** 带 Numeric Head 的语言模型（xVal）、联合训练语言 CE 与连续视觉生成（Transfusion、Beyond Language Modeling）、VLM 加连续生成模块（BLIP3-o），以及 VLA 联合高层语言和低层连续动作（$\pi_0$、$\pi_{0.5}$）都已经有明确先例。仅仅声称“提出离散 Token Head + 连续 Head”，不足以构成令人信服的新贡献。

**仍然值得探索的部分：** 让通用 Agent **以统一的上下文表示在输出格式、数值精度、反馈可复用性、工具执行成本、计算成本之间作出任务相关选择**；并明确区分数据格式监督、固定推理状态机和基于环境反馈学得的模式决策。这条路线具有研究价值，但必须先通过上述对照证明简单方案不足。

我更赞成**先把通用 Agent 的结构化工具参数做对，再考虑大规模 Flow Head**：语言 Head 决定工具和离散控制逻辑；Scalar/Vector Numeric Head 负责精确字段；Harness 做类型、单位和物理边界验证；只有在复杂、多峰的动作轨迹确实需要时，才启用 Action Flow Head。对于真正由模型自行决定的路由，应把它当成一个**单独需要证明的学习问题**，而不是架构的默认优点。

## 建议优先精读的原始资料

| 阅读优先级 | 资料 | 重点 |
|---|---|---|
| 精读 | [xVal：论文第 2 节](https://arxiv.org/abs/2310.02989) | Number Embedding、Token Head + Number Head、[NUM] 的预测与回填 |
| 精读 | [Beyond Language Modeling：第 2 节与附录 B](https://arxiv.org/html/2603.03276v1) | 模态序列、Loss Mask、[BOI]/[EOI] 触发的 Flow 切换、状态机边界 |
| 精读 | [When Do Discrete Actions Make Good Continuous Controllers?](https://arxiv.org/abs/2610.20429) | 离散/连续、单步/Flow 四组公平对照与反例 |
| 细读 | [Regress, Don't Guess（ICML 2025）](https://proceedings.mlr.press/v267/zausinger25a.html) | 不增加 Head 时，离散数字如何获得距离敏感训练信号 |
| 细读 | [$\pi_{0.5}$ 官方说明与论文](https://www.pi.website/blog/pi05) | 高层语言与低层连续 Action Expert 的训练、执行边界 |
| 按需 | [Transfusion](https://arxiv.org/abs/2408.11039) · [BLIP3-o](https://arxiv.org/abs/2505.09568) · [OpenVLA-OFT](https://openvla-oft.github.io/) | 多模态混合生成的来源、现成 VLM 添加视觉生成、直接回归的工程基线 |

> **证据边界：** 论文使用不同的任务、模型规模和训练预算，不能将其数值直接横向排名。本文的 Unified Agent 和 Learned Router 部分是研究设想，**并不声称已有实验证明它优于既有体系**。本文只维护当前完整的研究认知；历史变更留给 Git。
