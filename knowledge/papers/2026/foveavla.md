---
contentType: paper
domains: ["机器人与具身智能/策略学习与控制", "机器人与具身智能/数据与动作表示", "多模态学习与生成/视觉语言理解"]
title: "FoveaVLA: Foveation Actions Replace the Wrist Camera in VLAs"
shortName: "FoveaVLA"
aliases: ["主动视觉", "Foveation", "交互区域预测", "视觉裁剪"]
readingDepth: deep
year: 2026
categories: ["机器人与具身智能/策略学习与控制", "多模态学习/视觉语言理解"]
summaryZh: "将未来交互区域预测纳入 π₀.₅ 的动作策略，通过全局视野、局部高清裁剪与双目深度替代腕部摄像头；拆解其相机、深度、标注、训练和消融证据。"
status: untracked
authors: ["Bingao Chen", "Lihan Zha", "C. Karen Liu", "Guy Tevet"]
venue: "arXiv preprint（2026-10-14，v2 2026-10-21；未核实正式录用）"
tags: ["VLA", "π0.5", "PaliGemma", "Active Perception", "RGB-D", "Stereo", "Foveation", "RoboInter"]
links:
  arxiv: "https://arxiv.org/abs/2610.20064"
  pdf: "https://arxiv.org/pdf/2610.20064"
  code: "https://github.com/Stanford-TML/FoveaVLA"
  project: "https://tml.stanford.edu/FoveaVLA/"
comparison:
  objective: "在不使用腕部相机的情况下保留局部操作细节"
  training: "π₀.₅ Base 全参数后训练；DROID 动作与 RoboInter 未来交互框联合监督"
  signal: "Flow Matching 动作损失与未来 BBox Location Token 交叉熵"
  evidence: "真实机器人 48 次测试：腕部 π₀.₅ 52.1%，Single 70.8%，Dual 77.1%；另有 Foveation/Depth 消融"
  limitation: "深度为双目估计非 GT；缺少 ZED SDK 直接对照与深度偏差压力测试；对主动观测的定义限于图像内裁剪"
---

# FoveaVLA：让 VLA 预测下一步应该看哪里，能否替代腕部相机？

*Bingao Chen、Lihan Zha、C. Karen Liu、Guy Tevet · Stanford / Princeton · arXiv:2610.20064v2*

> **核验说明**：2026-11-04 对照论文 v2（2026-10-21）、Appendix A–E、[项目主页](https://tml.stanford.edu/FoveaVLA/)、[官方开源仓库](https://github.com/Stanford-TML/FoveaVLA)、[DROID 官方数据说明](https://droid-dataset.github.io/)及 [RoboInter](https://github.com/InternRobotics/RoboInter)。本文讨论论文作者报告结果，不等于独立复现；所有 SVG 为教学性机制重绘，不是论文原图或实验截图。

## 一、一句话概括与核心结论

**FoveaVLA 在 π₀.₅ 上联合训练机器人动作与“未来交互区域 BBox”，每执行一个短动作段，就从外部相机的原始高分辨率图像中裁剪预测区域，并与全局 RGB-D 一起送回策略，以此在不使用 Wrist Camera 的条件下保留操作细节。**

最重要的结果不是“多了一个目标检测框”，而是：**观察区域的选择成为策略输出的一部分，而且是预测下一次策略查询时要看的区域。** 在作者的四类真实机器人任务、每类 12 次测试中，配备腕部摄像头的 π₀.₅ 总成功率为 52.1%，FoveaVLA-Single 为 70.8%，Dual 为 77.1%（论文 Table I）。这不是任意抓取任务的普适成功率。

我认为它的研究价值有两个层面：第一，计算预算应该向预计发生交互的图像区域倾斜；第二，控制策略可以同时输出“怎么动作”和“下一次看哪里”。但论文并没有证明“有了 BBox 就无需深度”，反而从消融看到 Foveation 和 Depth 在单视角下互补。

## 二、核心概念：先分清哪些是模型，哪些是传感器

| 概念 | 是什么 | 在本文中负责什么 |
|---|---|---|
| PaliGemma | SigLIP 视觉编码器 + Gemma 语言模型的 VLM | 为图像、语言、状态提供共享表征，LM Head 输出位置 Token |
| π₀.₅ | 在 VLM 上增加 Flow Matching Action Expert 的 VLA | FoveaVLA 初始化的基础策略、动作生成框架 |
| Foveation | 选择局部区域做高分辨率观察 | 从原始高清图裁剪局部，而非把整图均匀放大 |
| Foveation Action | 预测下一次观察时的交互框 | 与动作 Chunk 同步产生，一视角一个 BBox |
| Stereo Disparity | 左右相机成像的视差 | 由标定参数恢复相机坐标系的米制深度 |
| RoboInter | 含 Gripper/Object/Target、Primitive Skill 等中间表征的数据标注体系 | 构造未来交互框的监督标签 |
| Turbo Color Map | 把标量映射成 RGB 颜色的色表 | 将单通道深度变为普通视觉编码器可接收的三通道图像 |

**PaliGemma 和 π₀.₅ 不是竞争关系，也不是两个串行独立模型。** 前者是后者采用的视觉语言骨干的一部分；π₀.₅ 还具有生成连续机器人动作的 Expert。FoveaVLA 从 π₀.₅ Base Checkpoint 继续训练，复用 PaliGemma 已有的 Location Tokens 预测 BBox，不另外外挂一套 YOLO。论文 §III–IV、Fig. 2。

## 三、研究问题与方法位置

传统 Wrist Camera 的优点是靠近夹爪，操作细节自然占据更多像素；缺点是视角跟着末端移动，可能看不到远处目标，也增加硬件依赖。外部摄像头刚好反过来：能看到大场景，但如果将原始 1280×720 直接缩到 224×224，夹爪、细小物体与接触区域会只剩少量 Patch。

可以有不同解决路线：

| 路线 | 让策略看到细节的方法 | 主要代价 / 假设 |
|---|---|---|
| Wrist Camera | 移动的近端真实视角 | 需要装在末端，视野受末端位置约束 |
| 全局超高分辨率 | 把整个场景都看得更清晰 | 视觉 Token 和算力分配给大量背景 |
| 分离式 Detector / Grounder | 外部模块先框出当前目标再裁剪 | 额外推理、模块误差，通常看的是当前帧 |
| **FoveaVLA** | 同一策略预测未来区域，在下一轮从原始图像裁剪 | 需要交互标签、状态预测和固定相机图像的局部可见性 |

严格说，这里的 Active Perception 是**主动图像区域选择（image-space foveation）**，不是操纵相机姿态获取新视角的 Active Vision。Dual 增加第二台固定外部相机，但模型本身不执行主动相机运动。

## 四、方法全貌：一个 Backbone、两个输出分支

![FoveaVLA 共享 PaliGemma 与两输出分支的系统结构，教学性重绘](/research/figures/foveavla/01-model-architecture.svg)

*图 1 · 本解读重绘的架构机制图，对应论文 Fig. 2、§IV。输出分支共享输入前缀，但分支间使用注意力屏蔽；不代表两个独立 VLM。*

对于每个外部视角 v，模型接收当前的四路视觉输入：Full RGB、Foveal RGB、Full Depth、Foveal Depth。视觉流分别经共享 SigLIP 编码，和任务指令、离散化机器人状态进入共享视觉语言表示。

输出则分两支：

1. **Action Expert**：Gemma 300M，使用 Flow Matching 生成长度 H=16 的动作 Chunk。
2. **LM Output Head**：沿用 PaliGemma 的语言生成头，预测下一轮查询对应的 BBox。单视角 4 个坐标 Token，双视角 8 个。顺序为 `(ymin, xmin, ymax, xmax)`，每个坐标量化成 1,024 个桶之一。

动作分支只执行前 w=8 步，系统随后重新采集图像。这时使用前一轮已经生成的 BBox，从新图中裁剪下一轮的局部观测。它不直接把 BBox 转成抓取位姿，也没有显式输出 3D Contact Point。

![FoveaVLA 未来交互框与动作 Chunk 的时间循环，教学性重绘](/research/figures/foveavla/04-policy-time-loop.svg)

*图 2 · 自绘时间轴，对应论文 §IV-B、IV-D、Appendix B-D。注意目标是 t+8 的框，而不是 t 的检测框。*

举一个直观例子：当前指令为“把蓝色方块放进碗中”。在 t 时刻全局视野能看到方块、碗和夹爪，模型先预测 16 步动作，并预测执行 8 步后夹爪与方块附近应出现的交互框。机器人执行前 8 步，下一轮裁剪高清交互区，观察夹爪、物体和接触关系，再决定接下来的动作。到了放置阶段，如果 Primitive Skill 和关注对象变化，训练标签也会随未来时刻更新，而不是永远锁定最初的物体。

从 1280×720 原图裁取局部，然后再 resize 到 224×224，等于把固定的视觉 Token 预算集中到少量真正相关的像素上；不是增强了相机光学分辨率。

## 五、为什么双目相机还有 Stereo Matching？深度到底是真是假？

### 5.1 硬件：ZED 2 原本就能提供深度

[DROID 官方设备介绍](https://droid-dataset.github.io/)给出的硬件是 Franka Panda + Robotiq 2F-85、两台外部 ZED 2 双目相机和一台腕部 ZED Mini 双目相机。**一台 ZED 2 含左右两路光学 RGB 成像器**，不是“一个彩色成像器加一个独立的 ToF 深度测量器”。

所以：
- **Single**：使用一台外部 ZED 2（一个外部视角、一对左右双目图像），有对应的估计深度；
- **Dual**：使用两台外部 ZED 2（两个外部视角、两对双目图像），各自估计深度；
- 腕部 ZED Mini 虽然存在于 DROID 硬件中，但训练和推理的 FoveaVLA 观测中都不使用腕部画面。

“真实深度”要谨慎定义：真实的是采集场景和双目 RGB，**深度值仍由算法估计，并不是真实世界不可误差的 Ground Truth**。

![FoveaVLA 从双目相机到 RGB-D 视觉 Token 的链路，教学性重绘](/research/figures/foveavla/02-stereo-depth-encoding.svg)

*图 3 · 相机—视差—米制深度—伪彩色—视觉编码链路重绘；依据论文 §IV-A、Appendix A-E 和 B-B。*

### 5.2 为什么不用 ZED SDK 自带深度？

ZED SDK 自身也从双目图像计算深度。FoveaVLA 则选择拿到 DROID 原始双目录像和标定参数，使用 [Fast-FoundationStereo](https://github.com/NVlabs/Fast-FoundationStereo) 估计视差。论文规定在 640×360 上做立体匹配，8 次 Refinement、最大视差 192，并根据

$$
z=\frac{f_x B}{d}
$$

获得光轴方向米制深度：`f_x` 为水平焦距、`B` 为双目基线、`d` 为视差。重采样时必须考虑焦距和视差的像素尺度是否匹配。真实部署同样采用该流程；MolmoSpaces 仿真评测则**直接读取模拟器给出的米制深度**（Appendix C-C）。

论文**没有提供 ZED SDK vs Fast-FoundationStereo 的直接误差和成功率比较**。因此“作者选 FoundationStereo 是因为已证明比 ZED 原生深度更精确”不是论文结论。使用同一立体估计算法贯通离线数据和部署，可解释其工程一致性，但对准确性的收益仍需单独实验验证。

### 5.3 深度如何进入只吃三通道图片的 VLA？

不必修改 SigLIP 的卷积/视觉输入层来接收四通道。作者把每张单通道 Depth 转成三通道伪彩色，**当作另一张图像**，通过与 RGB 共享权重的视觉编码器，但占据独立的 Token 序列。

| 设置 | 每视角图像流 | 总流数 |
|---|---|---:|
| Single | Full RGB、Foveal RGB、Full Depth、Foveal Depth | 4 |
| Dual | 同样四路 × 两台外部相机 | 8 |

这是“多张三通道图输入同一个视觉编码器”，不是 `RGB(3)+Depth(1)` 拼接为四通道，也不是两个网络各自训练不同的视觉骨干。论文 Appendix B-A。

### 5.4 Turbo 伪彩色是什么？是否改变深度数值？

先用固定的全局对数深度尺度归一化：

$$
r(z)=\frac{\log(z/0.2)}{\log(3.0/0.2)}
$$

然后将 `1-r(z)` 查 Turbo Color Map，得到 RGB 三通道颜色。近处是暖色，远处是冷色，无效像素黑色。这个“伪彩色”只是**把数值编码成视觉特征形式**：它没有创造几何信息，不会自动修复深度 Bias，也不是给物体涂上真实颜色。

![Turbo 深度伪彩色：从近到远的示意图](/research/figures/foveavla/05-turbo-depth.svg)

*图 4 · 自绘近暖远冷的示意渐变，非逐样本精确 Turbo LUT；具体编码以 Appendix B-B 和代码为准。*

作者将非有限或非正视差、匹配到右图外的点，以及 0.2–3.0 m 之外的深度标记无效。14×14 Depth Patch 内有效像素不足 25% 则对其进行 Attention Mask；每条深度输入流训练时以 10% 概率被丢弃。深度有效性检查**不代表对剩余像素提供了误差上界**。

我认为这里存在明确的边界：玻璃、镜面、低纹理、遮挡边界和远距离视差误差都可能生成“数值在范围内、但物理上错误”的深度。论文没有明确针对这些场景做置信度校准或系统性压力测试；其成功率不能解释为对不可靠深度已经解决。

## 六、BBox 标签从哪里来？为什么不需要新检测器？

FoveaVLA 将 [DROID](https://droid-dataset.github.io/) 的机器人示教、原始相机录像与 [RoboInter](https://github.com/InternRobotics/RoboInter) 的逐帧交互标注按 **episode / camera view / frame index** 对齐。RoboInter 的 Primitive Skill 标签用于判断每帧需要哪些实体框：

| Primitive Skill | 需要的标注 |
|---|---|
| Pick、Push、Pull、Press、Twist | Gripper + Object / Tool |
| Transfer、Place、Slide、Fold、Pour、Insert、Throw、Manipulate、Shake、Strike | Gripper + Object / Tool + Target Region |

其中 Target Region 在 RoboInter 里对应 **Placement Proposal**。先检查各组件框是否有效，再取最小轴对齐包围矩形，构成 **tight interaction box**；没有必要组件或不支持的 Skill 就过滤。Skill 标签只用于构造训练监督，推理时不作为额外特权输入。

![由 RoboInter Gripper / Object / Target 区域构造交互 BBox，教学性重绘](/research/figures/foveavla/03-box-supervision.svg)

*图 5 · 教学性标注框示意，对应论文 Fig. 3 与 Appendix A-B；色块并非真实实验图像。*

容易混淆的另一点是：**模型预测的 BBox 与喂给编码器的 Crop 不一样大。** BBox 是紧凑的标注框；视觉 Crop 是以它为中心、边长为 `1.5 × max(box_width, box_height)` 的正方形区域，必要时补零，随后缩到 224×224。训练时 45% 使用原定 Crop、45% 对 Crop 位置和尺度做扰动、10% 用 Full View 替代局部图；预测标签始终是未扰动的未来 tight box（Appendix A-D）。

训练样本以当前 t 的完整观测、示教动作 Chunk 为输入/监督，**并以 t+8 时 RoboInter 注释构造的框作为未来 BBox 目标**。这个未来标签可以随不同 Primitive Skill 切换。

## 七、从 π₀.₅ 怎么训练？网络哪些参数会更新？

答案明确：**Single 和 Dual 分别从原始 π₀.₅ Base Checkpoint 初始化并做全参数后训练**，不是训练一个单独 BBox Detector 后冻结 π₀.₅，也不是先训练 Single 再把参数迁移给 Dual。

训练数据由以下部分组成：

1. **DROID RLDS**：语言指令、机器人状态和动作序列；原始约 75K 条遥操作 Franka 示教是数据集规模，不是实际有效训练样本数。
2. **DROID Raw Stereo**：外部双目录像、1280×720 的左 RGB 参考图和双目标定，进行离线深度重建和高清裁剪。
3. **RoboInter**：Primitive Skill、夹爪、操作物体、放置目标等帧级标注，用于构造 BBox。

有效样本还需与 OpenPI 的 non-idle 时间范围、当前/未来框和有效深度可用性相交；Dual 还要求两台外部相机同一时刻都有有效数据。

### 联合训练的两个损失

$$
\mathcal{L}=\mathcal{L}_{\mathrm{flow}}+0.1\mathcal{L}_{\mathrm{foveation}}
$$

`L_flow` 是动作专家对示教 Chunk 的 Flow Matching 损失；`L_foveation` 是在 Teacher Forcing 下预测未来 BBox 的 4N 个位置 Token 的交叉熵损失。两支共享输入前缀，但输出分支间 Attention 被屏蔽；两个 Loss 都会更新共享 Backbone。详细定义见论文 Eq. (2)–(4)。

| 项目 | 官方论文配置 |
|---|---|
| 初始化 | π₀.₅ Base Checkpoint |
| 模型 | SigLIP 400M、Gemma 2B、Action Expert Gemma 300M |
| 训练更新 | 100,000 Updates |
| Batch / GPU | 全局 Batch 256、8× H100 |
| 优化器 | AdamW、学习率 5e-5、Warm-up 1,000 Updates |
| EMA | 0.99 |
| 损失权重 | λ = 0.1 |
| Depth Stream Dropout | 每流 0.1 |
| 图像输入 | 每视觉流 224×224 |
| 预测 / 实际执行动作步数 | 16 / 8 |
| Flow Inference Integration | 10 Steps |

7 个机械臂关节动作训练为相对当前关节位置的偏移，Gripper 命令为绝对值；状态与动作各 8 维并 Padding 至模型 32 维接口（Appendix B-A / B-D）。开源仓库已经给出 [训练脚本、数据准备流程和 Single/Dual Checkpoint 下载说明](https://github.com/Stanford-TML/FoveaVLA)。

## 八、实验究竟支持了什么？

### 8.1 真实机器人任务：比较的是任务完成率，不是单独的抓取精度

论文 Table I：四个任务套件（Plain Pick-and-Place、Distractors、Fold/Unfold、Move far objects），每套件 12 次，合计 48 次；数字为 Overall Success Rate（%）。

| 配置 | 单视角 | 双视角 |
|---|---:|---:|
| 仅全局 RGB | 6.3 | 25.0 |
| 全局 RGB + Depth | 6.3 | 41.7 |
| 全局 RGB + Foveal RGB | 20.8 | 66.7 |
| 全局 RGB-D + Foveal RGB-D | **70.8** | **77.1** |
| 腕部 RGB π₀.₅ 对照 | — | **52.1**（外部+腕部相机的原始策略） |

这些配置是不同后训练策略的对照，不是同一组模型参数在推理时开关输入。尤其是单视角“仅加 Depth”依旧 6.3%，但“Crop + Depth”达到 70.8%；因此**既不能说 Foveation 单独解释全部提升，也不能说有 Depth 就够了**。

### 8.2 真正“主动看”起多大作用？有没有与 BBox 监督本身解耦？

论文有一个很关键的 ECoT-inspired 对照：在双视角 RGB 设置中，`π₀.₅-Dual-External` 为 25.0%，**只增加位置监督而不提供 Crop** 为 31.3%，使用 Foveation Crop 的 FoveaVLA-Dual-RGB 则为 66.7%。因此受控设置下，收益主要不只是“多一个 BBox Loss”，还来自把预测区域真正裁剪作为下一轮视觉观测。

第二个外部视角本身也很重要：在没有深度、但有 Foveation 的设置中，单视角 20.8%，双视角 66.7%。这提示多视角可以部分提供深度所缺的几何线索；但论文没有直接把每个 Depth 误差水平和任务效果联系起来。

### 8.3 BBox 预测有多准确？

Held-out DROID 的未来交互框预测结果为 **mIoU 0.465、Acc@0.5 为 0.483**。YOLO11s 在拿到 **t+8 的真实目标帧** 后检测为 0.492 / 0.488；两者不是相同时间输入条件。FoveaVLA 在当前 t 预测未来区域，并可以边执行动作边解码，所以作者报告下一次观测到来后不增加等待；YOLO 检测需等到目标帧后再计算（论文 Table III）。

### 8.4 额外的泛化实验如何理解？

FoveaVLA-Dual 在未参与训练的 MolmoSpaces 仿真场景得到 **22.4%** 平均成功率；论文引用的 π₀.₅-DROID 榜单为 **17.8%**。但论文明确说明两者的相机布局、输入分辨率和 Depth 条件不同，**只能作为公开参考，不是严格受控的改进量**（Appendix C / Table II）。仿真的深度直接来自模拟器，不能代替真实世界深度鲁棒性实验。

### 8.5 Claim–Evidence 矩阵

| 主张 | 对应证据 | 能支持什么 | 不能推出什么 |
|---|---|---|---|
| 去掉 Wrist Camera 也可以精细操作 | Table I / Fig. 4，48 次真实测试 | 在指定任务和 DROID 硬件上优于腕部 π₀.₅ 对照 | 对所有工具、遮挡、陌生机器人均有效 |
| Crop 不是只多一次监督 | ECoT-inspired / Dual-RGB 消融 | 真实提供高像素密度带来明显增益 | 预测框永远可靠 |
| Depth 与 Foveation 互补 | Single/Dual RGB/RGB-D 消融 | 在测试条件下两者联合贡献很大 | 深度本身完全准确或可替代置信度机制 |
| 提前预测未来区域可行 | Table III，未来框指标 | t→t+8 的区域选择具可用精度 | 等同 3D Grasp Pose / Contact Prediction |
| 能进行一定的零样本迁移 | MolmoSpaces 结果 | 对仿真新场景有初步证据 | 与不同观测协议下 π₀.₅ 构成严格公平对比 |

## 九、局限与值得继续研究的方向

**论文事实**：作者通过深度范围、无效视差、Patch 有效率与 Stream Dropout 处理部分缺失 Depth；用下一帧 Crop 和动作形成闭环；没有提出独立的深度置信度模型，也没有做 ZED SDK 基线的深度误差比较。

**我的判断**：这篇文章证明了“把高分辨率观察预算放到预计发生交互的区域”在当前任务集上很有效，但**选择看哪里**和**相信看到什么**是两个问题。特别是伪彩色 Depth，Encoder 学到的是颜色与训练分布之间的相关关系；错误但在合法数值范围内的深度仍可能被策略当成有效线索。

可以进一步检验的研究假设：

1. **Reliability-Aware Foveation**：不仅预测 Crop，还对 RGB、Stereo Depth、跨视角几何一致性估计可靠度，并按可信度调整输入权重或请求复核。
2. **View Selection vs Crop Selection**：预测局部图像位置不能解除遮挡；真正主动改变相机视角是否比增加第二台固定双目相机更高效？
3. **BBox 与抓取位点解耦**：一个大交互框能解决视觉细节问题，却无法显式约束接触点、抓取方向和碰撞安全。对接触密集任务是否需要更细粒度的 Affordance / Contact 预测？
4. **深度误差受控实验**：对比 ZED SDK、Fast-FoundationStereo、RGB-only、多视角 RGB，系统注入尺度偏差、空洞、反射和错误匹配；报告按距离/材质/遮挡分层的成功率。

这些是**研究问题，而不是论文已经做过的实验**。进一步研究前首先需要控制训练预算、相机布局、图像 Token 数量和真实的推理延迟。

## 十、理解检验

<details>
<summary>问题 1：PaliGemma、π₀.₅、FoveaVLA 分别是什么？</summary>

PaliGemma 提供 VLM 主干，π₀.₅ 在此基础上具有动作 Expert，FoveaVLA 从 π₀.₅ Base 继续训练，将未来 BBox 的位置 Token 预测纳入同一策略。它不是两个相互独立的大模型。

</details>

<details>
<summary>问题 2：ZED 2 有深度，为什么还要跑 Stereo Matching？所谓“真实深度”是什么？</summary>

ZED 2 是双目成像设备，SDK 和 Fast-FoundationStereo 都可以从左右 RGB 图像估计深度；论文采用后者从原始双目录像计算视差及米制深度，输入是真实采集的图像，深度却是估计而非 Ground Truth。作者没有给出 ZED SDK 的直接对照。

</details>

<details>
<summary>问题 3：BBox Label 是怎么得到的？模型预测哪一帧的框？</summary>

将 RoboInter 逐帧 Primitive Skill 所需的 Gripper / Object / Target 组件框取最小外接矩形，构成紧凑交互框。当前 t 的输入监督未来 t+8 的框；当前裁剪区域来自当前框或上次预测。视觉 Crop 比监督框更宽，包含上下文。

</details>

<details>
<summary>问题 4：深度怎样输入只接受三通道图像的 SigLIP？</summary>

Metric Depth 经固定对数归一化和 Turbo 映射为 RGB-like 三通道图；和普通 RGB 分别输入共享 SigLIP 并占据独立 Token 序列，并非改造为四通道卷积。

</details>

<details>
<summary>问题 5：论文是否证明 Active Perception 比增加 Depth 更有用？</summary>

它证明了特定训练配置下 Crop、Depth 与额外视角存在互补，特别是 Box Supervision Only vs 真正提供 Crop 的对照；并没有在所有条件下给出统一的因果排序，更没证明不可靠深度已被解决。

</details>

## 原始资料与复核定位

- [FoveaVLA 论文 v2](https://arxiv.org/pdf/2610.20064)：§III–V，Fig. 2–5，Table I–III；Appendix A（标签与 Crop / Stereo）、Appendix B（训练与深度）、Appendix C（MolmoSpaces）。
- [FoveaVLA 项目主页与真实机器人 Rollout](https://tml.stanford.edu/FoveaVLA/)；[官方 GitHub / 模型与数据准备](https://github.com/Stanford-TML/FoveaVLA)。
- [DROID 数据集官方页面](https://droid-dataset.github.io/)：相机型号、RLDS 与原始 Stereo/SVO；[RoboInter 官方仓库](https://github.com/InternRobotics/RoboInter)：标注角色与数据工具。
- [Fast-FoundationStereo](https://github.com/NVlabs/Fast-FoundationStereo) 与 [π 系列 OpenPI](https://github.com/Physical-Intelligence/openpi)。

**适用边界**：本文是对公开预印本与代码的机制解读，未进行独立训练和物理机器人复现；部分工程动机是合理解释而非作者明确论证，已在对应段落注明。
