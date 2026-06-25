<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-24-rust-hybrid-indexing-ownership-roadmap.json` | 最后更新: 2026-06-25 20:50:14

[~][X+] 1. Rust-Hybrid Indexing Completion And Performance Roadmap
├── [x][X+] 1-1. Current fact base and evidence archive
│   ├── [x][X+] 1-1-1. Validated facts from completed performance roadmaps
│   └── [x][X+] 1-1-2. Evidence documents retained as source material
├── [x][X+] 1-2. Rust-owned indexing completion boundary
│   ├── [x][X+] 1-2-1. Rust-owned supported language target set
│   └── [x][X+] 1-2-2. TypeScript shell and fallback ownership boundary
├── [x][Y+] 1-3. Resolver finalization ownership frontier
│   ├── [x][Y+] 1-3-1. Facts protocol first slice for LowerName QualifiedName FileNodes
│   ├── [x][X+] 1-3-2. Reference disambiguation semantic migration slices
│   └── [x][Y+] 1-3-3. Finalization cleanup and edge write ownership slices
├── [x][Y+] 1-4. Performance evidence lanes under ownership migration
│   ├── [x][Y+] 1-4-1. Baseline trend recording for every ownership slice
│   └── [x][Y+] 1-4-2. Bounded performance exploit only when ownership progress needs it
├── [x][X+] 1-5. Agent Sufficiency and graph semantics guardrails
│   ├── [x][Y+] 1-5-1. Graph parity fallback taxonomy and RSS evidence
│   └── [x][Y+] 1-5-2. Agent Sufficiency trigger conditions
├── [x][X+] 1-6. No-go defer and research archive
│   ├── [x][X+] 1-6-1. Default no-go and diagnostic-only routes
│   └── [x][X+] 1-6-2. Research and oracle-needed routes
├── [x][Y+] 1-7. Execution rules and first-stage closeout
│   ├── [x][Y+] 1-7-1. First stage builds map only
│   └── [x][Y+] 1-7-2. Next stage opens facts protocol implementation issues
└── [~][Y+] 1-8. First-user performance optimization execution
    ├── [x][X+] 1-8-1. Fact base and targeted baseline evidence
    ├── [x][X+] 1-8-2. Candidate selection and bounded optimization routing
    ├── [ ][Y+] 1-8-3. Bounded optimization execution
    └── [ ][X+] 1-8-4. Guardrail and first-user performance closeout
<!-- ROADMAP_SECTION_END -->

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。Plan: docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md.

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)
- Q: 第17刀要不要产出新的 plan 文档？ → A. 要，写一个窄 plan：1-8-2 candidate selection and bounded optimization routing (Plan 只记录候选排序依据、第一候选选择、需要补的诊断字段、1-8-3 的 bounded issue 拆法、验证门槛和 no-go；不写 1-8-3 implementation plan。)
- Q: TS finalization/reference-resolution tail 要怎么拆成 1-8-3 的候选？ → A. 先补 tail diagnostic buckets，再决定 bounded optimization (当前最大 bucket 过粗。1-8-3 的第一步应补公开 profile diagnostics：拆 TypeScript finalization 子段与 reference-resolution candidate lookup/cache/edge write/cleanup 等子段；诊断字段只服务于候选选择和 bounded A/B，不扩成长期 API 承诺。)
- Q: 第17刀的 issue 拆法应该是什么粒度？ → A. 发 3 个 issues：plan / diagnostic-contract / routing-closeout (Issue 1 写 1-8-2 candidate routing plan；Issue 2 定义 tail diagnostic bucket contract，不实现 production optimization；Issue 3 写 1-8-3 candidate shortlist、validation/no-go routing closeout。)
- Q: 第17刀 plan 的验证门槛怎么写？ → A. 只要求文档 / roadmap / issue contract 可验证，不跑新的 benchmark (第17刀不实现、不补 production code，也不改变 profile 输出；验证门槛是 plan 存在、roadmap decisions 完整、3 个 issues 发布且依赖清楚、下一刀 diagnostic/optimization 边界明确。新的 profile rerun 留给 1-8-3 diagnostic implementation 后。)
- Q: 第17刀 plan 是否已写入仓库？ → 已写入 docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md (Plan 选择 TypeScript finalization / reference-resolution tail -> diagnostic buckets -> bounded optimization routing；拆 3 个 issues：candidate routing plan、tail diagnostic bucket contract、candidate shortlist and 1-8-3 routing closeout。)
- Q: 1-8-2 implementation issues 发布了吗？ → 已发布 #551, #552, #553 (#551 candidate routing plan；#552 tail diagnostic bucket contract，blocked by #551；#553 first-user performance candidate shortlist and 1-8-3 routing closeout，blocked by #552。三者均标记 enhancement + ready-for-agent。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。Plan: docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md.

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)
- Q: 第17刀要不要产出新的 plan 文档？ → A. 要，写一个窄 plan：1-8-2 candidate selection and bounded optimization routing (Plan 只记录候选排序依据、第一候选选择、需要补的诊断字段、1-8-3 的 bounded issue 拆法、验证门槛和 no-go；不写 1-8-3 implementation plan。)
- Q: TS finalization/reference-resolution tail 要怎么拆成 1-8-3 的候选？ → A. 先补 tail diagnostic buckets，再决定 bounded optimization (当前最大 bucket 过粗。1-8-3 的第一步应补公开 profile diagnostics：拆 TypeScript finalization 子段与 reference-resolution candidate lookup/cache/edge write/cleanup 等子段；诊断字段只服务于候选选择和 bounded A/B，不扩成长期 API 承诺。)
- Q: 第17刀的 issue 拆法应该是什么粒度？ → A. 发 3 个 issues：plan / diagnostic-contract / routing-closeout (Issue 1 写 1-8-2 candidate routing plan；Issue 2 定义 tail diagnostic bucket contract，不实现 production optimization；Issue 3 写 1-8-3 candidate shortlist、validation/no-go routing closeout。)
- Q: 第17刀 plan 的验证门槛怎么写？ → A. 只要求文档 / roadmap / issue contract 可验证，不跑新的 benchmark (第17刀不实现、不补 production code，也不改变 profile 输出；验证门槛是 plan 存在、roadmap decisions 完整、3 个 issues 发布且依赖清楚、下一刀 diagnostic/optimization 边界明确。新的 profile rerun 留给 1-8-3 diagnostic implementation 后。)
- Q: 第17刀 plan 是否已写入仓库？ → 已写入 docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md (Plan 选择 TypeScript finalization / reference-resolution tail -> diagnostic buckets -> bounded optimization routing；拆 3 个 issues：candidate routing plan、tail diagnostic bucket contract、candidate shortlist and 1-8-3 routing closeout。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)
- Q: 第17刀要不要产出新的 plan 文档？ → A. 要，写一个窄 plan：1-8-2 candidate selection and bounded optimization routing (Plan 只记录候选排序依据、第一候选选择、需要补的诊断字段、1-8-3 的 bounded issue 拆法、验证门槛和 no-go；不写 1-8-3 implementation plan。)
- Q: TS finalization/reference-resolution tail 要怎么拆成 1-8-3 的候选？ → A. 先补 tail diagnostic buckets，再决定 bounded optimization (当前最大 bucket 过粗。1-8-3 的第一步应补公开 profile diagnostics：拆 TypeScript finalization 子段与 reference-resolution candidate lookup/cache/edge write/cleanup 等子段；诊断字段只服务于候选选择和 bounded A/B，不扩成长期 API 承诺。)
- Q: 第17刀的 issue 拆法应该是什么粒度？ → A. 发 3 个 issues：plan / diagnostic-contract / routing-closeout (Issue 1 写 1-8-2 candidate routing plan；Issue 2 定义 tail diagnostic bucket contract，不实现 production optimization；Issue 3 写 1-8-3 candidate shortlist、validation/no-go routing closeout。)
- Q: 第17刀 plan 的验证门槛怎么写？ → A. 只要求文档 / roadmap / issue contract 可验证，不跑新的 benchmark (第17刀不实现、不补 production code，也不改变 profile 输出；验证门槛是 plan 存在、roadmap decisions 完整、3 个 issues 发布且依赖清楚、下一刀 diagnostic/optimization 边界明确。新的 profile rerun 留给 1-8-3 diagnostic implementation 后。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)
- Q: 第17刀要不要产出新的 plan 文档？ → A. 要，写一个窄 plan：1-8-2 candidate selection and bounded optimization routing (Plan 只记录候选排序依据、第一候选选择、需要补的诊断字段、1-8-3 的 bounded issue 拆法、验证门槛和 no-go；不写 1-8-3 implementation plan。)
- Q: TS finalization/reference-resolution tail 要怎么拆成 1-8-3 的候选？ → A. 先补 tail diagnostic buckets，再决定 bounded optimization (当前最大 bucket 过粗。1-8-3 的第一步应补公开 profile diagnostics：拆 TypeScript finalization 子段与 reference-resolution candidate lookup/cache/edge write/cleanup 等子段；诊断字段只服务于候选选择和 bounded A/B，不扩成长期 API 承诺。)
- Q: 第17刀的 issue 拆法应该是什么粒度？ → A. 发 3 个 issues：plan / diagnostic-contract / routing-closeout (Issue 1 写 1-8-2 candidate routing plan；Issue 2 定义 tail diagnostic bucket contract，不实现 production optimization；Issue 3 写 1-8-3 candidate shortlist、validation/no-go routing closeout。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)
- Q: 第17刀要不要产出新的 plan 文档？ → A. 要，写一个窄 plan：1-8-2 candidate selection and bounded optimization routing (Plan 只记录候选排序依据、第一候选选择、需要补的诊断字段、1-8-3 的 bounded issue 拆法、验证门槛和 no-go；不写 1-8-3 implementation plan。)
- Q: TS finalization/reference-resolution tail 要怎么拆成 1-8-3 的候选？ → A. 先补 tail diagnostic buckets，再决定 bounded optimization (当前最大 bucket 过粗。1-8-3 的第一步应补公开 profile diagnostics：拆 TypeScript finalization 子段与 reference-resolution candidate lookup/cache/edge write/cleanup 等子段；诊断字段只服务于候选选择和 bounded A/B，不扩成长期 API 承诺。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)
- Q: 第17刀要不要产出新的 plan 文档？ → A. 要，写一个窄 plan：1-8-2 candidate selection and bounded optimization routing (Plan 只记录候选排序依据、第一候选选择、需要补的诊断字段、1-8-3 的 bounded issue 拆法、验证门槛和 no-go；不写 1-8-3 implementation plan。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)
- Q: 第一候选应该是哪一类？ → A. TypeScript finalization / reference-resolution tail，先做诊断拆桶 + bounded routing (这是当前最大 wall-time bucket：TypeScript finalization median 2900 ms，reference resolution median 2210 ms，且 fallback taxonomy 集中在 reference-resolution。第17刀只把 tail 拆成可验证候选，不直接承诺迁移实现。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
- Q: 候选选择的主排序标准是什么？ → A. 按最大 wall-time bucket + 可验证边界排序 (候选不能只看耗时最大，也不能只看实现容易；进入 1-8-3 的候选必须同时具备可观测 bucket、bounded A/B 方法、graph parity guardrail、sufficiency guardrail 或明确 unavailable reason。)

### 当前施工：1-8-2. Candidate selection and bounded optimization routing

第17刀进入 candidate selection / bounded optimization routing；本刀只选择候选、定义验证门槛和 issue 拆法，不做 implementation。

**决策：**
- Q: 第17刀的产物边界是什么？ → A. 只做 candidate selection / routing，不做实现 (产物是窄 plan/decision artifact：基于 1-8-1 baseline 事实，选出进入 1-8-3 的 bounded optimization candidate，定义验证门槛、no-go 条件、guardrail、issue 拆法；implementation 留给 1-8-3。)
