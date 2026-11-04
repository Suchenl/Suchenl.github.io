---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "深度可信度：Valid、Measured、Confidence 与真实误差不是一回事"
shortName: "Depth Reliability"
summaryZh: "从测距范围、左右一致性、光学多径、时序误差与置信度校准出发，建立对无效深度、低可信深度和系统性偏差深度的区分。"
---

# 深度可信度：为什么 Measured 也可能是错的？

## 一、最重要的三个概念

**Valid**：满足某一 API 的技术条件，例如非零、非 NaN、位于宣称量程内。**Measured**：有一个来自物理传感器的测距或匹配过程，而非单纯网络填补。**Reliable**：在当前任务定义与误差容忍度下，估计和真实几何足够一致。

这三个概念是不同维度。一个像素可以：
- Valid + Measured + Reliable：双目匹配正确，深度与真值接近；
- Valid + Measured + Unreliable：镜面多径或错误匹配产生稳定但偏差很大的深度；
- Valid + Inferred + Unreliable：网络预测补全的玻璃边缘虽漂亮，却不是真实接触表面；
- Invalid + Measured：传感器产生回波/候选对应，但因超距或一致性测试被拒绝。

所以**任何叫 `measured` 的布尔字段都不该自动升级为 `trusted`**。不清楚来源与误差模型的情况下，不能用输出为 0.63 m 就认定抓取点在 63 cm 处。

## 二、异常深度从哪里来？

![无效、偏差和不确定深度进入可靠性检查的判别示意](/research/figures/depth-perception/depth-trust.svg)

*图 1 · 教学性风险分层与证据决策图；不是模型或厂商已实现的确定性判别器。*

| 失效模式 | 典型表现 | 为什么只看范围不够 |
|---|---|---|
| 超出几何工作距离 | 零值、边界夹值、间断噪声 | 某些算法仍可能输出合法距离 |
| Stereo 重复纹理 / 遮挡 | 错误配对、物体边缘毛刺 | 视差值可以是正常正数 |
| 玻璃 / 透明材质 | 估计到背后物体或折射表面 | 像素深度和表面深度不同 |
| 镜面 / 金属 | 高反、反射场景影像或多径 | 返回光仍有合理强度 |
| iToF 多径与相位折叠 | 偏移或成片假深度 | 数值可能稳定但不对应目标 |
| RGB-Depth 错配 | 颜色与深度边界平移 | 各自数值合法，联合 3D 点错位 |
| 时序和相机外参漂移 | 点云重影、动态偏差 | 只查单帧深度无法发现 |
| 单目先验域偏移 | 深度连续但尺度失真 | 网络可以对错误预测给出高分 |

## 三、有效性检查应包含什么？

先执行不依赖学习先验的基本检查：单位与范围、非有限值、边界饱和、局部离群、设备故障标记、Stereo 左右一致性、ToF 回波幅度、位姿/时钟同步、温度或自标定状态。

**左右一致性**例如对一对对应像素计算 $d_L$ 和 $d_R$，若两个反方向的视差不一致，提示可能匹配失败或遮挡。但这不能发现两边都认错同一重复结构的情况；也不能捕获全部系统 Bias。

更有价值的是独立证据：多视角重投影、已知尺寸的标定板、可追溯的外部测距、机器人末端与物体表面的物理接触反馈。

## 四、Confidence 不能直接当误差概率

不同系统的“Confidence”可以是：
- Stereo Cost Margin、Left-Right Consistency 等匹配启发式；
- ToF 振幅、信噪比、返回强度；
- 单目网络预测的 Confidence Head；
- 测试集校准之后的误差界/概率分数。

**只有最后一类在明确目标事件和测试分布下做过校准，才可以解释为特定误差阈值内的概率。** 一个 0.95 Confidence 不等于“95% 概率在 1 mm 内”，除非官方或实验给了相应的校准定义。

可定义任务事件 $E_{\tau}=\{|\hat Z-Z^*|\le\tau\}$，在独立真值集上考察每个置信度区间的实际 $P(E_\tau)$。阈值 $\tau$ 应根据抓取尺寸和容差确定，不能所有任务共用一个。

## 五、如何建立实用可靠性门控？

一个保守设计是：
1. **Validation**：检查非有限、范围、单位、时序、元数据；
2. **Evidence**：匹配一致性、跨视角、局部法线与几何连续性；
3. **Uncertainty**：使用明确定义的置信度或校准误差估计；
4. **Action Gate**：可信则使用；不可信则请求其他视角、重采样或拒绝执行接触动作；
5. **Audit**：记录错误深度、错误抓取与原因，而不是只存最终漂亮的 Depth Map。

门控不能假装为绝对安全证明，尤其在未标定新材质、新相机、新任务的情况下。

## 六、建议测量的指标

| 指标 | 能反映什么 | 无法单独证明 |
|---|---|---|
| Coverage / Fill Rate | 多少像素有非空输出 | 输出是否正确 |
| MAE / RMSE / AbsRel | 对比真值的误差 | 错误是否集中在抓取部位 |
| Bad-Pixel Rate @ 阈值 | 严重误差比例 | 相机实时延迟 |
| Edge Accuracy | 接触边界是否锐利 | 整体尺度偏差是否为零 |
| Calibration / Reliability Diagram | 置信度是否对应真实准确率 | 部署域保持不变 |
| 3D Target Error | 目标坐标误差 | 控制器是否无碰撞 |
| Task Success / Safety | 闭环任务结局 | 哪个子模块单独产生提升 |

我的建议是优先把**深度可靠性**作为跨硬件研究问题，而不是只问哪一个网络的可视化深度图最好。

## 来源

- [RealSense D400 深度准确率及测量条件](https://support.realsenseai.com/hc/en-us/articles/360059129453-Depth-accuracy-for-Intel-RealSense-D400-Series-Cameras)。
- [ZED SDK Depth Settings / Confidence](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-settings)。
- [Apple AVDepthData Accuracy](https://developer.apple.com/documentation/avfoundation/avdepthdata/accuracy)。
- [UniDepthV2 Confidence](https://github.com/lpiccinelli-eth/UniDepth)。
- [RGB-D 融合](rgbd-fusion.md) · [深度选择与评测](selection-evaluation.md)。
