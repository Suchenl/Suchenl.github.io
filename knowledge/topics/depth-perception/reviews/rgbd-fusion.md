---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "RGB-D 融合、深度补全与去噪：传感器测量如何和视觉先验结合"
shortName: "RGB-D Fusion"
summaryZh: "区分滤波、去噪、补全、校正与跨传感器融合，给出保留原始证据和可靠性门控的工程流程，避免错误深度被视觉模型合法化。"
---

# RGB-D 融合：有 RGB 和 Depth，为什么不能简单地让网络补全一切？

## 一、先把不同目标区分开

| 目标 | 输入问题 | 期望输出 | 核心风险 |
|---|---|---|---|
| Denoising | 表面真实深度附近有随机抖动 | 减小局部噪声 | 抹平真实边界 |
| Depth Completion | 部分像素是无效/空洞 | 为缺失位置估计深度 | 先验“幻觉” |
| Depth Refinement | 深度边缘错位或量化粗糙 | 改善对齐和细节 | RGB Texture Copying |
| Bias Correction | 合法数值有系统性偏移 | 校准尺度/偏差 | 把新场景外推成错误校正 |
| Sensor Fusion | 多个来源各有优势和失效 | 综合几何估计与不确定性 | 错误来源权重过大 |

它们不是一个“增强深度”的同义词。例如 Gaussian/Temporal Filtering 可降低随机噪声，却不会自动纠正稳定的尺度偏差；RGB Guided Completion 可以给缺失区域填入看似可信的深度，但真实物体表面可能完全不同。

## 二、推荐先分离证据，再融合

![RGB 与传感器深度经过有效性和可靠性判断后的融合链](/research/figures/depth-perception/rgbd-fusion.svg)

*图 1 · 教学性工程流程：先检查原始深度与几何一致性，再融合视觉先验。它不是某篇论文的原始网络结构。*

分成五条明确数据流：

1. 原始 RGB，保存曝光、裁剪、内参和时间戳；
2. 原始 Depth，保留数值和无效 Mask；**不直接覆盖保存文件**；
3. 深度质量与几何一致性，检查量程、邻域异常、时序残差、跨视角或外部参考；
4. 视觉先验（单目、RGB-guided 网络、语义/几何边界），补充缺失区域的候选表面；
5. 融合输出同时携带 Estimated Depth、Source/Provenance、Confidence/Uncertainty、Original Measurement Validity。

**最后一点至关重要：融合结果不应抹去哪些像素源于物理测量、哪些像素源于学习补全。**

## 三、从简单可靠的几何一致性做起

若有深度观测 $z_s$、视觉先验 $z_p$ 和相应误差尺度 $\sigma_s,\sigma_p$，在局部两者无明显冲突且误差假设成立时，可以用精度加权平均作为教学性示意：

$$
z_f=\frac{z_s/\sigma_s^2+z_p/\sigma_p^2}{1/\sigma_s^2+1/\sigma_p^2}.
$$

但这个公式的前提非常苛刻：来源误差近似无偏、相互独立、方差已正确估计。深度网络和传感器可能受到同一光照/纹理条件影响，误差高度相关。**未验证这些前提时不能直接把上式部署为机器人抓取安全规则。**

更保守的流程是：对可疑区域先拒绝直接接触决策；若存在可信测量优先锚定测量，再利用网络填补不可信/缺失区域；融合后重新进行跨视角验证。

## 四、RGB 为什么有时反而污染 Depth？

一个显著的 RGB 边界可能只是衣服纹理而不是真实几何台阶。若把每条颜色边缘都硬复制到深度上，就会出现 **Texture Copying**。反过来，透明玻璃边缘在 RGB 中可见，但双目或 ToF 可能给出后方背景深度，网络可能依据语义“画”一个前表面，却无法从该单帧得到严格物理证据。

因此应区分 **RGB Edge**、**Depth Discontinuity** 和 **Occlusion Boundary**；只在有几何证据时把颜色变化解释成深度变化。

## 五、机器人最终应该输出什么？

我建议至少保存：

```text
depth_raw_m           # 原始传感器值
depth_valid_raw       # API 的有效性 + 独立物理过滤
depth_pred_m          # 网络深度先验，需注明是否是 metric
depth_fused_m         # 融合估计结果
depth_source          # measured / inferred / mixed / rejected
depth_confidence      # 必须注明是否经过标定；非“真实概率”的默认别名
K, T, timestamp       # 内参、外参、时间同步和坐标定义
```

这些字段是**研究建议的通用数据契约**，不是某个硬件 SDK 已保证支持的完整接口。通过这些字段才能把“深度点看起来合理”进一步追溯到它来自哪里、为什么可被使用。

## 六、怎么评测？

必须分别测 **Raw 与 Fused 的 Z-Error、Edge Error、Coverage、Bad Pixel、Geometry Consistency、运行时延迟、物体级 3D 抓取点误差、任务成功率**。任何“高填充率”都可能通过错误猜测实现，所以 Coverage 和 Accuracy 必须并列报告。

尤其要记录透明、镜面、暗面、无纹理白面、薄物体、深度范围边界等子集。只有在不同材质和距离条件下的可靠性统计，才可能支持“融合方法更适合机器人”的主张。

## 来源

- [RGB-conditioned Depth Completion（Scientific Reports, 2026）](https://www.nature.com/articles/s41598-026-45432-1)：讨论 RGB 引导中的 Texture Copying 与边缘问题。
- [RealSense D400 深度误差定义](https://support.realsenseai.com/hc/en-us/articles/360059129453-Depth-accuracy-for-Intel-RealSense-D400-Series-Cameras)。
- [UniDepthV2 官方代码（含置信度输出）](https://github.com/lpiccinelli-eth/UniDepth)。
- [深度可靠性专题](depth-reliability.md) · [标定和坐标](calibration-coordinate.md)。
