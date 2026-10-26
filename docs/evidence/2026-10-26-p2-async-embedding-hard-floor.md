---
doc-kind: evidence
authority: supporting
authority-id: EV-2026-10-26-p2-async-embedding-hard-floor
bounded-question: "What did the 1-4-28 P2 async-embedding hard-floor implementation deliver and how is it verified?"
roadmap-node: 1-4-28
date: 2026-10-26
---

# 1-4-28 P2 异步嵌入管线 — 硬底盘落地

## 范围

本节点交付 ADR-0009 D5 的**硬底盘**部分，刻意不做 worker / 三触发点 / CLI flag
（已切到 1-4-29）。

| 块 | 文件 | 改动 |
|---|---|---|
| schema v6 migration | `src/db/migrations.ts` | 新增 v6 entry，描述写明 old-CLI 兼容策略（read-only compatible，老 binary 看不见 `embedding_queue`） |
| baseline schema | `src/db/schema.sql` | 新建 `embedding_queue` 表 + 2 个索引；`vec_embeddings` 注释说明**故意不进 schema.sql**（vec0 是可选扩展，写进 baseline 会让无 vec0 的 binary 无法 open DB） |
| queue API | `src/embedding/queue.ts` | `enqueueEmbedding` / `enqueueEmbeddingBatch` / `getEmbeddingQueueRow` / `countEmbeddingQueueByStatus` / `claimPendingEmbeddings` / `markEmbeddingDone` / `markEmbeddingFailed` / `resetStaleInProgressEmbeddings` |
| taxonomy 扩展 | `src/diagnostics/fallback-summary.ts` | `FALLBACK_REASON_LABELS` + 5 个 embedding key；`RustHybridFallbackProfile.embeddingProfile.embeddingFailures` 新可选参数；合并循环（含 `embedding-model-not-downloaded` 防御性过滤） |
| fallback 状态机 | `src/indexing/rust-hybrid-contract.ts` | `EMBEDDING_PARTIAL_REASON_CODES` Set；`rustHybridFallbackStateFor` 区分 partial-only 与 degraded 子原因 |

## 决策落盘（roadmap 1-4-28）

1. **semantic_search 工具策略** — 本节点**不新增** `zcodegraph_semantic_search` 工具。
   read-repair 副作用后续挂在既有 `zcodegraph_search` 上，符合
   `schema-evolution-and-mcp-tool-cap-v1` Clause 2 的 tool-cap 红线（当前 8/12）。
2. **fastembed 依赖策略** — 主 `package.json` 不引入 `fastembed`/`onnxruntime-node`。
   worker（1-4-29）通过 `try { require('fastembed') } catch` 懒探测，缺失则任务保持
   `pending`、对应 ADR-0009 Failure Modes 表第一行 `embedding-model-not-downloaded`。

## 关键设计取舍

### 为何 `vec_embeddings` 不进 schema.sql

`vec_embeddings` 是 vec0 虚拟表，创建它需要 `db.loadExtension(<path-to-vec0.dll>)`。
如果写进 baseline schema：

- 任何未装 sqlite-vec 的 binary（包括所有 1-4-28 之前的旧版）会**无法 open 数据库**。
- 违反 ADR-0009 D5 末尾的「`vec_embeddings` 与 `embedding_queue` 都是新增表，不动既有 DDL」精神——更精确地说，`embedding_queue` 是普通表，谁都能打开；`vec_embeddings` 必须等 worker 启动时按需建。

因此 `vec_embeddings` 由 1-4-29 的 worker 在 `allowExtension + loadExtension(vec0)` 成功后用
`CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings USING vec0(...)` 自建。

### 为何 `embedding-stale` 走 `partial` 而非 `degraded`

ADR-0009 D4 表把 `embedding-stale` 标为 `partial`：结构图本身完整，只是嵌入向量过期。
若一刀切走 `degraded` 会把日常「文件刚改、worker 还没跟上」的常态误判成降级。实现方式
是在 `rustHybridFallbackStateFor` 引入 `EMBEDDING_PARTIAL_REASON_CODES` 白名单：只在 taxonomy
出现白名单**以外**的 key 才推 `degraded`。

`embedding-model-not-downloaded` 不进 taxonomy 的契约由**两层**保证：
调用方（worker / read-repair）构造 `embeddingFailures` 时不上报；
`buildRustHybridFallbackSummary` 合并循环里再做一次防御性 `continue`。

## 验收

```text
Test Files  3 passed (3)
Tests  27 passed (27)
  tests/embedding-queue.test.ts             10 passed
  tests/rust-hybrid-fallback-summary.test.ts 14 passed (含新增 embedding profile 5 个 case)
  tests/schema-evolution-clause.test.ts      3 passed
```

补充回归（fallback 相邻套件）：

```text
tests/issue-682-partial-fallback-state.test.ts  13 passed
tests/issue-680-fallback-messaging.test.ts       4 passed
tests/rust-esm-fallback-taxonomy.test.ts         2 passed
tests/skip-debt-guardrail.test.ts                4 passed
```

类型检查：`tsc --noEmit` 0 errors。

## 不在本节点范围（切到 1-4-29）

- `src/embedding/worker.ts` 懒启动 worker_threads 主循环
- watcher sync 完成后 enqueue 钩子
- `zcodegraph_search` read-repair 副作用
- `zcodegraph index --with-embeddings` CLI flag
- D6 回归三件套（drupal ≤ 51.5s 等）

## References

- 设计：`docs/decisions/ZJ-0009-async-embedding-pipeline.md`（ADR-0009 D5）
- 实测阻塞：`docs/evidence/2026-10-26-p2-embedding-thresholds.md`
- 三问立项：`docs/evidence/2026-10-26-p2-embedding-three-questions-gate.md`
- Schema 演进契约：`docs/contracts/schema-evolution-and-mcp-tool-cap-v1.md`
