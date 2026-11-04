---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "深度图到机器人三维点：K、外参、RGB 对齐、Z 与 Range"
shortName: "Depth Calibration"
summaryZh: "用完整的像素到三维点链路解释内参、畸变、Z-depth、斜距、RGB-D 对齐、坐标变换、同步与误差传播。"
---

# 从像素到三维点：为什么相机“有深度”还不够？

## 一、先别问夹爪抓哪里，先问坐标在哪

设 RGB 图像中某个抓取候选点为像素 $(u,v)$，其对应相机坐标系的**光轴深度**为 $Z$。已校正的针孔模型下：

$$
\begin{aligned}
X_c&=(u-c_x)Z/f_x,\\
Y_c&=(v-c_y)Z/f_y,\\
Z_c&=Z.
\end{aligned}
$$

更紧凑地：

$$
\mathbf P_c=Z K^{-1}[u,v,1]^T.
$$

这里的 $K$ 是这一张图像实际对应的内参。原始图缩放一半后，焦距和主点坐标也要同步缩放；Crop 后主点也会发生平移。**直接拿原始 K 去反投影裁剪图上的像素，会产生系统错误。**

## 二、Z-depth 与 Range 的区别

相机坐标系中的 $Z$ 是沿光轴的距离，而 $r=\sqrt{X_c^2+Y_c^2+Z_c^2}$ 是点到光心的直线距离。对图像边缘，通常 $r>Z$。部分传感器或 SDK 输出 Range，另一些输出 Z-depth 或 Disparity；**必须确认接口语义**。

若 API 输出的是真实光线距离 $r$，可以将 $K^{-1}[u,v,1]^T$ 归一化成单位方向 $\hat q$，再算 $\mathbf P_c=r\hat q$，不能将 $r$ 当作 $Z$ 套用第一节公式。

## 三、RGB 和 Depth 的像素不一定同一个光心

RealSense D435 的 Depth 来自左右 IR 双目，而 RGB 来自独立 Sensor；ZED 的默认深度参考图通常对应左 RGB。RealSense 的 Depth Color Alignment 不是把两幅图片改成相同分辨率就完事，而是：

1. 在 Depth 相机坐标系将每个有深度的像素反投影成三维点；
2. 用相机间外参 $T_{rgb\leftarrow depth}$ 变换至 RGB 相机系；
3. 用 RGB 内参投影到目标像素；
4. 处理一对多、空洞与遮挡；
5. 确认分辨率、插值方式、时间戳与畸变校正匹配。

如果要把 RGB 中 VLM 给出的像素目标转为世界坐标，必须使用**已对齐的深度**，或者把 RGB 射线与原深度点云进行几何关联。

## 四、如何把相机点转到机器人基座？

定义 $T_{base\leftarrow cam}$ 表示将相机坐标表达转到机器人 Base 的齐次变换，则：

$$
\begin{bmatrix}\mathbf P_{base}\\1\end{bmatrix}
=T_{base\leftarrow cam}
\begin{bmatrix}\mathbf P_{cam}\\1\end{bmatrix}.
$$

若相机装在末端，$T_{base\leftarrow cam}$ 随机器人状态变动，须通过末端姿态和 Hand-Eye Calibration 组合。若相机固定在外部，也需要准确标定与定期验证；**视觉上目标的中心点并不自动等于夹爪可达且可抓的三维接触点**。

![RGB 像素及深度到相机点再到机器人基座的坐标流程](/research/figures/depth-perception/pixel-to-robot.svg)

*图 1 · 教学性坐标流。与具体机器人控制器/末端姿态约定无关，使用前仍需核对坐标轴方向和外参乘法顺序。*

## 五、时间对齐为什么会变成几何误差？

相机帧的时间戳若是 $t$，对应机器人的 $q(t+\Delta t)$，在运动过程中就可能把旧深度投到新姿态。尤其腕部相机、抓取接触和高速运动中，即使深度像素值准确，世界坐标仍会有误差。

因此必须记录：Color Timestamp、Depth Timestamp、机器人状态时间、曝光时间、深度处理时间、动作执行时间。并且区分 **Sensor Timestamp** 与 **Model Completion Timestamp**。

## 六、独立验证的最小集

- 已知平面距离的深度绝对误差和不同距离的偏差；
- RGB 边界与 Depth 重投影后的边缘对齐；
- 固定物体在不同相机位姿下落到机器人 Base 的 3D 位置一致性；
- 机器人末端运动时的时序错位；
- 是否对不同 FOV、resize、crop 重新计算内参。

## 来源

- [Apple AVDepthData：深度、视差和相机标定语义](https://developer.apple.com/documentation/avfoundation/avdepthdata)。
- [RealSense SDK](https://github.com/IntelRealSense/librealsense) 中的对齐、反投影和内参示例。
- [COLMAP 官方标定与相机几何](https://colmap.github.io/)。
- [深度可靠性](depth-reliability.md) · [Stereo Depth](stereo-depth.md)。
