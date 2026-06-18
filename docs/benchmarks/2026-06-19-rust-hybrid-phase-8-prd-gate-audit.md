# Rust-Hybrid Phase 8 PRD Gate Audit

## Context

Parent PRD:

- `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

Phase 8 plan:

- `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`

This audit maps the first-user release PRD to current evidence before the final Phase 8 readiness decision. It does not claim release readiness by itself.

## Gate Matrix

| PRD gate | Status before Phase 8 smoke | Current evidence needed | Notes |
|---|---|---|---|
| `zcodegraph init -i` and `zcodegraph index` default to `rust-hybrid` | Pass | Confirm through packaged smoke | Phase 1 and Phase 7 decisions cover CLI and SDK full-index defaults. |
| Shared engine values support `typescript`, `rust`, and `rust-hybrid` | Pass | None | Phase 1 established the shared engine contract; Phase 7 aligned SDK full-index options. |
| TypeScript escape hatch remains available | Pass | README troubleshooting update | CLI and SDK support explicit `typescript`; user-facing docs still needed the troubleshooting path. |
| Rust process/system failures fail safely instead of whole-repo TS fallback | Pass | Packaged last-failure smoke | Phase 1 and Phase 5 validated fail-safe behavior; Phase 8 should rerun packaged last-failure bundle. |
| Rust-owned JS/TS/JSX/TSX/Go assignment is visible in status | Pass | Gin and package status excerpts | Phase 3 and Phase 7 cover mixed-language metadata; Phase 8 should cite current `status --json`. |
| Unsupported supported languages fall back to TypeScript per file | Pass | Gin fallback taxonomy and package degraded smoke | Phase 3 added language-level fallback into the unified graph. |
| Rust-owned parse/extraction gaps fall back per file when safe | Pass | None for release closeout | Phase 6 covered per-file parse gap fallback and doctor diagnostics. |
| Generated Go files may be skipped and counted | Pass | Gin status excerpt | Phase 2/3 implemented generated Go skips; Phase 8 real Gin smoke should confirm counts remain visible. |
| Go extraction v1 supports Gin route-handler sufficiency | Needs current evidence | Real Gin deterministic smoke | Phase 2 passed on a real Gin subdir. Phase 8 requires a current-main real Gin smoke. |
| Diagnostic bundles are local-only and source-free by default | Pass | Gin/package doctor bundle paths | Phase 4 implemented doctor bundles. Phase 8 should confirm last-run and last-failure paths still work. |
| First-user README primary path does not make users choose an engine | Needs doc update | README edit | Existing README already shows install/init but still had stale `init` wording and no rust-hybrid troubleshooting. |
| Release-like packaging works without publish/release/tag | Needs current evidence | Targeted packaged smoke | Phase 5 passed. Phase 8 should rerun current-main package smoke. |
| Performance #165 is not a blocker | Non-blocker | Record wall time/RSS or unavailable reason | PRD shifted strict performance targets out of release gating. Severe regressions can still block. |
| Watch/sync rust-hybrid incremental semantics | Non-blocker | None | First-user release requires full index; incremental rust-hybrid semantics remain follow-up. |
| Full Go module/package import resolver | Non-blocker | None | Explicit PRD non-goal for Go v1. |
| gRPC/protobuf generated Go flow coverage | Non-blocker | None | Explicit PRD non-goal; generated Go files can be skipped and counted. |
| Broader Go generics edge support | Non-blocker | None | Explicit PRD non-goal for first-user release. |

## Reused Evidence

- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- Phase 3 mixed-language evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- Phase 4 diagnostic bundle evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`
- Phase 5 packaged smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`
- Phase 6 per-file fallback evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`
- Phase 7 decision and evidence: `docs/plans/2026-06-19-rust-hybrid-phase-7-decision.md`, `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md`

## Harness Reuse

Existing deterministic harnesses are sufficient for Phase 8:

- `npm run build`
- `npx vitest run __tests__/rust-package-smoke.test.ts __tests__/ci-rust-packaged-path.test.ts __tests__/build-bundle-rust-core.test.ts __tests__/pack-npm-rust-core.test.ts`
- `scripts/build-bundle.sh darwin-arm64`
- `scripts/pack-npm.sh`
- `node scripts/rust-package-smoke.mjs --bundle <dir> --npm-root <dir> --out <dir>`
- CLI `status --json` and `doctor --engine rust-hybrid --bundle --last-run`
- A deterministic `dist/index.js` route/handler probe against the indexed Gin graph

No new production smoke helper was required for the closeout.

## Current Gaps To Close In Phase 8

- Run current-main real Gin deterministic smoke and record status, fallback taxonomy, doctor bundle, route-handler probe, wall time, and RSS or unavailable reason.
- Run current-main targeted packaged smoke and record gate summary, wall time, and RSS or unavailable reason.
- Update README first-user path and troubleshooting.
- Write the final three-state readiness decision.
