# Rust-Hybrid Phase 5 Decision

## Decision

Phase 5 is accepted as the release-like packaged smoke slice for the CLI `rust-hybrid` first-user path.

The package smoke contract now validates the current product strategy: `rust-hybrid` is the default full-index path, packaged status exposes hybrid metadata, degraded runs can produce last-run doctor bundles, and process-level Rust failures can produce last-failure doctor bundles. The smoke covers both extracted bundle and staged npm shim shapes.

This decision does not claim final first-user release readiness.

## Evidence

- Build: `npm run build`
- Rust core build: `cargo build --release --package zcodegraph-core`
- Targeted tests: `npx vitest run __tests__/rust-package-smoke.test.ts __tests__/ci-rust-packaged-path.test.ts __tests__/rust-phase3-validation.test.ts`
- Result: 10 passed
- Local package smoke artifacts: `/private/tmp/zcodegraph-phase5-packaged-smoke/artifacts`
- Smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`

## Accepted Behavior

- Extracted bundle smoke validates `init -i` under `rust-hybrid`.
- Extracted bundle smoke validates default `index` under `rust-hybrid`.
- Extracted bundle smoke validates explicit `index --engine rust-hybrid`.
- Extracted bundle smoke validates `status --json` hybrid metadata.
- Extracted bundle smoke validates degraded fallback taxonomy and `doctor --last-run`.
- Extracted bundle smoke validates missing Rust core fail-safe behavior and `doctor --last-failure`.
- Staged npm shim smoke validates equivalent `rust-hybrid` init, index, status, degraded, and failure behavior.
- Staged npm shim smoke validates optional platform package Rust core presence.
- Staged npm shim smoke validates missing optional platform package failure remains clear.
- Staged npm package metadata still has no postinstall or local Rust compilation requirement.
- CI packaged-path targeted checks are aligned with `rust-hybrid` default behavior instead of the old TypeScript-default wording.
- Smoke summary gates no longer use `bundle-default-typescript` or `npm-default-typescript`.

## Out Of Scope

- README or release messaging.
- SDK default behavior or SDK engine options.
- Rust-owned per-file parse/extraction fallback to TypeScript.
- Real Gin packaged smoke.
- Full benchmark scoreboard.
- GitHub Release workflow trigger.
- npm publish.
- tag push.
- #165 performance optimization.

## Follow-Up

The first-user release PRD still has separate follow-up work:

- SDK default/options slice if the programmatic API must match the CLI product strategy.
- Rust-owned per-file parse/extraction fallback, or an explicit release decision about whether it remains a blocker.
- Final release readiness plan that decides when README/product messaging can be updated.
- Official release workflow validation should continue to use the real Node runtime download path; this local smoke used a Node wrapper because `nodejs.org` was unavailable from the sandbox.
