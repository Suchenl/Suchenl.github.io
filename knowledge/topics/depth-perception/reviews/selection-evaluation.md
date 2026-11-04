---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "深度相机与算法选择：机器人场景的受控评测协议"
shortName: "Depth Selection and Evaluation"
summaryZh: "按照场景、硬件、深度生成算法与信任机制建立对照矩阵，避免混淆相机规格、深度图观感、几何误差和真实机器人任务成功率。"
---

# 怎样选择深度相机和算法？先设计实验，再比较排名

## 一、先规定真实任务边界

选择一个系统前应固定：目标大小与材料、距离范围、室内/户外光照、相机是否能移动、运动速度、接触容差、允许延迟、GPU 预算和手眼标定条件。

同一台相机在“50 cm 白色纸板”与“2 m 透明杯子”上的可靠性可能完全不同。只引用产品支持的最大测距或网络 benchmark 平均值，无法证明精细抓取适用性。

## 二、设备选择按“物理获取方式 × 计算方法”进行

| 典型组合 | 适合先验证的用途 | 需要重点核对 |
|---|---|---|
| RealSense D435 / D435i + D4 默认深度 | 低主机计算预算、通用近中距离 | 主动 IR、双目基线、RGB/Depth 对齐、工作距离 |
| RealSense D405 + D4 | 桌面较近距离操作 | 最近距离与视场；不能把 D435 参数套到 D405 |
| RealSense D455 + D4 | 较远范围、多机部署 | 较长基线导致的近距限制、任务几何 |
| ZED 2/2i + SDK Neural | 外部 RGB 双目和深度一体化 | GPU 成本、具体 Neural 模式、基线、相机型号 |
| ZED 原始双目 + Fast-FoundationStereo | 需要修改立体匹配策略的研究 | 额外 GPU 延迟、校正、和 SDK 的公平对照 |
| OAK-D / OAK-D Pro | 端侧 Stereo 与可选主动投射 | 不同型号是否有 IR 投射、VPU 算法与量程 |
| ToF 深度相机 | 近中距离主动测距/光照特殊条件 | 多径、饱和、相位歧义、运动与材质 |
| RGB + 单目 Metric Depth | 没有深度硬件、视觉先验或空洞补全 | 尺度校准、域偏差、延迟 |
| 多视角 RGB-D / MVS | 遮挡补偿与低频几何场景重建 | 多机外参、同步、动态遮挡 |

这些是**典型研究候选，并非购买推荐或绝对优劣排序**。实际规格以具体相机 SKU、固件和镜头版本为准。

## 三、推荐的最小实验矩阵

### A. 拆分“相机物理条件”和“算法”

| 对照组 | 保持不变 | 改动 | 回答什么 |
|---|---|---|---|
| D435 IR Projector OFF / ON | 同机、同光照、同算法 | 仅投射器 | 主动纹理带来的增益 |
| ZED SDK Neural / Fast-FoundationStereo | 同 ZED 双目原始帧和标定 | Stereo 算法 | 神经匹配算法的差异 |
| D435 D4 / IR+外部神经 Stereo | 同原始 IR、同校正 | 匹配后端 | 外部方法能否提升特定场景 |
| Raw Depth / RGB-guided Completion | 同传感器原始输出 | 增加补全 | 增加 Coverage 是否牺牲 Accuracy |
| RGB-only / RGB-D | 同 VLA 设置与数据预算 | 深度输入模态 | 在给定策略下深度实际贡献 |
| 单外部相机 / 双外部相机 | 同处理协议与任务 | 相机数量 | 额外视角是否覆盖遮挡 |

若硬件/摄像机数不同，训练数据、模型大小和运行延迟通常也会变化；不能简单把全部收益归因于 Depth。

### B. 必测场景

平坦无纹理、重复纹理、透明物体、镜面/金属、暗面/黑色、边缘/细杆、近端极限、远端极限、弱光与强光、动态物体、多机光干扰。不同类别分别计算误差；总平均值容易把最危险的少量失败隐藏起来。

### C. 指标分三层

**测量层**：绝对误差 MAE/RMSE、AbsRel、Bad-Pixel、Coverage、时序抖动、误差分位数、置信度校准。

**几何层**：重投影误差、相机系与基座系点位误差、物体边界与可抓区域的误差、不同视角一致性。

**任务层**：抓取成功率、接触/碰撞事件、失败恢复能力、端到端动作延迟及额外算力开销。若系统需要人为修正，也要报告干预次数。

## 四、一个建议的记录格式

```text
camera_model, firmware, lens, illumination
stereo_mode, projector_enabled, processing_pipeline
image_resolution, depth_resolution, depth_units
K_color, K_depth, T_color_depth, T_base_camera
timestamp_rgb, timestamp_depth, timestamp_robot
depth_raw, validity_raw, confidence_raw
depth_pred, depth_fused, source_map
reference_depth_method, reference_uncertainty
material, distance_bin, visibility, task_type
error_metrics, task_success, latency_ms
```

这些字段是便于复现的记录协议建议，并非所有厂商原生都有。缺少可靠 Ground Truth 时，必须明确说明比较的是**自一致性**而非真实误差。

## 五、如何避免错误结论？

- “看起来更完整” ≠ “深度更准确”；
- “厂家标称 2%” ≠ “所有材质上每一像素误差小于 2%”；
- “模型以米为单位输出” ≠ “模型得到独立物理测量”；
- “传感器 Confidence 高” ≠ “抓取安全”；
- “ZED 比 D435 更强/更弱”没有固定任务与预算条件就没有科学含义。

**结论**：对机器人最有用的不是一个普适深度排行榜，而是一份能把“相机硬件、成像、深度算法、可靠性与任务表现”解耦的可重复实验协议。

## 核验资料

- [RealSense 相机产品对照](https://www.realsenseai.com/compare-depth-cameras/) 与 [D435 规格](https://www.realsenseai.com/products/stereo-depth-camera-d435/)。
- [Stereolabs Depth Modes](https://docs.stereolabs.com/docs/development/zed-sdk/modules/depth-sensing/depth-modes/)。
- [Luxonis Depth / 设备家族](https://docs.luxonis.com/overview/toplevel-features/depth)。
- [Fast-FoundationStereo 官方代码](https://github.com/NVlabs/Fast-FoundationStereo)。
- [深度可信度专题](depth-reliability.md) · [标定和坐标](calibration-coordinate.md)。
