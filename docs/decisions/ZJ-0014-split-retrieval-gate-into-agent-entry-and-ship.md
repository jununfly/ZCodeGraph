---
doc-kind: decision
authority: primary
authority-id: ADR-0014
bounded-question: "per-corpus Hit@5≥90% 门是否应继续兼任「进真机 A/B」与「进产品默认」两道职能，还是拆成两级？"
roadmap-node: 1-7
date: 2026-11-05
---
# ZJ-0014: 拆分检索提升门为「真机 A/B 入口」与「产品默认」两级

## Status

Accepted（2026-11-05，Human 审批通过；本稿为辩论后选项 A 的正式化）

本决策修订 ADR-0013 D4 的门结构：将单一「每仓 Hit@5≥90%」门从兼任
「进 Agent 配对实测」与「进产品默认」两道职能，拆分为两个独立门槛。
ADR-0013 的 D1（不按结果倒推降门）、D2（有界优化）、D3（冻结留出集纪律）、
D5（配对 Agent 验证）、D6（停止条件）全部保留不变。

## Context

1-7 结构化检索探索在 v3 frozen holdout（rails 12 + k8s 12，24 硬题）上完成
三子方向一次性评估，全部 NO-GO，但最佳臂 C（symbol-union，符号级 FTS5 召回
∪ 现 plan()）呈现明确的宏观净增益：

| 仓 | baseline Hit@5 | C Hit@5 | C misses |
| --- | --- | --- | --- |
| rails | 0.25 | 0.50 | 6/12 |
| kubernetes | 0.08 | 0.42 | 6/12 |
| macro | 0.167 | 0.458 | — |

C 的 macro Hit@5 相对 baseline 提升 +0.292（约 2.7 倍），MRR 0.154→0.299
（+0.145），Hit@10 +0.250，k8s miss 数由 11 降至 6。**宏观放宽门
（macro Hit@5≥baseline+5pp、MRR 与 Hit@10 不回退）全部 PASS**；但
per-corpus Hit@5≥90%（rails 0.50 / k8s 0.42）与 Hit@10≥95% FAIL。

证据：`docs/evidence/2026-11-05-symbol-index-holdout-v3.{md,json}`、
`2026-11-05-graph-recall.md`、`2026-11-05-semantic-rerank-probe.md`。

### 门的职能错位（问题根源）

v2 §4 与 ADR-0013 D4 把「每仓 Hit@5≥90%」同时用作：

1. **资源阀门**——决定候选是否值得进入昂贵的真机 Agent A/B；
2. **质量门**——决定候选是否可进入产品默认行为。

这两个职能被焊成一道。后果是：一个在召回与排序上有真实宏观净增益、但尚未
在巨型 PascalCase 硬仓上达到 90% 的候选（C），被永久挡在真机评估门外，其
**唯一被 v2 承认的用户价值终点（恢复性 Read/Grep 减少，§5/D5）永远没有机会
被测量**。用一个代理指标（Hit@5）的绝对门，否决了主指标（fallback 减少）
的测量权，是方法论上的本末倒置。

### 为什么不是降门（对 ADR-0013 D1 的正面回应）

ADR-0013 D1 禁止「按当前结果倒推并降低门」。本决策**不降低任何门**：

- 产品默认门的 90%/95% 绝对值**一字不动**；
- 新增的真机 A/B 入口门复用 v2 §4 / ADR-0013 D4 **已有的**「macro
  Hit@5≥baseline+5pp、MRR 与 Hit@10 不回退」判据——这不是为容纳 0.458
  新造的阈值，而是把 D4 中已经存在的「Net entry gain + Ordering safety」两行
  单独提为真机入口，把「Per-corpus recall」一行留作产品默认门。

换言之，本决策是对 D4 内部三行判据的**职能再分配**，而非数值下调。

## Decision

### D1 — 拆为两级门，职能分离

| 门 | 判据 | 职能 |
| --- | --- | --- |
| **G-entry（真机 A/B 入口）** | macro Hit@5≥current Explore+5pp；macro MRR 与 Hit@10 不回退（Δ<0.01 记 tie）；**每仓 Hit@5 相对 baseline 净提升>2pp（对称于回退阈值，防止微弱提升被宏观掩盖）**，且无仓 Hit@5/Hit@10 回退>2pp | 资源阀门：放行进入 §5/D5 配对真机评估 |
| **G-ship（产品默认 OFF 入口）** | 每仓 Hit@5≥90%、Hit@10≥95%；current Explore 已>95% 的仓按非回退+Agent Sufficiency；精确名零 Hit@1 回退；延迟/内存/存储/大仓/降级全安全门 | 质量门：放行进入产品默认行为 |

G-entry 通过只授权**只读 opt-in 真机原型**的审批申请，不构成任何产品集成
承诺。G-ship 仍是产品化的必要条件，且必须先经真机净收益门。

### D2 — C 臂获得真机 A/B 评估资格

按 G-entry，C（symbol-union）满足全部入口判据，**批准其进入 §5/D5 配对
真机 Agent A/B 评估**。真机评估必须：

- 使用**独立于 v3 holdout 24 题的任务集**（自然语言代码理解与正确入口证据，
  非重复离线 file-location 打分）；
- 主终点为经审计的**恢复性 Read/Grep 减少**，答案正确性不回退，精确名安全
  零 Hit@1 回退；
- 按 task×repetition 整对保留/剔除，交错臂序，配对 bootstrap 区间，跨 0 判
  inconclusive，不追加批次求显著。

真机任务集与 v3 不同、终点指标不同，元泄漏路径基本切断；这一点须在真机
报告中显式论证。

### D3 — 真机评估结果的双向处置

- 若真机主终点区间在有益方向排除 0 且正确性不回退：C 获得**继续向 G-ship
  补证**的资格（大仓延迟/存储/降级/精确名安全等），但此时仍**不得**进入产品
  默认——必须另行在**新冻结的代表性留出集**上满足 G-ship 的 per-corpus
  90%/95%（v3 已永久冻结，不得复用）。
- 若真机 inconclusive 或正确性回退：按 ADR-0013 D6 关闭本轮产品化，保留
  基础设施与负结果，不继续调参。

### D4 — v3 holdout 永久冻结

v3 frozen holdout 已一次性用于 1-7 三臂评估，按 ADR-0013 D3 与本决策，
永久转为诊断集，不得二次复用作独立验收或调参。任何 G-ship 补证须新建
代表性冻结留出集（沿用 ≥4 语言/4 仓、每仓≥12 题、≥60 题、≥25% holdout、
整仓留出原则）。

## Consequences

- **正面**：C 的真实用户价值（fallback 减少）首次获得测量机会；产品默认门
  的严格性不受影响；门结构从「单点绝对否决」改为「分级资源分配」，更贴合
  v2 自身的「离线→真机→集成」三级架构。
- **风险**：放宽真机入口可能让一批「宏观好看但单仓未达标」的候选消耗真机
  评估预算。缓解：G-entry 要求每仓 Hit@5 净提升>2pp 且无仓回退>2pp（对称
  阈值），已排除「宏观掩盖单仓崩溃」的情形；真机预算本身有界（ADR-0013 D2）。
  按此判据复核 C：rails 净提升+25pp、k8s 净提升+33.4pp，两仓均远超 2pp，
  无任何回退，通过结论不变。
- **诚实声明**：本决策让 C 进入真机，存在「我们已在 v3 看过 C 结论」的选择
  效应。缓解：真机用独立任务集与不同终点指标，且在报告中显式披露此效应。
- 本决策不承诺 C 最终会进入产品；它只承诺给 C 一次公平的、以正确终点测量
  的评估。

## 关联

- ADR-0013：本决策修订其 D4 门结构，D1/D2/D3/D5/D6 保留。
- ADR-0012：上一阶段 NO-GO 与基础设施保留结论不变。
- MET-semantic-retrieval-evaluation-v2：§4 门需按本决策拆分更新。
- DES-baseline-agent-sufficiency-v1：真机 Read 分类与终点定义。
- `docs/evidence/2026-11-05-symbol-index-holdout-v3.{md,json}`：C 臂门判定证据。
