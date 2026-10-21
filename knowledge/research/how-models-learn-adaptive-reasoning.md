---
title: "如何让模型学会自适应推理"
questionTitleEn: "How Can Models Learn Adaptive Reasoning?"
publicQuestion: true
questionKind: "interest"
questionDate: "2026-10-21"
categories: ["强化学习与 Agent", "推理模型与推理时计算"]
summaryZh: "从固定 CoT、条件化 Thinking、推理长度与预算分配，到跨轮推理和闭环 Agent 的元决策：梳理代表研究、证据与局限。个人更认可让模型在真实交互反馈下学习何时继续行动、何时观察、何时重新思考，并以任务收益与实际成本共同衡量，而非长期依赖人工阈值。"
questionSummaryEn: "A literature-based overview of adaptive reasoning, from hybrid thinking and compute budgets to cross-turn reasoning and interactive metareasoning. The approach I find most compelling is learning when to act, observe, or rethink from closed-loop outcomes and real costs."
---

# 如何让模型学会自适应推理

> **兴趣综述 · 2026-10-21。** 这是我对一条技术路线的兴趣、阅读整理与个人判断，**不是声称提出了一个无人研究的科学问题，也不是已经完成的实验或方法**。文中的“已有证据”来自公开论文和官方文档；“我更认可的方向”是研究品味与后续实验构想，并非被证明最优的方案。

## 1. 我为什么对这个方向感兴趣？

一个高效的 Agent 不应该把“做动作之前写一大段 CoT”当作硬性流程，也不应该为了减少 Token 而永远不重新思考。对于任务明确、执行顺利的时刻，继续行动可能更好；对于状态突变、工具失败、信息不足、计划失效的时刻，重新推理可能避免代价高昂的错误。

我想理解的，不只是**怎么少生成 Thinking Token**，而是模型能否形成一种随状态变化的元认知能力：知道何时调用更多计算、何时停止思考、何时检查环境，以及何时修正既有策略。

注意，这一主题**已经有大量前作**，不是待人首次提出的空白。较新的 Claude 产品能力也表明，按需推理并非一定需要外部固定 Think–Act 模板；但闭源产品公开了接口行为，并没有公开完整训练配方。

## 2. 先分清五个常被混淆的概念

| 维度 | 具体在决定什么 | 例子 |
| --- | --- | --- |
| 是否推理（reasoning mode） | 直接回答/行动，还是先生成显式推理 | NoThink / Think |
| 推理深度（reasoning depth） | 推理一次要花多少 Token、步骤或搜索深度 | Short / Medium / Long |
| 推理时机（reasoning timing） | 多轮环境交互中，哪一轮值得重新规划 | 继续原计划 / 重新规划 |
| 推理位置（interleaving） | 能否在工具结果之后再进行推理 | Think → Tool → Observation → Think → Tool |
| 计算资源分配（compute allocation） | 不同请求、阶段、工具、候选路径之间如何分配预算 | 更多采样 / 验证 / 搜索 / 观察 |

**CoT 不等于工具调用。** CoT 是模型生成的推理内容；工具调用是有结构的外部动作，可能改变环境或带来新证据。一次工具调用前没有显式 CoT，也不代表模型完全没有进行内部计算。把这些概念混在一起，会让节省 CoT Token、降低总时间和提升任务能力被错误地当成同一种贡献。

### Claude 的 Adaptive Thinking 与 Interleaved Thinking

- **Adaptive Thinking**：模型根据当前请求选择是否产生显式 Thinking，以及推理到什么程度。API 的 effort 是对推理深度的软性指导，不是逐步强制触发器。
- **Interleaved Thinking**：模型在同一个工具调用循环中，拿到中间工具结果后还能够继续 Thinking，再决定后续工具或答案。
- **二者正交**：交错推理允许推理发生在工具调用之间，并不要求每次 Tool Call 前必须显式 Think。Adaptive Thinking 才涉及“是否值得投入推理”。同一次 Assistant Turn 可以包含多次 tool_use/tool_result 循环。
- **边界**：这些是官方公开的推理和 API 行为，**不是**对 Anthropic 内部训练算法的证据。

官方文档：[Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) · [Steering thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) · [Extended / interleaved thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)。

## 3. 技术路线如何演进？

### 路线 A：固定模板、手写条件与推理预算

最早的 ReAct 风格通过 Thought–Action–Observation 交替组织 Agent。它提供了可解释的交互接口，但**不意味着今天所有 Agent 每轮都必须产生 CoT**。在工程实现中，可以用“每 N 步重新规划”“失败后重新规划”“高不确定性时加大预算”等启发式规则。优点是简单、成本可控、可解释；缺点是阈值难跨任务迁移，环境变化和动作风险未必能由单个统计量识别。

参考：[ReAct](https://arxiv.org/abs/2210.03629)（2022/ICLR 2023）；[A Survey of Adaptive and Controllable Test-Time Compute](https://arxiv.org/abs/2507.02076)（2025）。

### 路线 B：SFT / 蒸馏教模型选择 Think 与 NoThink

通过构建有推理、无推理、短推理的数据，使模型从输入模式中学习选择。通常可做轻量冷启动，甚至将模式作为首个输出 Token。但如果标签来自教师的偏好、长度、难度代理或单步答案一致性，模型可能只学会**对常见题型套用模式**，不一定具有可靠的跨轮决策价值判断。

例子：[KAT-V1 / Kwai-AutoThink](https://arxiv.org/abs/2507.08297)（2025）使用混合模式数据、知识蒸馏、初始化与后续 RL。KAT 并非只有 SFT，但很好地体现了此路线从数据到训练的完整闭环。

### 路线 C：通过 RL 学会是否推理、推理多长

这是**已经存在、而且相当成熟的一条路线**：

- [AdaptThink: Reasoning Models Can Learn When to Think](https://arxiv.org/abs/2505.13417)（2025）：用带约束的 RL 让模型在 Thinking 与 NoThinking 间选择，采用 importance sampling 防止模式探索失衡；在公开实验中的小模型数学任务上减少平均输出长度。
- [AdaCoT: Pareto-Optimal Adaptive Chain-of-Thought Triggering via Reinforcement Learning](https://arxiv.org/abs/2505.11896)（2025）：围绕任务表现与 CoT 调用成本优化 Pareto 权衡，用 selective loss masking 缓解触发模式坍缩。
- [Think Only When You Need with Large Hybrid-Reasoning Models](https://arxiv.org/abs/2505.14631)（2025）：Hybrid Fine-Tuning 后进行在线 Hybrid Group Policy Optimization，让模型从任务反馈中学习使用哪种推理模式。
- [KAT-V1](https://arxiv.org/abs/2507.08297)（2025）：混合数据、冷启动与 Step-SRPO 结合，强调模式选择和回答表现的联合学习。
- [Learning When to Think: Adaptive Reasoning for Test-Time Compute Allocation](https://arxiv.org/abs/2608.20256)（2026）：直接在输出开头选择 NoThink / Short / Long，用 GRPO 加模式相关的长度激励与上限训练，不需要独立 router；主要在数学任务中验证。
- [Adaptive Test-Time Compute Allocation via Constrained Policy Optimization](https://arxiv.org/abs/2604.14853)（2026）：把问题表示为准确率—预算约束，在离线阶段求解各样本的计算配置，再学习轻量选择器；更像带预算的路由而非闭环自我调整。

**这条路线解决了很多“单个问题该思考多久”的问题。** 不能把“用 GRPO 训练 Think/NoThink”重新命名就声称是新研究。但单轮数学题的最优推理模式不等于长时 Agent 中每一步的最优思考时机。

### 路线 D：跨轮推理复用与冗余删除

[RACE: When Should Agents Think? Adaptive Reasoning via Cross-Turn Estimation](https://arxiv.org/abs/2610.12061)（2026）试图从历史推理覆盖后续动作的角度删掉冗余 CoT。其 LoGiC 检查的是**在固定原轨迹中删去推理后，原始动作的条件 log-likelihood 是否明显下降**，据此合成 SFT 数据，并结合在线 GRPO 训练。

它的实际价值是降低推理 Token，尤其适合重复工具操作。但不能把原始 Action 的似然稳定直接等同于“这段推理对最终成功无影响”：

1. 删除后的 Agent 未必沿原始动作轨迹运行，后续 Observation 可能分叉。
2. 推理可能只在少见异常状态下体现价值，成功轨迹无法充分说明。
3. 节省 Token 可以来自**每轮推理变短**，不全是“跳过推理轮次”。

我认可**跨轮知识不需要机械重复**；对“以原动作 likelihood 判定推理价值”，我保留明显的怀疑。更应该比较从相同状态分别使用 Think / NoThink 出发的独立闭环结果。

### 路线 E：让 Agent 在环境交互中决定什么时候规划

这条路线和我的兴趣最接近，但同样已有明确先例：

**[Learning When to Plan: Efficiently Allocating Test-Time Compute for LLM Agents](https://arxiv.org/abs/2509.03581)**（2025）已经提出：规划、继续执行，以及何时重规划，应考虑规划带来的未来任务收益、计算成本和计划漂移（plan drift）。它先通过 SFT 教给模型多样化的规划行为，再用交互式 RL 优化任务回报与规划成本。在 Crafter 等环境中，比固定频率规划更有效。**因此“通过 RL 学何时重新规划”本身并不是新点。**

**[When to Plan: Learning to Select Between Reactive Control and Deliberative Planning](https://arxiv.org/abs/2607.16421)**（2026；2026-10 修订）进一步以 RL 训练 meta-policy，在 reactive controller 与不同计算深度的 planner 之间选择，优化考虑行动与规划时间的任务回报。在若干导航与操作环境中，它优于固定计算策略。但它还依赖专门的 meta-policy 与手工设计的状态/不确定性特征，作者也指出高维视觉表示与泛化问题。

这两个工作已经覆盖了**计划失效、反应控制与重规划、计算成本的联合权衡**。真正想向前推进，必须面对更开放的工具 Agent、视觉观察、状态估计、错误恢复和复杂风险，而不是只提出“再规划的触发器”。

### 路线 F：动态分配搜索、验证和采样预算

不是所有额外计算都必须变成更长的 CoT。[Adaptive Test-Time Reasoning via Reward-Guided Dual-Phase Search](https://arxiv.org/abs/2509.25420)（2025）把规划与执行区分，在搜索中通过奖励反馈动态分配计算。[What If We Allocate Test-Time Compute Adaptively?](https://arxiv.org/abs/2602.01070)（2026）讨论训练免、模块化验证下的自适应推理预算。

重要启发：真正的元决策可能是“多想一会儿”“看一次环境”“运行一个测试”“验证一个候选”“直接执行”之间的选择，而不只是生成多少 Thinking Token。

## 4. 一张表看清代表工作和证据边界

| 工作 | 自适应对象 | 主要学习信号/机制 | 目前不能直接推出的结论 |
| --- | --- | --- | --- |
| AdaptThink（2025） | Think / NoThink | 约束 RL、模式采样 | 已学会长时环境中的重规划 |
| AdaCoT（2025） | CoT 触发率与成本 | PPO、Pareto 权衡、SLM | 所有工具场景都能泛化 |
| Hybrid-Reasoning Models（2025） | 混合推理模式 | HFT + 在线 HGPO | 显式推理次数等于决策质量 |
| KAT-V1（2025） | 自动选择推理模式 | 数据合成、蒸馏、Step-SRPO | 公开了任何闭源模型的内部训练流程 |
| Learning When to Plan（2025） | 跨轮规划/重规划 | SFT 初始化 + 环境 RL + 成本 | 已解决开放工具、视觉、机器人场景 |
| Adaptive Compute via CPO（2026） | 每题计算预算 | 拉格朗日约束 + 模式选择器 | 无需状态反馈的路由器能处理计划失效 |
| When to Plan（2026） | Reactive 与规划深度选择 | 元策略 RL | 手工元特征自动迁移到任意 Agent |
| Learning When to Think（2026） | NoThink / Short / Long | GRPO + 模式成本约束 | 数学题的 mode selection 等于跨轮元推理 |
| RACE（2026） | 跨轮删除 CoT | 参考动作 likelihood + SFT/GRPO | 似然不变等于反事实任务价值不变 |

文献里的“成本”也各不相同：有的是输出 Token，有的是调用频次或规划深度，有的是包含环境步数和计算开销的回报。**跨论文不能只比较节省比例，而不比较基线、成功率、评估协议与端到端成本。**

## 5. 我更认可的路线：闭环学习的自适应推理

先讲清楚：这部分是**基于现有工作的方法偏好**，不是未经验证的原创贡献声明。

我更倾向于让**同一个 Agent 通过环境反馈学习元决策**，而不是在部署时长期依赖固定的 uncertainty、likelihood 或 Token 数阈值。元决策应把继续执行、获取新观测、重新规划及不同深度的推理放在同一个权衡空间里。

### 5.1 目标是决策价值，而不是还原原始动作

令历史 $h_t=(o_{\le t},a_{<t},g)$ 包括观测、动作与目标。一个概念化的元行动集合为：

$$
z_t\in\{\mathrm{ACT},\ \mathrm{OBSERVE},\ \mathrm{THINK}_{short},\ \mathrm{THINK}_{deep},\ \mathrm{REPLAN}\}.
$$

这里 **ACT 仍然包含真正的机器人或工具动作决策**，OBSERVE 代表主动获取新信息；THINK/REPLAN 则消耗额外推理计算。不同系统可能把这些操作编码为自然语言、专门 Token 或工具调用；**不要求实际接口必须使用这五个固定标签**。

一个合理的目标是优化完整闭环轨迹的收益减去**实际成本**：

$$
J(\theta)=
\mathbb E_{\tau\sim\pi_\theta}
\left[
R_{\mathrm{task}}(\tau)
-\lambda_{\mathrm{compute}}C_{\mathrm{compute}}(\tau)
-\lambda_{\mathrm{tools}}C_{\mathrm{tools}}(\tau)
-\lambda_{\mathrm{time}}C_{\mathrm{latency}}(\tau)
\right].
$$

其中 $R_{\mathrm{task}}$ 是最终任务表现；Token、工具代价和延迟可以分别测量。真实机器人还必须采用执行层硬安全约束，**不能靠一个可以被任务奖励抵消的碰撞罚分保证安全**。

这个目标不直接告诉模型何时该 Think；它只让额外计算在**实际帮助完成任务**时值得付费。这与 Learning When to Plan 的成本敏感 RL 思路一脉相承，并非从零提出。

### 5.2 我理想中的学习流程

**阶段一：提供行为覆盖，而非人为定义“正确触发器”。** 在安全可重复的环境中采样多种轨迹：无需重新规划的顺利执行、工具失败、环境变化、计划漂移、主动观察、短推理和深推理。可使用 SFT 做最低限度的格式与行动能力冷启动，避免初期 RL 只学会无效调用。

**阶段二：交互式 RL 联合学习动作和推理时机。** 模型真实执行行动、得到下一次 observation，再由可验证的任务反馈和真实执行成本优化策略。算法上可以使用适合自回归工具 Agent 的策略梯度/GRPO/PPO，但不应把选用某个优化器视为科学贡献。

**阶段三：只在训练/分析时做少量成对反事实测试。** 从同一可重置环境状态分别运行 Think 与 NoThink（或不同预算）策略，观察后续动作、最终成功率、恢复能力和开销。此处的反事实是**实测两个分支结果**，不能用对原始动作打 likelihood 冒充。

**阶段四：测试泛化，而非只看平均省钱。** 在未见任务、长轨迹、外部干扰、状态延迟、失败工具和不同风险场景中测试；尤其检查模型是否在“看似简单但错误很贵”的时候也盲目跳过推理。

### 5.3 为什么我不想把手写触发规则当最终答案？

人写的规则可以作为强基线、安全兜底或冷启动，但未必能反映任务实际价值：

- **高不确定性不一定值得深推理**：模型可能只需再观察一次。
- **低不确定性也可能值得验证**：一个自信但不可逆的危险动作需要额外检查。
- **动作 likelihood 高不代表动作安全**：模型可能自信地重复错误步骤。
- **生成更长 CoT 不一定更好**：思考可能产生无用循环，甚至导致计划漂移。

因此，与其指定 $\text{uncertainty}>c$ 才触发 THINK，我更希望通过任务反馈学习**哪个时刻、哪种附加计算、在什么成本下真正改善了结果**。但这只是更值得尝试的方向；强启发式或独立 router 也可能在相同预算下表现一样好。

### 5.4 真正困难的不是写出奖励公式

1. **归因困难**：一次重新规划是否有价值，可能要在十几步后才能看到；终局奖励稀疏，会导致元动作的信用分配很难。
2. **模式坍缩**：若惩罚计算过强，模型可能永远不思考；过弱则永远深推理。需要预算扫描、策略熵/探索控制和真实成功率验证。
3. **观测与推理是不同成本**：读取环境、调用工具与生成 CoT 的延迟不能简单按 Token 等价。
4. **反事实成本高**：从同一状态反复运行多个分支需要环境快照/重置，真实机器人上尤其昂贵；选择性采样可能是务实折中。
5. **安全不可由探索奖励兜底**：现实环境中，碰撞、危险动作和硬件边界应由外部验证和执行层控制。
6. **训练规模与可迁移性**：小型网格世界学到的重规划时机，未必迁移到视觉工具 Agent 或接触密集的机器人任务。

## 6. 我会怎么验证一套方法真的有价值？

不急着开发复杂算法，先做能推翻自己想法的实验。

### 控制变量与基线

同一个基础模型、同样的工具接口、任务分布和评估环境，比较：

1. 永不显式推理 / 每轮显式推理 / 固定间隔推理。
2. 简单规则（错误触发、状态变化、uncertainty、预算阈值）与固定推理深度。
3. 独立 mode/router 模型（按预算监督）和纯 SFT 的模式标签学习。
4. AdaptThink/KAT 风格的模式 RL、Learning When to Plan 风格的交互 RL，以及 RACE 风格的跨轮筛选（若能复现）。
5. 同一个 Agent 联合学习**行动 + 是否观察/推理/重新规划**；每个组件单独做消融。

在**相同总计算预算、训练数据量、环境交互次数和工具成本**下汇报；若不能完全匹配，必须明确列出差额，而不只对齐训练 step。

### 关键指标

- **主要结果**：独立未见任务的闭环成功率 / 任务回报。
- **效率**：Thinking Token、实际推理延迟、Prefill、工具调用次数、端到端耗时及预算超标率。
- **鲁棒性**：状态扰动、动作失败、错误恢复、不可逆错误率、错误地跳过必要推理的比例。
- **决策解释**：在什么状态选择了 ACT / OBSERVE / THINK / REPLAN？是否真的随风险和计划失效改变？
- **统计可信度**：多个随机种子、置信区间，比较成功率—实际成本的 Pareto 前沿。

### 最值得做的反事实对照

从相同状态分别运行 **有新一轮推理** 和 **不产生新一轮推理** 的独立后续轨迹。不能把后续真实 observation 固定成原轨迹，否则只是在测原动作的可预测性，而不是测“思考是否带来任务价值”。

若学习策略不能显著超越简单的“失败后重规划”或“固定间隔规划”，在同成本下也不能提高成功率/恢复能力，那么更复杂的元学习就不值得继续投入。

## 7. 我的当前判断与阅读优先级

**结论一：自适应推理已经是成熟研究方向。** 尤其单轮 Think/NoThink 和混合推理训练，2025 年就有多条公开路线；Claude 的产品接口证明这种行为也具有实际应用价值，但不揭示内部算法。

**结论二：只减少 Thinking Token 不是我最关心的目标。** 成功率保持不变的成本压缩是有用的系统优化，但它并不自动证明 Agent 真正理解了什么时候思考有价值。

**结论三：我最认可“在线环境反馈 + 成本敏感元决策 + 闭环检验”。** 但 Learning When to Plan（2025）和 When to Plan（2026）已经覆盖核心思想；值得继续学习的是它们在环境反馈、信用分配、计划漂移和 compute-aware policy 上的具体设计，以及它们未解决的泛化边界。

推荐阅读顺序：

| 优先级 | 文献 | 重点读什么 |
| --- | --- | --- |
| **精读** | [Learning When to Plan](https://arxiv.org/abs/2509.03581) | 理论框架、Plan Drift、SFT→RL、规划成本与策略收益 |
| **精读** | [When to Plan: Reactive vs Deliberative](https://arxiv.org/abs/2607.16421) | Meta-policy、成本敏感的 RL、手工特征与消融 |
| **精读** | [RACE](https://arxiv.org/abs/2610.12061) | LoGiC 的具体概率代理、真正做过与没做过的反事实 |
| **细读** | [AdaptThink](https://arxiv.org/abs/2505.13417) · [Hybrid-Reasoning Models](https://arxiv.org/abs/2505.14631) | 从在线奖励学 Think/NoThink；模式坍缩与训练配方 |
| **细读** | [KAT-V1](https://arxiv.org/abs/2507.08297) · [AdaCoT](https://arxiv.org/abs/2505.11896) | 冷启动数据、模式监督、选择性 loss、成本约束 |
| **了解** | [Learning When to Think](https://arxiv.org/abs/2608.20256) · [Compute Allocation via CPO](https://arxiv.org/abs/2604.14853) | 三档深度、首 Token 选择与预算路由 |

最后保留一个开放判断：在大型通用 Agent 中，**学会何时思考**可能不只是输出路由问题，而是具有“行动—观察—推理—验证”多种操作的长期决策问题。我对此持续感兴趣，但并不把它误称为尚未被研究的全新主张。

## 参考资料（原始论文与官方文档）

1. [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)（2022/2023）。
2. [AdaptThink](https://arxiv.org/abs/2505.13417)（2025）。
3. [AdaCoT](https://arxiv.org/abs/2505.11896)（2025）。
4. [Think Only When You Need with Large Hybrid-Reasoning Models](https://arxiv.org/abs/2505.14631)（2025）。
5. [KAT-V1: Kwai-AutoThink Technical Report](https://arxiv.org/abs/2507.08297)（2025）。
6. [Learning When to Plan](https://arxiv.org/abs/2509.03581)（2025）。
7. [A Survey of Adaptive and Controllable Test-Time Compute](https://arxiv.org/abs/2507.02076)（2025）。
8. [Adaptive Test-Time Reasoning via Reward-Guided Dual-Phase Search](https://arxiv.org/abs/2509.25420)（2025）。
9. [Adaptive Test-Time Compute Allocation via Constrained Policy Optimization](https://arxiv.org/abs/2604.14853)（2026）。
10. [When to Plan: Learning to Select Between Reactive Control and Deliberative Planning](https://arxiv.org/abs/2607.16421)（2026）。
11. [Learning When to Think](https://arxiv.org/abs/2608.20256)（2026）。
12. [RACE: When Should Agents Think?](https://arxiv.org/abs/2610.12061)（2026）。
13. [Anthropic — Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)；[Adaptive Thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)；[Extended / Interleaved Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)（官方产品文档，版本会更新）。
