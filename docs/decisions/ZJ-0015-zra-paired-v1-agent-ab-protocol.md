---
doc-kind: decision
authority: primary
authority-id: ADR-0015
bounded-question: "真机 Agent A/B 应采用哪套配对协议测量检索实现的净收益，以及它如何修订 ADR-0013 D5、ADR-0014 D2 与 methods v2 §5？"
roadmap-node: 1-7
date: 2026-11-06
---
# ZJ-0015: ZRA-Paired v1 真机 Agent A/B 配对协议

## Status

Accepted（2026-11-06，Human 审批通过；Q1–Q32 与 Q54–Q60 共识确认后由 Proposal Draft 转正式）

本决策**显式修订** ADR-0013 D5、ADR-0014 D2 末条及其关联段、以及
MET-semantic-retrieval-evaluation-v2 的头部状态声明、§4 末声明与 §5 第 1/2/5 条，
共 **3 个规范文件、8 个编辑点**，同批生效。三处中任何一处单独修订都会留下互相
冲突的 Accepted 文本。

本决策**不降低**任何产品质量门，**不构成**实现、试点或产品集成授权。

## Context

1-7 三子方向在 v3 frozen holdout 上全部 NO-GO 后归档，C（symbol-union）为历史
最佳（macro Hit@5=0.458）。ADR-0014 将 per-corpus 90% 门拆为 G-entry（真机 A/B
资源阀门）与 G-ship（产品默认质量门），C 通过 G-entry 获准进入配对真机评估。

但现行配对协议仍是 ADR-0013 D5 / ADR-0014 D2 / methods v2 §5 所写的
"两臂 + `task×repetition` + paired bootstrap 区间"。方法选型调研的结论是：
没有完全对口的现成 benchmark 可原生复用；本仓采用定制的 **ZRA-Paired v1**，
借 τ-bench 的多 trial 与固定变量、tool-ablation 的检索对照、IR 文献的配对
随机化与 SWE-rebench 的时间戳污染控制，但不搬运通用 benchmark 的任务终点。

methods v2 头部与 §4 末**两处**都声明 "Section 5's paired bootstrap protocol
remains in force until a separate accepted ADR explicitly revises it"，
ADR-0014 关联段亦注明 "§5 配对协议待后续 ADR 修订"。因此只有一份新的 Accepted
ADR 才能合法改变该口径；研究报告、草案与 roadmap 过程记录均不具备修订权限。

## Decision

### D1 — 评估对象与三臂

评估对象为**检索工具对 Agent 任务表现的影响**：检索实现是否减少经审计的
恢复性 Read/Grep fallback。不重做离线 Hit@5，不评价最终补丁质量。

| 臂 | 内容 | 角色 |
|---|---|---|
| A | 当前 `plan()` baseline | 主对比参照 |
| C | `symbol-union`（复用 1-7-1 候选构造） | 被测检索实现 |
| S | 与 C 同候选集合、同内容、同条数、同 payload schema，仅以固定种子破坏排序 | 排序价值诊断；不证明完整因果中介 |

A/C/S 共享任务、模型版本、prompt、工具 schema、索引快照、MCP 工具面与返回
结构；唯一变量是检索实现（S 另加排序种子）。配置指纹不满足即拒绝该 run。
因切臂会改变 MCP tool 的 ranking / returned evidence，实现阶段须按
DES-baseline-agent-sufficiency-v1 的 Trigger Matrix 运行 Agent Sufficiency
baseline 并记录结论。

### D2 — 统计口径修订（8 个编辑点）

- 配对单元由 `task×repetition` 升级为 `Paired Block`（同一 Agent Task 内
  A/C/S 各一次）；**任务（Task Cluster）是唯一独立推断单元**，trial 不得放大 N。
- 主检验为任务级差值的**双侧符号翻转随机化**（α=0.05；`N≤20` 精确枚举，否则
  固定 seed 至少 100000 次模拟）；任务簇 bootstrap 10000 次**仅提供 95% 区间**。
  随机化 `p=0.06` 而区间不跨 0 判**不通过**。
- 臂序改为任务内平衡三臂顺序：确证优先 `k=6` 覆盖 6 种全排列；成本约束下
  `k=4` 须预声明平衡子集并披露未覆盖顺序；禁止 ABBA。
- 次要 family = C−S 排序诊断 + A/C fallback-free 二值结局 McNemar，预注册并按
  Holm 校正；`pass^k` 式一致性、raw 工具数 / token / 延迟仅描述。
- 任一臂缺失默认整任务剔除并报告原因，另做保留可用 `task×trial` 整对的敏感性
  分析；禁止只删除失败臂。
- 任务集复用须满足 `Task Freshness`：独立产生、时间戳新、由未参与调参者审阅；
  否则必须新建并披露来源与审阅记录。冻结的 v3 holdout 不得复用。
- 报告 `d_i = mean(A_i) − mean(C_i)`、逐任务分布、区间、p 值与 run-to-run
  noise；显著但低于预注册 MDE 判不通过。

### D3 — 保留条款（原样不变）

G-ship 每仓 Hit@5≥90% / Hit@10≥95%、精确名零 Hit@1 回退、延迟/存储/大仓/
降级全部安全门；ADR-0013 D1/D2/D3/D6；ADR-0014 D1/D3/D4；v3 holdout 永久
冻结且不得复用作验收或调参；1-4 pending + blocked；产品默认 OFF。
本决策修订的是 G-entry 侧方法学，不是按 C=0.458 倒推新阈值。

### D4 — 停止与 inconclusive

任一正确性回退即停止；区间跨 0、效应不足或预算不足判 `inconclusive`，
**不追加批次求显著**；试点方差使所需 N 超预算时停止或重新提交 MDE/预算决策；
S 改善接近 C 只标记"排序价值存疑"，不得宣称反思机制；隔离越界立即停止并
废弃该 run。

### D5 — 试点、预注册与前置能力

`5–8 任务 × 4 trial × 3 臂` **仅**用于估计方差、审计一致性、顺序效应、缺失与
成本。MDE=1.5 次恢复性 Read/Grep / Agent Task 已冻结，试点后不得调整；
`40×4` 不是已论证预算。正式 N、总成本、正确性非劣数值、任务集精确组成与
角色人名，全部延迟到试点与任务集设计时预注册。

前置能力均未实现：默认 OFF 的 `ZCG_RETRIEVAL_ARM`、S 的同 payload 固定种子
置换、配置指纹断言、arm-blinded 双审（原始一致率 ≥90%）、不可变运行清单、
无凭据一次性只读快照隔离、固定 seed 统计单元测试。

### D6 — 毕业边界

真机通过只授予**另行 G-ship 补证资格**：仍须在新冻结的代表性留出集
（≥4 语言/4 仓、每仓≥12 题、≥60 题、≥25% holdout、整仓留出）满足 90%/95%
与全部安全门；v3 不复用。完整 G-ship 之前 1-4 保持 blocked、产品默认 OFF。

### D7 — 风险登记与信息缺口

信息状态保持 `has-gaps`。sealed-ledger 未覆盖的 8 个 unknownCriteria 原样保留：
tau-bench / statistical-significance、tau-bench / contamination-control、
AgentBench / statistical-significance、AgentBench / endpoint-metrics、
T-Eval / paired-design、T-Eval / statistical-significance、
T-Eval / endpoint-metrics、T-Eval / contamination-control。

其余风险：任务数不足或方差大、fallback 分类主观、S 识别力有限、任务污染与
选择泄漏、切臂或执行环境污染、`--dangerously-skip-permissions` 越界、成本超支。
缓解手段为预注册硬预算、隐藏 arm 双审与仲裁、配置指纹、独立任务集与时间戳、
无凭据只读快照。不声称闭源模型训练零污染。

## Consequences

- **正面**：真机主终点与唯一变量完全贴合本仓；任务级推断避免伪重复；排序破坏
  对照暴露"检索动作 vs 排序质量"混淆；三处规范一次对齐，不再有互相冲突的
  Accepted 文本。
- **代价**：定制协议外部可比性弱，方法维护成本归本仓；三臂使运行成本约 ×1.5；
  任务级簇降低功效，须先试点估方差；实现与预注册工作量显著上升。
- **诚实声明**：`healthy=true` 的研究 receipt 只证明报告结构与引用链合格，
  不证明 C 已在真机胜出，也不证明本方法已实证有效。本决策批准的是**协议**，
  不是结果，更不是产品集成。
- **若未批准**：兼容回退为 A/C 两臂 + paired bootstrap 区间、不引入 S、不改用
  随机化主检验；但本决策已 Accepted，该回退仅在后续明确废止本 ADR 时生效。

## 执行边界（本 ADR 未授权的事项）

- 未实现 `ZCG_RETRIEVAL_ARM`、S 序列化、审计器、统计代码或隔离 harness。
- 未标注独立任务集、未运行任何 agent trial 或试点、未产生真机有效性证据。
- 未改变 `src/`、CLI/MCP、schema 或默认 Explore 行为；未解除 1-4 的 `blocks` 边。
- 任何实现与试点须另有明确 Human 授权，并在确证前完成预注册与硬预算冻结。

## 关联

- ADR-0013：本决策修订其 **D5**；D1/D2/D3/D4/D6 保留。
- ADR-0014：本决策修订其 **D2 末条与关联段**；D1/D3/D4 保留，G-ship 数值门不变。
- MET-semantic-retrieval-evaluation-v2：本决策修订其头部状态声明、§4 末声明与
  §5 第 1/2/5 条；第 3/4/6 条保留。
- DES-baseline-agent-sufficiency-v1：恢复性 Read/Grep 与正确性定义；MCP ranking
  变化时的 baseline 触发。
- `docs/evidence/2026-11-05-symbol-index-holdout-v3.{md,json}`：C 臂 G-entry 判定证据。
- ZJ-CONTEXT.md § Agent A/B Evaluation Language：本决策使用的 canonical terms。
