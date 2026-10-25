<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `capability-harvest-roadmap.json` | 最后更新: 2026-10-23 23:23:35

[~][X+] 1. ZCodeGraph 能力汇集路线图
    ├── [!][X+] 1-2. P0 好用性优先（agent 高频缺口）
    │   └── [X][X+] 1-2-21. P0a Rust 核心 export 包裹函数 JSX 使用边 + parity 对齐（承接 1-2-10 D 类产品 bug）
    │   ... 该层还有 12 个兄弟，0 个 in_progress ▸
    ... 该层还有 3 个兄弟，1 个 in_progress ▸
<details><summary>阻塞链：4 个节点被阻塞</summary>

- 1-2. P0 好用性优先（agent 高频缺口） ← e1: 1-1. P-1 验证冲刺（先行 gate） [~]
- 1-3. P1 高价值理解增量 ← e2: 1-1. P-1 验证冲刺（先行 gate） [~]
- 1-4. P2 可选本地混合语义检索 ← e3: 1-1. P-1 验证冲刺（先行 gate） [~]
- 1-4-2. P2 量化阈值实测（5 语料端到端） ← e12: 1-4-1. P2 立项前三问硬验收 [ ]

</details>


### 已闭环：1-2-21. P0a Rust 核心 export 包裹函数 JSX 使用边 + parity 对齐（承接 1-2-10 D 类产品 bug）

**决策：**
- Q: exit criteria → ① tests/rust-index-engine-cli-language-smoke.test.ts 2 用例全绿；② tests/rust-index-engine-cli-esm-value-token.test.ts 1 用例全绿；③ tests/rust-parity.test.ts 1 用例全绿（含 parity kind 差异在 acceptableRustPhase1Differences 登记或对齐）；④ 不回归 extraction.test.ts 278/278 与 rust-hybrid e2e；⑤ cargo build + tsc 后连跑 3 次相关文件结果一致。
- Q: 承接来源（2026-10-23） → 1-2-10 D 类勘察（2026-10-22）判定的 3 个产品 bug 文件，CLASSIFY.md 承诺『另立节点』但 1-2-11 被 explore 压缩占用导致该承诺未兑现，遗留至今。本节点正式承接：tests/rust-index-engine-cli-language-smoke.test.ts (2 用例) + tests/rust-index-engine-cli-esm-value-token.test.ts (1 用例) + tests/rust-parity.test.ts (1 用例)。根因：crates/zcodegraph-core/src/lib.rs visit_js_node 对 export_statement 包裹的 function-like 节点，从 current_from_node_id（file）而非 child_from_node_id（component）发 JSX refs，导致 <ChildWidget /> 等 JSX 使用只产 file→import 边、丢失 ParentWidget→ChildWidget 的 calls/instantiates 边。parity 另有 kind=component vs function 的 TS/Rust 引擎口径差异需对齐或登记 acceptableRustPhase1Differences。
- Q: Root cause（2026-10-23  fixture 实证） → 不是 CLASSIFY.md 推断的『visit_js_node 用错 current_from_node_id』，而是 runJsFrameworkRouteBackfill 的 isBackfillNodeId 误删 Rust 核心产的 component 节点。证据链：(1) rust core 直跑 .tsx 产 hash-id component 节点（component:e907db...）+ contains 边，end_line=函数尾正确；(2) 经 zcodegraph index --engine rust 跑同一 fixture，hash-id 节点消失，只剩 react.ts regex backfill 产的 line-id 节点（component:Parent.tsx:ParentWidget:2，end_line=start_line）；(3) isBackfillNodeId 用 startsWith('component:')，hash-id 也匹配 → rust core 节点被当 prior backfill 删掉；(4) react.ts regex 产的节点 end_line=start_line → reactJsxChildEdges synthesizer sliceLines(content, startLine, endLine) 只拿到函数头一行，扫不到 JSX tag → 不产 calls 边；(5) rust core visit_js_node 推的 JSX references ref 的 from_node_id 指向已删除的 hash-id component → resolveReferencesBatched 无法解析，边消失。同 bug 影响所有 backfill 前缀（route:/hook:/component:/fabric-component:/fabric-prop:），因为 rust core 对 Go route、Rust route、Axum route 也用同前缀 hash-id。
- Q: 修复方案选型 → 选 A：修 isBackfillNodeId 的 id 判定，不改 rust core。理由：(a) rust core 的 hash-id 是历史契约，改了会波及其他语言 backfill（rust-java/kotlin/scala/objc/swift/python/ruby/php 的 route 节点全是 hash-id）；(b) backfill id 的结构特征是『<prefix>:<filePath>:<至少一段>』≥3 段冒号分隔，rust core hash-id 只有 1 个冒号——加段数检查即可精准区分；(c) 1-4-2-9 引入 backfill 时 BACKFILL_NODE_PREFIXES 设计就预设了 line-id 格式，但 startsWith 判定没把 rust core 的 hash-id 排除，是疏漏。修复后 react.ts regex 仍然会对 .tsx 文件产 line-id component 节点——需要再判定是否保留这份重复节点：保留（ rust core 节点用于图边锚定+end_line；regex 节点供 synthesizer 扫源码）。测试期望 kind=component 命中任一即可，不冲突。注意 rust core 的 JSX references ref 仍会失效（from_node_id 指向 rust hash-id component，但该节点的 end_line 现在正确），所以不需要在 rust 端改 from_node_id。
- Q: type-position 漏网 bug（esm-value-token test 152 行） → A+B1 落地后 esm-value-token 测试在 152 行仍失败：type-position.ts 的 `(value: ServiceToken)` 仅类型位置使用，但 rust core 把类型注解 references ref 计入 has_value_usage → 触发 rust-esm-value-token-interface 终判，向 constant 产 rust-finalization 边，违反测试『type-only 不得产任一边』。修法：新增 `unresolved_refs.metadata` 列（schema.sql + 旧库惰性 ALTER 保证），`extract_ts_type_annotation_refs` 给类型注解 ref 打 `{"tsTypeAnnotation":true}` 标记；`load_imported_symbol_usage_refs`（仅 value-token/interface 终判与 overload usage 两处消费）新增 `AND (metadata IS NULL OR metadata = '')` 过滤。效果：类型注解 ref 仍是 `references`（1-2-10-2 跨语言 type/import gate 不受影响，extraction.test.ts:2878 仍绿），但不再被误算为值使用。view.tsx 的 JSX references 不带标记 → 照常算值使用命中 constant；type-position.ts 仅类型使用 → has_value_usage=false → 落 fallback 采样 `direct-export-candidate-multiple`（candidateCount=2），不产 rust-finalization 边。未改 EdgeKind / 未动 1-2-10-2 gate，最小作用面。
- Q: exit criteria 验收（2026-10-25） → 全满足并 close：① language-smoke 21/21 绿；② esm-value-token 1/1 绿；③ rust-parity 2/2 绿（节点登记为可接受 Phase-1 parity 差异，无需改 kind）；④ extraction.test.ts 278/278 绿（含 1-2-10-2 跨语言 gate 2878 行），rust-hybrid e2e 无回归（reference-resolution-shape 4/4 + import-target-taxonomy 2/2 同步绿）；⑤ cargo build + tsc 后目标三文件连跑 3 次一致（每轮 24/24）。本次改动：crates/zcodegraph-core/src/lib.rs（UnresolvedRef 加 metadata + push_ref_with_metadata + walk_ts_type_annotation_subtree 打标记 + insert_unresolved_refs 持久化 + load_imported_symbol_usage_refs 过滤 + ensure_unresolved_refs_metadata_column 惰性加列）+ src/db/schema.sql（unresolved_refs 加 metadata 列）+ src/indexing/rust-js-framework-routes.ts（A+B1，前序会话）。未触碰 EdgeKind、未 bump SCHEMA_VERSION（用惰性 ALTER 保证旧库兼容）。

### 下一步可开工（ready 前 3）

- 1-1-10. codeflow hands-on 验证并回填 Unknown [ ]
- 1-3-11. 1-3-7 drupal rust core FOREIGN KEY bug 修复 [ ]
- 1-3-2. P1-1 PR 影响分析（复用 impact/affected） [ ]
<!-- ROADMAP_SECTION_END -->
