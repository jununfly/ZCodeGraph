# Rust-Hybrid Phase 1 Decision: Engine Contract and CLI Default Skeleton

## Context

Phase 1 implements the first slice of the first-user release PRD:

- PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Plan: `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`
- Tracker: [#226](https://github.com/jununfly/ZCodeGraph/issues/226)

The goal was to establish `rust-hybrid` as a first-class engine contract and CLI default skeleton without implementing true mixed-engine writes yet.

## Decision

Phase 1 uses `rust-hybrid` as the default CLI full-index engine for:

- `zcodegraph index`
- `zcodegraph init`
- legacy-compatible `zcodegraph init -i`

Explicit escape hatches remain:

- `--engine typescript`
- `ZCODEGRAPH_INDEX_ENGINE=typescript`
- `--engine rust` for maintainer/debug pure Rust validation

## What Changed

- Shared engine selection now accepts `rust-hybrid`.
- `ZCODEGRAPH_INDEX_ENGINE=rust-hybrid` resolves to the hybrid engine value.
- Unsupported engine errors list `typescript`, `rust`, and `rust-hybrid`.
- CLI `index` defaults to `rust-hybrid`.
- CLI `init`/`init -i` uses the same engine selection path as `index`.
- `rust-hybrid` Phase 1 runs a planner guard before invoking the Rust indexer.
- JS/TS/JSX/TSX-only projects can proceed through the existing Rust indexing path.
- Go files fail fast with a message that Go remains a rust-hybrid release blocker.
- Other TypeScript-supported non-Rust-owned source languages fail fast with a message that TypeScript fallback writes are pending.
- Generated files detected by the existing generated-file classifier do not trigger the Phase 1 fail-fast guard.
- `status --json` exposes minimal `index.hybrid` metadata for rust-hybrid-built indexes.

## Explicit Non-Readiness

Phase 1 does not complete the first-user release.

Still incomplete:

- Go extraction is still a release blocker.
- Real TypeScript fallback writes are not implemented.
- Per-file Rust parse/extraction fallback is not implemented.
- SDK default behavior remains deferred.
- SDK engine options remain deferred.
- Doctor diagnostic bundles remain deferred.
- README and release docs were not updated.
- Real agent sufficiency smoke was not required or run.
- Gin real-repo smoke was not required or run.
- Release-like packaging smoke was not required or run.

## Validation

Commands run:

```bash
npm run build
npx vitest run __tests__/rust-core-discovery.test.ts
npx vitest run __tests__/status-json.test.ts
npx vitest run __tests__/rust-index-engine-cli.test.ts
```

Results:

- `npm run build` passed.
- `__tests__/rust-core-discovery.test.ts` passed: 6 tests.
- `__tests__/status-json.test.ts` passed: 7 tests.
- `__tests__/rust-index-engine-cli.test.ts` passed: 41 tests.

## Next Plan Recommendation

Do Rust Go extraction next, then implement real TypeScript fallback writes.

Rationale:

- Go is explicitly a first-user release blocker.
- Phase 1 now makes `.go` files fail fast under the default `rust-hybrid` path, so the blocker is visible immediately.
- Adding Go extraction gives the default engine meaningful first-user language coverage before introducing more complex mixed-engine write coordination.
- TypeScript fallback writes remain necessary after Go because first-user repos will still contain non-Rust-owned supported languages.

Do not close the first-user release PRD after Phase 1.
