---
contentType: glossary
domains: ["大模型与强化学习/推理与 Agent 系统"]
title: "Thinking 与工具调用协议术语"
shortName: "Thinking / Tool Protocol"
aliases: ["Beta Header", "Interleaved Thinking", "Adaptive Thinking", "Thinking Block", "Content Block", "Tool Use", "Tool Result", "Assistant Turn", "Signature", "Preserved Thinking", "Extended Thinking", "Reasoning Effort"]
categories: ["强化学习与 Agent", "强化学习与 Agent/长程推理与工具使用"]
summaryZh: "精确定义 Beta Header、Thinking/Content Block、工具调用与反馈、Assistant Turn、Interleaved/Adaptive/Preserved Thinking、Signature 及跨请求推理状态；区分模型行为、API 协议和 Harness。"
---

# Thinking 与工具调用协议术语

> 本页是**协议与概念术语表**，不是任何闭源模型的内部训练算法说明。主要依据 Anthropic 官方 [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)、[旧手动 Extended Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)、[API Primer](https://platform.claude.com/docs/en/claude_api_primer) 和 [OpenAI Reasoning API](https://developers.openai.com/api/docs/guides/reasoning)。具体模型的接口支持情况会变化。

## Beta Header（测试版 HTTP 请求头）

HTTP Header 是请求携带的**协议元数据**，不是模型输入中的 Prompt、特殊 Token 或工具。Anthropic 在 2025 年将交错推理作为 Beta 功能推出时，需要在部分模型的 API 请求中设置：

~~~http
anthropic-beta: interleaved-thinking-2025-05-14
~~~

Python SDK 在旧模式下应通过 `client.beta.messages.create(..., betas=["interleaved-thinking-2025-05-14"])` 封装这个 Header；**不要把 `betas` 直接传给普通的 `client.messages.create`**。其作用是为**旧版手动 Extended Thinking** 启用交错推理，并不意味着模型增加了一个名为 thinking 的工具。

版本差异：Claude Opus 4.5 / Sonnet 4.5 和更早部分 Claude 4 模型在手动模式下要求这个 Header；较新的支持 Adaptive Thinking 的型号（包括 Claude Opus 5.5）无需它；有些 API 即使接受该 Header，也会忽略它。**Header 被接受 ≠ Header 在该模型上实际生效**。

## Content Block（内容块）/ Message（消息）

Anthropic Messages API 中，一个 `message` 有 `role`（如 `assistant` / `user`），而 `content` 是不同类型的块组成的数组：

| Content block | 实际含义 | 是否外部执行 |
| --- | --- | --- |
| `thinking` | 模型推理内容的 API 表示，可能只有摘要或空文本加密状态 | 否 |
| `text` | 普通文字输出 | 否 |
| `tool_use` | 结构化工具**请求**，包含调用 ID / 名称 / 参数 | 是，需执行器或平台处理 |
| `tool_result` | 工具的执行结果或错误，匹配原调用 ID | 否，是已执行结果 |
| `redacted_thinking` | 无可读原文的加密推理内容 | 否 |

**原生 Thinking 不是 Tool。** 可以人为设计 `think()` / `update_plan` 这样的工具，但那是某个 Harness 定义的外部操作，不等于 Anthropic 的 `thinking` block。

## Tool Use（工具请求）与 Tool Result（工具结果）

- `tool_use` 由模型产生，通常含 `id`、`name` 和 `input`，只是**请求**：不表示已经执行成功。
- Harness 收到客户端工具请求后解析、鉴权、执行并取得反馈。对于 server-side tool，工具执行由 API 平台管理。
- `tool_result` 通过 `tool_use_id` 配对；失败可添加 `is_error: true`。在 **Claude Messages API** 中，客户端工具的 `tool_result` 放在 `role: "user"` 的内容数组里——这是消息协议角色，不表示人类用户亲自执行了工具。
- 模型响应的 `stop_reason: "tool_use"` 表示停在工具请求，任务未必完成。不能将 Claude 的 `tool_result` 消息结构直接套用到 OpenAI Responses 的 `function_call_output` 上。

## Assistant Turn（逻辑助手轮次）与 API Request（单次请求）

一项用户任务可以包含**一个逻辑 Assistant Turn，但多次模型 API 请求**：

~~~text
用户提出任务
  → assistant: [thinking?] [tool_use #1]
  → Harness 执行工具 #1
  → user:      [tool_result #1]  （协议角色）
  → assistant: [thinking?] [tool_use #2]
  → Harness 执行工具 #2
  → user:      [tool_result #2]
  → assistant: [text 最终回答]
              ↑ 逻辑 Assistant Turn 结束
~~~

工具通常在**两次模型生成之间**执行，因此“交错推理”不是让一次 Transformer 前向持续穿过外部工具的运行时间。跨请求携带的消息历史和推理状态由协议及 Harness 管理，不能靠物理 KV Cache 自动保证。当前逻辑 Turn 的 Thinking 配置也不能随意在中间切换。

## Interleaved Thinking（交错推理）

允许模型在接收到工具结果后，再生成新的 `thinking` block，之后继续 `tool_use` 或输出最终答案。它改变的是**Thinking 能在哪些工具调用节点之间出现**，不是多了一个 Thinking 工具。**连续工具调用不要求每次之间都出现显式 Thinking**。

## Adaptive Thinking（自适应推理）与 Reasoning Effort（推理强度）

- **Adaptive Thinking**：允许模型根据当前输入与上下文选择是否产生显式推理及推理深度。Claude 新模型可用 `thinking: {"type":"adaptive"}`，一些型号默认采用。
- **Reasoning Effort**：请求级的计算强度偏好。通常是**软约束**，不等于固定 Token 数量，也不意味着 low 就会完全关闭推理。
- **两者与 Interleaving 的区别**：Adaptive 控制**是否/想多少**，Interleaved 控制**能否在工具结果之间继续想**。
- 公开协议不能说明模型内部究竟用了怎样的 SFT / RL 训练配方；没返回可读 Thinking 也不能推断模型完全没有内部计算。

## Extended Thinking / Manual Budget（旧手动扩展推理）

较旧配置是 `thinking: {"type":"enabled","budget_tokens":10000}`，开发者设置推理预算，并曾与 Interleaved Beta Header 联用。预算是推理上限/目标机制，并非保证恰好产生 N 个 Token。**Claude Opus 5.5 只支持 Adaptive Thinking，不应继续使用这套手动模式。**

## Signature / Redacted Thinking（签名 / 加密推理）

Claude 的 `thinking` block 含 `signature`：一种用于回传和校验**加密推理状态**的不可读字段。当前 API 可能只提供 Thinking 摘要或空的 `thinking` 文本，完整状态仍可由加密字段承载。`redacted_thinking` 使用不可读的加密 `data` 字段。

使用 Thinking 与工具调用时，应该把对应 Assistant 响应中的 **thinking blocks（含 signature）和 tool_use blocks 完整、未修改地回传**，再附工具结果继续请求。不要改写、解码或手工拼接 signature。这个协议与 Qwen/GLM 的某些明文 `reasoning_content`、OpenAI Responses opaque/encrypted reasoning item **不能不经适配就混用**。

## Preserved Thinking（历史推理保留）

- **Interleaved**：正在处理的逻辑 Turn 中，能否在工具调用之间产生新的推理。
- **Preserved**：历史 Thinking 是否在下一次请求、下一次用户对话或特定模型上下文中保留，以及以什么格式回传。

Thinking + 工具调用的**中间结果续接**需要保留对应的思考块；跨越真正的新用户 Turn 时，不同 Claude 型号对旧 Thinking 的保留或剥离规则并不相同。不能简单断言“全部一直保留”或“全部立即丢掉”。

## 最小 API 结构示例

以下是**示意**而非真实可直接执行的请求；签名、ID 都是占位值：

~~~json
[
  {
    "role": "assistant",
    "content": [
      {"type": "thinking", "thinking": "", "signature": "<opaque-signature>"},
      {"type": "tool_use", "id": "toolu_123", "name": "read_file", "input": {"path": "config.py"}}
    ]
  },
  {
    "role": "user",
    "content": [
      {"type": "tool_result", "tool_use_id": "toolu_123", "content": "file contents"}
    ]
  },
  {
    "role": "assistant",
    "content": [
      {"type": "thinking", "thinking": "", "signature": "<next-signature>"},
      {"type": "text", "text": "已经找到配置问题。"}
    ]
  }
]
~~~

**一次工具往返的本质**是：模型生成 `tool_use` → Harness 执行 → 返回 `tool_result` → 模型可以继续 `thinking`。并非把 Thinking 包装成一个工具。更不能把“减少显式 CoT Token”直接解释为“任务质量更高”。

完整跨框架实现对比：[一个 Agent 是如何组织推理、工具调用与跨轮状态的？](../research/how-agent-reasoning-tools-and-state-work.md)。

延伸阅读：[何时思考、CoT 与工具调用专题](../topics/agent-reasoning/reviews/cot-tool-use-and-thinking-scheduling.md) · [如何让模型学会自适应推理](../research/how-models-learn-adaptive-reasoning.md) · [Agent 后训练术语](agent-training.md)。
