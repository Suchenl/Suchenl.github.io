# 技术问答、研究探索与实验计划

这里存储的文章只有一个正文；**内容展示类型由 `contentType` 决定，所属研究领域由 `domains` 决定**。本目录名称是兼容既有 URL 的存储路径，不表示所有内容都是原创研究问题。

## 技术问答（qa）

- [Actor–Critic 为什么相互依赖却还能改进策略？](actor-critic-mutual-dependence.md)：策略评价/改进循环、Q 值与概率、估值误差是否限制策略上限。
- [为什么 OPD 使用反向 KL？能否混合正反 KL？](opd-forward-reverse-kl-qa.md)：原对话完整问答、公式、训练过程与 SVG。
- [Agent 的 Thinking、Tool Calling 与跨轮状态如何组织？](how-agent-reasoning-tools-and-state-work.md)：官方协议、执行器与状态回放机制。

技术问答属于 Research，不自动进入个人主页的「问题与探索」。

## 开放研究问题与研究兴趣（exploration）

- [不同机器人数据集动作频率是否导致策略偏置？](action-sampling-frequency-bias.md)
- [Tokenizer 是否天然保留数值连续性？](do-tokenizers-preserve-numerical-continuity.md)
- [通用 Agent 如何统一离散语言与连续数值预测？](how-general-agents-unify-discrete-language-and-continuous-numerical-prediction.md)
- [如何让模型学会自适应推理？](how-models-learn-adaptive-reasoning.md)

以上四项是人工精选的「问题与探索」；更改 `publicQuestion` 和 `featuredOrder` 必须有明确作者授权。

## 研究计划（plan）

- [Agent 后训练：从争议主张到可证伪实验](agent-post-training-experiment-agenda.md)
- [从机器人演示轨迹构造奖励：实验设想](robot-trajectory-reward.md)

计划是候选实验，不代表实验已经完成。所有公开内容不得泄露私人代码库或内部实验。

查看 [统一领域与内容分类规范](../TAXONOMY.md) 或在 [Research](https://suchenl.github.io/research/) 选择任意领域，按内容类型交叉筛选。已建立关系的文档彼此引用，而不重复复制长文。
