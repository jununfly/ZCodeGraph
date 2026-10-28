---
doc-kind: evidence
roadmap-node: 1-4-29
date: 2026-10-26
---
# 1-4-29 P2 异步嵌入管线 - 运行时（worker + watcher 钩子 + read-repair + CLI flag）

承接 1-4-28 硬底盘（schema v6 + queue + taxonomy），本节点把 ADR-0009 的运行时三件套落地：worker_threads 工作线程、FileWatcher sync 钩子、zcodegraph_search read-repair、`zcodegraph index --with-embeddings / --wait-embeddings` CLI flag。

## 交付清单

| 文件 | 类型 | 作用 |
|---|---|---|
| `src/embedding/worker.ts` | 新增 | worker_threads 入口。懒加载 fastembed（ESM dynamic import）+ vec0 lazy-load + `claimPendingEmbeddings`/`markEmbeddingDone`/`markEmbeddingFailed`/`resetStaleInProgressEmbeddings` 批处理循环。 |
| `src/embedding/worker-runner.ts` | 新增 | 主进程 runner 单例。懒启动 + 30s 空闲 terminate + 崩溃自动重置 in_progress + `drainAndExit` CI 收口路径。`embeddingEnabled()` 提供 env 开关单点。 |
| `src/embedding/vec0-path.ts` | 新增 | vec0 路径解析：`CODEGRAPH_VEC0_PATH` env > `<pkgRoot>/vendor/sqlite-vec/` > `<projectRoot>/.zcodegraph/models/`。 |
| `src/index.ts` | 修改 | `CodeGraph.watch()` 包 syncFn 在 sync 完成后调 `enqueueEmbeddingForChangedFiles`；新增 `enqueueEmbeddingReadRepair()` 公共 read-repair 入口；新增 `runEmbeddingPipeline()` 供 CLI flag 调用。 |
| `src/mcp/tools.ts` | 修改 | `handleSearch` 尾部在 `embeddingEnabled()` 为真时调 `cg.enqueueEmbeddingReadRepair(hitPaths)`。 |
| `src/bin/zcodegraph.ts` | 修改 | `zcodegraph index` 新增 `--with-embeddings` / `--wait-embeddings` 两 flag + `runEmbeddingFlags` helper（quiet / 非 quiet 两路都接）。 |
| `tests/embedding-runtime.test.ts` | 新增 | 17 个 case：env 门、runner 单例、read-repair 队列转移、watcher 钩子包装、CLI enqueue 幂等。 |

## 决策映射（ADR-0009 → 代码）

| ADR 条目 | 落点 |
|---|---|
| D1 队列持久化介质（SQLite 同库） | queue.ts (1-4-28) 已落 |
| D2 Worker 部署（MCP server 内嵌 worker_threads + 懒启动） | `worker-runner.ts` `EmbeddingRunner.forDatabase()` 单例 + 30s idle shutdown |
| D3 三触发点并存 | ① CLI flag → `runEmbeddingPipeline()` ② watcher 钩子 → `CodeGraph.watch` syncFn 包装 ③ read-repair → `zcodegraph_search` handler |
| D4 失败子原因 taxonomy | 1-4-28 落 5 个 key；本节点在 worker 内 `embedding-model-not-downloaded` / `embedding-embed-failed` / vec0 加载失败路径都把 row 标 `pending`/`failed`，靠 watchdog 续跑 |
| D5 v0 schema | 1-4-28 落 `embedding_queue`；`vec_embeddings` 由 worker 启动时 `CREATE VIRTUAL TABLE IF NOT EXISTS` 幂等创建 |
| D6 首索引时间模型 | 不在本节点验证（属 1-4-3+ 回归基准三件套） |

## 模块格式坑（已落 decision Q1-补）

- 仓库是 CJS（`package.json` 无 `type:module`），`worker.ts` 编译为 `dist/embedding/worker.js` CJS。主进程用 `new Worker(path.join(__dirname, 'worker.js'), ...)`。
- fastembed ^1.14.3 是 ESM-only，CJS 不能 `require`。worker 用 `new Function('specifier','return import(specifier)')` 绕过 tsc 的 CJS-module 转换（与 `src/bin/zcodegraph.ts` 的 `importESM` 同款 trick）。
- `@types/node ^20` 还没有 `node:sqlite` 类型，worker 内用 `require('node:sqlite')` + 局部 interface 声明（与 `src/db/sqlite-adapter.ts` 同款 trick）。

## 关键不变量

1. **worker 不内嵌 fastembed**——`fastembed`/`onnxruntime-node` 不在主 `package.json`；worker 启动时 `await import('fastembed')` 懒探测，失败仅 warn + 队列保持 `pending`。
2. **三触发点去重**——`embedding_queue` PK `(file_path, content_hash)` + `INSERT OR IGNORE`；任何触发点重复 enqueue 都是 no-op。
3. **opt-in 单点**——`embeddingEnabled()` 是唯一的 env 判断函数；watcher 钩子、read-repair、CLI flag 都走它。
4. **首次搜索零延迟**——read-repair 仅 enqueue，不同步 embed（ADR-0009 否决纯 read-repair 同步路径的核心理由）。
5. **CI 收口语义**——`--wait-embeddings` 把 `permanentFailureOnModelMissing=true` 传给 worker，模型缺失直接 `failed` 而不是无限 requeue。

## 测试矩阵

```
tests/embedding-queue.test.ts       10 cases (1-4-28 hard floor, 不回归)
tests/rust-hybrid-fallback-summary  14 cases (1-4-28 taxonomy, 不回归)
tests/embedding-runtime.test.ts     17 cases (本节点)
tests/extraction.test.ts (TS 子集)  26 cases (不回归)
tests/watcher.test.ts + sync.test.ts + watch-policy.test.ts  39 cases (不回归)
```

合计 96 个测试全绿。

## 不在本节点范围（留 1-4-3+ / 后续节点）

- D6 回归基准三件套（5 语料 wall-clock / pending 行数 = files 数 / 81ms/文件速率）。
- `vec_embeddings` 与结构索引的窗口期一致性测试（需要真实 fastembed + vec0 环境）。
- 语义检索独立 MCP 工具（schema-evolution-and-mcp-tool-cap-v1 Clause 2 约束下需另立节点评估）。
- 队列 cleanup（旧 content_hash 的 `done` 行异步回收，ADR-0009 D5 提及）。
