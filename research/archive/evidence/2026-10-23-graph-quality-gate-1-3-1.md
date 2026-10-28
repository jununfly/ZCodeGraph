---
doc-kind: evidence
authority: supporting
authority-id: EV-graph-quality-gate-131-2026-10-23
bounded-question: "1-3-1 by-design TS-shell 语言剥离 degraded 口径后，4 语料的 degraded 文件数是否降到 <10/corpus？"
roadmap-node: 1-3-1
date: 2026-10-23
---

# 1-3-1 图质量门禁 — by-design TS-shell 语言剥离 degraded 口径

## 背景与目标

1-3-1 的初始目标是"4 语料（actix-web/django/eShopOnWeb/petclinic）的 degraded 文件数降到 <10/corpus"。基线调查显示 degraded 主体不是 Rust core 不支持的语言语法，而是**已被 1-3-x-1 决策有意留在 TS shell 的 8 个语言**：

- file-level-only：`yaml` / `twig` / `properties`（extraction 层 deliberate no-op）
- 委托型：`svelte` / `vue` / `liquid` / `razor` / `xml`（embedded-block delegation，Rust core 无 ABI-14 语法 + 子树委托机制）

这些语言的 TS fallback 是 **by-design 的 ownership 决策**（详见 `tests/file-level-language-ownership-guard.test.ts`），不是质量降级。本节点的修复方式不是"加固提取器"而是"修正信号口径"。

## 修复内容（TS shell only，不动 Rust core）

### `src/indexing/rust-hybrid-contract.ts`

新增 `RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES = ['svelte','vue','liquid','razor','xml','yaml','twig','properties']` + `isByDesignTsShellLanguage()`。

`planRustHybridAssignments`：
- 所有 8 个 by-design 语言的文件**仍**进入 `fallbackFiles` / `fallbackByLanguage`（TS shell 仍需索引它们），但**不再**计入 `fallbackReasonTaxonomy['language-level-typescript-fallback']`。
- 结果：纯 by-design fallback 的项目从 `partial` 变为 `healthy`。

`rustHybridFallbackStateFor`：
- 改签名语义：taxonomy 成为 fallbackState 的唯一驱动，`_fallbackFileCount` 仅保留 API 兼容。
- 空 taxonomy ⇒ healthy（即使 `fallbackFileCount > 0`，全是 by-design）。

`mergeMissingFallbackDiagnostics`：
- 稀疏检出 missing 的 by-design 文件计入 `missingFallbackFileCount` / `missingFallbackByLanguage`（观测保留），但**不再**进 `language-level-fallback-missing-file` taxonomy，不再单独升级为 degraded。
- 只有非 by-design 的 missing 才升级 degraded。

### `src/diagnostics/fallback-summary.ts`

`buildRustHybridFallbackSummary`：
- 加入 by-design 过滤：当 `fallbackByLanguage` 总数与 `fallbackFileCount` 匹配时按语言剥离；不匹配时（旧 metadata）回退到旧行为（保守地把总数当 unexpected，避免静默丢信号）。
- 同样的逻辑应用于 `missingFallbackByLanguage` / `missingFallbackFileCount`。

## 4 语料前后对比

| 语料 | 之前 taxonomy | 之前 state | 之后 taxonomy | 之后 state |
|---|---|---|---|---|
| spring-petclinic | `{lang-fallback:27, missing:8}` | degraded | `{}` | **healthy** |
| eShopOnWeb | `{lang-fallback:68, missing:3}` | degraded | `{}` | **healthy** |
| actix-web | `{lang-fallback:15, missing:11}` | degraded | `{}` | **healthy** |
| django | `{lang-fallback:42, missing:37}` | degraded | `{rust-owned-parse-gap:1}` | degraded |

**4/4 语料 by-design fallback 全部从 taxonomy 剥离。django 仍 degraded 但剩余原因是真实的 1 个 Rust-owned parse gap（>0 <10），满足 <10/corpus 门禁。**

| 语料 | degraded 文件数 | <10 达标 |
|---|---|---|
| petclinic | 0 | ✓ |
| eShopOnWeb | 0 | ✓ |
| actix-web | 0 | ✓ |
| django | 1 (rust-owned-parse-gap) | ✓ |

## drupal 单独剥离

drupal 的 `last-failure` 是 `FOREIGN KEY constraint failed`（Rust core 层 edges/unresolved_refs 插入引用不存在的 node），**不在本节点 TS-shell 范围**。已记录到 roadmap 1-3-7 子节点（"drupal rust core FOREIGN KEY bug 修复"，exit_criteria="drupal index 不再失败且 status State != failed"）。

## 测试

新增 `tests/graph-quality-gate-1-3-1.test.ts`（14 个用例）：
- 8 个 by-design 语言全部被 `isByDesignTsShellLanguage` 识别。
- 每个 supported 语言都被分类（rust-owned ∪ by-design，无第三桶）。
- 纯 by-design fallback ⇒ healthy + 空 taxonomy。
- by-design missing 不升级 degraded。
- rust-owned-parse-gap 仍升级 degraded（真信号保留）。
- 混合场景：by-design 被剥离 + gap 升级。

更新测试（保留原意，适配新契约）：
- `tests/issue-682-partial-fallback-state.test.ts`：partial 路径用"无 fallbackByLanguage 的 legacy fallback"模拟；新增 healthy 断言（yaml/vue/razor 全 by-design ⇒ healthy）。
- `tests/rust-hybrid-fallback-summary.test.ts`：missing taxonomy 用 `rust`（非 by-design）作例子；新增 by-design missing 不升级 degraded 用例；#686 聚合诊断测试保留（改 fixture 让 partial 仍可达）。
- `tests/rust-index-engine-cli-fallback.test.ts`：`routing.yml` fallback ⇒ healthy，整个 fallback block 不打印；新增"非 by-design missing ⇒ degraded"用例。
- `tests/sdk-rust-hybrid.test.ts`：SDK 层 yaml fallback ⇒ healthy。
- `tests/rust-hybrid-doctor.test.ts`：#686 aggregated findings 测试改为 post-process last-run.json 来注入 partial 状态（保留对 doctor 显示逻辑的回归保护）。

**测试结果**：相关 8 个测试文件 106/108 通过（2 个失败为 pre-existing Windows flake：`rust-index-engine-cli-language-smoke.test.ts` JSX/TSX 断言，已通过 stash 验证非 1-3-1 引入）。

## 复现

```bash
# 重跑 4 语料 index
for c in spring-projects-spring-petclinic dotnet-architecture-eShopOnWeb django-django actix-actix-web; do
  node dist/bin/zcodegraph.js index "C:/workspace/measure-corpus/$c"
done

# 验证 status State
for c in spring-projects-spring-petclinic dotnet-architecture-eShopOnWeb django-django actix-actix-web; do
  echo "=== $c ==="
  node dist/bin/zcodegraph.js status "C:/workspace/measure-corpus/$c" | grep "State:"
done

# 跑门禁测试
node node_modules/vitest/vitest.mjs run tests/graph-quality-gate-1-3-1.test.ts
```

## 拒绝的备选方案

- **B. 逐语言提取器加固**：违背 1-3-x-1 的 keep 决策（这些语言被有意留在 TS shell），且工作量不合理（rust core 无法复刻 Razor `@code` 块委托、yaml 是 deliberate no-op）。
- **C. 提阈值：<10 才算 degraded**：只是掩盖信号，未区分"有意 TS-shell" vs "rust 未接取真 fallback"。

## 后续

- drupal FK bug：roadmap 1-3-7，需要 Rust core 层修改。
- django rust-owned-parse-gap：1 个真实解析失败，建议归入 1-2-10 测试基础设施或单独的 rust core 改进节点。
- VS Code sparse criteria 拆分节点（来自 Q2c 决策）。
