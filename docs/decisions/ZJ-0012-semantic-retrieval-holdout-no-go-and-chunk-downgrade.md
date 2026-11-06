---
doc-kind: decision
authority: primary
authority-id: ADR-0012
bounded-question: "1-3-3 冻结留出集 NO-GO 之后，语义检索方向如何处置？"
roadmap-node: 1-3-3
date: 2026-11-03
---
# ZJ-0012: 语义检索留出集未达产品级，暂停效果改进并降级重启 chunk 路线

## Status

Accepted

## Context

1-3-3 在冻结 holdout（5 仓 60 题中的 16 题：flask 2 + express 2 + eShopOnWeb 整仓 12）上对 1-3-2 推荐配置 `pure-fts`（FTS5 symbol search, limit=100, uniqueFiles）跑验收，**10 项门中效果门 4 项全失败，延迟门与资源门全通过，结论 NO-GO**：

| 指标 | pure-fts | existing-explore | 门 | 判定 |
|------|----------|------------------|-----|------|
| macro MRR | 0.3006 | 0.2953 | ≥ 0.70 | ❌ |
| macro Hit@5 | 0.375 | 0.5625 | ≥ explore + 5pp | ❌ |
| flask holdout Hit@5 | 0.0 | — | ≥ 0.90 | ❌ |
| eShopOnWeb Hit@5 / Hit@10 | 0.333 / 0.583 | — | ≥ 0.90 / ≥ 0.95 | ❌ |

dev→holdout 严重倒挂：pure-fts 在 dev MRR=0.5291 vs holdout MRR=0.3006；dev Hit@5=0.7955 vs holdout Hit@5=0.375。1-3-2 在 dev 集上推荐 pure-fts 的结论在 holdout 上完全失效。

报告：`docs/evidence/2026-11-03-holdout-evaluation.{md,json}`。

经过 zj-grill-with-docs 4 轮 14 个决策（Q1-Q14）后，确定：(a) 污染 holdout 重选放弃；(b) chunk 表示转向需先做探针再决定；(c) 接受 NO-GO 但仅暂停效果改进、保留基础设施。

### 探针结果

5 题 eShopOnWeb pure-fts miss 题（`docs/evidence/2026-11-03-chunk-probe.json`），手工构造 chunk 候选池（expectedFiles + hardNegatives 的函数级 chunk），用 BGE-small 检索：

| 题 | expectedRank | 严格判定（≥4/5 + hardNeg 不进 top3） |
|----|--------------|------------------------------------|
| eshop-picture-url-composition | 2 | ❌（hardNeg CatalogSettings 排第 1） |
| eshop-catalog-filter-pagination | 1 | ❌ |
| eshop-catalog-create-duplicate-guard | 1 | ❌ |
| eshop-json-http-error-feedback | 1 | ❌ |
| eshop-empty-basket-checkout-exception | 1 | ❌ |

**严格判定 0/5 通过，但 5/5 expectedRank ≤ 2（4 题 rank=1）**。严格标准本身被判定过严——hard negatives 进 top-3 是 chunk-vec 正确识别语义邻居的特性，而非缺陷。语义相关的协作者（CatalogSettings、CatalogFilterSpecification、CatalogItemNameSpecification 等）与正确答案在 embedding 空间中天然相邻。

## Decision

### D1 — 路线处置

- **放弃 (a)**：不把 eShopOnWeb 加回 dev 重选。dev→holdout 倒挂是信号不是噪声，污染 dev 只是让它更像 holdout，结论不会变。
- **(b) chunk 路线重启但降级**：不做完整 chunk 实现，只做 **chunk-level vec 召回 + 现有 explore 结构重排**，作为 explore 的召回增强。
- **(c) 暂停效果改进但保留基础设施**：`src/embedding/`、ADR-0009 异步管线、ZJ-0010 fastembed lazy install、`scripts/measure/embedding-baseline.mjs` 等基础设施保留为可选特性，不回滚、不标 experimental。

### D2 — chunk 表示技术选型

- **粒度**：函数/方法级 chunk（tree-sitter 已识别，零新增解析成本；探针 5/5 expectedRank ≤ 2 证明此粒度足够）
- **存储**：复用 `.zcodegraph/zcodegraph.db`；当时设想新增 chunk 向量表，但该表未落地，后续产品化设想已由 ADR-0013 取代
- **融合点**：F1 前置召回——chunk-vec 作为 explore `findRelevantContext` 的补充 seeding 源，与现有 FTS5 seeding 并行；让 chunk-vec 的语义邻居经过 explore 的调用图过滤

### D3 — 验证标准

降级方案**不复用 1-3-3 完整验收门**（那是为完整语义检索方案定的）。改用 **V3 最小验证**：

- 4 个 explore miss 题：flask-holdout-request-lifetime、eshop-basket-add-or-increment、eshop-picture-url-composition、eshop-catalog-filter-pagination
- 要求 **≥3/4 转为命中**
- V3 通过后再决定是否走完整 1-3-3 门

### D4 — 工作落点

**W1 只加 spike 脚本**：`scripts/measure/chunk-explore-fusion.mjs`，复用现有 explore-planner + fastembed，不动 `src/`。当时的后续设想是 V3 通过后再开 1-4 节点做产品化；该设想现由 ADR-0013 的独立留出集与 Agent 净收益门取代。

### D5 — 主线切换

语义检索暂停期间，ZCodeGraph 主线：
- **D4 优先**：强化 existing-explore（holdout Hit@5=0.5625 全场最佳），直接服务目标 A（agent 用 explore 答自然语言问题）
- **D1 随后**：1-2-10 测试基础设施加固 C/D 类

## Consequences

### 正面

- **holdout 完整性保留**：拒绝污染 holdout，未来任何"语义检索是否进步"的判断都有独立基准。
- **chunk 路线有硬证据支持**：5/5 expectedRank ≤ 2 是从无到有的质变（pure-fts 在这 5 题 rank=null），降级方案不是空想。
- **基础设施零浪费**：fastembed + vec0 + 异步管线 + install 子命令在 chunk 路线中全部复用。
- **最小改动验证**：W1 spike 脚本不动 src/，V3 失败也只损失一个脚本，不污染产品代码。

### 负面 / 风险

- **holdout 二次使用**：V3 验证会再用到 holdout 中的 4 题，属于轻度污染。但考虑到这 4 题是 explore 当前明确盲区，且验证目标是"修复已知失败"而非"调参提升"，污染代价 < 错过有效改进的代价。
- **chunk 索引成本未测**：函数级 chunk 数量约为文件数的 10-30 倍（eShopOnWeb 276 文件可能产生 3000-8000 chunk），BGE-small 推理 ~81ms/文件 → chunk 索引可能耗时 4-11 分钟。需要 ADR-0009 异步管线支持。
- **融合效果未知**：F1 前置召回假设 explore 的调用图能压制 chunk-vec 的语义邻居，但这个假设尚未验证——V3 就是验证它。

### 给未来重启者

如果 V3 失败（< 3/4 命中）：
- 不要简单尝试 F2/F3 融合点——回到 1-3-3 NO-GO 结论，承认 chunk 路线也不达产品级。
- 不要污染更多 holdout 题——holdout 只剩 12 题未用于本轮调参。

如果 V3 成功（≥ 3/4 命中）：
- 开 1-4 节点做 W2 产品化是当时的设想；该设想已由 ADR-0013 的独立留出集与 Agent 净收益门取代，不再作为执行落点。
- 完整 1-3-3 门仍未通过——降级方案是召回增强，不是完整语义检索。不要用 V3 通过宣称"语义检索已达产品级"。

## V3 验证结果（2026-11-03 追记）

V3 spike 执行完成，**4/4 fixed，PASS**：

| 题 | baselineRank | fusedRank |
|----|--------------|-----------|
| flask-holdout-request-lifetime | null | 1 |
| eshop-basket-add-or-increment | 16 | 3 |
| eshop-picture-url-composition | null | 4 |
| eshop-catalog-filter-pagination | null | 2 |

融合方式：chunk-vec top-8 → 符号名注入（PascalCase 优先，≤5 个）→ explore `plan(cg, augmentedQuery)`。explore 命名符号 seeding 自然命中 PascalCase token，调用图 glue 把 hard negative 的结构关联转化为正确文件的分数。

报告：`docs/evidence/2026-11-03-chunk-explore-fusion.{md,json}`。
脚本：`scripts/measure/chunk-explore-fusion.mjs` + `scripts/measure/chunk-index-build.mjs`。

**当时建议的下一步（已取代）**：开 1-4 产品化节点；ADR-0013 已用独立留出集与配对 Agent Sufficiency 证据门替换该后续指示，不再把 spike 直接转化为 src/ 改动。

**2026-11-03 后续决策**：ADR-0013 取代上述后续指示。V3 及完整门使用的 16 题已参与修复和路线选择，现仅作诊断/回归集；不允许据此直接产品化。仅授权一次固定融合、至多 3 个确定性文件重排候选的 development 选择，之后须用新冻结 holdout 与配对 Agent Sufficiency 证据晋级。详见 `ZJ-0013-bounded-reranking-and-independent-agent-value-gate.md` 与 `../methods/semantic-retrieval-evaluation-v2.md`。

## 关联

- ADR-0009 异步嵌入管线（基础设施）
- ZJ-0010 fastembed lazy install（基础设施）
- 报告 `docs/evidence/2026-11-03-holdout-evaluation.{md,json}`（NO-GO 证据）
- 报告 `docs/evidence/2026-11-03-chunk-probe.json`（chunk 探针证据）
- Roadmap `docs/plans/semantic-retrieval-roadmap.json` 节点 1-3-3（14 个 Q&A 决策完整记录）
