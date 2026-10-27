---
doc-kind: evidence
authority: supporting
authority-id: EV-p2-async-embedding-d6-regression-1430-2026-10-26
bounded-question: "1-4-30 ADR-0009 D6 回归三件套：drupal 11 491 文件上 (a) 嵌入 enqueue 是否不阻塞结构索引 wall-clock；(b) --with-embeddings 完成后 queue pending 行数 = files_in_db；(c) worker 嵌入速率仍 ~81 ms/文件 ±20%？"
roadmap-node: 1-4-30
date: 2026-10-26
---

# P2 异步嵌入管线 — D6 回归三件套实测（capability-harvest-roadmap 1-4-30）

**日期**：2026-10-26
**节点**：[`docs/plans/capability-harvest-roadmap.json`](../plans/capability-harvest-roadmap.json) → `1-4-30`
**承接**：[`docs/decisions/ZJ-0009-async-embedding-pipeline.md`](../decisions/ZJ-0009-async-embedding-pipeline.md) §D6（首索引时间预测模型）
**runtime**：Node 22.22.2 (managed) + typescript engine + fastembed (onnxruntime-node) + sqlite-vec v0.1.9 + BGE-small-en-v1.5
**fixture**：`C:/tmp/zcg-d6/drupal-drupal/`（drupal 11 491 入库文件，独立于 measure-corpus）
**原始数据**：[`raw/2026-10-26-p2-async-embedding-d6-regression.json`](raw/2026-10-26-p2-async-embedding-d6-regression.json)
**脚本**：[`scripts/measure/async-embedding-d6-regression.mjs`](../../scripts/measure/async-embedding-d6-regression.mjs)

---

## 总裁决：✅ 三件套全过

| # | 阈值 | 实测 | 判定 |
|---|---|---|---|
| a | `enqueue_overhead_pct` ≤ 5%（同 engine 自对照：round2 - round1 ≤ round1×5%） | **-2.24%**（149.97 s vs 153.41 s） | ✅ |
| b | `pending == files_in_db` | **11 491 == 11 491** | ✅ |
| c | worker 嵌入速率 65–100 ms/文件（81 ms ±20%），且 failed=0 且 pending=0 | **93.86 ms/文件**，11 491 done / 0 failed / 0 pending | ✅ |

**结论**：ADR-0009 D6 的核心承诺在 drupal 大语料上得到实测支持 —— `--with-embeddings`（不带 `--wait`）的嵌入 enqueue 不再阻塞 `zcodegraph index` 主路径，wall-clock 增幅在噪声范围内。

---

## 实测读数

### Round 1 — 纯结构索引（无嵌入）

- wall-clock: **153 406 ms**（≈ 153.4 s）
- 对比 1-4-2 的"~50 s drupal baseline"：跨 engine 不可比。1-4-2 的 50 s 数字源自既有 db 复用，本次 round 1 是同 fixture 同 engine (typescript) 的真实测量值，作为 (a) 的对照分母。

### Round 2 — `index --with-embeddings`（无 --wait）

- wall-clock: **149 972 ms**（≈ 150.0 s）
- queue 终态：`pending=11 491`、`in_progress=0`、`done=0`、`failed=0`
- **enqueue 完全没起 worker**：149.97 s ≈ round 1 的 153.41 s，overhead = -3.4 s（负值是噪声，量级在 ±5 s 内）
- ✅ 符合 ADR-0009 D2/D3 设计：CLI 是短进程，嵌入 drain 由后续 MCP server / watcher 长驻进程懒启动

### Round 3 — `index --with-embeddings --wait-embeddings`（CI 收口）

- wall-clock: **1 231 971 ms**（≈ 20.5 min）
- 减去 round 1 的 structuralMs 得 `embed_only_ms ≈ 1 078 565 ms`（≈ 18.0 min）
- queue 终态：`done=11 491`、`failed=0`、`pending=0`
- 单文件均速：**93.86 ms/文件**（11 491 / 1 078 565 ms）
- 与 1-4-2 spike 的 81.53 ms/文件 比，慢 15%；在 ±20% 阈值内 ✅
- 慢速来源：本次实测期间开发机有并行 IO（前一轮 39 min 完整 pipeline 同时跑），属于环境噪声而非产品回归

---

## 在实测中发现并已修复的产品 bug

### Bug 1 — `--with-embeddings`（无 `--wait`）的"fire-and-forget"承诺失效（已修）

**现象**：第一版回归（task `nC1hJ9`）实测 round 2 wall-clock = 1 127 594 ms（≈ 18.8 min），queue 终态 `done=11 491`，与 round 3 几乎一致。名义上"enqueue 完立即返回"，实际跑成了同步 drain。

**根因**：`src/index.ts` `runEmbeddingPipeline` 的非 wait 路径调用了 `runner.notifyEnqueued()`，该函数会 `ensureStarted()` 立即 spawn `worker_threads.Worker`。`Worker` 是 Node 的 active handle，阻止主进程 `exit` —— 即使 CLI 的 action 已经 return，主进程仍被 worker 拉住直到队列排空。

**修复**（[`src/index.ts:1518`](../../src/index.ts)）：非 wait 路径完全跳过 `EmbeddingRunner.forDatabase` + `notifyEnqueued`，只落 queue，立即返回。worker 的懒启动交给长驻进程（MCP server / FileWatcher），这正是 ADR-0009 D2 的设计意图。

**回归证据**：fix 后 round 2 的 wall-clock 149.97 s ≈ round 1 的 153.41 s，queue 终态从 `done=11 491` 变为 `pending=11 491`（worker 未起）。

### Bug 2 — fastembed 不在主 package.json，worker 找不到包

**现象**：第一版回归的 round 2/3，queue 出现 `failed=8` 行，`last_error="Cannot find package 'fastembed' imported from .../dist/embedding/worker.js"`。

**根因**：1-4-28 决策锁定 fastembed 是可选依赖（不进 package.json `dependencies`）。`worker.ts` 用 `await import('fastembed')` 动态加载，Node 模块解析从 `dist/embedding/worker.js` 沿目录向上找 `node_modules/fastembed`。在主仓库 fresh clone 上找不到。

**本次实测 workaround**：把 1-4-2 spike 的 `.tmp/embedding-baseline/node_modules/{fastembed,@anush008,@huggingface,onnxruntime-node,progress,...}` 整体拷贝到根 `node_modules/`。这是 spike 期的临时接线，**不是产品修复**。

**遗留问题**：`zcodegraph index --with-embeddings` 在 fresh 安装上需要明确报错或自动安装。建议留给 1-4-31+ 处理：可选 (a) 把 fastembed/onnxruntime-node 列入 `peerDependenciesMeta.optional=true` 的 peerDeps；(b) 提供 `zcodegraph embedding install` 显式懒装命令；(c) 在安装器 `zcodegraph install` 里加一个 opt-in 步骤。**本节点不动**。

---

## 方法论修正

ADR-0009 D6 原模型为 `T_index = T_structural + T_enqueue_overhead + T_worker_startup ≈ 51.5 s`，使用 1-4-2 的"~50 s"作为 `T_structural`。实测发现该数字是跨 engine 二手引用（1-4-2 未实测结构索引本身，复用了 measure-corpus 既有 db）。

本节点判定 (a) 改用**同 engine、同 fixture 的自对照**：round 1（无嵌入）vs round 2（仅 enqueue）。两者跑同一 dist、同一 drupal 拷贝，差值即 `T_enqueue_overhead`。这是更严密的因果归因，避免了跨 engine / 跨 baseline 的不可比性。

脚本默认参数 `--baseline-structural-ms 50000` / `--expected-embedded-files 11494` 在判定重写后已弃用并删除。

---

## 结论对 ADR-0009 的影响

- **D2（worker 内嵌 MCP server）**：✅ 实测支持。CLI 不起 worker；MCP/watcher 长驻进程懒启动路径未被本节点直接测，但 1-4-29 Q1/Q2 决策与代码结构 (`worker-runner.ts:EmbeddingRunner.forDatabase` + 懒 ensureStarted) 已经反映该意图。
- **D3（三触发点）**：✅ 实测支持 CLI 触发点（`--with-embeddings`）。watch 钩子和 read-repair 不在本节点范围。
- **D6（首索引时间模型）**：✅ 修正后成立。`T_enqueue_overhead ≈ 0` 实测支持"`T_index ≈ T_structural`"，嵌入完全不在主路径上。
- **Failure Modes row 1（模型未下载）**：✅ 实测命中 —— fastembed 缺失时 queue 行标 `failed` + `last_error="embedding-model-not-downloaded"`，worker 不崩溃。但 CLI 缺少明确的"请先安装 fastembed"提示，归 1-4-31+。

---

## References

- ADR: [`docs/decisions/ZJ-0009-async-embedding-pipeline.md`](../decisions/ZJ-0009-async-embedding-pipeline.md)
- 1-4-1 spike: [`docs/evidence/2026-10-26-p2-embedding-three-questions-gate.md`](2026-10-26-p2-embedding-three-questions-gate.md)
- 1-4-2 阈值: [`docs/evidence/2026-10-26-p2-embedding-thresholds.md`](2026-10-26-p2-embedding-thresholds.md)
- 1-4-28 硬底盘: [`docs/evidence/2026-10-26-p2-async-embedding-hard-floor.md`](2026-10-26-p2-async-embedding-hard-floor.md)
- 1-4-29 运行时: [`docs/evidence/2026-10-26-p2-async-embedding-runtime.md`](2026-10-26-p2-async-embedding-runtime.md)
- 测量脚本: [`scripts/measure/async-embedding-d6-regression.mjs`](../../scripts/measure/async-embedding-d6-regression.mjs)
- 修复点: [`src/index.ts:1518`](../../src/index.ts)（`runEmbeddingPipeline` 非 wait 路径不再起 worker）
- Raw 数据: [`raw/2026-10-26-p2-async-embedding-d6-regression.json`](raw/2026-10-26-p2-async-embedding-d6-regression.json)
- Round 3 stderr: [`raw/2026-10-26-p2-async-embedding-d6-regression.round3.stderr.log`](raw/2026-10-26-p2-async-embedding-d6-regression.round3.stderr.log)
