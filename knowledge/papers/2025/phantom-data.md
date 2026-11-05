---
contentType: paper
readingDepth: note
domains: ["多模态学习与生成/图像与视频生成"]
shortName: "Phantom-Data"
categories: ["生成模型/视频生成"]
summaryZh: "从主体与背景纠缠的问题出发，记录主体检测、跨上下文检索和身份验证的数据构造思路；当前为简要笔记，尚未完成对数据规模及实验消融的系统审查。"
title: "Phantom-Data: Towards a General Subject-Consistent Video Generation Dataset"
authors: ["ByteDance"]
year: 2025
venue: "arXiv"
tags: ["Dataset", "Subject Consistency", "Data Engine"]
status: "read"
rating: 4
abstract: "A large-scale cross-context subject-consistency dataset that breaks the subject-background coupling to improve instruction following."
added: 2026-01-20
catalogTitleZh: "Phantom-Data：如何构建主体一致的视频生成数据"
---

## Notes

指出数据构造的核心问题：直接从视频取 subject 会与背景纠缠（复制粘贴顽疾）。贡献是证明解纠缠后指令遵循更好。三阶段构建：主体检测 → 跨上下文检索 → 身份验证。
