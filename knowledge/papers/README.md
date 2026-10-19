# 论文卡片总索引

> 单篇论文**一个文件**；跨方向综述引用此处，不重复全文。日期为论文发表/公开年份，文献事实最后核验：2026-10-19。

## 2026

| 论文 | 发表状态 | 关键问题 |
|---|---|---|
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
| [MiMo-V2.6 MOPD2](2026/mimo-mopd2.md) | 官方技术报告/模型卡 | 多领域教师、RL 和 SFT 前缀蒸馏 |

## 2025

| 论文 | 发表状态 | 关键问题 |
|---|---|---|
| [DeepSeek-R1](2025/deepseek-r1.md) | arXiv 技术报告 | 无 SFT 直接 RL 和冷启动 SFT 的区别 |
| [Qwen3 Technical Report](2025/qwen3.md) | arXiv 技术报告 | 多阶段 SFT/RL 与强到弱蒸馏 |
| [DAPO](2025/dapo.md) | NeurIPS 2025 | 稳定和有效地进行长思维链 RL |
| [Action-Constrained Imitation Learning](2025/dtwil.md) | ICML 2025 | 动作约束和轨迹对齐如何放松行为克隆 |

新文献优先填 `templates/paper-note.md`，并保持该文件与 `topics/` 同步。