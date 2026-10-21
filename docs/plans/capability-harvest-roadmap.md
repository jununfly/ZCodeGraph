<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `capability-harvest-roadmap.json` | 最后更新: 2026-10-20 21:47:30

[~][X+] 1. ZCodeGraph 能力汇集路线图
    ├── [ ][X+] 1-2. P0 好用性优先（agent 高频缺口）
    │   ├── [~][X+] 1-2-3. P0a token 输出优化（GCF 式压缩）
    │   ... 该层还有 9 个兄弟，0 个 in_progress ▸
    ... 该层还有 3 个兄弟，0 个 in_progress ▸
<details><summary>阻塞链：6 个节点被阻塞</summary>

- 1-2-5. P0b find_dead_code 首版（限 3-5 语言） ← e4: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ], e7: 1-2-4. P0b 冻结《死代码判定 rubric v1》 [ ]
- 1-2-6. P0b 圈复杂度（查询时计算，零 schema 变更） ← e5: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ]
- 1-3-1. P1 准入：图质量门禁（degraded 降个位数） ← e11: 1-2-8. 横切：架构回归红线 + 能力健康探针 [ ]
- 1-3-2. P1-1 PR 影响分析（复用 impact/affected） ← e8: 1-3-1. P1 准入：图质量门禁（degraded 降个位数） [ ]
- 1-3-3. P1-2 Spring bean/DI 语义扩展（剔除数据源） ← e6: 1-2-7. 横切：schema 演进条款 + MCP 工具收口 ≤12 [ ], e9: 1-3-1. P1 准入：图质量门禁（degraded 降个位数） [ ]
- ... 另有 1 个节点被阻塞未列出

</details>


### 当前施工：1-2-3. P0a token 输出优化（GCF 式压缩）

**决策：**
- Q: Q3 探针集与显著性 → (a) 复用 1-1-4 固定探针集与 baseline 脚本，新增 --compress 开关做 A/B，看 p95 token 下降（exit criteria ②）
- Q: Q1 压缩目标面 → (a) 只压 collectContext / context markdown —— agent 最高频消费路径，不动 callers/callees/impact/search 与 CLI query
- Q: Q4 落地形态 → (a) 新 MCP 工具参数 collect_context({ compress: 'skeleton' })，向后兼容，不新增 MCP 工具（1-2-7 ≤12 红线）
- Q: Q2 GCF 式压缩语义 → (b) budget-aware truncation + 引用占位（超 budget 用 …<id> 占位可回查），默认 L1=签名+调用边视图
- Q: 实现面澄清（动工前发现） → MCP 无 zcodegraph_context 工具；Q1 的 collectContext/context markdown 实际对应两条面：(A) CodeGraph.collectContext Library API（formatter.ts 产 markdown），(B) zcodegraph_explore MCP 工具（explore-planner 产 markdown，走 findRelevantContext + glue + budget）。二者 markdown 产出路径不同。
- Q: 实现面选择 → (b) 压 B 面 = MCP zcodegraph_explore 输出。实现点 src/mcp/explore-planner.ts 渲染层，加 budget-aware 截断 + …<id> 占位回查。P0a=agent 高频缺口，agent 走 MCP explore 而非 Library collectContext。exit criteria ① 对齐方式：1-1-4 contract 的 collectContext cliCalls 换成 explore，numerator 定义随 contract bump v2。
- Q: S1 切片设计 → 最小可行切片（round 1/2）：不动现有 budget 机制，只在 explore-renderer.ts 加 GCF 式结构化占位。当 cluster 被 drop / file 被 skip / output 被 hard-ceiling 截断时，插入机器可解析占位行，格式 ，并在末尾输出 elided manifest 统计。现状缺口：现有截断是隐形的（do NOT Read + Not shown above），无 per-symbol 可回查 ID。S1 exit：新增占位行数 >0；output 字节数 ≤ 现状 +5%（占位本身是小开销）；explore 现有 e2e 全绿。
- Q: 占位符 schema v1（契约 freeze） → 占位行格式（单行 markdown，机器可解析，agent 可读）：`> … elided[{kind}#{ref} L{startLine}-{endLine} ~{estChars}c] — zcodegraph_explore("{queryHint}") for full body`。字段：kind ∈ file|cluster|section|output；ref = filePath[#symbolName]；estChars = 估计被省略的字符数；queryHint = 给 agent 的回查关键词（通常=symbolName 或 filePath basename）。插入点：(a) per-file skip 时（fileNecessary=false && 超 budget）在 Source Code section 末尾插一行 kind=file；(b) cluster 被 drop 时在该 file section 末尾插一行 kind=cluster；(c) hard-ceiling 截断时替换现有的 "(output truncated to budget)" 尾部为 kind=output 占位 + 简短说明。尾部不再额外追加 manifest（避免重复）——"Not shown above" section 已有 file 级列表。开关：CODEGRAPH_EXPLORE_ELIDED_MARKERS=0 可关（默认开）。
- Q: S1 实施完成证据 → 实现 src/mcp/explore-renderer.ts：(a) 新增 formatElidedMarker + elidedMarkersEnabled（CODEGRAPH_EXPLORE_ELIDED_MARKERS=0 关闭）；(b) per-file skip 时收集 skippedFileMarkers（cap 5）并在 Source Code 末尾以 '### Elided for budget — re-explore by name' 小节 flush；(c) cluster 被 drop 时在该 file section 末尾插 kind=cluster 占位（cap 3 + '+N more' 聚合）；(d) hard-ceiling 截断把 legacy '(output truncated)' 尾部换成 kind=output 占位 + 保留 do-NOT-Read 引导。测试 tests/explore-renderer.test.ts 加 5 个用例（formatElidedMarker schema / 无 range&size 省略 / hint 字符清洗 / hard-ceiling 触发 / env 关闭回退 legacy）。tsc --noEmit 绿；explore-renderer 9/9、explore-planner 133/133、self-query-explore-flow 1/1 全绿。

### 下一步可开工（ready 前 3）

- 1-2. P0 好用性优先（agent 高频缺口） [ ]
- 1-2-10. P0a 测试基础设施加固（Windows flake 治理） [ ]
- 1-2-4. P0b 冻结《死代码判定 rubric v1》 [ ]
<!-- ROADMAP_SECTION_END -->
