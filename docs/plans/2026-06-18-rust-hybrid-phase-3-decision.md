# Rust-Hybrid Phase 3 Decision

## Decision

Phase 3 is accepted as a mixed-language completion slice for the CLI `rust-hybrid` full-index path.

The implementation now plans fallback assignment, writes Rust-owned files first, appends non-Rust-owned TypeScript-supported files into the same graph, runs one TypeScript shell finalization pass, and records fallback health in status metadata.

## Evidence

- Targeted implementation suite: `npx vitest run __tests__/rust-index-engine-cli.test.ts`
- Result: 47 passed
- Build: `npm run build`
- Rust core build: `cargo build --package zcodegraph-core`
- Real repo smoke: `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`

## Accepted Behavior

- Default CLI `rust-hybrid` no longer fails fast solely because a repository contains non-Rust-owned supported source languages.
- Go, JavaScript, JSX, TypeScript, and TSX remain Rust-owned languages.
- Supported non-Rust-owned source files are appended through TypeScript fallback.
- Unknown or unsupported files do not become blockers.
- Generated source skip counts are recorded in status metadata.
- Status exposes `engineByLanguage`, `engineByFileCount`, `fallbackByLanguage`, `fallbackFileCount`, `skippedGeneratedByLanguage`, `fallbackState`, `fallbackReasonTaxonomy`, and `pendingFallbacks`.
- CLI human output includes a concise fallback summary when fallback files were appended.
- MCP normal answers do not expose engine details.

## Out Of Scope

- Rust-owned per-file parse/extraction fallback to TypeScript.
- SDK default behavior.
- SDK engine options.
- Doctor diagnostic bundles.
- README or release messaging updates.
- Packaged release smoke.
- Full agent A/B.
- Performance gates.
- First-user release readiness.

## Follow-Up

Keep `rust-owned-parse-gap` in `pendingFallbacks` until a later phase implements safe per-file Rust-owned fallback semantics.
