<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `semantic-retrieval-roadmap.json` | 最后更新: 2026-11-10 14:02:36

[~][X+] 1. 语义检索独立项目：真实基准、效果验证与证据门控集成
    └── [ ][X+] 1-8. 跨线治理与执行前置
        └── [~][X+] 1-8-2. ZJ-0015 执行前置授权
        ... 该层还有 1 个兄弟，0 个 in_progress ▸
    ... 该层还有 7 个兄弟，0 个 in_progress ▸
<details><summary>阻塞链：1 个节点被阻塞</summary>

- 1-4. 验证 Agent Sufficiency 净收益并审批 opt-in 集成 ← e9: 1-8-2. ZJ-0015 执行前置授权 [~]

</details>


### 当前施工：1-8-2. ZJ-0015 执行前置授权

**决策：**
- Q: ZJ-0015 执行前置包含什么，现在是否可执行？ → ZJ-0015（ADR-0015, Accepted 2026-11-06）批准的是 ZRA-Paired v1 协议，不是结果，也不构成执行授权。前置能力全部未实现：默认 OFF 的 ZCG_RETRIEVAL_ARM 运行时切臂、S 的同 payload 固定种子排序置换、配置指纹断言、arm-blinded 双审（原始一致率≥90%）、不可变运行清单、无凭据一次性只读快照隔离、固定 seed 统计单元测试、按 DES-baseline-agent-sufficiency-v1 跑 baseline（切臂改变 MCP ranking）。正式 N/总成本/正确性非劣数值/任务集组成/人名须在 5-8x4x3 试点后预注册，试点前冻结硬预算。任何实现须另获 Human 授权。真机通过仅获 G-ship 补证资格，1-4 与产品默认 OFF 不变。 (以 1-8-2 -> 1-4 的 blocks 边表达：前置未完成前 1-4 不可开工。)
- Q: ZJ-0015 执行前置：新 Human 授权后的预注册与硬预算冻结如何落地？ → 同一轮 Human 选择 C 也授予 1-8-2 所需的新 Human 授权，但明确条件是预注册与硬预算冻结必须先于任何实现，且按 Q70 与 ADR-0011 P1 批次严格隔离：e9 不变、1-4 不变且仍 blocked、1-8-1 与 1-8-2 保持并列、产品默认 OFF 不变、v3 holdout 永久冻结、G-ship 90%/95% 与全部安全门不变、8 个 unknownCriteria 与 has-gaps 保留；批准的是协议不是结果。预注册字段（本批只定义字段，不虚构数值）：正式 N / 总成本 / 硬预算上限须由 Human 在试点前冻结，5-8x4x3 仅是试点、40x4 不是已论证预算；主检验为任务级双侧符号翻转随机化，Task Cluster 是唯一独立推断簇、trial 不得放大 N、k=6 全排列优先、任务簇 bootstrap 只给 95% 区间；MDE=1.5 已冻结；A/C/S 三臂中 S 同候选/同内容/同条数/同 payload 仅以固定种子破坏排序且只作诊断；正确性非劣数值、任务集组成与 freshness、人名与 reviewer 须预注册。冻结后才准建设：ZCG_RETRIEVAL_ARM（默认 OFF）、S 序列化、配置指纹断言、arm-blinded 双审（原始一致率≥90%）、不可变运行清单、无凭据一次性只读快照隔离、固定 seed 统计单元测试、独立任务集，以及因切臂改变 MCP ranking 必须按 DES-baseline-agent-sufficiency-v1 跑 baseline；之后才是试点与正式运行。本批为预注册与硬预算冻结记录，不是执行启动：上述 5 项前置能力与试点在本批之后仍未开始，节点保持 pending、budget 0/2、无新边。 (e9 与 1-4 blocked=True 不变；治理台账 2026-11-06-adr-human-decisions.md 的 ZJ-0015 execution prerequisites 节；ADR-0015 与 methods v2 口径不变。)
- Q: 开始 1-8-2（2026-11-10）：scope gate 分类、执行顺序、Human-only 冻结项与不变项是什么？ → 分类=Product execution 路线下的治理前置节点；本轮 artifact 仅为预注册与硬预算冻结记录，目标项目代码/CLI/MCP/schema 保持只读。依据：ADR-0015 D5 与执行边界、治理台账《2026-11-06-adr-human-decisions.md》ZJ-0015 节——Human 已于 2026-11-07 授予新授权，但预注册与硬预算冻结必须先于任何实现，且该批明确不是执行启动。执行顺序：①冻结预注册字段与硬预算 → ②建设 9 项前置能力（默认 OFF 的 ZCG_RETRIEVAL_ARM、S 同 payload 固定种子置换、配置指纹断言、arm-blinded 双审原始一致率≥90%、不可变运行清单、无凭据一次性只读快照隔离、固定 seed 统计单元测试、独立任务集、按 DES-baseline-agent-sufficiency-v1 跑 baseline）→ ③5-8 任务×4 trial×3 臂试点（仅估方差/审计一致性/顺序效应/缺失/成本）→ ④正式运行。Human-only 字段，AI 不得虚构：正式 N、总成本、硬预算上限、正确性非劣数值、任务集精确组成与 Task Freshness、named operators/reviewers；MDE=1.5 已冻结；5-8×4×3 仅试点，40×4 不是已论证预算。不变项：e9 保留、1-4 仍 pending+blocked、1-8-1 与 1-8-2 并列、产品默认 OFF、v3 holdout 永久冻结、G-ship 90%/95% 与全部安全门、8 个 unknownCriteria 与 has-gaps、Q68 reviewer=Human。本轮消耗 max_rounds 的第 1 次开工（rounds 1/2）；9 项前置能力与试点 0 开始，节点不 completed、不解锁 1-4。 (scope gate 声明于 commentary；不自动 commit/push，feat/chore 严格分离；上一轮 1-6-3 遗留未提交变更不夹带。)
- Q: 2026-11-10 Human 对 1-8-2 冻结方式与后续动作的选择是什么？冻结记录落到什么程度？ → Human 选择 A+A：①冻结方式=先冻结硬预算上限与试点边界，正式 N 在 5-8 任务×4 trial×3 臂试点估方差后再预注册；②后续动作=不启动 9 项前置能力建设批次①，先由 Human 复核冻结记录。落盘性质为结构性冻结而非数值冻结：已冻结项为统计口径（MDE=1.5、任务级双侧符号翻转随机化、Task Cluster 唯一独立推断簇、trial 不放大 N、k=6 全排列优先、任务簇 bootstrap 仅 95% 区间）、试点边界（5-8×4×3，仅估方差/审计一致性/顺序效应/缺失/成本，不作产品门）、D4 停止与 inconclusive 规则。仍为 UNSET 的 Human-only 数值：硬预算上限数值、正式 N、总成本、正确性非劣数值、任务集精确组成与 Task Freshness、named operators/reviewers；AI 不得虚构，任何实现在数值上限给定且冻结记录经 Human 复核前不得启动。节点保持 in_progress（rounds 1/2），9 项前置能力与试点 0 开始；e9 保留、1-4 pending+blocked、1-8-1 并列、默认 OFF、v3 holdout、G-ship 90%/95%、8 个 unknownCriteria 与 has-gaps、Q68 均不变。 (治理台账《2026-11-06-adr-human-decisions.md》新增 1-8-2 start 节；本轮未改 src/、未 commit/push。)
- Q: 2026-11-10 Human 授权「硬预算上限的数值与单位按你的建议定」：冻结了什么，仍 UNSET 什么？ → Human 明确把单位与数值的决定权授予 AI，按其既有建议冻结。已冻结：①单位 = paired-run，1 run = 1 Agent Task × 1 臂(A/C/S) × 1 trial 的完整执行；②计数规则 = 失败/超时/重试/配置指纹拒绝的 run 全部计入 consumed（防重跑绕过）；按 D2 整任务剔除时已执行 run 不回退；pilot 与 formal 分账、互不挪用；run 边界由不可变运行清单条目界定；③pilot ceiling = 96 paired-runs（ADR-0015 D5 上界 8 任务 × 4 trial × 3 臂，5 任务时 60），仅用于估方差/审计一致性/顺序效应/缺失/成本；④主上限单位取 paired-run；金额 / wall-clock / token 仅作记录与报告的观测告警，不设阈值、不作统计门；⑤formal ceiling 在正式 N 预注册前可用预算为 0，试点后按 N × k × 3 推导并另行冻结，且不得在看到结果后上调；⑥触发 consumed(scope) >= ceiling(scope) 即按 D4 停止并判 inconclusive，禁止追加批次求显著。仍 UNSET（Human-only / 试点后）：正式 N、总成本、正确性非劣数值、任务集精确组成与 Task Freshness、named operators/reviewers、formal ceiling 数值。依据：ADR-0015 D5 要求正式 N 与总成本延迟到试点与任务集设计时预注册，40×4 不是已论证预算；不虚构 N 是该冻结建议本身的一部分，而非未完成。节点保持 in_progress（rounds 1/2），9 项前置能力与试点 0 开始；e9、1-4 blocked、默认 OFF、v3 holdout、G-ship 90%/95%、8 个 unknownCriteria 与 has-gaps、Q68 均不变；实现批次①须待 Human 复核冻结记录后另行启动。 (同步长期文档 MET-hard-budget-ceiling-pre-registration 的 §3/§4/§7 与治理台账；不改 ADR-0015；未 commit/push。)
- Q: 2026-11-10 Human 复核确认冻结记录后，1-8-2 的状态是什么？ → Human 复核确认第 5 条冻结记录（单位 paired-run、pilot ceiling 96、formal ceiling 0 待正式 N 预注册、金额/wall-clock/token 仅观测告警）。确认解除的是『冻结记录待复核』这一条件，不构成实现、试点或批次①启动授权；9 项前置能力与试点仍 0 开始，须另有显式指令。节点保持 in_progress（rounds 1/2）；e9、1-4 blocked、默认 OFF、v3 holdout、G-ship 90%/95%、8 个 unknownCriteria 与 has-gaps、Q68 均不变。同步修剪 MET-hard-budget-ceiling-pre-registration：删除授权日期与来源、文档治理元信息、作者执行命令、历史数值细节、与 §1 重复的推导及状态注解，保留冻结值、计数规则、可判定性判据与边界；过程材料（roadmap 决策、台账）按 zj-docs-ontology 契约保留可追溯表述。 (长期页保持 reference 形状；未改 ADR-0015 / docs/README.md；未 commit/push。)

### 下一步可开工（ready 前 3）

- 1-8. 跨线治理与执行前置 [ ]
- 1-8-1. ADR-0011 整体实现债务 [ ]
<!-- ROADMAP_SECTION_END -->
