# ZJ-0015（Draft）: ZRA-Paired v1 真机 Agent A/B 评估协议

> **Status: 历史草案 — 已被 `docs/decisions/ZJ-0015-zra-paired-v1-agent-ab-protocol.md`（Accepted, 2026-11-06）取代**
>
> 本文保留 Proposal Draft 的推理、自审与拟改文轨迹；**规范性内容一律以正式 ADR 为准**。
> §8.2 的审批项已由 Human 选 B 完成，§3 的 8 个编辑点已一次性应用。下文"没有创建
> `docs/decisions/ZJ-0015*`"等表述描述的是起草当时的状态。
>
> Date: 2026-11-06
>
> Location: `research/agent-eval-methodology/`
>
> Authority: **无**。本文不是 ADR，不进入 `docs/decisions/`，不登记 `docs/README.md`，不改变任何 Accepted 门，也不是 release input。
>
> 依据：Q1–Q32 共识确认（Human 为唯一审批人，Q6=A）；Q25=A 要求 ZJ-0015 在获批前保持 `research/` 内的 Proposal Draft；Q24=A / Q9=A 要求明确列出对 ADR-0013 D5、ADR-0014 D2、methods v2 §5 的修订范围；Q54–Q60 为红队自审后的补充共识（已锁定项不重开、补两处遗漏编辑点、扩至 §5 第 1 条、补 baseline 触发、同步范围与闸门）。
>
> **执行状态：未开始。** 未创建正式 ADR、未修改任何规范性文件、未实现 `ZCG_RETRIEVAL_ARM`、未标注任务集、未跑试点、未解除 1-4 阻塞、未做 commit/push。

---

## 0. 一页结论

| 项目 | Draft 结论 |
|---|---|
| 拟决策 | 批准 **ZRA-Paired v1** 作为 C（symbol-union）进入真机配对 Agent A/B 的唯一协议 |
| 修订范围 | **3 个规范文件 / 8 个编辑点**：ADR-0013 D5、ADR-0014 D2 与关联段、methods v2（头部 / §4 末 / §5 第 1、2、5 条）；同批修订，不留互相冲突的 Accepted 文本 |
| 保持不变 | G-ship 全部数值门；ADR-0013 D1/D2/D3/D4/D6；ADR-0014 D1/D3/D4；v3 holdout 永久冻结；1-4 pending + blocked；产品默认 OFF |
| 协议骨架 | A / C / S 三臂；任务为唯一独立推断簇；双侧配对随机化为主检验；任务簇 bootstrap 仅给区间 |
| 信息状态 | `has-gaps`，8 个 sealed-ledger unknownCriteria 原样保留为风险，不关闭 |
| 已锁定项 | MDE=1.5、`k=6` 优先、`5–8×4×3` 仅试点、`has-gaps`、两臂回退——Q1–Q32 已锁定，本 ADR 仅确认写入，不重新打开（Q54=A） |
| 毕业边界 | 真机通过**仅**授予另行 G-ship 补证资格；不等于进产品默认，不等于解锁 1-4 |
| 当前性质 | 待 Human 审批的输入草案；未 Accepted，不构成执行授权 |

**核心判断**：这份 Draft 解决的是"用哪套统计口径测真机价值"，不是再讨论 C 是否该进产品。它不降低任何产品质量门，只把 ADR-0014 已完成的职能拆分落实到配对协议层。

---

## 1. Know Why

### 1.1 为什么必须有新 ADR

1-7 三子方向全部 NO-GO 后归档，C 为历史最佳（v3 holdout macro Hit@5=0.458）。ADR-0014 把 per-corpus 90% 门拆为 **G-entry**（真机 A/B 资源阀门）与 **G-ship**（产品默认质量门），C 通过 G-entry 获准进入真机评估。

但现行配对协议仍是两臂 + paired bootstrap 区间：

- ADR-0013 D5 写"交错**两臂**执行顺序"、"主要收益使用**配对 bootstrap 区间**"；
- ADR-0014 D2 写"交错臂序，**配对 bootstrap 区间**，跨 0 判 inconclusive"，关联段另写"§5 配对协议待后续 ADR 修订"；
- methods v2 §5 第 2/5 条写"Pair by task×repetition"、"Use a predeclared **paired bootstrap interval**"，且**头部 `:14-16` 与 §4 末 `:108-109` 两处**都声明 *"Section 5's paired bootstrap protocol remains in force until a separate accepted ADR explicitly revises it."*。

因此采用 ZRA-Paired v1（三臂、任务级随机化主检验）**必须**由一份新的 Accepted ADR 显式修订这 3 个规范文件的 8 个编辑点；研究报告、Draft 或 roadmap 记录都不具备修订权限。这正是 Q9C / Q24 / Q11 反复强调的"不静默改规范"。红队自审发现初版 Draft 漏掉了 methods v2 §4 末的第二处效力声明，以及 ADR-0014 关联段的拟改文——若只改一处，文本会继续宣称旧协议有效（Q56=A）。

### 1.2 这不是降门

- G-ship 的 per-corpus 90% / 95%、精确名零 Hit@1 回退、延迟/存储/大仓/降级安全门**数值全部不变**；
- 修订的是"真机阶段如何做统计推断"，属于 G-entry 侧方法学，不是把 C 的 0.458 倒推成新阈值；
- ADR-0013 D1（不倒推降门）、D6（停止条件）、ADR-0014 D4（v3 永久冻结）原样保留。

### 1.3 证据基础与局限

- 正式报告 v2（`2026-11-05-methodology-report-v2.md`），reportHash `c30009c917220561547492136a26618c8cf6b1496bbbad8569dddeed4f476959`，receipt `evaluation.healthy=true`、`qualityGate.healthy=true`、`publishCount=1`、`navigationFailureCount=0`。
- 结论是"定制 ZRA-Paired v1，不原生复用通用 benchmark"：τ-bench 的 `pass^k` / 固定变量、tool-ablation、IR 配对随机化、SWE-rebench 的时间戳污染控制只作为可迁移组件。
- **healthy receipt 只证明报告结构与引用链合格，不证明 C 已在真机胜出，更不证明方法已实证有效。**
- sealed ledger 的 5 个 candidate `topicMatch` 全为 0、17 条 evidence 多与统计方法无关；核心统计与污染控制依据来自 `cited-findings.json` 的论文原始证据。8 个 unknownCriteria 保留为 `has-gaps`。

---

## 2. Do What — 拟决策条款

### D1 — 采用 ZRA-Paired v1

评估对象为 **B：检索工具对 Agent 任务表现的影响**（检索实现是否减少经审计的恢复性 Read/Grep），不是重做离线 Hit@5，也不是评价最终补丁质量。三臂：

| 臂 | 内容 | 角色 |
|---|---|---|
| A | 当前 `plan()` baseline | 主对比参照 |
| C | `symbol-union`（复用 1-7-1 候选构造） | 被测检索实现 |
| S | 与 C **同候选集合、同内容、同条数、同 payload schema**，仅以固定种子破坏排序 | 排序价值诊断；不证明完整因果中介 |

A/C/S 共享任务、模型版本、prompt、工具 schema、索引快照、MCP 工具面与返回结构；唯一变量是检索实现（S 另加排序种子）。配置指纹不满足即拒绝该 run（Q18=A）。

### D2 — 修订三个规范文件的统计口径

逐处对照见 §3；完整拟替换文本见附录 A。要点：

- 配对单元由 `task×repetition` 升级为 `Paired Block`（同任务内 A/C/S 各一次）；**任务（Task Cluster）是唯一独立推断单元**，trial 不得放大 N。
- 主检验由 paired bootstrap 区间改为**任务级双侧符号翻转随机化**；任务簇 bootstrap 10000 次仅提供 95% 区间。边界场景：随机化 `p=0.06` 而区间不跨 0 判**不通过**（Q11=A）。
- 臂序由"交错两臂"改为任务内**平衡三臂顺序**：确证优先 `k=6` 覆盖 6 种全排列；成本约束下 `k=4` 须预声明平衡子集并披露未覆盖顺序；禁止 ABBA（Q21=A）。
- 次要 family = C−S 排序诊断 + A/C fallback-free 二值结局 McNemar，按 Holm 校正；`pass^k` 式一致性、raw 工具数 / token / 延迟仅描述（Q22=A）。
- 任务集构造须与 `Task Freshness` 一致：注册任务仅在满足独立产生、时间戳新、未参与调参审阅时才可复用，否则必须新建并披露（Q55=A）。

### D3 — 保留全部安全门与冻结条款

原样保留：G-ship 每仓 Hit@5≥90% / Hit@10≥95%、精确名零 Hit@1 回退、延迟/存储/大仓/降级安全门；ADR-0013 D1/D2/D3/D6；ADR-0014 D1/D3/D4；v3 永久冻结且不得复用作验收或调参；1-4 pending + blocked；产品默认 OFF。

### D4 — 停止与 inconclusive

任一正确性回退即停止；区间跨 0、效应不足或预算不足判 `inconclusive`，**不追加批次求显著**；试点方差使所需 N 超预算时停止或重新提交 MDE/预算决策；S 改善接近 C 只标记"排序价值存疑"，不得宣称反思机制（Q8 / Q10 / Q30=A）。

### D5 — 试点、预注册与前置能力

`5–8 任务 × 4 trial × 3 臂` **仅**用于估计方差、审计一致性、顺序效应、缺失与成本；正式 N、总成本与正确性非劣数值须在试点后按任务级差值方差、双侧 α=0.05、power=0.80 预注册。MDE=1.5 已由 Q12=A 冻结，试点后不得调整；`40×4` 不是已论证预算（Q12 / Q19 / Q28 / Q29=A）。

前置能力（**均未实现**）：默认 OFF 的 `ZCG_RETRIEVAL_ARM`、S 的同 payload 固定种子置换、配置指纹断言、arm-blinded 双审（原始一致率 ≥90%）、不可变运行清单、无凭据一次性只读快照隔离、固定 seed 统计单元测试；以及按 `DES-baseline-agent-sufficiency-v1` 的 Trigger Matrix，因切臂会改变 MCP tool 的 ranking / returned evidence，须在实现阶段运行 Agent Sufficiency baseline 并记录结论（Q57=A）。

### D6 — 毕业边界

真机通过只授予**另行 G-ship 补证资格**：仍须在新冻结的代表性留出集（≥4 语言/4 仓、每仓≥12 题、≥60 题、≥25% holdout、整仓留出）满足 90%/95% 与全部安全门；v3 不复用。完整 G-ship 之前 1-4 保持 blocked、产品默认 OFF（Q23=A）。

---

## 3. 规范修订对照（3 个规范文件 / 8 个编辑点；Q24=A、Q55=A、Q56=A）

> 本节是**拟修订清单**，不是已执行的编辑。正式 ADR Accepted 后，须由单独 `chore(docs)` 批次一次性完成 8 个编辑点；任何只改一处的做法都会制造新的规范漂移。

| # | 位置 | 现行原文要点 | 拟改为 | 是否触碰数值门 |
|---:|---|---|---|---|
| 1 | ADR-0013 D5，`:89-98` | "按 task×repetition 整对保留或剔除，**交错两臂**执行顺序"；"主要收益使用**配对 bootstrap 区间**并完整披露逐对结果；区间跨 0 判为 inconclusive" | 三臂 `Paired Block` + 任务内平衡顺序；任务为独立推断簇；双侧配对随机化为主检验，任务簇 bootstrap 仅给 95% 区间；MDE 与 Holm 校正 | 否 |
| 2 | ADR-0014 D2 末条，`:86-87` | "按 task×repetition 整对保留/剔除，交错臂序，**配对 bootstrap 区间**，跨 0 判 inconclusive，不追加批次求显著" | 与 #1 完全同口径；补入"任一臂缺失默认整任务剔除 + 敏感性分析" | 否 |
| 3 | ADR-0014 关联段，`:127` | "§5 配对协议待后续 ADR 修订" | 改为"§5 已由 ZJ-0015 修订"；"G-ship 数值门不变"保留 | 否 |
| 4 | methods v2 头部 Status，`:14-16` | "Section 5's paired bootstrap protocol remains in force until a separate accepted ADR explicitly revises it." | 声明 §5 已由 ZJ-0015 修订，随机化主检验 / 任务簇区间的分工 | 否 |
| 5 | methods v2 §4 末，`:108-109` | 同一句效力声明的**第二处** | 与 #4 同口径替换，避免残留"旧协议仍然有效"的冲突文本 | 否 |
| 6 | methods v2 §5 第 1 条，`:138-140` | "Reuse the registered Agent Sufficiency tasks where their intent matches; disclose any new tasks." | 仅当注册任务满足 `Task Freshness`（独立产生、时间戳新、未参与调参审阅）才可复用；否则须新建任务集并披露来源与审阅记录 | 否 |
| 7 | methods v2 §5 第 2 条，`:141-143` | "Pair by task×repetition. Interleave arm order and retain or exclude the complete pair..." | `Paired Block` 三臂、任务内平衡顺序、整任务剔除与敏感性分析 | 否 |
| 8 | methods v2 §5 第 5 条，`:151-155` | "Use a predeclared paired bootstrap interval that preserves within-task pairing; ... For a reduction, the interval must exclude zero..." | 主检验改为任务级双侧随机化 `p<0.05`；bootstrap 区间仅辅助；效应量须达预注册 MDE | 否 |

**不作修改的相邻文本**：methods v2 §5 第 3/4/6 条（恢复性 Read/Grep 定义、正确性零回退、禁止追加批次）、ADR-0014 关联段中"G-ship 数值门不变"的说明。

第 6 项由 Q55=A 纳入修订：Q14=A / Q28=A 的 `Task Freshness` 下限要求真机任务集独立于 v3、时间戳新、由未参与调参者审阅；若注册任务是早期产物，"where their intent matches 就复用"会与之冲突。该修订仍在同一 §5 内，不扩大 Q24=A 的"三个规范文件"范围。

---

## 4. Trade-off

| 决策点 | 选择 | 收益 | 代价 |
|---|---|---|---|
| 随机化主检验 vs bootstrap 区间 | 任务级随机化为主 | 小任务簇下避免 bootstrap p 值偏宽 | 必须新 ADR 一次性修订 8 个编辑点；实现与预注册成本上升 |
| 三臂 A/C/S vs 两臂 A/C | 三臂 | S 暴露"排序价值 vs 检索动作"混淆 | 成本 ×1.5；S 仍不能完整识别反思机制 |
| 任务级簇 vs trial 独立 | 任务级簇 | 避免伪重复和 N 虚高 | 功效降低，需先试点估方差 |
| 先试点再定 N vs 直接 40×4 | 先试点 | 预算与 MDE 有实测依据 | 延后确证；不得中途按结果改参数 |
| 定制协议 vs 原生 benchmark | 定制 | 主终点与单变量完全贴合本仓 | 外部可比性弱，方法所有权与维护成本归本仓 |

**不批准时的兼容回退**：仅 A/C 两臂、配对 bootstrap 区间跨 0 判 inconclusive、不引入 S、不改用随机化主检验。该回退与现行三个规范文件完全兼容，但失去排序诊断与任务级随机化的稳健性。

---

## 5. Who

| 角色契约 | 职责 | 当前状态 |
|---|---|---|
| Human / 唯一审批人 | 批准或否决本 Draft 转为正式 ADR；冻结硬预算、MDE、停止判定；指定人名 | Q6/Q7=A 已定权责，具体审批未发生 |
| 任务集独立标注与审阅 | 新任务标注、来源/时间戳记录、无排名审阅、披露调参历史 | 人名未指定、未开始 |
| harness 与隔离 | `ZCG_RETRIEVAL_ARM`、S 序列化、配置指纹、manifest、只读快照、Agent Sufficiency baseline | 未开始 |
| fallback 双审 | 分类协议、arm-blinded 盲审、仲裁、一致率报告 | 未开始 |
| 统计预注册 | 随机化、bootstrap、Holm、功效模拟、固定 seed 测试 | 未开始 |

Q20=A 只冻结 4 个角色契约，具体人名留到共识确认后指定；未指定前不得实现或试点。独立任务集审阅者只承担审阅与披露，不拥有协议批准权。

---

## 6. How — 进入条件、确证判定与停止

**正式任务解盲前五项进入条件**（Q17 / Q18 / Q30=A）：三臂配置指纹一致；构造性轨迹区分 recovery / deepening / edit-prep / verification 且双审原始一致率 ≥90%；乱序/缺失/整任务剔除与敏感性分析测试通过；固定 seed 统计测试覆盖零效应与人工差值；正确性规则盲审可用。任一未通过，修协议或 harness 后重新试点，**不得带着 caveat 进入确证**。

**确证判定**（须同时满足）：双侧任务级随机化 `p<0.05`；`mean(A−C) ≥` 已锁定 MDE=1.5 次恢复性 Read/Grep / Agent Task（Q12=A；`delta=1.4` 且 p<0.05 仍不通过）；任务簇 95% 区间不跨 0；审计一致性与运行清单通过；正确性无回退。

**停止**：任一正确性回退即停止；区间跨 0 / 效应不足 / 预算不足判 `inconclusive` 且不追加批次；试点方差导致 N 超预算则停止或重新提交 MDE/预算决策；隔离越界立即停止并废弃该 run。

**生命周期**：当前为 `usefulness-validation`。本 Draft 不进入 `dogfood` 或 `release`；因尚无产品行为变更，不涉及开关、回滚、监控、版本漂移或升级/降级路径。

---

## 7. 风险登记（Q9=A：8 个 unknownCriteria 原样保留）

| 风险 | 缓解 | 残余风险 |
|---|---|---|
| 任务数不足 / 方差大 | 解盲前按任务级方差模拟功效并预注册硬预算 | 试点可能低估正式任务异质性 |
| fallback 分类主观 | 构造性样例、隐藏 arm 双审、仲裁记录、未达 ≥90% 则停 | 仲裁仍有解释差异 |
| S 识别力有限 | 限定为诊断、保持内容不变、披露边界 | 只能稳健估计整臂效果 |
| 任务污染 / 选择泄漏 | 独立于 v3、时间戳与来源记录、未参与调参者独立审阅、显式披露；§5 第 1 条的复用条件收紧 | 闭源模型训练集不可审计，不声称零污染 |
| 切臂 / 执行环境污染 | 配置指纹、任务内平衡臂序、拒绝不合格 run；按契约运行 Agent Sufficiency baseline | 宿主服务漂移仍可能贡献噪声 |
| `skip-permissions` 越界 | 无凭据一次性只读快照、禁写入/联网/读凭据、逐 run 审查 | 交互式 Agent 可能有未预见逃逸路径 |
| 成本超支 | 成功与失败成本全记录、确证前设硬预算 | 价格、速度、失败率可能变化 |

**8 个 unknownCriteria（保持 `has-gaps`，不关闭）**：tau-bench / statistical-significance、tau-bench / contamination-control、AgentBench / statistical-significance、AgentBench / endpoint-metrics、T-Eval / paired-design、T-Eval / statistical-significance、T-Eval / endpoint-metrics、T-Eval / contamination-control。

此外仍未验证或未决：正式 N、总成本、run-to-run noise、正确性非劣数值、审计一致性、C/S 运行时接线、S 识别力、独立任务集组成、试点方差、具体人名。

---

## 8. 已锁定项、待审批项与延迟预注册参数

### 8.1 已由 Q1–Q32 锁定，本 ADR 仅确认写入（Q54=A，不重新打开）

- MDE=1.5 次恢复性 Read/Grep / Agent Task，试点后不得调；α=0.05 双侧、power=0.80（Q12=A）。
- `k=6` 覆盖全排列优先，成本约束下 `k=4` 须预声明平衡子集（Q21=A）。
- `5–8 任务 × 4 trial × 3 臂` 仅试点；`40×4` 不是已论证预算（Q19=A）。
- `has-gaps` 与 8 个 unknownCriteria 作为显式风险保留，不补采后再审批（Q2=A / Q9=A）。
- 不批准时的兼容回退：A/C 两臂 + paired bootstrap 区间。
- 严格串行：共识确认 + Human 审批后才允许落盘与实现（Q5 / Q32 / Q60=A）。

### 8.2 仍需 Human 审批

- [ ] 是否批准本 Draft 转为正式 `ZJ-0015` ADR，并按 §3 一次性修订 8 个编辑点？
- [ ] 试点前基于 dry-run 冻结数值硬预算（Q29=A，当前不填金额）。
- [ ] 13 个 ADR 治理 HUMAN_DECISION 已收敛；#11 明确要求"任何协议变更需新 accepted ADR"，本 Draft 即是该 ADR 的输入，但**尚未满足**该要求。

### 8.3 延迟到试点 / 任务集设计时预注册（本 Draft 不拍数字）

正式 N、总成本、run-to-run noise、正确性非劣数值、任务集精确组成、四个角色的人名。

在 8.2 得到明确答复并转为 Accepted ADR 前，不开始实现工作。

---

## 9. 本 Draft 明确没有做的事

- 没有创建 `docs/decisions/ZJ-0015*`，没有把本文标为 Accepted，没有登记 `docs/README.md`。
- 没有修改 ADR-0013 D5、ADR-0014 D2/关联段、methods v2 或任何其它规范性文件；§3 与附录 A 只是拟改文本。
- 没有改写 `docs/plans/semantic-retrieval-roadmap.json` 的历史 decision 条目（含 `:729` 的早期口径），也没有改动治理台账中描述现行状态的条目。
- 没有修改 `src/`，没有实现 `ZCG_RETRIEVAL_ARM`、S 序列化、审计器、统计代码或隔离 harness。
- 没有标注独立任务集、没有运行任何 agent trial 或试点、没有产生真机有效性证据。
- 没有解除 1-4 的 `blocks` 边，没有改变产品默认 OFF，没有复用 v3 holdout，没有降低 G-ship 数值门。
- 没有删除或覆盖任何既有调研文件，没有改写 sealed ledger，没有覆盖已发布报告。
- 没有执行 commit/push。

### 9.1 转正式 ADR 时的同步范围（Q58=A，本 Draft 未执行）

- `docs/plans/semantic-retrieval-roadmap.json` **只追加**一条新 decision 记录，说明协议已由 ZJ-0015 修订；`:729` 等历史条目保留原样，不改写、不删除，以维持 append-only 审计轨迹。
- `research/agent-eval-methodology/2026-11-06-adr-human-decisions.md`：把 #11 从 `Closed · deferred` 更新为"已由 ZJ-0015 满足"，并同步 §5 过期表述（`:19`、`:45`）。
- §3 的 8 个编辑点与上述两处过程记录，由单独 `chore(docs)` 批次一次性应用。

---

## 10. 证据链与来源

| 资产 | 作用 |
|---|---|
| [ZRA-Paired v1 Draft 方案](2026-11-06-zra-paired-v1-draft-proposal.md) | 协议全文、风险登记、责任边界、来源清单；本文的直接输入 |
| [正式报告 v2](2026-11-05-methodology-report-v2.md) · [receipt v2](2026-11-05-receipt-v2.json) | 现行方法论结论与 `healthy=true` / `has-gaps` 状态 |
| [Report IR](report-ir.json) · [cited findings](cited-findings.json) · [sealed ledger](ledger-response.json) | 引用链、论文原始证据、8 个 unknownCriteria |
| [ADR-0013](../../docs/decisions/ZJ-0013-bounded-reranking-and-independent-agent-value-gate.md) · [ADR-0014](../../docs/decisions/ZJ-0014-split-retrieval-gate-into-agent-entry-and-ship.md) | 待修订 D5 / D2 / 关联段，以及必须保留的 D1/D3/D4/D6 与 G-ship 门 |
| [methods v2](../../docs/methods/semantic-retrieval-evaluation-v2.md) · [Agent Sufficiency v1](../../docs/contracts/baseline-agent-sufficiency-v1.md) | 待修订 §5 与两处效力声明；恢复性 Read/Grep 定义与 MCP ranking 变化的 baseline 触发 |
| [ZJ-CONTEXT.md](../../ZJ-CONTEXT.md) § Agent A/B Evaluation Language | `Paired Block` / `Arm Run` / `Task Cluster` / `Answer Sufficiency` / `Task Freshness` / `G-entry and G-ship` / `MDE` / `Proposal Draft` 等 canonical terms |
| [ADR 治理台账](2026-11-06-adr-human-decisions.md) | #11 的处置结论：协议变更须新 accepted ADR |

---

## 附录 A — 完整拟替换文本（8 个编辑点；Proposed, not applied）

> 以下文字仅供 Human 审阅。**本 Draft 未把这些文本写入任何 `docs/` 文件。** 正式 ADR Accepted 后，由单独 `chore(docs)` 批次一次性应用全部 8 个编辑点，并按 §9.1 同步过程记录。

### A.1 ADR-0013 D5 拟替换全文（编辑点 1）

```text
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
```

### A.2 ADR-0014 两处拟替换文本（编辑点 2、3）

```text
D2 末条（替换 :86-87）：
- 按 Paired Block 组织 A/C/S 三臂重复，任务内平衡臂序；任务（Task Cluster）
  为唯一独立推断单元，主检验为任务级双侧配对随机化，任务簇 bootstrap 仅提供
  95% 区间；任一臂缺失默认整任务剔除并做敏感性分析；跨 0 或效应不足判
  inconclusive，不追加批次求显著。

关联段（替换 :127 中 "§5 配对协议待后续 ADR 修订"）：
- MET-semantic-retrieval-evaluation-v2：§4 已按本决策拆为 G-entry / G-ship；
  G-ship 数值门不变；§5 配对协议已由 ZJ-0015 修订为任务级随机化主检验与
  任务簇区间。
```

### A.3 methods v2 五处拟替换文本（编辑点 4–8）

```text
头部 Status（替换第 14–16 行）：
Section 5's paired protocol is the task-level randomization test with a
task-cluster bootstrap interval, as adopted by ADR ZJ-0015 (ZRA-Paired v1).
Current product integration remains NO-GO; this method does not authorize
changing src/, the schema, CLI/MCP, or default Explore behavior.

§4 末（替换 :108-109 的同句效力声明）：
Section 5's paired protocol is defined by ADR ZJ-0015: a task-level
randomization test is primary and a task-cluster bootstrap interval is
supporting only.

§5 第 1 条（替换 :138-140）：
Freeze the task set, repetitions, pairing key, minimum detectable benefit,
and analysis before execution. Reuse a registered Agent Sufficiency task only
when it satisfies Task Freshness: independently produced, timestamped after
the relevant model knowledge cutoff where possible, and reviewed without
participating in tuning. Otherwise create new tasks and disclose their
repository, commit, prompt, annotator, reviewer, and annotation time. Reusing
frozen v3 holdout questions is not permitted.

§5 第 2 条（替换 :141-143）：
Organize repeated runs as Paired Blocks (A/C/S once each per Agent Task) and
balance arm order within each task. Prefer k=6 to cover all six permutations;
a cost-constrained k=4 requires a predeclared balanced subset with the uncovered
orders disclosed. Exclude the whole task by default when any arm run is missing,
and report a sensitivity analysis over usable task×trial pairs. Preserve
failures, timeouts, and inconclusive runs; never silently drop one arm.

§5 第 5 条（替换 :151-155）：
Report every task-level delta d_i = mean(A_i) − mean(C_i). The primary test is a
two-sided sign-flip randomization over tasks (alpha=0.05); a task-cluster
bootstrap of 10000 resamples provides the 95% interval only. Report the effect
size, interval, p-value, and run-to-run noise. Significance below the
predeclared MDE does not promote; crossing zero is inconclusive and does not
promote. Secondary endpoints require a predeclared family with Holm correction.
```
