---
shortName: "ReLIFT"
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
- **首次公开 / 发表时间**：2025-06-09 首次上传 arXiv:2506.07527；ICLR 2026 正式发表
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

## 3. 数值例子：困难题为什么训练信号稀疏？

设同一题的单次答对概率为 $p$，独立采样 $G$ 次，奖励是二元正误。出现「至少一对一错」的概率为：

$
P_{\mathrm{mixed}}=1-p^G-(1-p)^G.
$

例如 $p=0.01,G=8$ 时，全错组概率约 $92.3\%$，有组内正负奖励差异的概率约 $7.7\%$。提高 $G$ 可以提高遇到成功的概率，但也增加生成和验证成本。这是**帮助理解的独立伯努利模型**，不是作者真实运行的采样统计；不同奖励分布或采样相关性会改变结果。

ReLIFT 的关键是通过**困难题所需的外部正确解**提供另一种训练信号，而不是把 RL 的 rollouts 免费变成专家解答。

## 4. 证据
论文在五个数学与一个分布外基准上，报告较所比较的 RLVR 方法**平均高 6.7 个百分点**，并声称缩短训练时间；这一结果属于作者设定的基准，不能外推到机器人动作或多轮工具控制。

## 5. 批判性分析

- **专家标签不是免费的**：要把在线额外正确解的生成、过滤和教师推理算入预算。公平对比不能只数策略更新步数。
- **全错未必意味着模型没学会**：还可能是验证器误判、格式错误、采样配置或反馈延迟，触发监督前应区分原因。
- **“扩展支持集”是直觉而非严格数学结论**：softmax 语言模型通常对大量序列已有非零概率；有用的是在有限采样预算内抬高正确答案的概率质量。

难点从 RL 被转移到了“怎样拿到正确解答”和“何时认为问题已经足够难”。对无法求得正确操作轨迹的机器人状态，此方法无法直接生成专家监督。频繁 SFT 也可能压低模型对未见路径的探索。

## 6. 适用于机器人 Agent 吗？
对于 ORA 的精确坐标、动作语法、难以探索的罕见接触动作，可以采用小量 SFT 兜底。对于拥有程序验证器的空间题与工具选取，不应默认全部回退为 Teacher Thinking。对照实验应当比较：Direct RL、定向 SFT 插入和静态等量 SFT，固定 GPU-hours 与有效 Rollout 数。

> 阅读提示：以上“论文报告”是对作者公开材料的重述；“批判性分析”是知识库的研究判断，未经独立复现实验。

## 7. 版本差异、可复现性和证据口径

- **两处官方来源目前存在数字口径差异**：[arXiv v1](https://arxiv.org/abs/2506.07527v1)（2025-06）和 [arXiv v3 摘要](https://arxiv.org/abs/2506.07527)（2026-03）均写六项基准平均超过 **+5.2 points**；[ICLR 2026 官方摘要](https://proceedings.iclr.cc/paper_files/paper/2026/hash/82c4ad0c3d3d4898a77be5df7b2ede3a-Abstract-Conference.html)报告 **+6.7 points**。**尚未证明差异是同口径下的单纯性能提升**：需查模型、基线、数据和统计口径，不能未经核对将两者串成“版本更新使分数增加”。
- [ICLR 2026 官方摘要](https://proceedings.iclr.cc/paper_files/paper/2026/hash/82c4ad0c3d3d4898a77be5df7b2ede3a-Abstract-Conference.html)支持五项数学、一项 OOD 基准平均 +6.7 **points** 的作者报告，不能等同于相对提升 6.7%。
- [官方训练仓库](https://github.com/TheRoadQaQ/ReLIFT)列有 ReLIFT/verl、数据准备、训练启动和评测脚本；README 宣传只需 13% 示范数据，**但不应将其误读为只需 13% GPU-hours**。实际复现仍要验证数据、模型版本与环境。
- 机器人偏离示范后的状态可能根本没有可调用的可信专家；该任务并没有因为借鉴 ReLIFT 就自动解决。
