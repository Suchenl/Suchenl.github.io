---
contentType: exploration
domains: ["大模型与强化学习/推理与 Agent 系统","大模型与强化学习/后训练与策略优化"]
featuredOrder: 40
title: "如何让模型学会自适应推理"
questionTitleEn: "How Can Models Learn Adaptive Reasoning?"
publicQuestion: true
questionKind: "interest"
questionDate: "2026-10-21"
categories: ["强化学习与 Agent", "推理模型与推理时计算"]
summaryZh: "为什么自适应推理影响 Agent 的固定预算有效产出与机器人在线时延？梳理 SFT、成本敏感 RL、步骤级信用分配、反应—规划切换的最新研究；区分真正学会思考时机与仅减少 CoT，并讨论有限推理机会能否促进参数化直觉的待验证假设。"
questionSummaryEn: "A critical survey of SFT, cost-aware RL, reasoning credit assignment, adaptive planning and robot latency. Tests the distinction between shorter CoT and genuinely learned, transferable parametric intuition."
---

# 如何让模型学会自适应推理

> **兴趣综述 · 2026-10-21。** 这是我对一条技术路线的兴趣、阅读整理与个人判断，**不是声称提出了一个无人研究的科学问题，也不是已经完成的实验或方法**。文中的“已有证据”来自公开论文和官方文档；“我更认可的方向”是研究品味与后续实验构想，并非被证明最优的方案。

## 1. 为什么这个问题重要？

**自适应推理的目标不是让模型少思考，而是让模型学会最高效地思考。** 高效不等于牺牲性能，更不等于在单次回答里机械地少输出几个 Thinking Token。我更关心的是：**在相同的在线时长与 Token 消耗预算下，Agent 能否完成更多有质量、可验证的任务？** 如果一次推理能解决后续一连串决策，减少重复思考就能把有限的计算与时间让给真正困难的状态、更多任务或必要的验证。

### 1.1 推理效率应该按有效产出衡量，而非只数 CoT Token

一轮复杂 Agent 的时间至少包含输入 Prefill、推理和动作生成、工具执行、环境响应、等待与失败重试。把某一步的 CoT 砍掉，可能降低本轮延迟；但若导致操作出错、重试增多甚至任务失败，全程反而更慢。因此我更认可在**固定的端到端预算**下比较策略，而不是只看平均推理长度：

$$
\max_{\pi}\ \mathbb E\!\left[N_{\mathrm{verified}}(\pi;B_{\mathrm{time}},B_{\mathrm{tokens}})\right],
\qquad
\text{s.t.}\ T_{\mathrm{wall}}\le B_{\mathrm{time}},\;
N_{\mathrm{tokens}}\le B_{\mathrm{tokens}}.
$$

这里 $N_{\mathrm{verified}}$ 是**满足质量门槛的完成任务数**，而不是文字输出数量；真实部署还应单独约束安全、错误率与任务成功率。一个很自然的目标是改善**任务完成率—端到端延迟—Token/计算开销**的 Pareto 前沿：同成本完成更多任务，或同样的任务质量花费更少成本。

对于数学题，额外思考可能提升正确率；对于工具 Agent，额外思考可能防止错误调用，也可能只是重复上一轮计划。关键是让模型自己知道何时新的 deliberation 值得付出代价。

### 1.2 机器人尤其需要把推理速度视为应用价值的一部分

机器人不是离线问答：**机器人和环境在持续变化。** 如果高层决策依赖 VLM/LLM，而它每次生成动作前都需要漫长的语言 CoT，就会增加闭环延迟，使相机观测变旧、动作反馈滞后、接触状态变化后才做出决策。即使离线任务成功率不错，在线执行频率和响应时间仍可能限制部署价值。

当然，不应要求语言模型接管电机控制器的每一个高频伺服周期。合理的系统通常需要低层控制维持稳定与安全，高层 Agent 在合适的**决策时间尺度**上做观察、规划和工具动作。但**高层决策时间同样是实际约束**：简单、熟练、低风险的局部操作应尽可能迅速地执行；只有在环境突变、结果与预期不符或关键不可逆操作前，才值得花额外时间分析、检查和重规划。

这使自适应推理不只是推理成本优化，还影响 Agent 的任务吞吐、交互流畅性和机器人在真实世界中的可用性。**最低 Token 不必然是最优策略；恰当时机的额外推理可能换来更高的整体效率。**

### 1.3 我的假设：有限推理机会，可能反而促进更强的直觉与规划

我有一个更进一步、**尚待验证**的假设：如果训练中不允许模型依赖每一步漫长的 CoT，而是在保证任务反馈真实、允许关键时刻重新思考的条件下，限制不必要的显式推理次数，模型可能被迫学习两种互补的能力。

**其一：将反复获得的经验转化为参数化直觉（parametric intuition）。** 熟练动作不再需要每次从头展开一遍语言推理，而是从当前观测和目标中快速产生适当的行动。例如，机器人在大量成功/失败的交互反馈后，能够直觉式地识别普通移动、对准、夹爪开合等常见操作，而将显式推理留给新任务、异常反馈和高风险状态。这里的“直觉”不是宣称模型真的拥有人的无意识，而是指**通过训练形成的、无需长显式 CoT 仍能泛化的状态—行动能力**。

**其二：因为推理机会有代价，模型可能学会更珍惜重要的思考节点，从而在行动前做更有效的规划。** 当不能每一步都用一段新 CoT 修补上一段草率计划时，它可能更愿意在任务阶段切换、重要工具操作、风险判断前组织一个能够支撑后续执行的方案。理想结果不是一味提前多想，而是**少量高价值规划 + 多步可靠执行 + 必要时及时重规划**。

这让我联想到人类技能学习中的从费力思考到熟练自动化的现象。你可以从[这篇科普：《为什么大脑“练得越多，想得越少”？》](https://news.qq.com/rain/a/20250611A02V0N00)获得直观启发；但它只是**生物学习的类比**，不能证明语言模型必然存在同样神经机制或训练规律。更贴近“思考的成本是否值得”的原始研究是 [Jensen et al., *A recurrent network model of planning explains hippocampal replay and human behavior*（Nature Neuroscience, 2024）](https://www.nature.com/articles/s41593-024-01675-7)：其模型允许学习何时花时间进行内部规划。它也**不能直接证明限制 LLM CoT 会产生参数化直觉**。

目前与假设相近、但证据仍不充分的模型研究包括：

- [*Scaling Competence, Shrinking Reasoning*（2025）](https://www.microsoft.com/en-us/research/publication/scaling-competence-shrinking-reasoning-cognitive-signatures-in-language-model-learning/)：观察到某些任务微调过程中，模型能力增长后显式推理长度反而下降，提示推理可能是学习脚手架，而非每次执行都必需。**但观察到变短，不等于证明“限制次数导致内化”。**
- [*ConPress*（ICML 2026）](https://proceedings.mlr.press/v306/deng26m.html)：通过多问题的上下文压力诱发更短而正确的推理，再用这些样本训练模型，在数学基准上压缩推理长度且保持竞争力。**但这不是机器人闭环直觉或长程规划能力的证明。**
- [*Learning When to Plan*（2025）](https://arxiv.org/abs/2509.03581)：通过环境奖励及规划成本训练何时继续行动、何时重新规划。它更接近“珍惜推理机会”的交互式视角，说明**学习规划时机本身已有先例**。

**这里必须区分“限制推理”与“学会直觉”：** 如果只在推理阶段压低 Token 上限、关闭 Thinking 或写一条“不要思考”的 Prompt，而**没有更新模型权重**，它并不会因此把新经验写进参数。想验证参数化直觉，需要在 SFT、蒸馏或交互式 RL 等**真正更新参数**的训练过程中，让模型从反馈中学会何时直接行动、何时思考，并验证这种能力在不加载原经验文本的情况下仍然存在。预算太紧也可能只教会模型盲目行动和掩盖推理，而非真正熟练。

### 1.4 参数化直觉与外部 Skills：我更关心能力本身如何增长

这一假设还有一个长期意义：**Agent 的经验应该只作为越来越长的 Context / 外部 SKILL.md 累积，还是应该有一部分逐步沉淀到模型参数，使模型真正变得更熟练？**

- **外部 Skills、Memory 和 Context** 适合存放可随时更新、可审计的规则，特定项目知识、操作手册、脚本与少见例外；Skills 通常按需加载，**并不等于每次都把全部 SKILL.md 塞进 Context**。
- **参数化直觉** 则可能把跨任务反复出现、已经验证的动作规律、错误修正和条件判断整合进权重，使常见决策无需反复查手册、读完整执行历史或展开长 CoT。
- **两者应当互补**：会变化的事实、权限、安全约束、稀有细节未必适合固化进参数；适合训练内化的应是可迁移、稳定、频繁使用的能力，而不是一味要求模型记住所有经验。

我倾向于认为，**把经过检验的经验从外部文本逐渐转化为可迁移的参数化行为能力，可能是“硅基智能”继续跃升的重要路径之一**。但这里的“跃升”是研究愿景，不是已被证明的机制，更不能把一次 CoT 压缩等同于真正学会新技能。真正令人期待的系统应当在训练中逐渐**把慢而可靠的思考变成快而可靠的直觉**，同时保留面对陌生任务时再次深入思考的能力。

**可以证伪的关键预测**是：与单纯在推理时截短 CoT 相比，经过有反馈的预算约束训练后，模型在相同成功率、相同在线总时间与 Token 预算下，应能完成更多任务，并且在**无历史原文/无 Skill 提示、状态扰动和未见变体**中保持更强的直接行动与规划能力；如果这些改进只出现在相似训练轨迹上、或只因隐藏 CoT 而看起来更短，那就不能称为经验内化。

这条兴趣路线已有大量前作，并不是无人提出的问题。我的重点是追问它们究竟获得了**推理压缩、计算分配能力，还是可迁移的参数化熟练度**。

正式定义与 API 消息示例：[Thinking 与工具调用协议术语](../glossary/thinking-tool-protocol.md)。各大模型 API 与开源 Agent Harness 如何实际执行和回填工具，见[一个 Agent 是如何组织推理、工具调用与跨轮状态的？](how-agent-reasoning-tools-and-state-work.md)。

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

## 3. 技术路线如何演进？从 SFT 到真正的推理决策 RL

理解这条技术线，先问三个问题：**谁决定何时思考？训练更新谁的参数？什么奖励最终影响这个决策？** “用 RL 训练了模型”未必意味着“RL 直接奖励了正确的思考时机”，也不等于“统一模型获得了参数化直觉”。

### 路线 A：提示词、固定规则与人工预算

早期 [ReAct](https://arxiv.org/abs/2210.03629) 用 Thought–Action–Observation 组织交互，但并不意味着现代 Agent 每次工具调用前都必须生成显式 CoT。固定每 N 步规划、出错后重新推理、按长度截断 CoT，或人工分配 effort 都是有价值的简单基线。

它们**没有学习计算价值本身**，却可能因成本低、可解释而优于复杂调度器，应该保留为对照，而不能作为落后技术随意剔除。

### 路线 B：SFT 与蒸馏——让模型知道“短想、长想、直接行动”长什么样

训练数据包含 NoThink/Think、Short/Long、不同深度计划、老师提供的理想工具轨迹。SFT 把这些行为模式和格式教给模型，解决冷启动；[ConPress](https://arxiv.org/abs/2602.01472) 则利用多题上下文压力获得简洁且正确的推理数据，再通过**自监督 SFT（不使用 RL）**让单题推理也变短。

**关键局限**：模型可能只是在模仿示范中的推理长度、任务难度偏好或特定格式；不能直接证明它已学会“这次额外思考能提高多少未来任务回报”。但新近的 CogRouter、Learning When to Plan 等研究仍依赖不同形式的 SFT 冷启动，不能误以为 RL 已全面替代 SFT。

### 路线 C：直接用 RL 学习 Think/NoThink 与推理预算

这里已经**明确有针对推理成本、模式选择的 RL 设计**，不是仅在最后给答案一个 0/1 奖励：

- [AdaptThink](https://arxiv.org/abs/2505.13417)（2025）：约束 RL，让模型决定是否使用长 CoT，并处理模式探索失衡；主要是单轮推理任务，不能外推为已经学会机器人闭环直觉。
- [AdaCoT](https://arxiv.org/abs/2505.11896)（2025）：围绕答案性能与触发 CoT 的成本做 Pareto 优化，关注统一惩罚带来的退化。
- [Thinkless](https://arxiv.org/abs/2505.13379)（2025）：`<short>` / `<think>` 两个控制 Token；Decoupled GRPO 将**模式 Token 的优化**与**答案生成的优化**分开，缓解一味切换到单个模式。源码：[VainF/Thinkless](https://github.com/VainF/Thinkless)。
- [Think Only When You Need with Large Hybrid-Reasoning Models](https://arxiv.org/abs/2505.14631)（2025）：Hybrid Fine-Tuning + 在线 Hybrid Group Policy Optimization（HGPO）。
- [KAT-V1](https://arxiv.org/abs/2507.08297)（2025）：混合模式的蒸馏、冷启动与后续 RL；并非单纯的 SFT 路线。
- [Learning When to Think](https://arxiv.org/abs/2608.20256)（2026）：通过 NoThink/Short/Long 模式与 GRPO 长度相关激励学习选择，侧重数学问题。
- [Adaptive Test-Time Compute Allocation via Constrained Policy Optimization](https://arxiv.org/abs/2604.14853)（2026）：以准确率—预算约束学习每题的计算配置，更偏预算分配或路由，不等于闭环的重规划。

**这些工作已经回答了一部分“简单题不必每次深思考”**。但测试的是回答正确率和推理输出成本居多，较少直接衡量整个 Agent 的执行延迟、异常恢复以及多步工作吞吐。

### 路线 D：奖励“哪里多想有用”，而不再对所有 Token 一刀切

[CARE — *To Think or Not to Think: Allocating Reasoning Where It Helps*](https://arxiv.org/abs/2609.29664)（2026-09）指出，把题目难度等同于延长 CoT 的价值并不可靠；增量推理收益可能主要集中在**部分可解**的题目。CARE 在 GRPO 的一组在线采样答案中，将推理长度较短的一半与较长的一半比较正确率，再按比较结果给长度奖励确定方向。

用**便于理解的示意**而非作者全部实现细节表示：

$$
d(q)=\operatorname{sign}\!\left(
\overline{\mathrm{correct}}_{\mathrm{long},q}
-\overline{\mathrm{correct}}_{\mathrm{short},q}
\right),\qquad
r_i \approx r_{\mathrm{correct},i}+ d(q)\frac{L_i}{L_{\max}} .
$$

- 长组正确率更高：鼓励增加长度；短组更高：鼓励缩短；两组相同：长度激励为中性。
- 作者报告在所测数学推理基准上，Pass@1 最多提升约 **4 个百分点**，推理长度最多降低约 **37%**；这是**论文所报特定设置的结果，不是所有模型/任务的保证**。
- **重要的证据边界**：同题短/长回答的正确率差异仍是在线采样中的**相关性代理**，而非对长度本身的随机化因果干预；它既未验证多步工具 Agent，也未直接验证机器人在线任务的参数化直觉。

CARE 是“给推理行为更精细的 RL 信号”的实在例子，同时也说明：**有奖励 ≠ 奖励已准确测量一次思考的真实价值**。

### 路线 E：让 LLM Agent 在多轮任务中学习认知深度及跨轮推理复用

**[CogRouter — Think Fast and Slow: Step-Level Cognitive Depth Adaptation for LLM Agents](https://arxiv.org/abs/2602.12662)**（2026）将推理分成四档，从较直觉的响应到更完整的规划。其 CoSFT 教会不同模式；CoPO 在 RL 中为**每个步骤**分配不同 Advantage，利用各深度模式下**原动作的平均 Log-Probability / confidence** 重新加权，而非把全轨迹成功奖励机械地同等归到所有步骤。

论文报告在 ALFWorld、ScienceWorld 两个基准中，Qwen2.5-7B 平均成功率 **82.3%**，比对应 GRPO 基线少使用 **62%** 的轨迹 Token；其对照还显示，常规 GRPO/GiGPO 容易过度集中于最高推理档位，**更具体的信用分配确实很重要**。[原文公式、消融及表格](https://arxiv.org/html/2602.12662v1)。

但 CoPO 的步骤级依据仍是“多大推理程度更支持**原始动作**”，并没有对每一种模式独立执行真实环境后续分支；即使前一条轨迹成功，也不能保证此代理等价于新策略的反事实收益。四档推理本身是**人工预定义**的，不意味着模型自主发现一切认知结构。

**[RACE — When Should Agents Think?](https://arxiv.org/abs/2610.12061)**（2026-10）从另一角度处理多轮重复思考：LoGiC 逐步删去部分历史 Thinking，检查**当前及随后参考动作的条件似然**是否显著退化，用于构建训练信号，再以 SFT 和 Agentic RL 让模型学习跳过冗余推理。它不是简单对每个动作看一次 likelihood，也**没有直接用重新执行的反事实环境成功率定义全部删减信号**。

**两者共同推动了“跨轮/步骤级推理信用分配”，但都没有把 Action Likelihood 自动等同于决策的真实价值。**

### 路线 F：在环境交互中学习“什么时候规划、规划多远、何时直接行动”

这条路线**已有多个直接先例**：

- [Learning When to Plan: Efficiently Allocating Test-Time Compute for LLM Agents](https://arxiv.org/abs/2509.03581)（2025）：先用多样规划轨迹做 SFT，再在 Crafter 等长程环境通过 RL 优化任务回报与规划开销；学习何时规划、何时执行，而非每轮强制 Think。
- [SR²AM — Efficient Agentic Reasoning Through Self-Regulated Simulative Planning](https://arxiv.org/abs/2605.22138)（2026）：在**同一 LLM 的结构化推理阶段**区分 System I（反应行动）、System II（前瞻模拟/规划）和 System III（自调节何时/多深规划）；提供不同数据构建方式并采用 SFT→RL。论文报告 RL 后**平均规划跨度 +22.8%，规划频率仅 +2.0%**。这是“更远规划而非更频繁规划”的有趣证据；但不能把规划跨度变化直接归因于专门的“跨度奖励”，也不能将内部三个推理阶段说成三个独立网络。评测任务覆盖数学、科学、表格与网络信息查找，**不是物理机器人闭环**。
- [When to Plan: Learning to Select Between Reactive Control and Deliberative Planning](https://arxiv.org/abs/2607.16421)（2026；[RLC 2026/RLJ](https://rlj.cs.umass.edu/2026/papers/Paper94.html)）：训练 Meta-Policy 在 Reactive Policy 与更慢 Planner 之间做计算决策，并利用响应不确定性。其训练实验还展示了**随着 Reactive Policy 改善，系统可以减少 Planner 调用**。但这是反应控制器 + Planner + Meta-Policy 的**分立组件**，不能说一个通用 LLM 已经靠少写 CoT 获得了参数化机器人直觉。

这些方法与“有限思考机会可能提高规划价值”的研究兴趣最接近。**它们支持学习决策时计算分配的可行性，却没有直接验证“训练时限制 CoT 次数，是使统一模型获得可迁移快速行动能力的因果机制”。**

### 路线 G：资源感知的机器人推理调度与工具/搜索预算

[RARRL — When Should a Robot Think? Resource-Aware Reasoning via Reinforcement Learning for Embodied Robotic Decision-Making](https://arxiv.org/abs/2603.16673)（2026；8 月更新）明确将推理耗时与资源视为高层 Agent 编排决策的因素：何时调用推理、使用何种角色、投入多大预算。论文所述环境使用源于 ALFRED 的经验延迟配置，目标是改善成功率和延迟。**RL 主要针对高层编排，不是对整个语言模型的全部权重进行“直觉内化”训练；仿真/经验延迟结果也不等同于实体机器人硬实时验证。**

此外，[Adaptive Test-Time Reasoning via Reward-Guided Dual-Phase Search](https://arxiv.org/abs/2509.25420)（2025）和 [What If We Allocate Test-Time Compute Adaptively?](https://arxiv.org/abs/2602.01070)（2026）关注规划、验证、搜索或采样预算。重要的决策不止是“多生成 CoT”，还包括“再观察一次”“调用验证器”“执行测试”“直接行动”之间的机会成本。

## 4. 对比的不仅是论文名称，更是“RL 奖励到底给了谁”

### 4.1 五种训练信号：不能都叫成“直接奖励思考价值”

| 训练信号 | 代表 | 模型真正收到什么 | 仍然没有证明什么 |
| --- | --- | --- | --- |
| **SFT 标签与蒸馏** | ConPress、CogRouter/CoSFT、Learning When to Plan 的冷启动 | 教师给定的模式、简洁推理或规划轨迹 | 模型独立学会了选择计算时机 |
| **终局任务回报 + 计算成本** | Learning When to Plan、部分混合推理 RL | 成功任务带来回报，规划 Token/耗时有代价 | 每个 Thinking 节点的真实边际贡献已被准确归因 |
| **显式推理模式 / 长度奖励** | AdaptThink、Thinkless、AdaCoT、CARE | Think/NoThink、控制 Token 或按条件改变长度偏好 | 减少语言 CoT 会引起动作技能参数化 |
| **步骤级代理与置信度重加权** | CogRouter/CoPO、RACE/LoGiC | 推理模式与原动作概率/似然的关系，辅以任务 RL | 原动作更可预测等于独立闭环更成功 |
| **独立元策略 / 推理服务调度** | When to Plan、RARRL | 元策略学习何时使用 Reactive/Planner/Verifier 及预算 | 原生 LLM 本体的行动参数已经学会无需外部 Planner |

**把 RL 奖励拆成三层更准确：**
1. **Outcome Reward**：任务到底成没成功？
2. **Cost Shaping / Budget Constraint**：完成它花了多少 Token、规划次数、实际时延？
3. **Reasoning Credit Assignment**：是哪一次思考让某个后续决策更好？这里最难，常用 confidence / action likelihood / sampled accuracy 近似，而非昂贵的真实环境反事实分支。

一个概念化的成本敏感目标是

$$
J(\pi)=\mathbb E\!\left[R_{\mathrm{task}}
-\lambda_{\mathrm{tokens}}C_{\mathrm{tokens}}
-\lambda_{\mathrm{latency}}C_{\mathrm{wall}}
-\lambda_{\mathrm{tools}}C_{\mathrm{tools}}\right].
$$

它并不要求人为写出每一段 CoT 的“正确推理”标签；只要策略能控制何时 Think，RL 就可能学习其价值。但**终局奖励并不会自动解决步骤级 Credit Assignment**，使用固定 $-\lambda C$ 也不等于计算了额外推理的因果收益。

### 4.2 哪些工作对我的兴趣最有证据价值？

| 论文 | 学到的自适应对象 | 代表证据 | 对“直觉内化”假设的边界 |
| --- | --- | --- | --- |
| [Thinkless](https://arxiv.org/abs/2505.13379)（2025） | 控制短/长推理的 Token | DeGRPO 分开学习模式与答案 | 主要是单题推理选择 |
| [AdaptThink](https://arxiv.org/abs/2505.13417)（2025） | 是否触发详细 CoT | 有成本意识的模式 RL | 非闭环机器人动作 |
| [CARE](https://arxiv.org/abs/2609.29664)（2026） | 长度奖励的方向 | 长/短在线采样正确率；数学任务 | 仍是长度—正确率相关性 |
| [CogRouter](https://arxiv.org/abs/2602.12662)（2026） | 每步四档认知深度 | CoSFT+CoPO、步骤级置信度 | 原始 Action Confidence Proxy |
| [RACE](https://arxiv.org/abs/2610.12061)（2026） | 跨工具轮推理冗余 | LoGiC+SFT+Agentic RL | 参考轨迹似然不等于环境反事实 |
| [Learning When to Plan](https://arxiv.org/abs/2509.03581)（2025） | 是否规划与何时重规划 | SFT→环境 RL、规划成本 | Crafter 等环境，不是通用视觉机器人 |
| [SR²AM](https://arxiv.org/abs/2605.22138)（2026） | 反应/规划/规划自调节 | 规划跨度 +22.8%，频率 +2.0% | 结构化 CoT 并非动作参数化直觉 |
| [When to Plan](https://arxiv.org/abs/2607.16421)（2026） | Reactive 与 Planner 选择 | Reactive 改善后更少规划 | 外部分立策略，不是统一 LLM |
| [RARRL](https://arxiv.org/abs/2603.16673)（2026） | 机器人高层推理预算/调用 | 资源感知的高层 RL 编排 | 非实体机器人通用低层控制 |

跨论文数字只在各自的模型、数据集与评价协议中有效；**不能把 Token 节省、任务成功、Planner 调用次数与机器人真实延迟混成一条排行榜。** 也不能把 arXiv 摘要中的宣称一律视为已独立复现。

## 5. 我更认可的路线：闭环学习的自适应推理

先讲清楚：这部分是**基于现有工作的方法偏好**，不是未经验证的原创贡献声明。

我更倾向于让**同一个 Agent 通过环境反馈学习元决策**，而不是在部署时长期依赖固定的 uncertainty、likelihood 或 Token 数阈值。元决策应把继续执行、获取新观测、重新规划及不同深度的推理放在同一个权衡空间里。

与第 1 节的假设相呼应，我不仅希望模型**在线时更会分配推理**，也希望长期训练后它对熟悉状态形成更可靠的**参数化直接行动能力**；因此需要同时检测策略选择与参数内化，而不是把原先要花的 CoT 偷偷挪到隐藏步骤或外部 Skill 中。

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

### 5.2 新研究对“奖励 Thinking”的启发：从压缩 Token 到边际决策价值

与其问“RL 有没有给思考奖励”，更有用的是区分 **Outcome Reward、Cost Shaping 和 Reasoning Credit**。前两种能促使策略学习节省计算；但没有优质的信用分配，RL 容易塌缩成永远深思考、永远 NoThink，或只追求表面上的短输出。

CogRouter 的 CoPO 用原动作 Log-Probability 改善步骤级 Advantage；CARE 用长短采样的相对正确率，决定长度奖励正负；RACE 用删除部分 CoT 后参考动作似然是否退化，识别可省略的推理；SR²AM 则展示任务反馈训练后规划跨度可以增长，而规划次数基本不变。这些都比固定长度惩罚更有信息量，但 **Proxy 并不等价于真实 Value of Computation（VoC）**。

理想化地，对于相同可恢复历史 $h_t$，比较**独立运行后续环境**得到的结果：

$
\mathrm{VoC}(h_t) \approx
\mathbb E[R_{\mathrm{future}}\mid h_t,\mathrm{THINK}]
-\mathbb E[R_{\mathrm{future}}\mid h_t,\mathrm{ACT}]
-\lambda C_{\mathrm{think}}.
$

其中 ACT 也可能主动观察或采取安全受约束的直接行动；为比较准确，应控制动作/环境随机性、工具状态和预算条件。**这不是声称已解决的奖励函数或免费的在线计算**：真实反事实 Rollout 很昂贵，通常只能在可重置模拟环境、少量关键状态或离线训练时估计。部署时更现实的是让模型利用这些经验**参数化地预测**何时值得花计算。

一个合理的学习现象是：常见动作逐渐由快速行为策略稳定完成，而遇到困难状态时仍能调动深推理；不能把“推理调用更少”本身当成这个现象的证明。

### 5.3 我理想中的学习流程

**阶段一：提供行为覆盖，而非人为定义“正确触发器”。** 在安全可重复的环境中采样多种轨迹：无需重新规划的顺利执行、工具失败、环境变化、计划漂移、主动观察、短推理和深推理。可使用 SFT 做最低限度的格式与行动能力冷启动，避免初期 RL 只学会无效调用。

**阶段二：交互式 RL 联合学习动作和推理时机。** 模型真实执行行动、得到下一次 observation，再由可验证的任务反馈和真实执行成本优化策略。算法上可以使用适合自回归工具 Agent 的策略梯度/GRPO/PPO，但不应把选用某个优化器视为科学贡献。

**阶段三：只在训练/分析时做少量成对反事实测试。** 从同一可重置环境状态分别运行 Think 与 NoThink（或不同预算）策略，观察后续动作、最终成功率、恢复能力和开销。此处的反事实是**实测两个分支结果**，不能用对原始动作打 likelihood 冒充。

**阶段四：测试泛化，而非只看平均省钱。** 在未见任务、长轨迹、外部干扰、状态延迟、失败工具和不同风险场景中测试；尤其检查模型是否在“看似简单但错误很贵”的时候也盲目跳过推理。

### 5.4 为什么我不想把手写触发规则当最终答案？

人写的规则可以作为强基线、安全兜底或冷启动，但未必能反映任务实际价值：

- **高不确定性不一定值得深推理**：模型可能只需再观察一次。
- **低不确定性也可能值得验证**：一个自信但不可逆的危险动作需要额外检查。
- **动作 likelihood 高不代表动作安全**：模型可能自信地重复错误步骤。
- **生成更长 CoT 不一定更好**：思考可能产生无用循环，甚至导致计划漂移。

因此，与其指定 $\text{uncertainty}>c$ 才触发 THINK，我更希望通过任务反馈学习**哪个时刻、哪种附加计算、在什么成本下真正改善了结果**。但这只是更值得尝试的方向；强启发式或独立 router 也可能在相同预算下表现一样好。

### 5.5 真正困难的不是写出奖励公式

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
4. AdaptThink/Thinkless 模式 RL、CARE 长度奖励、CogRouter/CoPO 步骤级信用分配、RACE 跨轮筛选，以及 Learning When to Plan/SR²AM 的交互规划 RL（按可复现条件取舍）。
5. 独立调度器（When to Plan / RARRL 风格）与统一 Agent 内生决策分别测试；同一个 Agent 联合学习**行动 + 是否观察/推理/重新规划**，并单独做消融。
6. 在推理阶段按相同预算截断 CoT 的模型，必须与**训练阶段经历预算约束并实际更新参数的模型**严格区分。

在**相同总训练计算预算、数据量、环境交互次数和工具成本**下汇报；若不能完全匹配，必须明确列出差额，而不只对齐训练 step。测试时则固定**在线端到端时长与 Token 预算**，报告成功率和达到质量门槛的任务吞吐，避免更快但更差的策略被误认为效率提升。

### 关键指标

- **固定预算内有效产出**：相同总在线时间和 Token 上限内，达到预设质量门槛的完成任务数；不能用生成字数代替产出。
- **机器人在线价值**：高层决策延迟分布、观测到动作的年龄、控制反馈滞后、任务耗时、碰撞/拒绝执行率（在安全执行约束不变的前提下）。
- **直接行动与内化检验**：在取消原轨迹/Skill 提示、跨任务与状态扰动后，短/无显式 CoT 的成功率是否提升；必须和仅推理时压缩的模型对比。
- **规划机会分配**：重要阶段前的规划质量、计划保持有效的步数/跨度、异常时重新规划的恰当性、规划频率；不以“单次 CoT 变长”代替规划质量。
- **主要结果**：独立未见任务的闭环成功率 / 任务回报。
- **效率**：Thinking Token、实际推理延迟、Prefill、工具调用次数、端到端耗时及预算超标率。
- **鲁棒性**：状态扰动、动作失败、错误恢复、不可逆错误率、错误地跳过必要推理的比例。
- **决策解释**：在什么状态选择了 ACT / OBSERVE / THINK / REPLAN？是否真的随风险和计划失效改变？
- **统计可信度**：多个随机种子、置信区间，比较成功率—实际成本的 Pareto 前沿。

### 检验“限制推理是否促进直觉”的最小实验

同一个 Base Model、同一环境与训练数据，至少区分 **A：不限推理的常规训练**、**B：只在推理时截断/禁用 CoT（不更新参数）**、**C：在相同训练算力与环境交互预算下，通过 SFT/RL 将有限推理机会和最终任务反馈联合优化**。可加入 **D：不更新参数但使用外部 Skill/Memory**，以及 **E：外部经验 + 参数化训练** 作为对照。

训练结束后，在**统一的测试 Token 与在线时间预算**下，比较独立未见任务、相似但未见动作组合、环境突变和机器人错误恢复：C 是否比 B 更能可靠地直接行动？重要操作前的规划与后续成功是否实际提高？移除外部 Skills 及原始轨迹上下文后收益是否仍存在？如果没有，就说明“机会受限促成参数化直觉”的假设尚未得到支持，不能用推理长度下降代替论证。

### 最值得做的反事实对照

从相同状态分别运行 **有新一轮推理** 和 **不产生新一轮推理** 的独立后续轨迹。不能把后续真实 observation 固定成原轨迹，否则只是在测原动作的可预测性，而不是测“思考是否带来任务价值”。

若学习策略不能显著超越简单的“失败后重规划”或“固定间隔规划”，在同成本下也不能提高成功率/恢复能力，那么更复杂的元学习就不值得继续投入。

## 7. 当前判断与阅读优先级

**结论一：自适应推理早已不只是 SFT。** AdaptThink、Thinkless、CogRouter、CARE、RACE 和 Learning When to Plan 等分别把模式、预算、跨步信用分配或环境回报放进 RL。尤其 **CogRouter 已明确揭示普通轨迹级 GRPO 可能塌缩为无差别深思考；CARE 表明固定惩罚长推理并不合理**。说“RL 根本没有对思考施加训练信号”是不准确的。

**结论二：奖励一次 Thinking 的真实价值，仍远未被充分解决。** 目前奖励常是“成功率 - 推理成本”、采样正确率差异、原动作概率或独立元策略的收益。这些都可能有效，但“输出更短”“当前动作更可预测”不保证反事实长期收益；很多工作尚未使用**相同初态下的独立闭环后续轨迹**估计新一次推理是否真正值得。

**结论三：我仍更关心经验能否内化为参数化直觉。** When to Plan 以 Reactive 与 Planner 的分立系统展示了反应策略增强后可以减少规划，SR²AM 展示规划跨度增加而频率增幅有限。二者支持“训练应重视计算分配和可靠执行”，却都不能证明**仅通过限制统一 LLM 的 Thinking 次数**就能形成可迁移的状态—行动直觉。这个假设需要同权重、同训练预算、无 Skills 提示及未见任务泛化的对照实验证明。

**结论四：固定时间与 Token 预算下的有效产出，以及真实机器人时延，是部署价值的核心；** 单一平均 CoT 长度不是最终指标。RARRL 提醒我们外部元策略也可能有应用价值；内生元决策是否更好，应通过真实成本与相同环境结果比较，而不是凭架构品味定优劣。

### 阅读顺序与明确的精读对象

| 优先级 | 论文 | 我重点学什么？ |
| --- | --- | --- |
| **精读** | [Learning When to Plan](https://arxiv.org/abs/2509.03581) | SFT 冷启动到交互 RL、规划价值、成本与 Plan Drift；和固定策略的消融 |
| **精读** | [CogRouter](https://arxiv.org/abs/2602.12662) | 四档模式、CoPO **步骤级 Advantage** 公式、Action Confidence Proxy 的合理性和失败边界 |
| **精读** | [SR²AM](https://arxiv.org/abs/2605.22138) | System I/II/III 到底是何种可训练结构、SFT→RL、规划跨度/频率变化与消融 |
| **精读** | [When to Plan](https://arxiv.org/abs/2607.16421) | Reactive Policy/Planner/Meta-Policy 的训练分工、模仿规划后的直觉式直接行动与迁移边界 |
| **精读** | [RACE](https://arxiv.org/abs/2610.12061) | LoGiC 的跨轮删除条件、训练信号、它和真实后续环境价值之间的差距 |
| **细读** | [CARE](https://arxiv.org/abs/2609.29664) · [Thinkless](https://arxiv.org/abs/2505.13379) | “何时应多想”的长度奖励方向；模式 Token 与答案 Loss 怎样解耦 |
| **细读** | [RARRL](https://arxiv.org/abs/2603.16673) | 时延/资源进入 RL、外部调度器与 LLM 本体训练的区别、模拟部署可推广性 |
| **细读** | [AdaptThink](https://arxiv.org/abs/2505.13417) · [AdaCoT](https://arxiv.org/abs/2505.11896) · [KAT-V1](https://arxiv.org/abs/2507.08297) | RL 的成本项、模式坍缩、冷启动数据与训练配方 |
| **了解** | [ConPress](https://arxiv.org/abs/2602.01472) · [Learning When to Think](https://arxiv.org/abs/2608.20256) · [Compute Allocation via CPO](https://arxiv.org/abs/2604.14853) | SFT 推理压缩与 RL 选择究竟有何不同 |

### 仍没有得到充分证明的关键判断

我想检验的不是“用某个奖励减少 CoT”，而是：**模型能否把曾经依赖长推理才能完成的操作，经过训练转化为快速可靠的参数化行为，并把节省出的计算用于真正关键的规划与验证？**

只有同时证明**无原历史/Skill 上下文时更强的直接行动、关键时刻更准确的推理选择，以及相同在线成本下更多成功任务**，才有力支持这一判断。现有工作正在靠近，但不应把它写成已经被证明的科研结论。

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
14. [Jensen et al., A recurrent network model of planning explains hippocampal replay and human behavior](https://www.nature.com/articles/s41593-024-01675-7)（Nature Neuroscience, 2024）。
15. [Scaling Competence, Shrinking Reasoning: Cognitive Signatures in Language Model Learning](https://www.microsoft.com/en-us/research/publication/scaling-competence-shrinking-reasoning-cognitive-signatures-in-language-model-learning/)（2025，相关性观察，不证明因果）。
16. [ConPress: Learning Efficient Reasoning from Multi-Question Contextual Pressure](https://proceedings.mlr.press/v306/deng26m.html)（ICML 2026）。
17. [波士顿大学研究揭秘：为什么大脑“练得越多，想得越少”？](https://news.qq.com/rain/a/20250611A02V0N00)（腾讯新闻转载科普，2025；仅作生物自动化现象的直观类比，不作 LLM 机制证据）。
18. [Thinkless: LLM Learns When to Think](https://arxiv.org/abs/2505.13379)（2025；[代码](https://github.com/VainF/Thinkless)）。
19. [Think Fast and Slow: Step-Level Cognitive Depth Adaptation for LLM Agents / CogRouter](https://arxiv.org/abs/2602.12662)（2026；[可直接阅读的 HTML 论文](https://arxiv.org/html/2602.12662v1)、[源码](https://github.com/rhyang2021/CogRouter)）。
20. [Efficient Agentic Reasoning Through Self-Regulated Simulative Planning / SR²AM](https://arxiv.org/abs/2605.22138)（2026）。
21. [To Think or Not to Think: Allocating Reasoning Where It Helps / CARE](https://arxiv.org/abs/2609.29664)（2026）。
22. [When Should a Robot Think? Resource-Aware Reasoning via Reinforcement Learning for Embodied Robotic Decision-Making / RARRL](https://arxiv.org/abs/2603.16673)（2026）。
23. [ConPress: Learning Efficient Reasoning from Multi-Question Contextual Pressure](https://arxiv.org/abs/2602.01472)（2026；SFT、不使用 RL）。
24. [CogRouter 的论文原文：Step-Level Advantage / CoPO](https://arxiv.org/html/2602.12662v1)；[When to Plan 在 RLC 2026 / RLJ 的论文页面](https://rlj.cs.umass.edu/2026/papers/Paper94.html)。
