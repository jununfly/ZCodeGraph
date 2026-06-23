## ZJ Roadmap

> 数据文件: `2026-06-23-rust-indexing-ts-replacement-readiness-roadmap.json` | 最后更新: 2026-06-23 23:59:53


<!-- ROADMAP_TREE_START -->
<!-- 由 zj-roadmap-driven 自动生成，请勿手动编辑 -->
[x] 1. Rust indexing TypeScript replacement readiness → EXPLORE
  [x] 1-1. Rust-owned language coverage boundary → EXPLORE
  [x] 1-2. Rust-owned semantic coverage boundary → EXPLORE
  [x] 1-3. Rust-hybrid fallback product contract → EXPLOIT
  [x] 1-4. Replacement readiness decision → EXPLOIT
  [~] 1-5. Reduce TypeScript fallback surface by migrating Rust-owned languages → EXPLOIT
    [ ] 1-5-1. Rust-owned Python indexing v1 → EXPLOIT
    [x] 1-5-2. Eliminate TypeScript indexing dependency for current Rust-owned languages → EXPLOIT
<!-- ROADMAP_TREE_END -->

### 决策历史

| 节点 | 问题 | 答案 | 备注 |
|------|------|------|------|
| 1-1 | Can Rust cover all currently supported product languages? | No. | Rust core SourceLanguage currently covers JavaScript, JSX, TypeScript, TSX, MTS, CTS, and Go; README-supported languages include Python, Java, C#, PHP, Ruby, C/C++, Swift, Kotlin, Scala, Dart, Svelte, Vue, Liquid, Pascal/Delphi, Lua, and Luau. |
| 1-2 | Can Rust replace TS semantic behavior for JS/TS-owned files now? | Not fully; it is much closer, but still bounded. | Recent work completed TypeScript moduleResolution semantic frontier slices, including JSON resolveJsonModule file-level edges. However research/no-go boundaries remain for typesVersions, symlink identity, package-manager edge cases, type graph semantics, and broader declaration/runtime exactness. |
| 1-3 | Should the product remove TypeScript indexing now? | No; keep TypeScript as fallback and explicit escape hatch. | PRD and README define rust-hybrid as default: Rust-owned files first, TypeScript fallback for unsupported languages and per-file Rust gaps, plus explicit zcodegraph index --engine typescript troubleshooting path. |
| 1-4 | Can rust-indexing fully replace ts-indexing now? | No. It can be the default primary path through rust-hybrid, but not a complete replacement. | Replacement would require Rust-owned coverage for the full supported language matrix, closing remaining JS/TS semantic frontiers or explicitly productizing their no-go boundaries, and release evidence showing no sufficiency regression without TS fallback. |
| 1-5 | What replaces the pure Rust replacement goal? | Reduce TypeScript fallback surface area incrementally. | Keep rust-hybrid as the product contract. Move already-supported product languages into Rust-owned indexing one by one when the bounded extraction, fallback diagnostics, and sufficiency evidence are credible. |
| 1-5-1 | Which supported language should be migrated next into Rust-owned indexing? | Python. | Python is already product-supported through the TypeScript extractor and framework resolvers, but Rust core SourceLanguage currently owns only JS/JSX/TS/TSX/MTS/CTS/Go. This is a fallback-surface reduction, not a new user-visible language claim. |
| 1-5-2 | What should be optimized before adding Python as another Rust-owned language? | Remove same-language TypeScript indexing dependency for current Rust-owned languages as much as possible. | Scope is JS, JSX, TS, TSX, MTS, CTS, and Go. Keep TypeScript fallback for non-Rust-owned product languages and explicit --engine typescript, but stop relying on TS indexer to recover ordinary Rust-owned parse/extraction gaps unless explicitly classified as a remaining blocker. |
| 1-5-2 | What should happen when a Rust-owned JS/TS/Go file has a parse or extraction gap? | Default no same-language TypeScript fallback; surface degraded/fail-closed diagnostics instead. | Current users are limited, so release-risk minimization is less important than eliminating the architectural trap of maintaining Rust and TypeScript indexers as equivalent implementations for the same Rust-owned languages. Non-Rust-owned product languages may still use TypeScript fallback. |

