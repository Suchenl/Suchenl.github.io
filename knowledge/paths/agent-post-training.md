---
title: "SFT、RL 与 LLM Agent 后训练：循序渐进学习路线"
summaryZh: "从核心术语到训练范式，再到代表论文、方法对比和具身迁移问题；适合建立完整理解，而非只收藏论文。"
categories: ["强化学习与 Agent", "强化学习与 Agent/SFT 与 RL 协同"]
steps:
  - ref: glossary/core
    stage: "基础概念"
    why: "先区分 SFT、RL、On-policy、Reward 与 Loss，避免后续阅读混淆训练信号来源。"
  - ref: glossary/agent-training
    stage: "关键术语"
    why: "重点理解 RLVR、Rollout、GRPO、SFT Replay 和 OPD 各自在训练中起什么作用。"
  - ref: topics/llm-agent-training/reviews/sft-rl-co-training
    stage: "全局脉络"
    why: "先建立方法地图和主要争议，再带着问题去读独立论文，而不是按发表顺序堆积阅读。"
  - ref: papers/2025/deepseek-r1
    stage: "代表基线"
    why: "理解 Base 直接 RL 与冷启动 SFT 的区别，明确 R1-Zero 成功的前提和局限。"
  - ref: papers/2026/relift
    stage: "动态协同"
    why: "研究 RL 为什么会卡在无成功样本的状态，以及定向监督怎样补足探索。"
  - ref: papers/2026/bridge
    stage: "联合优化"
    why: "分析监督梯度与 RL 目标之间的冲突，以及复杂元优化是否值得额外开销。"
  - ref: research/robot-trajectory-reward
    stage: "开放研究"
    why: "把概念迁移到机器人轨迹奖励：哪些监督可以离线验证，哪些仍需要真实闭环执行？"
---

# SFT、RL 与 LLM Agent 后训练：学习路线

这条路线强调**先学概念、再搭框架、再比较方法、最后形成研究判断**。完成每一步时，请试着用自己的话回答：这个方法使用什么训练信号，什么条件下有效，实验有没有真正验证你关心的结论？

## 学习目标

- 不把 SFT、RLVR、OPD 和离线轨迹对齐混为同一类监督。
- 能解释阶段式训练、交替更新、联合优化各自的收益与额外成本。
- 能说出代表论文真正解决的问题、实验前提及无法外推的地方。
- 能自己设计可证伪的研究对照，而不仅是复述论文贡献。

## 建议的学习方法

每篇论文按「研究问题 → 训练信号 → 核心机制 → 实验证据 → 限制与反例」五步理解。阅读后暂时关闭页面，用三到五句话复述；有问题时再跳转对应术语或综述。下方路线的勾选只保存在当前浏览器，不会更改论文真实的已读状态。
