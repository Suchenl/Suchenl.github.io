---
related:
  - ref: papers/2025/deepseek-r1
    type: compares
    note: "R1-Zero 展示可验证推理任务中直接强化学习的可能性；ReLIFT 研究策略难以产生正确样本时如何补充监督。"

comparison:
  objective: "在 RL 难以得到成功样本的困难问题上恢复有效学习信号"
  training: "在线识别困难题，并将针对性 SFT 与 RL 交替执行"
  signal: "当前策略的难题分布 + 额外提供的高质量正确解答"
  evidence: "论文报告在其数学及 OOD 基准设置下平均领先所选 RLVR 基线 6.7 个百分点"
  limitation: "依赖能够获得可靠教师正确解；训练开销与向具身任务迁移仍需独立验证"
title: "Learning What Reinforcement Learning Can't: Interleaved Online Fine-Tuning for Hardest Questions"
year: 2026
categories: ["强化学习与 Agent/SFT 与 RL 协同"]
summaryZh: "在强化学习困难阶段定向插入 SFT"
status: untracked
---

# Learning What Reinforcement Learning Can't: Interleaved Online Fine-Tuning for Hardest Questions

- **中文主题**：ReLIFT：困难问题的在线定向监督与强化学习交替
- **作者**：Lu Ma、Hao Liang 等
- **首次公开 / 发表时间**：2026
- **发表状态**：ICLR 2026 正式论文
- **原始来源**：[论文或官方页面](https://proceedings.iclr.cc/paper_files/paper/2026/hash/82c4ad0c3d3d4898a77be5df7b2ede3a-Abstract-Conference.html) · [代码/模型/其他官方资源](https://github.com/TheRoadQaQ/ReLIFT)
- **标签**：RLVR / 交替更新 / 冷启动 / 在线数据
- **原文核验**：2026-10-19；核验范围：原文/官方摘要（方法及实验中的进一步细节需查原论文表格）

## 一句话结论
RL 对模型已经能偶尔解对的问题尤其有效；对于当前策略几乎不可能解出的难题，ReLIFT 在 RL 流程中**插入针对性 SFT**，而不是强迫策略靠稀疏奖励自行发现全新解法。

## 1. 核心困难
同一问题采样多个答案时，若全部错误，典型组内相对奖励方法没有正负样本对比。即使增加 Rollout 数，模型也可能长期得不到有效成功信号。只做先验 SFT 也有问题：训练开始前无法准确知道未来策略会卡在什么地方。

## 2. 方法逐步解释
（1）让模型照常执行 RL，获得当前策略面对的难题分布。（2）识别困难、失败的题目，而非将所有问题一律用高质量示范训练。（3）在这些困难题上收集高质量正确解答，构造**在线定向 SFT**。（4）在 RL 与 SFT 更新间交替，使模型先获得进入正确解空间的能力，再通过 RL 提高选择质量。相当于动态课程：RL 提升“已有可能的解”，SFT 补足“还没有进入支持集的解”。

## 3. 证据
论文在五个数学与一个分布外基准上，报告较所比较的 RLVR 方法**平均高 6.7 个百分点**，并声称缩短训练时间；这一结果属于作者设定的基准，不能外推到机器人动作或多轮工具控制。

## 4. 批判性分析
难点从 RL 被转移到了“怎样拿到正确解答”和“何时认为问题已经足够难”。对无法求得正确操作轨迹的机器人状态，此方法无法直接生成专家监督。频繁 SFT 也可能压低模型对未见路径的探索。

## 5. 适用于机器人 Agent 吗？
对于 ORA 的精确坐标、动作语法、难以探索的罕见接触动作，可以采用小量 SFT 兜底。对于拥有程序验证器的空间题与工具选取，不应默认全部回退为 Teacher Thinking。对照实验应当比较：Direct RL、定向 SFT 插入和静态等量 SFT，固定 GPU-hours 与有效 Rollout 数。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。
