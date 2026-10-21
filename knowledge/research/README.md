# 研究问题与实验候选

这里记录我们的**假设**，不把它们归类为“已被论文证明”。只有明确设置 `publicQuestion: true` 的条目会被展示在公开的「问题与探索」栏目中；不要把私人研究资料标记为公开。

- [一个 Agent 是如何组织推理、工具调用与跨轮状态的？](how-agent-reasoning-tools-and-state-work.md)：基础兴趣问答，跨 Claude / Responses / Codex 与开源 Agent 对照模型 API、Harness、事件、工具执行及上下文回放。
- [如何让模型学会自适应推理](how-models-learn-adaptive-reasoning.md)：兴趣综述，系统梳理 Think/NoThink、混合推理、跨轮推理、动态规划及交互式 RL，并深入讨论我更认可的闭环、成本敏感学习路线；不是原创科学问题声明。
- [不同数据集动作采样频率是否引入策略偏置？](action-sampling-frequency-bias.md)：区分物理时间、动作语义、现有多频率研究与可证伪实验。
- [Agent 后训练：从证据矛盾到可证伪实验](agent-post-training-experiment-agenda.md)：先 E0 核对验证器，再分离数据/算法贡献、触发监督、失败恢复及代理奖励有效性。
- [SFT/RL 研究主张证据地图](../topics/llm-agent-training/reviews/evidence-map.md)：区分论文原始证据与尚未验证的研究假设。
- [真实机器人轨迹如何成为 RLVR 的奖励来源？](robot-trajectory-reward.md)：固定 SFT Loss，探索轨迹匹配奖励、动作约束、反事实不可辨识与训练实验。

研究提议应包含反例、基线、所需数据、通过/失败标准和与既有文献的差异；兴趣综述则应优先客观整理整条技术路线，清楚区分已有证据和个人判断。
**公开写作约定：**每次调研把所有来源直接并入当前完整对照表和正文，读者不需要知道“原有”“新增”“扩展到多少”等迭代过程；历史留给 Git 提交。保留证据等级、口径区别、核查日期和未验证的判断。
