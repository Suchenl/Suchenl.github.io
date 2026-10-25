---
shortName: "UniRL"
aliases: ["Hunyuan UniRL"]
title: "UniRL（腾讯混元）：统一多模态 RL/SFT/Agentic 训练框架"
year: 2026
categories: ["强化学习与 Agent/工具与训练框架"]
summaryZh: "面向 SFT、Agentic RL 等的统一训练框架"
status: untracked
---

# UniRL（腾讯混元）：统一多模态 RL/SFT/Agentic 训练框架

- **中文主题**：统一工具链与训练工程，而非证明 SFT 和 RL 应当同一步联合优化
- **团队**：Tencent-Hunyuan
- **来源类型**：官方开源仓库，不作为正式同行评审论文
- **2026 年 10 月状态**：官方 README 报告 v0.2.0，包含 SFT、Agentic 与异步训练模式
- **官方仓库**：https://github.com/Tencent-Hunyuan/UniRL
- **核验**：2026-10-19；GitHub README

## 设计思想

统一训练框架将不同模态的模型包、Rollout 引擎、Reward Service、优化算法和权重同步通过可组合的接口组织，而非分别编写一整套无法复用的 GPU Trainer。对于 LLM/VLM 提供 AR-RL、SFT、Agentic RL 和异步训练入口；对图像/视频也有扩展，并包含 GRPO 与扩散模型策略优化等算法。

Agentic 训练时，工具环境可以多轮执行；Rollout 产生按回合组织的训练单元，通过服务端 Reward 评分，训练同步采样权重。官方文档提到一次完整轨迹的组归一化优势可应用至各 Assistant Turn，并剔除基础设施失败的轨迹。

## 为什么它与协同训练有关？

该框架证明 SFT 和 Agentic RL 可以在**共享训练基础设施**中实施；但不同 entrypoint 并不意味着 SFT/RL Loss 已被同一步稳定联合。评估是否迁移框架时，应优先比较支持的 Qwen/VLM 精度、工具 Token 一致性、LoRA、GPU 恢复与实际显存，不能只因为叫 UniRL 就全面迁移。

## 研究判断

对于已有成熟训练管线的研究项目，UniRL 是工程参考，**不是立即重构的证据**。可吸收统一数据格式、Reward Service 与异步 worker 边界。