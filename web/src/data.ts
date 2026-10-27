export interface Paper {
  venue: string;
  image?: string;
  thumbnail?: string; // Explicitly available thumbnail; otherwise use the full image.
  imageAlt?: { zh: string; en: string };
  titleZh: string;
  titleEn: string;
  url: string;
  authorsHtml: string;
  code?: string; // GitHub repo, e.g. "Suchenl/LAMIC"
  projectPage?: string; // public project website
  dataset?: string; // public benchmark dataset
  releasedYear?: number; // Public release/publication year, not research start date
  briefSource?: { url: string; labelZh: string; labelEn: string }; // Auditable source of the short description
  brief?: { takeawayZh:string; takeawayEn:string; motivationZh:string; motivationEn:string; methodZh:string; methodEn:string; resultZh:string; resultEn:string; boundaryZh:string; boundaryEn:string };
}

export interface PubGroup {
  zh: string;
  en: string;
  papers: Paper[];
}

const ME = "<strong><em>Yuzhuo Chen</em></strong>";

export const PUB_GROUPS: PubGroup[] = [
  {
    zh: '生成式 AI 与图像/视频生成',
    en: 'Generative AI · Image & Video Generation',
    papers: [
      {
        venue: 'Preprint',
        image: '/images/frameworks/VMem-Bench.png',
        thumbnail: '/images/frameworks/VMem-Bench-thumb.jpg',
        imageAlt: {
          zh: 'VMem-Bench teaser：相关的过去不一定适用于当前故事，展示三种视觉记忆失败案例。',
          en: 'VMem-Bench teaser: a relevant past can be wrong for the present, showing three visual-memory failure cases.',
        },
        titleZh: '更多记忆，视频就更好吗？长视频生成中视觉记忆的受控研究',
        titleEn: 'More Memory, Better Videos? A Controlled Study of Visual Memory in Long-Video Generation',
        url: 'https://arxiv.org/abs/2610.35001',
        authorsHtml: `${ME}, Huafeng Shi, Xinyu Wang, Yulong Xu, Yucheng Wang, Haoqin Hong, Guoxin Zhang, Zehua Ma, Weiming Zhang`,
        code: 'Suchenl/VMem-Bench',
        projectPage: 'https://suchenl.github.io/VMem-Bench/',
        dataset: 'https://huggingface.co/datasets/Suchenl/VMem-Bench',
        releasedYear: 2026,
        briefSource: { url: 'https://arxiv.org/abs/2610.35001', labelZh: 'arXiv 预印本摘要（2026-10-26）', labelEn: 'arXiv preprint abstract (Oct 26, 2026)' },
        brief: {
          takeawayZh: '历史记忆让角色更容易重现，也可能把已经离场的人物或过时的外观带回故事：记住过去，不等于理解现在。',
          takeawayEn: 'Retrieving visual history can restore characters but also revive departed entities or outdated appearances. Remembering the past is not the same as respecting the present.',
          motivationZh: '长视频生成经常检索旧画面维持角色一致性。但角色可能已经换装、道具已经消失，甚至有人物已离场；这时一张“历史上正确”的参考图，反而可能使当前镜头出错。',
          motivationEn: 'Long-video generators retrieve earlier frames to keep characters consistent. But when an outfit changes, a prop disappears, or a character leaves the story, a historically accurate reference may actively conflict with the current scene.',
          methodZh: '用两个互补的评测环节拆开验证：Track-A 在 92 部真实电影的 16,548 个片段中，只评估记忆选中了什么；Track-B 在 30 个故事的 2,824 个生成片段上，固定视频生成器，对比四种检索策略、无记忆和知情的 Last-seen 对照。',
          methodEn: 'Two complementary tracks separate selection from generation. Track-A scores retrieved evidence over 16,548 segments from 92 films; Track-B fixes the generator and compares four retrieval methods with no-memory and privileged last-seen controls across 2,824 generated segments from 30 stories.',
          resultZh: '在 Track-B 的受控条件下，实体召回率从 0.559 升至 0.628–0.693，但精确率从 0.977 降至 0.915–0.938，禁入实体规避率从 0.968 降至 0.845–0.898。论文还发现，部分长间隔重现其实来自提示词本身的信息，而不一定是记忆的功劳。',
          resultEn: 'In Track-B, recall rises from 0.559 to 0.628–0.693, while precision falls from 0.977 to 0.915–0.938 and forbidden-entity avoidance from 0.968 to 0.845–0.898. Some long-gap reappearances can also be explained by details already present in the prompt.',
          boundaryZh: '重点不是证明“记忆有害”，而是区分历史外观相似度与当前故事正确性。生成实验采用固定后端、特定故事与记忆策略；Track-A 和 Track-B 不是同一批样本，结论不应被理解为普适的记忆容量定律。',
          boundaryEn: 'The lesson is to distinguish fidelity to earlier appearances from correctness now—not that memory is inherently harmful. Generation uses selected stories, policies, and a shared backend; the two tracks contain different instances and do not establish a universal scaling law.',
        },
      },
      {
        venue: 'AAAI 2026',
        image: '/images/frameworks/LAMIC.png',
        thumbnail: '/images/frameworks/LAMIC-thumb.jpg',
        titleZh: 'LAMIC：基于多模态扩散 Transformer 可扩展性的布局感知多图合成',
        titleEn:
          'LAMIC: Layout-Aware Multi-Image Composition via Scalability of Multimodal Diffusion Transformer',
        url: 'https://arxiv.org/pdf/2508.00477',
        authorsHtml: `${ME}, Zehua Ma, Jianhua Wang, Kai Kang, Shunyu Yao, Weiming Zhang`,
        code: 'Suchenl/LAMIC',

        releasedYear: 2026,
        briefSource: { url: "https://ojs.aaai.org/index.php/AAAI/article/view/37311", labelZh: "AAAI 2026 官方摘要", labelEn: "AAAI 2026 proceedings abstract" },
        brief: {
          takeawayZh: '不额外训练生成模型，通过隔离多个参考主体、再按指定区域调制注意力，实现多主体可控合成。',
          takeawayEn: 'Composes multiple reference subjects into a specified layout without retraining the generator, using isolated reference attention and region-aware guidance.',
          motivationZh: '把几张参考图里的不同人物或物体合到一张图里，不只是“多给几张图片”：模型容易混淆主体身份，也难严格控制每个主体应该出现的位置和区域。',
          motivationEn: 'Combining several subjects from separate reference images introduces two problems: their identities can become entangled, and their positions can drift away from the intended layout.',
          methodZh: '在 MMDiT 扩散模型上直接改造推理阶段的注意力：Group Isolation Attention（GIA）隔离不同参考主体的信息；Region-Modulated Attention（RMA）利用布局区域约束主体生成。两者均为即插即用设计，无需微调模型参数。',
          methodEn: 'LAMIC modifies attention at MMDiT inference time: Group Isolation Attention (GIA) separates the information associated with different reference subjects, while Region-Modulated Attention (RMA) steers each subject toward its designated spatial region. No parameter fine-tuning is required.',
          resultZh: '论文在多参考合成对比中报告：身份相似度（ID-S）、背景相似度（BG-S）、布局包含率（IN-R）及综合分数（AVG）均优于比较基线；复杂场景的 DPG 提示词遵循指标也达到最佳。另设计 IN-R、FI-R、BG-S 辅助评估布局与背景。',
          resultEn: 'Across the reported multi-reference comparisons, LAMIC leads in identity similarity (ID-S), background similarity (BG-S), inclusion ratio (IN-R), and aggregate scores, and achieves the best DPG score for complex composition. It also introduces IN-R, FI-R, and BG-S to evaluate layout and background behavior.',
          boundaryZh: '这是在所测试 MMDiT 模型、参考数量与布局条件下成立的零训练扩展；结果不能自动推广到任意扩散架构，也不意味着所有遮挡、尺度变化与主体交互都已解决。',
          boundaryEn: 'The results concern the tested MMDiT backbones, reference settings, and layouts. They do not establish the same behavior for every diffusion architecture or solve arbitrary occlusion, scaling, and interaction cases.',
        },      },
    ],
  },
  {
    zh: 'AI 安全与信息隐藏',
    en: 'AI Safety & Information Hiding',
    papers: [
      {
        venue: 'Preprint',
        image: '/images/frameworks/FlowOfTruth.png',
        thumbnail: '/images/frameworks/FlowOfTruth-thumb.jpg',
        titleZh: 'Flow of Truth：面向图像到视频生成的主动式时序取证',
        titleEn: 'Flow of Truth: Proactive Temporal Forensics for Image-to-Video Generation',
        url: 'https://arxiv.org/abs/2604.15003',
        authorsHtml: `${ME}, Zehua Ma, Han Fang, Hengyi Wang, Guanjie Wang, Weiming Zhang`,

        releasedYear: 2026,
        briefSource: { url: "https://arxiv.org/abs/2604.15003", labelZh: "arXiv 预印本摘要", labelEn: "arXiv preprint abstract" },
        brief: {
          takeawayZh: '图生视频后，原图的取证痕迹会跟着内容运动和形变；这项工作让取证信号沿时间演化，而非只在单帧里找痕迹。',
          takeawayEn: 'Forensic traces move and deform during image-to-video generation. This work follows their temporal evolution instead of treating every frame as a static image.',
          motivationZh: '传统图像取证更擅长定位一张图里哪里被改过；但图生视频会使原始像素的位置、形状与内容连续变化，固定在原图坐标上的取证线索很容易失去对应关系。',
          motivationEn: 'Static-image forensics ask where an image was edited. Image-to-video synthesis instead moves, reshapes, and re-synthesizes the initial content over time, so evidence tied to the first frame\'s coordinates can become misaligned.',
          methodZh: '将图生视频重新理解为随时间演化的像素运动：先构造可学习的取证模板，再利用模板引导的运动模块追踪线索如何移动，并将运动变化与图像内容解耦，形成主动式时序取证框架。',
          methodEn: 'The framework models image-to-video generation through evolving pixel motion. It embeds a learnable forensic template and uses a template-guided motion module to follow the trace while disentangling motion from visual content.',
          resultZh: '论文在开源与商业图生视频模型上测试时间维度的取证效果，报告相较所比较方案更好的时序追踪表现。核心贡献是把取证目标从“单帧位置是否一致”推进到“证据在整个视频中如何传播”。',
          resultEn: 'Experiments on open-source and commercial image-to-video systems report improved temporal forensic tracing relative to the evaluated baselines. The key distinction is following how evidence propagates through video, not only where it appears in one frame.',
          boundaryZh: '这里研究的是受特定主动取证信号保护的图生视频流程，不等于无需水印就能判断所有视频真伪；效果仍受生成模型、运动强度及追踪机制影响。',
          boundaryEn: 'This is proactive forensics with a designed signal, not a universal detector of whether any unmarked video is real. Its reliability still depends on the tested generators, motion conditions, and trace recovery.',
        },      },
      {
        venue: 'ICCV 2025',
        image: '/images/frameworks/TAG-WM.png',
        thumbnail: '/images/frameworks/TAG-WM-thumb.jpg',
        titleZh: 'TAG-WM：基于扩散反演敏感性的篡改感知生成图像水印',
        titleEn:
          'TAG-WM: Tamper-Aware Generative Image Watermarking via Diffusion Inversion Sensitivity',
        url: 'https://openaccess.thecvf.com/content/ICCV2025/html/Chen_TAG-WM_Tamper-Aware_Generative_Image_Watermarking_via_Diffusion_Inversion_Sensitivity_ICCV_2025_paper.html',
        authorsHtml: `${ME}, Zehua Ma, Han Fang, Weiming Zhang, Nenghai Yu`,
        code: 'Suchenl/TAG-WM',

        releasedYear: 2025,
        briefSource: { url: "https://openaccess.thecvf.com/content/ICCV2025/html/Chen_TAG-WM_Tamper-Aware_Generative_Image_Watermarking_via_Diffusion_Inversion_Sensitivity_ICCV_2025_paper.html", labelZh: "ICCV 2025 官方摘要", labelEn: "ICCV 2025 open-access abstract" },
        brief: {
          takeawayZh: '把“证明图片来源”和“指出图片被改了哪里”放进同一套生成水印中，并利用扩散反演定位篡改区域。',
          takeawayEn: 'Unifies provenance verification and tamper localization in a generative watermark, using diffusion inversion to reveal altered regions.',
          motivationZh: '生成图像的版权水印通常追求修改后仍能识别，但篡改定位需要对局部编辑敏感：既要稳健保存来源信息，又要指出哪些区域被改过，这两种要求存在张力。',
          motivationEn: 'A provenance watermark must survive common distortions, whereas a localization signal should react to malicious local edits. Generative watermarking needs both properties without visibly degrading the image.',
          methodZh: 'TAG-WM 用双水印联合采样（DMJS）在扩散潜空间嵌入版权与定位信息；通过水印潜变量重建（WLR）恢复参照，再用密集变化区域检测（DVRD）分析反演敏感性，最终由篡改感知解码（TAD）辅助版权信息提取。',
          methodEn: 'TAG-WM embeds copyright and localization marks during diffusion sampling (DMJS), reconstructs watermark latents (WLR), detects anomalous regions through diffusion-inversion sensitivity (DVRD), and uses localization-aware decoding (TAD) for provenance recovery.',
          resultZh: '论文报告水印容量为 256 bits，并在所评估的失真、篡改条件下，同时比较图像生成质量、版权水印稳健性与篡改区域定位效果；在论文使用的基准上取得具有竞争力、部分指标领先的表现。',
          resultEn: 'The reported watermark payload is 256 bits. On the evaluated distortions and tampering scenarios, the study jointly assesses generation quality, watermark robustness, and region localization, reporting leading results on several comparisons.',
          boundaryZh: '定位效果依赖具体编辑攻击、扩散生成与反演设置；“对常见失真稳健”不表示能抵御任意重绘、重生成或自适应攻击。',
          boundaryEn: 'Localization and robustness depend on the tested edits, generative models, and inversion setup. Robustness to common distortions does not imply resistance to arbitrary regeneration or adaptive removal attacks.',
        },      },
    ],
  },
  {
    zh: '科研生态与同行评审',
    en: 'Meta-Science & Peer Review',
    papers: [
      {
        venue: 'Preprint',
        image: '/images/frameworks/ICLR2027-Analysis.png',
        titleZh: '我们将走向何方？对 43,013 篇 ICLR 2027 投稿的系统分析',
        titleEn: 'Where Are We Going? A Systematic Analysis of 43,013 ICLR 2027 Submissions',
        url: '/iclr2027/',
        authorsHtml: `${ME}`,

        releasedYear: 2026,
        briefSource: { url: "/iclr2027/", labelZh: "公开分析页面及数据快照", labelEn: "Public analysis and data snapshot" },
        brief: {
          takeawayZh: 'ICLR 2027 投稿量剧增后，真正值得追问的不只是“有多少论文”，而是增长来源、重复研究与双盲审稿机制是否跟得上。',
          takeawayEn: 'When ICLR submissions surge, the meaningful questions are where the growth comes from and whether duplication checks and double-blind review can keep pace.',
          motivationZh: '面对 ICLR 2027 大幅增长的投稿量，只看论文数量容易把新研究、重复投稿和研究方向变化混为一谈；审稿机制在快速扩容后还能否保持有效，也需要可核查的数据。',
          motivationEn: 'A much larger submission pool raises distinct questions about new research, recycled work, topical shifts, and review safeguards. Submission counts alone cannot distinguish these mechanisms.',
          methodZh: '基于 2026 年 10 月 8 日公开可见的 43,013 篇投稿快照，比较主题和历史投稿分布，并通过标题与摘要检索、模型辅助判定以及全文核对，分层筛查可能的重复工作与匿名性暴露。',
          methodEn: 'Using the public October 8, 2026 snapshot of 43,013 ICLR 2027 submissions, the analysis compares topic and submission trends, then uses title/abstract retrieval, assisted adjudication, and full-text checks to audit possible duplicates and anonymity exposure.',
          resultZh: '分析认为投稿增长主要不能由上一届 ICLR 被拒论文回流解释；在可检索并复核的候选中，逐字复制并不常见。与此同时，同标题 arXiv 预印本使部分双盲匿名性仅停留在形式上，凸显了扩容后的审稿治理问题。',
          resultEn: 'The analysis finds that prior ICLR rejections explain only a small part of the growth, while verbatim copying is uncommon among candidates surfaced and checked by the audit. Same-title arXiv preprints also expose limits of nominally double-blind review.',
          boundaryZh: '这是审稿期公开快照的描述性与筛查性分析：无法覆盖未公开的其他会议投稿，检索不到的相似论文也不在复核范围内；不能据此认定个别作者违规，更不能预判最终录用质量。',
          boundaryEn: 'This is an audit of a public snapshot during review. Unreleased submissions elsewhere and pairs missed by retrieval remain outside its coverage; the statistics neither establish misconduct by individuals nor predict eventual acceptance quality.',
        },      },
    ],
  },
  {
    zh: 'AI + 医疗',
    en: 'AI for Medicine',
    papers: [
      {
        venue: 'BSPC',
        titleZh: 'DAFFNet：用于白细胞分类的双注意力特征融合网络',
        titleEn: 'DAFFNet: A dual attention feature fusion network for classification of white blood cells',
        url: 'https://www.sciencedirect.com/science/article/pii/S1746809425002101',
        authorsHtml: `${ME}*, Zetong Chen*, Yunuo An, Chenyang Lu, Xu Qiao`,

        releasedYear: 2025,
        briefSource: { url: "https://www.sciencedirect.com/science/article/pii/S1746809425002101", labelZh: "Biomedical Signal Processing and Control 出版摘要", labelEn: "Biomedical Signal Processing and Control abstract" },
        brief: {
          takeawayZh: '让白细胞分类同时利用细胞核、胞质等形态线索与深层语义特征，而不是只依赖卷积网络提取的抽象表示。',
          takeawayEn: 'Combines explicit cell-morphology cues with high-level visual features for white-blood-cell classification.',
          motivationZh: '白细胞分类不仅取决于图像整体纹理，也与细胞核形态、胞质等细节有关。仅依赖网络高层语义特征，可能没有充分利用这些可解释的形态信息。',
          motivationEn: 'White blood cell categories depend on morphology as well as overall image patterns. Deep semantic features alone may underuse cues such as nuclear shape and cytoplasmic appearance.',
          methodZh: 'DAFFNet 采用形态与语义双分支：形态属性预测器（MAP）和编码器（MAE）提取形态表征，再与主干的深层特征融合；结合通道与空间双注意力，并通过深度监督、半监督学习增强形态特征提取。',
          methodEn: 'DAFFNet uses two branches: a morphology predictor/encoder (MAP/MAE) and a semantic feature extractor. Channel and spatial attention fuse their outputs, while deep supervision and semi-supervised learning help train the morphology pathway.',
          resultZh: '在 PBC、LISC、Raabin-WBC、BCCD、LDWBC 和 Labelled 六个数据集上，论文报告的准确率为 98.77%、91.30%、98.36%、99.71%、98.45% 和 98.85%；其中 Labelled 上较比较的已有最佳方法提高 4.36 个百分点。',
          resultEn: 'Reported accuracies are 98.77%, 91.30%, 98.36%, 99.71%, 98.45%, and 98.85% on PBC, LISC, Raabin-WBC, BCCD, LDWBC, and Labelled, respectively. The reported gain over the compared previous best on Labelled is 4.36 percentage points.',
          boundaryZh: '这些是六组显微图像分类结果，能说明模型在所选数据集上的效果，不能直接转化为患者级诊断准确率或真实临床部署表现。',
          boundaryEn: 'These are image-level classification results on six evaluated datasets. They do not establish patient-level diagnostic accuracy or performance in live clinical deployment.',
        },      },
      {
        venue: 'CMPB',
        titleZh: '基于高光谱成像与 Transformer 的肾小球疾病精准分类',
        titleEn: 'Accurate classification of glomerular diseases by hyperspectral imaging and transformer',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38964248/',
        authorsHtml: `Chongxuan Tian, ${ME}, Yelin Liu, Xin Wang, Qize Lv, Yunze Li, Jinlin Deng, Yifei Liu, Wei Li`,

        releasedYear: 2024,
        briefSource: { url: "https://pubmed.ncbi.nlm.nih.gov/38964248/", labelZh: "PubMed 摘要", labelEn: "PubMed abstract" },
        brief: {
          takeawayZh: '高光谱病理图像不仅有“长什么样”的空间结构，还有“每个波长如何反射”的光谱信息；两者结合能改善肾小球疾病分类。',
          takeawayEn: 'Combining tissue structure with wavelength-specific spectral signals improves classification of glomerular diseases in the evaluated hyperspectral images.',
          motivationZh: '肾小球病理图像的空间纹理和组织的光谱响应提供不同信息。只看若干光谱值，可能忽略病灶的形态结构；只看普通图像，又可能丢掉高光谱成像提供的波段差异。',
          motivationEn: 'Glomerular tissue images contain both spatial morphology and wavelength-dependent spectral responses. Spectral-only analysis can miss morphology, while ordinary imaging does not capture the same band-specific information.',
          methodZh: '对 385.18–1009.47 nm 的高光谱组织图像进行波段筛选和预处理，引入 Gramian Angular Field（GAF）建立空间与光谱的联合表示，再由 CNN 与 Vision Transformer 组成的 CVT 模型学习疾病类别。',
          methodEn: 'The study preprocesses hyperspectral tissue images spanning 385.18–1009.47 nm, applies wavelength selection and Gramian Angular Field (GAF) representations, and combines CNN and Vision Transformer features in a spatial–spectral CVT classifier.',
          resultZh: '在论文的小样本分类设置中，单用光谱特征的模型准确率为 85.24%，空间与光谱融合的 CVT 模型平均达到 94%。差异支持联合特征在该数据条件下的价值。',
          resultEn: 'In the paper\'s small-sample classification setting, the spectral-only model reaches 85.24% accuracy, while spatial–spectral CVT reaches 94% on average, supporting the value of combining the two signal types under these conditions.',
          boundaryZh: '实验基于有限的组织样本与图像级/像素级分类设置；即使使用高光谱成像，也不能据此声称已经实现无活检的临床诊断或完成多中心前瞻性验证。',
          boundaryEn: 'The study uses a limited tissue-image dataset and image/pixel-level classification. Hyperspectral imaging here does not establish biopsy-free diagnosis or prospective multi-center clinical validation.',
        },      },
    ],
  },
];

export interface NewsItem {
  date: string;
  zh: string;
  en: string;
}

export const NEWS: NewsItem[] = [
  {
    date: '2026.10.26',
    zh: '📄 预印本 <a href="https://arxiv.org/abs/2610.35001" target="_blank" rel="noopener noreferrer">VMem-Bench</a> 已公开：视觉记忆能提高长视频中的实体召回，却未必使当前故事更正确。<a href="https://github.com/Suchenl/VMem-Bench" target="_blank" rel="noopener noreferrer">代码与数据说明 ↗</a>',
    en: '📄 <a href="https://arxiv.org/abs/2610.35001" target="_blank" rel="noopener noreferrer">VMem-Bench</a> preprint released: retrieval can improve entity recall without improving current-story correctness. <a href="https://github.com/Suchenl/VMem-Bench" target="_blank" rel="noopener noreferrer">Code and data details ↗</a>',
  },
  {
    date: '2026.10.11',
    zh: '📊 发布 <a href="/iclr2027/">ICLR 2027 投稿分析</a>：43,013 篇投稿翻倍之后，同行评审的把关机制还跟得上吗？',
    en: '📊 Released <a href="/iclr2027/">an analysis of 43,013 ICLR 2027 submissions</a>: can peer review keep up with a doubling of submissions?',
  },
  {
    date: '2026.10.01',
    zh: '🛠️ 开源 <a href="https://github.com/Suchenl/cursor-remote-lite" target="_blank" rel="noopener noreferrer">Cursor Remote Lite</a>：在手机上接着用电脑里的 Cursor。',
    en: '🛠️ Open-sourced <a href="https://github.com/Suchenl/cursor-remote-lite" target="_blank" rel="noopener noreferrer">Cursor Remote Lite</a>: use the Cursor on your computer from your phone.',
  },
  {
    date: '2025.11.08',
    zh: '🎉 一篇论文被 <strong><em>AAAI 2026</em></strong> 接收。',
    en: '🎉 One paper accepted by <strong><em>AAAI 2026</em></strong>.',
  },
  {
    date: '2025.06.26',
    zh: '🎉 一篇论文被 <strong><em>ICCV 2025</em></strong> 接收。',
    en: '🎉 One paper accepted by <strong><em>ICCV 2025</em></strong>.',
  },
];
