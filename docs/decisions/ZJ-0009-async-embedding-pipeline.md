---
doc-kind: decision
authority: primary
authority-id: ADR-0009
bounded-question: "What architectural trade-off does ZJ-0009-async-embedding-pipeline resolve?"
roadmap-node: 1-4-27
date: 2026-10-26
---
# ZJ-0009: 异步嵌入管线（P2 后台嵌入 + 增量懒算）

## Status

Accepted (design phase)

## Context

承接 1-4-2 实测阻塞：fastembed 串行 ~81 ms/文件，drupal 11 501 文件 → 首索引嵌入耗时 **18.4 min**，远超 ≤2× 结构索引（~50 s）的硬阈值。把同步嵌入塞进 `zcodegraph index` 主路径已被判定不可行（详见 `docs/evidence/2026-10-26-p2-embedding-thresholds.md`）。

1-4-1 立项三问已锁定前置条件（详见 `docs/evidence/2026-10-26-p2-embedding-three-questions-gate.md`）：

- 模型按需下载到 `.zcodegraph/models/`（BGE-small-en-v1.5，384d，64 MB ONNX 量化）
- sqlite-vec v0.1.9（vec0.dll 282 KB）与 nodes/edges 同库共存
- 嵌入失败子原因走现有 `fallbackReasonTaxonomy: Record<string, number>` 扩展，零 schema 变更
- `node:sqlite` 默认禁用扩展，需 `allowExtension: true` 构造参数

本 ADR 落地 1-4-27 的完整设计：异步管线架构 + 首索引时间模型 + 触发策略 + 失败子原因接入 + v0 schema。

## Decision

### D1 — 队列持久化介质：SQLite 同库队列表

不选独立 daemon、不选 Redis、不选文件系统队列。

理由：

1. 与 `nodes`/`edges`/`vec_embeddings` 同库 → 单事务保证「结构写 + 嵌入 pending」原子入队，崩溃恢复零代码
2. 复用现有 WAL + `FileLock`（`src/sync/watcher.ts:120 LockUnavailableError`）多写者并发保护
3. 不需要新进程模型 —— MCP server 进程内嵌 worker 即可
4. 排查/恢复用 SQL 一行查清

代价：单写者吞吐受 SQLite WAL 限制。实测嵌入 81 ms/文件 ≪ WAL 写瓶颈 ~1 ms/行，远未到顶。

### D2 — Worker 部署：MCP server 进程内嵌 + worker_threads

不选 CLI index 子进程 / 不选独立 daemon 进程 / 不选 setImmediate 同步调度。

理由：

1. MCP server 是长驻进程，生命周期覆盖嵌入这种长任务；CLI index 是短任务，把嵌入塞进去违背「不阻塞 index 主路径」核心约束
2. Node `worker_threads` 提供真正并行 —— onnxruntime 是 CPU-bound，单线程事件循环会饿死 MCP 请求
3. 主进程通过 queue 表与 worker 解耦，崩溃重启后 `SELECT status='pending'` 直接续跑
4. 对比 daemon：少一层 IPC（unix socket / named pipe），少一类「daemon 死了但 DB 还锁着」的故障模式

代价：MCP server 内存 +264 MB（fastembed init）。通过**懒启动**缓解 —— 首次有 pending 任务才 fork worker。

### D3 — 触发策略：三触发点并存

按优先级倒序：

1. **显式 CLI** `zcodegraph index --with-embeddings`（批量同步收口；本身异步，立即返回，由后台 worker 跑）
2. **FileWatcher sync 钩子**：sync 完成后 enqueue 变更文件（主路径，覆盖日常编码）
3. **MCP semantic_search read-repair**：对 missed file 同步 embed 兜底（解决「watch 期间未启动 MCP server」盲区）

**否决「纯 watch」**：watch 只在 MCP server 启动期间有效；用户连续 CLI-only 工作流下嵌入会无限滞后。

**否决「纯 read-repair」**：搜索路径上同步 embed 81 ms 会拖慢首次查询，违反 UX。

三触发点在 `embedding_queue` 表上靠 `(file_path, content_hash)` 唯一约束去重，重复 enqueue 是 no-op。

### D4 — 失败子原因接入：扩展现有 taxonomy

扩展 `src/diagnostics/fallback-summary.ts` 的 `FALLBACK_REASON_LABELS`，新增 6 个 key（沿用 1-4-1 Q3 表）：

| key | fallbackState 影响 |
|---|---|
| `embedding-model-not-downloaded` | `pending`（不进 taxonomy） |
| `embedding-model-download-failed` | `degraded` |
| `embedding-runtime-init-failed` | `degraded` |
| `embedding-vec0-load-failed` | `degraded` |
| `embedding-vec-schema-mismatch` | `degraded` |
| `embedding-stale` | `partial` |

接口设计：`buildRustHybridFallbackSummary` 接收新可选参数 `embeddingProfile?: { embeddingFailures?: Record<EmbeddingFailCode, number> }`，在 `fallback-summary.ts` 现有 `for err of input.errors` 循环之后追加第二趟循环把 `embeddingFailures` 合并进 `fallbackReasonTaxonomy`。零 schema 变更 —— taxonomy 本来就是 `Record<string, number>`。

### D5 — v0 Schema

`vec_embeddings`（vec0 虚拟表，沿用 1-4-2 spike 已实测结构）：

```sql
CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  file_path TEXT PRIMARY KEY,
  embedding FLOAT[384],
  content_hash TEXT NOT NULL,
  model_version TEXT NOT NULL,
  embedded_at INTEGER NOT NULL
);
```

`embedding_queue`（新增普通表）：

```sql
CREATE TABLE embedding_queue (
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','in_progress','done','failed'))
       NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  model_version TEXT,
  enqueued_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  PRIMARY KEY (file_path, content_hash)
);
CREATE INDEX idx_queue_status_started ON embedding_queue(status, started_at);
CREATE INDEX idx_queue_enqueued ON embedding_queue(enqueued_at);
```

关键不变量：

- `content_hash` 进 PRIMARY KEY —— 让「同文件不同 hash」自然成为新任务
- `file_path` 不单独唯一 —— 允许同一文件历史多版本（旧版本 `done`、新版本 `pending` 并存，cleanup 任务异步回收）

### D6 — 首索引时间预测模型

目标：drupal（11 501 文件）在异步嵌入模式下，结构索引 ~50 s 不被嵌入阻塞。

```
T_index = T_structural + T_enqueue_overhead + T_worker_startup

T_structural        ≈ 50.0 s   (1-4-2 baseline 实测)
T_enqueue_overhead  = N_files × T_insert
                    ≈ 11 501 × 0.1 ms ≈ 1.2 s   (WAL 单行 INSERT 实测)
T_worker_startup    ≈ 173 ms fastembed init + ~50 ms thread fork ≈ 223 ms
                     (且这是异步非阻塞)

T_index ≈ 51.5 s ≪ 100 s (2× 阈值)  ✅
```

嵌入真实完成时间 `T_embed = N × 81 ms ≈ 15.5 min`（drupal），但这是后台异步，不阻塞 agent 用结构索引。

**回归验证三件套**（1-4-3 实测必须满足）：

1. 5 语料结构索引 wall-clock 不增超 5%
2. 索引完成后 queue 表 `pending` 行数 = 被嵌入文件数（= 总文件数 − 空文件数）
3. worker 启动后台嵌入速率仍 ~81 ms/文件

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Trigger 层（三选一）                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ CLI index    │  │ FileWatcher  │  │ MCP semantic_search  │  │
│  │ --with-emb.. │  │ sync hook    │  │ read-repair          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼──────────────────┼─────────────────────┼──────────────┘
          │ INSERT OR IGNORE │                     │
          ▼                  ▼                     ▼
┌────────────────────────────────────────────────────────────────┐
│  embedding_queue 表（同库，WAL）                               │
│  PK(file_path, content_hash) / status / attempts / ...         │
└──────────────────────────┬─────────────────────────────────────┘
                           │ SELECT … WHERE status='pending'
                           │   ORDER BY enqueued_at LIMIT batch
                           ▼
┌────────────────────────────────────────────────────────────────┐
│  Embed Worker（MCP server 内嵌 worker_thread，懒启动）         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ fastembed + BGE-small-en-v1.5 (384d)                     │  │
│  │  • ONNX init ~173 ms (一次性)                            │  │
│  │  • embed 81 ms/文件                                      │  │
│  │  • 失败 → UPDATE queue SET status='failed', last_error   │  │
│  └────────────────────────────┬─────────────────────────────┘  │
└───────────────────────────────┼────────────────────────────────┘
                                │ INSERT INTO vec_embeddings
                                ▼
┌────────────────────────────────────────────────────────────────┐
│  vec_embeddings（vec0 虚拟表，384d，同库共存）                 │
│  → MCP semantic_search 走 KNN k=5 ≈ 1.5 ms (1-4-1 实测)        │
└────────────────────────────────────────────────────────────────┘
```

## Failure Modes

| 失败场景 | 检测点 | 处理 |
|---|---|---|
| 模型未下载 | worker 启动时检查 `.zcodegraph/models/` | 触发按需下载；失败则 `embedding-model-download-failed` |
| onnxruntime init 崩溃 | worker try/catch | queue 项标 `failed` + `embedding-runtime-init-failed` 计数 +1 |
| vec0 加载失败 | DB open 时 allowExtension + load | 整个 P2 功能 disable，`embedding-vec0-load-failed` |
| vec schema 不匹配 | 启动时 PRAGMA table_info | refuse + `embedding-vec-schema-mismatch` |
| 嵌入与 AST 不一致 | content_hash 比对 | `embedding-stale` → re-enqueue |
| Worker 崩溃 | watchdog + queue `in_progress` 超时 | 重置为 `pending`，attempts+1；attempts>3 → `failed` |

## Consequences

### Positive

- 首索引 2× 阈值重新可满足：drupal 从 18.4 min → ~51.5 s
- 三触发点互相兜底，CLI-only / MCP-only / mixed 工作流都被覆盖
- 嵌入失败可观测、可恢复、可诊断 —— 不污染六词健康词汇，只扩展子原因
- 零 schema 变更：复用 `fallbackReasonTaxonomy` 扩展；`vec_embeddings` 与 `embedding_queue` 都是新增表，不动既有 DDL

### Negative

- MCP server 内存基线 +264 MB（懒启动后）
- 多一个 worker_thread 生命周期要管（崩溃恢复 / 优雅关停）
- 嵌入与结构索引存在窗口期不一致 —— agent 拿不到「刚刚写入的文件」的语义检索结果；通过 read-repair 在查询路径上兜底

### Neutral

- 嵌入完成度不在 `status` 6 态主词汇里新增 —— 走 `pending` + taxonomy 子原因
- 磁盘增量与 1-4-2 实测一致（flask/django Δ=0，express Δ=118%，drupal Δ=5.5%）—— 异步化不改变磁盘成本

## References

- Roadmap: `docs/plans/capability-harvest-roadmap.json` → 节点 `1-4-27`
- 1-4-1 spike: `docs/evidence/2026-10-26-p2-embedding-three-questions-gate.md`
- 1-4-2 阈值实测： `docs/evidence/2026-10-26-p2-embedding-thresholds.md`
- 相关契约： `docs/contracts/schema-evolution-and-mcp-tool-cap-v1.md`
- 现有 fallback 状态机： `src/indexing/rust-hybrid-contract.ts`
- 失败子原因渲染： `src/diagnostics/fallback-summary.ts`
- 实施入口（1-4-3+）：`src/db/sqlite-adapter.ts` (`allowExtension`)、`src/sync/watcher.ts` (sync 钩子)、`src/mcp/tools.ts` (semantic_search read-repair)
