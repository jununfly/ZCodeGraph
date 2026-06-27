<!-- ROADMAP_SECTION_START -->
## ZJ Roadmap

> 数据文件: `2026-06-27-rust-indexing-debt-to-rust-migration-roadmap.json` | 最后更新: 2026-06-28 00:05:53

[~][X+] 1. Rust Indexing Debt To Rust Migration Roadmap
├── [~][X+] 1-1. Technical debt governance staging before migration resumes
│   ├── [x][X+] 1-1-1. Current Rust indexing debt inventory and ownership map
│   ├── [~][Y+] 1-1-2. Rust core giant test module decomposition candidates
│   ├── [ ][Y+] 1-1-3. Cross-platform CI and release stability debt candidates
│   ├── [ ][X+] 1-1-4. Plan benchmark evidence lifecycle cleanup rules
│   └── [ ][X+] 1-1-5. Debt governance closeout decision before migration resumes
├── [ ][X+] 1-2. Rust core architecture clarity for future migration
│   ├── [ ][X+] 1-2-1. Extraction finalization resolution ownership boundary map
│   ├── [ ][Y+] 1-2-2. Rust core test helper and fixture module extraction
│   ├── [ ][Y+] 1-2-3. SQLite write finalization helper isolation
│   ├── [ ][Y+] 1-2-4. JS TS resolver migration tests versus Rust language tests split
│   └── [ ][X+] 1-2-5. Profile and diagnostic field stability boundary
├── [ ][X+] 1-3. Cross-platform CI and release trust guardrails
│   ├── [ ][Y+] 1-3-1. Windows SQLite file-lock regression guard follow-up
│   ├── [ ][Y+] 1-3-2. Main CI required matrix health gate
│   ├── [ ][Y+] 1-3-3. Packaged Rust core artifact contract coverage
│   ├── [ ][X+] 1-3-4. Release workflow targeted smoke without publish
│   └── [ ][X+] 1-3-5. Node version and package manager guardrails
├── [ ][X+] 1-4. Documentation roadmap and evidence lifecycle governance
│   ├── [ ][Y+] 1-4-1. Process roadmap cleanup and consolidation policy
│   ├── [ ][X+] 1-4-2. ADR versus benchmark versus plan routing rules
│   ├── [ ][Y+] 1-4-3. Issue PRD roadmap closeout template
│   ├── [ ][Y+] 1-4-4. README product language consistency pass
│   └── [ ][X+] 1-4-5. Temporary evidence retention and deletion checklist
├── [ ][X+] 1-5. TypeScript indexing to Rust indexing replacement mainline
│   ├── [ ][X+] 1-5-1. Current Rust-owned language coverage ownership map
│   ├── [ ][X+] 1-5-2. Remaining TypeScript indexer responsibility inventory
│   ├── [ ][Y+] 1-5-3. Rust-owned extraction gap burn-down candidates
│   ├── [ ][Y+] 1-5-4. Rust finalization and reference-resolution residuals
│   ├── [ ][X+] 1-5-5. Non-Rust-owned language fallback boundary
│   └── [ ][X+] 1-5-6. MCP Explore sufficiency guardrail trigger map
├── [ ][Y+] 1-6. Next exploit slice candidate backlog
│   ├── [x][Y+] 1-6-1. Extract Rust core test helpers from lib.rs
│   ├── [x][Y+] 1-6-2. Split temporary SQLite and fixture utilities
│   ├── [x][Y+] 1-6-3. Consolidate TypeScript fallback taxonomy in status and doctor
│   ├── [ ][Y+] 1-6-4. Burn down one high-confidence TypeScript resolver residual
│   └── [ ][Y+] 1-6-5. Add cross-platform CI smoke for migrated Rust indexing path
├── [ ][X+] 1-7. Explore frontiers not ready for immediate implementation
│   ├── [ ][X+] 1-7-1. Full TypeScript indexer removal product risk
│   ├── [ ][X+] 1-7-2. Third-party package and node_modules graph expansion
│   ├── [ ][X+] 1-7-3. Compiler or oracle integration policy
│   ├── [ ][X+] 1-7-4. Additional language support after migration stability
│   └── [ ][X+] 1-7-5. Performance optimization after architecture cleanup
└── [ ][X+] 1-8. Completion gates before migration resumes
    ├── [ ][Y+] 1-8-1. No default user behavior changes during debt pass
    ├── [ ][Y+] 1-8-2. Green macOS Ubuntu Windows CI gate
    ├── [ ][X+] 1-8-3. No performance target as primary success criterion
    ├── [ ][X+] 1-8-4. Agent Sufficiency guardrail trigger when graph semantics change
    └── [ ][X+] 1-8-5. Closeout decision before new migration implementation issues

### 当前施工：1-1-2-3-2. Local exact reference and ESM direct binding edges

Published as #619. Scope: split exactly nine direct named ESM binding tests into __tests__/rust-index-engine-cli-esm-direct-binding.test.ts: writes shadow semantic replay diagnostics for direct named ESM imports; records shadow semantic replay taxonomy for unresolved direct named ESM imports; writes guarded Rust finalization diagnostics and usage edges for direct named ESM imports; records guarded edge-write skip taxonomy for unresolved direct named ESM imports; resolves direct ESM named imports to exported target-file symbols as Rust-owned edges; resolves paths-alias ESM named imports to exported target-file symbols as Rust-owned edges; resolves declaration-style ESM named exports with TypeScript modifiers; resolves same-file ESM export specifiers only for unique local bindings; resolves guarded TypeScript overload implementations and keeps no-go cases as fallback. Exclude bounded ESM named binding fallback sample aggregation, default import tests, namespace/default/re-export tests, declaration/runtime pairing, package semantics, candidate producer, file-level import diagnostics, fallback/language/failure-safety, and finalization cleanup. Verification: npx vitest run __tests__/rust-index-engine-cli-esm-direct-binding.test.ts __tests__/rust-index-engine-cli.test.ts; npm run build; git diff --check.

**决策：**
- Q: What is the seventh cut after file-level import diagnostics? → Continue sibling order with 1-1-2-3-2 Local exact reference and ESM direct binding edges. (This keeps the module-resolution finalization cluster moving from file-level module dependencies into symbol-level direct binding before default/namespace/re-export, declaration/runtime, and package semantics.)
- Q: Should shadow semantic replay diagnostics and real direct named ESM binding edges be split into separate issues? → No. Keep them in one issue for 1-1-2-3-2, with two explicit subgroups: shadow semantic replay diagnostics and direct named ESM binding behavior. (Both subgroups describe the same direct named ESM binding semantic boundary. Exclude default imports, namespace/default semantics, one-hop re-exports, declaration/runtime pairing, package semantics, candidate protocol, fallback, language smoke, failure-safety, file-level import diagnostics, and finalization cleanup.)
- Q: Should TypeScript overload implementation direct named binding tests be included? → Yes. Include guarded TypeScript overload implementation resolution and its no-go fallback cases in 1-1-2-3-2. (The test still belongs to direct named ESM binding: it resolves imported names to implementation symbols when safe and records no-go cases within the same binding boundary. It is not default/namespace, one-hop re-export, declaration/runtime pairing, or package semantics.)
- Q: Should bounded ESM named binding fallback sample aggregation be included in the seventh cut? → No. Exclude the bounded ESM named binding fallback samples profile artifact test from 1-1-2-3-2. (That test is aggregate profile sample/cap diagnostics spanning multiple scenarios, including barrel and leaf fallback shapes. Keep this cut focused on direct named ESM binding shadow diagnostics, guarded edge writes, direct binding behavior, and overload implementation behavior.)
- Q: Should the seventh cut publish an implementation issue? → Yes. Publish one ready-for-agent issue for the focused ESM direct named binding test split. (Move exactly nine tests into __tests__/rust-index-engine-cli-esm-direct-binding.test.ts: two shadow semantic replay diagnostics, two guarded direct named diagnostics, four direct named binding behavior tests, and the guarded TypeScript overload implementation behavior test. Exclude bounded fallback sample aggregation, default import tests, namespace/default/re-export tests, declaration/runtime pairing, package semantics, candidate producer, file-level import diagnostics, fallback/language/failure-safety, and finalization cleanup.)
<!-- ROADMAP_SECTION_END -->
