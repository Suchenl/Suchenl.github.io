---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "深度获取技术全景：三角测量、飞行时间与学习式推断"
shortName: "Depth Acquisition"
summaryZh: "按深度信息的物理来源分类，并分清被动双目、主动双目、结构光、ToF、LiDAR、单目与多视角几何之间的边界。"
---

# 深度获取技术全景：到底有几种获取深度的方法？

> 核验：2026-11-04。本文按**物理测量原理**和**估计算法**分层分类，不把某个算法库、芯片或 RGB-D 输出格式误当另一种测距物理。

## 一、先问：深度真的被测量了吗？

从单个像素 $(u,v)$ 获得几何距离，至少可能来自以下三类证据：

1. **几何三角化**：已知两个或多个观测位置，通过对应点的视差解几何（双目、结构光、SfM/MVS）。
2. **主动测距**：发射已知光信号，从时间延迟、相位变化等回波特征求距离（ToF、部分 LiDAR）。
3. **数据驱动预测**：没有足够独立几何/回波约束时，模型依靠视觉结构、物体语义、训练先验预测深度（单目 Depth）。这不是独立的物理测量。

**算法通常与物理过程组合，而不是互斥。** ZED 用双目成像，既可以跑 SDK 神经匹配，也可以跑第三方 Stereo 网络；D435 用主动散斑改善 IR 双目匹配，但最终仍做三角化。FoundationStereo 不是一种相机，而是可用于兼容双目图像的 Stereo Matching 算法。

![深度获取的物理证据分类与计算链路](/research/figures/depth-perception/acquisition-map.svg)

*本专题绘制的简化分类图。*

## 二、最常见的七条技术路线

| 路线 | 需要什么观测 | 深度来源 | 有无天然米制尺度 | 典型问题 |
|---|---|---|---|---|
| 被动双目 | 同步左右图 | 视差 + 已知基线 | 有（标定正确时） | 低纹理、遮挡、视差误差 |
| 主动双目 | 双 IR/图像 + 投射散斑 | 同上，散斑增强匹配纹理 | 有 | 阳光、投射干扰、反光材质 |
| 结构光 | 已知投影编码 + 成像 | 相机—投影器三角化 | 有（标定正确时） | 投影图案不可辨、环境光 |
| iToF | 主动调制光 + 相位响应 | 相位推断光程 | 有，但有模糊范围 | 多径、相位折叠、强反射 |
| dToF / LiDAR | 发射光脉冲 + 回波时间 | 飞行时间 | 有 | 反射率、饱和、点云稀疏 |
| 单目学习深度 | 一张 RGB | 训练得到的几何/语义先验 | 视模型/校准而定 | 绝对尺度、域泛化 |
| SfM / MVS / 视频 | 多时刻或多视角图像 | 视角运动和多视角约束 | 纯单目 SfM 通常只有尺度不定解 | 运动物体、同步、位姿误差 |

ToF、LiDAR 等术语还可能跨层：LiDAR 描述主动激光测距设备，其测距可能基于不同的 ToF 实现；结构光与主动双目都“主动投射光”，但几何计算方式不同。

## 三、三种“深度”不是等价的数值

### 3.1 相机 Z-depth

在相机坐标系下，深度 $Z$ 是点到成像平面的光轴方向分量，不一定等于点到光心的直线距离。投影逆变换：

$$
\mathbf P_c=Z K^{-1}[u,v,1]^T.
$$

### 3.2 Euclidean Range

有些 ToF / LiDAR API 报告的是沿光线的距离 $r$，则必须使用归一化光线 $\hat{\mathbf q}$ 求 $\mathbf P_c=r\hat{\mathbf q}$；不能无脑代入上述 $Z$ 公式。

### 3.3 Relative / Inverse Depth

单目网络可能只提供排序或相对比例，输出经某种尺度变换才能当作米制数据使用。**越接近真实单位，不代表误差已足够小到可用于机械抓取。**

## 四、从硬件到深度图的计算管线

物理信号 → 曝光/同步与标定 → 匹配或测时/测相 → 深度求解 → 无效值处理 → RGB 对齐 → 可选滤波/补全 → 3D 重投影 → 控制器。

在这条链里，“置信度”可能由匹配代价、回波幅值或神经预测产生；“最终深度图”也可能经过时间平滑和空洞补全。一个深度矩阵并不能告诉使用者这些处理步骤是否发生过，必须核对设备 API 的元数据和配置。

## 五、我如何判断一种路线适合机器人？

优先回答：可测距离、需要的相机基线/光照、遮挡和材质、米制尺度是否可验证、输出频率与全流程延迟、是否存在可识别的 Invalid / Confidence、是否需要外参才能落到机器人基座。

仅比较论文上的 AbsRel 或厂商的“最大可测距离”并不充分。例如 1–2 米桌面抓取与 20 米导航对可用分辨率和误差的要求完全不同。

## 资料与继续阅读

- [RealSense：双目与结构光的区别](https://www.realsenseai.com/stereo-depth/the-basics-of-stereo-depth-vision/)。
- [RealSense D400 投射器白皮书](https://dev.realsenseai.com/docs/projectors/)。
- [Stereolabs 深度模式](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-modes/)。
- [Apple：Depth、Disparity 与相机标定](https://developer.apple.com/documentation/avfoundation/avdepthdata)。
- [Luxonis：Stereo 与 ToF 的共存](https://docs.luxonis.com/overview/toplevel-features/depth)。
- 下一篇：[被动/主动双目和 Stereo Matching](stereo-depth.md)。
