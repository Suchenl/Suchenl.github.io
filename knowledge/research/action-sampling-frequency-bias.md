---
title: "不同机器人数据集的动作采样频率，是否会引入数据集偏置？"
questionTitleEn: "Do heterogeneous robot action rates induce dataset-specific shortcuts?"
publicQuestion: true
questionDate: "2026-10-21"
questionEvidence:
  - name: "BridgeData V2"
    rate: "5 Hz"
    source: "https://bridgedata-v2.github.io/"
  - name: "FurnitureBench"
    rate: "10 Hz"
    source: "https://clvrai.github.io/furniture-bench/docs/getting_started/furniturebench_overview.html"
  - name: "DROID"
    rate: "15 Hz"
    source: "https://github.com/droid-dataset/droid/blob/main/droid/robot_env.py"
  - name: "LIBERO"
    rate: "20 Hz"
    source: "https://github.com/Lifelong-Robot-Learning/LIBERO/blob/master/scripts/libero_100_collect_demonstrations.py"
  - name: "CALVIN"
    rate: "30 Hz"
    source: "https://github.com/mees/calvin"
  - name: "Mobile ALOHA"
    rate: "目标 50 Hz"
    source: "https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/constants.py"
  - name: "AgiBot World"
    rate: "30 Hz"
    source: "https://github.com/OpenDriveLab/AgiBot-World"
  - name: "Diffusion Policy 实物 UR5"
    rate: "默认 10 Hz"
    source: "https://github.com/real-stanford/diffusion_policy/blob/main/demo_real_robot.py"
  - name: "RoboCasa"
    rate: "默认 20 Hz"
    source: "https://github.com/robocasa/robocasa/blob/main/robocasa/environments/kitchen/kitchen.py"
  - name: "PushT 仿真"
    rate: "默认 10 Hz"
    source: "https://github.com/real-stanford/diffusion_policy/blob/main/demo_pusht.py"
categories: ["机器人与具身智能", "数据混合与策略学习"]
summaryZh: "扩展核查 10 组真实或仿真机器人数据源与采集程序：官方控制/采集配置涵盖 5、10、15、20、30、目标 50 Hz。另发现 RoboTwin 的 save_freq=15 不是 15 Hz。跨源频率异构已确认，但是否直接导致 VLA 学到数据集捷径，仍需要控制变量实验。"
questionSummaryEn: "An audit of 10 real and simulated robot data sources or collection pipelines finds nominal 5, 10, 15, 20, 30, and target 50 Hz rates. RoboTwin's save_freq=15 is a frame interval, not 15 Hz. Learned dataset shortcuts remain unproven."
---

# 不同机器人数据集的动作采样频率，是否会引入数据集偏置？

> **证据更新：2026-10-21；扩展至 10 组机器人数据源/采集管线。** 本文是已公开资料的调研与个人研究问题，而非我们自己采集或训练得到的实验发现。主要核查了数据集项目页、原始采集代码、官方训练配置和论文。**结论分三层：频率不同（证实）→ 由此可能产生训练分布差异（机制上合理）→ 策略真的学到了不可迁移的“数据集身份”捷径（尚未验证）。**

## 先给结论

1. **不同数据集的控制/动作记录频率确实不同。** 在原有四个真实机器人来源之外，又核查 FurnitureBench、实物 UR5 录制、LIBERO、RoboCasa、CALVIN、PushT 仿真，合计 **10 组**，覆盖 **5、10、15、20、30、目标 50 Hz**。但这些数字各自对应的是*项目声明的控制频率、采集代码配置或目标采集速率*，不是我们重新下载全量数据后用时间戳测得的实际频率分布。
2. **同一个数据集内部的传感模态也可能不同频。** RH20T 的相机和关节状态约 10 Hz、末端位姿和六轴力/力矩 100 Hz，部分触觉 200 Hz；这与“动作频率不同”是有关但不同的问题。
3. **已有研究直接讨论了多频率训练。** Burns 等研究不同控制频率的离线 RL；2026 年 Chronos Policy 显式建模物理时间；还有 HiPolicy 面向多频率动作块。不过它们没有自动证明“某个跨数据集 VLA 已经学会 dataset shortcut”。
4. **数据采集标准化是最应该先考虑的修复。** 若能统一动作含义、执行时长、时间戳与下游控制接口，采样率引入的主要歧义可以在数据侧排除；如果混入历史异构数据，仅用插值或把元数据 FPS 设成相同数字并不足够。

## 1. 我核查到了哪些公开数据集？

下面的频率按**证据所指向的实际含义**记录，避免把相机 FPS、机器人内部伺服频率、动作记录频率、训练重采样频率混成同一个概念。

### A. 跨数据集：动作或采集控制循环确实不同

| 数据集 | 核查到的频率 | 频率含义及对应时间间隔 | 最直接的官方证据 | 核查结论 |
| --- | ---: | --- | --- | --- |
| **BridgeData V2**（WidowX 250） | **5 Hz** | 官方声明的遥操作控制频率，标称 200 ms/step | [原始项目页 · System Setup](https://bridgedata-v2.github.io/) | **明确确认** |
| **DROID**（Franka） | **15 Hz** | 采集端 RobotEnv 的 **control_hz = 15**，标称约 66.7 ms/step | [官方代码 · droid/robot_env.py](https://github.com/droid-dataset/droid/blob/main/droid/robot_env.py) | **明确确认配置值**，非全量轨迹实际间隔审计 |
| **AgiBot World**（多本体） | **30 Hz** | 作者明确称 AgiBot World 数据以 30 Hz 采集；GO-1 预训练将控制频率输入和 chunk size 设为 30，标称约 33.3 ms/step | [官方仓库 · GO-1 训练说明](https://github.com/OpenDriveLab/AgiBot-World#3-start-fine-tuning) · [配置](https://github.com/OpenDriveLab/AgiBot-World/blob/main/go1/configs/go1_base_cfg.py) | **明确确认官方声明** |
| **Mobile ALOHA**（双臂移动操作） | **目标 50 Hz** | 采集代码设 **FPS = 50, DT = 0.02**，目标 20 ms/step | [官方采集常量](https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/constants.py) · [官方录制循环](https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/record_episodes.py) | **明确确认目标值**；不能假设每条轨迹都稳定 50 Hz |

**重要限定：** Mobile ALOHA 的采集代码显式记录每步耗时、输出实际平均频率，且当所测频率过低（代码阈值为 30）时要求重新采集。因此，这一行应写“**50 Hz 目标**”，不能写成“我们测得原始所有动作都恰好 50 Hz”。DROID 的 15 Hz 同样是公开控制配置，而非本文重新统计的每条轨迹分布。

**直接证据已经足够回答最初的第一问：** 原先四个真实机器人项目的不同频率不是纯粹想象；下文还补充了六组官方来源的实物与仿真采集管线。相邻两个极端的**标称单步间隔**从 200 ms 到 20 ms，相差十倍。不过数据集频率不同并不意味着它们的每个动作标签具有可直接比较的位移或速度语义。


### A2. 扩展核查：六组新的真实/仿真数据源与采集管线

**新增的真实机器人数据源/采集程序**

| 数据来源 | 官方标称或默认值 | 数值代表什么 | 官方证据 |
| --- | ---: | --- | --- |
| **FurnitureBench**（真实 Franka 家具组装） | **10 Hz** | 视觉策略每秒 10 次输出末端**相对位姿 + 夹爪命令**。底层 OSC 的高频关节力矩控制并不是策略数据 FPS | [官方系统介绍](https://clvrai.github.io/furniture-bench/docs/getting_started/furniturebench_overview.html) · [论文](https://clvrai.github.io/furniture-bench/) |
| **Diffusion Policy 实物 UR5 示范采集** | **默认 10 Hz** | [`demo_real_robot.py`](https://github.com/real-stanford/diffusion_policy/blob/main/demo_real_robot.py) 的可调 `--frequency` 参数默认 10；用 `dt=1/frequency` 规划观测、目标位姿和未来执行时刻 | [采集循环](https://github.com/real-stanford/diffusion_policy/blob/main/demo_real_robot.py) |

**新增的仿真示范/环境（需与真实世界硬件时钟区分）**

| 数据来源 | 官方标称或默认值 | 数值代表什么 | 官方证据 |
| --- | ---: | --- | --- |
| **LIBERO**（Franka 仿真） | **20 Hz** | 原始示范采集与重放转换脚本都设 `control_freq=20`，典型 OSC 末端增量动作 | [采集脚本](https://github.com/Lifelong-Robot-Learning/LIBERO/blob/master/scripts/libero_100_collect_demonstrations.py) · [转换脚本](https://github.com/Lifelong-Robot-Learning/LIBERO/blob/master/scripts/create_dataset.py) |
| **RoboCasa**（仿真厨房） | **环境默认 20 Hz** | 环境构造器 `control_freq=20` 定义每次动作间的**仿真时间**，可修改；不是对已发布全部 HDF5 / LeRobot 数据的逐轨迹实测 | [环境源码](https://github.com/robocasa/robocasa/blob/main/robocasa/environments/kitchen/kitchen.py) · [数据文档](https://robocasa.ai/docs/build/html/use_cases/creating_datasets.html) |
| **CALVIN**（Franka 仿真） | **30 Hz** | 官方明确说明连续策略动作的 30 Hz；支持**绝对笛卡尔目标**与**相对位移**两类 action space | [官方 README · Action Space](https://github.com/mees/calvin) |
| **PushT 仿真示范**（二维推物体） | **默认 10 Hz** | 官方 `demo_pusht.py` 的 `--control_hz=10` 且以 `clock.tick(control_hz)` 调节录制循环；可修改，不能等同于实物机械臂的采集速率 | [示范采集程序](https://github.com/real-stanford/diffusion_policy/blob/main/demo_pusht.py) |

**证据等级与计数说明：** “10 组”指 **4 个先前核查的机器人数据集/项目 + 上述 6 组数据源或示范采集管线**，不是说我们已经下载十份原始轨迹并统计了真实采样间隔。RoboCasa 的数据列是*环境默认配置*，Diffusion Policy 的两个新条目是*采集程序默认值*；仿真的“每步经过 50 ms”也不保证机器会在真实墙上时钟 50 ms 内运行。经过重采样/再打包的训练版本可能采用不同动作时间尺度。

### A3. 容易被误读成数据集 Hz 的三个案例

1. **RoboTwin `save_freq=15` 不等于 15 Hz。** [官方配置教程](https://github.com/Tengbo-Yu/robotwin/blob/main/CONFIG_TUTORIAL.md)称其为保存频率，但[实际执行代码](https://github.com/RoboTwin-Platform/RoboTwin/blob/main/envs/_base_task.py)在 `take_dense_action` 中使用 **`control_idx % save_freq == 0`** 来触发 `_take_picture()`。所以这里的 **15 是每 15 个内部控制步骤保存一次观测**；没有底层步长和模拟时间信息时，绝不能直接列成“RoboTwin 数据集 15 Hz”。
2. **社区转换版 RoboMIND 的 30 FPS 不等于所有原始动作均 30 Hz。** [社区 RoboMIND → LeRobot 数据卡](https://huggingface.co/datasets/Traly/RoboMIND-lerobot)标注视频 FPS 为 30，但[官方 RoboMIND 数据卡](https://huggingface.co/datasets/x-humanoid-robomind/RoboMIND/blob/main/README.md)同时涵盖多本体，并指出模拟数据中相机与机械臂采集频率约 **1:4**。转换后视频写入帧率、原始图像记录与动作执行时间要分别审计。
3. **RT-1-X / SimplerEnv 的 3 Hz 通常表示推理/部署或模拟评测协议。** [OXE 官方 README](https://github.com/google-deepmind/open_x_embodiment)在 RT-1-X 推理说明中采用 3 Hz 假设；[SimplerEnv 评测源码](https://github.com/simpler-env/SimplerEnv/blob/main/simpler_env/evaluation/maniskill2_evaluator.py)默认 `control_freq=3`。不能反推出 OXE 的所有训练来源都以 3 Hz 采集。


### B. 数据集内部：多模态采样本来就可能不同频

[RH20T 官方 Data Details](https://rh20t.github.io/) 给出了同一数据集的分模态速率：

| RH20T 数据模态 | 官方标注频率 |
| --- | ---: |
| RGB / 深度 / 红外图像、关节角、关节力矩、夹爪宽度 | **10 Hz** |
| 夹爪笛卡尔位姿、六维力/力矩 | **100 Hz** |
| 音频 | **30 Hz**（按官网表格原样记录，不把它解释成音频原始波形采样率） |
| 指尖触觉（只在指定配置提供） | **200 Hz** |

这不是说 RH20T 的“动作策略以 200 Hz 输出”：表格只说明**特定传感或状态通道的记录速率**。真正训练时究竟如何对齐观测与目标动作，仍须查看所使用的具体数据转换流程。

[RoboMIND 官方仓库](https://github.com/x-humanoid-robomind/x-humanoid-robomind.github.io) 还说明，**模拟数据**中相机与机械臂数据的采集频率比约为 **1:4**；由于这条描述没有直接给出绝对 Hz，这里只记录比例，不把第三方目录中的“30 Hz”无条件当作全本体、全版本的统一动作频率。

### C. 必须单独标注的两个频率例子：不能误当原始数据的动作 FPS

- **GO-1 在 LIBERO 微调采用 10 Hz 参数。** AgiBot World 的[官方说明](https://github.com/OpenDriveLab/AgiBot-World)把预训练数据 30 Hz 与 LIBERO 微调 10 Hz 并列；[LIBERO 微调配置](https://github.com/OpenDriveLab/AgiBot-World/blob/main/go1/configs/go1_sft_libero.py)里也确实设置 `ctrl_freq=10`、`action_chunk_size=10`。**这是对特定数据版本与训练/评估管线的描述，不能由此推断所有原始 LIBERO、所有重打包版本均为 10 Hz。** 同名 benchmark 的控制器内部步长、已发布训练轨迹 FPS 和算法选择的动作步长要分开核对。
- **RT-1 官方展示以 3 Hz 执行动作。** [RT-1 项目页](https://robotics-transformer1.github.io/)写的是闭环**策略执行频率**；不要拿它和上表的所有**数据记录**配置直接并列，来声称每个来源都以 3 Hz 采集。

这里没有把来自聚合目录的“Open X-Embodiment = 10 Hz”当作事实：**OXE 是许多来源的聚合体，不能被概括成一个单独的统一采集频率。**

## 2. 数据格式统一，为什么仍可能有问题？

[Open X-Embodiment 原始论文 · IV-A](https://arxiv.org/html/2310.08864v9)是非常关键的证据。作者把异构数据转换成粗粒度对齐的 7 维末端动作表示，对**每个数据集分别进行动作归一化**，但明确保留了不同来源的控制坐标系，以及**绝对/相对位置或速度**等动作定义。作者指出，同样的动作向量可能在不同机器人上产生很不一样的运动。

因此需要把下列四种差异分开：

| 差异 | 举例 | 为什么普通归一化不能直接消除 |
| --- | --- | --- |
| **动作语义差异** | 末端相对位移 vs 末端速度 vs 关节绝对目标 | 数值相近不等于相同的物理命令，必须做单位与控制接口转换 |
| **物理时间差异** | 5 Hz 的一步 200 ms；50 Hz 的一步 20 ms | 仅保留第几个 token，可能丢失真实执行时间 |
| **动作块跨度差异** | 16-step chunk 在 5 Hz 为 3.2 s，在 50 Hz 为 0.32 s | 同一 chunk length 并不代表同一预见/执行时间 |
| **样本贡献差异** | 固定物理时长下，高频轨迹可能包含更多 step | **仅当训练按 step 而非按 episode / 数据源重加权抽样**时才直接导致样本数偏置 |

[Octo 的官方代码](https://github.com/octo-models/octo/blob/main/octo/data/dataset.py)还提供了很有意思的对照：它在整理输入时显式生成索引形式的 `timestep`，保存 `dataset_name`，并处理归一化/动作块；[官方推理接口](https://github.com/octo-models/octo/blob/main/octo/model/octo_model.py)允许选择对应数据集的反归一化统计。**这说明工程管线已经认真处理动作范围与来源差异；但仅从这些接口本身，还不能证明模型能理解任意两个 action steps 之间的真实物理时间。** 更不能由代码结构推断某个模型已经发生了频率捷径学习。

### 一个容易误用的公式

如果动作标签是**两次观察之间的相对位移**，且运动近似匀速，那么：

$$
\Delta p \approx v\,\Delta t,\qquad \Delta t=1/f.
$$

因此相同速度下，5 Hz 和 20 Hz 的相邻位移标签有可能相差四倍。但这一推理**不适用于把动作标签直接定义为 m/s 的速度命令**，也不必适用于“每步给定同一个绝对关节目标、由低层控制器持续追踪”的情况。

所以，真正值得审计的不是单独一个 `fps`，而是 **(数据时间戳、动作定义、命令覆盖的物理时间、控制器接口、训练重采样变换)** 这个整体契约。

## 3. 已有工作做到了哪一步？

| 工作 | 直接研究的问题 | 已有实证/方法 | 不能替它声称的事情 |
| --- | --- | --- | --- |
| **[Burns et al., Offline Reinforcement Learning at Multiple Frequencies](https://proceedings.mlr.press/v205/burns23a.html)**（CoRL 2022，PMLR 2023） | 不同控制频率的离线 RL 数据混合 | 指出 Q 值传播速率随时间离散化不同；按步长调整 N-step return，在三个模拟机器人任务中比直接混合更稳、更好 | 不能推出 VLA 的 BC loss 或模型确实学了“数据集 ID” |
| **[Chronos Policy: Learning Robot Policies on Physical Time](https://arxiv.org/abs/2610.13929)**（2026-10） | 物理时刻与 token 顺序不一致；多率传感、延迟与动作执行时序 | 给观测采集时刻和动作执行时刻编码，采用 time-aware RoPE / 时间随机化；在动态与多模态任务中验证时序鲁棒性 | 不应把其“多率鲁棒”直接解释为已消除所有跨数据集的 dataset shortcut |
| **[HiPolicy: Hierarchical Multi-Frequency Action Chunking for Policy Learning](https://arxiv.org/abs/2604.06067)**（2026-04） | 固定动作块频率难同时满足长时规划和精细反馈 | 多频率 action chunk 的联合建模和自适应执行 | 核心不是多数据集采样协议造成的身份偏置 |
| **[GO-1 / AgiBot World 官方代码](https://github.com/OpenDriveLab/AgiBot-World)** | 不同预训练/微调数据的时间尺度 | 训练配置明确区分 30 Hz 与 10 Hz，部署输入也包含 `ctrl_freqs` | 不能当作“统一频率无必要”或者其去偏效果已完成消融 |

从学术定位看，**“多频率数据给学习带来困难”已经是有人提出并解决过一部分的研究问题**。如果要形成新的主张，必须明确超越已有工作所解决的时间尺度、异步感知和价值传播问题。

## 4. “采集时统一频率，这个问题就不存在了”对吗？

**在受控的新数据采集体系中，很大程度上是对的。** 如果相同动作语义、控制器实际执行时长、观测时间戳、同步策略、训练/部署目标时间尺度都被固定，混用不同*标称控制频率*所导致的额外歧义可以直接避免。此时无需硬把数据工程问题升级成模型论文。

但现实的数据混合通常遇到三个边界：

1. **历史数据不能重采**。5 Hz 轨迹通过插值生成 50 Hz 的“动作/图像”，并不能恢复缺失的接触与反馈；把 50 Hz 降为 5 Hz 则可能丢失控制关键事件。
2. **相机与机器人控制本来可能不同频**。RH20T 和 RoboMIND 的官方材料已经提供了实例。仅统一相机 FPS 或仅重打包 LeRobot 并不证明动作时间语义已统一。
3. **同频也有不同动作空间**。例如速度命令与绝对目标之间的区别，或者视觉采集到动作执行的延迟，都不是“都改成 10 Hz”就自然消失的。

[LeRobot 官方数据格式](https://github.com/huggingface/lerobot/blob/main/docs/source/lerobot-dataset-v3.mdx)包含 `meta/info.json` 的 FPS、逐样本 `timestamp` 与分 episode 索引；[实现](https://github.com/huggingface/lerobot/blob/main/src/lerobot/datasets/lerobot_dataset.py)还定义时间戳与名义 FPS 一致性的容差检查。**所以调查数据侧首先应计算真实的 Δt 分布，而不是相信某个文件名中的 10Hz 或 30Hz。**

## 5. 下一步应当怎样验证？按最省成本的顺序

### E0：不训练任何模型，先做公开数据契约审计

对每个拟混入的数据源，提取并审计：

| 字段 | 需要确认 |
| --- | --- |
| `source / revision / episode` | 来源、版本、轨迹标识，防止跨版本混淆 |
| `declared_fps` 与 `timestamp` | 标称频率与实测相邻时间间隔分布（median、p5/p95、掉帧/重复率） |
| `action_type / units / frame` | 绝对目标、相对增量、速度等；位置单位、坐标系 |
| `target_duration / delay` | 每个动作保持多久、何时生效，是否可观测 |
| `camera_time / robot_time` | 视觉、状态、触觉是否同步，有无独立时钟 |
| `chunk_horizon_seconds` | K 个动作覆盖的**真实秒数**，不是只记录 K |
| `sampling_weight` | 按 dataset、episode 还是 timestep 采样，是否高频数据被重复加权 |

**审计判据**：至少找到两个真实数据源，即使统一了动作单位和坐标，仍呈现不一致的物理时间跨度；并确定这些差异有没有已被训练转换器重采样、重标或显式标注。**本文尚未完成原始轨迹级的全量审计；前面的表是项目声明与源码配置核验。**

### E1：同源轨迹的反事实频率消融（先不要跨不同机器人混杂）

从**同一机器人、同一批原始高频轨迹**构造 50/25/10 Hz 等版本（只允许降低原始采样率，不虚构高频中间反馈），保持任务、轨迹总物理时长、训练帧预算和训练/验证划分一致。分别尝试：

- **Baseline A：** 原始混频 step 序列、固定 K-step chunk，且不提供 Δt；
- **Baseline B：** 重采样到统一物理时间间隔，**重标每个动作所对应的时间窗口**，不仅仅复制/丢弃帧；
- **Baseline C：** 允许多频率，但输入 Δt 和动作目标执行时间，并与 Chronos 类时间感知机制对照；
- **Baseline D：** 在相同数据下只更改 episode-balanced / time-balanced sampling，隔离高频数据权重因素。

不要只比较单步 BC loss：必须评估**闭环任务成功率、动作速度/幅度、接触事件遗漏、时延敏感性、未见频率下的迁移**。对每一条轨迹按 episode 分组划分训练/验证，不能让同一条高频轨迹的两个重采样版本分别泄露到训练和测试。

### E2：何时可以说“学到了数据集偏置”？

一个分类器能从动作大小预测数据集来源，**只说明可区分**，不说明策略依赖这种捷径。更强的证据是：当任务、观测与物理状态基本不变，仅改变动作表示中的频率/时间元信息，模型出现系统性动作尺度偏移、闭环退化；且这些效应**不能由机器人本体、控制器、任务分布或采样权重解释**。

若统一时间跨度与动作定义后性能已恢复，最合理的结论应是**数据标准化问题**。若残余退化稳定存在，再讨论时间感知策略方法是否带来超出前人工作的独立收益。

## 6. 证据审计和个人判断

| 主张 | 当前证据等级 |
| --- | --- |
| 已核查 10 组真实/仿真数据源及采集管线的标称/默认值涵盖 5/10/15/20/30/目标50 Hz | **已核实官方项目或代码；尚非逐帧实测** |
| RoboTwin 的 save_freq=15 是存储步长；RoboMIND 转换版视频 FPS 不必等于原始动作频率 | **源码/数据卡直接交叉核对** |
| 同一数据集内的不同模态记录频率可能差别很大（RH20T、RoboMIND 模拟数据） | **已核实官方来源** |
| 仅做统一数据格式或动作数值归一化，不保证控制与物理时间语义完全一致 | **论文明确说明 + 机制分析** |
| 多频率混合在离线 RL 中确实带来优化困难，并有现有解决方案 | **已有相关论文实验** |
| 某个具体跨数据集 VLA 因为 Hz 差异而记住来源身份、损害真实闭环任务成功率 | **目前尚无本文直接核实的受控实证** |
| 采集时统一时钟、动作语义和执行时长能否完全解决所有跨源泛化问题 | **不能；其它异质性仍在** |

**当前判断**：你提出的前半句有坚实的现实基础——公开机器人数据集确实异构，且有些连同一数据集的多模态频率都不一致。后半句（“模型学到的是数据集偏置”）仍然是需要设计实验的假设。**先规范数据采集、转换与时间戳；只有这些手段不足以解决闭环泛化时，才值得研究额外的时间感知模型。**

### 主要原始证据入口

- BridgeData V2：[官网 System Setup](https://bridgedata-v2.github.io/)。
- DROID：[官方采集代码 `RobotEnv.control_hz`](https://github.com/droid-dataset/droid/blob/main/droid/robot_env.py)。
- AgiBot World：[官方 GO-1 使用说明](https://github.com/OpenDriveLab/AgiBot-World)和[预训练频率默认配置](https://github.com/OpenDriveLab/AgiBot-World/blob/main/go1/configs/go1_base_cfg.py)。
- Mobile ALOHA：[官方采集常量](https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/constants.py)、[含执行耗时记录的采集循环](https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/record_episodes.py)。
- FurnitureBench：[官方策略频率说明](https://clvrai.github.io/furniture-bench/docs/getting_started/furniturebench_overview.html)。
- Diffusion Policy：[实物录制程序](https://github.com/real-stanford/diffusion_policy/blob/main/demo_real_robot.py) · [PushT 仿真录制程序](https://github.com/real-stanford/diffusion_policy/blob/main/demo_pusht.py)。
- LIBERO：[官方示范采集](https://github.com/Lifelong-Robot-Learning/LIBERO/blob/master/scripts/libero_100_collect_demonstrations.py)。
- RoboCasa：[官方环境控制频率源码](https://github.com/robocasa/robocasa/blob/main/robocasa/environments/kitchen/kitchen.py)。
- CALVIN：[官方 30 Hz 动作空间](https://github.com/mees/calvin)。
- RoboTwin：[采集存储频率的真正代码语义](https://github.com/RoboTwin-Platform/RoboTwin/blob/main/envs/_base_task.py)。
- RH20T：[官网多模态频率表](https://rh20t.github.io/)。
- RoboMIND：[官方数据仓库的模态采集说明](https://github.com/x-humanoid-robomind/x-humanoid-robomind.github.io)。
- OXE：[原论文 IV-A 数据对齐与动作语义](https://arxiv.org/html/2310.08864v9)。
- Octo：[训练数据处理代码](https://github.com/octo-models/octo/blob/main/octo/data/dataset.py)及[分数据集反归一化接口](https://github.com/octo-models/octo/blob/main/octo/model/octo_model.py)。
- LeRobot：[官方数据格式](https://github.com/huggingface/lerobot/blob/main/docs/source/lerobot-dataset-v3.mdx)。
- 直接相关研究：[Burns et al.](https://proceedings.mlr.press/v205/burns23a.html) · [Chronos Policy](https://arxiv.org/abs/2610.13929) · [HiPolicy](https://arxiv.org/abs/2604.06067)。
