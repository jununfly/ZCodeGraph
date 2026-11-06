---
doc-kind: decision
authority: primary
authority-id: ADR-0013
bounded-question: "chunk-fused Explore 的 MRR 单门失败后，应降门、继续优化，还是关闭本轮产品化？"
roadmap-node: 1-3-3-1
date: 2026-11-03
---
# ZJ-0013: 有界文件重排与独立 Agent 净收益门

## Status

Accepted

本决策取代 ADR-0012 中“V3 通过后开 1-4 产品化”的后续指示；ADR-0012
对 file-level + FTS5 的负结果、基础设施保留及 chunk 降级探索的历史结论不变。

## Context

`chunk-fused-explore` 在既有 16 题上取得 Hit@5=0.9375、Hit@10=1.0、
MRR=0.5490；baseline-explore 分别为 0.5625、0.75、0.2992。主要增益是入口
召回，不是首位排序：fused 在 eShopOnWeb 的 MRR=0.4611，baseline=0.2670；
Express 还出现正确入口由 rank 1 退到 rank 4 的个例。延迟、内存相对 baseline
也明显上升，虽然仍低于当时的预算上限。

该结果不能直接作为独立产品验收：

1. 既有 16 题已用于 V3 已知失败修复、候选验收和路线判断。按
   MET-semantic-retrieval-evaluation-v2 §2（v1 已被取代），它们不再是未参与
   调参的 holdout。
2. 报告中的“macro”实为按题汇总的微平均，eShopOnWeb 占 12/16；总分可能
   掩盖小仓回退。门计数也漏掉了单仓相对 baseline 的回退限制。
3. 既有 10 门没有覆盖精确名安全、至少 10,000 文件的大仓、存储/索引成本、
   降级与 freshness。eShopOnWeb 的大仓延迟结果不能替代 10,000 文件证据。
4. “把最有利的 3 题移到 rank 1 即达到 MRR 0.70”的推算不成立。实际有
   四个 rank 2 题；即使把它们全部移到 rank 1，MRR 也仅为 0.6740，而非 0.70。
5. 离线 Hit@k/MRR 不等于 Agent Sufficiency。仓库已有 Agent A/B 执行骨架，
   但没有现成的配对显著性协议，也不能把每次 Read 都视为 fallback。

详细证据：`docs/evidence/2026-11-03-chunk-fused-holdout.{md,json}`。

## Decision

### D1 — 不按当前结果倒推并降低 MRR 门

不把 MRR 0.70 改成刚好容纳 0.549 的数值，也不以“9/10 门通过”放行。
产品目标是 Agent 在正确性不回退的前提下减少恢复性 Read/Grep；离线召回和
排序指标只是进入 Agent 实测的必要证据，不是最终用户价值。

### D2 — 只允许一次单假设、小网格优化

保留函数级 chunk、top-8、至多 5 个注入符号和 F1 前置融合，唯一假设是
**结构感知的确定性文件级重排**能改善最终入口顺序。除当前算法外，至多预先
登记 3 个候选，只在 development 上选择一次；不得追加候选、换模型、引入
学习排序、逐题规则或隐藏的单仓阈值。

优化与新留出集验收均先使用离线 spike，不修改 `src/`、schema、CLI 或 MCP。
离线 GO 后仍须单独审批只读 opt-in 原型；Agent 净收益及全部安全门通过后，
才可考虑产品集成，默认 OFF 和配置级回退不变。

### D3 — 旧 16 题转为诊断集，新假设使用新冻结留出集

既有 16 题仅作诊断和回归比较，不再承担独立晋级判定。新版本标注与冻结过程
沿用至少 4 语言/4 仓、每仓至少 12 题、总计至少 60 题、至少 25% holdout
及一个整仓留出的原则，由未参与调参的 Human 在无排名条件下审阅。

新 holdout 的主判定采用**仓级等权宏平均**，同时披露按题微平均、逐仓分母、
逐题配对变化和精确置信区间。冻结后的 holdout 一旦用于候选选择或修复，
即降为诊断集，不得重复称为独立验收。

### D4 — 离线净增益门与完整安全门

候选进入 Agent 配对实测前，必须在新 holdout 上满足：

- 仓级宏平均 Hit@5 相对 current Explore 至少提升 5 个百分点；
- 仓级宏平均 MRR 与 Hit@10 不回退；
- 每仓 Hit@5≥90%、Hit@10≥95%，且每仓相对 current Explore 的回退不超过
  2 个百分点；current Explore 已超过 95% 的仓按非回退加 Agent Sufficiency
  判定，不以继续抬高饱和指标为目标；
- 精确名控制零 Hit@1 回退，延迟与内存仍满足冻结预算。

MRR≥0.70 不再是这一轮召回增强的单一绝对否决门，但 MRR 仍是不可回退的
安全指标。此调整基于“Agent 净收益”目标和相对基线，不是按 0.549 倒推阈值。

产品化前还必须补齐至少 10,000 文件的大仓延迟、存储与索引成本、模型或向量
不可用/过期时的无标注恶化禁止、freshness、确定性顺序和有界候选等证据。
离线 10 门不能继续被称为完整产品协议。

### D5 — Agent 净收益采用配对验证，不能用离线指标替代

同一任务、模型和工具面下配对比较 A baseline、C symbol-union 与 S 排序破坏
对照，唯一变量是检索实现。S 与 C 共享候选集合、内容、条数和 payload schema，
仅以固定种子破坏排序，只作诊断，不证明完整因果中介。

按 Paired Block（同一 Agent Task 内 A/C/S 各一次）组织重复，任务内平衡臂序；
确证优先 k=6 覆盖全部 6 种顺序，成本约束下 k=4 须预声明平衡子集并披露未覆盖
顺序。任一臂缺失时默认整任务剔除并报告原因，另做保留可用 task×trial 整对的
敏感性分析；禁止只删除失败臂。保留失败、超时和 inconclusive 结果。

主要收益是经审计的恢复性 Read/Grep 减少；答案正确性不得回退。合理深入阅读、
编辑准备和验证读取不计为 fallback。工具调用、token 和耗时只作辅助指标。

任务（Task Cluster）是唯一独立推断单元：先在任务内对各臂求均值，再取
d_i = mean(A_i) − mean(C_i)。主检验为任务级双侧符号翻转随机化（α=0.05）；
任务簇 bootstrap 10000 次仅提供 95% 区间，不作为主检验。次要 family（C−S、
fallback-free 二值结局 McNemar）须预注册并按 Holm 校正。报告 mean(d_i)、
逐任务分布、区间与 run-to-run noise；显著但低于预注册 MDE 判不通过。区间跨 0
或效应量不足判 inconclusive，不通过追加批次追求显著。

本条已由 ADR-0015 修订；G-ship 数值门与 D1/D2/D3/D6 不受影响。

### D6 — 停止条件与关闭范围

新 holdout 无预定净增益、精确名或 Agent 正确性回退、Agent 主要收益的配对
区间跨 0，或延迟/资源违反预算时，关闭**本轮产品化**，不继续调参。保留基础设施、
负结果和可复跑资产。只有明显不同的表示或模型假设，并配新的独立 holdout，
才可重开路线；这不是对语义研究的永久禁止。

## Consequences

- 拒绝直接降门，避免把小样本点估计转化为产品承诺。
- 保留一次有成本上限的优化机会，但旧 holdout 不能为其提供独立有效性证明。
- 新冻结集、配对 Agent 审计、大仓与安全补证均有实际成本；未完成前保持 NO-GO。
- 当前数据证明的是“召回增强有诊断价值”，不是“融合检索已达产品级”。

## 关联

- ADR-0012：上一阶段 NO-GO 与 chunk 降级探索。
- MET-semantic-retrieval-evaluation-v2：本决策对应的可执行评测协议。
- DES-baseline-agent-sufficiency-v1：Agent Sufficiency 与 Read 分类定义。
- `docs/evidence/2026-11-03-chunk-fused-holdout.{md,json}`：本轮诊断证据。
