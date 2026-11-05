---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "深度感知与几何估计：从深度相机、神经估计到可靠的机器人三维感知"
shortName: "Depth Perception"
aliases: ["深度专题", "深度估计专题", "RGB-D", "Stereo", "ToF", "LiDAR", "深度相机"]
summaryZh: "系统理解深度从何而来，比较双目、主动双目、结构光、ToF、LiDAR、单目和多视角估计，并讨论 RGB-D 融合、标定、误差与机器人可靠性。"
readingOrder:
  - ref: topics/depth-perception/reviews/depth-acquisition-taxonomy
    stage: "先建立全貌"
    why: "先区分三角测量、主动测距和学习式推断，不把算法名称当成传感器原理。"
  - ref: topics/depth-perception/reviews/stereo-depth
    stage: "双目测距"
    why: "理解视差、基线、主动散斑和匹配算法的不同作用。"
  - ref: topics/depth-perception/reviews/structured-light-tof-lidar
    stage: "主动测距"
    why: "比较结构光、ToF 与 LiDAR 的物理证据和失效机制。"
  - ref: topics/depth-perception/reviews/monocular-depth
    stage: "学习式预测"
    why: "区分相对深度、米制预测与真实物理测量。"
  - ref: topics/depth-perception/reviews/multiview-depth
    stage: "多视角几何"
    why: "把相机位姿、视频深度与单目尺度不定联系起来。"
  - ref: topics/depth-perception/reviews/rgbd-fusion
    stage: "融合与补全"
    why: "分清去噪、补全、偏差校正，不丢失原始测量来源。"
  - ref: topics/depth-perception/reviews/depth-reliability
    stage: "可靠性判断"
    why: "理解 Valid、Measured、Confidence 与真实误差的区别。"
  - ref: topics/depth-perception/reviews/calibration-coordinate
    stage: "坐标与标定"
    why: "从像素、相机内外参和同步走到机器人三维坐标。"
  - ref: topics/depth-perception/reviews/selection-evaluation
    stage: "评测与选择"
    why: "用任务误差、材质和边界条件决定方案，而不是只比深度图观感。"
catalogTitleZh: "深度感知：测量、估计与可信度"
---

# 深度感知与几何估计：深度从哪里来，什么时候能信？

> **专题定位**：一个面向计算机视觉与机器人研究者的深度技术知识体系。优先解释真实成像物理、输入输出、误差模型、校准与工程边界，然后才讨论模型性能和产品选择。最后核验：2026-11-04。**不是**深度相机产品购物榜单，也不以“Measured”或“米制输出”作为精度担保。

## 一句话建立全貌

**深度不是一种统一的传感器输出，而是一系列不同的测量与推断机制：有的主动发光测距，有的利用相机视差三角化，有的靠单张图像中的先验推断。机器人真正需要的是在明确坐标、尺度和不确定性的条件下，把这些证据转化为可靠的三维决策。**

![不同深度信息来源的专题知识地图](/research/figures/depth-perception/acquisition-map.svg)

*图 1 · 本专题绘制的教学性 SVG。测距物理、立体视觉、学习式估计与后处理不是互斥的型号分类；同一个硬件经常组合多个环节。*

## 先分清四个容易混淆的问题

| 问题 | 常见混淆 | 更准确的判断 |
|---|---|---|
| 深度从哪里来？ | “有深度相机就是真值” | 分清飞行时间、三角测量、单目学习先验、仿真 Ground Truth |
| 输出是什么？ | “深度图都是同一种数字” | Z-depth、光线距离、视差、逆深度、相对深度、米制深度可能完全不同 |
| 为什么错？ | “非零且在量程内就是可靠” | 标定、遮挡、反射、多径、匹配错误、尺度漂移均可能生成合法但错误的数值 |
| 怎么用？ | “只要给 VLA 一个 Depth 就够了” | 还要处理 RGB 对齐、有效 Mask、置信度、外参、时序与任务成本 |

## 按问题进入专题文章

| 阅读顺序 | 文章 | 解决的关键问题 |
|---|---|---|
| 01 | [深度获取技术全景](reviews/depth-acquisition-taxonomy.md) | 不同传感方式如何分类？物理测距与学习估计区别是什么？ |
| 02 | [被动双目、主动双目与立体匹配](reviews/stereo-depth.md) | ZED、D435、SGM、ZED Neural、Fast-FoundationStereo 有何关系？ |
| 03 | [结构光、ToF 和 LiDAR](reviews/structured-light-tof-lidar.md) | 何时靠图案三角化、何时靠相位/飞行时间？ |
| 04 | [单目深度估计与尺度问题](reviews/monocular-depth.md) | Depth Anything、Metric3D、UniDepth、Depth Pro 真正预测了什么？ |
| 05 | [多视角、视频与稠密重建](reviews/multiview-depth.md) | 多视角如何约束几何？什么时候不等价于双目实时测距？ |
| 06 | [RGB-D 融合、补全与深度增强](reviews/rgbd-fusion.md) | 如何利用 RGB 与不完整 Depth，又不把虚构的深度误当测量？ |
| 07 | [有效性、可信度、不确定性与异常深度](reviews/depth-reliability.md) | 为什么范围检查不够？如何分辨 invalid、unreliable 和 biased？ |
| 08 | [相机标定、尺度、坐标与深度对齐](reviews/calibration-coordinate.md) | 从像素 + 深度到可靠的三维点，实际需要哪些几何条件？ |
| 09 | [深度传感器选择与实验评测协议](reviews/selection-evaluation.md) | 如何做受控的硬件/算法对照，避免“看起来更完整”误导抓取？ |

这些文章都是跨算法的**技术专题**；单篇论文仍由 [论文解读](/paper-notes/) 维护唯一正文。本专题不复制原论文全文。每一篇末尾均提供其直接证据来源。

## 快速决策：先看证据类型，再看部署条件

| 可用输入 | 首先考虑 | 关键限制 |
|---|---|---|
| 双路同步 RGB | 标定双目 + SGM / Learning-based Stereo | 纹理、遮挡、基线、视差误差；主机计算需求 |
| 双路 IR + 散斑投射 | 主动双目（如 RealSense D435） | 阳光、散斑干扰、透明/镜面和深度边界 |
| 结构化投影图案 + 成像 | 结构光三角化 | 环境光、表面材质与投影器标定 |
| 调制光 / 脉冲回波 | ToF / LiDAR | 多径、反射率、环境光、相位歧义、稀疏性 |
| 单张 RGB | Monocular Depth Foundation Model | 尺度与域偏差；语义先验不能提供独立测距证据 |
| 多张图 + 位姿或运动 | SfM/MVS、视频/多视角几何模型 | 视角重叠、动态物体、尺度锚定、对齐 |
| RGB + 不完整的传感器 Depth | RGB-guided Completion / Robust Fusion | **先识别错误深度**，再判断哪些空洞可以补 |

## 三条贯穿专题的原则

**第一，测得出来不等于测得准确。** 例如双目中 $Z=f_xB/d$，视差误差在远距离可被放大。**第二，补全得像真的不等于物理上是真的。** 深度补全模型可能借助物体形状先验生成合理但错误的三维表面。**第三，最终应在任务坐标系与任务损失下评估。** 相机的 Z-accuracy、深度覆盖率、末端定位误差和真实抓取成功率不可互相替代。

## 与现有研究的联系

- [机器人控制专题](/research/topics/robot-control/)：感知点如何进入运动学、视觉伺服和接触控制。
- [FoveaVLA 深度解读](/research/papers/2026/foveavla/)：双目图像、Fast-FoundationStereo 深度、未来局部观察与 VLA 动作之间的耦合案例。
- [研究目录](/research/)：在“机器人与具身智能 / 深度感知与几何估计”目录中阅读同一正文。

## 来源与更新边界

核心依据：[Stereolabs Depth Modes](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-modes/)、[RealSense D435 官方规格](https://www.realsenseai.com/products/stereo-depth-camera-d435/)、[RealSense D400 投射器白皮书](https://dev.realsenseai.com/docs/projectors/)、[Luxonis Depth 官方文档](https://docs.luxonis.com/overview/toplevel-features/depth)、[Apple AVDepthData](https://developer.apple.com/documentation/avfoundation/avdepthdata)、[Depth Anything V2](https://depth-anything-v2.github.io/)。硬件固件、型号、算法更新较快，具体部署以所使用版本的官方文档为准。
