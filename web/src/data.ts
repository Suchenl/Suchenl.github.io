export interface Paper {
  venue: string;
  image?: string;
  titleZh: string;
  titleEn: string;
  url: string;
  authorsHtml: string;
  code?: string; // GitHub repo, e.g. "Suchenl/LAMIC"
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
        venue: 'AAAI 2026',
        image: '/images/frameworks/LAMIC.png',
        titleZh: 'LAMIC：基于多模态扩散 Transformer 可扩展性的布局感知多图合成',
        titleEn:
          'LAMIC: Layout-Aware Multi-Image Composition via Scalability of Multimodal Diffusion Transformer',
        url: 'https://arxiv.org/pdf/2508.00477',
        authorsHtml: `${ME}, Zehua Ma, Jianhua Wang, Kai Kang, Shunyu Yao, Weiming Zhang`,
        code: 'Suchenl/LAMIC',
      },
    ],
  },
  {
    zh: 'AI 安全与信息隐藏',
    en: 'AI Safety & Information Hiding',
    papers: [
      {
        venue: 'Preprint',
        image: '/images/frameworks/FlowOfTruth.png',
        titleZh: 'Flow of Truth：面向图像到视频生成的主动式时序取证',
        titleEn: 'Flow of Truth: Proactive Temporal Forensics for Image-to-Video Generation',
        url: 'https://arxiv.org/abs/2604.15003',
        authorsHtml: `${ME}, Zehua Ma, Han Fang, Hengyi Wang, Guanjie Wang, Weiming Zhang`,
      },
      {
        venue: 'ICCV 2025',
        image: '/images/frameworks/TAG-WM.png',
        titleZh: 'TAG-WM：基于扩散反演敏感性的篡改感知生成图像水印',
        titleEn:
          'TAG-WM: Tamper-Aware Generative Image Watermarking via Diffusion Inversion Sensitivity',
        url: 'https://openaccess.thecvf.com/content/ICCV2025/html/Chen_TAG-WM_Tamper-Aware_Generative_Image_Watermarking_via_Diffusion_Inversion_Sensitivity_ICCV_2025_paper.html',
        authorsHtml: `${ME}, Zehua Ma, Han Fang, Weiming Zhang, Nenghai Yu`,
        code: 'Suchenl/TAG-WM',
      },
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
      },
      {
        venue: 'CMPB',
        titleZh: '基于高光谱成像与 Transformer 的肾小球疾病精准分类',
        titleEn: 'Accurate classification of glomerular diseases by hyperspectral imaging and transformer',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38964248/',
        authorsHtml: `Chongxuan Tian, ${ME}, Yelin Liu, Xin Wang, Qize Lv, Yunze Li, Jinlin Deng, Yifei Liu, Wei Li`,
      },
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
