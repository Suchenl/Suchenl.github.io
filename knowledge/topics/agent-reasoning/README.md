---
contentType: review
domains: ["大模型与强化学习/推理与 Agent 系统"]
title: "Agent 长程推理与工具调用"
shortName: "Agent Reasoning"
aliases: ["CoT", "when to think", "tool calling", "Codex", "GLM-5.3-Flash", "Qwen3.8-27B", "推理调度"]
summaryZh: "从模型推理、结构化工具调用到跨轮状态管理，解释 Agent 如何运行、何时需要再次思考，以及不同 API 与 Harness 能力的边界；包含协议术语与原始证据。"
categories: ["强化学习与 Agent", "强化学习与 Agent/长程推理与工具使用"]
readingOrder:
  - ref: research/how-agent-reasoning-tools-and-state-work
    stage: "系统分工"
    why: "先厘清模型、API、工具执行器与跨轮状态分别负责什么。"
  - ref: glossary/thinking-tool-protocol
    stage: "协议与术语"
    why: "区分 Thinking、Tool Call、消息结构、状态回放与缓存。"
  - ref: topics/agent-reasoning/reviews/cot-tool-use-and-thinking-scheduling
    stage: "机制精读"
    why: "对比 CoT 和工具调用，并检查不同模型与 Harness 的行为边界。"
  - ref: research/how-models-learn-adaptive-reasoning
    stage: "开放问题"
    why: "进一步讨论何时思考、思考多久与成本敏感训练的可验证假设。"
catalogTitleZh: "Agent 推理、工具与跨轮状态"
---

# Agent 长程推理与工具调用

**核心问题**：CoT 是工具调用吗？模型如何选择何时推理、推理多久、何时重新规划？Codex、GLM、Qwen 的模型能力与 Harness 接口有何区别？

## 优先阅读

- [CoT 是工具调用吗？Codex / GLM-5.3-Flash / Qwen3.8-27B 的机制与研究证据](reviews/cot-tool-use-and-thinking-scheduling.md)：一篇完整的中文 Q&A、官方 API 参数对照、长程 reasoning state、研究论文与可证伪实验。
- [SFT/RL Agent 后训练](../llm-agent-training/README.md)：训练信号、优化目标和环境奖励的不同来源。
- [DeepSeek-R1](../../papers/2025/deepseek-r1.md)：理解推理能力训练，不要把它等同于 Agent 跨轮 CoT 调度。
- [Agent 后训练实验议程](../../research/agent-post-training-experiment-agenda.md)：学习如何做预算匹配和可执行的对照。

**新增重点**：为什么同一轮生成时 CoT 天然在解码前缀里，跨工具轮之后却需要历史回填？请读[当前生成、跨轮回放与 KV Cache](reviews/cot-tool-use-and-thinking-scheduling.md#31-从同一次生成到跨轮请求的断点)，解释通用 Responses / Chat Completions 推理状态协议差异与缓存复用条件，不引用任何未公开实现。

**重要结论**：思考开关、思考深度、历史 thinking 保留和是否真的学会按风险重想，是四个不同问题。新模型公开了接口不意味着公开了所有策略训练细节。
