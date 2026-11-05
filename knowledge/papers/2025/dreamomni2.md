---
contentType: paper
domains: ["多模态学习与生成/图像与视频生成"]
shortName: "DreamOmni2"
categories: ["生成模型/图像生成"]
summaryZh: "简要记录文本与参考图共同驱动的图像编辑/生成框架，以及 Index Encoding 和联合 VLM 训练的设计意图；当前笔记以机制提要为主，尚未逐项核对完整实验。"
title: "DreamOmni2: Multimodal Instruction-based Editing and Generation"
authors: ["Bin Xia", "et al."]
year: 2025
venue: "arXiv"
tags: ["Image Editing", "Diffusion", "VLM"]
status: "read"
rating: 4
links:
  arxiv: "https://arxiv.org/abs/2510.06679"
abstract: "Introduces multimodal instruction-based editing and generation with index encoding and joint VLM training."
added: 2026-01-22
catalogTitleZh: "DreamOmni2：多模态指令如何统一图像生成与编辑"
---

## Notes

支持「文本 + 参考图」的多模态指令；引入 Index Encoding 与 VLM 联合训练。思路是用同样的索引+位置编码让模型精准定位编辑区域。
