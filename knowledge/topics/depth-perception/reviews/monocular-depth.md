---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计", "多模态学习与生成/视觉语言理解"]
title: "单目深度估计：Relative Depth、Metric Depth、尺度与相机内参"
shortName: "Monocular Depth"
summaryZh: "比较 Depth Anything V2、Depth Anything 3、Metric3Dv2、UniDepthV2 和 Depth Pro，重点回答单张 RGB 如何产生深度、何时是米制输出、为什么依旧可能偏离真实距离。"
---

# 单目深度估计：一张 RGB 图片，究竟凭什么知道距离？

## 一、一张图像并不足以唯一恢复真实尺度

成像方程 $u=f_x X/Z+c_x$、$v=f_y Y/Z+c_y$ 表明，同一张投影图像可能由许多按比例放大的三维场景产生。**只看一张未带尺度先验的 RGB，真实米制距离在几何上一般不可唯一辨识**。

深度模型之所以能输出米，是因为它学习了物体大小、透视、遮挡、场景布局等统计先验，有些模型还显式利用相机内参。这是有价值的预测能力，但与投射光回波或已知双目基线提供的独立测距证据不同。

## 二、首先分清三种输出

| 类型 | 可以判断 | 不可以直接判断 |
|---|---|---|
| Relative Depth | 哪些部分更近/远，或在某种单调关系下的结构 | 严格的真实米制距离 |
| Scale-/Shift-Invariant Depth | 经过比例、偏置变换后形状是否相符 | 当前输出尺度就是相机尺度 |
| Metric Depth | 模型直接给以米为单位的深度估计 | 每个像素误差都足够小、无需校准或域测试 |

**Metric Depth 指的是输出目标具有物理尺度，不是“模型观测到了米制真值”。** 尤其需要确认焦距、图像裁剪、resize 后是否保持了相机模型一致。

## 三、代表性方法和它们的任务定义

| 模型 | 研究定位 | 主要输入/输出 | 阅读重点 |
|---|---|---|---|
| [Depth Anything V2](https://depth-anything-v2.github.io/)（NeurIPS 2024） | 强泛化单目相对深度；另提供室内/室外 Metric 微调模型 | 单 RGB → Depth | 相对和 Metric 权重不能混用；模型规模和许可分别检查 |
| [Depth Pro](https://machinelearning.apple.com/research/depth-pro)（Apple / ICLR 2025） | 单图 Zero-shot Metric Depth，高分辨率边缘 | RGB → 米制 Depth，含焦距推断 | 未知内参时的尺度预测仍有误差 |
| [Metric3Dv2](https://github.com/YvanYin/Metric3D)（TPAMI） | 单图米制深度 + 法线，强调通用相机空间 | RGB + 相机相关信息 → Depth / Normal | 实际焦距、规范相机变换与尺度还原 |
| [UniDepthV2](https://github.com/lpiccinelli-eth/UniDepth)（2025 arXiv） | 通用单图米制深度与相机几何 | RGB → Metric Depth；可输出相机参数与 Confidence | Confidence 不等于经过实测校准的误差概率 |
| [Depth Anything 3](https://github.com/ByteDance-Seed/Depth-Anything-3)（2025 研究系列） | 同时处理单图、多视角/视频空间几何 | 图像集 → Depth、Ray / Camera Geometry（视版本） | 不能用多视角设置的成绩描述单图无尺度误差 |

所有以上模型都只是**代表性路线，而不是截至今天经过同一硬件、相同协议验证的排行榜**。若具体型号、Checkpoint、许可证、推理预算不同，直接比较一个 AbsRel 数字不科学。

## 四、将单目预测用于机器人，有什么陷阱？

假设模型预测夹爪表面为 0.48 m，真实距离是 0.55 m。两个数字外观都合法，网络还可能输出锐利的物体轮廓，但 7 cm 的 Bias 足以影响小物体接触。

常见失败来源：
- **尺度漂移**：未知焦距、不同 FOV、相机倾角与场景分布变化；
- **语义幻觉**：透明杯子、镜子、显示屏可能被按“常见物体形状”推断出错误表面；
- **时序不一致**：逐帧预测的米制 Depth 可能跳动；
- **传感器标定混淆**：图像缩放或裁剪后把旧 $K$ 直接用于 3D 反投影。

## 五、已有深度相机时，单目模型放在哪里？

我更倾向把单目模型当作**候选先验（prior）**而非直接覆盖传感器的“真值”。可以让可信的传感器区域约束尺度，再由 RGB 先验推断空洞，最后以时间一致性和独立几何证据审查补全区域。

这种方案在数学上是“测量证据 + 学习先验”的融合，须分别记录：原始测量、原始预测、融合结果和各自的可信度。不能因为融合图看上去更完整，就认为机器人接触位姿更准。

## 来源与延伸阅读

- [Depth Anything V2 官方项目](https://depth-anything-v2.github.io/)；[官方模型](https://github.com/DepthAnything/Depth-Anything-V2)。
- [Apple Depth Pro 研究页](https://machinelearning.apple.com/research/depth-pro)；[官方代码](https://github.com/apple/ml-depth-pro)。
- [Metric3Dv2 官方实现](https://github.com/YvanYin/Metric3D)。
- [UniDepthV2 官方实现](https://github.com/lpiccinelli-eth/UniDepth)。
- [Depth Anything 3 官方仓库](https://github.com/ByteDance-Seed/Depth-Anything-3)。
- 后续：[RGB-D 融合](rgbd-fusion.md)、[可靠性](depth-reliability.md)。
