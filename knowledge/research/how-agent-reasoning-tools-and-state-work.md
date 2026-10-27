---
contentType: qa
domains: ["大模型与强化学习/推理与 Agent 系统"]
title: "一个 Agent 是如何组织推理、工具调用与跨轮状态的？"
questionTitleEn: "How Do Agents Organize Reasoning, Tool Calls, and Cross-Turn State?"
categories: ["强化学习与 Agent", "强化学习与 Agent/长程推理与工具使用"]
summaryZh: "从模型 Token、API 结构化输出到 Harness 的工具执行和状态回传，比较 Claude Messages、OpenAI Responses/Codex、Qwen/vLLM、OpenHands、LangGraph、smolagents 与 OpenCode；解释 Thinking、Tool Call、执行反馈和跨轮历史分别由谁负责。"
questionSummaryEn: "An end-to-end comparison of how Claude, OpenAI Responses/Codex, Qwen/vLLM, OpenHands, LangGraph, smolagents and OpenCode organize reasoning, tool use, execution feedback and conversation state."
---

# 一个 Agent 是如何组织推理、工具调用与跨轮状态的？

> **兴趣问答与系统实现综述 · 2026-10-21。** 这是一项基础技术理解问题，不是宣称提出一个新科研问题。区分公开 API 文档/开源源码可以验证的事实，与未公开的模型训练配方、内部完整 CoT。接口会随版本变化。

## 0. 一句话回答

**模型负责生成下一步的内容和工具调用意图；模型 API 把它们编码为结构化的输出项；Agent Harness 解析和执行工具、验证权限并收集反馈；上下文/状态层决定下一次模型调用能看到哪些历史。**

Thinking（推理内容）通常**不是 Tool**。交错推理只是允许模型在工具结果返回后继续生成推理，不意味着外部工具运行过程中 Transformer 的同一次前向计算一直保持执行。

## 1. 先区分四层，不然所有协议都会混淆

| 层次 | 输入/输出 | 关键职责 | 典型技术 |
| --- | --- | --- | --- |
| 模型 Token / Chat Template | tokens、role/channel/工具标记 | 模型生成、推理内容与工具格式 | Qwen/Hermes 等模型的特殊模板 |
| 模型 API | typed content blocks / output items / tool calls | 序列化结果、调用 ID、停止原因、流式增量 | Claude Messages、OpenAI Responses、Chat Completions |
| Agent Harness / 工具执行 | action、tool result、审批、环境反馈 | 真正执行操作、错误处理、路由与限制 | Codex、OpenHands、OpenCode |
| Context / State / Memory | history、reasoning state、checkpoint、事件日志 | 下次调用看到什么、如何压缩和恢复 | Responses state、LangGraph checkpointer、Agent memory |

~~~text
用户任务 + 工具 Schema + 当前上下文
               ↓
            Model API
     ┌─────────┼───────────┐
  reasoning?  message?   tool call(s)?
                            ↓
                 Harness 解析/权限检查
                            ↓
                工具执行 / 真实环境
                            ↓
                result / observation
                            ↓
                  状态整理 / 回放
                            ↓
                       下一次调用
~~~

**生成 Tool Call 不等于执行了 Tool；保存上下文不等于模型已读取所有历史；有 KV Cache 不等于下次请求自动获得逻辑记忆。**

## 2. Claude Messages API：Assistant Message 内是多个 Content Block

Anthropic 将 Assistant 响应组织为 `role: "assistant"` 的 Message，其中 `content` 是数组。常见类型：

| Block | 作用 |
| --- | --- |
| `thinking` / `redacted_thinking` | 推理表示、可能的加密状态及签名 |
| `text` | 常规文本 |
| `tool_use` | 客户端工具的调用请求：`id`、`name`、`input` |

示例（教学示意，签名为占位符）：

~~~json
[
  {
    "role": "assistant",
    "content": [
      {"type": "thinking", "thinking": "...", "signature": "<opaque>"},
      {"type": "tool_use", "id": "toolu_1", "name": "read_file",
       "input": {"path": "config.py"}}
    ]
  },
  {
    "role": "user",
    "content": [
      {"type": "tool_result", "tool_use_id": "toolu_1", "content": "file content"}
    ]
  }
]
~~~

Claude 发出 `tool_use`（并通常伴随 `stop_reason: "tool_use"`）后，**客户端工具**由 Harness 执行；回传在下一次请求中使用 `role: "user"` 的 `tool_result`。这个 user-role 只是 API 消息结构，**不代表人类用户亲自执行工具**。平台自带的 **server tools** 则可能直接在 Anthropic 服务端执行，不需要客户端写同样的循环。

- **Interleaved Thinking**：工具结果回来后，模型仍允许生成新的 `thinking` block；不强制每次工具调用前都 Think。
- **Adaptive Thinking**：模型依据请求分配是否推理、推理多深。这与交错推理是两个维度。
- **Preserved Thinking**：按协议保留历史推理状态；不能随意篡改 `signature` 或 `redacted_thinking`。对于工具调用连续阶段，必须遵守官方对 thinking block 回传的要求。
- **多次调用 ≠ 同一次模型计算**：一个逻辑 Assistant Turn 可以发生多次请求、工具执行与模型继续生成。

原始文档：[Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works) · [Extended/Interleaved Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) · [术语页](../glossary/thinking-tool-protocol.md)。

## 3. OpenAI Responses API：顶层 Output Item 不同于 Claude Content Block

Responses API 的 `response.output` 是多种类型 Item 组成的数组；常见项是：

| 类型 | 作用 |
| --- | --- |
| `reasoning` | 推理 Item；原文通常不向客户端开放，可以带摘要或 opaque/encrypted state |
| `function_call` | 结构化函数调用请求：`call_id`、`name`、`arguments` |
| `message` | 助手输出的消息，消息内部仍有自己的内容块 |
| `function_call_output` | **下一次请求的 input Item**，用于提交客户端工具执行结果 |

概念化输出：

~~~json
[
  {"type": "reasoning", "id": "rs_1", "summary": []},
  {"type": "function_call", "call_id": "call_1",
   "name": "read_file", "arguments": "{\"path\":\"config.py\"}"}
]
~~~

工具执行后回传：

~~~json
{"type": "function_call_output", "call_id": "call_1", "output": "file content"}
~~~

**Responses 的 `function_call_output` 并不是 Claude 的 user-role `tool_result`**。另外旧式 Chat Completions 常用 Assistant `tool_calls` + `role: "tool"` 的回传格式，这属于第三种封装方式。

### Reasoning 如何跨请求？

OpenAI Responses 可以通过 `previous_response_id` / conversation state 续接，也可以手工回放兼容的前次 output items。对 stateless 场景，API 能提供加密的 reasoning state；这些 item 不代表可读的完整 CoT。保留哪些历史 reasoning 还涉及模型族、`reasoning.context`、兼容性和服务端协议，不是所有 GPT 版本行为完全一样。

**Chat Completions 的普通消息历史与 Responses 的 reasoning item 回放不能无条件看成等价**，更不能用“上次物理 KV 还在”替代跨请求的逻辑历史。

原始文档：[OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling) · [OpenAI Reasoning](https://developers.openai.com/api/docs/guides/reasoning) · [Conversation State](https://developers.openai.com/api/docs/guides/conversation-state)。

## 4. Codex（GPT）：在 Responses 之上实现执行、路由、权限和 UI 事件

**Codex 不是 OpenAI Responses API 的另一个名字。** OpenAI 开源 Codex 核心使用 Responses API 作为模型交互基础，但还要完成工具与真实工作区的连接：

~~~text
Responses: function_call
         ↓
Codex Core 收到/检查响应
         ↓
ToolRouter → 注册的 Tool Handler
         ↓
执行约束 / 审批 / 沙箱
         ↓
实际运行命令、应用补丁或执行其他工具
         ↓
收集结果、更新 Session 状态
         ↓
构造下一次模型请求
~~~

可直接阅读 [当前 ModelClient 源码](https://github.com/openai/codex/blob/main/codex-rs/core/src/client.rs)：描述会话/轮次生命周期、Responses API streaming、provider、连接与状态。再读 [ToolRouter 源码](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/router.rs)：模型可见的 ToolSpec、工具 Registry、调用 ID 与内部 Handler 的关系。

还有**第三层协议**：[Codex 的 UI/Core 协议文档](https://github.com/openai/codex/blob/main/codex-rs/docs/protocol_v1.md) 含 `Op`、`EventMsg`、任务开始、执行审批等事件，是 **Codex Core ↔ UI/应用** 的通信，不是 GPT 模型直接返回的 Responses Item。此文件本身注明文档和现行代码可能不完全一致；最新行为应核对 Core 实现。

因此，应明确区分“模型返回 reasoning / tool call”、“Codex core 执行了什么”和“UI 向用户显示什么”。公开 Harness 源码不能证明 GPT 内部怎样训练自适应推理，也不一定公开完整原始 CoT。

## 5. Qwen/GLM 等开源模型与 vLLM：特殊 token 怎样变成 Tool Call？

开源模型可能使用 chat template、特定工具标记、独立 `reasoning_content` 或类似 channel。接入 vLLM/SGLang 后通常多出**Serving Adapter** 一层：

~~~text
原生模型 token 序列
      ↓ chat template / reasoning parser / tool-call parser
提供统一外观的 API Message
      ↓ Harness provider adapter
统一语义的 Action / Observation
      ↓ 工具执行
~~~

[vLLM 官方 Tool Calling](https://docs.vllm.ai/en/stable/features/tool_calling/) 明确：Auto Tool Choice 需要设置适合的 `--tool-call-parser`，还会受工具模板、参数 schema 与结构化解码约束影响。**同一模型在不同 Harness 中行为差异**，可能来自 Parser、Tool Schema、历史回放、错误提示、权限、最大 Token 或重试机制，并非仅由模型权重造成。须用真实工具调用 trace 逐项核验，而不是凭体验就断言某个 Bug 已找到。

## 6. 四种开源 Agent 怎么组织 Agent Loop？

### 6.1 OpenHands Software Agent SDK：事件驱动的 Action–Observation

官方 [Agent 架构文档](https://github.com/OpenHands/docs/blob/main/sdk/arch/agent.mdx) 定义 LLM → ActionEvent → Tool Execute → ObservationEvent，涉及待审批操作、上下文压缩与事件历史；[实际 Agent 源码](https://github.com/OpenHands/software-agent-sdk/blob/main/openhands-sdk/openhands/sdk/agent/agent.py)执行这种步进逻辑。

这三种信息不要混为一谈：

- **Message Event**：模型对外输出的内容；
- **Action Event**：请求做什么；
- **Observation Event**：执行真实返回了什么、是否错误。

这些是 **OpenHands 内部事件**，并不是 Claude 原生 API 的字段。OpenHands 可以适配多个 Provider，另外还有 Workspace/沙箱与 Conversation State。工具结果进入事件历史，下一次模型调用时从历史构造上下文。

### 6.2 LangGraph：控制流/状态图，而非模型输出格式

LangGraph 的核心是 **Node + Edge + State**，可将模型调用作为节点、工具执行作为另一个节点，并用条件边决定是否继续。`MessagesState` 保存消息，Reducer 管理更新；Checkpointer 提供 thread 内快照，Store 维护跨 thread 数据。

LangGraph **不会自动创造出一种独立于模型 API 的原生 Thinking channel**。它也不能仅凭“保存了消息”就保证 Claude signature 或 OpenAI opaque reasoning 状态跨不同适配器被完整保留。

阅读：[LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · [Tools](https://docs.langchain.com/oss/python/langchain/tools)。

### 6.3 smolagents：轻量多步循环

[Hugging Face smolagents](https://huggingface.co/docs/smolagents/reference/agents) 的 Agent 以 `MultiStepAgent` 为基础，`AgentMemory` 记录任务、行动、规划、结果。

- **ToolCallingAgent**：模型输出结构化（JSON-like）的 Tool Call，外部执行器执行。
- **CodeAgent**：模型生成 Python 代码来协调工具，再由 Python 执行器运行。**模型生成的 Python 不等于模型自身已执行 Python**，执行隔离仍然很重要。

与 OpenHands 相比，它的核心强调轻量工具循环；与 LangGraph 相比，不需要为简单任务搭完整状态图。

### 6.4 OpenCode：Agent 配置、工具权限与子 Agent

[OpenCode 的 Agent 文档](https://opencode.ai/docs/agents) 显示它通过 Agent 设置模型/系统说明/工具权限，也有不同主要 Agent 和子 Agent。`ask/allow/deny` 工具权限属于 **Harness/应用控制**，不是模型靠 CoT 就能解除的权限。

这里的“Plan Agent”是**应用层 Agent 配置**，不等同于 Anthropic 的 `thinking` block，也不等于所有模型强制每轮走 Plan→Act 的顺序。

## 7. 总对比表：同样一次 read_file 调用放在何处？

| 系统 | 调用意图表示 | 执行后反馈 | 跨轮状态 | 本质层次 |
| --- | --- | --- | --- | --- |
| Claude Messages | Assistant content 中 `tool_use` | user-role `tool_result` | messages + thinking/signature | 模型 API |
| OpenAI Responses | `response.output` 中 `function_call` | 下次 input 的 `function_call_output` | response state / reasoning items | 模型 API |
| Chat Completions | `assistant.tool_calls` | `role: tool` | 客户端消息历史/适配协议 | 模型 API |
| Codex | Provider call → ToolRouter | Handler 结果 → 模型输入 | Session / Core / UI Events | Coding Harness |
| OpenHands | Provider call → ActionEvent | ObservationEvent | Conversation Events | Coding Harness |
| LangGraph | AIMessage / 节点调用 | ToolMessage / 状态更新 | MessagesState + Checkpointer | 控制流框架 |
| smolagents | JSON-like Tool Call / Python 代码 | ToolOutput + AgentMemory | 多步记忆 | 轻量 Agent 框架 |
| OpenCode | 按 Provider 解析调用 | 工具/权限结果 | Session / Agent | Coding Harness |

**表里的“对应”是功能上可类比，绝不是协议 JSON 可以逐字段无损转换。** 推理 signature、加密 state、流式事件尤其需要供应商专门的处理方式。

## 8. 三种“轮次”不要混淆

1. **一次模型解码/响应**：模型生成若干 token/items，到模型停止、工具调用、截断等事件。
2. **一个工具往返（Tool Round-Trip）**：模型产生工具请求 → 真正执行 → 收到新反馈 → 下一次模型调用；通常不止一次 HTTP 请求。
3. **一个逻辑 User Task / Assistant Turn**：可能包含很多工具往返。Codex 又有 Session、Task、Turn 等内部概念，它们与 Claude 文档中的 Assistant Turn **不必一一对应**。

## 9. 如何判断一个 Harness 的协议实现是否可靠？

不需要给模型强行规定“先写 Plan、再 Think、最后 Act”，但下面的**执行不变量**必须可靠：

1. **调用 ID 和结果准确配对**；并行工具请求不能串结果，重试需避免重复执行有副作用的动作。
2. **请求 ≠ 成功执行**；执行器要明确报告实际结果、错误、超时、取消与未执行。
3. **权限与能力由执行层强制**；工具能被模型选择不等于它得到执行权限。机器人还必须有独立硬安全约束。
4. **流式输出只有在结构完整时才能作为调用**；不应该把不完整 JSON delta 直接执行。
5. **历史记录与模型实际可见上下文分开审计**：事件日志存了什么？每次送给模型什么？哪些被压缩或省略？
6. **推理状态按 Provider 原样处理**：不要假装能把 Anthropic signature 变成 OpenAI reasoning item，或把 opaque reasoning 解密成 Qwen 的明文 CoT。
7. **Tool Result 不是高优先级命令**；网页、文件和工具输出可能有提示注入，需要按非可信数据处理。
8. **回放可验证**：记录模型版本、请求参数、工具 schema、动作、执行结果与必要的原生 Provider Items；会话压缩要尽可能保留事实、错误与任务约束。

关键的架构取舍是：**统一 Action / Observation / Execution Evidence 的语义，但保留 Provider 原生不可读 reasoning 项的协议特性**。

## 10. 常见追问

**Q：Thinking 是不是一个特殊工具？** 通常不是。你可以人为做一个 `think()` 工具，但那是应用设计的外部操作，不等于原生推理。

**Q：同一 Assistant Message 可以既包含文字又包含 Tool Call 吗？** 可以。Claude Message 的 content 数组可以包含 `text` 与 `tool_use`；Responses API 则是多个 top-level items。实际是否存在 `thinking` 还受模型和请求配置影响。

**Q：Interleaved Thinking 是连续不间断地思考吗？** 不是。外部工具执行一般在模型调用暂停之后发生；回传工具结果后发起另一轮生成，才可能产生新的 Thinking。

**Q：为什么两个系统都用同一个模型，体验还是很不一样？** 模型外还存在 Provider Adapter、模板与 Parser、可见历史、工具实现、错误反馈、权限、终止条件、重试与上下文压缩。需用逐步 trace 定位，不能简单认为模型本身不同。

**Q：如果要让 Agent 自己学会自适应推理，需要改协议吗？** 不一定。大部分情况下现有 API 已能承载模型的行动和推理，研究目标是用训练/真实反馈学习策略。更深入的讨论见 [如何让模型学会自适应推理](how-models-learn-adaptive-reasoning.md)。

## 11. 个人更认可的工程设计

保留两层清晰界面：

~~~text
各 Provider 原生 API 响应
       ↓ 原样留存必要的 provider item / signature
Provider Adapter → 内部统一 ToolCall / Action / Observation / Error
       ↓
Harness 的执行、权限与状态管理
       ↓
真实结果 + 可回放事件
       ↓
根据当前任务组织下一次模型上下文
~~~

我倾向于**尽量简化 Harness 的人为流程限制，但不弱化执行协议、事实回报和安全边界**。Thinking 可以有，也可以根据模型机制省略；Tool Call 可以连续发生；是否主动观察、继续行动、重新规划，应由模型能力与反馈驱动，而不是把它们强制写成每轮固定的 Thought–Action–Observation 文本模板。

这是从现有公开实现归纳的工程判断，不是声称已通过实验验证的新算法。

## 12. 核心官方链接与源码

**模型协议**：[Claude Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works) · [Claude Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) · [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling) · [OpenAI Reasoning](https://developers.openai.com/api/docs/guides/reasoning) · [OpenAI Conversation State](https://developers.openai.com/api/docs/guides/conversation-state) · [vLLM Tool Calling](https://docs.vllm.ai/en/stable/features/tool_calling/)。

**Agent 实现**：[Codex ModelClient](https://github.com/openai/codex/blob/main/codex-rs/core/src/client.rs) · [Codex ToolRouter](https://github.com/openai/codex/blob/main/codex-rs/core/src/tools/router.rs) · [Codex 协议](https://github.com/openai/codex/blob/main/codex-rs/docs/protocol_v1.md) · [OpenHands Agent 架构](https://github.com/OpenHands/docs/blob/main/sdk/arch/agent.mdx) · [OpenHands SDK](https://github.com/OpenHands/software-agent-sdk) · [LangGraph State](https://docs.langchain.com/oss/python/langgraph/use-graph-api) · [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · [smolagents Agents](https://huggingface.co/docs/smolagents/reference/agents) · [OpenCode Agents](https://opencode.ai/docs/agents)。

**配套知识**：[Thinking 与 Tool Calling 术语](../glossary/thinking-tool-protocol.md) · [长程 Agent 如何思考](../topics/agent-reasoning/reviews/cot-tool-use-and-thinking-scheduling.md)。
