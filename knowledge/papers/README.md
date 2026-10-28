# 论文卡片总索引

> 单篇论文**一个文件**；跨方向综述引用此处，不重复全文。日期为论文发表/公开年份，部分文献已更新至 2026-10-20；每篇以正文中注明的核验层级为准。

> **日期与路径提示**：本索引按会议/正式发布年份组织；ReLIFT 与 BRIDGE 虽在 2025 年首次公开 arXiv，现有链接仍放在 papers/2026，以保持站内稳定 ID。具体首次公开时间须查各论文正文，不能仅根据文件夹名断言。

## 2026

| 论文 | 发表状态 | 关键问题 |
|---|---|---|
| [SuperMimic：可微分世界模型与视觉想象策略学习](2026/supermimic.md) | CoRL 2026 Oral | 共享人形动力学、BPTT 想象策略优化与视觉世界模型的独立增益 |
| [TSRL：触发式 SFT + RL](2026/tsrl.md) | arXiv 预印本（2026-10-13） | RL 主导，难状态才注入专家监督，减少遗忘 |
| [AgentTune](2026/agenttune.md) | arXiv 预印本（2026-10-09） | 统一 Agent 轨迹、训练与评测的 EventLog |
| [UniRL（腾讯混元）](2026/unirl-hunyuan.md) | 官方开源框架（2026-10） | 同一训练设施支持 SFT、Agentic、异步 RL 等入口 |
| [ReLIFT](2026/relift.md) | ICLR 2026 | RL 遇到困难题时如何插入定向 SFT |
| [BRIDGE](2026/bridge.md) | ICML 2026 | 如何使 SFT 梯度帮助 RL 而非干扰 |
| [DYPO](2026/dypo.md) | ACL 2026 Findings | 基于训练反馈动态平衡 SFT 与 RL |
| [RL Squeezes, SFT Expands](2026/rl-squeezes.md) | ICLR 2026 | 两种训练怎样改变推理路径分布 |
| [Provable Benefits of RLVR over SFT](2026/rlvr-backtracking.md) | ICML 2026 | 为何结果奖励可能学会回溯策略 |
| [SFT or RL for Tool-Calling Agents?](2026/sft-rl-tool-agents.md) | arXiv 预印本（2026-09） | 工具 Agent 中哪种方法更好 |
| [AutoTool](2026/autotool.md) | ICML 2026 | 动态工具选择，SFT/RL/排序联合使用 |
| [MiMo-V2.6：Scaling Reinforcement Learning Towards Self-Improvement（全文图解）](2026/mimo-mopd2.md) | 2026 官方技术报告 / arXiv | 多环境 Agentic RL、Mini-Harness、Groupwise Grading、MOPD2 与训练系统 |

## 2025

| [HIL-SERL：少量人类纠正与真实机器人精密 RL（10 张 SVG 全文图解）](2024/hil-serl.md) | Science Robotics 2025（2024 arXiv 首次公开） | 双 Buffer、RLPD、人工纠正、动作分支、控制器、Funnel 与可靠性 |

| 论文 | 发表状态 | 关键问题 |
|---|---|---|
| [DeepSeek-R1](2025/deepseek-r1.md) | arXiv 技术报告 | 无 SFT 直接 RL 和冷启动 SFT 的区别 |
| [Qwen3 Technical Report](2025/qwen3.md) | arXiv 技术报告 | 多阶段 SFT/RL 与强到弱蒸馏 |
| [DAPO](2025/dapo.md) | NeurIPS 2025 | 稳定和有效地进行长思维链 RL |
| [Action-Constrained Imitation Learning](2025/dtwil.md) | ICML 2025 | 动作约束和轨迹对齐如何放松行为克隆 |

## 原 Reading 迁入的轻量卡片

这些是早期收藏/阅读清单，已经迁入统一论文库，**不代表完成深度原文核验**。原始阅读状态、评分、标签和简要备注保留；详细方法与实验待按原论文补全。

| 年份 | 论文 | 当前记录 |
|---|---|---|
| 2025 | [DreamOmni2](2025/dreamomni2.md) | 图像生成与编辑 |
| 2025 | [LongLive](2025/longlive.md) | 实时交互长视频 |
| 2025 | [Phantom Data](2025/phantom-data.md) | 视频生成数据 |
| 2025 | [VACE](2025/vace.md) | 可控视频生成与编辑 |
| 2025 | [Qwen3-VL](2025/qwen3-vl.md) | 视觉语言模型 |
| 2025 | [RoboBrain 2.0](2025/robobrain2.md) | 具身基础模型 |
| 2025 | [Motus](2025/motus.md) | 世界动作模型 |
| 2026 | [Echo Memory](2026/echo-memory.md) | 世界模型与长期记忆 |

新文献优先填 `templates/paper-note.md`，并保持该文件与 `topics/` 同步。