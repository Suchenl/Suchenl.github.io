---
title: "CoT 是工具调用吗？长程 Agent 何时思考、Codex/GLM/Qwen 如何实现"
shortName: "When to Think"
aliases: ["CoT", "Chain-of-Thought", "reasoning", "think tool", "interleaved thinking", "preserved thinking", "reasoning_effort", "Codex", "update_plan", "GLM-5.3-Flash", "Qwen3.8-27B", "RACE", "CogRouter", "adaptive thinking", "tool calling"]
summaryZh: "区分 CoT 与工具调用、同一轮 KV Cache 和跨工具轮推理回放；讨论通用 API 协议适配、reasoning 状态回放与 vLLM Prefix Cache 的必要条件，以及 GLM/Qwen/Codex 的思考调度。"
categories: ["强化学习与 Agent", "强化学习与 Agent/长程推理与工具使用"]
---

# CoT 是工具调用吗？长程 Agent 何时思考？

> **核心 Q&A（2026-10-20 核验）**  
> **Question**：推理 CoT 本身是工具调用吗？模型通过什么去决定在长程任务中什么时候该推理？Codex 是怎么做的？GLM-5.3-Flash 和 Qwen3.8-27B 又是怎么做的？  
> **一句话回答**：**CoT 是模型生成的推理内容，工具调用是交给外部执行器的动作请求；要不要思考、思考多深、何时根据反馈重想，是模型策略 + 推理配置 + Harness + 训练经验共同决定的。** 不能把所有系统都写成“首 token 自己学会切换 THINK/ACT”；模型和服务端的约束差异非常大。**协议术语的权威定义统一维护在[Thinking 与工具调用协议术语](../../../glossary/thinking-tool-protocol.md)**；以下侧重具体模型对比和研究分析。
>
> 这里主要依据各模型官方模型卡、官方 API 文档、Codex 开源提示词及 RACE / CogRouter 论文**公开摘要**。未公开的内部 RL 配方和实际训练数据不会被推测成事实。

跨 Claude、OpenAI Responses/Codex 和开源 Agent 的**整体 API—Harness—Execution 分层对照**见[一个 Agent 是如何组织推理、工具调用与跨轮状态的？](../../../research/how-agent-reasoning-tools-and-state-work.md)。本篇着重模型推理调度与状态保留。

## 1. 先区分四件容易混为一谈的事情

| 机制 | 具体是什么 | 是否调用外部工具？ | 是否改变外部状态？ |
|---|---|---|---|
| **CoT / Thinking** | 模型解码过程中生成的推理 token 或 API reasoning 内容项 | **通常不是** | 不直接改变 |
| **Tool Calling** | 模型生成工具名、参数、调用 ID 等结构化请求，执行器完成动作并回传结果 | **是** | 取决于工具；读取可能无副作用，写入/机器人动作会有 |
| **Plan / update_plan** | 由 Agent/Harness 维护、通常面向用户或任务状态的计划清单 | 可能通过**专门工具**更新 | 更改计划记录，不等于实际完成外部任务 |
| **Observe / Feedback** | 文件内容、终端输出、机器人观测、执行是否成功 | 通常来自工具结果 | 提供新证据，本身不必改变状态 |

典型循环：

```text
user/task → model（可能生成 reasoning）
                    ↓
                tool_call(name,args) → Harness 执行
                    ↑                     ↓
                下一轮推理  ← tool_result / observation
                    ↓
             更多调用 / 最终回答
```

**工具调用的本质**不在于输出是否“长得像 JSON”，而在于协议把某个输出解释为调用，并有执行者、call_id、结果回传与错误处理。模型在 CoT 里*写出* `robot_act(...)`，如果只是普通推理文本而未产生 tool call，机器人不会真的动。

**例外**：某些 Harness 可以人为定义空操作 `think()` 工具，使它成为一次实际协议层面的调用，但通常只有“写 scratchpad / 更新记录”的效果。这是**把思考包装成工具接口**，不是 Transformer 原生机制把所有 CoT 变成工具调用。尤其不要把这种自定义 `think tool` 称为所有 Anthropic 模型官方内置的必选模式；Claude 官方区分 `thinking` content blocks 与 `tool_use` blocks。

官方参考：[OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)、[Anthropic Thinking](https://platform.claude.com/docs/en/about-claude/models/extended-thinking-models)。


### 1.1 「在上下文里」是两种完全不同的事情

**同一次自回归生成**：模型先输出 `<think>...` 再输出工具调用时，后面的 token 可以条件化于前面的推理 token，KV Cache 通常负责缓存该次解码的注意力状态。它们不是“在同一次前向计算里一次性生成”，而是**多次前向、逐 token 继续生成**。此时不需要 Harness 再插入已生成的 CoT。

**跨工具调用的新请求**：外部执行器完成任务并返回结果后，模型通常要启动新的推理请求。下一次请求看见什么，由**客户端发送的历史、服务端会话状态、推理状态回放协议**共同决定；前一次请求里生成过的 CoT 不意味着它自动属于下一次的逻辑上下文。

区分三层数据：

| 层次 | 存的是什么 | 是否自动进入下一轮输入？ |
|---|---|---|
| **KV Cache** | 某个 token 前缀计算得到的 K/V 张量 | **不保证**；可能被回收、淘汰或由 Prefix Cache 复用 |
| **消息历史** | 角色、正文、tool_calls 和 tool_result | 由客户端或服务端对话状态维护 |
| **Reasoning state** | GLM 明文 `reasoning_content`、Responses opaque/encrypted item 等 | 由对应 API 和 Harness 约定是否保留、如何回传 |

所以“模型刚刚明明想过，为什么还要塞回去？”的答案是：**你说的是同一次解码；Bridge 要解决的是下一次请求有没有收到对应推理状态。**

## 2. 谁决定什么时候想、想多久？

不是一个统一答案，至少存在三层控制权：

1. **请求/模型层约束**：能否关闭 thinking，`reasoning_effort` 档位、`max_tokens`、采样参数、模型默认模式和 chat template；有些模型根本不允许关闭推理。
2. **模型生成策略**：在允许的输出空间中，模型根据当前上下文决定继续 reasoning、结束推理、输出工具调用或最终消息；训练可能改变这些行为。**不是所有模型的选择都等价于“第一个 token 在 `<think>` 与工具之间采样”**——服务端可以预填 thinking 标记、强制 thinking 模式，也可能通过结构化 channel 输出。
3. **Harness / 应用调度**：哪些工具开放、什么时候插入新观测、是否保留历史 reasoning、是否 compaction、是否规定先执行校验、每次调用能否调整 effort，及什么时候需要用户确认。

推理 token 本身**是推理过程的一种外显形式**，不代表能完整观察模型所有内部计算；尤其闭源模型的 reasoning item 可能是加密的、不向用户展示原始内容。


### Harness 能不能决定是否思考？

对于**没有额外 THINK/ACT Router** 的常见 Agent loop，模型往往根据当前信息决定生成推理、工具调用或最终回答；工具错误和不确定性可能影响行为，但不能只凭 CoT 日志认定模型已通过某项 RL 奖励学会了最优元策略。

**“Harness 没有调度器”只能作为某个具体实现的说明**，不能成为通用定律。Harness 能配置 thinking/effort、提示词、最大输出长度、工具与观测输入，还可以显式添加调度器、路由到其他模型、注入风险检查或在错误后强制重新观察。GLM-5.3-Flash 甚至强制 Thinking，不存在“首个 token 完全自由选择开启/关闭”的问题。

**检验模型是否学会了“何时思考”**，需要对比相同任务中思考量、工具故障、真实成功率与成本，不能凭工具调用前出现了 `<think>` 作因果归因。

### 长程 Agent 特别需要分开三个问题

- **Whether to think**：当前轮是否需要新一轮显式推理？
- **How much to think**：当前轮分配低、中、高/最大程度的推理 token 预算？
- **When to replan / observe**：已有计划何时失效？应先调用获取信息的工具，还是直接按已知步骤执行？

例如：同一目标下的连续稳定运动可能无需每次写长 CoT；观测突变、工具报错、操作不可逆、风险高、目标已被修改时，重新推理更可能有价值。**这是合理的设计假设，不是“模型天然知道最佳时机”的证明。**

## 3. Codex：原生 reasoning + Harness 工具，而不是一个 THINK 工具包打天下

**公开可确认的事实**：

- OpenAI Responses API 将 reasoning item、消息和 function call 作为不同类型处理。带工具调用的多轮交互，应保持上一次函数调用关联的 reasoning items；可以通过 `previous_response_id` 或手动回传兼容的 `response.output` 来延续。对无状态调用，`reasoning.encrypted_content` 可承载不暴露明文的推理状态。[官方 Reasoning API 文档](https://developers.openai.com/api/docs/guides/reasoning)、[Conversation State](https://developers.openai.com/api/docs/guides/conversation-state)。
- Codex 开源提示词提供 `update_plan`：它是**可选的显式计划管理工具**，在多阶段任务中记录 `pending` / `in_progress` / `completed`；提示词明确告诫**简单任务不必使用**。它不等于隐藏 CoT，也不能假设每次调用工具必须先更新计划。[Codex 开源提示词](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md)。
- 工具可执行 shell、文件补丁等外部操作；模型/应用按执行结果决定后续行动。`update_plan` 改变的是任务结构化记录，而非真实文件或测试结果。

**不可由公开材料推导**：Codex 在任意模型上的每轮真实 reasoning token、是否采用一个统一的“何时推理”RL 元策略、工具错误时内部思考的具体阈值、跨全部版本是否保留所有历史隐式推理。不能把“原生推理管战术，plan 工具管战略”当作 OpenAI 官方保证的精确两级架构——那只是便于解释的概括。

### Codex 的分层理解（工程抽象，而非内部实现规格）

```text
任务目标 / 用户输入
 ├─ 模型原生 reasoning（可能不向用户暴露原文）
 ├─ 可选 update_plan（外部可见、便于跟踪多步计划）
 ├─ shell / patch / 浏览 / 其他工具（实际外部调用）
 └─ 反馈 → 重新评估 → 再行动
```

**关键细节**：公开 `update_plan` 机制证明“计划可以被显式外化”，并不意味着不调用 `update_plan` 的任务没有规划行为。


### 3.1 从「同一次生成」到「跨轮请求」的断点

```text
请求 N：
[系统/用户/历史] → 模型逐 token 生成 reasoning → tool_call(call_id)
                                          │
                              该请求里的解码 KV Cache
                                          ↓
                          Codex/Harness 执行工具
                                          ↓
请求 N+1：
[历史 + 是否被保留的 reasoning state + tool_result] → 模型再次解码
```

模型**不会因为上次产生过 CoT，就把它永久写进参数**。有状态 Responses 可由服务端通过 `previous_response_id` 等维护历史，无状态 Responses 可由调用端回传完整的兼容 items（包括 opaque / encrypted reasoning）。如果提供方支持，某些旧 reasoning items 可在模型新上下文中继续使用；是否用到更早轮次还取决于具体模型与 `reasoning.context` 等配置，**不是所有历史 reasoning 都一定被全文渲染**。[OpenAI Reasoning 官方文档](https://developers.openai.com/api/docs/guides/reasoning)。

注意 **KV Cache 不等于跨轮记忆**：请求结束后推理逻辑仍需有信息来源；物理 KV 块可能被重用，但重用计算不等于自动补进缺失的消息。

### 3.2 跨 API 协议转换的通用问题（不涉及任何私人实现）

公开接口层面，OpenAI Responses 的 `reasoning`、`function_call` 和 `function_call_output` 不等同于 Chat Completions 的 `assistant.reasoning_content`、`tool_calls` 和 `role=tool`。如果使用协议适配层，必须**显式定义格式、调用 ID、工具结果配对和 reasoning 状态的回放规则**，否则历史推理可能缺失或重复。

需要做的公开通用检查：

1. 同一轮多个 tool calls 的 `call_id` 是否准确配对。
2. 模型的 chat template 是否会处理历史 `reasoning_content`，是否支持跨轮 preserved thinking。
3. 对缺失的推理状态、会话压缩、服务重启如何降级。
4. 工具权限、审批与沙箱应只由工具执行层管理，不能把模型生成的推理文本当成待执行命令。

这些是 API 兼容性和系统设计原则，**不描述或证明任何特定私人仓库的实现**。参见[OpenAI Reasoning](https://developers.openai.com/api/docs/guides/reasoning)、[vLLM Tool Calling](https://docs.vllm.ai/en/latest/features/tool_calling/)。

### 3.3 回填 CoT 会不会必然提高 Prefix Cache 命中率？

**不会必然命中，更不能无条件推导为“省钱”。** [vLLM Automatic Prefix Caching](https://docs.vllm.ai/en/latest/design/prefix_caching/)复用的是**真实相同的 token 前缀对应的缓存块**，并非“语义接近的历史文本”。

它至少依赖：

- 服务端开启 Prefix Cache，之前缓存块没有被淘汰；
- 前缀的 **token IDs 完全匹配**，包括 chat template、系统提示词、工具 schema、role 边界、`<think>` 标记及序列化顺序；
- 模型、适配器/LoRA、cache salt、多模态输入哈希等相关缓存条件一致；
- 具体实现按块缓存，末尾部分相同也不保证命中。

**跨 Responses → Chat 格式的回填不保证前后 prompt token 完全相同**。保留推理有时可能增加有效共享前缀，但也会增大逻辑上下文、带来 token/存储/隐私成本。

还有一个实际统计陷阱：部分适配器可能不给出真实的服务端缓存统计，因此不能只看客户端返回的 `cached_tokens` 就断言发生或没有发生缓存命中。需要查看 vLLM 真正的 prefix cache 命中指标、实际 Prefill/TTFT 和总 wall time。对自部署 GPU，减少 Prefill 算力不一定产生按 token 计费的账单折扣。

**建议做一组独立验证**：同任务同工具，用（A）不回填 CoT、（B）回填完整 CoT、（C）只回传简短显式计划进行对照；记录工具成功率、异常恢复率、错误重试、全程 token、TTFT、真实 cache hit、GPU 时间和隐私/磁盘占用。这样才知道回传推理是**有用的历史**还是**昂贵的噪声**。

## 4. GLM-5.3-Flash：默认且强制 Thinking，支持交错思考与历史保留

截至 2026-10-20，Z.ai 的[GLM-5.3-Flash/FlashX 官方模型页](https://docs.z.ai/guides/vlm/glm-5.3-flash)与[Thinking Mode 文档](https://docs.z.ai/guides/capabilities/thinking-mode)明确写明：

- **`glm-5.3-flash` 及 `glm-5.3-flashx` 是原生多模态输入、文本输出模型**；它们不是纯文本 GLM-5.3 的同一模型规格。
- **强制 Thinking**：`thinking.type` 仅支持 `enabled`；不能设 `disabled`。官方推荐 `reasoning_effort: "max"`。官方 GLM-5.3 系列说明 `low / high / max` 档位，低档位表示减小推理开销，**不等于关闭思考**。
- **Interleaved Thinking**：模型可在工具调用前、收到工具反馈后继续生成 reasoning；要由调用端传回工具结果及相关历史推理块。
- **Preserved Thinking**：通过 `thinking.clear_thinking: false` 可保留历史 `reasoning_content`，官方特别强调**不应改写或重新排序**；Coding Plan endpoint 与标准 API endpoint 的默认行为可能不同，必须以实际 endpoint 和请求为准。
- 视觉反馈能接进 Agent 循环是 **VLM + 工具接口的能力组合**，不是 CoT token 自身主动获取了摄像头或浏览器画面。

一个面向 GLM Flash 的**参数示意**（字段以实际兼容 endpoint 文档为准）：

```json
{
  "model": "glm-5.3-flash",
  "thinking": {"type": "enabled", "clear_thinking": false},
  "reasoning_effort": "max",
  "tools": [{"type": "function", "function": {"name": "observe", "parameters": {"type": "object"}}}]
}
```

**对核心问题的结论**：GLM-5.3-Flash **并不是每轮都可自发选择完全不思考**的 hybrid 模型。它可以调整推理深度、与工具交错、保留上下文，但**公开材料并没有揭示精确的每回合 THINK/ACT 调度策略学习算法**。

## 5. Qwen3.8-27B：默认 Thinking，但可以按请求关闭

[Qwen3.8-27B 官方模型卡](https://huggingface.co/Qwen/Qwen3.8-27B)提供了比一般模型介绍更具体的推理接口：

| 能力 | 官方设定 | 不能误解为 |
|---|---|---|
| Thinking 开关 | 默认启用，`chat_template_kwargs.enable_thinking: false` 可禁用（托管 API 字段可能不同） | 模型一定是在每一轮自主决策是否打开 |
| 推理深度 | `reasoning_effort = low / medium / xhigh`，默认 `xhigh` | 这三个值等于 GLM 的 low/high/max |
| 历史保留 | `preserve_thinking` 默认开启，可选择设为 false | 任意 Harness 都能无损保留 |
| 工具解析 | SGLang / vLLM 官方示例使用 `reasoning-parser qwen3`、`tool-call-parser qwen3_coder` | “只启动模型就自动拥有可运行的工具” |
| 视觉能力 | 原生支持图像/视频理解 | 视频观测可以替代真实动作执行结果 |

官方 vLLM 示意启动参数（需与实际安装的 vLLM 版本匹配）：

```bash
vllm serve Qwen/Qwen3.8-27B \
  --tensor-parallel-size 4 \
  --reasoning-parser qwen3 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder
```

使用 Qwen3.8 时不能忽略两个工程现象：

1. **关闭 Thinking 不总意味着工具调用更可靠**：QwenLM [Issue #236](https://github.com/QwenLM/Qwen3.8/issues/236)有用户报告，在长 system prompt + SGLang + `enable_thinking=false` 情况下，工具调用退化为普通文本。该 issue 已关闭为 not planned，**这只是报告者的特定环境复现，不能当成官方确认的普遍模型缺陷**。
2. **Effort 参数与模板兼容问题**：[Issue #217](https://github.com/QwenLM/Qwen3.8/issues/217)报告部分 Harness 传 `high`，而特定 Qwen3.8 模板只接受 `low / medium / xhigh`，导致服务端错误。对于自建 Agent，应先做模板、模型、serving engine 的契约测试。

**为什么这里很值得学习？** 这个模型不但支持“有/无思考”，还明确支持持久保留历史推理。由于不同模板可能改变格式，**优化长程 Agent 前必须先证明工具调用和 reasoning 的回放是一致、可解析、可复现的**。官方也提醒：降低单轮 effort 未必降低整条任务耗时，因为错误与重试可能增加。

## 6. 三套系统对照：哪些是控制接口，哪些才是策略？

| 能力维度 | Codex / OpenAI Responses | GLM-5.3-Flash | Qwen3.8-27B |
|---|---|---|---|
| 原生推理 | 模型 reasoning item，可用 effort 约束；内容可能不透明 | 强制 Thinking | 默认 Thinking，可按请求关闭 |
| Thinking 档位 | 视具体选定模型/API 而定 | `low / high / max`（5.3 系列） | `low / medium / xhigh` |
| 工具交错 | 有 reasoning + function call + tool result 回路 | 官方 interleaved thinking | 模型工具格式 + serving parser + Harness 回路 |
| 历史 reasoning | `previous_response_id`、手动 item 回放/加密内容；支持范围依模型 | `clear_thinking: false`，完整回传 `reasoning_content` | `preserve_thinking` 默认 true，实际依服务实现 |
| 结构化计划 | Codex 可选 `update_plan` | 取决于集成 Harness | 取决于集成 Harness |
| 是否公开“最佳 THINK 时机”的完整训练配方 | **没有足够公开证据** | **没有足够公开证据** | **没有足够公开证据** |

**最重要的区别**：`enable_thinking`、`reasoning_effort`、`preserve_thinking` 是*接口与推理状态控制*，不等于模型已针对“何时思考”用明确标签或独立奖励训练了一个最优调度器。

## 7. 哪些研究真正尝试学习「何时思考」？

### RACE — When Should Agents Think?（2026-10-08，预印本）

[原论文 arXiv:2610.12061](https://arxiv.org/abs/2610.12061) 针对**跨工具轮次的推理冗余**：前一轮的 reasoning 可能仍足以支持后续动作，因而不是每一轮都值得重新推理。

作者提出 LoGiC（Likelihood-Guided Progressive Reasoning Cover Detection），识别**删除部分 reasoning 后，当前及后续参考动作的条件似然下降有限**的轮次，然后用这些删除信号训练 SFT + Agentic RL 策略。论文报告在 ScienceWorld、WebShop、AppWorld、DeepSearch 等 Agent 基准上减少推理成本并保持/改善表现。

其直觉可以用下面的**非原文定理的简化示意**表达：

$$
\Delta_t =
\log \pi(a_t^{*}\mid h_t,r_t)
-\log \pi(a_t^{*}\mid h_t).
$$

但它**绝不只是检查某一轮 `\Delta_t` 是否小**：原论文专门考察推理删除对跨轮次后续动作的影响。似然只是*代理*，删除 CoT 不影响参考动作概率也不能保证发生不可逆操作时没有额外风险。

### CogRouter — Think Fast and Slow（ICML 2026）

[ICML 2026 官方页面](https://proceedings.mlr.press/v306/yang26cz.html)。论文把复杂 Agent 决策分成四个不同认知深度层次，训练模型**按步骤**选择不同深度，而不是始终在 fast/slow 之间固定选择。

与 RACE 的区别：RACE 强调已有 reasoning 对后续动作的**跨轮支持范围**；CogRouter 强调当前步骤需要的**认知深度分配**。它们都不等于操作系统级别的硬编码“在所有工具调用后必须 THINK”。

### 相关但研究对象不同的三条线

- [AdapThink（ACL Findings 2026）](https://aclanthology.org/2026.findings-acl.477/)：关注推理长度/反思偏好，实验主要是数学和代码；**不是专门证明机器人动作前何时思考**。
- [AdaReasoner（ICLR 2026）](https://www.microsoft.com/en-us/research/publication/adareasoner-dynamic-tool-orchestration-for-iterative-visual-reasoning/)：通过 Tool-GRPO 训练选择、组合工具；核心是**何时使用工具**，与是否生成 CoT 有交集但不等价。
- [MOSAIC（ICML 2026）](https://proceedings.mlr.press/v306/agarwal26e.html)：把危险工具调用下的计划、检查、执行/拒绝显式训练；核心是**何时安全行动**，不是单纯压缩 CoT token。

## 8. 对长程机器人 / Coding Agent 更有价值的设计问题

以下是**我的工程与研究分析，不是 GLM、Qwen、Codex 的官方方法**。

### 8.1 真正应学习的是“继续执行的价值”与“重新思考的价值”

给定当前观测与历史 $h_t$，假设可以选择 `THINK` / `ACT` / `OBSERVE`。理想化目标为：

$$
\max_\pi\;\mathbb E\left[
R_{\mathrm{task}}
-\lambda C_{\mathrm{reason}}
-\mu C_{\mathrm{tool}}
-\nu C_{\mathrm{failure}}
\right].
$$

其中：
- `C_reason`：推理 token / 延迟；
- `C_tool`：观察、模拟、工具执行耗时；
- `C_failure`：碰撞、越界、不可逆操作、任务失败等代价。

只优化“少用多少 CoT token”可能奖励草率行动；只优化“多思考更安全”又可能形成无意义的空转。

**一个工程准则**：危险动作的硬安全约束应由执行器/权限层负责，而不是全靠模型推理成本惩罚。不要将“思考再久”误当作机器人实际安全保证。

### 8.2 把哪些状态放进模型比添加一个 `think()` 工具更重要

至少区分：

- **已知目标和计划**：不必每轮重新复述全部步骤；
- **新观测与执行偏差**：期望动作 vs 实际动作、工具错误、视觉变化；
- **剩余工作与潜在风险**：是否处于接触/不可逆状态、是否满足停止条件；
- **推理上下文保留**：如果禁用 preserved thinking，需要其他形式的结构化计划/事实状态，不能当作以前的推理全部自然还在。

在不强塞工作流的 Agent 中，应该允许模型按需求观察、推理、行动，并观察它是否**主动**在关键异常处选择更深推理。这是待检验能力，而不是可以靠 prompt 宣称已获得的能力。

### 8.3 最小可证伪实验：不是「哪个模型 CoT 最长」

使用相同模型、任务和工具集，对比：

| 策略 | 控制变量 | 需要观察的真实结果 |
|---|---|---|
| Every-turn Think | 每次工具调用后都要求完整推理 | 成功率、延迟、token、失败动作 |
| No explicit Think | 若模型/API 支持，关闭 thinking 或最低 effort | 是否过早行动、工具解析退化 |
| Fixed effort | 所有轮统一 low/medium/high（按模型支持的值） | 简单任务浪费与困难任务失败 |
| Event-triggered | 工具失败、观测突变、风险增大才建议深思考 | 是否比固定努力更高效且稳定 |
| Learned scheduler | 从任务回报和成本学习条件化策略 | 同等成功率下成本下降，或同等成本下成功率上升 |

**关键细节**：GLM-5.3-Flash 不允许真正关闭 thinking，不能把它硬塞进 “No Think” 组；应比较 `low` 与 `max` 或其他有效设置。Qwen3.8 可做明确开关对照，但必须记录禁用 thinking 后工具调用解析是否仍正常。

**独立指标**：按真实任务而非 token 统计成功率；报告崩溃/重试、工具合法率、异常恢复率、推理开销、总 wall time 与高风险动作发生次数；尤其分析**跳过 CoT 却动作正确**和**多想之后仍然失败**两类样本。

## 9. 适合后续学习的顺序

1. **基础机制**：读[OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)，亲自区分 reasoning item、tool call、tool output。
2. **长程状态**：读[OpenAI Reasoning Items](https://developers.openai.com/api/docs/guides/reasoning)、[Z.ai Preserved Thinking](https://docs.z.ai/guides/capabilities/thinking-mode)和[Qwen 模型卡](https://huggingface.co/Qwen/Qwen3.8-27B)，回答“历史推理实际保留了哪一部分”。
3. **具体实现**：读[Codex update_plan 提示词](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md)与两个模型官方 API 示例，区分模型训练能力与 Harness 约束。
4. **真正研究「何时思考」**：先读[RACE](https://arxiv.org/abs/2610.12061)，再读[CogRouter](https://proceedings.mlr.press/v306/yang26cz.html)。
5. **再区分相邻问题**：[AdaReasoner](https://www.microsoft.com/en-us/research/publication/adareasoner-dynamic-tool-orchestration-for-iterative-visual-reasoning/)研究选择工具，[MOSAIC](https://proceedings.mlr.press/v306/agarwal26e.html)研究何时安全行动。
6. **复述与反证**：为什么“推理一直保留”不代表“无需再次推理”？为什么“工具使用更多”不代表“任务成功率更高”？

## 10. 常见误区速查

- **误区 1**：「CoT 是一种工具调用」→ 通常不是；可以人为封装，但不代表原生机制。
- **误区 2**：「首 token 自主决定 THINK/ACT」→ 不适用于强制 thinking、预填 chat template 或结构化 reasoning channel 的所有系统。
- **误区 3**：「长程 Agent 上一轮的 CoT 一定会丢」→ 错；OpenAI、Z.ai、Qwen 都有明确的保留/回传机制，但默认值与支持范围不同。
- **误区 4**：「Codex 的 update_plan 负责决定什么时候思考」→ 它是外部计划工具，不等同于隐藏 reasoning 的控制器。
- **误区 5**：「`reasoning_effort=low` 等于关闭 Thinking」→ 错；尤其 GLM-5.3-Flash 强制 thinking。
- **误区 6**：「思考越少，整个任务越快」→ 单轮 token 更少可能导致错误、重试、回滚，最终延迟反而增加。
- **误区 7**：「模型说要调用工具就已经执行了」→ 错；必须由 Harness 解析、验证权限、真正执行并回报结果。
- **误区 8**：「模型学会了何时思考，安全性就解决了」→ 错；机器人/浏览器的高风险动作还需要独立执行约束和审计。
- **误区 9**：「刚才生成时有 KV Cache，下一轮就一定记得 CoT」→ 错；跨请求历史与缓存是两种机制。
- **误区 10**：「第三方 Bridge 能解密 OpenAI 的推理」→ 错；opaque/encrypted item 不能直接还原为其他模型的明文 CoT。
- **误区 11**：「回填 CoT 一定触发 Prefix Cache 命中」→ 错；需满足 token 前缀、缓存块和服务器配置等条件。
- **误区 12**：「Harness 根本不能决定什么时候想」→ 错；具体 Agent 可选择模型/预算/输入、提供事件触发重规划或单独的 THINK/ACT 调度器。

---

**资料核对日期**：2026-10-20。模型接口、支持 effort 档位和文档随版本变化，以对应官方页面及服务端版本为准；仓库 Issue 是单用户/配置下的问题线索，不能替代官方确认与独立复现。
