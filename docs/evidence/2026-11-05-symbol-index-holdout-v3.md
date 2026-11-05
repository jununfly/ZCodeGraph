# 1-7-1 符号级索引召回 — dev 迭代 + v3 holdout 一次性评估

- 日期：2026-11-05
- 范围：roadmap 1-7-1（结构化检索探索第一子方向：按类型/可见性/签名索引全部符号，查询词对齐召回，替代仅-chunk 检索）
- 关联节点：1-7（结构化检索探索，门卫 e7→1-4）、1-6（注入路线 NO-GO，移交 1-7）
- 结论：**v3 holdout 字面门 = NO-GO（per-corpus 90%/95% 硬门未过）；但 C 臂是 v3 holdout 史上最佳候选，宏观 +29pp、k8s 0.08→0.42，方向强烈验证。**

---

## TL;DR

| 指标 | baseline(A) | symbol-only(B) | union(C) | 门 |
|---|---|---|---|---|
| dev 60 宏观 Hit@5 | 0.700 | 0.417 | **0.750** | — |
| dev 60 宏观 MRR | 0.437 | 0.268 | **0.534** | — |
| **holdout 24 宏观 Hit@5** | 0.167 | 0.458 | **0.458** | macro+5pp ✅(+0.292) |
| **holdout 24 宏观 Hit@10** | 0.250 | 0.542 | 0.500 | Hit10 不回退 ✅(+0.250) |
| **holdout 24 宏观 MRR** | 0.154 | 0.306 | 0.299 | MRR 不回退 ✅(+0.145) |
| holdout 逐仓 Hit@5 | rails 0.25 / k8s 0.08 | — | **rails 0.50 / k8s 0.42** | per-corpus 90% ❌ |
| holdout 逐仓 Hit@10 | rails 0.42 / k8s 0.25 | — | rails 0.50 / k8s 0.42 | per-corpus 95% ❌ |

**VERDICT: NO-GO（字面 per-corpus 硬门），但为 v3 holdout 最佳候选。**

配置哈希：`sha256:d687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d`（holdout 脚本断言，防误调）。

---

## 1. 设计

**检索本体革新**：绕开 `plan()` 入口的 `findRelevantContext`（FTS5-on-files + 名字匹配，受 `searchLimit×cap` + `minScore 0.2` 截断，只保留顶部 entry 节点）。改为**专用符号级 FTS5**：覆盖 14 类 def-bearing kind（function/method/class/struct/interface/type_alias/constant/variable/field/enum/enum_member/property/trait/protocol），对 `name`+`qualified_name` 做 **camelCase 预切分**存入 token 列，查询 = 查询词 camelCase 切分后 OR MATCH，bm25 召回 top-50 符号 → 聚合成文件。

**关键约束（来自现状勘察）**：
- `signature` 在 dev+holdout 全 0 覆盖，`docstring` 在 5 个 dev corpus 全 0 覆盖 → 符号召回**仅能依赖 name + qualified_name**。
- `visibility` 在 k8s(Go) 为 0（Go 靠 PascalCase 约定）→ 未纳入 v1 过滤。
- 规模：rails 49,830 符号 / k8s 447,149 符号，FTS5 完全可行。

**Arms**：
- A `baseline-explore`：现 `plan()` 不动（1-6 dev 基线）
- B `symbol-only`：纯符号级召回（不用 chunk、不用文件 FTS5、不用图）
- C `symbol-union-plan`：基线文件 ∪ 符号召回文件，双遍重排 `0.4*planPos + 0.4*symPos + 0.2*termAlign`

**防作弊**：dev 60 仅迭代；v3 holdout 24 冻结只作一次性评估。候选预注册哈希，评估前冻结。

---

## 2. dev 60 结果（仅迭代，带元泄漏提示）

| corpus | A | B | C |
|---|---|---|---|
| pallets-flask | 0.67 | 0.00 | 0.67 |
| expressjs-express | 1.00 | 0.00 | 1.00 |
| spring-petclinic | 0.75 | 0.75 | 0.83 |
| actix-web | 0.58 | 0.92 | 0.83 |
| dotnet-eShopOnWeb | 0.50 | 0.42 | 0.42 |
| **macro** | **0.700** | **0.417** | **0.750** |

dev 上 C 仅 +5pp，且 B（纯符号）在 snake_case 仓（pallets/express）召回=0。原因：dev 是 Python/JS 小仓，符号名 snake_case，camelCase 切分后与查询词几乎无 overlap；rails/k8s 才是 PascalCase/camelCase 对齐真正发力的地方。**dev 低估了符号召回的增益，属元泄漏方向的反向体现**（dev 偏易且命名风格不利符号对齐）。

---

## 3. v3 holdout 24 一次性评估（干净硬集，最终判定依据）

| arm | Hit@5 | Hit@10 | MRR |
|---|---|---|---|
| A baseline | 0.167 | 0.250 | 0.154 |
| B symbol-only | 0.458 | 0.542 | 0.306 |
| C union | 0.458 | 0.500 | 0.299 |

### 逐仓 C vs A
| corpus | A Hit@5 | C Hit@5 | C Hit@10 |
|---|---|---|---|
| rails | 0.25 | **0.50** | 0.50 |
| kubernetes | 0.08 | **0.42** | 0.42 |

### 门判定（沿用 v2 §4，1-7 exit criteria）
| 门 | 结果 | 说明 |
|---|---|---|
| macro Hit@5 ≥ baseline+5pp | ✅ PASS | +0.292（0.167→0.458） |
| macro MRR 不回退（Δ<0.01 记 tie） | ✅ PASS | +0.145 |
| macro Hit@10 不回退 | ✅ PASS | +0.250 |
| per-corpus Hit@5 ≥ 90% | ❌ FAIL | rails 0.50 / k8s 0.42 |
| per-corpus Hit@10 ≥ 95% | ❌ FAIL | rails 0.50 / k8s 0.42 |

**VERDICT: NO-GO**（刚性 per-corpus 硬门未过）。但 C 是 v3 holdout 史上最佳：1-6 的 D2 仅 rails 0.25/k8s 0.25，C 把 k8s 从 0.08 拉到 0.42（5× 相对提升），宏观 +29pp。

---

## 4. 根因与方向

- **B≈C 在 holdout**：纯符号召回（0.458）与 union（0.458）在硬集上几乎持平，说明 union 重排未增益——符号召回本身已承载信号。未来增益来自**提升符号级排序质量**（图/类型召回、重排序模型），而非 union 管道。
- **符号召回解决了 1-6 诊断的「文件级召回失败」**：rails/k8s 的 Hit@5 翻倍，证实「正确文件未进入候选集」是真问题，符号对齐是结构性的修复方向（1-6 的符号注入是边际信号，因为注入是后缀拼接；1-7-1 是**替换检索本体**，直击召回）。
- **仍未过 90% 门**：符号召回弥补了「进不进候选集」，但未解决「候选集内排序」与「查询意图→符号名语义鸿沟」（如 rails "attachment" 无法对齐 `send_from_directory` 语义，只能靠名字字面）。后者需 1-7-2（图/类型遍历）或 1-7-3（重排序模型）补强。

---

## 5. 资产保全（均在版本库内 / 可复跑）

| 资产 | 路径 | 状态 |
|---|---|---|
| 候选配置 + 哈希 | `docs/baselines/semantic-retrieval-symbol-index-candidate-v1.json` | tracked |
| holdout 一次性判决 | `docs/evidence/2026-11-05-symbol-index-holdout-v3.json` | tracked |
| dev 迭代数据 | `docs/evidence/2026-11-05-symbol-index-dev.json` | tracked |
| 共享核心 | `scripts/measure/symbol-index-core.mjs` | tracked |
| dev 脚本 | `scripts/measure/symbol-index-dev.mjs` | tracked |
| holdout 脚本（哈希断言） | `scripts/measure/symbol-fused-holdout-v3.mjs` | tracked |
| 符号索引缓存 | `.tmp/symbol-index/*.db` | gitignored，可经脚本再生 |

---

## 6. roadmap 影响与建议

- **1-7-1 收尾**：按 1-7 exit criteria 字面门 = NO-GO。但强烈建议**不关闭 1-7 线**——C 是方向验证的最佳证据，且 B≈C 指明下一步应攻符号级排序（1-7-2 图/类型召回、1-7-3 重排序模型）。
- **1-4 不解锁**：保持 `pending + blocked`（e7 由 1-7 锁住），per-corpus 90% 硬门未过。
- **待 Human 决策**（见对话）：① 按字面门归档 1-7-1 转 1-7-2；② 视 C 为「方向性 PASS」继续在 1-7-1 内做符号级排序增强（但 holdout 已冻，只能在 dev 探索、新留出集判定）；③ 讨论 per-corpus 90% 门是否对结构化探索候选过于严苛（无候选能过）。
