---
shortName: "RL Squeezes"
aliases: ["SFT Expands"]
title: "RL Squeezes, SFT Expands: A Comparative Study of Reasoning LLMs"
year: 2026
categories: ["强化学习与 Agent/SFT 与 RL 协同"]
summaryZh: "比较 SFT 和 RL 对推理轨迹分布的影响"
status: untracked
---

# RL Squeezes, SFT Expands: A Comparative Study of Reasoning LLMs

- **中文主题**：SFT 扩展正确推理轨迹，RL 压缩错误推理轨迹
- **作者**：Kohsei Matsutani、Shota Takashiro、Gouki Minegishi 等
- **首次公开 / 发表时间**：2026
- **发表状态**：ICLR 2026 正式论文
- **原始来源**：[论文或官方页面](https://proceedings.iclr.cc/paper_files/paper/2026/hash/e52554a70e0df57a0bea11d1eca0c9b5-Abstract-Conference.html)
- **标签**：机制解释 / 推理路径 / 轨迹聚类
- **原文核验**：2026-10-19；核验范围：原文/官方摘要（方法及实验中的进一步细节需查原论文表格）

## 研究问题
两种方法可能都能提高准确率，但究竟怎样改变模型的推理路径？仅比较最终 pass@1 无法知道它们提供的是新解法、偏好变化还是错误压制。

## 方法
作者在数学与代码推理模型上，同时分析完整 reasoning trajectory 的聚类，以及“中间推理步骤”形成的图结构。图的节点表示推理步骤，通过节点访问频度、度数和中心性分布理解模型在搜索空间中的路径倾向。

## 论文发现
论文报告：SFT 倾向**扩展正确轨迹的覆盖**，RL 倾向**压缩错误轨迹**；在步骤图分布中，RL 使若干衰减斜率变得约 2.5 倍陡，SFT 将其降至约三分之一。这是所研究模型、领域与指标下的现象，不是所有强化学习算法的普遍定理。

## 解释与局限
SFT 不只是“记忆正确答案”，可以增加若干正确推理模式的概率；RL 不只是“发现新知识”，可能主要改变路径选择。作者的图构建与步骤切分依赖分析框架，其结构指标不能直接对应机器人物理能力。

## 方法启发
先用可信机器人轨迹 SFT 建立一组可执行行为，再用真实任务或可靠证据奖励改善行为选择，比在没有可行动作支持集的状态中期待 RL 发明机械臂控制更稳妥。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。
