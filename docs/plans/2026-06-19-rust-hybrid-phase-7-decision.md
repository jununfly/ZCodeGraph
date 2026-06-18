# Rust-Hybrid Phase 7 Decision

## Decision

Phase 7 is accepted as the SDK full-index alignment slice for the first-user `rust-hybrid` release path.

The programmatic SDK now defaults full-index entry points to `rust-hybrid`, exposes explicit engine selection, preserves the TypeScript escape hatch, preserves SDK fail-safe behavior on Rust process/system failure, and carries CLI-compatible fallback taxonomy into SDK `rust-hybrid` runs.

This decision does not claim final first-user release readiness.

## Evidence

- Build: `npm run build`
- Targeted SDK and npm SDK shim tests: `npx vitest run __tests__/sdk-rust-hybrid.test.ts __tests__/npm-sdk.test.ts`
- Targeted CLI regression suite: `npx vitest run __tests__/rust-index-engine-cli.test.ts`
- Full regression suite: `npm test`
- Result: 13 SDK/npm SDK tests passed; 51 CLI engine regression tests passed; 1835 full-suite tests passed with 15 skipped.
- Evidence document: `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md`

## Accepted Behavior

- SDK users can import the shared `IndexEngine` type.
- `CodeGraph.init(projectPath, { index: true })` defaults to `rust-hybrid`.
- `cg.indexAll()` defaults to `rust-hybrid`.
- `CodeGraph.init(projectPath, { index: true, engine })` and `cg.indexAll({ engine })` accept `typescript`, `rust`, and `rust-hybrid`.
- SDK full-index calls do not read `ZCODEGRAPH_INDEX_ENGINE`.
- `engine: 'typescript'` remains the explicit SDK escape hatch and does not require Rust core discovery.
- `engine: 'rust'` remains an advanced maintainer/debug path where Rust core is available.
- Missing Rust core under default SDK `rust-hybrid` fails safely and does not attempt silent full TypeScript fallback.
- SDK `rust-hybrid` appends language-level TypeScript fallback files into the unified graph.
- SDK `rust-hybrid` appends Rust-owned per-file parse gaps only when Rust marks the file unwritten and fallback-eligible.
- SDK `rust-hybrid` blocks fallback for possible partial Rust writes and records `rust-owned-gap-with-partial-write-blocked`.
- npm SDK shim remains transparent and contract-aligned with the source SDK.
- CLI TypeScript engine selection remains explicit after the SDK default change.
- Historical TypeScript baseline tests and Rust A/B experiment scripts explicitly request TypeScript when they are not testing the new SDK default.

## Out Of Scope

- README or release messaging.
- Full release-like packaged smoke.
- Real Gin packaged smoke.
- Watch/sync `rust-hybrid` incremental semantics.
- Performance optimization or #165.
- MCP protocol or tool-name changes.
- GitHub Release workflow trigger.
- npm publish.
- Final first-user release readiness.

## Follow-Up

The first-user release PRD still needs remaining release-path slices before user-facing readiness is claimed. Watch/sync semantics, release messaging, packaged release workflow, and any performance work remain separate decisions.
