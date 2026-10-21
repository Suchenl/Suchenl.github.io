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
summaryZh: "核查 10 组真实或仿真机器人数据源与采集程序：官方控制/采集配置涵盖 5、10、15、20、30、目标 50 Hz。另发现 RoboTwin 的 save_freq=15 不是 15 Hz。跨源频率异构已确认，但是否直接导致 VLA 学到数据集捷径，仍需要控制变量实验。"
questionSummaryEn: "An audit of 10 real and simulated robot data sources or collection pipelines finds nominal 5, 10, 15, 20, 30, and target 50 Hz rates. RoboTwin's save_freq=15 is a frame interval, not 15 Hz. Learned dataset shortcuts remain unproven."
---

# 不同机器人数据集的动作采样频率，是否会引入数据集偏置？

> **资料核查日期：2026-10-21。** 本文是已公开资料的调研与个人研究问题，而非我们自己采集或训练得到的实验发现。主要核查了数据集项目页、原始采集代码、官方训练配置和论文。**结论分三层：频率不同（证实）→ 由此可能产生训练分布差异（机制上合理）→ 策略真的学到了不可迁移的“数据集身份”捷径（尚未验证）。**

## 先给结论

1. **不同数据集和采集管线的控制/动作时间尺度确实不同。** 对照 **10 组**真实机器人、仿真环境与录制程序，官方标称/默认设置覆盖 **5、10、15、20、30、目标 50 Hz**。这些数字对应项目声明、控制配置或目标采集速率，不是逐轨迹实测分布。
2. **同一个数据集内部的传感模态也可能不同频。** RH20T 的相机和关节状态约 10 Hz、末端位姿和六轴力/力矩 100 Hz，部分触觉 200 Hz；这与“动作频率不同”是有关但不同的问题。
3. **已有研究直接讨论了多频率训练。** Burns 等研究不同控制频率的离线 RL；2026 年 Chronos Policy 显式建模物理时间；还有 HiPolicy 面向多频率动作块。不过它们没有自动证明“某个跨数据集 VLA 已经学会 dataset shortcut”。
4. **数据采集标准化是最应该先考虑的修复。** 若能统一动作含义、执行时长、时间戳与下游控制接口，采样率引入的主要歧义可以在数据侧排除；如果混入历史异构数据，仅用插值或把元数据 FPS 设成相同数字并不足够。

## 1. 数据集的采样与控制频率：官方证据对照

以下 10 组覆盖**真实机器人数据集、示范采集程序和仿真任务**。采用同一张表是为了便于比较；“5 Hz”“默认 10 Hz”“目标 50 Hz”并不是同一种证据，必须连同**对象、动作语义和时间基准**一起看。所有数值来自项目说明或源码配置，**并非下载各数据集后对每条轨迹时间戳的实测统计**。

### 1.1 十组数据源与控制时间尺度

| 数据集 / 采集管线 | 场景 | 官方频率 / 配置 | 具体代表什么 | 一手证据 |
| --- | --- | ---: | --- | --- |
| **BridgeData V2**（WidowX 250） | 真实机器人 | **5 Hz** | 遥操作控制频率，标称每步 **200 ms** | [项目页 · System Setup](https://bridgedata-v2.github.io/) |
| **FurnitureBench**（Franka 家具组装） | 真实机器人 | **10 Hz** | 策略输出末端相对位姿与夹爪命令的频率；不同于底层更高频的力矩控制 | [官方系统说明](https://clvrai.github.io/furniture-bench/docs/getting_started/furniturebench_overview.html) |
| **Diffusion Policy 实物 UR5** | 真实采集程序 | **默认 10 Hz** | 录制脚本可调的 `--frequency` 参数；决定观测与目标执行的安排，不保证所有公开轨迹均如此 | [`demo_real_robot.py`](https://github.com/real-stanford/diffusion_policy/blob/main/demo_real_robot.py) |
| **DROID**（Franka） | 真实机器人 | **15 Hz** | RobotEnv 中 `control_hz=15` 的采集端控制配置，标称每步约 **66.7 ms** | [`droid/robot_env.py`](https://github.com/droid-dataset/droid/blob/main/droid/robot_env.py) |
| **LIBERO**（Franka） | 仿真示范 | **20 Hz** | 原始示范采集和重放转换脚本均采用 `control_freq=20`；不代表所有二次加工版本都保持此配置 | [采集脚本](https://github.com/Lifelong-Robot-Learning/LIBERO/blob/master/scripts/libero_100_collect_demonstrations.py) · [转换脚本](https://github.com/Lifelong-Robot-Learning/LIBERO/blob/master/scripts/create_dataset.py) |
| **RoboCasa**（厨房） | 仿真环境 | **默认 20 Hz** | 环境构造器的 `control_freq=20`，描述**仿真时间**中的动作间隔；可配置 | [`kitchen.py`](https://github.com/robocasa/robocasa/blob/main/robocasa/environments/kitchen/kitchen.py) |
| **CALVIN**（Franka） | 仿真基准 | **30 Hz** | 官方声明的连续动作控制频率，支持绝对末端目标或相对末端位移 | [官方 README · Action Space](https://github.com/mees/calvin) |
| **AgiBot World**（多本体） | 真实机器人数据 / 训练管线 | **30 Hz** | 官方说明数据按 30 Hz 采集；GO-1 预训练默认 `ctrl_freq=30`，不能推定所有再处理版本同频 | [官方仓库](https://github.com/OpenDriveLab/AgiBot-World) · [GO-1 默认配置](https://github.com/OpenDriveLab/AgiBot-World/blob/main/go1/configs/go1_base_cfg.py) |
| **Mobile ALOHA**（移动双臂） | 真实机器人 | **目标 50 Hz** | 录制代码设 `FPS=50`、`DT=0.02`；并记录实际循环耗时。**50 Hz 是目标而非每段轨迹的实测保证** | [常量](https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/constants.py) · [录制循环](https://github.com/MarkFzp/mobile-aloha/blob/main/aloha_scripts/record_episodes.py) |
| **PushT**（二维推物体） | 仿真示范 | **默认 10 Hz** | 官方 `demo_pusht.py` 的可调 `--control_hz=10`，控制录制循环，不等同于实物机械臂速率 | [`demo_pusht.py`](https://github.com/real-stanford/diffusion_policy/blob/main/demo_pusht.py) |

这 10 组配置覆盖了 **5、10、15、20、30、目标 50 Hz** 六种典型时间尺度。以标称间隔比较，5 Hz 的单步 **200 ms** 与 50 Hz 的 **20 ms** 相差十倍；**但只有动作标签都指相同类型的物理量、覆盖相同定义的执行窗口时，才可以直接比较动作尺度**。记录频率、策略推理频率、低层伺服频率和相机帧率不能互换。

具体限制包括：Mobile ALOHA 会检测每步实际执行耗时、频率过低时要求重录；DROID 的 15 Hz 是程序配置而非逐轨迹计量；RoboCasa / PushT 的默认值可以修改；仿真时间步并不要求与真实墙上时钟一一对应。**实际训练使用的任何重采样版本，都需要重新检查对应的数据文件与转换代码。**

### 1.2 同一数据集内部也可能不同步

[RH20T 官方 Data Details](https://rh20t.github.io/)列出了不同模态的记录频率：

| RH20T 模态 | 官方标注频率 |
| --- | ---: |
| RGB / 深度 / 红外图像、关节角、关节力矩、夹爪宽度 | **10 Hz** |
| 末端笛卡尔位姿、六维力/力矩 | **100 Hz** |
| 音频 | **30 Hz**（沿用官网表格，**不**解释为原始音频波形采样率） |
| 指尖触觉（特定配置） | **200 Hz** |

这些是**传感与状态通道**的记录频率，而不是“策略以 200 Hz 输出动作”。[RoboMIND 官方数据说明](https://github.com/x-humanoid-robomind/x-humanoid-robomind.github.io)则指出，其仿真数据中相机与机械臂采集频率约为 **1:4**，但没有足够依据把该比例换算成所有本体通用的绝对 Hz。

因此，混合数据时需要分别回答两问：**不同数据源的动作步长是否一致？单个数据源内部观测与动作是否时间对齐？** 这是两个相关但不同的偏置来源。

### 1.3 不能直接当作原始动作采样率的配置

| 案例 | 容易误读的数字 | 真实含义与判断依据 |
| --- | --- | --- |
| **RoboTwin** | `save_freq=15` | 不是 **15 Hz**。[实际 `take_dense_action` 代码](https://github.com/RoboTwin-Platform/RoboTwin/blob/main/envs/_base_task.py)按 `control_idx % save_freq == 0` 保存图像，表示**每 15 个内部控制步骤存一次观测**；要知道 Hz 还需仿真时间步。 |
| **RoboMIND 社区 LeRobot 转换版** | 视频 `FPS=30` | [转换版数据卡](https://huggingface.co/datasets/Traly/RoboMIND-lerobot)的写入帧率不等于各原始本体的动作采集率；需对照[原始数据卡](https://huggingface.co/datasets/x-humanoid-robomind/RoboMIND/blob/main/README.md)及时间戳。 |
| **GO-1 在 LIBERO 微调** | `ctrl_freq=10`、`action_chunk_size=10` | [微调配置](https://github.com/OpenDriveLab/AgiBot-World/blob/main/go1/configs/go1_sft_libero.py)对应特定训练/评测管线，不应覆盖上表**原始 LIBERO 示范采集 20 Hz** 的事实。 |
| **RT-1 / RT-1-X / SimplerEnv** | **3 Hz** | [RT-1 项目页](https://robotics-transformer1.github.io/)、[OXE 推理说明](https://github.com/google-deepmind/open_x_embodiment)与[评测配置](https://github.com/simpler-env/SimplerEnv/blob/main/simpler_env/evaluation/maniskill2_evaluator.py)涉及**策略执行或评测频率**，不能外推为全体训练轨迹的原始采集率。 |
| **Open X-Embodiment (OXE)** | “统一 10 Hz” | OXE 是多数据集集合，来源及动作空间不一；没有依据给整个集合标一个通用的原始动作采集率。见[原论文](https://arxiv.org/html/2310.08864v9)。 |

**比较这些资料的正确方法**：优先追溯同一具体数据版本的 `timestamp`、`action` 语义、环境 `control_freq`、低层控制器与模型实际消费的 action chunk 时长。单看 `FPS` 或变量名 `save_freq` 不够。

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

## 6. 证据等级与个人判断

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
