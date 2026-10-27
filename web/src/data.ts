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
  brief?: { motivationZh:string; motivationEn:string; methodZh:string; methodEn:string; resultZh:string; resultEn:string; boundaryZh:string; boundaryEn:string };
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
          motivationZh: '长视频生成会借助历史视觉参考保持角色与场景一致，但对过去忠实的参考，不一定适用于故事当前状态。',
          motivationEn: 'Long-video generators use past visual references to preserve identity and scenes, yet a historically faithful reference can be incorrect for the current story.',
          methodZh: 'VMem-Bench 设双轨诊断：Track-A 在 92 部真实影片的 16,548 个片段上独立评估参考选择；Track-B 在 30 个因果生成故事的 2,824 个片段上，用共享生成器对比检索策略与无记忆、知情对照。',
          methodEn: 'Two-track diagnosis: Track-A assesses reference selection over 16,548 segments from 92 films; Track-B compares retrieval policies and memory controls with one shared generator over 2,824 segments from 30 causally generated stories.',
          resultZh: '论文报告检索使实体召回率由 0.559 提高至 0.628–0.693，却使精确率由 0.977 降至 0.915–0.938，禁入实体规避率由 0.968 降至 0.845–0.898；旧外观记忆还可能干扰当前故事状态。',
          resultEn: 'Retrieval improves entity recall (0.559 → 0.628–0.693) but reduces precision (0.977 → 0.915–0.938) and forbidden-entity avoidance (0.968 → 0.845–0.898); obsolete appearances can also conflict with current story state.',
          boundaryZh: '这是受控诊断而非通用生成模型改进方案；Track-B 使用共享生成器及特定故事、记忆条件，不能将结果外推为所有视觉记忆策略都有害。',
          boundaryEn: 'A controlled diagnostic study, not a general-purpose generation fix. Track-B uses a shared generator and specific stories/conditions; the findings do not show that visual memory is universally harmful.',
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
          motivationZh: "单图参考扩散模型很难同时整合多个主体与明确空间布局。",
          motivationEn: "Single-reference diffusion models struggle to compose multiple entities under explicit spatial layouts.",
          methodZh: "无需训练，利用 Group Isolation Attention 和 Region-Modulated Attention 扩展 MMDiT 的多参考组合能力。",
          methodEn: "Training-free multi-reference composition with Group Isolation Attention and Region-Modulated Attention on MMDiT.",
          resultZh: "在论文所用的多图组合基准上改善身份保持、背景一致性与区域布局控制。",
          resultEn: "Reported gains in identity preservation, background consistency, and layout control on the evaluated composition benchmarks.",
          boundaryZh: "这些结果属于所测试的生成模型与基准；不能推断任意架构或复杂场景都同样有效。",
          boundaryEn: "Findings depend on the evaluated models and benchmarks; they do not establish universal robustness.",
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
          motivationZh: "图生视频生成会让图像取证痕迹随时间漂移，单帧检测难以追踪变化。",
          motivationEn: "Image-to-video synthesis moves forensic evidence over time, complicating frame-only detection.",
          methodZh: "把生成过程表述为像素随时间的运动，构建可学习的跟踪模板与模板引导的运动模块。",
          methodEn: "Treats video generation as pixel motion over time using a learnable forensic template and template-guided flow.",
          resultZh: "论文报告了跨开放及商用 I2V 模型的时序取证泛化实验。",
          resultEn: "The paper reports temporal-forensics results on commercial and open I2V generators.",
          boundaryZh: "目前属于公开预印本；实验结论应按文中数据与生成设置理解。",
          boundaryEn: "This is a public preprint; conclusions are bounded by the evaluated models and settings.",
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
          motivationZh: "生成图片需要同时证明来源与定位后续恶意编辑，单一稳健水印难以兼顾两者。",
          motivationEn: "Generated images need both provenance verification and post-edit tamper localization.",
          methodZh: "联合嵌入版权与定位水印，再通过扩散反演敏感性识别被篡改区域。",
          methodEn: "Combines copyright/localization watermarking with diffusion inversion sensitivity for tamper localization.",
          resultZh: "论文在图像质量、抗失真与定位能力方面报告了多项实验。",
          resultEn: "The ICCV paper reports robustness, localization, and image-quality evaluations.",
          boundaryZh: "水印的适用性需结合具体生成与编辑模型、威胁模型评估。",
          boundaryEn: "Performance must be interpreted under the tested generators, edits, and threat assumptions.",
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
          motivationZh: "面对投稿规模变化，需要可核对的学术数据了解研究热点与审稿生态。",
          motivationEn: "Changes in submission scale motivate an auditable overview of research trends and peer-review workload.",
          methodZh: "以 2026-10-08 的公开投稿快照为基础，开展主题分布、重复论文筛查及同行评审相关描述性分析。",
          methodEn: "Descriptive analysis of the public 2026-10-08 ICLR 2027 submission snapshot, including topics and overlap audits.",
          resultZh: "研究页面报告覆盖 43,013 篇投稿的描述性统计。",
          resultEn: "The analysis reports descriptive statistics over 43,013 submissions.",
          boundaryZh: "这是投稿分布的描述性研究，不等于最终录用趋势或论文质量的因果证据。",
          boundaryEn: "Submission statistics cannot establish final acceptance patterns or causal paper-quality claims.",
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
          motivationZh: "单用白细胞图像的高层语义，可能丢失诊断相关的形态信息。",
          motivationEn: "WBC classifiers may overlook diagnostically useful morphology when emphasizing high-level features.",
          methodZh: "使用双分支、双注意力特征融合，结合形态属性提取，并通过深度监督和半监督策略改进相关模块训练。",
          methodEn: "Dual-branch fusion of morphological and semantic features, with deep-supervised and semi-supervised learning strategies.",
          resultZh: "论文在六个公开白细胞图像数据集上分别报告分类准确率；这些指标不能直接跨临床条件外推。",
          resultEn: "The paper reports accuracy on six public WBC image datasets, not clinical diagnostic outcomes.",
          boundaryZh: "离线图像分类精度不能直接视作真实临床诊断表现。",
          boundaryEn: "Image-classification benchmarks do not alone establish clinical effectiveness.",
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
          motivationZh: "肾小球病理分类需要联合利用组织图像的空间结构与光谱信息。",
          motivationEn: "Glomerular classification can benefit from integrating spatial structures and hyperspectral signals.",
          methodZh: "结合卷积网络与 Vision Transformer，融合高光谱的空间和波段特征。",
          methodEn: "Combines CNN and Vision Transformer features from hyperspectral spatial/spectral signals.",
          resultZh: "论文报告其数据设置下 CVT 的平均分类准确率为 94%；仅用光谱特征的模型为 85.24%。",
          resultEn: "The paper reports 94% mean accuracy for CVT versus 85.24% for the spectral-only model in its study.",
          boundaryZh: "小样本病理分类实验不等价于多中心临床验证。",
          boundaryEn: "Small-sample classification results do not constitute multicenter clinical validation.",
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
