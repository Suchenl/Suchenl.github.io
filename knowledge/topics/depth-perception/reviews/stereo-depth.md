---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "被动双目、主动双目与 Stereo Matching：ZED、D435、SGM 和 FoundationStereo"
shortName: "Stereo Depth"
summaryZh: "完整解释视差三角测量、主动散斑、SGM 与神经立体匹配，并回答 ZED SDK、RealSense D435 与 Fast-FoundationStereo 的实质区别。"
---

# 双目深度：有两台相机，为什么仍可能看错距离？

## 一、核心原理：距离不是从两张图直接读出来的

对经过校正的左右双目图像，同一世界点在左图横坐标 $u_L$、右图横坐标 $u_R$ 的差叫视差：

$$
d=u_L-u_R,\qquad Z=\frac{f_x B}{d}.
$$

$f_x$ 是校正后、与视差同尺度的像素焦距，$B$ 是已知基线。若 $f_x=700$ 像素、$B=0.05$ m、$d=35$ 像素，则 $Z=1$ m。这是教学例子，不是某台相机的标定。

![双目像素视差与深度误差放大的几何示意](/research/figures/depth-perception/stereo-geometry.svg)

*图 1 · 教学性自绘：需要校正和正确内参；箭头不是相机标定证据。*

视差误差会被几何放大：

$$
\left|\Delta Z\right|\approx\frac{Z^2}{f_x B}\left|\Delta d\right|.
$$

**这解释了为什么远处可能输出“合法且平滑”的错误深度。** 提高匹配网络能力不能消除校准误差、遮挡与镜面导致的物理歧义。

## 二、被动双目和主动双目，区别不在是否用了神经网络

- **被动双目（Passive Stereo）**：左右相机依赖环境本身的可见纹理；ZED 2 采用这一大类设计。表面缺纹理、光照很暗、重复图案容易产生匹配歧义。
- **主动双目（Active Stereo）**：例如 RealSense D435 用两台 IR 相机，并可使用 IR 散斑投射器给场景增加特征。**投影器不测回波时间、不直接输出距离**；深度仍由左右 IR 匹配和三角化得到。

RealSense D435 官方明确标为 Active Stereoscopic。D4 芯片内部做立体深度计算；RGB 来自另一相机传感器，不要把 `RGB + Depth` 误当立体输入的左右图像。可参考 [D435 官方规格](https://www.realsenseai.com/products/stereo-depth-camera-d435/) 和 [D400 投射器白皮书](https://dev.realsenseai.com/docs/projectors/)。

## 三、传统匹配与神经匹配如何比较？

| 算法 / 系统 | 输入 | 匹配主干 | 输出与部署 |
|---|---|---|---|
| Block Matching（BM） | 校正双目 | 局部窗口相似度 | 轻量，难场景有噪点 |
| SGM / SGBM | 校正双目 | 多方向匹配代价聚合 | 速度与传统稳健性折中 |
| RealSense D4 | 左右 IR | 定制芯片立体算法（厂商实现） | 相机内部生成 Depth |
| ZED SDK Neural | ZED 左右 RGB | SDK 自带神经视差估计，完整网络未公开 | NVIDIA GPU 上执行，提供 Depth / Point Cloud / Confidence |
| Fast-FoundationStereo | 经过校正的双目图 | 蒸馏、架构搜索、剪枝的深度立体网络 | 独立输出视差，借标定恢复深度 |

**不能把 ZED SDK 视为固定的传统 SGM。** 其当前 SDK 5.x 提供 `NEURAL_LIGHT`、`NEURAL`、`NEURAL_PLUS` 三类神经模式；`PERFORMANCE`、`QUALITY`、`ULTRA` 为旧模式。三种 Neural 的速度、细节和算力需求不同，且厂商没有公开足够完整的训练细节来判定其对应某个学术网络。参见 [ZED Depth Modes](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-modes/)。

[Fast-FoundationStereo 官方实现](https://github.com/NVlabs/Fast-FoundationStereo)（CVPR 2026）强调零样本跨域双目匹配和实时加速：知识蒸馏、Blockwise NAS 和结构化剪枝。它不是新的测距硬件；可处理符合输入和标定要求的双目图像，通常需要主机 GPU。

## 四、为什么已有 ZED SDK 深度，还要使用 Fast-FoundationStereo？

因为“相机提供深度”实质上只是“厂商把双目匹配算法与设备一起交付”。若保存原始左右图像，就可以离线或在线更换 Stereo Matching。它可能有利于训练/部署统一深度预处理、研究跨域泛化或复现，但**新算法不自动比 SDK 更准**。

[FoveaVLA](/research/papers/2026/foveavla/) 在真实外部 ZED 双目图像上重新运行 Fast-FoundationStereo，并用同一视觉编码器接收 Depth 伪彩色图。论文未给出 **ZED SDK Neural vs Fast-FoundationStereo** 的同条件深度误差对照，不能臆造性能排名。

### D435 可以换成 Fast-FoundationStereo 吗？

理论上可以导出 D435 左右 IR 图像，校正后作为双目输入，并使用正确的 $f_x,B$ 转为深度。但训练网络原本偏向可见光 RGB 立体图，IR 灰度复制为三通道后仍存在域偏移；不能把单独的 RGB Sensor 和 Depth Sensor 两路当成 Stereo Pair。是否超过相机内部 D4 深度必须实验验证。

## 五、真正需要审查的六个技术细节

1. **同步**：动态物体在左右图不同曝光时刻会产生伪视差。
2. **校正**：需用匹配图像尺度的内参和双目外参；重采样会改变像素焦距。
3. **遮挡**：左图看到、右图看不到的点，没有真实可靠对应；网络填出深度仍可能是假设。
4. **重复图案**：多个像素对具有近似匹配代价。
5. **主动投射**：可增强纹理但可能与其他设备干扰；阳光可压制 IR 对比度。
6. **置信度**：高置信度也不等于数值准确；应通过 Left–Right Consistency、重投影残差、时间稳定性和真实标尺独立验证。

## 实验建议：同一帧只变一个因素

同一外部双目硬件、相同校正与场景，比较 SDK Neural、Fast-FoundationStereo、经典 SGBM；记录每一帧的深度有效比例、对照真值误差、运行时间、物体边缘误差及机器人任务结果。D435 还应控制 IR Projector ON/OFF。

## 来源

- [ZED SDK Depth Modes](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-modes/) 与 [Depth Settings](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-settings)。
- [RealSense D435 规格](https://www.realsenseai.com/products/stereo-depth-camera-d435/)、[Projector White Paper](https://dev.realsenseai.com/docs/projectors/)。
- [Fast-FoundationStereo CVPR 2026 / Code](https://github.com/NVlabs/Fast-FoundationStereo)。
- [NVIDIA Stereo Reconstruction Pipeline](https://docs.nvidia.com/nurec/robotics/neural_reconstruction_stereo.html)。
- 后续：[深度是否可信](depth-reliability.md)、[标定与坐标](calibration-coordinate.md)。
