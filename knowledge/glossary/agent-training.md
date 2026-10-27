---
contentType: glossary
domains: ["大模型与强化学习/后训练与策略优化"]
title: "LLM Agent 后训练术语"
categories: ["强化学习与 Agent"]
summaryZh: "RLVR、SFT、OPD、On-policy 等 Agent 后训练常见概念"
---

# LLM Agent 后训练术语

**最近核验：2026-10-19** · 基础定义见 [core.md](core.md)。

## RLVR：可验证奖励强化学习

Reinforcement Learning with Verifiable Rewards。模型自行采样输出，外部可验证机制判分（答案、代码测试、几何事实、状态标签等）。**存在正确答案不意味着必须用 SFT**；但也不意味着 RLVR 一定更高效。仅结果可验证而过程不可验证时，可能产生捷径推理。

## Rollout：轨迹采样

LLM 在一个问题或完整交互环境中，按策略输出回复、调用工具、接收反馈直至终止形成的样本。Agent Rollout 需要保存模型实际可见的消息、工具 schema、真实工具结果与策略版本。

## 有效采样组（Group Informativeness）

如果同题独立采样 $G$ 次，每条样本正确率为 $p$，奖励为二元正误，则：

$
P_{\mathrm{mixed}}=1-p^G-(1-p)^G.
$

它只是在这些假设下出现正负奖励差异的概率，不是对 RL 所有梯度项的严格非零概率判定。参见 [ReLIFT 例子](../papers/2026/relift.md) 与 [DAPO 的 Dynamic Sampling](../papers/2025/dapo.md)。

## PPO / GRPO

PPO 是带截断重要性比的策略优化方法；GRPO（Group Relative Policy Optimization）利用同一问题多个采样的组内相对回报估计优势，常可避免额外训练独立 Critic。GRPO 的全错/全对组在常见纯组内奖励设定下优势趋近零，不能简单断言每组都有训练信号。其他 KL、长度惩罚等项可能仍有梯度。

## RL 中的 SFT Replay

在 RL 训练阶段混入旧的监督样本或更新，以维持格式、基础动作或通用能力。既可以交替 optimizer step，也可以同一次更新加权混合 SFT/RL Loss；需要监测梯度冲突与遗忘。

## 同步混训 / 交替更新 / 分阶段训练

1. **分阶段**：SFT → RL → 可选蒸馏或新 SFT。
2. **交替**：相同参数轮流进行监督更新和策略更新。
3. **同一步混合**：用 `L = α L_SFT + β L_RL` 对同一可训练参数求梯度；虽然可行，但需要对齐并处理 Rollout 与训练权重版本。
4. **蒸馏**：不直接混 Loss，而通过教师行为或分布传递能力。

## On-Policy Distillation（OPD）

由当前学生策略生成样本，再让教师在相同前缀上提供分布信息/评分，通常优化学生对教师分布的接近度。它并不等同于 DAgger：后者传统上以学生访问的状态请求专家**动作标签**。OPD 的作用取决于教师质量与前缀分布覆盖。

## 多教师 OPD / MOPD

从多个不同能力教师蒸馏，试图减少依次训练不同能力时的互相退化。仍然需要明确教师如何选取、何时可用及是否对当前学生前缀有可靠判断。

## Verifier / 验证器

对模型输出或轨迹计算可信评价的程序、环境判据或证据模型。`动作接近演示轨迹` 只验证 imitation-alignment，**不等于任务完成、物理安全或反事实状态真实性**。

## 训练约束 vs 环境真实

RLVR 可以用离线真实轨迹构造**可验证预测任务**；但如果模型提出未实际执行过的动作，不能直接把同一条轨迹的下一帧当成该动作的后果。奖励应分清几何代理指标与真实任务成功。


## CoT / Thinking 与 Tool Calling

CoT 是模型生成的推理内容，Tool Calling 是需要外部执行器/平台处理的结构化工具请求；`thinking` 不是 `tool_use`，可选的 `update_plan` 工具也不是原生 CoT。详细协议、消息角色和执行边界统一见 [Thinking 与工具调用协议术语](thinking-tool-protocol.md)，研究背景见 [长程 Agent 何时思考专题](../topics/agent-reasoning/reviews/cot-tool-use-and-thinking-scheduling.md)。

## Interleaved Thinking / Preserved Thinking

**Interleaved** 表示可以在工具结果之后继续生成 Thinking，**Preserved** 表示历史推理是否按对应协议在后续请求中保留；与是否通过 HTTP Beta Header 启用属于不同维度。准确定义、Signature 回放和模型版本兼容条件见 [Thinking 与工具调用协议术语](thinking-tool-protocol.md)。

## Reasoning Effort / Adaptive Thinking

Effort 是模型接口对推理强度的软控制；Adaptive Thinking 允许模型按上下文分配推理，**不等于 Interleaved Thinking**，也不代表所有模型都能关闭 Thinking。接口术语见 [Thinking 与工具调用协议术语](thinking-tool-protocol.md)；学习算法与研究路线见 [如何让模型学会自适应推理](../research/how-models-learn-adaptive-reasoning.md)。


## CoT 的跨工具轮恢复与 KV Cache 的区别

在**同一轮解码**中，先前生成的推理 token 当然构成后续 token 的上下文；但收到工具反馈后发生的新请求，不会因为上一次用过 KV Cache 就自动包含旧 CoT。需要客户端或服务端显式保留消息、兼容的 reasoning item 或模型特定的 `reasoning_content`。OpenAI Responses 的 opaque/encrypted reasoning item 和本地 GLM 的明文推理**不等价**。vLLM Prefix Cache 只有在实际 token 前缀及缓存条件匹配时才可能跳过部分 Prefill，不能推导为“回填 CoT 必定省钱”。详见[CoT、Codex、GLM Bridge 的跨轮案例](../topics/agent-reasoning/reviews/cot-tool-use-and-thinking-scheduling.md)。
