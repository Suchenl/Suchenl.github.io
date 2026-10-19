# AgentTune: A Unified Training Lifecycle for Tool-Using LLM Agents

- **中文标题**：AgentTune：为工具 Agent 统一执行、训练、评估和蒸馏的轨迹契约
- **作者**：R E Zera Marveen Lyngkhoi、Abhivansh Gupta、Vidushee Vats 等
- **首次公开**：2026-10-09
- **状态**：arXiv 预印本；源码可用不等于已被同行评审认可
- **原论文**：https://arxiv.org/abs/2610.13335
- **源码**：https://github.com/Lexsi-Labs/AgentTune
- **核验**：2026-10-19；官方 arXiv 页面与论文摘要

## 一句话结论

AgentTune 主要贡献是**一致的 Agent EventLog 与训练/评测接口**，不是发明一种显著更强的 SFT 或 RL 优化目标。

## 方法详解

作者认为构建 Agent、采集轨迹、做 SFT/RL、做教师蒸馏、进行工具评价时，各阶段通常维护互不兼容的事件格式。提出双层 EventLog，将保留原始交互事件的记录层与供不同训练/评测消费的投影视图分开；围绕这一底座组合 Agent Runtime、Tool-Calling RL、Agentic Distillation、RAG、Decision Workflows 和评价工具。

关键优点在于同一条原始事件可用于多种训练目标，但不会把评测真值直接混入模型可见工具结果。它也使训练数据来源、失败路径和回放核查更可审计。

## 评价边界与 ORA 启发

作者给出的应用示例包括合约检索等任务，并不能据此认为机器人安全、动力学或具身泛化得到验证。对于 ORA，这篇更适合参考“raw event → model-visible request → train/eval projection”的分层契约，而不必全量迁移 Harness。当前文献卡主要核对原始摘要；性能与代码细节需要后续按完整论文及源码逐项确认。

**不要**把框架支持 SFT/RL 误读成同一个 optimizer step 联合更新已经成熟或更有效。