# LLM / 多模态 Agent 后训练

**核心问题**：什么能力应该通过模仿学习，什么能力应该通过可验证结果、环境交互、教师蒸馏获得？不同学习信号如何协作而不互相抵消？

## 相邻主题：什么时候思考、什么时候调用工具？

- [Agent 长程推理与工具调用专题](../agent-reasoning/README.md)：解释 CoT 与真实工具回路、Codex 的可选计划工具，以及 GLM-5.3-Flash / Qwen3.8-27B 的跨轮推理状态和思考预算。这里关注的是**推理与行动调度**，而不是本主题的 **SFT/RL 优化配方**。

## 关联入门：Off-policy 的新旧数据混合

- [RLPD：先验数据与在线强化学习精读](../../papers/2023/rlpd.md)：Actor/Critic 循环、Bellman 自举、50:50 混合采样与 Agent 迁移边界。
- [机器人控制专题](../robot-control/README.md)：如何把高层策略动作可靠地执行到物理末端。

## 三层研究入口

- **建立整体理解**：[SFT/RL 后训练长篇综述](reviews/sft-rl-co-training.md)——机制、定义、方法脉络。
- **检验观点是否站得住**：[研究主张与证据地图](reviews/evidence-map.md)——C01–C07、支持范围、表面矛盾、证据缺口。
- **设计下一项研究**：[Agent 后训练可证伪实验议程](../../research/agent-post-training-experiment-agenda.md)——E0–E5、数据/算法因素分离、成本和停止规则。

建议按「先读综述 → 再看证据地图 → 最后看实验」使用；证据地图不会替代原论文，实验议程也不表示实验已经完成。

## 建议学习入口

- [按顺序学习 SFT、RL 与 LLM Agent 后训练（7 步）](../../paths/agent-post-training.md)

## 当前核对进度（2026-10-20）

| 先读哪篇 | 已核实的层级 | 仍要细看的地方 |
|---|---|---|
| [ReLIFT](../../papers/2026/relift.md) | ICLR 官方摘要、作者训练仓库、2025/2026 版本差异 | 示范预算与每组消融 |
| [BRIDGE](../../papers/2026/bridge.md) | ICML 正式摘要、作者算法 2、代码公开状态 | 一阶近似、额外 RL 分支的 GPU-hours |
| [DAPO](../../papers/2025/dapo.md) | 官方项目页的四组件、资源与 loss 直觉 | 同预算复现与被过滤样本成本 |
| [工具调用 SFT/RL 受控对照](../../papers/2026/sft-rl-tool-agents.md) | arXiv 摘要的 15/18、29/54 与方法条件 | 是否优化真实端到端工具成功 |
| [RLVR 回溯理论](../../papers/2026/rlvr-backtracking.md) | ICML 摘要的图路径和仅最短路径 SFT 前提 | 定理适用的图分布、失败恢复数据消融 |

**读这张表的方式**：「核实到原始摘要」不等于「逐表复查所有实验」；表中右栏是待研究任务。建议从 [全局综述](reviews/sft-rl-co-training.md)先了解争议，再按需求打开独立方法卡。

## 关键的三个研究问题

1. 训练方法的收益究竟来自更好的梯度估计，还是来自**额外示范、教师、数据混合与环境反馈**？
2. 离线回答/轨迹奖励实际验证的是什么：答案正确、工具格式、模仿相似性，还是**真正的环境完成**？
3. 如果 SFT 加入失败状态和恢复示范，RLVR 在长程 Agent 中是否仍有独立、值得额外交互成本的收益？

## 本方向文档

- [长篇综述：SFT、RLVR、混合优化与 Agent 后训练](reviews/sft-rl-co-training.md)
- [证据地图：哪些主张被证实、哪里只是表面矛盾](reviews/evidence-map.md)
- [可证伪实验议程：任务、预算、基线、停止规则](../../research/agent-post-training-experiment-agenda.md)
- [共享术语：Agent 后训练](../../glossary/agent-training.md)
- [原始论文卡片](../../papers/README.md)
- [研究问题：真实演示轨迹与奖励设计](../../research/robot-trajectory-reward.md)

更新本方向时，建议先修订单篇论文卡片，再更新综述的比较表、趋势判断和开放问题。不要将本方向综述复制到 README。
