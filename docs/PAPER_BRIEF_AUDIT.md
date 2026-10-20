# Publications 简介证据检查（2026-10-20）

本文件只说明 **网站对外展示的简明介绍** 已核对到什么证据层级，并不代表完整的论文审稿、原始实验复现或医学临床认可。

## 统一写作原则

- 论文卡片的 `动机 / 核心方法 / 主要发现 / 局限与边界` 从 `web/src/data.ts` 的 `brief` 读取。
- `briefSource` 是已核对的原始公开来源，页面展开后直接显示。修改摘要前先对照其来源；原文未明确的机制、实验数字和比较结论不要编造。
- 「主要发现」描述 **作者在相应基准上报告的结果**，而非独立复现或新环境下的性能保证。
- 对医疗分类只陈述离线基准结果，不能声称临床部署有效。
- 对研究数据分析只陈述相应公开日期的快照，不推导尚未公开的审稿结果。
- 这些来源主要是出版方/预印本的 **摘要与公开分析页面**。完整论文的实验表格、消融设置、伦理声明与补充材料尚需按需逐页核对。

## 六项成果来源和核对范围

| 成果 | 原始公开依据 | 摘要核对要点 | 需避免的推断 |
|---|---|---|---|
| LAMIC · AAAI 2026 | [AAAI 官方论文页](https://ojs.aaai.org/index.php/AAAI/article/view/37311) | MMDiT 的免训练多参考扩展，GIA 和 RMA，作者报告身份、布局、背景等指标 | 未见模型与任意场景的泛化 |
| Flow of Truth · arXiv | [arXiv 2604.15003](https://arxiv.org/abs/2604.15003) | 可学习取证模板与模板引导运动，公开及商用 I2V 模型评估 | 对一切新型 I2V 生成器均有效 |
| TAG-WM · ICCV 2025 | [ICCV Open Access](https://openaccess.thecvf.com/content/ICCV2025/html/Chen_TAG-WM_Tamper-Aware_Generative_Image_Watermarking_via_Diffusion_Inversion_Sensitivity_ICCV_2025_paper.html) | DMJS、WLR、DVRD、TAD 模块；鲁棒性、定位与质量的作者报告 | 抵御任意编辑攻击 / 对所有水印威胁模型成立 |
| ICLR 2027 投稿分析 | [公开研究页面与 2026-10-08 快照](https://suchenl.github.io/iclr2027/) | 43,013 条投稿，主题/相似性分析的公开描述性结果 | 预测最终录用率或从标题断言论文由 AI 生成 |
| DAFFNet · BSPC 2025 | [ScienceDirect 出版摘要](https://www.sciencedirect.com/science/article/pii/S1746809425002101) | 双分支注意力、形态特征提取，六个公开白细胞图像数据集 | 可以替代临床血液病诊断 |
| 高光谱肾小球病分类 · CMPB 2024 | [PubMed 38964248](https://pubmed.ncbi.nlm.nih.gov/38964248/) | 高光谱空间/光谱结合的 CVT；作者报告 94% 平均准确率，光谱单特征对照 85.24% | 多中心医疗验证或普遍临床无创检测 |

## 内容审校与工作流

1. 新增论文先填可核查的 `url` 与 `briefSource`。没有核验的简介字段不要随意填。
2. 中文、英文两个版本必须表达相同的指标口径和局限范围。
3. 不将预印本写成正式录用；`releasedYear` 属于对外公开年份，不是作者个人项目起始时间。
4. `web/scripts/check-site.mjs` 验证六篇现有论文都具有来源入口；新论文加入后应同步调整这项检查为动态总数。
5. 如作者提供正式发表版本、完整实验数据或勘误，以更新后的原始来源为准，并记录改动和原因。
