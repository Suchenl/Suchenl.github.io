---
contentType: review
domains: ["机器人与具身智能/深度感知与几何估计"]
title: "结构光、ToF 与 LiDAR：三种主动三维测量机制"
shortName: "Structured Light / ToF / LiDAR"
summaryZh: "从投影编码、相位差、光脉冲飞行时间入手区分结构光、间接/直接 ToF 与 LiDAR，并总结多径、反射、阳光等失效机制。"
---

# 结构光、ToF 与 LiDAR：主动发光为什么还会测错？

## 一、发射光并不意味着使用同一种测距原理

“主动”只说明设备主动照射场景，不能据此判定其距离测量算法。这里区分：

| 技术 | 发射的内容 | 接收后看什么 | 几何来源 |
|---|---|---|---|
| 结构光 Structured Light | 已知条纹、点阵、编码图案 | 投影图案在成像中的变形/对应 | 已知投影器和相机位置的三角化 |
| 主动双目 Active Stereo | 主要用于增加纹理的随机散斑 | 左右两路红外图像彼此匹配 | 两台 IR 相机的视差三角化 |
| iToF（间接 ToF） | 振幅调制/周期光 | 发射与接收光的相位差 | 光路时间推断 |
| dToF（直接 ToF） | 脉冲光 | 回波到达时间 | 光路时间推断 |
| LiDAR | 激光束/扫描光信号 | 回波时间、相位或其他测距量 | 常见实现是 ToF，设备通常形成点云 |

**结构光和主动双目经常被误归为同一种东西。** 结构光用“已知投影图案的空间位置”与相机共同三角化；主动双目通常不要求知道每个散斑的编码身份，而是在两台相机的图像之间匹配。

Apple [TrueDepth](https://developer.apple.com/documentation/avfoundation/capturing-photos-with-depth) 的红外图案测距是结构光的典型路线；RealSense 资料明确将 D400 Active Stereo 与 SR300 Structured Light 区分开。

## 二、ToF 算的究竟是什么？

### 2.1 dToF：直接测传播时间

若发射和收到同一个光脉冲相隔 $\Delta t$，简化的往返距离为：

$$
r=\frac{c\,\Delta t}{2}.
$$

其中 $c$ 是光速；系数 2 是因为光经过“出发—物体—返回”的往返路程。这个公式只描述理想单路径，不自动处理回波多峰、透明表面、反射和时间标定。

### 2.2 iToF：测周期光的相位滞后

发射调制频率 $f_m$ 的光，测得相位差 $\phi$ 后，理想单频不折叠范围内：

$$
r=\frac{c\phi}{4\pi f_m}.
$$

相位天然是模 $2\pi$ 的，因此可能出现多个距离对应相同相位的 **Phase Wrapping**。通过多频率、时间编码等方法可以扩展无歧义范围，但也引入更复杂的估计。

### 2.3 多径为什么会造成 Bias？

例如桌面、玻璃、墙面多次反射后，一部分光走了比直达路径更长的路。相机接收到的不是单一理想回波，而是多种路径混合。某些情况下它仍能输出很稳定的深度，但对应的距离偏离目标真实表面。

## 三、LiDAR 与普通 ToF 相机并非相互排斥

**LiDAR 是主动激光测距感知系统的名称，ToF 是一类具体测距机制。** 很多 LiDAR 采用脉冲 ToF，也有 FMCW 等其他实现。LiDAR 可以逐束扫描获得稀疏点云，也可以采用固态阵列。不能仅凭“LiDAR”断言其一定是稠密像素深度图。

ToF 深度相机通常向二维像素阵列报告每像素的深度及幅度等信息；扫描 LiDAR 的空间采样更稀疏但可能适合更远距离。实际性能取决于具体型号与光学设计，不能按类别对准确率做统一排名。

## 四、为什么反光和透明物体特别困难？

- **镜面**：主动光的反射方向未必回到传感器，或经过其他面形成多径。
- **透明**：光可能穿透或折射后返回，从而“测到后方表面”或出现形状扭曲。
- **黑色/吸光**：返回信号弱，ToF 幅度下降；不保证所有深色材质都失败。
- **强环境光**：调制/投影信号对比度降低，红外接收可能饱和。
- **多机同时工作**：相邻主动照明设备可能发生相互干扰，需核对同步与发射控制。

## 五、机器人系统怎样选？

桌面近距离：注意最小有效距离、投影器视场和目标材质；大范围导航：关注测距范围、点云密度、视场和车体运动；动态精细操作：关注曝光/测距时间、深度边界与 RGB 同步。

在任何设备上，**“无效深度”与“有效但有偏的深度”都必须分别报告。** 连续滤波可以减少抖动，却未必能纠正系统性的多径 Bias。

## 来源与延伸阅读

- [Apple TrueDepth 原理与深度类型](https://developer.apple.com/documentation/avfoundation/capturing-photos-with-depth)。
- [RealSense：Stereo 与 Structured Light](https://www.realsenseai.com/stereo-depth/the-basics-of-stereo-depth-vision/)。
- [Luxonis Depth：Stereo 与 ToF 家族](https://docs.luxonis.com/overview/toplevel-features/depth)。
- [深度获取全景](depth-acquisition-taxonomy.md) · [可靠性与异常深度](depth-reliability.md)。
