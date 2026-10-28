---
contentType: review
domains: ["机器人与具身智能/策略学习与控制"]
title: "机器人控制入门：从位置与 PD 到阻抗、力控和前馈 Wrench"
shortName: "Robot Control"
aliases: ["机器人控制专题", "PD控制", "阻抗控制", "前馈wrench", "OSC", "Admittance Control", "力控制", "视觉伺服"]
categories: ["机器人与具身智能/策略学习与控制"]
summaryZh: "用真实操作例子理解位置、速度、力矩、PD、阻抗、导纳、操作空间、前馈 Wrench、视觉伺服，以及 RoboTwin 与 RoboDojo 公开接口究竟提供哪一级控制。"
---

# 机器人控制专题：机器人为什么不能只给“目标位置”就完事？

> **读者定位**：面向机器人与 VLM Agent 研究者的控制基础。这里讲清高层动作、关节跟踪、接触柔顺性、感知反馈与动力学控制间的分工；不提供可直接用于真机部署的未校准增益或安全保证。核验：2026-10-28。相关实机案例见 [HIL-SERL](/research/papers/2024/hil-serl/)。

## 一句话理解

**规划或 Agent 给出“应该到哪、做什么”；运动学把末端目标变成关节目标；底层控制器通过传感器反馈生成力矩，使机械臂沿着期望轨迹稳定执行。** 单纯有末端目标不等于运动一定可达、无碰撞或接触安全。

### 最先记住的术语

| 概念 | 简单说 | 常见表示 |
|---|---|---|
| FK / IK | 从关节角求末端位姿 / 从目标末端位姿找可行关节角 | $x=f(q)$、$q^*=\mathrm{IK}(x^*)$ |
| Position / Velocity Control | 按位置或速度目标跟踪 | $q^*$、$\dot q^*$、$x^*$ |
| Torque / Force Control | 指定关节力矩或末端受力 | $\tau$、$F$ |
| Joint PD | 按关节位置/速度误差施加纠正力矩 | $K_p e+K_d\dot e$ |
| Cartesian Impedance | 使末端对误差和外力表现出类似弹簧阻尼的响应 | $M_d\ddot e+D\dot e+Ke$ |
| Admittance | 测量外力，输出相应位移/速度指令 | $F_{\mathrm{ext}}\to x^*,\dot x^*$ |
| OSC | Operational Space Control：在末端任务空间控制位置、姿态和动力学 | $J(q),\Lambda(x)$ |
| Wrench | 广义力：线力与力矩，不是单纯的位姿/速度 | $w=[F_x,F_y,F_z,\tau_x,\tau_y,\tau_z]$ |
| Feedforward / Feedback | 提前输出控制量 / 利用当前误差实时修正 | $u_{\mathrm{ff}}$、$u_{\mathrm{fb}}$ |
| Reference Limiting | 限制目标与实际状态间的误差 | $\|e\|\le\Delta$ |
| IBVS / PBVS | 根据图像特征误差 / 三维位姿误差进行视觉伺服 | 像素误差、SE(3) 误差 |

## 二、先看一条完整控制链

![从任务目标到 IK、控制器、机器人和传感器反馈的多层链路](/research/figures/robot-control/control-layers.svg)

*教学示意图：不同系统可能跳过 IK、直接学习关节控制或使用力矩策略；图中给出一种常见分层形式，不代表所有机器人固定按照这一模式实现。*

例如“把 RAM 插入卡槽”：

1. 任务层选择正确插槽，并确定目标姿态；
2. 路径规划判断“怎么到达”及是否需要避障；
3. IK 根据目标末端位姿找可行关节配置，必要时生成关节轨迹；
4. 低层控制器不断比较期望位置与实测位置，计算电机要施加的力矩；
5. 真实接触改变机器人状态，控制器根据反馈继续调整，Agent 则在更长时间尺度重新观察并决策。

**动作接口不等于底层控制器。** 同样一个 $x^*$，可由不同的 IK / 轨迹 / PD / OSC / 阻抗实现，也会产生不同接触行为。

## 三、PD：为什么刚度叫 Kp、阻尼叫 Kd？

经典 PD 控制器写作：

$$
u=K_p e+K_d\dot e.
$$

$P$ 是 **Proportional（比例）**：误差越大，纠正越强。$D$ 是 **Derivative（微分）**：利用误差变化率抑制振荡；$K$ 表示增益。若 $e=x_{\mathrm{ref}}-x$，典型的无移动目标位置控制可写作：

$$
F_{\mathrm{cmd}}
=K_p(x_{\mathrm{ref}}-x)+K_d(v_{\mathrm{ref}}-v).
$$

在这种力矩/力命令形式下，比例项相当于**虚拟弹簧的刚度**，微分项相当于**虚拟阻尼**。更普遍的机械阻抗表示通常写成 $K$（Stiffness）、$D$（Damping）、$M$（Inertia），不要求使用 $K_p,K_d$ 作为字面名称。

**注意单位**：位移单位为 m 时，平移刚度可为 N/m；角度误差时单位与旋转力矩相关。不能拿一组增益跨关节/末端/不同机械臂直接通用。

## 四、阻抗控制：虚拟弹簧 + 阻尼器

![目标位置、虚拟弹簧与阻尼器、真实末端和障碍物之间的机械类比](/research/figures/robot-control/spring-damper.svg)

*弹簧—阻尼器 SVG：根据此前对话中的原生 SVG 构图恢复为独立可编辑矢量图；不是机器人上真的装了弹簧，也不是 HIL-SERL 作者原图。*

纯刚性位置跟踪容易在接触障碍物时继续强行推动。阻抗控制不只追求“到达目标”，还要规定**末端运动误差与交互力之间呈现怎样的关系**：

$$
F_{\mathrm{cmd}}
=K(x_{\mathrm{ref}}-x)+D(v_{\mathrm{ref}}-v)+F_{\mathrm{ff}}.
$$

假设平移误差为 1 cm、刚度为 100 N/m，弹簧分量就是 1 N；刚度提高到 1000 N/m，就变成 10 N。这里不包括阻尼、惯性、重力、关节限制和真实接触动力学；它只说明“增益与偏差共同决定恢复力”。

**阻抗并不自动等于安全。** 如果目标远离当前接触点，误差仍很大，输出可能危险。HIL-SERL 在多数精密接触任务中使用 1000 Hz 的笛卡尔阻抗控制器接收 10 Hz 的策略参考，并采用 Reference Limiting，限制位置误差而不是直接降低刚度（原文附录 D.2）：

$$
\|x_{\mathrm{ref}}-x\|\leq\Delta.
$$

这一不等式是教学抽象；实际实现还须考虑坐标、旋转、采样频率和高频阻尼项，并不构成全场景接触力严格安全证书。

### 与导纳控制有什么不同？

**Impedance** 常见方向是“位姿误差 → 期望力/力矩”，适用于能较直接控制执行器力矩的系统。**Admittance** 则常见方向是“测量外力 → 修改位姿/速度目标”，适用于主要提供位置接口的机器人。两者目的都可以是柔顺交互，但输入输出接口和内环依赖不同，不应简单视为一个算法的两种拼写。

## 五、前馈 Wrench 到底是什么？

**Wrench 是六维广义力，不是速度也不是末端位姿。**

$$
w=\begin{bmatrix}\mathbf F\\\boldsymbol\tau\end{bmatrix}
=\begin{bmatrix}F_x&F_y&F_z&\tau_x&\tau_y&\tau_z\end{bmatrix}^{T}.
$$

如果高层策略决定“向右快速击打”，可以直接给出一个方向和幅值已定义的力/力矩参考，底层将其转换为关节驱动力矩。常见的雅可比转置映射是：

$$
\tau_{\mathrm{joint}}=J(q)^T w_{\mathrm{cmd}}+\tau_{\mathrm{other}},
$$

其中 $\tau_{\mathrm{other}}$ 可能包括重力、零空间或其他补偿。

**Feedforward** 的意思不是“绝对没有传感器”，而是该命令本身不靠当前输出误差实时闭环计算：策略预先给定当前应施加的力。有时还会与反馈环一起使用：

$$
u=u_{\mathrm{ff}}+u_{\mathrm{fb}}.
$$

HIL-SERL 的两个高速动态任务采用 **3 DoF feedforward wrench**，底层为 1000 Hz、上层 10 Hz；原文强调这种前馈动作在相关动态接触任务中的优势，**不等于全部精密插入都换成了前馈力控**。

### 前馈与反馈适用场景

| 类型 | 适合什么 | 不足 |
|---|---|---|
| 反馈位置/阻抗 | 插入、接触后调整、纠偏和稳定跟踪 | 受感知频率、延迟、接触模型限制 |
| 前馈 Wrench | 短时高速击打、快速加速、时间敏感的动作 | 对模型误差/扰动敏感，不宜无约束开放 |
| 前馈 + 反馈 | 预先加速同时在后续纠偏 | 需要精心处理控制频率与安全界限 |

**关键区分**：在高速运动过程中观察得少，并不等于策略学会了显式世界模型；论文的策略仍是 Model-free RL。

## 六、其他常见的机器人控制方法：一张表看全貌

| 方法 | 控制目标 | 常见用途 | 与其他方法关系 |
|---|---|---|---|
| Joint Position + PID | 关节位置误差 | 普通关节伺服 | 常在 IK 轨迹后执行 |
| Joint Velocity | 关节速度 | 移动与连续跟踪 | 外环可能用视觉伺服 |
| Joint Torque | 关节力矩 | 力矩驱动机器人 | 允许构建阻抗或动力学补偿 |
| Cartesian Position / OSC | 末端位姿 | 抓取、装配 | 通过 Jacobian / 逆动力学实现 |
| Cartesian Impedance | 末端柔顺力学响应 | 接触装配 | 可放在 OSC 动力学框架中 |
| Admittance | 外力影响目标位姿 | 人机协作、位置控制机器人 | 与 Impedance 接口方向不同 |
| Hybrid Position–Force | 某些方向管位置，另一些方向管力 | 表面擦拭、受限插入 | 需要接触约束 |
| Computed Torque | 使用动力学补偿跟踪 | 高精度关节控制 | 属于模型辅助控制 |
| MPC | 预测未来并优化有约束动作序列 | 避障、动态操作 | 优化器可以在外环 |
| IBVS / PBVS | 图像/位姿误差 | 视觉闭环定位 | 是上层反馈目标，不自动等于电机控制器 |
| Wrench Feedforward | 开环广义力参考 | 高速击打/动态操控 | 可与反馈控制叠加 |

**不要按某个方法是否“高级”来排序**。同一个机器人系统完全可能同时使用 PBVS 定目标、IK 求关节轨迹、PD 跟踪关节、碰撞检查做安全拒绝。这里的方法属于不同层级，不是相互排斥的候选。

## 七、RoboTwin 和 RoboDojo 实际提供了什么？

### RoboTwin 2.0：可明确确认关节驱动的刚度与阻尼

官方 [Control Robot](https://robotwin-platform.github.io/doc/usage/control-robot.html) 文档说明外部动作接口支持 **qpos（关节位置）**和 **ee（末端位姿）**。其 [New Embodiment](https://robotwin-platform.github.io/doc/usage/new-embodiment.html) 配置暴露 joint_stiffness / joint_damping；[源码 robot.py](https://github.com/RoboTwin-Platform/RoboTwin/blob/main/envs/robot/robot.py) 将这些参数传给 SAPIEN 关节的 set_drive_property，再通过 set_drive_target/velocity_target 跟踪参考。

这足以确定**仿真关节驱动具有类似 PD 的刚度/阻尼机制**。但外部提供 EE 目标，通常还经过运动学/规划转成底层关节驱动；**不能据此认定 RoboTwin 默认使用 HIL-SERL 的末端笛卡尔阻抗控制及 Reference Limiting**。要研究精密接触，还需专门比较控制器、力反馈、轨迹和安全拒绝。

### RoboDojo：评测接口与底层执行机制不能混同

[RoboDojo 官方仓库](https://github.com/RoboDojo-Benchmark/RoboDojo) 明确定位为 **Isaac Sim 为基础的仿真 + 真机评测基准**，含多个任务和执行器，政策集成由 XPolicyLab 管理。其提供机器人动作接口、场景配置和评测基础设施，但**不能从基准名字或支持策略部署这一点，推断所有 embodiment 使用同一种阻抗控制**。

RoboDojo/Isaac Sim 的具体刚度、阻尼、执行器驱动模型，需要**对选定机器人配置逐个核对**；本专题目前没有做全 embodiment 配置审计，不宣称“全都使用笛卡尔阻抗控制”。关于 Isaac Lab 中的 stiffness/damping 含义可参考 [官方执行器文档](https://github.com/isaac-sim/IsaacLab/blob/develop/docs/source/concepts/actuators.rst)。

## 八、读 HIL-SERL 的控制实验，应先问什么？

1. 上层策略动作到底是 delta EEF、关节目标、Twist 还是 Wrench？**同一论文不同任务可能不同。**
2. 动作在哪个坐标系定义（base、world、当前末端），有没有转换？
3. 底层如何计算关节力矩、限制刚度/误差、执行安全停机？
4. 高层频率与低层频率分别是多少；是否存在过时观测与执行延迟？
5. 评测是否报告真实接触力、失败恢复、峰值力矩、碰撞和不同初始姿态？
6. 数据回放是否混淆“计划的动作”“真正执行的动作”“达到的状态”？

## 九、资料与延伸阅读

- [HIL-SERL 原论文](https://arxiv.org/abs/2410.21845) 与 [中文深读](/research/papers/2024/hil-serl/)。
- [RLPD 独立精读](/research/papers/2023/rlpd/)：为什么高层强化学习不直接替代低层控制。
- [Stanford perls2 控制器公式](https://stanfordvl.github.io/perls2/source/controller_eqns.html)：Joint Impedance、OSC。
- [Robosuite 控制器文档](https://github.com/ARISE-Initiative/robosuite/blob/master/docs/modules/controllers.rst)：OSC_POSE、JOINT_POSITION 和 fixed/variable impedance。
- [RoboTwin 控制接口](https://robotwin-platform.github.io/doc/usage/control-robot.html) · [关节增益实现](https://github.com/RoboTwin-Platform/RoboTwin/blob/main/envs/robot/robot.py)。
- [RoboDojo 官方项目](https://github.com/RoboDojo-Benchmark/RoboDojo) · [Isaac Lab 执行器增益](https://github.com/isaac-sim/IsaacLab/blob/develop/docs/source/concepts/actuators.rst)。

**结论**：理解机器人动作最重要的不是记住术语，而是**看清目标和实测之间究竟由哪一层闭环、哪一层产生力矩、哪个模块处理接触与安全**。这也是判断一套通用 Agent 是否真的拥有可复现物理能力的前提。
