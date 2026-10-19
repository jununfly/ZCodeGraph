---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-14-rust-owned-kotlin-expect-actua
bounded-question: "What evidence does 2026-10-14-rust-owned-kotlin-expect-actual-validation provide?"
---
# Kotlin 语义增强验证（roadmap 1-2-8-5）

日期：2026-10-14
节点：1-2-8-5「Kotlin 增强：fun interface / suspend / expect-actual 语义（backlog，baseline 外）」
范围：用户决策「全量含 expect→actual implements 边」

## 背景

Kotlin 已由 1-6-1 波迁移为 Rust-owned（rust-hybrid 路径），但 baseline 刻意排除了四类语义：fun interface、suspend/expect/actual 修饰符、companion object 容器、expect→actual 配对。本波把它们补齐。

## 关键既有机制发现

`kotlin-expect-actual` synthesizer（`src/resolution/callback-synthesizer.ts`）是 full-graph 查询层 pass，读 SQLite，对 rust-hybrid 同样运行，按 **FQN-exact + kind 兼容（`kmpKindsCompatible`）+ 异文件 + 非 actual** 配对并合成 expect→actual `calls` 边。但它读 `node.decorators` 列的标记。

**Kotlin 在 TS 侧没有专用 extractor**（`EXTRACTORS` map 无 kotlin 键），`extractModifiers` 对 Kotlin 从未运行 → `decorators` 永为空 → 该 synthesizer 在两种引擎下都是 no-op。expect→actual 是端到端既有缺口。

因此本波 Rust 端唯一需要的配对改动是：**把 `expect`/`actual` 写进 `decorators` 列（JSON 字符串数组）**，既有的 qualified-name-aware 机制（无 basename 误路由）即自动激活，无需新造 resolver。

## 改动

`crates/zcodegraph-core/src/lib.rs`：

1. **`ExtractedNode.decorators: Option<String>`**（新字段）+ `insert_nodes` 写 `decorators` 列。仅 Kotlin expect/actual 设值，其余节点 NULL。
2. **fun interface → kind interface**：`extract_kotlin_class_kind` 既有循环已对 `interface` 关键字子节点返回 `interface`（`fun interface` 是 class_declaration 带 `fun`+`interface` 关键字子节点），此前从未误判，仅补文档。
3. **suspend/expect/actual → signature 前缀**：`kotlin_modifier_prefix` 仅收集 `expect`/`actual`/`suspend`（`modifiers > platform_modifier` / `function_modifier`），`kotlin_function_signature` 前缀 `X fun ...`；刻意排除 inline/operator/infix 以保持 baseline 签名稳定。不动 kind/qname/calls 边。
4. **companion_object → class 容器**：`kotlin_named_symbol` 新增 `companion_object` 分支，匿名形式产 `Companion` 类节点，成员嵌套其下（`Repo.Companion.create` 静态语义）。
5. **expect/actual → decorators 标记**：`visit_kotlin_node` 在 Kotlin 符号构造后读 `platform_modifier`，把 `expect`/`actual` 写入 `decorators` JSON 数组。

## 三层验证

### 1. cargo 单元测试
`rust_kotlin_semantics_fun_interface_suspend_companion_expect_actual` 锁四项行为；全量 **182 passed**（临时 dump 测试已删）。clippy 无本波新告警。

### 2. wave0 fixture（裸 binary + sqlite 复制）
`rust-owned-language-fixtures.test.ts` Kotlin baseline describe 新增 3 个 `it`（64→67），本地以 debug binary + Python sqlite 复制验证全 PASS。

### 3. 真实 KMP 语料 gate — ktor（ktorio/ktor，sparse: ktor-utils/ktor-io/ktor-client）

| 指标 | 值 |
|---|---|
| .kt 文件 | 943（索引 984，0 errored / files.errors 空 / kind=ERROR 0） |
| Kotlin 节点 | 22427 |
| expect 标记节点 | 116（class 23 / enum 1 / function 40 / interface 5 / method 27 / variable 20） |
| actual 标记节点 | 497（class 57 / enum 4 / function 132 / interface 10 / method 173 / property 39 / type_alias 22 / variable 60） |
| **expect+actual 可配对 FQN** | **112**（跨文件、0 同文件冲突） |
| fun interface → kind interface | 149 个 interface 节点 |
| suspend signature 前缀 | 709 个 `suspend fun ...` |
| companion object → Companion 类 | 86 个 |
| expect signature 前缀 | 67 个 `expect ...`（function/method；class/val 无 fn signature） |

示例可配对 FQN（synthesizer 将逐平台合成 expect→actual `calls` 边）：
`CharsetDecoder::decode`（expect 1 / actual 7）、`CharsetEncoder::encodeImpl`（1/7）、`Any::instanceOf`（1/3）、`Dispatchers::clientDispatcher`（1/3）。

synthesizer 边产物的 e2e 验证：`extraction.test.ts` 新增 describe「Kotlin expect/actual on rust-hybrid (roadmap 1-2-8-5)」（commonMain/jvmMain/androidMain 布局），断言每个平台 `actual` 都有回到公共 `expect` 的 `calls` 边（`synthesizedBy='kotlin-expect-actual'`），且编辑平台 impl 的 blast radius 覆盖公共声明。已注册进 ci.yml step2 `-t`。

## 结论

真实 KMP 语料零 grammar 漂移（ktor 含现代 Kotlin 全部构造），四类语义全部落地且标记数据完备。synthesizer 机制无需任何改动——填 decorators 即激活。EXTRACTION_VERSION 不 bump（unreleased）。
