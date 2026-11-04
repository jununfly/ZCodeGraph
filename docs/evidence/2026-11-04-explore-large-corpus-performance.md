# 1-3-5 大仓 Explore 热查询性能优化报告

**日期**：2026-11-04
**节点**：1-3-5（大仓性能优化）
**Scope**：Product execution
**结论**：**本节点的 Kubernetes 大仓热查询工程目标通过；完整 v2 验收仍未执行，1-3-4 的 NO-GO 不因此解除。**

## 1. 优化范围与根因

真实 Kubernetes 索引包含 **24,429 files / 483,541 nodes / 779,307 edges**。调用级剖析显示，秒级延迟主要来自 `findRelevantContext` 的重复 SQL 与聚合读取，而不是图遍历：

- `name = ? COLLATE NOCASE` 未利用已有 `idx_nodes_lower_name`；
- 同一次及相邻 explore 重复执行文本、子串、精确名称及空结果查询；
- 每题重复计算核心文件聚合、全量节点名称及图统计。

本轮只修改 `src/db/queries.ts`，不改变 Explore 搜索预算、候选数量、通道或排序规则：

1. 精确名称谓词改为 `lower(name) = ?` 并绑定小写参数，使用已有表达式索引；未增加 schema migration。
2. 为文本搜索、子串、精确名称、精确文件集合增加**每类至多 1024 项的 LRU 读缓存**；1024 项用于覆盖 12 道大仓问题的 >600 个累计查询键，不是无限缓存。
3. 缓存核心文件聚合、节点名称和图统计；缓存返回副本，避免调用方重评分、排序或截断污染缓存。
4. 节点、边、文件写入、`clearCache()` 和 `clear()` 统一失效读模型；`insertValidatedEdges` 的旁路事务也显式失效。
5. 搜索缓存键规范化 kinds/languages 数组顺序，避免同语义过滤条件产生重复项。

## 2. 测量方法

输入：`docs/baselines/semantic-retrieval-human-frozen-v2.json`。
脚本：`scripts/measure/explore-large-corpus-performance.mjs`。
臂：仅 `baseline-explore`，不运行 C0/C1/C2。

- Kubernetes、Rails 各取 12 道冻结 holdout 问题，每仓串行执行 4 轮，共 48 次；rounds 1–3 形成 36 次热查询观测。
- 每轮每题调用 `plan(cg, query, { maxFiles: 10 })`，记录耗时、rank 和返回文件列表。
- 两仓测量串行执行；并行双仓测量受资源争用，已舍弃，不作门禁证据。
- 参考环境：Windows 10.0.26300、AMD Ryzen AI 9 HX 370、Node v22.22.2、win32/x64。
- 逐题原始结果及冻结集 SHA-256：[`2026-11-04-explore-large-corpus-performance.json`](2026-11-04-explore-large-corpus-performance.json)。

## 3. 最终结果

| Corpus | 首轮不同问题 p50 / p95 / max | 热 p50 | 热 p95 | 热 max | 四轮文件列表一致 |
| --- | ---: | ---: | ---: | ---: | --- |
| Kubernetes | 1238.4 / 3307.2 / 3307.2 ms | **28.8 ms** | **57.7 ms** | 63.9 ms | 是 |
| Rails | 188.0 / 439.9 / 439.9 ms | **25.6 ms** | **30.7 ms** | 31.6 ms | 是 |

| 工程检查 | 阈值 | Kubernetes 结果 | 判定 |
| --- | ---: | ---: | --- |
| 热 p50 | ≤150 ms | 28.8 ms | 通过 |
| 热 p95 | ≤250 ms | 57.7 ms | 通过 |
| 大仓热 p95 | ≤500 ms | 57.7 ms | 通过 |

相对 1-3-4 的 Kubernetes 热 p50 **11,380 ms**，本次为 **28.8 ms**，点估计约降低至原来的 **1/395**。两者用于说明优化幅度，不替代同协议独立验收。

### 效果与确定性对照

| Corpus | Hit@1 | Hit@5 | Hit@10 | MRR |
| --- | ---: | ---: | ---: | ---: |
| Kubernetes | 0.0833 | 0.0833 | 0.0833 | 0.0833 |
| Rails | 0.1667 | 0.2500 | 0.4167 | 0.224355 |

Rails 首轮 Hit@5 / Hit@10 与 1-3-4 baseline 的 0.250 / 0.417 一致；Kubernetes 首轮 Hit@1 / Hit@5 / Hit@10 / MRR 与此前 baseline 数值一致。两仓每题四轮返回文件列表完全一致。这是有限的效果回归对照，不是新的候选效果声明。

## 4. 回归验证

TypeScript 编译通过；以下 7 个测试文件共 **235/235** 通过：

- `tests/explore-planner.test.ts`：133
- `tests/context-ranking.test.ts`：9
- `tests/db-perf.test.ts`：20
- `tests/foundation.test.ts`：27
- `tests/graph.test.ts`：24
- `tests/sync.test.ts`：14
- `tests/adaptive-explore-sizing.test.ts`：8

缓存回归覆盖空结果、LRU 上限、过滤键规范化、调用方变异隔离、节点/边写入失效、`insertValidatedEdges` 批量旁路和显式缓存清理。SQL 执行计划确认 `lower(name) = ?` 使用 `idx_nodes_lower_name`；100 个大写名称抽样与旧谓词结果无差异，不将其表述为全 Unicode 等价性证明。

## 5. 未解除的门与后续边界

| 项目 | 状态 |
| --- | --- |
| Fresh-process / model-load cold start | **未测量**；脚本明确输出 `freshProcessColdStartMs: null` |
| 首轮不同问题 | 仅作诊断；Kubernetes 仍有约 0.6–3.3 秒，不能称为冷启动达标 |
| v2 热延迟协议 | 本轮仅 4 轮，未满足至少 30 次热复测的完整协议 |
| 候选效果、exact-name 安全与全部门禁 | 未重跑；1-3-4 NO-GO 保持 |
| 内存、存储、索引开销、运行降级 | 未在本轮复验 |
| Agent-value / opt-in 集成 | 未获本报告授权 |

因此，1-3-5 只关闭“24k 文件大仓热查询性能优化”范围。任何后续 GO 必须重新执行独立完整验收，不能把本次工程测量改写为 1-3-4 的效果或资源通过。

## 6. 复跑

```bash
node node_modules/typescript/bin/tsc
node scripts/measure/explore-large-corpus-performance.mjs --corpus kubernetes --out .tmp/measure/explore-kubernetes-performance-final.json
node scripts/measure/explore-large-corpus-performance.mjs --corpus rails --out .tmp/measure/explore-rails-performance-final.json
```

脚本默认从 `C:/workspace/measure-corpus/<corpus>` 打开已建索引，可用 `--corpus-root` 指定其他语料根目录；不会重建索引或修改冻结标签。