# Rust-Hybrid Phase 6 Decision

## Decision

Phase 6 is accepted as the Rust-owned per-file parse gap fallback slice for the CLI `rust-hybrid` path.

The Rust core now emits structured warning-level per-file parse gap diagnostics. The CLI consumes those diagnostics and appends TypeScript fallback only for Rust-owned files that Rust explicitly marks as not written. Completed runs with Rust-owned fallback are degraded rather than healthy or failed.

This decision does not claim final first-user release readiness.

## Evidence

- Build: `npm run build`
- Rust core build: `cargo build --package zcodegraph-core`
- Targeted tests: `npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-hybrid-doctor.test.ts`
- Targeted Rust test: `cargo test --package zcodegraph-core emits_structured_rust_owned_parse_gap_errors`
- Result: 55 JS tests passed; targeted Rust contract test passed.
- Real reduced fixture: `/private/tmp/zcodegraph-phase6-real-gap-attempt`
- Smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`

## Accepted Behavior

- Rust-owned parse gaps are reported as structured per-file diagnostics with `filePath`, `language`, stable taxonomy code, warning severity, and `writtenByRust:false`.
- CLI `rust-hybrid` appends fallback-eligible Rust-owned files through the existing TypeScript fallback append path.
- Rust process/system failures remain fail-safe aborts and do not trigger full TypeScript fallback.
- Files that may have partial Rust graph writes are not appended through TypeScript fallback.
- Partial-write blocked cases record `rust-owned-gap-with-partial-write-blocked`.
- Status metadata reports degraded fallback state, fallback counts by language, fallback taxonomy, and no pending Rust-owned parse fallback after a handled parse gap.
- Doctor last-run bundles include per-file fallback diagnostics with path hashes, extension, language, taxonomy, severity, and sanitized message.
- Doctor diagnostics do not include source code or plaintext file paths.
- A real reduced malformed TypeScript fixture exercised the Rust core parse gap path and completed with TypeScript fallback.

## Out Of Scope

- SDK default behavior or SDK engine options.
- README or release messaging.
- Full release-like packaged smoke.
- Real Gin packaged smoke.
- Per-file graph cleanup or replacement for partial Rust writes.
- Performance optimization or #165.
- MCP protocol or tool-name changes.
- GitHub Release workflow trigger.
- npm publish.

## Follow-Up

The first-user release PRD still needs separate release readiness work before user-facing messaging changes. SDK defaults/options remain a separate slice. Partial-write replacement remains intentionally out of scope until there is a concrete Rust failure mode that requires it.
