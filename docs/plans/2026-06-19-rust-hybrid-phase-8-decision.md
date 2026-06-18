# Rust-Hybrid Phase 8 Decision

## Decision

Phase 8 is accepted as **release-ready with explicit non-blockers** for the first-user `rust-hybrid` release path.

The current main branch satisfies the PRD release blockers for the first-user path:

- `zcodegraph init -i` and default full indexing use `rust-hybrid`.
- Real Gin deterministic smoke passes on a real `gin-gonic/examples` checkout.
- Targeted packaged smoke passes on current-main release-like bundle and staged npm paths.
- Status exposes hybrid health, engine assignment, fallback taxonomy, and generated Go skips.
- Doctor last-run and last-failure bundles are available on the relevant paths.
- README primary setup and troubleshooting now match the implemented product behavior.

This decision does not claim #165 performance completion, strict Rust-vs-TypeScript performance wins, full Go module resolution, or watch/sync `rust-hybrid` incremental semantics.

## Evidence

- PRD gate audit: `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-prd-gate-audit.md`
- Real Gin deterministic smoke: `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-real-gin-smoke-evidence.md`
- Targeted packaged smoke recheck: `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-packaged-smoke-recheck-evidence.md`
- Phase 8 plan: `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`
- PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

Validation run in Phase 8:

```bash
npm run build
npx vitest run \
  __tests__/rust-package-smoke.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/build-bundle-rust-core.test.ts \
  __tests__/pack-npm-rust-core.test.ts
node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-phase8-package-smoke/extracted/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-phase8-package-smoke/artifacts
```

Real Gin smoke:

- Corpus: `/private/tmp/codegraph-corpus/gin-examples`
- Commit: `179495dfc053bc23b8ba6f9dc8554c904188d6b4`
- Smoke copy: `/private/tmp/zcodegraph-phase8-gin-smoke-Qcr3zT/gin-examples`
- Result: full `rust-hybrid` index completed.
- Status: `engine: rust-hybrid`; `fallbackState: degraded`; `fallbackReasonTaxonomy: {"language-level-typescript-fallback":5}`; `skippedGeneratedByLanguage: {"go":2}`.
- Deterministic probe: `POST /upload` in `upload-file/limit-bytes/main.go` references `uploadHandler`.
- Doctor: `.zcodegraph/diagnostics/bundles/2026-06-18T17-39-15-309Z-last-run`.

Packaged smoke:

- Result: 22 package smoke gates passed.
- `gateFailures`: `[]`.
- `publishAttempted`: `false`.
- `registryContactAllowed`: `false`.

## Accepted Behavior

- First users can follow:

```bash
zcodegraph install
zcodegraph init -i
```

without choosing an indexing engine.

- `rust-hybrid` is the default first-user full-index path.
- Unsupported-but-supported source files can fall back to the TypeScript indexer per file and still contribute to one graph.
- Rust-owned Go files are indexed by Rust.
- Generated Go skips are visible and are not release blockers.
- Degraded indexing is visible through status and doctor rather than hidden.
- Rust process/system failure paths remain fail-safe and preserve diagnostic evidence.
- Troubleshooting documents the TypeScript escape hatch:

```bash
zcodegraph index --engine typescript
ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index
```

## Explicit Non-Blockers

- #165 performance optimization and strict performance target work.
- Watch/sync `rust-hybrid` incremental semantics.
- Full Go module/package import resolver.
- gRPC/protobuf generated Go flow coverage.
- Broader Go generics edge coverage.
- Multi-round agent A/B validation.
- Real Gin packaged smoke.
- Official release infrastructure Node download verification in this local sandbox.

## Follow-Up

The next work should stay product-oriented:

- Use #165 or its successor plan for concentrated performance optimization.
- Track watch/sync `rust-hybrid` incremental behavior separately from first-user full-index readiness.
- Expand Go resolver and framework coverage through independent language/framework slices.
- Keep status and doctor diagnostics as the user-feedback path for first-user issue reports.
