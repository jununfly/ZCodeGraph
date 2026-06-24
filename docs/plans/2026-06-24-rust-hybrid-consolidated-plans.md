# Rust Hybrid Consolidated Plans

Date: 2026-06-24

This file mechanically consolidates the previous `*-rust-hybrid-*` files in this directory. The original per-phase/process files were removed after consolidation so this file is the single archive entry point for this historical workstream.

## Source Files

- `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-2-decision.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-3-typescript-fallback-writes.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-v1.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-5-release-like-packaged-smoke.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-6-decision.md`
- `docs/plans/2026-06-18-rust-hybrid-phase-6-rust-owned-per-file-gap-fallback.md`
- `docs/plans/2026-06-19-rust-hybrid-default-indexing-wall-clock-ab.md`
- `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`
- `docs/plans/2026-06-19-rust-hybrid-phase-7-decision.md`
- `docs/plans/2026-06-19-rust-hybrid-phase-7-sdk-full-index-alignment.md`
- `docs/plans/2026-06-19-rust-hybrid-phase-8-decision.md`
- `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`
- `docs/plans/2026-06-19-rust-hybrid-pre-release-closeout-decision.md`
- `docs/plans/2026-06-19-rust-hybrid-pre-release-polish.md`
- `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- `docs/plans/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary.md`
- `docs/plans/2026-06-20-rust-hybrid-finalization-cleanup-diagnostics-and-batching.md`
- `docs/plans/2026-06-20-rust-hybrid-finalization-edge-write-diagnostics-and-bulk-insert.md`
- `docs/plans/2026-06-20-rust-hybrid-js-ts-file-import-target-parity.md`
- `docs/plans/2026-06-20-rust-hybrid-lowername-default-on-routing.md`
- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-lowername.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-gap-burndown.md`
- `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-multiple-taxonomy.md`
- `docs/plans/2026-06-21-rust-hybrid-esm-named-binding-fallback-diagnostics-map.md`
- `docs/plans/2026-06-21-rust-hybrid-finalization-tail-boundary-plan.md`
- `docs/plans/2026-06-21-rust-hybrid-import-fallback-profile-samples.md`
- `docs/plans/2026-06-21-rust-hybrid-parse-ast-extraction-bounded-optimization.md`
- `docs/plans/2026-06-21-rust-hybrid-parse-extraction-evidence-decision.md`
- `docs/plans/2026-06-21-rust-hybrid-parse-extraction-profile-contract.md`
- `docs/plans/2026-06-21-rust-hybrid-relative-file-node-diagnostics-cleanup.md`
- `docs/plans/2026-06-21-rust-hybrid-relative-import-target-taxonomy-and-burndown.md`
- `docs/plans/2026-06-21-rust-hybrid-relative-js-source-specifier-burndown.md`
- `docs/plans/2026-06-21-rust-hybrid-ts-implementation-declaration-metadata.md`
- `docs/plans/2026-06-21-rust-hybrid-ts-overload-implementation-tie-break.md`
- `docs/plans/2026-06-21-rust-hybrid-ts-overload-signature-semantic-decision.md`
- `docs/plans/2026-06-21-rust-hybrid-ts-type-value-namespace-collision-semantic-decision.md`
- `docs/plans/2026-06-21-rust-hybrid-value-token-interface-routing.md`
- `docs/plans/2026-06-22-rust-hybrid-finalization-tail-implementation-sequence.md`
- `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part1.md`
- `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part2-typescript-module-resolution.md`
- `docs/plans/2026-06-22-rust-hybrid-parse-extraction-walker-hot-path-plan.md`
- `docs/plans/2026-06-22-rust-hybrid-qualifiedname-routing-semantic-residual-audit.md`

## Consolidated Contents

## 1. `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`

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

## 2. `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`

# Rust-Hybrid Phase 1: Engine Contract and CLI Default Skeleton

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 tracker: [#226](https://github.com/jununfly/ZCodeGraph/issues/226)
- Post-release performance tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Diagnostic bundle issue: [#225](https://github.com/jununfly/ZCodeGraph/issues/225)

## Context

The first-user release PRD changes the product direction from an internal Rust-only indexing experiment to a user-facing `rust-hybrid` indexing strategy.

The final PRD target is:

- `zcodegraph init -i` and `zcodegraph index` default to `rust-hybrid`.
- Rust owns JavaScript, TypeScript, JSX, TSX, and Go.
- TypeScript fills unsupported languages and per-file Rust gaps.
- A single unified `.zcodegraph` graph is produced.
- Status and doctor expose engine/fallback diagnostics.
- Agent sufficiency and language coverage are release gates; #165 performance optimization is not.

That full target is too large for the first implementation plan. Phase 1 establishes the engine contract and switches the CLI full-index default, while deliberately failing fast for cases where true hybrid fallback is not implemented yet.

## Goal

Establish `rust-hybrid` as a first-class engine value and CLI full-index default skeleton.

After Phase 1:

1. Shared engine selection accepts `rust-hybrid`.
2. `zcodegraph index` defaults to `rust-hybrid`.
3. `zcodegraph init -i` defaults to `rust-hybrid`.
4. `--engine typescript` and `ZCODEGRAPH_INDEX_ENGINE=typescript` remain escape hatches.
5. `--engine rust` remains available for maintainer/debug pure Rust validation.
6. JS/TS-only projects can use the existing Rust indexing path through `rust-hybrid`.
7. Mixed-language projects that require unimplemented hybrid fallback fail fast instead of silently dropping files.
8. Minimal hybrid metadata/status shape exists so later phases can attach real fallback counts and health.

This phase is a skeleton. It does not claim the first-user release is ready.

## Non-Goals

- Do not implement Rust Go extraction.
- Do not pass the Go release gate.
- Do not implement real TypeScript fallback writes into the Rust staging graph.
- Do not implement per-file Rust parse/extraction fallback.
- Do not implement `CodeGraph.init({ index: true })` or `cg.indexAll()` SDK defaults for `rust-hybrid`.
- Do not add SDK engine options.
- Do not implement doctor bundles.
- Do not update README main path.
- Do not update release notes.
- Do not run real sufficiency smoke as a Phase 1 requirement.
- Do not run Gin real-repo smoke.
- Do not run release-like packaging smoke.
- Do not close #165.
- Do not claim Rust-hybrid first-user release readiness.

## Decisions

### Phase 1 really switches CLI full-index default

This phase changes the CLI full-index default to `rust-hybrid` for:

- `zcodegraph index`
- `zcodegraph init -i`

This is intentionally early because the PRD goal is a stable product mental model: users should not repeatedly learn different indexing entry points.

The escape hatch must remain explicit and tested:

```bash
zcodegraph index --engine typescript
ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index
```

### SDK implementation is deferred but included in the PRD roadmap

The SDK must eventually follow the product strategy, but Phase 1 does not change SDK runtime behavior.

Deferred SDK work:

- `IndexOptions.engine`
- `InitOptions.engine`
- SDK default strategy resolution
- SDK `engine: 'typescript'` escape hatch
- SDK `engine: 'rust-hybrid'`
- SDK failure semantics matching CLI

Reason: current Rust orchestration lives in the CLI layer. Moving it into SDK defaults is a separate API and error-model decision.

### Phase 1 planner contract exists before real fallback

Phase 1 should introduce a planner/metadata contract for `rust-hybrid` even though it does not implement true mixed writes.

Temporary Phase 1 assignment:

- Rust-owned and allowed: JavaScript, TypeScript, JSX, TSX.
- Go: planned release blocker, not implemented in Phase 1.
- Other TypeScript-supported languages: planned TypeScript fallback, not implemented in Phase 1.
- Generated/ignored files: should not cause fail-fast.

### Mixed-language repositories fail fast

Phase 1 must not silently succeed on a repository where `rust-hybrid` would need real TypeScript fallback writes.

Temporary behavior:

- JS/TS-only project: run current Rust path through `rust-hybrid`.
- Project with `.go`: fail fast with a message that Go is a rust-hybrid release blocker but is not implemented in Phase 1.
- Project with any other supported non-Rust-owned source language: fail fast with a message that TypeScript fallback writes are not implemented in Phase 1.
- Explicit `--engine typescript` should index the same mixed-language repository successfully.

This prevents a fake hybrid success where useful files are silently dropped.

### Rust process/system failure remains fail-safe

If Rust core is missing or fails at process/system level under `rust-hybrid`, the run should fail safely and preserve the previous good index. It should not silently perform a full TypeScript fallback.

This matches the PRD distinction:

- per-file Rust gap: future TypeScript fallback,
- Rust process/system failure: fail-safe abort.

### Deterministic tests only

Phase 1 validation is deterministic CLI/metadata testing.

Real sufficiency smoke becomes meaningful after Go extraction and real fallback writes exist, so it is not required in Phase 1.

## Expected Behavior

### `zcodegraph index`

Default:

```bash
zcodegraph index
```

Equivalent Phase 1 behavior:

```bash
zcodegraph index --engine rust-hybrid
```

Escape hatch:

```bash
zcodegraph index --engine typescript
```

Maintainer/debug:

```bash
zcodegraph index --engine rust
```

### `zcodegraph init -i`

Default:

```bash
zcodegraph init -i
```

Equivalent Phase 1 behavior:

```bash
zcodegraph init -i --engine rust-hybrid
```

Escape hatch:

```bash
zcodegraph init -i --engine typescript
```

If the current CLI option shape does not support `--engine` on `init`, Phase 1 should add it for `init -i`.

### Status metadata

Phase 1 status should expose enough metadata to show the current engine contract:

- index engine: `rust-hybrid` or `typescript` or `rust`,
- engine version where available,
- hybrid metadata present when built by `rust-hybrid`,
- Rust-owned planned languages,
- Phase 1 fallback state or pending fallback implementation message.

Exact metadata shape can evolve, but it must be machine-readable enough for later status/doctor work.

## Issue Sequence

## Published Issues

- [#227](https://github.com/jununfly/ZCodeGraph/issues/227) — Rust-hybrid Phase 1.1: Add shared engine contract
- [#228](https://github.com/jununfly/ZCodeGraph/issues/228) — Rust-hybrid Phase 1.2: Switch CLI index default
- [#229](https://github.com/jununfly/ZCodeGraph/issues/229) — Rust-hybrid Phase 1.3: Switch CLI init indexing default
- [#230](https://github.com/jununfly/ZCodeGraph/issues/230) — Rust-hybrid Phase 1.4: Add planner contract fail-fast guard
- [#231](https://github.com/jununfly/ZCodeGraph/issues/231) — Rust-hybrid Phase 1.5: Expose minimal hybrid status metadata
- [#232](https://github.com/jununfly/ZCodeGraph/issues/232) — Rust-hybrid Phase 1.6: Record decision and next-plan handoff

### 1. Shared engine contract

Add `rust-hybrid` to shared engine selection.

Acceptance:

- `resolveIndexEngine` accepts `rust-hybrid`.
- `ZCODEGRAPH_INDEX_ENGINE=rust-hybrid` resolves to `rust-hybrid`.
- Unsupported engine errors list `typescript`, `rust`, and `rust-hybrid`.
- Existing `typescript` and `rust` aliases keep working.
- Tests cover CLI/env resolution.

### 2. CLI index default and escape hatches

Switch `zcodegraph index` default to `rust-hybrid`.

Acceptance:

- `zcodegraph index` uses `rust-hybrid` by default.
- `zcodegraph index --engine rust-hybrid` works.
- `ZCODEGRAPH_INDEX_ENGINE=rust-hybrid zcodegraph index` works.
- `zcodegraph index --engine typescript` uses TypeScript and does not invoke Rust core.
- `ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index` uses TypeScript.
- `zcodegraph index --engine rust` keeps the pure Rust path.
- Rust process/system failure under default `rust-hybrid` fails safely and does not silently full-fallback to TypeScript.

### 3. CLI init -i default

Make `zcodegraph init -i` use the same default strategy as `zcodegraph index`.

Acceptance:

- `zcodegraph init -i` defaults to `rust-hybrid`.
- `zcodegraph init -i --engine rust-hybrid` works.
- `zcodegraph init -i --engine typescript` works as an escape hatch.
- `ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph init -i` works as an escape hatch.
- `zcodegraph init` without `-i` does not index and should not require Rust core.

### 4. Phase 1 planner contract and mixed-language fail-fast

Add the temporary `rust-hybrid` planner contract.

Acceptance:

- JS/TS-only project can proceed through `rust-hybrid`.
- Project containing `.go` fails fast with a Go release-blocker message.
- Project containing other TypeScript-supported non-Rust-owned source languages fails fast with a TypeScript fallback-not-implemented message.
- Generated/ignored files do not cause fail-fast.
- The same mixed-language project can still index with `--engine typescript`.
- Failure output points users toward the TypeScript escape hatch.

### 5. Minimal status metadata

Expose minimal hybrid metadata.

Acceptance:

- Status for a `rust-hybrid` built index reports `rust-hybrid`.
- Status includes a machine-readable hybrid metadata object or equivalent JSON fields.
- Metadata includes planned Rust-owned languages and Phase 1 fallback state.
- MCP normal answers do not expose engine details.
- Tests cover status JSON shape.

### 6. Phase 1 decision and next-plan handoff

Write the Phase 1 closeout decision and identify the next plan.

Acceptance:

- Decision artifact records what changed and what remains incomplete.
- Explicitly states Go is still a release blocker.
- Explicitly states real TypeScript fallback writes are not implemented.
- Explicitly states SDK default remains deferred.
- Explicitly states README/release docs are not updated.
- Recommends the next plan: either real fallback writes or Rust Go extraction, with rationale.

## Validation

Required:

- Engine selection unit tests.
- CLI `index` default and override tests.
- CLI `init -i` default and override tests.
- Mixed-language fail-fast tests.
- Status JSON tests.
- Rust process/system failure test for `rust-hybrid`.
- `npm run build`.

Not required:

- Real agent sufficiency smoke.
- Gin real repo smoke.
- Full VS Code sparse scoreboard.
- Release-like packaged smoke.
- Cargo/Rust core tests unless Rust core code is touched.

## Acceptance Criteria

- `rust-hybrid` is a first-class engine value.
- CLI full-index default is `rust-hybrid`.
- TypeScript escape hatch is tested.
- Pure Rust debug path still works.
- Plan 1 does not silently drop unsupported languages.
- Mixed-language projects requiring unimplemented fallback fail fast.
- Minimal hybrid metadata is visible through status.
- SDK default behavior remains unchanged and is documented as deferred.
- README main path is unchanged.
- Go release gate remains open.
- First-user release readiness is not claimed.

## Stop Conditions

Stop and write a decision instead of continuing if:

- Switching CLI default would require completing real fallback writes in the same phase.
- `init -i --engine` requires a broad CLI redesign.
- Mixed-language fail-fast cannot avoid silently dropping useful files.
- Rust process/system failure cannot preserve previous good index.
- Status metadata would require a SQLite schema migration.
- The phase starts implementing Go extraction.
- The phase starts implementing doctor bundle.
- The phase starts updating README/release messaging.

## 3. `docs/plans/2026-06-18-rust-hybrid-phase-2-decision.md`

# Rust-Hybrid Phase 2 Decision: Go Extraction v1 and Gin Sufficiency Slice

## Context

Phase 2 follows the first-user release PRD and Phase 1 engine-contract work.

References:

- PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 2 plan: `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`
- Evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- Tracker: #233

## Decision

Phase 2 makes ordinary Go files Rust-owned under the default CLI `rust-hybrid` path and adds a narrow Gin direct route-handler slice.

This closes the immediate Phase 1 behavior where ordinary `.go` files failed fast solely because Go extraction was missing.

## What Changed

- Rust core now includes Go tree-sitter parsing.
- Rust core extracts Go package modules, functions, methods, structs, interfaces, fields, constants, variables, and type aliases.
- Go methods preserve receiver ownership by naming methods as `Receiver.Method`.
- Rust core emits Go same-file and unambiguous same-package direct call references that finalization can resolve into `calls` edges.
- Rust core skips generated Go files by existing generated suffix conventions.
- `rust-hybrid` now treats ordinary Go as Rust-owned instead of fail-fast.
- `rust-hybrid` status metadata includes Go in `rustOwnedLanguages`.
- `rust-hybrid` status metadata includes `skippedGeneratedByLanguage`.
- Gin direct route calls create route nodes.
- Direct Gin route handlers link to handler functions or same-package selector methods where statically obvious.

## Validation

Commands run:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "indexes Go symbols through the Rust engine"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves Go same-file and same-package direct calls"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "indexes ordinary Go|counts generated Go|fails fast for non-Rust-owned|writes rust-hybrid status"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "links Gin direct routes"
npx vitest run __tests__/rust-index-engine-cli.test.ts
```

Real-repo smoke:

- `gin-gonic/examples`
- Commit `179495dfc053bc23b8ba6f9dc8554c904188d6b4`
- Go-only smoke path: `upload-file/limit-bytes`
- `rust-hybrid` full index completed.
- Deterministic probe found `POST /upload`.
- Deterministic probe confirmed route-to-`uploadHandler` linkage.

## Explicit Non-Readiness

Phase 2 does not complete the first-user release.

Still incomplete:

- Real TypeScript fallback writes are not implemented.
- Full Go import resolution is not implemented.
- Cross-package Go semantic resolution is not implemented.
- Interface dispatch, goroutine/channel flow, and full dataflow are not implemented.
- SDK default behavior remains deferred.
- Doctor diagnostic bundles remain deferred.
- README/release messaging was not updated.
- Full repository smoke on `gin-gonic/examples` still hits the expected non-Go fallback boundary because the repository contains YAML.
- Agent A/B was not run.
- Performance remains observational and is not a gate.

## Next Plan Recommendation

Do real TypeScript fallback writes next.

Rationale:

- Ordinary Go no longer blocks the default `rust-hybrid` path.
- The next visible first-user gap is mixed-language repositories where non-Rust-owned supported files still fail fast.
- The full `gin-gonic/examples` repository exposed that boundary through YAML before the Go-only smoke succeeded.

If fallback writes are deferred, the narrower alternative is a Go/Gin hardening plan focused on `Any`, anonymous handlers, middleware route shapes, and selector-method call resolution.

## 4. `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`

# Rust-Hybrid Phase 2: Rust Go Extraction v1 and Gin Sufficiency Slice

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 plan: `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`
- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 tracker: [#233](https://github.com/jununfly/ZCodeGraph/issues/233)
- Post-release performance tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)

## Context

Phase 1 made `rust-hybrid` the CLI full-index default and deliberately fails fast when a repository contains ordinary `.go` files. That was correct for a skeleton phase because Go extraction did not exist yet, but it now makes Go the most visible first-user blocker.

The first-user release PRD explicitly requires Go support. The next plan should therefore implement Rust-owned Go extraction v1 before true TypeScript fallback writes, SDK default behavior, doctor bundles, README/release messaging, or performance deep optimization.

## Goal

Make ordinary Go files usable in the default `rust-hybrid` path and prove a narrow Gin route-to-handler sufficiency slice on a real repository.

After Phase 2:

1. Ordinary `.go` files enter the Rust-owned path under `rust-hybrid`.
2. Generated Go files are skipped and counted, not treated as a Go release blocker.
3. Rust extracts useful Go v1 language symbols and ownership.
4. Rust emits direct Go call edges for same-file and unambiguous same-package calls.
5. Gin direct route registrations connect to handler functions or methods.
6. A deterministic real Gin repository smoke records route-to-handler evidence.
7. Status/metadata exposes enough Go ownership and generated-skip information for later doctor bundle work.

This phase still does not claim first-user release readiness.

## Non-Goals

- Do not implement a full Go module/package import resolver.
- Do not implement full cross-package semantic resolution.
- Do not implement interface dispatch, goroutine/channel flow, or full dataflow.
- Do not implement generated Go flow coverage.
- Do not implement real TypeScript fallback writes.
- Do not implement per-file Rust parse/extraction fallback to TypeScript.
- Do not change SDK default behavior.
- Do not add SDK engine options.
- Do not implement doctor diagnostic bundles.
- Do not update README main path or release notes.
- Do not run full scoreboard or performance gate validation.
- Do not close the first-user release PRD.

## Decisions

### Go extraction comes before real fallback writes

Go is a first-user release blocker and Phase 1 now exposes that blocker by failing fast on `.go` files. Adding Go extraction first makes the default `rust-hybrid` path meaningfully more useful before introducing the more complex mixed-engine write model.

True TypeScript fallback writes remain necessary after Go, but they should be a later plan.

### Success requires a Gin sufficiency slice

Go v1 is not complete just because `.go` files parse. It must prove a narrow real-world HTTP service flow:

- route registration,
- route node,
- route to handler,
- handler to directly-called same-package helper or service where present.

This is deterministic sufficiency evidence, not a full agent A/B requirement.

### Go v1 call resolution stays intentionally narrow

Go v1 should support:

- same-file direct calls,
- unambiguous same-package direct calls,
- method receiver ownership,
- handler function or selector method targets for Gin route registration.

Go v1 should not support:

- full import resolver,
- cross-package semantic resolution,
- interface dispatch,
- goroutine/channel flow,
- helper-factory route discovery.

### Gin route coverage is direct-shape only

Cover common direct registration forms:

```go
r := gin.Default()
r.GET("/path", handler)
r.POST("/path", controller.Handle)
group := r.Group("/api")
group.GET("/users", handler)
```

Supported HTTP methods should include at least `GET`, `POST`, `PUT`, `DELETE`, and `PATCH`.

Do not try to cover the full Gin group/middleware/helper-factory surface in this phase.

### Generated Go files are skipped and counted

Generated Go files may be skipped and do not block Go v1. They must be visible in status/metadata so users and maintainers can understand coverage.

Use the existing generated-file classifier patterns, including:

- `*.pb.go`
- `*_grpc.pb.go`
- `*.pulsar.go`
- `*_mock.go`
- `*_mocks.go`
- `mock_*.go`

### Rust-hybrid planner must stop failing ordinary Go

After Go v1 lands, ordinary `.go` files should no longer trigger Phase 1 fail-fast behavior under `rust-hybrid`.

Keep existing fail-safe semantics:

- Rust process/system failure aborts safely and preserves the previous good index.
- Non-Rust-owned supported languages still fail fast until true fallback writes exist.
- Go parse/extraction gaps may be recorded, but do not require TypeScript fallback in this phase.

### SDK remains deferred

This plan does not change `CodeGraph.init({ index: true })`, `cg.indexAll()`, SDK defaults, or SDK engine options. CLI `rust-hybrid` remains the user-facing release path for this phase.

### Doctor bundle remains deferred

This plan should expose Go ownership, generated skip counts, and minimal taxonomy through metadata/status in a shape that later doctor bundle work can reuse. It should not implement the doctor bundle command.

### Performance is not a gate

Performance is not an acceptance gate for this plan. Record basic profile/status where useful, but leave deep optimization to [#165](https://github.com/jununfly/ZCodeGraph/issues/165).

## Expected Behavior

### Ordinary Go files

For a repository with ordinary `.go` files:

```bash
zcodegraph index
```

Expected Phase 2 behavior:

- resolves to `rust-hybrid`,
- assigns ordinary Go files to Rust-owned extraction,
- completes without the Phase 1 Go fail-fast error,
- writes one `.zcodegraph` graph,
- reports Go as Rust-owned in status/metadata.

### Generated Go files

For a repository with generated Go files:

- generated Go files are skipped,
- skipped generated count is reported in status/metadata,
- skipped generated Go files do not cause fail-fast,
- skipped generated Go files do not count against Go release-blocker completion.

### Gin direct route

For direct Gin route registration:

```go
func listUsers(c *gin.Context) {
  users := loadUsers()
  c.JSON(200, users)
}

func loadUsers() []User {
  return []User{}
}

func main() {
  r := gin.Default()
  r.GET("/users", listUsers)
}
```

Expected graph:

- route node for `GET /users`,
- route edge/reference to `listUsers`,
- direct call edge from `listUsers` to `loadUsers`.

## Issue Sequence

## Published Issues

- [#234](https://github.com/jununfly/ZCodeGraph/issues/234) — Rust-hybrid Phase 2.1: Add Rust Go extractor skeleton
- [#235](https://github.com/jununfly/ZCodeGraph/issues/235) — Rust-hybrid Phase 2.2: Add Go direct call edges
- [#236](https://github.com/jununfly/ZCodeGraph/issues/236) — Rust-hybrid Phase 2.3: Integrate Go into rust-hybrid planner and status
- [#237](https://github.com/jununfly/ZCodeGraph/issues/237) — Rust-hybrid Phase 2.4: Add Gin direct route-handler slice
- [#238](https://github.com/jununfly/ZCodeGraph/issues/238) — Rust-hybrid Phase 2.5: Run Gin real-repo smoke and record decision

### 1. Rust Go extractor skeleton

Add Rust-owned Go file extraction for the minimal language shape.

Acceptance:

- `.go` files can be parsed by Rust core.
- Extract package/module or package-level file context where appropriate.
- Extract functions.
- Extract methods and preserve receiver ownership.
- Extract structs and fields.
- Extract interfaces.
- Extract constants and variables.
- Extract type aliases or named type declarations.
- Emit `contains` edges.
- Add deterministic fixture tests.
- Do not wire ordinary Go into `rust-hybrid` default yet if that would hide incomplete behavior before the planner/status slice.

### 2. Go direct call edges

Add narrow Go direct call extraction.

Acceptance:

- Same-file direct calls produce `calls` edges.
- Unambiguous same-package direct calls produce `calls` edges.
- Method calls preserve receiver-owned target identity where statically obvious.
- Ambiguous cross-package or interface-like calls stay unresolved rather than guessing.
- Add fixture tests for function calls, method calls, same-package calls, and ambiguity no-go behavior.

### 3. Rust-hybrid planner/status Go integration

Make ordinary Go enter the default `rust-hybrid` path and expose minimal Go metadata.

Acceptance:

- Ordinary `.go` files no longer trigger the Phase 1 Go fail-fast guard.
- Ordinary Go is assigned to Rust-owned extraction.
- Generated Go files are skipped and counted.
- Status JSON or hybrid metadata reports Go as Rust-owned.
- Status JSON or hybrid metadata reports skipped generated Go count.
- Non-Go supported non-Rust-owned languages still fail fast until true fallback writes exist.
- TypeScript escape hatch still works.
- Tests cover ordinary Go, generated Go, and non-Go fail-fast behavior.

### 4. Gin route-handler slice

Add narrow Gin route extraction and route-to-handler linkage.

Acceptance:

- Detect `gin.Default()` and `gin.New()` direct router variables.
- Detect direct route registration for at least `GET`, `POST`, `PUT`, `DELETE`, and `PATCH`.
- Detect simple `Group` prefix composition.
- Create route nodes with method and path.
- Link route nodes to handler function identifiers.
- Link route nodes to handler selector methods where the receiver target is in the same package and unambiguous.
- Preserve handler direct call edges from the Go direct call slice.
- Do not claim middleware/helper-factory/full nested group coverage.
- Add deterministic fixture tests.

### 5. Gin real-repo smoke and decision

Run a deterministic real Gin repository smoke and record evidence.

Acceptance:

- Use at least one real Go repository, prioritizing `gin-gonic/gin`; if it is not a suitable app-flow fixture, use a small public Gin application and record why.
- Record repository URL, commit/hash, commands, and environment.
- `rust-hybrid` completes full index without ordinary Go fail-fast.
- Status/metadata shows Go Rust ownership and generated Go skip count.
- Deterministic probe shows route node existence.
- Deterministic probe shows route to handler linkage.
- Deterministic probe shows handler to same-package helper/service direct call when the fixture contains one.
- Record known gaps and no-go behavior.
- Update `docs/designs/dynamic-dispatch-coverage-playbook.md` or write a linked Go/Gin evidence document.
- Write a Phase 2 decision artifact.
- Explicitly state that first-user release readiness is not claimed.

## Validation

Required:

- Rust Go extractor fixture tests.
- Go direct call fixture tests.
- Rust-hybrid planner/status Go integration tests.
- Gin route-handler fixture tests.
- `npm run build`.
- Relevant Rust core tests.
- Real Gin repository deterministic smoke.
- Evidence/decision document.

Not required:

- Full agent A/B.
- Full VS Code sparse scoreboard.
- Release-like packaged smoke.
- Doctor bundle smoke.
- SDK default tests.
- Performance target gate.

## Acceptance Criteria

- Ordinary Go files are Rust-owned under the default `rust-hybrid` CLI path.
- Generated Go files are skipped and counted.
- Go package/function/method/struct/interface/field/const/var/type declarations are extracted at v1 level.
- Method receiver ownership is preserved.
- Same-file and unambiguous same-package direct call edges are emitted.
- Direct Gin route registration creates route nodes.
- Direct Gin route handlers link to handler functions or methods.
- A real Gin repository deterministic smoke is recorded.
- Status/metadata exposes Go ownership and generated Go skip count.
- Non-Go fallback writes remain out of scope.
- SDK behavior remains unchanged.
- Doctor bundle remains out of scope.
- Performance remains observational, not a gate.
- First-user release readiness is not claimed.

## Stop Conditions

Stop and write a decision instead of expanding scope if:

- Go extraction requires a full Go semantic analyzer.
- Gin route-handler linkage requires full cross-package import resolution.
- Same-package direct calls produce unacceptable false positives.
- Generated Go skip/count cannot be exposed without a broad schema migration.
- Rust-hybrid Go integration requires real TypeScript fallback writes in the same phase.
- The work starts changing SDK default behavior.
- The work starts implementing doctor bundles.
- The work starts optimizing performance as a release gate.

## Next Plan Recommendation

After Phase 2, choose the next plan based on evidence:

- If Go/Gin sufficiency is acceptable, do real TypeScript fallback writes for mixed-language repositories.
- If Go/Gin sufficiency still fails at route-handler or handler-helper linkage, do a bounded Go/Gin coverage hardening plan.
- Keep SDK default behavior as a separate slice after CLI `rust-hybrid` is stable.

## 5. `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`

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

## 6. `docs/plans/2026-06-18-rust-hybrid-phase-3-typescript-fallback-writes.md`

# Rust-Hybrid Phase 3: TypeScript Fallback Writes and Mixed-Language Completion

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 plan: `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`
- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 plan: `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`
- Phase 2 decision: `docs/plans/2026-06-18-rust-hybrid-phase-2-decision.md`
- Phase 2 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- Phase 3 tracker: [#239](https://github.com/jununfly/ZCodeGraph/issues/239)
- Phase 3 decision: `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`
- Phase 3 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- Post-release performance tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)

## Context

Phase 1 established `rust-hybrid` as the CLI full-index default skeleton and deliberately failed fast when true hybrid fallback was required.

Phase 2 made ordinary Go files Rust-owned and proved a narrow Gin route-to-handler slice. The Phase 2 real-repo smoke also exposed the next blocker: full `gin-gonic/examples` still fails under `rust-hybrid` because the repository contains non-Go supported files such as YAML, and true TypeScript fallback writes are not implemented.

The first-user release PRD requires Rust-first and TypeScript-backed indexing. Phase 3 should therefore implement real language-level TypeScript fallback writes for non-Rust-owned supported files, while leaving Rust-owned per-file parse/extraction gap fallback for a later phase.

## Goal

Make mixed-language repositories complete under the default CLI `rust-hybrid` path by appending TypeScript-indexed fallback files into the same staging graph before one unified finalization pass.

After Phase 3:

1. Rust-owned files still go through Rust first.
2. Non-Rust-owned but TypeScript-supported files are assigned to TypeScript fallback.
3. TypeScript fallback files are appended into the same staging graph.
4. Finalization runs once over the unified graph.
5. Mixed-language repositories no longer fail fast solely because fallback writes are needed.
6. Status/metadata exposes fallback health, counts, engine assignment, and taxonomy.
7. Full `gin-gonic/examples` deterministic smoke completes under `rust-hybrid`.

This phase still does not claim first-user release readiness.

## Non-Goals

- Do not implement Rust-owned per-file parse/extraction gap fallback to TypeScript.
- Do not implement SDK default behavior.
- Do not add SDK engine options.
- Do not implement doctor diagnostic bundles.
- Do not update README main path or release notes.
- Do not run release-like packaged smoke unless packaging or release scripts are touched.
- Do not run full agent A/B.
- Do not make performance a release gate.
- Do not close the first-user release PRD.

## Decisions

### Do language-level fallback first

Phase 3 implements language-level fallback for non-Rust-owned supported files. Rust-owned per-file parse/extraction gap fallback remains pending and should be recorded in metadata/status as not implemented.

Reason:

- The current user-visible blocker is mixed-language fail-fast.
- Language-level fallback is enough to unblock full `gin-gonic/examples`.
- Per-file Rust-owned gap fallback needs finer Rust error granularity and partial replacement semantics, so it should be a later phase.

### Use Rust first, TypeScript append, one finalization

The unified write model is:

1. Rust writes Rust-owned files into staging.
2. TypeScript appends fallback files into the same staging graph.
3. TypeScript shell finalization runs once.
4. Active index replacement remains failure-safe.

Rust process/system failure still aborts safely and must not silently perform a full TypeScript fallback.

### Reuse the existing TypeScript-supported source set

Fallback assignment should use the same visible source file set as the mature TypeScript indexer:

- enumerate visible source files with existing ignore behavior,
- detect language with existing language detection,
- include files where `isLanguageSupported(language)` is true,
- exclude Rust-owned languages: JavaScript, JSX, TypeScript, TSX, Go,
- keep generated/ignored rules consistent with existing behavior.

Unknown or unsupported files do not become blockers.

### Add a narrow internal fallback append method

Add a narrow internal `CodeGraph` method for TypeScript fallback append, for example:

```ts
indexFallbackFiles(filePaths, metadata)
```

The method should:

- append only the specified fallback files,
- write into the currently open staging DB,
- not clear the graph,
- not run finalization,
- not stamp `indexed_with_engine=typescript`,
- return fallback counts, timing, and error taxonomy,
- be used by CLI `rust-hybrid` only,
- not be documented as a stable public SDK API.

Do not route this through `cg.indexAll()` because that has full-index semantics.

### Status and CLI health are minimal but machine-readable

Phase 3 should expose enough health to make fallback visible and reusable by later doctor bundle work.

Required metadata/status fields:

- `engineByLanguage`
- `engineByFileCount`
- `fallbackByLanguage`
- `fallbackFileCount`
- `skippedGeneratedByLanguage`
- `fallbackState`: `healthy | degraded | pending`
- `fallbackReasonTaxonomy`
- `pendingFallbacks`, including `rust-owned-parse-gap`

CLI human output may stay light. If fallback happened, print a concise degraded fallback summary. Do not implement the doctor bundle in this phase.

### Full Gin examples smoke is required

The full `gin-gonic/examples` repository failed in Phase 2 because non-Go supported files still required fallback writes. Phase 3 must rerun that full repository smoke.

Required evidence:

- full repo `rust-hybrid` index completes,
- status shows Go assigned to Rust,
- status shows non-Rust-owned supported language fallback,
- route-to-handler probe still passes on the Go example,
- generated skip count is recorded, even if empty,
- known gaps are documented.

### No packaged release smoke by default

Run `npm run build` and targeted CLI/status tests. Do not require release-like packaged smoke unless implementation touches packaging, release scripts, npm shim, launcher, or bundled runtime wiring.

### No README/release messaging yet

Do not update README or release messaging. TypeScript fallback writes are important, but first-user release readiness still depends on doctor bundle, release-like packaging, status UX, and SDK decisions.

### SDK remains deferred

Do not change `CodeGraph.init({ index: true })`, `cg.indexAll()`, SDK defaults, or SDK engine options. Keep fallback append as a CLI/internal contract until the runtime path is stable.

## Expected Behavior

### Mixed-language repository

For a repository containing Go plus YAML:

```bash
zcodegraph index
```

Expected Phase 3 behavior:

- resolves to `rust-hybrid`,
- assigns Go to Rust,
- assigns YAML to TypeScript fallback if supported by the TypeScript indexer,
- completes successfully,
- final graph includes both Rust-owned and fallback files,
- status records fallback as degraded or equivalent visible fallback state.

### Rust process/system failure

If Rust core is missing, crashes, cannot write safely, or cannot acquire the lock:

- abort safely,
- preserve previous good index,
- do not run full TypeScript fallback,
- report failure clearly.

### Rust-owned parse/extraction gap

If a Rust-owned file has a parse/extraction gap:

- do not silently claim TypeScript fallback for that file in Phase 3,
- record the pending fallback taxonomy where available,
- leave full per-file Rust-owned fallback to a later phase.

## Issue Sequence

### Published Issues

Execute in this dependency order:

1. [#244 Rust-hybrid Phase 3.1: Add hybrid fallback assignment planner](https://github.com/jununfly/ZCodeGraph/issues/244)
2. [#242 Rust-hybrid Phase 3.2: Add internal TypeScript fallback append method](https://github.com/jununfly/ZCodeGraph/issues/242)
3. [#243 Rust-hybrid Phase 3.3: Wire CLI rust-hybrid unified write path](https://github.com/jununfly/ZCodeGraph/issues/243)
4. [#240 Rust-hybrid Phase 3.4: Expose fallback health in status and CLI](https://github.com/jununfly/ZCodeGraph/issues/240)
5. [#241 Rust-hybrid Phase 3.5: Run full Gin examples smoke and record decision](https://github.com/jununfly/ZCodeGraph/issues/241)

### 1. Hybrid planner emits fallback assignment

Create a planner contract that classifies visible source files into Rust-owned, TypeScript fallback, skipped/generated, unsupported/unknown, and pending fallback categories.

Acceptance:

- Planner uses existing visible source file enumeration and language detection.
- Planner assigns JavaScript, JSX, TypeScript, TSX, and Go to Rust-owned.
- Planner assigns supported non-Rust-owned source files to TypeScript fallback.
- Planner keeps unknown/unsupported files out of fallback and out of blockers.
- Planner counts skipped generated files.
- Planner records pending `rust-owned-parse-gap` fallback as not implemented.
- Status metadata shape is tested without requiring real TypeScript append yet.
- Existing TypeScript escape hatch remains unchanged.

### 2. Internal TypeScript fallback append method

Add the narrow internal append path that writes only selected fallback files into an already-open graph.

Acceptance:

- `CodeGraph` can append a specified fallback file list into the current DB.
- Append does not clear existing Rust-owned graph data.
- Append does not run reference finalization.
- Append does not stamp the index as TypeScript-built.
- Append returns fallback file count, error count/taxonomy, and timing.
- A fixture proves a fallback language file appears in the same DB as existing Rust-owned data.
- This method is not documented as stable SDK API.

### 3. CLI rust-hybrid unified write path

Wire the CLI `rust-hybrid` path to run Rust first, append TypeScript fallback files, then run one finalization pass.

Acceptance:

- Rust-owned files are written by Rust first.
- TypeScript fallback files are appended before finalization.
- Finalization runs once over the unified graph.
- Mixed-language CLI fixture succeeds where Phase 1/2 failed fast.
- Rust process/system failure still aborts safely and does not run full TypeScript fallback.
- TypeScript fallback append failure aborts safely and does not replace the previous good index.
- `--engine typescript` still uses the mature TypeScript path.

### 4. Status and CLI fallback health reporting

Expose minimal fallback health and assignment diagnostics.

Acceptance:

- Status JSON includes `engineByLanguage`.
- Status JSON includes `engineByFileCount`.
- Status JSON includes `fallbackByLanguage`.
- Status JSON includes `fallbackFileCount`.
- Status JSON includes `skippedGeneratedByLanguage`.
- Status JSON includes `fallbackState`.
- Status JSON includes `fallbackReasonTaxonomy`.
- Status JSON includes `pendingFallbacks` with `rust-owned-parse-gap`.
- CLI success output shows a concise fallback/degraded summary when fallback files were appended.
- MCP normal answers do not expose engine details.
- Doctor bundle remains out of scope.

### 5. Full Gin examples smoke and decision

Rerun the full real Gin repository smoke and record evidence.

Acceptance:

- Use `gin-gonic/examples` full repository.
- Record repository URL, commit/hash, commands, and environment.
- `rust-hybrid` full index completes without mixed-language fail-fast.
- Status shows Go Rust ownership.
- Status shows TypeScript fallback for non-Rust-owned supported files.
- Deterministic route-to-handler probe still passes on the chosen Go example.
- Generated skip count is recorded, even if empty.
- Evidence document records known gaps and no-go behavior.
- Phase 3 decision artifact is written.
- Explicitly state that Rust-owned per-file fallback, SDK defaults, doctor bundles, README/release messaging, performance gates, and first-user release readiness remain out of scope.

## Validation

Required:

- Planner assignment tests.
- Internal fallback append tests.
- CLI mixed-language `rust-hybrid` tests.
- Status JSON fallback health tests.
- Rust process/system failure regression test.
- TypeScript escape hatch regression test.
- `npm run build`.
- Full `gin-gonic/examples` deterministic smoke.
- Evidence/decision document.

Not required:

- Full agent A/B.
- Release-like packaged smoke unless packaging/release scripts are touched.
- SDK default tests.
- Doctor bundle smoke.
- Performance target gate.

## Acceptance Criteria

- Mixed-language repositories no longer fail fast solely because TypeScript fallback writes are required.
- Rust-owned files remain Rust-owned.
- Non-Rust-owned supported files are appended through TypeScript fallback.
- Final graph is one unified `.zcodegraph` graph.
- Finalization runs once after Rust and fallback append.
- Status/metadata exposes assignment and fallback health.
- CLI output lightly surfaces fallback/degraded completion.
- Rust process/system failure remains fail-safe.
- TypeScript escape hatch remains available.
- Full `gin-gonic/examples` deterministic smoke completes.
- First-user release readiness is not claimed.

## Stop Conditions

Stop and write a decision instead of expanding scope if:

- TypeScript fallback append requires a SQLite schema migration.
- Append cannot avoid restamping the whole index as TypeScript-built.
- Append cannot preserve failure-safe active index replacement.
- Rust-owned per-file fallback becomes required to complete language-level fallback.
- The work starts changing SDK default behavior.
- The work starts implementing doctor bundles.
- The work starts changing README/release messaging.
- The work starts requiring packaged release smoke without packaging changes.

## Next Plan Recommendation

After Phase 3, choose the next plan based on evidence:

- If full mixed-language fallback works, do doctor diagnostic bundle so first users can report reproducible problems.
- If fallback write semantics expose API/runtime instability, do a bounded fallback hardening plan.
- Keep SDK default behavior as a separate slice after CLI fallback is stable.

## 7. `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`

# Rust-Hybrid Phase 4 Decision

## Decision

Phase 4 is accepted as the diagnostic bundle v1 slice for the CLI `rust-hybrid` full-index path.

The implementation now persists `last-run` and `last-failure` diagnostic records, exposes `zcodegraph doctor --engine rust-hybrid --bundle --last-run|--last-failure`, creates local directory bundles, excludes source and plaintext file paths by default, and prints targeted doctor hints for degraded and failed `rust-hybrid` runs.

This decision does not claim first-user release readiness.

## Evidence

- Build: `npm run build`
- Targeted smoke: `npx vitest run __tests__/rust-hybrid-doctor.test.ts __tests__/rust-index-engine-cli.test.ts __tests__/status-json.test.ts`
- Result: 58 passed
- Smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`

## Accepted Behavior

- Completed `rust-hybrid` runs write `.zcodegraph/diagnostics/last-run.json`.
- Process-level `rust-hybrid` failures write `.zcodegraph/diagnostics/last-failure.json`.
- `doctor --engine rust-hybrid --bundle --last-run` creates a local directory bundle.
- `doctor --engine rust-hybrid --bundle --last-failure` creates a local directory bundle.
- `--last-run` and `--last-failure` are mutually exclusive.
- Missing records fail with an actionable error.
- `--include-source-slice` fails explicitly because source slices are unsupported in bundle v1.
- Bundles include manifest, status, graph stats, profile or unavailable reason, corpus fingerprint, per-file diagnostics, replay manifest, and privacy summary.
- Run records and bundles include RSS unavailable reason when RSS was not collected.
- Git metadata is limited to low-risk fields and degrades to a taxonomy reason when unavailable.
- Default bundles exclude source code and plaintext file paths.
- Non-quiet degraded `rust-hybrid` output points users to `doctor --engine rust-hybrid --bundle --last-run`.
- Non-quiet process/system failure output points users to `doctor --engine rust-hybrid --bundle --last-failure`.
- Quiet mode remains quiet except for run-record persistence.

## Out Of Scope

- Packaged or release-like doctor smoke.
- README or release messaging.
- Source slices.
- Automatic diagnostic upload.
- Zip or tar archive generation.
- High-precision RSS sampling.
- Rust-owned per-file parse/extraction fallback to TypeScript.
- SDK default behavior or SDK engine options.
- Full agent A/B.
- First-user release readiness.

## Follow-Up

#225 remains the parent diagnostic bundle tracker for broader Rust indexing diagnostic feedback. Phase 4 satisfies the `rust-hybrid` local bundle v1 slice, but later release work still needs packaged/release-like validation before user-facing release messaging.

## 8. `docs/plans/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-v1.md`

# Rust-Hybrid Phase 4: Diagnostic Bundle v1

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Diagnostic bundle tracker: [#225](https://github.com/jununfly/ZCodeGraph/issues/225)
- Phase 3 plan: `docs/plans/2026-06-18-rust-hybrid-phase-3-typescript-fallback-writes.md`
- Phase 3 decision: `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`
- Phase 3 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- Phase 4 tracker: [#245](https://github.com/jununfly/ZCodeGraph/issues/245)
- Phase 4 decision: `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`
- Phase 4 smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`

## Context

Phase 3 made the CLI `rust-hybrid` path complete for mixed-language repositories at language-level fallback granularity. It now writes Rust-owned files first, appends TypeScript fallback files into the same graph, runs one TypeScript shell finalization pass, and exposes fallback metadata in status.

The first-user release PRD still requires users to produce a privacy-preserving diagnostic bundle when `rust-hybrid` is degraded or fails. Issue #225 already tracks the initial diagnostic bundle capability. Phase 4 should reuse and expand #225 for `rust-hybrid` last-run and last-failure bundles instead of creating a duplicate generic diagnostics tracker.

## Goal

Implement diagnostic bundle v1 for `rust-hybrid` so first users can provide maintainers with local, privacy-preserving, replayable or analyzable evidence without sharing source code by default.

After Phase 4:

1. `rust-hybrid` index runs persist a minimal `last-run` record.
2. `rust-hybrid` process/system failures persist a minimal `last-failure` record.
3. Users can run:

   ```bash
   zcodegraph doctor --engine rust-hybrid --bundle --last-run
   zcodegraph doctor --engine rust-hybrid --bundle --last-failure
   ```

4. The command creates a local directory bundle.
5. The bundle excludes source code and plaintext file paths by default.
6. The bundle includes engine assignment, fallback taxonomy, graphStats, profile data when available, RSS or unavailable reason, corpus fingerprint, sanitized stdout/stderr tail, per-file diagnostics without source, replay manifest, and privacy summary.
7. `rust-hybrid` degraded/failure CLI output tells users how to generate the relevant bundle.

This phase does not claim first-user release readiness on its own.

## Non-Goals

- Do not implement Rust-owned per-file parse/extraction fallback to TypeScript.
- Do not remove `rust-owned-parse-gap` from `pendingFallbacks`.
- Do not implement SDK default behavior or SDK engine options.
- Do not implement packaged/release-like doctor smoke.
- Do not update README or release messaging.
- Do not add source slices.
- Do not upload diagnostics automatically.
- Do not generate zip/tar archives.
- Do not add high-precision RSS sampling.
- Do not run full agent A/B.
- Do not close #165.

## Decisions

### Reuse and expand #225

Phase 4 should treat #225 as the parent diagnostic bundle tracker. The issue title still mentions Rust indexing generally, but the PRD now needs `rust-hybrid` coverage. Update #225 comments or follow-up issue references as needed; do not create a second generic diagnostics tracker.

### Persist last-run before bundle generation

`doctor --last-run` and `doctor --last-failure` cannot be reliably generated from current status alone. Phase 4 should first add run records under `.zcodegraph/diagnostics/`.

Suggested files:

```text
.zcodegraph/diagnostics/last-run.json
.zcodegraph/diagnostics/last-failure.json
```

`last-run.json` is written for:

- successful healthy runs,
- successful degraded runs,
- completed runs with file-level parse/index warnings or errors.

`last-failure.json` is written for:

- Rust binary missing,
- Rust subprocess crash or non-zero exit,
- lock/staging/system failure,
- TypeScript fallback append failure that aborts the run,
- TypeScript shell finalization failure that aborts the run,
- CLI-level unhandled index exception.

`last-failure.json` is not written for:

- a single file parse error when overall index succeeds,
- generated skip,
- unsupported unknown files skipped by the source scanner,
- fallback degraded but completed.

### Bundle is a directory

Phase 4 v1 creates an inspectable directory, not a compressed archive.

Suggested output shape:

```text
.zcodegraph/diagnostics/bundles/<timestamp>-last-run/
  manifest.json
  status.json
  graph-stats.json
  profile.json
  corpus-fingerprint.json
  per-file-diagnostics.json
  replay.md
  privacy.md
```

The command should print the created directory path.

### No source slices

`--include-source-slice` remains out of scope. If passed, the command should fail with an explicit message that source slices are not supported yet and that v1 bundles exclude source by default.

### No plaintext file paths by default

Default bundle contents must not include plaintext file paths. Use:

- `projectRootHash`,
- `pathHash`,
- extension,
- detected language,
- size,
- git blob hash when available,
- engine assignment,
- fallback reason or error taxonomy,
- line/column when available.

Corpus fingerprint may include aggregate counts and distributions but not full file path lists.

### Low-risk Git metadata only

Capture Git metadata when available, and degrade cleanly when unavailable.

Allowed:

- `gitCommit`,
- `gitDirty`,
- `gitTrackedFileCount` if cheap,
- `gitAvailable`,
- unavailable/failure reason.

Do not capture:

- remote URL,
- branch name,
- author/email,
- commit message,
- diff,
- untracked filenames,
- full `git status` output.

### Sanitized stdout/stderr tail

Run records and bundles should store sanitized tails, not raw unlimited process output.

Suggested limits:

- `stdoutTail`: at most 200 lines or 32KB, whichever is smaller.
- `stderrTail`: at most 200 lines or 32KB, whichever is smaller.

Redaction:

- absolute paths -> `<path>`,
- home directory -> `<home>`,
- obvious token/secret shapes -> `<redacted>`,
- long hex/base64-like strings -> `<redacted>`.

If tail data is unavailable, write an explicit unavailable reason.

### RSS field, not RSS sampling

Phase 4 should include RSS fields in the run record and bundle. If no existing profile/run metadata contains RSS, write:

```json
{
  "peakRssBytes": null,
  "unavailableReason": "not-collected-in-this-run"
}
```

Do not add a new RSS sampling loop in this phase.

### CLI doctor hints

For `rust-hybrid` degraded success, print a concise hint in non-quiet mode:

```text
Indexed with rust-hybrid
Fallback health: degraded
Run diagnostic bundle:
  zcodegraph doctor --engine rust-hybrid --bundle --last-run
```

For `rust-hybrid` process/system failure, print:

```text
Rust-hybrid indexing failed before fallback could safely continue.
Previous index was preserved.
Run:
  zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

Quiet mode should remain quiet except for writing run records.

### Source-checkout deterministic tests only

Phase 4 should verify source-checkout behavior. Do not require release-like packaged doctor smoke in this phase. Packaging/release-like doctor smoke should be a later release gate.

## Expected Behavior

### Last-run degraded bundle

After indexing a project where `rust-hybrid` completed with TypeScript fallback:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
```

Expected:

- exits successfully,
- prints the bundle directory,
- includes status and hybrid fallback metadata,
- includes graphStats and profile when available,
- includes fallback file diagnostics without source or plaintext paths,
- includes corpus fingerprint and privacy summary,
- includes RSS unavailable reason if RSS was not collected.

### Last-failure bundle

After a Rust process/system failure:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

Expected:

- exits successfully if a last-failure record exists,
- prints the bundle directory,
- includes sanitized failure tail,
- includes command metadata, exit code, elapsed time, selected engine, and failure taxonomy,
- states previous index preservation status when known,
- excludes source and plaintext file paths.

If no matching record exists, the command should fail with an actionable message.

### Source slice rejection

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run --include-source-slice
```

Expected:

- exits non-zero,
- explains source slices are not supported in v1,
- does not create a bundle.

## Issue Sequence

### Published Issues

Execute in this dependency order:

1. [#246 Rust-hybrid Phase 4.1: Add diagnostic run record contract](https://github.com/jununfly/ZCodeGraph/issues/246)
2. [#247 Rust-hybrid Phase 4.2: Add doctor bundle command](https://github.com/jununfly/ZCodeGraph/issues/247)
3. [#248 Rust-hybrid Phase 4.3: Populate diagnostic bundle content and privacy defaults](https://github.com/jununfly/ZCodeGraph/issues/248)
4. [#249 Rust-hybrid Phase 4.4: Add CLI doctor hints for degraded and failed runs](https://github.com/jununfly/ZCodeGraph/issues/249)
5. [#250 Rust-hybrid Phase 4.5: Run diagnostic bundle smoke and record decision](https://github.com/jununfly/ZCodeGraph/issues/250)

### 1. Run record contract

Persist `last-run.json` and `last-failure.json` under `.zcodegraph/diagnostics/`.

Acceptance:

- `rust-hybrid` healthy and degraded completed runs write `last-run.json`.
- Process/system failures write `last-failure.json`.
- File-level parse/index errors in a completed run stay in `last-run` taxonomy and do not overwrite `last-failure`.
- Records include selected engine, command metadata, exit code, elapsed time, fallback health, status pointer/summary, profile pointer/summary, RSS field or unavailable reason, sanitized stdout/stderr tail or unavailable reason, and previous-index-preserved when known.
- Tests cover success, degraded success, and forced Rust process failure.

### 2. Doctor bundle command

Add the user command:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

Acceptance:

- Command creates a local directory bundle.
- Command prints the bundle path.
- `--last-run` and `--last-failure` are mutually exclusive.
- Missing run/failure records produce actionable errors.
- `--include-source-slice` is rejected.
- No network upload is performed.
- Tests cover command shape and directory creation.

### 3. Bundle content and privacy

Populate the bundle with PRD-required diagnostic content while preserving privacy defaults.

Acceptance:

- Bundle includes `manifest.json`.
- Bundle includes `status.json`.
- Bundle includes `graph-stats.json`.
- Bundle includes `profile.json` when available, or an unavailable reason.
- Bundle includes RSS or unavailable reason.
- Bundle includes `corpus-fingerprint.json` with aggregate counts/distributions and low-risk Git metadata.
- Bundle includes `per-file-diagnostics.json` using path hashes, not plaintext paths.
- Bundle includes `replay.md`.
- Bundle includes `privacy.md`.
- Tests assert source file contents and plaintext file paths are not included by default.
- Tests assert remote URL, branch name, commit message, diff, and untracked filenames are not included.

### 4. Rust-hybrid CLI doctor hints

Surface the next diagnostic command when `rust-hybrid` is degraded or fails.

Acceptance:

- Non-quiet degraded `rust-hybrid` output shows `doctor --engine rust-hybrid --bundle --last-run`.
- Non-quiet process/system failure output shows `doctor --engine rust-hybrid --bundle --last-failure`.
- Quiet mode remains quiet except run-record persistence.
- MCP normal answers do not expose engine internals.
- TypeScript-only indexing path is not forced to show Rust-hybrid doctor hints.

### 5. Phase 4 smoke and decision

Run source-checkout deterministic smoke and record the decision.

Acceptance:

- `npm run build` passes.
- Targeted doctor tests pass.
- A degraded `rust-hybrid` run can produce a `last-run` bundle.
- A forced Rust failure can produce a `last-failure` bundle.
- Evidence document is written under `docs/benchmarks/`.
- Phase 4 decision artifact is written under `docs/plans/`.
- #225 is updated with the Phase 4 outcome.
- The decision explicitly states packaged doctor smoke, README messaging, source slices, RSS sampling, Rust-owned per-file fallback, SDK behavior, and first-user release readiness remain out of scope.

## Validation

Required:

- `npm run build`
- targeted doctor/run-record tests
- targeted `rust-hybrid` degraded bundle smoke
- targeted forced Rust failure bundle smoke

Not required:

- release-like packaged doctor smoke,
- npm package smoke,
- README update,
- full agent A/B,
- performance scoreboard.

## Exit Criteria

Phase 4 is complete when:

- first users have a copy-paste local diagnostic bundle command for `rust-hybrid`,
- maintainers receive enough metadata to classify degraded and failed runs without source code,
- privacy defaults are enforced by tests,
- source-checkout smoke proves both `last-run` and `last-failure` bundle paths,
- #225 has been updated to reference the implementation and evidence.

Phase 4 completion does not close the first-user release PRD.

## 9. `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`

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

## 10. `docs/plans/2026-06-18-rust-hybrid-phase-5-release-like-packaged-smoke.md`

# Rust-Hybrid Phase 5: Release-Like Packaged Smoke and Readiness Evidence

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 4 plan: `docs/plans/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-v1.md`
- Phase 4 decision: `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`
- Phase 4 smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`
- Phase 5 tracker: [#251](https://github.com/jununfly/ZCodeGraph/issues/251)
- Phase 5 decision: `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`
- Phase 5 smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`

## Context

Phase 1 made `rust-hybrid` the CLI full-index default skeleton. Phase 2 added Rust-owned Go extraction and a Gin sufficiency slice. Phase 3 implemented language-level TypeScript fallback writes into one unified graph. Phase 4 added local diagnostic bundles for degraded and failed `rust-hybrid` runs.

Those phases validated source-checkout behavior. The first-user release PRD still requires release-like packaged behavior: users install a bundle or npm shim, the CLI discovers the packaged Rust core, `rust-hybrid` remains the default full-index strategy, status exposes hybrid health, and doctor bundles work from the packaged path.

The existing package smoke script predates the `rust-hybrid` default and still speaks in terms of default TypeScript and explicit Rust. Phase 5 should update that smoke gate so the release-like path validates the current product strategy rather than the old implementation story.

## Goal

Prove that release-like packaged CLI and staged npm shim paths can run the first-user `rust-hybrid` workflow:

1. `zcodegraph init -i` uses `rust-hybrid` by default.
2. `zcodegraph index` uses `rust-hybrid` by default.
3. `zcodegraph index --engine rust-hybrid` works explicitly.
4. Packaged status exposes hybrid metadata.
5. Degraded `rust-hybrid` runs can produce `doctor --last-run` bundles.
6. Rust process-level failures fail safely and can produce `doctor --last-failure` bundles.

This phase provides release-like readiness evidence. It does not claim final first-user release readiness.

## Non-Goals

- Do not update README or release messaging.
- Do not implement SDK default behavior or SDK engine options.
- Do not implement Rust-owned per-file parse/extraction fallback to TypeScript.
- Do not require real Gin packaged smoke.
- Do not trigger the GitHub Release workflow.
- Do not publish npm packages.
- Do not push tags.
- Do not close #165.
- Do not claim final first-user release readiness.

## Decisions

### Cover extracted bundle and staged npm shim

Phase 5 must cover both release-like shapes:

- extracted bundle with `bin/zcodegraph` and `bin/zcodegraph-core`,
- staged npm shim with the matching optional platform package.

Testing only the extracted bundle would miss npm shim and optional dependency layout failures. Testing only the npm shim would make Rust core discovery failures harder to diagnose.

### Build and run local release-like artifacts

Unit tests for the smoke script are useful but insufficient. Phase 5 evidence must include one local release-like smoke run against built artifacts:

- a local extracted bundle,
- a local staged npm root.

The smoke remains local-only. It must not publish, contact the public npm registry, trigger a GitHub Release workflow, or upload diagnostics.

### Cover healthy, degraded, and failure paths

The smoke should use small deterministic fixtures rather than a real Gin checkout.

Required fixture classes:

- healthy: Rust-owned JS/TS/Go fixture indexes successfully and status reports `rust-hybrid`,
- degraded: mixed supported non-Rust-owned file triggers TypeScript fallback and `doctor --last-run` works,
- failure: packaged Rust core is hidden or removed, `rust-hybrid` fails safely, previous index is preserved, and `doctor --last-failure` works.

Real Gin sufficiency evidence remains covered by earlier source-checkout phases. Phase 5 is about package mechanics, not Go coverage breadth.

### Align CI packaged-path checks

`.github/workflows/ci.yml` should stop checking the old TypeScript-default wording for packaged path coverage. The targeted CI check should align with `rust-hybrid` default behavior and packaged Rust core discovery.

### Leave SDK and per-file Rust fallback as follow-ups

The SDK remains a separate API and error-model slice. Rust-owned per-file parse/extraction fallback also remains a separate release blocker or follow-up blocker because it requires Rust gap taxonomy and graph replacement semantics.

Phase 5 should name these gaps in the decision artifact, but not implement them.

## Expected Behavior

### Extracted bundle smoke

Given a local extracted bundle:

```bash
node scripts/rust-package-smoke.mjs --bundle <bundle-dir> --npm-root <npm-root> --out <out-dir>
```

Expected bundle gates:

- `init -i` exits successfully and writes a `rust-hybrid` index.
- default `index` exits successfully and writes a `rust-hybrid` index.
- explicit `index --engine rust-hybrid` exits successfully.
- `status --json` reports hybrid metadata.
- degraded fixture records fallback taxonomy and `doctor --last-run` creates a bundle directory.
- missing packaged Rust core fails safely under `rust-hybrid`, preserves the previous index, and `doctor --last-failure` creates a bundle directory.

### Staged npm shim smoke

Given a staged npm root containing the main package and matching platform package:

- npm shim launches the packaged CLI.
- npm default `index` uses `rust-hybrid`.
- npm explicit `--engine rust-hybrid` works.
- npm status reports hybrid metadata.
- npm degraded run creates `doctor --last-run` bundle.
- npm missing optional platform package still fails clearly.
- npm package metadata still has no postinstall and no local Rust compilation requirement.

### CI alignment

The packaged-path CI target should verify current `rust-hybrid` behavior, not stale TypeScript-default behavior.

## Issue Breakdown

1. [#252 Rust-hybrid Phase 5.1: Update package smoke contract for rust-hybrid](https://github.com/jununfly/ZCodeGraph/issues/252)
2. [#254 Rust-hybrid Phase 5.2: Add package smoke tests and CI alignment](https://github.com/jununfly/ZCodeGraph/issues/254)
3. [#253 Rust-hybrid Phase 5.3: Run local extracted bundle smoke](https://github.com/jununfly/ZCodeGraph/issues/253)
4. [#255 Rust-hybrid Phase 5.4: Run staged npm shim smoke](https://github.com/jununfly/ZCodeGraph/issues/255)
5. [#256 Rust-hybrid Phase 5.5: Record packaged smoke evidence and decision](https://github.com/jununfly/ZCodeGraph/issues/256)

## Validation

Required before closing Phase 5:

- `npm run build` passes.
- Targeted unit/script tests pass.
- Local extracted bundle smoke passes.
- Local staged npm shim smoke passes.
- Smoke covers healthy, degraded, and process-failure `rust-hybrid` paths.
- Packaged `status --json` hybrid metadata is verified.
- Packaged doctor `last-run` and `last-failure` bundle generation is verified.
- Evidence document is written under `docs/benchmarks/`.
- Decision document is written under `docs/plans/`.
- Decision explicitly states SDK behavior and Rust-owned per-file fallback remain separate follow-ups.

Do not require:

- full benchmark scoreboard,
- real Gin packaged smoke,
- release workflow trigger,
- npm publish,
- README update.

## Stop Conditions

Stop and write a blocker decision instead of expanding scope if:

- packaged Rust core discovery fails in a way that requires release workflow redesign,
- staged npm shim cannot exercise the packaged CLI without changing package architecture,
- doctor bundle generation requires source slices or automatic upload,
- validating `rust-hybrid` packaged path requires implementing SDK defaults,
- per-file Rust fallback becomes necessary to make the package smoke pass.

## 11. `docs/plans/2026-06-18-rust-hybrid-phase-6-decision.md`

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

## 12. `docs/plans/2026-06-18-rust-hybrid-phase-6-rust-owned-per-file-gap-fallback.md`

# Rust-Hybrid Phase 6: Rust-Owned Per-File Gap Fallback

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 6 tracker: [#257](https://github.com/jununfly/ZCodeGraph/issues/257)
- Phase 6 decision: `docs/plans/2026-06-18-rust-hybrid-phase-6-decision.md`
- Phase 6 evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`
- Phase 5 plan: `docs/plans/2026-06-18-rust-hybrid-phase-5-release-like-packaged-smoke.md`
- Phase 5 decision: `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`
- Phase 5 smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`

## Context

Phase 1 made `rust-hybrid` the CLI full-index default. Phase 2 added Rust-owned Go extraction and a Gin sufficiency slice. Phase 3 implemented language-level TypeScript fallback writes into one unified graph. Phase 4 added privacy-preserving diagnostic bundles for degraded and failed `rust-hybrid` runs. Phase 5 validated release-like packaged CLI and staged npm shim smoke for the `rust-hybrid` first-user path.

The first-user release PRD still has one core fallback semantics gap: individual Rust-owned files that hit Rust parse or extraction gaps should fall back to the TypeScript indexer. Current metadata still treats `rust-owned-parse-gap` as a pending fallback rather than an implemented per-file fallback path.

Phase 6 should close that semantic gap without changing SDK behavior, README messaging, packaged layout, or performance targets.

## Goal

Implement Rust-owned per-file gap fallback for the CLI `rust-hybrid` path.

After Phase 6:

1. Rust core can report structured per-file parse/extraction gaps while the Rust process itself succeeds.
2. The contract distinguishes per-file gaps from process/system failures.
3. The CLI `rust-hybrid` orchestrator consumes Rust-owned per-file gap reports.
4. Rust-owned files that were not written by Rust are appended through TypeScript fallback.
5. Completed runs with Rust-owned per-file fallback are marked degraded, not healthy and not failed.
6. Status and doctor output expose Rust-owned gap taxonomy separately from language-level TypeScript fallback.

This phase does not claim final first-user release readiness on its own.

## Non-Goals

- Do not implement SDK default behavior or SDK engine options.
- Do not update README or release messaging.
- Do not run full release-like packaged smoke unless packaging, launcher, npm shim, or release scripts are touched.
- Do not implement per-file graph cleanup or replacement for partial Rust writes.
- Do not optimize performance or close #165.
- Do not fake real Rust gap evidence.
- Do not change MCP tool names or protocol.
- Do not expose engine internals in normal MCP answers beyond existing health boundaries.

## Decisions

### Only per-file gaps, not process failures

Phase 6 only handles this case:

- Rust process exits successfully,
- Rust result is structurally valid,
- one or more Rust-owned source files are reported as parse/extraction gaps,
- those files were not written into the graph by Rust.

The following remain fail-safe aborts:

- Rust binary missing,
- Rust subprocess crash or non-zero exit,
- lock or staging failure,
- SQLite write failure,
- corrupted staging state,
- malformed Rust result,
- any system/process failure where users would incorrectly believe they tested `rust-hybrid`.

### Structured Rust core contract

Rust core should report per-file failures as structured data, not stderr text.

Suggested shape:

```json
{
  "success": true,
  "filesIndexed": 10,
  "filesErrored": 2,
  "errors": [
    {
      "filePath": "src/bad.ts",
      "language": "typescript",
      "code": "rust-owned-parse-gap",
      "severity": "warning",
      "line": 12,
      "column": 4
    }
  ]
}
```

Contract requirements:

- `filePath` is project-relative.
- `language` is detected or inferred when available.
- `code` is a stable taxonomy value.
- `severity` for fallback-eligible gaps is warning-level, not fatal.
- line/column/message are optional.
- fallback-eligible failed files must not have been partially written by Rust.

If Rust cannot guarantee a failed file was unwritten, the file is not fallback-eligible in Phase 6.

### No partial-write replacement in Phase 6

Phase 6 does not implement per-file graph replacement. TypeScript fallback append is safe only when Rust did not write nodes, edges, references, or file rows for the failed file.

If a future Rust failure mode can leave partial graph data, record:

- `rust-owned-gap-with-partial-write-blocked`,
- the affected file count,
- a clear decision/evidence note.

Do not append TypeScript fallback on top of partial Rust graph data.

### CLI orchestrator owns fallback append

The TypeScript CLI orchestration layer remains responsible for hybrid fallback. Rust core should not call the TypeScript fallback path directly.

CLI responsibilities:

- read Rust per-file gap reports,
- filter fallback-eligible Rust-owned files,
- call the existing TypeScript fallback append path for those files,
- merge fallback counts and taxonomy with language-level fallback metadata,
- preserve fail-safe behavior for process/system failures.

### Status and doctor taxonomy

Completed runs with Rust-owned per-file fallback should have:

- `fallbackState: "degraded"`,
- `fallbackFileCount` including language-level and Rust-owned fallback files,
- `fallbackByLanguage`,
- `fallbackReasonTaxonomy`.

Required taxonomy values:

- `language-level-typescript-fallback`,
- `rust-owned-parse-gap`,
- `rust-owned-extraction-gap`,
- `rust-owned-gap-with-partial-write-blocked`.

Doctor last-run bundles should include fallback taxonomy and per-file diagnostics without source code or plaintext paths.

### Fake-core tracer first, real reduced fixture attempt second

Phase 6 should first validate the contract with a fake Rust core:

- Rust process succeeds,
- result reports a Rust-owned per-file gap,
- CLI appends the failed file through TypeScript fallback,
- status/doctor record degraded taxonomy.

Then Phase 6 should attempt one real reduced fixture:

- pass if a stable real Rust parse/extraction gap can be produced and fallback works,
- acceptable blocker decision if no stable real gap can be produced without inventing one.

Do not create fake evidence and call it a real Rust gap.

## Expected Behavior

### Fake-core per-file fallback tracer

Given a project with a Rust-owned file that the fake Rust core reports as fallback-eligible:

```bash
ZCODEGRAPH_RUST_CORE_BINARY=<fake-core> zcodegraph index --engine rust-hybrid
```

Expected:

- command exits successfully,
- TypeScript fallback append indexes the failed file,
- graph remains readable by existing query/status paths,
- status shows `fallbackState: "degraded"`,
- status taxonomy includes `rust-owned-parse-gap` or `rust-owned-extraction-gap`,
- doctor last-run bundle includes per-file diagnostics without source/plaintext paths.

### Process failure remains fail-safe

Given a missing or crashing Rust core:

```bash
ZCODEGRAPH_RUST_CORE_BINARY=<missing> zcodegraph index --engine rust-hybrid
```

Expected:

- command exits non-zero,
- previous good index is preserved,
- no full TypeScript fallback is attempted,
- doctor last-failure remains available.

### Partial write blocked

Given a Rust result that marks a file as failed but does not guarantee it was unwritten:

Expected:

- TypeScript fallback is not appended for that file,
- status/doctor taxonomy includes `rust-owned-gap-with-partial-write-blocked`,
- decision/evidence records the blocker.

## Issue Breakdown

1. [#261](https://github.com/jununfly/ZCodeGraph/issues/261): Rust core per-file failure contract.
2. [#258](https://github.com/jununfly/ZCodeGraph/issues/258): CLI per-file fallback append.
3. [#259](https://github.com/jununfly/ZCodeGraph/issues/259): Status and doctor taxonomy.
4. [#260](https://github.com/jununfly/ZCodeGraph/issues/260): Real reduced fixture smoke attempt.
5. [#262](https://github.com/jununfly/ZCodeGraph/issues/262): Evidence and decision.

## Validation

Required before closing Phase 6:

- `npm run build` passes.
- Targeted Rust core contract tests pass.
- Targeted CLI `rust-hybrid` fake-core fallback tests pass.
- Targeted status/doctor taxonomy tests pass.
- Fake-core source-checkout CLI smoke passes.
- One real reduced fixture attempt is recorded:
  - pass if stable real gap exists and fallback works,
  - blocker evidence if no stable real gap exists.
- Evidence document is written under `docs/benchmarks/`.
- Decision document is written under `docs/plans/`.
- Decision explicitly keeps SDK, README, full packaged smoke, per-file replacement cleanup, and #165 out of scope.

Do not require:

- full benchmark scoreboard,
- real Gin packaged smoke,
- release workflow trigger,
- npm publish,
- README update,
- SDK behavior changes.

## Stop Conditions

Stop and write a blocker decision instead of expanding scope if:

- Rust core cannot distinguish per-file gaps from process/system failures,
- Rust core cannot guarantee failed files are unwritten,
- TypeScript fallback append requires per-file graph replacement to be safe,
- the work starts changing SDK public API behavior,
- the work starts changing README or release messaging,
- the phase starts optimizing performance instead of implementing fallback semantics.

## 13. `docs/plans/2026-06-19-rust-hybrid-default-indexing-wall-clock-ab.md`

# Rust-Hybrid Default Indexing Wall-Clock A/B Plan

## Parent

- Long-running performance tracker: #165
- Existing parse-extraction profiling candidate: #224
- Previous bounded A/B pass:
  `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`
- First-user release PRD:
  `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

## Context

The first-user `rust-hybrid` path is usable enough that strict performance
targets are no longer first-user release blockers, but full-index speed still
matters for trust. The previous bounded A/B pass kept a Rust core bulk
transaction candidate and materially reduced the Rust SQLite write bucket on
VS Code sparse. That changed the bottleneck shape: `parseExtractionMs` is now
more visible among Rust-owned buckets, while TypeScript finalization and
reference-resolution work remain large in the end-to-end profile.

This plan is a second disciplined wall-clock optimization loop for the
`rust-hybrid` default path. It should not expand into a general optimization
program, new feature work, language coverage, or technical-debt cleanup.

## Goal

Improve or credibly evaluate one next `rust-hybrid` default-path full-index
wall-clock candidate, with RSS as a guardrail.

The plan should answer:

- What is the current bottleneck shape after the prior Rust write-path
  optimization?
- Is #224 (`parseExtractionMs` profiling) the next best candidate, or does
  end-to-end evidence point to a different bounded candidate?
- Can one selected candidate be tried without changing default user behavior or
  reference-disambiguation semantics?
- Does the after-profile justify keep, rollback, or no-go?

## Corpora

Use source-path `rust-hybrid` full indexing on:

- Current repository:
  `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`
- VS Code sparse checkout:
  `/private/tmp/codegraph-corpus/vscode-sparse`

The VS Code sparse checkout must already exist and be a Git checkout. If it is
missing or not a Git checkout, stop the VS Code portion and mark the issue as
needing human setup. Do not clone or replace the corpus from the agent.

## Metrics

Primary metric:

- full-index wall-clock time for the `rust-hybrid` default path.

Guardrail:

- peak RSS / memory stability, or a clear unavailable reason.

Diagnostic buckets:

- `rustCore.parseExtractionMs`
- `rustCore.sqliteWriteMs`
- `typescriptFinalizationMs`
- `finalize.referenceResolutionMs`
- public finalization sub-buckets when available
- `typescriptFallbackAppend.durationMs` and fallback file/error counts

## Candidate Rules

### Baseline First

Do not choose the implementation candidate before collecting the new baseline.
The baseline must compare the current repo and VS Code sparse against the latest
local build.

### Exactly One Bounded Candidate

Try at most one production-code candidate. If no credible candidate appears,
record a no-go decision instead of forcing implementation.

### #224 Is In Scope But Not Preselected

#224 is part of the candidate pool because `parseExtractionMs` may now be a
more visible Rust-owned bucket. However, the plan must not assume parse
extraction is the correct implementation target before the baseline. If the
largest controllable bottleneck is TypeScript finalization/reference
resolution, a narrow low-semantic-risk A/B is allowed.

### Semantic Guardrails

Do not change every-reference disambiguation semantics in this plan. If a
candidate touches finalization/reference resolution, keep it to low-semantic
risk mechanics such as diagnostics, batching, duplicate lookup removal, or write
path cleanup. Do not migrate resolver semantics or broaden language/framework
coverage here.

## Non-Goals

- Do not optimize TypeScript-only standalone indexing.
- Do not require Rust to beat the TypeScript indexer end-to-end.
- Do not run the full benchmark scoreboard.
- Do not run agent sufficiency A/B by default.
- Do not add a new language, framework, or user-facing feature.
- Do not update README by default.
- Do not change SQLite schema.
- Do not run packaged/release smoke unless the selected candidate touches CLI
  launcher, packaging, status, doctor, or release workflow paths.

## Documentation Rules

- Save baseline and after evidence under `docs/benchmarks/`.
- If production code changes, update `CHANGELOG.md` under `## [Unreleased]`
  with a user-facing note.
- Update #165 with the outcome.
- Update #224 only if the evidence confirms, rejects, or materially reframes
  the parse-extraction profiling candidate.

## Issue Sequence

1. #291 Baseline profile and candidate selection.
2. #292 Implement one bounded candidate.
3. #293 After-profile decision and tracker updates.
4. #294 Tracker for this plan.

## Acceptance

- Baseline profiles are recorded for the current repo and VS Code sparse, or
  the VS Code path is explicitly marked as needing human setup.
- Evidence includes wall-clock, RSS or unavailable reason, and the agreed
  diagnostic buckets.
- Exactly one candidate is selected, or the plan records no-go.
- The implementation issue changes only the selected candidate and includes
  targeted deterministic tests where production code changes.
- After-profile evidence compares baseline vs after on both corpora where
  available.
- Final decision says keep, rollback, or no-go.
- #165 is updated with the outcome.
- #224 is updated only if parse-extraction evidence is relevant.

## 14. `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`

# Rust-Hybrid Indexing Performance A/B Plan

## Parent

- Long-running performance tracker: #165
- Existing parse-extraction profiling candidate: #224
- First-user release PRD:
  `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

## Context

The first-user `rust-hybrid` path is usable enough to keep moving without a
strict performance release gate, but indexing speed and resource use still
matter for first-user trust. Previous work improved diagnostic quality and made
fallback understandable. This plan is a bounded performance pass for the
default `rust-hybrid` indexing path.

The goal is not to restart the broader Rust-indexing optimization program or to
prove that Rust beats the TypeScript indexer end-to-end in one pass. The goal is
to run one disciplined A/B loop that produces credible trend evidence and a
clear next decision.

## Goal

Measure and, if justified, improve `rust-hybrid` default-path full indexing
wall-clock time while keeping memory behavior trustworthy.

The plan should answer:

- Where does current `rust-hybrid` indexing time go on the source checkout path?
- Is there one bounded production-code optimization candidate worth trying now?
- Does that candidate improve wall-clock time on representative corpora?
- Does RSS remain stable, or is an unavailable memory measurement explained?
- Should the candidate be kept, rolled back, or recorded as no-go?

## Corpora

Use exactly these source-path corpora:

- Current repository:
  `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`
- VS Code sparse checkout:
  `/private/tmp/codegraph-corpus/vscode-sparse`

The VS Code sparse checkout must already exist and be a Git checkout. If it is
missing or not a Git checkout, stop the VS Code portion and mark the issue as
needing human setup. Do not clone or replace the corpus from the agent.

## Metrics

Primary metric:

- full-index wall-clock time for the `rust-hybrid` default path.

Guardrail:

- RSS / memory stability, or a clear unavailable reason when RSS cannot be
  captured reliably.

Diagnostic buckets:

- `parseExtractionMs`
- SQLite write time / database write bucket
- TypeScript finalization
- fallback append / fallback accounting

These buckets are for diagnosis and candidate selection. They are not separate
release gates.

## Non-Goals

- Do not optimize TypeScript-only standalone indexing.
- Do not require Rust to beat the TypeScript indexer end-to-end.
- Do not run the full benchmark scoreboard.
- Do not run agent sufficiency A/B.
- Do not add a new language, framework, or user-facing feature.
- Do not broaden #224 into the whole plan unless the baseline evidence points
  there.
- Do not update README by default.
- Do not run packaged/release smoke unless the selected candidate touches CLI
  launcher, packaging, status, doctor, or release-path code.

## Decisions

### One Bounded Candidate Only

This plan must try at most one production-code optimization candidate. The
candidate is selected from baseline evidence, not from prior intuition alone.
If no credible candidate appears, record a no-go decision instead of forcing a
change.

### Production Code Changes Are Allowed

Production-code changes are allowed only for the selected bounded candidate.
Do not mix multiple optimizations into one issue. Add targeted tests for the
changed behavior.

If production code changes, update `CHANGELOG.md` under `## [Unreleased]` with
a user-facing note. README updates are not required by default.

### Evidence Beats Success Theater

The pass is complete if it produces a credible baseline, one bounded attempt,
and a defensible keep / rollback / no-go decision. A measured non-improvement
is acceptable if the evidence is usable for future work.

### Trackers Stay Canonical

Use #165 as the long-running performance parent. Reference #224 as the existing
parse-extraction profiling candidate, but do not assume #224 is the selected
candidate before the baseline profile.

## Issue Sequence

1. Baseline profile and candidate selection.
2. Implement one bounded optimization candidate.
3. After-profile decision and tracker updates.

## Acceptance

- Baseline profiles are recorded for the current repo and the VS Code sparse
  checkout, or the VS Code path is explicitly marked as needing human setup.
- Baseline evidence includes wall-clock time, RSS or unavailable reason, and
  the agreed diagnostic buckets.
- Exactly one candidate is selected, or the plan records no-go.
- The implementation issue changes only the selected candidate and includes
  targeted tests.
- After-profile evidence compares baseline vs after on both corpora where
  available.
- The final decision says keep, rollback, or no-go.
- #165 is updated with the outcome.
- #224 is updated only if the evidence confirms or rejects the parse-extraction
  path as the next candidate.

## 15. `docs/plans/2026-06-19-rust-hybrid-phase-7-decision.md`

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

## 16. `docs/plans/2026-06-19-rust-hybrid-phase-7-sdk-full-index-alignment.md`

# Rust-Hybrid Phase 7: SDK Full-Index Alignment

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 7 tracker: [#263](https://github.com/jununfly/ZCodeGraph/issues/263)
- Phase 6 plan: `docs/plans/2026-06-18-rust-hybrid-phase-6-rust-owned-per-file-gap-fallback.md`
- Phase 6 decision: `docs/plans/2026-06-18-rust-hybrid-phase-6-decision.md`
- Phase 6 evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`

## Context

Phase 1 made `rust-hybrid` the CLI full-index default. Phase 2 added Rust-owned Go extraction and a Gin sufficiency slice. Phase 3 implemented language-level TypeScript fallback writes into one unified graph. Phase 4 added privacy-preserving diagnostic bundles for degraded and failed `rust-hybrid` runs. Phase 5 validated release-like packaged CLI and staged npm shim smoke. Phase 6 implemented Rust-owned per-file parse gap fallback.

The CLI first-user full-index path is now aligned with the PRD direction, but the programmatic SDK path is still a product mismatch. `CodeGraph.init({ index: true })` and `cg.indexAll()` are public full-index entry points, and they should not keep a different default strategy from the CLI once `rust-hybrid` is the first-user default.

Phase 7 aligns SDK full-index behavior with the CLI product strategy without expanding into README messaging, release workflow, packaging smoke, watch/sync semantics, or performance optimization.

## Goal

Make SDK full-index entry points use `rust-hybrid` by default while preserving explicit engine selection.

After Phase 7:

1. SDK users can import the shared `IndexEngine` type.
2. `CodeGraph.init(projectPath, { index: true })` defaults to `rust-hybrid`.
3. `cg.indexAll()` defaults to `rust-hybrid`.
4. SDK full-index calls support explicit `engine: 'typescript' | 'rust' | 'rust-hybrid'`.
5. SDK full-index calls do not read `ZCODEGRAPH_INDEX_ENGINE`.
6. `engine: 'typescript'` remains the stable escape hatch.
7. `engine: 'rust'` remains available as an advanced maintainer/debug path.
8. SDK `rust-hybrid` preserves CLI fail-safe semantics for Rust process/system failures.
9. SDK `rust-hybrid` preserves language-level fallback and Rust-owned per-file gap fallback semantics.
10. npm/embedded SDK shim contract remains consistent with the source SDK.

This phase does not claim final first-user release readiness.

## Non-Goals

- Do not update the README primary path or release messaging.
- Do not run full release-like packaged smoke unless packaging, launcher, CLI, status, or release scripts are touched.
- Do not implement watch/sync `rust-hybrid` incremental semantics.
- Do not optimize performance or close #165.
- Do not change MCP tool names or protocol.
- Do not read `ZCODEGRAPH_INDEX_ENGINE` in SDK full-index calls.
- Do not add a temporary legacy SDK environment variable.
- Do not trigger the GitHub Release workflow, publish npm packages, or push tags.

## Decisions

### SDK default changes only full-index behavior

Phase 7 changes SDK full-index entry points:

- `CodeGraph.init(projectPath, { index: true })`,
- `cg.indexAll()`.

It does not make watch/sync `rust-hybrid` incremental behavior a release blocker. Existing TypeScript sync/watch behavior must not regress.

### SDK explicit option beats implicit environment

SDK behavior should be explicit and deterministic:

- explicit SDK option: `engine`,
- SDK default: `rust-hybrid`,
- no `ZCODEGRAPH_INDEX_ENGINE` lookup inside SDK full-index calls.

CLI behavior remains separate and continues to read `ZCODEGRAPH_INDEX_ENGINE`.

This avoids hidden behavior in embedded SDK consumers, test runners, MCP hosts, IDE extensions, and npm SDK shims.

### Public engine type is shared

The SDK should re-export the shared engine type:

```ts
export type IndexEngine = 'typescript' | 'rust' | 'rust-hybrid';
```

Do not introduce a separate SDK-only engine enum or union.

### Supported SDK engine behaviors

`engine: 'typescript'`:

- uses the existing mature TypeScript indexing path,
- remains the troubleshooting and compatibility escape hatch,
- does not require Rust core discovery.

`engine: 'rust'`:

- uses the Rust indexer directly,
- runs the existing TypeScript shell finalization if required by the current Rust path,
- does not append TypeScript fallback files,
- fails on Rust process/system failure.

`engine: 'rust-hybrid'`:

- plans Rust-owned and TypeScript fallback files,
- runs Rust for Rust-owned files,
- appends non-Rust-owned supported files through TypeScript fallback,
- appends Rust-owned per-file parse/extraction gaps when Rust marks them fallback-eligible,
- records hybrid status metadata,
- fails safely on Rust process/system failure.

### Fail-safe remains mandatory

SDK `rust-hybrid` must not silently perform a full TypeScript fallback when Rust core is missing, crashes, exits non-zero, emits malformed output, cannot write safely, or otherwise fails at process/system level.

That behavior would mislead users and maintainers into believing they tested `rust-hybrid`. The explicit SDK escape hatch is:

```ts
await cg.indexAll({ engine: 'typescript' });
```

### npm SDK shim stays contract-aligned

Phase 7 should include deterministic npm/embedded SDK shim contract coverage so the package entry remains consistent with source SDK behavior.

This does not require full release-like packaged smoke. If Phase 7 unexpectedly touches packaging, launcher, CLI, status, or release scripts, then packaged smoke should be reconsidered before closing.

## Expected Behavior

### Default SDK init indexing

```ts
const cg = await CodeGraph.init(projectPath, { index: true });
```

Expected:

- full index uses `rust-hybrid`,
- build info records `engine: 'rust-hybrid'`,
- hybrid metadata is present,
- graph is readable by existing query and MCP-compatible graph paths.

### Default SDK re-indexing

```ts
const cg = await CodeGraph.open(projectPath);
await cg.indexAll();
```

Expected:

- full index uses `rust-hybrid`,
- build info records `engine: 'rust-hybrid'`,
- hybrid metadata is present.

### Explicit TypeScript escape hatch

```ts
await cg.indexAll({ engine: 'typescript' });
```

Expected:

- full index uses the TypeScript path,
- Rust core is not required,
- build info records the TypeScript engine behavior currently used by the SDK.

### Explicit Rust path

```ts
await cg.indexAll({ engine: 'rust' });
```

Expected:

- full index uses the Rust path,
- no TypeScript fallback append is performed,
- Rust process/system failure fails the call.

### SDK does not read CLI env

Given:

```bash
ZCODEGRAPH_INDEX_ENGINE=typescript
```

and:

```ts
await cg.indexAll();
```

Expected:

- SDK still defaults to `rust-hybrid`,
- only explicit SDK options change SDK engine behavior.

### SDK fail-safe

Given a missing or crashing Rust core and:

```ts
await cg.indexAll();
```

Expected:

- the SDK full-index call fails,
- no silent full TypeScript fallback is attempted,
- existing index preservation semantics are not weakened.

### SDK fallback semantics

Given a mixed-language project or a Rust-owned per-file parse gap:

Expected:

- language-level fallback is appended into the unified graph,
- Rust-owned per-file fallback is appended when Rust marks the file unwritten/fallback-eligible,
- status metadata reports degraded taxonomy consistently with CLI behavior.

## Issue Breakdown

1. [#264](https://github.com/jununfly/ZCodeGraph/issues/264): SDK engine option contract.
2. [#265](https://github.com/jununfly/ZCodeGraph/issues/265): SDK default `rust-hybrid` full-index path.
3. [#266](https://github.com/jununfly/ZCodeGraph/issues/266): SDK hybrid fallback semantics.
4. [#267](https://github.com/jununfly/ZCodeGraph/issues/267): npm SDK shim contract.
5. [#268](https://github.com/jununfly/ZCodeGraph/issues/268): Evidence and decision.

## Validation

Required before closing Phase 7:

- `npm run build` passes.
- SDK engine option tests pass:
  - `IndexEngine` is publicly exported,
  - `CodeGraph.init(..., { index: true, engine: 'typescript' })` works,
  - `cg.indexAll({ engine: 'typescript' })` works,
  - unsupported engine values fail deterministically if covered by runtime validation.
- SDK default tests pass:
  - `CodeGraph.init(..., { index: true })` records `rust-hybrid`,
  - `cg.indexAll()` records `rust-hybrid`,
  - SDK does not read `ZCODEGRAPH_INDEX_ENGINE`,
  - `engine: 'rust'` works as an advanced path where Rust core is available.
- SDK fail-safe tests pass:
  - missing/crashing Rust core fails,
  - no full TypeScript fallback is attempted,
  - previous index preservation is not weakened.
- SDK fallback tests pass:
  - language-level TypeScript fallback works through SDK `rust-hybrid`,
  - Rust-owned per-file gap fallback works through SDK `rust-hybrid`,
  - partial-write blocked taxonomy remains preserved where applicable.
- npm SDK shim deterministic contract tests pass.
- Evidence document is written under `docs/benchmarks/`.
- Decision document is written under `docs/plans/`.
- Decision explicitly does not claim first-user release readiness.

Do not require:

- full packaged smoke,
- real Gin packaged smoke,
- README update,
- release workflow trigger,
- npm publish,
- full benchmark scoreboard,
- #165 performance optimization,
- watch/sync `rust-hybrid` incremental support.

## Stop Conditions

Stop and write a blocker decision instead of expanding scope if:

- SDK full-index default cannot share the CLI `rust-hybrid` orchestration without duplicating unsafe behavior,
- SDK fail-safe behavior would silently full-fallback to TypeScript on Rust process/system failure,
- npm SDK shim alignment requires packaging or release workflow changes,
- tests require broad fixture rewrites that indicate the public SDK contract is still ambiguous,
- the work starts changing README/release messaging,
- the work starts implementing watch/sync `rust-hybrid` semantics,
- the phase starts optimizing performance instead of aligning SDK behavior.

## 17. `docs/plans/2026-06-19-rust-hybrid-phase-8-decision.md`

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

## 18. `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`

# Rust-Hybrid Phase 8: First-User Release Readiness Closeout

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 decision: `docs/plans/2026-06-18-rust-hybrid-phase-2-decision.md`
- Phase 3 decision: `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`
- Phase 4 decision: `docs/plans/2026-06-18-rust-hybrid-phase-4-decision.md`
- Phase 5 decision: `docs/plans/2026-06-18-rust-hybrid-phase-5-decision.md`
- Phase 6 decision: `docs/plans/2026-06-18-rust-hybrid-phase-6-decision.md`
- Phase 7 decision: `docs/plans/2026-06-19-rust-hybrid-phase-7-decision.md`

## Context

Phases 1-7 implemented the main `rust-hybrid` first-user release path:

1. CLI engine contract and default `rust-hybrid` skeleton.
2. Rust-owned Go extraction v1 and a Gin direct route-handler slice.
3. Mixed-language TypeScript fallback writes into one unified graph.
4. Privacy-preserving `doctor --engine rust-hybrid` diagnostic bundles.
5. Release-like packaged smoke for the CLI path.
6. Rust-owned per-file parse gap fallback.
7. SDK full-index alignment with `rust-hybrid` default behavior.

The remaining PRD risk is release usability and evidence consistency, not another broad feature slice. Phase 8 closes out the first-user release readiness question by auditing PRD gates, rerunning current deterministic smoke on real and packaged paths, updating first-user README messaging, and writing a readiness decision.

## Goal

Produce a current, evidence-backed first-user release readiness decision for the `rust-hybrid` release path.

Phase 8 should answer:

- Can a first user follow the simple setup path without choosing an engine?
- Does the current default `rust-hybrid` path work on a real Gin repository through deterministic smoke?
- Does release-like packaging still work after Phase 7 SDK/default alignment?
- Do status and doctor outputs give maintainers useful degraded/failure evidence?
- Does README/product messaging match the implemented product behavior without exposing unnecessary engine choice in the primary path?
- Are any remaining gaps blockers, explicit non-blockers, or post-release follow-ups?

## Non-Goals

- Do not implement #165 performance optimization.
- Do not require Rust indexing to beat TypeScript on strict speed or RSS targets.
- Do not run multi-round agent A/B.
- Do not implement watch/sync `rust-hybrid` incremental semantics.
- Do not implement full Go module/package import resolution.
- Do not add gRPC/protobuf generated Go flow coverage.
- Do not add broad Go generic edge support.
- Do not change MCP tool names or protocol.
- Do not expose engine internals in normal MCP answers.
- Do not include source code in diagnostic bundles by default.
- Do not upload diagnostics automatically.
- Do not trigger the GitHub Release workflow.
- Do not run `npm publish`, create tags, or push release artifacts.

## Decisions

### Phase 8 Is Release Readiness Closeout

The next plan is a release-readiness closeout, not a new language coverage, watch/sync, or performance plan.

The implementation should stay bounded. Small production, documentation, test, or smoke-harness fixes are allowed only when the closeout audit exposes a concrete PRD release gate gap. Phase 8 should not become an open-ended feature phase.

### README Messaging Is In Scope

README/product messaging must be updated for the first-user primary path.

The primary path should stay simple:

```bash
zcodegraph install
zcodegraph init -i
```

README should not make users choose an indexing engine in the main flow. It may explain, in user-centered language, that ZCodeGraph uses fast Rust-backed indexing where available and automatically falls back where needed.

Troubleshooting or advanced sections may document the TypeScript escape hatch:

```bash
zcodegraph index --engine typescript
ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index
```

Diagnostic bundle commands should also be discoverable:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

Release notes, GitHub Release workflow, and npm publishing are out of scope.

### Real Gin Deterministic Smoke Is Required

Phase 8 must include a real Gin repository smoke.

The smoke is deterministic and should not run multi-round agent A/B. It should validate:

- default `rust-hybrid` full index completes,
- `status --json` reports Go handled by Rust and exposes hybrid metadata,
- `doctor --engine rust-hybrid --bundle --last-run` works,
- fallback taxonomy is explainable,
- graphStats/readability are available,
- a deterministic route/handler probe passes or produces a blocker decision,
- wall time and RSS or RSS unavailable reason are recorded.

If the real Gin corpus is unavailable, Phase 8 cannot honestly claim release readiness. The decision may become blocked or ready-with-explicit-non-blockers only if the missing evidence is clearly classified and accepted.

### Targeted Packaged Smoke Is Required

Phase 8 should rerun a targeted release-like packaged smoke on current main.

The smoke should cover:

- local build,
- release-like packaged CLI discovers the Rust core binary,
- release-like `zcodegraph init -i` default path works,
- release-like `zcodegraph index --engine rust-hybrid` works,
- release-like env selection works,
- release-like status shows hybrid metadata,
- release-like doctor last-run and last-failure bundle generation works,
- bundle and staged npm shim shapes where the existing smoke supports them,
- wall time and RSS or unavailable reason where available.

Do not run the GitHub Release workflow. Do not publish packages. Do not push tags.

### Performance Is A Guardrail, Not A Blocker Target

#165 remains a post-PRD optimization item and is not a Phase 8 blocker.

Phase 8 must still record wall time and RSS or RSS unavailable reason for smoke artifacts. Severe or catastrophic regressions should block readiness and produce a decision artifact, but Phase 8 does not require strict TypeScript-vs-Rust A/B wins.

### Readiness Decision Is Three-State

Phase 8 should end with one of three outcomes:

1. **Accepted: first-user release-ready**
   - PRD release blockers have current evidence.
   - README primary path is aligned.
   - Real Gin deterministic smoke passes.
   - Targeted packaged smoke passes.
   - Status and doctor evidence are usable.
   - No new release blocker remains.

2. **Accepted: release-ready with explicit non-blockers**
   - Core release blockers pass.
   - Remaining items are explicitly classified as non-blocking, such as #165 performance optimization, watch/sync `rust-hybrid` incremental support, or full Go module resolver work.

3. **Blocked**
   - Real Gin smoke is unavailable or fails without an accepted environment explanation.
   - Packaged smoke fails.
   - Status/doctor cannot produce useful evidence.
   - README/product messaging cannot honestly describe current behavior.
   - Process/system failure preservation regresses.

The plan must not assume greenlight before evidence is collected.

## Required Validation

Minimum validation before Phase 8 decision:

```bash
npm run build
npm test
```

Real Gin deterministic smoke:

- default `rust-hybrid` full index,
- `status --json`,
- `doctor --engine rust-hybrid --bundle --last-run`,
- deterministic Gin route/handler/readability probe,
- wall time and RSS or unavailable reason.

Targeted packaged smoke:

- release-like packaged CLI/default path,
- explicit `--engine rust-hybrid`,
- env selection,
- status hybrid metadata,
- doctor last-run and last-failure bundles,
- wall time and RSS or unavailable reason.

README/product messaging:

- primary path does not ask first users to choose an engine,
- troubleshooting documents TypeScript escape hatch,
- doctor bundle commands are discoverable,
- no release workflow or publish instructions are added as something Codex should execute.

## Evidence Artifacts

Expected artifacts:

- PRD gate audit matrix under `docs/benchmarks/`.
- Real Gin deterministic smoke evidence under `docs/benchmarks/`.
- Targeted packaged smoke closeout evidence under `docs/benchmarks/`.
- Final Phase 8 readiness decision under `docs/plans/`.

The final evidence should cite command lines, dates, host environment, target corpus path/commit when available, status excerpts, doctor bundle paths, graphStats, fallback taxonomy, wall time, and RSS or unavailable reason.

## Issue Breakdown

### Phase 8.1: PRD Gate Audit And Smoke Harness

Audit the PRD release gates against current main and prior Phase 1-7 evidence.

Acceptance criteria:

- PRD release gates are mapped to pass, needs-current-evidence, non-blocker, or blocker.
- Existing scripts/tests to reuse are identified.
- Any missing deterministic smoke helper is added only if needed.
- Audit matrix is written under `docs/benchmarks/`.

### Phase 8.2: Real Gin Deterministic Smoke

Run current-main deterministic smoke on a real Gin repository.

Acceptance criteria:

- Default `rust-hybrid` full index completes or produces a blocker decision.
- `status --json` shows Go/Rust hybrid metadata.
- Doctor last-run bundle is generated.
- Deterministic route/handler/readability probe passes or produces a blocker decision.
- Fallback taxonomy is explainable.
- Wall time and RSS or unavailable reason are recorded.
- Evidence is written under `docs/benchmarks/`.

### Phase 8.3: Targeted Packaged Smoke Recheck

Rerun targeted release-like packaged smoke on current main.

Acceptance criteria:

- Packaged CLI discovers Rust core.
- Default `init -i` path works.
- Explicit `index --engine rust-hybrid` path works.
- Env engine selection works.
- Status shows hybrid metadata.
- Doctor last-run and last-failure bundles work.
- No npm publish, release workflow, or tag push is performed.
- Evidence is written under `docs/benchmarks/`.

### Phase 8.4: README Primary Path And Troubleshooting

Update first-user docs to match the implemented product path.

Acceptance criteria:

- README primary path presents `zcodegraph install` and `zcodegraph init -i` without asking users to choose an engine.
- README describes automatic Rust-backed indexing and fallback in user-centered terms.
- Troubleshooting documents TypeScript escape hatch.
- Troubleshooting points to doctor last-run and last-failure bundles.
- README does not claim #165 performance completion.
- README does not instruct Codex to run release workflow, publish npm, or push tags.

### Phase 8.5: Final Evidence And Readiness Decision

Write the final Phase 8 decision.

Acceptance criteria:

- Decision is one of: release-ready, release-ready with explicit non-blockers, or blocked.
- Decision cites the gate audit, real Gin smoke, packaged smoke, README update, and validation commands.
- Decision explicitly classifies #165, watch/sync `rust-hybrid` incremental semantics, full Go module resolver, gRPC/protobuf Go flow, and performance deep optimization.
- Decision does not overclaim readiness if any release blocker lacks current evidence.
- Tracker issue is updated with the outcome.

## Follow-Up Boundaries

Likely non-blocker follow-ups unless Phase 8 evidence proves otherwise:

- #165 performance optimization.
- Watch/sync `rust-hybrid` incremental semantics.
- Full Go module/package import resolution.
- gRPC/protobuf generated Go flow coverage.
- Broader Go generics edge coverage.
- Multi-round agent A/B.

Likely blockers if found:

- Real Gin deterministic smoke cannot index or produce readable graph evidence.
- Packaged default path cannot discover Rust core.
- Status or doctor bundle cannot explain degraded/failure state.
- Process/system failure does not preserve the previous good index.
- README cannot honestly describe the implemented first-user behavior.

## 19. `docs/plans/2026-06-19-rust-hybrid-pre-release-closeout-decision.md`

# Rust-Hybrid Pre-Release Polish Closeout Decision

Date: 2026-06-19

Related issues: #275, #276, #277, #278, #279, #280, #281

## Decision

Proceed with the pre-release API polish as complete:

- `zcodegraph init` is now the clean first-user initialization command.
- `init -i` / `--index` is removed.
- `ZCODEGRAPH_INDEX_ENGINE` no longer selects the CLI index engine and now fails fast with guidance to use an explicit flag.
- `zcodegraph index --engine typescript` remains the supported TypeScript escape hatch.
- Source and packaged smoke passed.
- README now carries targeted 2026-06-19 rust-hybrid Agent Sufficiency spot-check data for TS/JS and Go.
- A bounded #281 hardening pass made the tested Gin `POST /upload` route lookup read-free through one `zcodegraph_explore` call.

## Evidence

- API cleanup and doc alignment: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md`
- Targeted source and packaged smoke: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md`
- Agent Sufficiency spot-check: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md`
- Gin route-query hardening: `docs/benchmarks/2026-06-19-rust-hybrid-issue-281-gin-route-query-sufficiency.md`
- Plan: `docs/plans/2026-06-19-rust-hybrid-pre-release-polish.md`

## Release Readiness Interpretation

This slice supports a first-user pre-release path, not a broad claim that all language/framework sufficiency gaps are solved.

The release path is acceptable because:

- first-user setup has one stable command,
- stale env configuration fails loudly instead of silently changing behavior,
- the packaged path works locally without publishing,
- diagnostic bundle guidance remains available,
- README Go/Gin sufficiency wording is backed by targeted A/B evidence.

The earlier Go/Gin `POST /upload` fallback from #279 was addressed by #281. The remaining caveat is scope, not a known release blocker: this is targeted route-query evidence, not a full Go/Gin benchmark replacement.

## Follow-Up Candidates

- Run a full median-of-4 benchmark refresh after the first-user release branch stabilizes.
- Re-run package smoke on Linux and Windows only if release packaging or platform launchers change.

## 20. `docs/plans/2026-06-19-rust-hybrid-pre-release-polish.md`

# Rust-Hybrid Pre-Release Polish Plan

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 8 plan: `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`
- Phase 8 decision: `docs/plans/2026-06-19-rust-hybrid-phase-8-decision.md`

## Context

Phase 8 accepted the first-user `rust-hybrid` release path as release-ready with explicit non-blockers under the then-current PRD boundary.

Before the actual first-user release, the API surface should be tightened so the product story is simpler and the release evidence matches the user-visible commands:

- primary setup should be `zcodegraph install` then `zcodegraph init`,
- `zcodegraph init -i` / `--index` should be removed instead of preserved as a deprecated no-op,
- `ZCODEGRAPH_INDEX_ENGINE` should no longer select the engine,
- explicit CLI flags should be the only user-facing engine override path,
- README Agent Sufficiency claims for TS/JS and Go should be refreshed with current `rust-hybrid` evidence rather than inherited from older benchmark text.

This plan does not reopen Phase 8. It narrowly supersedes the release-candidate surface area that changed after Phase 8: initialization command shape, env engine selection, and README metric claims.

## Goal

Produce a polished first-user release candidate for `rust-hybrid` with a cleaner CLI/API surface, aligned docs, refreshed TS/JS and Go Agent Sufficiency evidence, and a final pre-release closeout decision.

The plan should answer:

- Can first users initialize with `zcodegraph init` without learning historical `-i` behavior?
- Are engine overrides explicit and visible through `--engine` only?
- Does stale `ZCODEGRAPH_INDEX_ENGINE` usage fail clearly and point to the explicit flag?
- Do README, PRD, installer hints, MCP instructions, scripts, and tests teach the same product path?
- Do current TS/JS and Go Agent Sufficiency numbers support the README claims we publish?
- Does targeted release-candidate smoke still pass after the API cleanup?

## Non-Goals

- Do not implement #165 performance optimization.
- Do not require strict Rust-vs-TypeScript speed or RSS wins.
- Do not implement watch/sync `rust-hybrid` incremental semantics.
- Do not implement full Go module/package import resolution.
- Do not add gRPC/protobuf generated Go flow coverage.
- Do not add broad Go generic edge coverage.
- Do not change SQLite schema.
- Do not change MCP tool names or protocol.
- Do not rewrite installer, MCP server, or release workflow in Rust.
- Do not bump `package.json` version.
- Do not create git tags.
- Do not trigger the GitHub Release workflow.
- Do not run `npm publish`.

## Decisions

### Primary Command Is `zcodegraph init`

The first-user setup path should be:

```bash
zcodegraph install
zcodegraph init
```

`zcodegraph init` already builds the initial index. The historical `-i` / `--index` option now creates the wrong product memory and should be removed.

Expected behavior after removal:

```bash
zcodegraph init -i
```

fails through the normal CLI unknown-option behavior.

No compatibility bridge is required. The historical user base for this no-op flag is limited and the release has not yet been broadly exposed.

### Engine Selection Is Explicit CLI Flag Only

The default remains `rust-hybrid`.

Supported explicit overrides:

```bash
zcodegraph index --engine typescript
zcodegraph index --engine rust-hybrid
zcodegraph index --engine rust
```

`ZCODEGRAPH_INDEX_ENGINE` should no longer select the engine. If present for a command that resolves an index engine, the CLI should fail fast with a clear pointer to the explicit flag:

```text
ZCODEGRAPH_INDEX_ENGINE is no longer supported for selecting the index engine.
Use: zcodegraph index --engine typescript
```

The SDK already does not read `ZCODEGRAPH_INDEX_ENGINE`; preserve that boundary.

### PRD And Phase 8 Wording Need A Narrow Superseding Note

Update the PRD with a narrow note:

- Phase 8 remains valid for the evidence it collected.
- The release-candidate API surface changed after Phase 8.
- The new primary init command is `zcodegraph init`.
- Env engine selection is removed in favor of explicit `--engine`.
- Pre-release polish evidence supersedes Phase 8 only for command shape, env-selection behavior, README claim refresh, and final release-candidate decision.

Do not rewrite the PRD into a new product. Keep the change narrow and date-stamped.

### User-Facing Docs And Hints Must Converge

Update every user-facing first-run path that still teaches `zcodegraph init -i`:

- README main path,
- README troubleshooting,
- installer quick-start notes,
- MCP server instructions,
- worktree warning text,
- scripts and docs used as public guidance,
- package smoke labels/evidence wording where relevant.

Internal historical decision docs may remain as history. New release-candidate docs should not keep the old command shape as current guidance.

### CHANGELOG Is In Scope, Version Bump Is Out Of Scope

Add user-facing entries under `## [Unreleased]`.

The changelog should mention:

- `zcodegraph init` is now the clean first-user initialization command,
- engine selection now uses explicit `--engine` flags,
- stale env-based engine selection fails clearly,
- release-readiness docs and troubleshooting were refreshed.

Do not edit `package.json` or `package-lock.json` versions.

### Agent Sufficiency Refresh Is Required For README Claims

README TS/JS and Go Agent Sufficiency metrics must be backed by current evidence.

Run a bounded current `rust-hybrid` Agent Sufficiency refresh:

- TS/JS representative: Excalidraw by default.
- Go representative: Gin by default.
- Prompts: 2 flow prompts per repo.
- Runs: 2 runs per prompt per arm.
- Arms: WITH ZCodeGraph vs WITHOUT ZCodeGraph.

Record:

- Read/Grep fallback,
- tool calls,
- wall time,
- cost/tokens if the runner emits them,
- sufficiency interpretation,
- corpus path and commit,
- ZCodeGraph commit,
- unavailable reason if the agent A/B environment cannot run.

Do not run the full 7-repo scoreboard.

Do not use deterministic smoke as a substitute for README Agent Sufficiency metrics. If the agent A/B environment is unavailable, produce an evidence gap and block README metric replacement rather than inventing numbers.

README updates should be limited to the covered claims. Do not generalize Excalidraw/Gin results to all languages.

### Targeted Release-Candidate Smoke Is Required

After API cleanup and docs updates, run targeted release-candidate smoke:

```bash
npm run build
npm test
```

CLI source path:

- `zcodegraph init`,
- `zcodegraph index`,
- `zcodegraph status --json`,
- `zcodegraph doctor --engine rust-hybrid --bundle --last-run`,
- process/system failure path with `--last-failure`,
- `zcodegraph index --engine typescript`,
- stale `ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index` fails clearly.

Packaged path:

- release-like packaged CLI discovers Rust core,
- release-like `zcodegraph init` default path works,
- explicit `zcodegraph index --engine rust-hybrid` works,
- stale env selection fails clearly,
- status hybrid metadata works,
- doctor last-run and last-failure bundles work,
- no release workflow, publish, tag, or registry contact is attempted.

Real Gin deterministic smoke may cite Phase 8 unless API/status/doctor/indexing changes require rerun. If this plan changes smoke harness or CLI command shape, rerun the affected smoke.

## Evidence Artifacts

Expected artifacts:

- API cleanup decision/evidence under `docs/benchmarks/`.
- Targeted release-candidate smoke evidence under `docs/benchmarks/`.
- Agent Sufficiency refresh raw artifacts and summary under `docs/benchmarks/`.
- Final pre-release closeout decision under `docs/plans/`.

The final decision should be one of:

1. **Accepted: release-ready**
   - API cleanup complete.
   - Docs and PRD aligned.
   - Targeted release-candidate smoke passes.
   - README metrics are backed by current TS/JS and Go Agent Sufficiency evidence.
   - No new release blocker remains.

2. **Accepted: release-ready with explicit non-blockers**
   - Release blockers pass.
   - Remaining gaps are explicitly classified as non-blockers, such as #165, watch/sync `rust-hybrid` incremental semantics, full Go resolver, or broader Go coverage.

3. **Blocked**
   - CLI API cleanup breaks first-user path.
   - Env removal cannot be made clear and testable.
   - Packaged smoke fails.
   - Agent Sufficiency refresh is unavailable and README metric claims cannot be honestly updated.
   - README/PRD/product messaging cannot be aligned without overclaiming.

## Issue Breakdown

### 1. API Surface Cleanup

Remove historical and hidden engine-selection surfaces.

Acceptance criteria:

- `zcodegraph init` remains the first-user initialization command and builds the initial index.
- `zcodegraph init -i` / `--index` is no longer accepted.
- CLI engine selection ignores SDK env behavior and only honors explicit `--engine`.
- `ZCODEGRAPH_INDEX_ENGINE` fails fast for CLI engine-selection commands with a clear pointer to `--engine`.
- SDK full-index calls continue not to read `ZCODEGRAPH_INDEX_ENGINE`.
- Targeted CLI tests cover default `rust-hybrid`, explicit `typescript`, explicit `rust-hybrid`, unknown `init -i`, and stale env fail-fast.

### 2. Docs, PRD, And Changelog Alignment

Align all release-candidate messaging with the cleaned API.

Acceptance criteria:

- PRD contains a narrow superseding note for command shape and env selection.
- README main path uses `zcodegraph init`, not `zcodegraph init -i`.
- README troubleshooting only documents `zcodegraph index --engine typescript` as the TypeScript escape hatch.
- Installer quick-start note uses `zcodegraph init`.
- MCP server instructions use `zcodegraph init`.
- Worktree warnings and public scripts/docs use `zcodegraph init` where they represent current user guidance.
- CHANGELOG `[Unreleased]` contains user-facing entries.
- No version bump is made.

### 3. Targeted Release-Candidate Smoke

Revalidate the first-user and packaged paths after API cleanup.

Acceptance criteria:

- `npm run build` passes.
- `npm test` passes.
- CLI source-path smoke passes for `init`, `index`, `status --json`, doctor last-run, doctor last-failure, and explicit TypeScript escape hatch.
- Stale `ZCODEGRAPH_INDEX_ENGINE` CLI usage fails clearly.
- Targeted packaged smoke passes with `init`, explicit `--engine rust-hybrid`, status, doctor last-run, doctor last-failure, and env fail-fast.
- No GitHub Release workflow, `npm publish`, tag push, or registry publish action is performed.
- Evidence is written under `docs/benchmarks/`.

### 4. TS/JS And Go Agent Sufficiency Refresh

Refresh README-backed Agent Sufficiency claims on current `rust-hybrid`.

Acceptance criteria:

- TS/JS representative repo is selected and recorded, defaulting to Excalidraw.
- Go representative repo is selected and recorded, defaulting to Gin.
- Each repo runs 2 flow prompts with 2 runs per prompt per arm, WITH vs WITHOUT ZCodeGraph.
- Read/Grep fallback, tool calls, wall time, and cost/tokens when available are recorded.
- Corpus commits and ZCodeGraph commit are recorded.
- README metrics are replaced only for claims covered by this evidence.
- If agent A/B cannot run, evidence records the unavailable reason and README metric replacement is blocked.
- Evidence is written under `docs/benchmarks/`.

### 5. Final Pre-Release Closeout Decision

Write the final pre-release decision.

Acceptance criteria:

- Decision cites API cleanup evidence, docs/PRD/CHANGELOG alignment, targeted smoke, packaged smoke, and Agent Sufficiency refresh.
- Decision classifies release-ready, release-ready with explicit non-blockers, or blocked.
- Decision lists explicit non-blockers, including #165 performance optimization unless it is separately completed.
- Decision does not claim release workflow execution, npm publish, tag creation, or version bump.
- Phase 8 is referenced as prior evidence, not reopened.

## 21. `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`

# Rust-hybrid candidate producer main-path routing experiment

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #316-#320 complete Rust candidate producer shape coverage

## Decision

Implement the next resolver-migration slice as a **gated Rust candidate
producer main-path routing experiment**.

This slice may route only these Rust producer shapes into the candidate
protocol main path:

- `ExactName`
- `KnownNamePresence`

The routing experiment must be **default off** and enabled only by an
experimental local project config file:

```json
{
  "experimental": {
    "rustCandidateProducerRouting": true
  }
}
```

Do not add a new environment flag for this experiment.

## Why This Slice

Rust candidate producer shape coverage is now complete and validated in shadow
mode:

- current repo: 6,185 producer lookups compared, 0 mismatches;
- VS Code sparse: 156,348 producer lookups compared, 0 mismatches.

Continuing to collect only shadow evidence now has lower marginal value. The
next useful question is whether the validated Rust producer can replace a
narrow part of the TypeScript candidate source while preserving graph
semantics.

This is still not a `matchReference` migration. TypeScript remains the owner of
final target selection, language/kind gates, ranking, confidence, `resolvedBy`,
framework behavior, and every-reference disambiguation.

## Scope

### In Scope

- Read experimental local config from `.zcodegraph/config.json`.
- Enable routing only when `experimental.rustCandidateProducerRouting === true`.
- Treat missing config, missing `experimental`, missing key, or `false` as
  routing disabled.
- Treat non-boolean config values as invalid, fail closed to TypeScript
  baseline, and report `invalid-local-config`.
- Expose concise status JSON:
  - `rust.experimental.candidateProducerRouting.enabled`
  - `rust.experimental.candidateProducerRouting.source`
- Record richer profile/doctor diagnostics for routing:
  - active shapes;
  - fallback reason;
  - mismatch count and bounded samples;
  - producer failure reason;
  - invalid config reason.
- Precompute the bare unresolved-reference key universe before reference
  resolution.
- Batch-run the Rust candidate producer once for:
  - `ExactName`
  - `KnownNamePresence`
- Route only those two shapes through the Rust producer result maps.
- Hydrate Rust producer ids through an existing TypeScript-side `id -> Node`
  map.
- Keep TypeScript baseline comparison while routing is enabled.
- Fail closed to the TypeScript baseline for the entire run on mismatch,
  producer failure, invalid config, missing Rust result, or missing node id.
- Validate graph stability with routing enabled and disabled.
- Run current-repo and VS Code sparse targeted evidence.

### Out of Scope

- Routing `LowerName`, `QualifiedName`, or `FileNodes`.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Adding a new environment flag.
- Adding a CLI config writer such as `zcodegraph config set`.
- Changing `zcodegraph init`.
- Writing README or user-facing release messaging.
- Promising a stable config API.
- Optimizing producer transport, subprocess overhead, payload shape, or
  serialization.
- Migrating legacy environment flags in this implementation slice.

## Local Config Contract

The config file is experimental and local-only:

- path: `.zcodegraph/config.json`;
- public stability: none;
- missing file: disabled, `source: "missing-config"`;
- valid true: enabled, `source: "local-config"`;
- valid false: disabled, `source: "local-config"`;
- invalid JSON: disabled, `source: "invalid-local-config"`;
- non-boolean `experimental.rustCandidateProducerRouting`: disabled,
  `source: "invalid-local-config"`.

Invalid config must not interrupt indexing. It must fail closed to TypeScript
baseline.

## Routing Boundary

Routing must live inside `CandidateProtocolProvider`.

`ReferenceResolver` should keep calling the candidate provider normally:

- `lookupNodes({ kind: "ExactName", name })`
- `hasKnownName(name)`

`matchReference` must not know Rust producer routing exists.

The candidate provider owns:

- local config interpretation;
- routing enabled/disabled state;
- precomputed Rust producer maps;
- `id -> Node` hydration;
- TypeScript baseline comparison;
- fail-closed fallback;
- profile diagnostics.

## Key Universe

Before reference resolution, collect only bare unresolved-reference
`referenceName` values.

Do not collect:

- dotted receiver/member derived names;
- colon/namespace parts;
- tail segments;
- all indexed known names.

Derived known-name checks should continue to use the TypeScript baseline in
this slice.

## Fail-Closed Rules

Routing must fall back to TypeScript baseline for the entire run if any of
these happen:

- local config is invalid;
- Rust core is unavailable;
- producer subprocess fails;
- producer response is invalid;
- a requested Rust result is missing;
- candidate id sets mismatch for `ExactName`;
- known-name presence mismatches;
- a Rust candidate id cannot be hydrated to a TypeScript-side `Node`.

Fallback must not interrupt indexing. It must preserve the resolved graph and
record enough diagnostics to explain why routing did not remain active.

## Diagnostics

Status JSON should stay concise:

```json
{
  "rust": {
    "experimental": {
      "candidateProducerRouting": {
        "enabled": false,
        "source": "missing-config"
      }
    }
  }
}
```

Profile/doctor diagnostics should carry detailed routing evidence. Exact field
names may evolve in the implementation, but the diagnostics must answer:

- Was routing configured?
- Was routing active?
- Which shapes were routed?
- Did routing fall back?
- Why did routing fall back?
- How many mismatches occurred?
- Were mismatch samples capped?

Diagnostics are not MCP output and do not promise a stable public API.

## Legacy Env Flag Debt

This plan does not migrate existing legacy environment flags.

Create a separate technical-debt issue to audit and classify existing
`ZCODEGRAPH_*` and related experimental flags. The audit should decide which
flags should be migrated to local config, kept as test/CI/script overrides,
kept as one-shot command controls, or removed.

Do not fold that migration into this routing experiment.

## Acceptance Evidence

Required:

- deterministic config parsing tests for missing, valid true, valid false,
  invalid JSON, and non-boolean values;
- status JSON test for enabled/source only;
- routing-disabled graph guard;
- routing-enabled graph guard;
- invalid-config fail-closed graph guard;
- producer mismatch fail-closed graph guard;
- current-repo targeted profile with routing enabled;
- VS Code sparse targeted profile with routing enabled;
- RSS or unavailable reason;
- fallback taxonomy and routing diagnostics in closeout;
- closeout decision stating keep / no-go / prerequisite.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## No-Go Criteria

Stop this direction or mark it prerequisite if:

- routing changes resolved graph output;
- fail-closed behavior cannot preserve the TypeScript baseline graph;
- routing requires changing `matchReference`;
- routing requires broad `ReferenceResolver` branching instead of provider
  encapsulation;
- useful routing requires `LowerName`, `QualifiedName`, or `FileNodes` in the
  first experiment;
- diagnostics cannot explain fallback reason;
- local config semantics become user-facing product API surface;
- the only credible path requires migrating disambiguation in the same slice.

## Issue Sequence

1. Add experimental local routing config and status visibility.
2. Precompute the bare `ExactName` / `KnownNamePresence` routing key universe.
3. Route `ExactName` / `KnownNamePresence` through Rust producer with
   fail-closed TypeScript fallback.
4. Validate routing graph stability and targeted evidence.
5. Create a technical-debt issue for legacy environment flag audit and
   migration classification.

This sequence is intentionally aggressive but bounded. It tests Rust producer
main-path routing without migrating disambiguation.

## 22. `docs/plans/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary.md`

# Rust-Hybrid Complete Candidate Producer Routing Boundary

Date: 2026-06-20

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior routing experiment: `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- LowerName default-on no-go closeout:
  `docs/benchmarks/2026-06-20-rust-hybrid-lowername-default-on-routing-closeout-decision.md`

## Context

The candidate producer routing boundary has proven that Rust-produced candidate
sets can be compared against the TypeScript baseline and fail closed without
changing the resolved graph. The default-on LowerName trial also showed that
performance can regress badly if routing is promoted before the full boundary
and cost model are understood.

The next slice should stop exploring partial intermediate states and complete
the local-config experimental routing boundary for all existing candidate
protocol lookup shapes. Performance optimization is deliberately deferred until
the boundary is complete.

## Goal

Complete the Rust candidate producer routing boundary for all five candidate
lookup shapes:

- `ExactName`
- `KnownNamePresence`
- `LowerName`
- `QualifiedName`
- `FileNodes`

The boundary remains local-config experimental only:

```json
{
  "experimental": {
    "rustCandidateProducerRouting": true
  }
}
```

Missing config remains disabled. Invalid config remains fail-closed and
diagnostic-only.

## Non-Goals

- Do not enable routing by default.
- Do not change `--engine typescript`.
- Do not change `matchReference()`.
- Do not change final target selection, ranking, confidence, `resolvedBy`,
  framework behavior, or dynamic-dispatch synthesis.
- Do not change the SQLite schema.
- Do not add a new environment flag.
- Do not remove or migrate legacy environment flags.
- Do not optimize routing performance in this slice.
- Do not require performance improvement as a success gate.
- Do not update README or release notes.
- Do not run full scoreboard or agent A/B validation.

## Routing Contract

When local experimental routing is enabled:

- all five lookup shapes may be routed through the Rust candidate producer;
- all routed results are compared against the TypeScript baseline;
- successful routed results are cached through the existing candidate protocol
  caches;
- missing precomputed results may be served by synchronous single-key
  on-demand producer lookup;
- mismatch, missing result, node hydration miss, invalid config, or producer
  failure disables routing for the whole run and falls back to the TypeScript
  baseline;
- fail-closed routing must not fail indexing.

Rust candidate producer output remains candidate-only:

- candidate ids for `ExactName`, `LowerName`, `QualifiedName`, and `FileNodes`;
- boolean presence for `KnownNamePresence`;
- no final target, confidence, ranking, or `resolvedBy`.

## Precompute and On-Demand Strategy

This slice should complete the boundary rather than tune performance.

The implementation may precompute any low-risk lookup keys that are already
available before resolution, but correctness must not depend on perfect
precomputation. Any lookup shape that misses precomputed results must support
synchronous single-key on-demand producer lookup.

On-demand lookup is intentionally simple in this slice:

- no queueing;
- no sessionization;
- no batching optimization;
- no hot-path baseline optimization.

Those become later performance work once the complete boundary has evidence.

## Diagnostics

Profile and doctor diagnostics must show:

- whether routing was configured;
- whether routing remained active;
- the full routed shape set;
- lookup counts by shape;
- on-demand lookup counts by shape;
- on-demand cache hits;
- fail-closed reason;
- bounded mismatch samples;
- Rust producer lookup counts, payload bytes, subprocess time, and producer
  time.

Diagnostics are profile artifacts for development and troubleshooting, not a
stable public API.

## Acceptance Evidence

Required deterministic coverage:

- Rust producer returns correct candidate ids/presence for all five shapes.
- TypeScript candidate protocol can route all five shapes.
- All five shapes support on-demand single-key lookup.
- Successful on-demand results are cached.
- Mismatch, missing result, hydration miss, invalid config, and producer failure
  fail closed to TypeScript baseline.
- Graph stability passes with local-config routing enabled against a disabled
  control.
- Diagnostics expose active shapes, shape counts, on-demand counts, and
  fail-closed details.

Required targeted evidence:

- current-repo `rust-hybrid` targeted profile with local-config routing enabled;
- VS Code sparse targeted profile with local-config routing enabled;
- RSS or unavailable reason;
- fallback taxonomy and routing diagnostics in the closeout decision;
- closeout decision stating whether the complete local-config boundary is
  semantically keepable.

Performance results are recorded as input for later optimization, not as the
gate for this slice.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. Complete producer protocol routing for all lookup shapes.
2. Complete Rust producer implementation and deterministic shape tests.
3. Add graph stability and diagnostics for the complete routing boundary.
4. Run targeted profile closeout for the complete routing boundary.

## 23. `docs/plans/2026-06-20-rust-hybrid-finalization-cleanup-diagnostics-and-batching.md`

# Rust-hybrid finalization cleanup diagnostics and batching

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #165 optimization tracker

## Decision

The next resolver-migration implementation slice should target the
TypeScript-owned finalization write/cleanup tail, not broader candidate producer
routing.

The previous Rust candidate producer routing slice proved a safe, gated
main-path experiment for `ExactName` and `KnownNamePresence`, but it did not
establish candidate routing as the highest-leverage next optimization. The
latest VS Code sparse profile still shows the larger remaining tail in
reference-resolution database work, per-reference disambiguation, edge writing,
and unresolved-reference cleanup.

This plan therefore creates a **diagnostics-first cleanup slice**:

1. split finalization write/cleanup profile buckets enough to see the real cost;
2. add deterministic cleanup contract tests;
3. attempt one bounded resolved-reference cleanup batching/SQL-shape
   optimization;
4. record targeted current-repo and VS Code sparse evidence with a keep/no-go/
   prerequisite closeout.

## Why This Slice

The latest VS Code sparse routing profile reported:

- `referenceResolutionMs`: 65473ms;
- `databaseAccessMs`: 21838ms;
- `candidateLookupMs`: 2400ms;
- `perReferenceDisambiguationMs`: 19401ms;
- `edgeWriteMs`: 11147ms;
- `unresolvedCleanupMs`: 9108ms.

That evidence says expanding candidate producer routing is not the clearest
next lever. The finalization tail needs sharper segmentation before the project
can make a high-quality Rust-ownership or protocol-ownership decision.

Cleanup is a good bounded first optimization because it is narrower than edge
write ownership and does not require changing reference disambiguation
semantics.

## Scope

### In Scope

- Split finalization profile diagnostics for write/cleanup work.
- Record row/edge counts tied to those diagnostics.
- Keep `edgeMaterializationMs`, `edgeWriteMs`, and `unresolvedCleanupMs`
  compatible while adding more specific sub-buckets.
- Add deterministic cleanup contract tests.
- Implement one bounded TypeScript-side resolved cleanup batching/SQL-shape
  optimization.
- Preserve graph output, fallback taxonomy, and user-visible behavior.
- Run targeted current-repo and VS Code sparse profiles.
- Record RSS or unavailable reason.
- Produce a closeout decision with one of:
  - `keep`;
  - `no-go`;
  - `prerequisite`.

### Out of Scope

- Do not introduce a Rust subprocess for cleanup.
- Do not make cleanup Rust-owned in this slice.
- Do not change SQLite schema.
- Do not change unresolved reference write format.
- Do not change which references are deleted.
- Do not change reference disambiguation, ranking, confidence, `resolvedBy`,
  import resolution, framework resolution, or dynamic-dispatch synthesis.
- Do not optimize or rewrite edge insert ownership in this slice.
- Do not broaden into intentionally unresolved cleanup optimization.
- Do not run full scoreboard or agent A/B.
- Do not update README metrics.

## Diagnostics Contract

Profile diagnostics should answer:

- How much time is spent materializing edges?
- How much time is spent validating edge endpoints?
- How much time is spent inserting edges?
- How much time is spent cleaning up resolved references?
- How much time is spent cleaning up intentionally unresolved references?
- How many edges were inserted?
- How many resolved unresolved-reference rows were deleted?
- How many intentionally unresolved rows were deleted?
- How much of `databaseAccessMs` is explained by write/cleanup sub-buckets?

Suggested profile fields:

- `edgeMaterializationMs`;
- `edgeEndpointValidationDbMs`;
- `edgeInsertDbMs`;
- `resolvedCleanupMs`;
- `resolvedCleanupDbMs`;
- `resolvedCleanupRowCount`;
- `intentionallyUnresolvedCleanupMs`;
- `intentionallyUnresolvedCleanupDbMs`;
- `intentionallyUnresolvedCleanupRowCount`;
- `edgeInsertCount`.

Exact names may evolve during implementation, but the closeout must make the
same questions answerable.

## Bounded Optimization

The only optimization attempted in this plan is resolved-reference cleanup
batching / SQL-shape improvement.

Constraints:

- input remains the set of resolved unresolved-reference rows;
- deletion semantics remain unchanged;
- unresolved references that were not resolved remain present unless the
  existing intentionally-unresolved cleanup path deletes them;
- chunk boundaries must be deterministic and tested;
- failures must not leave graph output silently inconsistent.

If resolved cleanup is not material in the profile or the bounded optimization
does not improve/explain the target bucket, stop and record `no-go`. Do not
automatically expand to edge-write ownership or intentionally unresolved cleanup.

## Implementation Slices

### 1. Split finalization write/cleanup profile diagnostics

Add profile sub-buckets and counts for the finalization write/cleanup tail while
preserving existing high-level fields.

Acceptance evidence:

- deterministic profile-shape test;
- existing profile consumers continue to pass;
- current fields remain present.

### 2. Add deterministic cleanup contract tests

Add focused tests that prove cleanup behavior does not change.

Acceptance evidence:

- resolved references are deleted;
- unresolved references are retained;
- intentionally unresolved cleanup keeps existing behavior;
- chunk/batch boundary behavior is covered.

### 3. Implement bounded resolved cleanup batching optimization

Change only the resolved-reference cleanup path's batching or SQL shape.

Acceptance evidence:

- cleanup contract tests pass;
- graph output is stable;
- fallback taxonomy is stable;
- no schema change;
- no disambiguation behavior change.

### 4. Run targeted profile closeout

Run current-repo and VS Code sparse targeted profiles and write a closeout
decision.

Acceptance evidence:

- current-repo profile;
- VS Code sparse profile using `/private/tmp/codegraph-corpus/vscode-sparse`
  if it is present, a Git checkout, and hydrated with `src/vs/workbench`,
  `src/vs/platform`, and `src/vs/base`;
- RSS or unavailable reason;
- graph stats;
- fallback taxonomy;
- keep/no-go/prerequisite decision.

Do not clone a replacement VS Code corpus automatically if the required checkout
is missing or incomplete.

## No-Go Criteria

Stop treating resolved cleanup batching as a useful next performance lever if:

- resolved cleanup is not material in current-repo and VS Code sparse profiles;
- the optimization does not reduce or clarify the target bucket;
- graph output changes;
- fallback taxonomy changes unexpectedly;
- cleanup correctness requires schema changes;
- implementation pressure starts pulling in edge write ownership or Rust
  subprocess execution.

## Expected Outcome

This plan should leave the project with clearer finalization-tail diagnostics
and one bounded cleanup optimization attempt. A successful result can justify a
later write/cleanup protocol plan. A no-go result should redirect the resolver
migration program toward a larger disambiguation or edge-write ownership slice
with better evidence.

## 24. `docs/plans/2026-06-20-rust-hybrid-finalization-edge-write-diagnostics-and-bulk-insert.md`

# Rust-hybrid finalization edge-write diagnostics and bulk insert

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/plans/2026-06-20-rust-hybrid-finalization-cleanup-diagnostics-and-batching.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-cleanup-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #165 optimization tracker

## Decision

The next resolver-migration implementation slice should target finalization
edge-write diagnostics and a bounded TypeScript-side bulk insert optimization.

The previous cleanup slice established that the finalization write/cleanup tail
is material, but resolved cleanup batching is no-go as a standalone performance
lever. The latest VS Code sparse evidence still shows a large edge-write bucket:

- `edgeWriteMs`: 11888ms;
- `edgeInsertCount`: 533309;
- `edgeEndpointValidationDbMs`: 695ms;
- `databaseAccessMs`: 23438ms;
- `perReferenceDisambiguationMs`: 18826ms;
- `unresolvedCleanupMs`: 9902ms.

This slice should make edge-write work more explainable and attempt one narrow
optimization inside `insertValidatedEdges()`.

## Why This Slice

Per-reference disambiguation is larger than edge write, but it is semantic
core. Moving it requires broader parity fixtures and replay evidence. Edge write
is a lower-semantic-risk finalization tail: it persists already-resolved edges
and should preserve graph semantics exactly.

This slice therefore targets edge-write mechanics without changing ownership of
reference resolution decisions.

## Scope

### In Scope

- Add profile diagnostics for edge insert serialization and payload size.
- Preserve existing edge-write diagnostics:
  - `edgeWriteMs`;
  - `edgeWriteDbMs`;
  - `edgeInsertCount`.
- Add deterministic contract tests for edge insertion behavior.
- Implement one bounded optimization inside `insertValidatedEdges()`:
  - pre-serialize validated edges into SQLite row parameters;
  - prepare the insert statement once for the bulk path;
  - execute the row params inside a transaction;
  - preserve `INSERT OR IGNORE`.
- Run targeted current-repo and VS Code sparse after profiles.
- Compare after profiles against:
  - `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`;
  - `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`.
- Produce a closeout decision with one of:
  - `keep`;
  - `no-go`;
  - `prerequisite`.

### Out of Scope

- Do not change SQLite schema.
- Do not change `insertEdge()` behavior.
- Do not introduce Rust subprocess execution.
- Do not make edge write Rust-owned in this slice.
- Do not change reference disambiguation, ranking, confidence, `resolvedBy`,
  import resolution, framework resolution, or dynamic-dispatch synthesis.
- Do not change edge semantics, metadata shape, duplicate handling, or
  endpoint-validation responsibility.
- Do not implement multi-row giant `INSERT ... VALUES (...), (...)`.
- Do not update README metrics.
- Do not run full scoreboard or agent A/B.

## Diagnostics Contract

Profile diagnostics should answer:

- How many validated edges were passed to the insert path?
- How much time was spent serializing edge rows before database writes?
- How many serialized edge metadata bytes were produced?
- How much time was spent in database edge insert work?
- Did the high-level edge-write bucket remain compatible with prior profiles?

Required profile fields:

- `edgeInsertCount`;
- `edgeInsertSerializationMs`;
- `edgeInsertSerializedBytes`;
- `edgeWriteMs`;
- `edgeWriteDbMs`.

Optional profile field:

- `edgeInsertIgnoredCount`, only if it is available without extra query or
  material overhead.

## Bounded Optimization

The only optimization attempted in this plan is a pre-serialized bulk
`insertValidatedEdges()` path.

Constraints:

- `insertEdge()` remains unchanged for single-edge callers.
- `insertValidatedEdges()` may bypass `insertEdge()` internally.
- `insertEdges()` still validates endpoints and delegates to
  `insertValidatedEdges()`.
- `INSERT OR IGNORE` semantics must remain unchanged.
- persisted edge row shape must remain unchanged, including metadata,
  `resolvedBy`, line, column, and `edgeOrigin`.
- duplicate edge behavior must remain unchanged.
- invalid endpoint filtering remains the caller's responsibility for
  `insertValidatedEdges()`.

Do not use multi-row `INSERT` in this slice. It may be a future candidate, but
it adds parameter-count, chunking, metadata, and backend-behavior complexity
that is too broad for this bounded attempt.

## Implementation Slices

### 1. Add finalization edge-write profile diagnostics

Add edge-write serialization diagnostics and preserve existing high-level
profile fields.

Acceptance evidence:

- deterministic profile-shape test;
- existing profile consumers continue to pass;
- current fields remain present.

### 2. Add deterministic edge insert contract tests

Lock down edge insert behavior before changing the bulk path.

Acceptance evidence:

- `insertEdge()` still writes a single edge correctly;
- `insertValidatedEdges()` persists the same row shape as before;
- metadata and `resolvedBy` survive round-trip;
- duplicate edge behavior still follows `INSERT OR IGNORE`;
- `insertEdges()` still validates endpoints before delegating.

### 3. Implement pre-serialized bulk `insertValidatedEdges()` path

Change only the internal implementation of `insertValidatedEdges()`.

Acceptance evidence:

- edge insert contract tests pass;
- profile-shape test passes;
- no schema change;
- no graph semantic change.

### 4. Run targeted profile closeout

Run after profiles and compare them with the cleanup closeout baseline.

Acceptance evidence:

- current-repo after profile;
- VS Code sparse after profile using `/private/tmp/codegraph-corpus/vscode-sparse`
  if it is present, a Git checkout, and hydrated with `src/vs/workbench`,
  `src/vs/platform`, and `src/vs/base`;
- RSS or unavailable reason;
- graph stats;
- fallback taxonomy;
- edge-write diagnostics and timing context;
- closeout decision under `docs/benchmarks/`.

Do not clone a replacement VS Code corpus automatically if the required checkout
is missing or incomplete.

## Evidence Gate

Required:

- after profile for current repo;
- after profile for VS Code sparse;
- comparison against the cleanup closeout baseline;
- deterministic tests;
- graph stats and fallback taxonomy;
- RSS or unavailable reason.

Conditional:

- rerun before/baseline only if after evidence is ambiguous, suspicious, or
  shows a likely regression that needs same-build confirmation.

## No-Go Criteria

Stop treating pre-serialized bulk edge insert as a useful next lever if:

- edge write does not improve or become materially clearer;
- graph output changes;
- fallback taxonomy changes unexpectedly;
- persisted edge metadata changes;
- duplicate edge behavior changes;
- implementation pressure starts pulling in schema changes, multi-row INSERT,
  Rust subprocess ownership, or disambiguation changes.

## Expected Outcome

This plan should leave the project with clearer edge-write diagnostics and one
bounded bulk insert optimization attempt. A successful result can justify a
later write-path ownership/protocol plan. A no-go result should redirect the
resolver migration program toward broader per-reference disambiguation
execution or a more explicit Rust-owned finalization design.

## 25. `docs/plans/2026-06-20-rust-hybrid-js-ts-file-import-target-parity.md`

# Rust-Hybrid JS/TS File Import Target Parity

Date: 2026-06-20

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior complete candidate producer routing boundary:
  `docs/plans/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary.md`
- Prior closeout:
  `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`

## Context

The complete candidate producer routing boundary proved that Rust-produced
candidate sets can be kept semantically safe behind local config, but it also
confirmed that TypeScript finalization/reference-resolution remains the largest
tail. The next step should improve Rust-owned resolver completeness before
returning to performance optimization.

The prior VS Code sparse closeout showed a large remaining file-target gap:

- `unresolved-file-level-import-target`: 64,429
- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919

For feature completeness, the file target gap should be reduced before moving
deeper into binding-level symbol disambiguation. If Rust cannot reliably map an
import specifier to a target file, later symbol-level resolution work lacks the
right context.

## Goal

Bring Rust JS/TS file-level import target resolution closer to the TypeScript
resolver for two narrow, high-value paths:

- conventional aliases:
  - `@/`
  - `~/`
  - `@src/`
  - `src/`
  - `@app/`
  - `app/`
- workspace package subpaths:
  - `@scope/ui/widgets` -> `packages/ui/widgets`
  - bare package import -> member package directory
  - directory/index extension resolution remains the normal follow-up step

This is a Rust-owned file-level target parity slice. It should create
file-level `imports` edges where the target file is known, but it must not make
symbol-level resolver decisions.

## Non-Goals

- Do not migrate binding-level symbol disambiguation.
- Do not change final target selection, ranking, confidence, or `resolvedBy`
  semantics for non-file-level decisions.
- Do not implement npm package resolution.
- Do not honor package `exports`, `main`, or conditional exports.
- Do not add `.svelte` or `.vue` target extension support in this slice.
- Do not change default user behavior outside the existing Rust-owned
  `rust-hybrid` indexing path.
- Do not change SQLite schema.
- Do not update README or release notes.
- Do not run full scoreboard or agent A/B validation.
- Do not require wall-clock performance improvement as a success gate.

## Target Scope

### Conventional Aliases

Rust should mirror the TypeScript resolver's conventional alias fallback list:

| Alias | Replacement |
| --- | --- |
| `@/` | `src/` |
| `~/` | `src/` |
| `@src/` | `src/` |
| `src/` | `src/` |
| `@app/` | `app/` |
| `app/` | `app/` |

The existing extension and directory index candidate rules still apply after
rewriting the specifier.

### Workspace Package Subpaths

Rust should load workspace member package names from:

- root `package.json` `workspaces` array;
- root `package.json` `workspaces.packages` array;
- root `pnpm-workspace.yaml` `packages:` list.

The loader should:

- expand one level of `*` / `**` workspace globs such as `packages/*` and
  `apps/*`;
- read each member's `package.json.name`;
- map package name to member directory;
- use longest package-name match for imports;
- rewrite the subpath without extension;
- let normal extension/index resolution find the target file.

The loader deliberately does not inspect `exports` or `main`.

## Diagnostics

Existing profile fields are enough to see total file-level import movement but
not enough to explain which source kind moved. This slice should add
profile-artifact diagnostics for source-kind attribution. These fields are
diagnostic artifacts only and do not promise long-term public API stability.

Required source kinds:

- `relative`
- `tsconfigPaths`
- `conventionalAlias`
- `workspacePackage`
- `unsupported`
- `binding`
- `unresolved`

At minimum, the profile must make it possible to answer:

- how many imports were resolved by each source kind;
- how many imports fell back by each source kind;
- whether conventional alias and workspace package paths were exercised in a
  real profile.

Existing aggregate fields should remain present for compatibility:

- `importPathAliasResolvedRefs`
- `importPathAliasFallbackRefs`
- `importPathAliasBindingFallbackRefs`
- `importPathAliasUnsupportedFallbackRefs`
- `importPathAliasUnresolvedFallbackRefs`

## Acceptance Evidence

Required deterministic coverage:

- Rust resolves conventional aliases to file-level `imports` edges.
- Rust resolves workspace package subpaths declared via root `package.json`
  workspaces to file-level `imports` edges.
- Rust resolves workspace package subpaths declared via `pnpm-workspace.yaml`
  to file-level `imports` edges.
- Existing relative import and tsconfig/jsconfig paths behavior remains intact.
- The resolved graph stays stable relative to the intended file-level target
  behavior.
- Diagnostics expose source-kind resolved/fallback counts.

Required targeted evidence:

- current-repo `rust-hybrid` targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy and source-kind diagnostics in the closeout decision;
- closeout decision stating whether this file-target parity slice is keepable.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

Performance results are evidence, not a gate. A no-op or regression is
acceptable if the closeout clearly explains why the feature-completeness slice
is or is not keepable.

## Issue Sequence

1. Add Rust workspace package manifest loader.
2. Resolve Rust JS/TS conventional aliases and workspace subpaths.
3. Add source-kind diagnostics for Rust file import target resolution.
4. Run targeted closeout evidence for JS/TS file import target parity.

## 26. `docs/plans/2026-06-20-rust-hybrid-lowername-default-on-routing.md`

# Rust-Hybrid LowerName Default-On Candidate Producer Routing

Date: 2026-06-20

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior routing experiment: `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- Prior routing closeout: `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`
- LowerName shadow closeout: `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`

## Context

The current Rust candidate producer has validated shadow coverage for
`ExactName`, `KnownNamePresence`, and `LowerName`. The previous main-path
routing slice safely routed only `ExactName` and `KnownNamePresence` behind
local experimental config. LowerName remains validated but not yet used as a
main-path candidate source.

The next useful resolver-migration slice is to route LowerName more completely:
not merely by adding it to a narrow precomputed key universe, but by serving the
actual `LowerName` lookups that the TypeScript resolver emits through
`matchFuzzy()`. The final disambiguation semantics remain TypeScript-owned.

## Goal

Make Rust candidate producer routing default-on for the `rust-hybrid` indexing
path, with routed shapes:

- `ExactName`
- `KnownNamePresence`
- `LowerName`

LowerName must support synchronous single-key on-demand producer lookup for
resolver-emitted `LowerName` requests that were not precomputed.

The implementation must preserve the current resolved graph by failing closed
to the TypeScript baseline on any routing uncertainty.

## Non-Goals

- Do not enable routing for `--engine typescript`.
- Do not route `QualifiedName` or `FileNodes`.
- Do not migrate `matchReference`.
- Do not change final target selection, ranking, confidence, `resolvedBy`,
  language gates, framework decisions, or dynamic-dispatch synthesis.
- Do not introduce queueing or batching for on-demand LowerName lookup.
- Do not add an environment flag.
- Do not clean up legacy experimental environment flags.
- Do not update README or release notes.
- Do not run full scoreboard or agent A/B validation.
- Do not make the local config a stable public API.

## Default-On Contract

For `rust-hybrid`:

- missing `.zcodegraph/config.json` means routing is enabled by default;
- `experimental.rustCandidateProducerRouting: true` keeps routing enabled and
  records `source: "local-config"`;
- `experimental.rustCandidateProducerRouting: false` disables routing and
  records `source: "local-config"`;
- invalid JSON or a non-boolean value disables routing, records
  `source: "invalid-local-config"`, and includes the invalid reason;
- invalid local config must not interrupt indexing.

For `typescript`:

- routing stays disabled;
- TypeScript engine behavior is unchanged.

## Routing Semantics

The candidate provider remains the routing boundary. `ReferenceResolver` and
`matchReference()` should keep using the existing candidate protocol calls.

The routed shapes are:

- `ExactName`
- `KnownNamePresence`
- `LowerName`

LowerName routing must support:

- precomputed producer results when available;
- synchronous single-key on-demand Rust producer lookup when the resolver asks
  for a LowerName key that was not precomputed;
- caching of successful on-demand results so repeated LowerName keys do not
  rerun the producer;
- TypeScript baseline comparison for every routed LowerName result.

Any of the following must disable candidate producer routing for the whole run
and fall back to the TypeScript baseline:

- Rust producer process failure;
- invalid producer response;
- missing Rust result for a routed lookup;
- candidate id mismatch;
- known-name presence mismatch;
- node hydration miss;
- invalid local config.

Fail-closed routing must not fail the index run. It must preserve the TypeScript
baseline graph and record diagnostics explaining why routing stopped.

## Diagnostics

Profile and doctor diagnostics must answer:

- Was routing enabled by default, local config, or disabled by local config?
- Was routing active at the end of the run?
- Which shapes were routed?
- Did LowerName use on-demand lookup?
- How many on-demand LowerName lookups were attempted?
- How many on-demand LowerName lookups were served from cache?
- Did routing fail closed?
- What fallback reason and mismatch samples explain fail-closed behavior?

Status JSON should stay concise. It may expose enabled/source state, but it
should not promise a stable config API.

## Acceptance Evidence

Required deterministic coverage:

- missing local config defaults routing on for `rust-hybrid`;
- local `false` disables routing;
- local `true` enables routing;
- invalid local config disables routing and records a reason;
- routed shapes diagnostics include `ExactName`, `KnownNamePresence`, and
  `LowerName`;
- on-demand LowerName success path returns the Rust-produced candidates;
- repeated same LowerName key does not rerun the producer;
- on-demand LowerName mismatch fails closed to the TypeScript baseline;
- on-demand LowerName producer failure fails closed to the TypeScript baseline;
- default-on rust-hybrid graph stability guard passes against a routing-disabled
  control.

Required targeted evidence:

- current-repo `rust-hybrid` targeted profile with default-on routing;
- VS Code sparse targeted profile with default-on routing;
- RSS or unavailable reason;
- fallback taxonomy and routing diagnostics in the closeout decision;
- closeout decision: `keep`, `no-go`, or `prerequisite`.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. Make rust-hybrid candidate producer routing default-on with local config kill
   switch.
2. Route LowerName through Rust producer with synchronous on-demand lookup and
   fail-closed fallback.
3. Add default-on graph stability and diagnostics coverage.
4. Run current-repo and VS Code sparse targeted profile closeout.

## 27. `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

# Rust-Hybrid Resolver Migration Decision Plan

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Parent PRD issue: #295
- Plan tracking issue: #296
- Optimization tracker: #165
- Parse/extraction diagnostic track: #224
- Big-picture decision: `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`

## Context

The `rust-hybrid` default path now has a clear split:

```text
TypeScript product shell
  -> Rust core source indexing
  -> TypeScript fallback append
  -> TypeScript finalization/reference resolution
  -> status / doctor / MCP / diagnostics
```

Recent optimization evidence shows that low-level SQLite/write-path work can
produce real wins, but the largest remaining end-to-end cost sits in the
TypeScript-owned finalization/reference-resolution tail. Continuing to optimize
that tail as isolated local patches risks hiding the real architecture problem:
the hybrid boundary may be forcing repeated candidate hydration, repeated
database lookup, and fragmented diagnostics across the Rust core and TypeScript
shell.

Before executing the architecture/performance PRD, create an independent
resolver migration decision plan. This plan is a prerequisite to #295's
architecture phase. It should decide how to approach full migration, not
directly implement the full migration.

## Goal

Define the migration route from the current TypeScript-owned
finalization/reference-resolution tail toward:

```text
Rust-owned finalization/reference-resolution
  with a narrow protocol boundary to the TypeScript product shell
```

The long-term target is to migrate the entire finalization/reference-resolution
chain out of the TypeScript tail, in multiple independently validated plans.
The first decision-plan outcome is a full migration blueprint plus the first
implementation-plan slice.

The first implementation slice is:

```text
candidate lookup/cache protocol
```

This first slice should move candidate collection/cache and lookup hydration
toward a protocol-owned or Rust-owned boundary. It must not migrate the
every-reference disambiguation decision.

## Non-Goals

- Do not implement the full resolver migration in this plan.
- Do not migrate broad disambiguation semantics in the first slice.
- Do not change every-reference disambiguation semantics.
- Do not migrate framework or dynamic-dispatch synthesis as the first slice.
- Do not rewrite the TypeScript product shell.
- Do not change the SQLite schema by default.
- Do not change user-facing CLI, SDK, MCP, status, or doctor behavior.
- Do not run a new large-corpus profile during this plan unless existing
  evidence is insufficient to make the first-slice decision.
- Do not update README metrics.
- Do not run a full scoreboard or agent A/B campaign for the plan document.

## Target Architecture

The desired end state is not "everything becomes Rust." It is a narrower split:

- Rust owns finalization/reference-resolution execution.
- Rust owns or protocolizes reusable candidate lookup and edge-emission
  mechanics.
- Rust emits profile sub-buckets that explain finalization work as one
  continuous indexing pipeline.
- TypeScript remains the product shell for CLI/SDK lifecycle, fallback planning,
  status/doctor packaging, MCP surfaces, and compatibility glue.
- The protocol boundary passes stable graph facts, fallback taxonomy,
  diagnostic profile data, and health information.
- The TypeScript shell should not keep doing high-volume resolver database work
  after the relevant responsibility has migrated.

## Migration Domains

The full migration should be split into multiple future plans or phases.

### 1. Candidate Lookup / Cache Protocol

First slice.

Responsibilities:

- collect candidate sets in batch;
- avoid repeated database hydration for the same names, files, scopes, and
  languages;
- expose lookup counts, cache hit/miss counts, hydration time, and candidate set
  size diagnostics;
- feed the existing TypeScript disambiguation decision without changing its
  semantics.

Expected first-slice output:

- a narrow protocol shape or cache contract;
- deterministic tests that prove candidate availability is equivalent;
- before/after profile evidence;
- VS Code sparse targeted profile during implementation;
- graphStats, fallback taxonomy, and RSS or unavailable reason.

No-go condition:

- If candidate lookup/cache does not reduce repeated database hydration or make
  finalization cost more explainable, do not keep extending this slice as a
  performance strategy. Escalate to the next likely bottleneck.

### 2. Disambiguation Execution

Later slice.

Responsibilities:

- preserve every-reference disambiguation semantics;
- port ranking and tie-breaking rules only after parity fixtures exist;
- keep ambiguous and fallback taxonomy behavior stable;
- provide replayable equivalence evidence.

Risks:

- broad semantic surface;
- agent sufficiency regressions from subtly different edge choices;
- large fixture burden.

### 3. Import / Export Resolution

Later slice.

Responsibilities:

- relative import resolution;
- paths alias resolution;
- ESM named import/export direct binding;
- one-hop direct re-export/barrel behavior;
- mixed Rust-owned and TypeScript fallback graph interactions.

Risks:

- package-resolution scope creep;
- file-level fallback interactions;
- accidental default/namespace/type-only expansion.

### 4. Local Exact References

Later slice.

Responsibilities:

- same-file and local-scope exact reference edges;
- candidate reuse across repeated local references;
- profile visibility for resolved and fallback references.

Risks:

- scope modelling differences between TS and Rust;
- accidental changes to ambiguous local names.

### 5. Cleanup / Edge-Write / DB Maintenance

Later slice, or a fallback first implementation if candidate cache is no-go.

Responsibilities:

- unresolved-reference cleanup;
- edge-write batching and validation;
- final database maintenance currently attributed to TypeScript finalization;
- profile buckets that distinguish lookup cost from write/cleanup cost.

Risks:

- write-path changes can hide semantic regressions if graphStats are weak;
- SQLite tuning can look fast on one corpus and noisy elsewhere.

### 6. Framework Post-Extract

Later slice.

Responsibilities:

- framework route/reference edges;
- language and framework specific post-extract facts;
- route-handler sufficiency preservation.

Risks:

- high framework coupling;
- direct impact on agent sufficiency;
- requires real repo smoke when semantics change.

### 7. Dynamic-Dispatch Synthesis

Later slice.

Responsibilities:

- callback/observer edges;
- EventEmitter-style edges;
- React render and JSX child edges;
- framework-specific dynamic flow bridges.

Risks:

- partial coverage can be worse than none;
- high sufficiency risk;
- requires end-to-end flow evidence.

### 8. Diagnostics / Profile / Status Contract

Cross-cutting slice.

Responsibilities:

- continuous Rust-side and TypeScript-shell profile story;
- fallback taxonomy preservation;
- graphStats and health reporting;
- doctor bundle visibility;
- no-source diagnostic privacy defaults.

Risks:

- diagnostic drift can make later performance decisions untrustworthy;
- exposing too much internal API can create stability expectations.

## Required Architecture Questions

The decision plan must answer:

1. Which finalization/reference-resolution responsibilities are still
   TypeScript-owned today?
2. Which responsibilities are candidates for Rust ownership?
3. Which responsibilities should become protocol-owned first?
4. What graph facts does TypeScript currently hydrate repeatedly?
5. Which repeated candidate lookups can be cached without changing
   disambiguation semantics?
6. What candidate cache key is stable enough for name, file, scope, language,
   and fallback interactions?
7. How does the cache interact with TypeScript fallback files appended after
   Rust core indexing?
8. What diagnostics prove that candidate lookup/cache changed the intended
   cost, rather than merely moving time between buckets?
9. What parity fixtures are required before disambiguation execution can move?
10. Which framework and dynamic-dispatch responsibilities must stay out of the
    first slice?
11. What no-go evidence would stop candidate cache from being treated as the
    right first migration path?

## Testing And Evidence Strategy

Plan-stage evidence:

- cite existing profile and benchmark artifacts;
- inspect current TypeScript finalization/reference-resolution structure;
- map existing profile buckets to migration domains;
- do not require a fresh VS Code sparse run unless existing evidence is
  insufficient to choose the first slice.

First implementation slice evidence:

- deterministic unit/integration tests at the highest practical seam;
- candidate equivalence tests proving the cache does not change availability;
- graphStats and fallback taxonomy comparison;
- before/after profile artifact;
- VS Code sparse targeted profile;
- RSS or unavailable reason;
- no agent A/B by default because disambiguation semantics should not change.

Agent A/B becomes required only if a later slice changes graph semantics,
language coverage, or sufficiency claims.

## Execution Order

1. Write architecture map for current TypeScript finalization/reference
   resolution.
2. Classify every migration domain by ownership target, risk, and prerequisite
   evidence.
3. Define the candidate lookup/cache protocol boundary.
4. Define first-slice implementation acceptance criteria.
5. Define no-go criteria and fallback next candidates.
6. Update #295 with the decision output.
7. Only after this plan is accepted, split implementation issues for the first
   slice.

## Success Criteria

This plan is complete when it produces:

- a clear target architecture;
- a full migration domain map;
- a first-slice implementation plan for candidate lookup/cache protocol;
- a statement that disambiguation decision semantics remain TypeScript-owned in
  the first slice;
- required parity, fallback, graphStats, profile, and RSS evidence criteria;
- no-go criteria for candidate lookup/cache;
- an update to #295 explaining how the architecture/performance PRD should
  consume this plan.

The success criterion is not "resolver migration has started." The success
criterion is that resolver migration has a route that can be judged, split, and
validated without blurring architecture decisions into local performance
patches.

## 28. `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage.md`

# Rust-hybrid Rust candidate producer complete shape coverage

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-lowername.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #307-#315 Rust candidate producer implementation slices

## Decision

Implement the next resolver-migration slice as **Rust candidate producer
complete shape coverage** covering the remaining candidate lookup shapes:

- `QualifiedName`
- `FileNodes`

The producer must remain in **shadow / double-read mode only**. It must not
feed the resolver main path, change candidate availability used for final
resolution, or alter every-reference disambiguation semantics.

When this slice closes successfully, the closeout decision should state:

> Rust candidate producer shape coverage is complete. Main-path routing remains
> a separate future decision.

## Why This Slice

The previous producer slices validated shadow equivalence for:

- `ExactName`
- `KnownNamePresence`
- `LowerName`

The remaining candidate protocol lookup shapes are `QualifiedName` and
`FileNodes`. Completing them gives the resolver migration program a full
candidate availability boundary before considering higher-risk decisions such
as Rust producer main-path routing or `matchReference` migration.

VS Code sparse evidence from the LowerName closeout shows these shapes are
meaningful enough to validate on a large corpus:

- `QualifiedName`: 69,233 candidate protocol lookups;
- `FileNodes`: 1,508 candidate protocol lookups.

`QualifiedName` is the larger next availability shape. `FileNodes` is smaller
but completes the protocol surface and may expose payload-size or file-path
boundary risks that smaller fixtures do not reveal.

## Scope

### In Scope

- Extend the Rust candidate producer protocol with `QualifiedName` and
  `FileNodes`.
- Produce Rust candidate ids for exact qualified-name lookup from the unified
  SQLite graph.
- Produce Rust candidate ids for exact file-path node lookup from the unified
  SQLite graph.
- Compare Rust producer output against the TypeScript candidate protocol
  baseline in shadow mode.
- Reuse the existing Rust producer diagnostics fields:
  - `lookupShapeCounts`
  - `candidateCount`
  - `payloadBytes`
  - `comparedCount`
  - `mismatchCount`
  - `mismatchReasons`
  - `mismatchSamples`
  - `producerMs`
  - `serializationMs`
  - `subprocessMs`
- Run deterministic fixture coverage and targeted current-repo / VS Code sparse
  profile evidence.
- Close out with keep / no-go / prerequisite.

### Out of Scope

- Routing Rust producer output into final resolver decisions.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Adding path normalization for `FileNodes`.
- Supporting relative/absolute path conversion, case-folding, symlink, or
  realpath behavior for `FileNodes`.
- Adding suffix/fuzzy qualified-name matching.
- Adding namespace fallback, import alias, package resolution, import-chain
  resolution, re-export semantics, default import semantics, namespace import
  semantics, or type-only semantics.
- Adding new profile artifact diagnostics fields.
- Optimizing producer transport, subprocess overhead, payload shape, or
  serialization.
- Agent A/B.
- README or user-facing performance claims.
- Automatically creating or entering a main-path routing decision plan.

## Shape Boundaries

### `QualifiedName`

`QualifiedName` is exact availability only:

- input: `qualifiedName`;
- Rust query semantics: exact `qualified_name = ?` over the unified graph;
- compare candidate node id set, candidate count, and empty behavior.

Do not add:

- suffix matching;
- fuzzy matching;
- namespace fallback;
- import alias resolution;
- package resolution;
- import-chain or re-export resolution.

### `FileNodes`

`FileNodes` is exact file-path availability only:

- input: `filePath`;
- Rust query semantics: exact `file_path = ?` over the unified graph;
- compare candidate node id set, candidate count, and empty behavior.

Do not add:

- file-path normalization;
- relative/absolute path conversion;
- case normalization;
- symlink or realpath handling;
- directory expansion.

Ordering is not semantic for either shape unless implementation evidence shows
the current resolver depends on it. If ordering turns out to matter, document
it and do not route producer output into the main path in this slice.

## Protocol Boundary

The producer reads or receives enough data to answer the remaining candidate
lookup shapes over the unified graph after:

1. Rust core graph write.
2. TypeScript fallback append.
3. Before or during TypeScript finalization reference resolution.

The protocol must preserve mixed graph behavior:

- Rust-owned files may reference TypeScript fallback files.
- TypeScript fallback files may reference Rust-owned files.
- Lookup output must not filter by indexing engine ownership.

The TypeScript resolver remains the final consumer and final disambiguation
owner. Rust producer output is compared, measured, and recorded only.

## Diagnostics

Do not add new profile artifact diagnostics fields in this slice. Extend the
existing Rust candidate producer profile artifact so:

- `lookupShapeCounts.QualifiedName` is present;
- `lookupShapeCounts.FileNodes` is present;
- mismatch taxonomy can identify candidate set drift for either shape;
- mismatch samples remain capped.

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Equivalence Rules

Equivalence compares candidate availability, not final resolver decisions.

For `QualifiedName`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior.

For `FileNodes`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior.

The closeout must not claim performance improvement from this shadow-only
slice. It may record timing context to support future decisions.

## Acceptance Evidence

Required:

- deterministic fixture tests for `QualifiedName` present / multiple
  candidates / missing;
- deterministic fixture tests for `FileNodes` present / multiple candidates /
  missing;
- mixed Rust-owned + TypeScript fallback fixture;
- public graph guard showing graphStats and resolved edge shape do not drift
  because Rust producer output is not used for final resolution;
- profile artifact diagnostics test showing `lookupShapeCounts.QualifiedName`
  and `lookupShapeCounts.FileNodes`;
- current-repo targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy comparison;
- closeout decision stating whether complete producer shape coverage is keep /
  no-go / prerequisite.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## No-Go Criteria

Stop this direction or mark it prerequisite if:

- deterministic fixture equivalence is not stable;
- current repo or VS Code sparse evidence shows producer mismatches;
- `QualifiedName` parity requires suffix, fuzzy, namespace, import, package, or
  re-export semantics;
- `FileNodes` parity requires path normalization beyond exact filePath lookup;
- implementing producer parity requires changing disambiguation semantics;
- producer diagnostics cannot distinguish all five candidate producer shapes
  using the existing diagnostics fields;
- payload size or subprocess behavior makes the producer unusable even in
  shadow mode;
- the only way to make the result useful is to route Rust output into final
  decisions before shadow equivalence is clean.

## Issue Sequence

1. Extend Rust candidate producer protocol for `QualifiedName` and `FileNodes`.
2. Implement Rust shadow producer for exact `QualifiedName` availability.
3. Implement Rust shadow producer for exact `FileNodes` availability.
4. Validate complete-shape diagnostics and graph stability.
5. Run targeted evidence and close out candidate producer coverage.

The sequence completes candidate producer shape coverage. It is still not the
migration of final disambiguation, nor approval for Rust producer main-path
routing.

## 29. `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-lowername.md`

# Rust-hybrid Rust candidate producer LowerName

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #307-#311 Rust candidate producer v1 implementation slice

## Decision

Implement the next resolver-migration slice as **Rust candidate producer
LowerName** covering only:

- `LowerName`

The producer must run in **shadow / double-read mode only**. It must not feed
the resolver main path, change candidate availability used for final
resolution, or alter any every-reference disambiguation semantics.

## Why This Slice

Rust candidate producer v1 validated that Rust can produce `ExactName` and
`KnownNamePresence` facts without drifting from the TypeScript baseline:

- current ZCodeGraph repo: 5,085 producer lookups compared, 0 mismatches;
- VS Code sparse checkout: 135,601 producer lookups compared, 0 mismatches.

`LowerName` is the next useful candidate availability shape because it is still
lookup-oriented, not semantic disambiguation. It exercises case-folding and
normalization behavior that exact-name lookup does not cover, while avoiding
the heavier unresolved questions in `QualifiedName`, `FileNodes`, import-chain
resolution, framework synthesis, and final target ranking.

This slice should answer:

> Can Rust produce lower-name candidate facts from the unified graph with the
> same observable availability as the TypeScript resolver baseline?

## Scope

### In Scope

- Extend the Rust candidate producer protocol with a `LowerName` lookup shape.
- Produce Rust candidate ids for lower-name lookup from the unified SQLite
  graph.
- Match TypeScript `getNodesByLowerName` semantics, including multiple
  candidates and empty candidate behavior.
- Compare Rust producer output against the TypeScript candidate protocol
  baseline in shadow mode.
- Add or extend mismatch taxonomy for lower-name drift.
- Expose `LowerName` diagnostics separately from `ExactName` and
  `KnownNamePresence` in rust-hybrid profile artifacts.
- Run deterministic fixture coverage and targeted current-repo / VS Code sparse
  profile evidence.
- Close out with keep / no-go / prerequisite.

### Out of Scope

- Routing Rust producer output into final resolver decisions.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Supporting `QualifiedName` or `FileNodes`.
- Adding package resolution, framework lookup, scope tree lookup, import chain
  semantics, default import semantics, namespace import semantics, re-export
  semantics, or type-only semantics.
- Agent A/B.
- README or user-facing performance claims.

## Protocol Boundary

The producer reads or receives enough data to answer lower-name lookup over the
unified graph after:

1. Rust core graph write.
2. TypeScript fallback append.
3. Before or during TypeScript finalization reference resolution.

The protocol must preserve mixed graph behavior:

- Rust-owned files may reference TypeScript fallback files.
- TypeScript fallback files may reference Rust-owned files.
- Lookup output must not filter by indexing engine ownership.

The TypeScript resolver remains the final consumer and final disambiguation
owner. Rust producer output is compared, measured, and recorded only.

## Diagnostics

Extend the existing Rust candidate producer profile artifact diagnostics so
`LowerName` is visible independently. Required diagnostics include:

- `lookupShapeCounts.LowerName`
- `comparedCount`
- `mismatchCount`
- `mismatchReasons`
- `mismatchSamples`
- producer timing fields already used by v1
- disabled or unavailable reason when the producer does not run

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Equivalence Rules

Equivalence compares candidate availability, not final resolver decisions.

For `LowerName`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior;
- behavior when multiple differently-cased names share the same lower-name key.

Ordering is not semantic unless implementation evidence shows the current
resolver depends on it. If ordering turns out to matter, document it and do
not route producer output into the main path in this slice.

Mismatch samples must be capped.

## Acceptance Evidence

Required:

- deterministic fixture tests for present lower-name lookup;
- deterministic fixture tests for case variants, such as `MixedCase` and
  `mixedcase`;
- deterministic fixture tests for multiple candidates with the same lower-name
  key;
- deterministic fixture tests for missing lower-name lookup;
- mixed Rust-owned + TypeScript fallback fixture;
- public graph guard showing graphStats and resolved edge shape do not drift
  because Rust producer output is not used for final resolution;
- profile artifact diagnostics test showing `lookupShapeCounts.LowerName`;
- current-repo targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy comparison.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## No-Go Criteria

Stop this direction or mark it prerequisite if:

- deterministic fixture equivalence is not stable;
- current repo or VS Code sparse evidence shows producer mismatches;
- Rust/SQLite lower-name semantics drift from TypeScript string lower-name
  behavior in a way this slice cannot safely normalize;
- mismatch taxonomy points to path normalization, DB schema gaps, fallback
  append timing, or candidate fact shape gaps that must be solved first;
- implementing producer parity requires changing disambiguation semantics;
- producer diagnostics cannot be separated from existing candidate protocol
  timing;
- the only way to make it useful is to route Rust output into final decisions
  before shadow equivalence is clean.

## Issue Sequence

1. Extend Rust candidate producer protocol for `LowerName`.
2. Implement Rust shadow candidate producer for `LowerName`.
3. Validate `LowerName` producer diagnostics and graph stability.
4. Run targeted evidence and close out the `LowerName` producer decision.

The sequence is intentionally narrow. It expands Rust-owned candidate
availability coverage, but it is still not the migration of final
disambiguation itself.

## 30. `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`

# Rust-hybrid Rust candidate producer v1

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #302-#306 candidate lookup/cache protocol implementation slice

## Decision

Implement the next resolver-migration slice as **Rust candidate producer v1**
covering only:

- `ExactName`
- `KnownNamePresence`

The producer must run in **shadow / double-read mode only**. It must not feed
the resolver main path, change candidate availability used for final
resolution, or alter any every-reference disambiguation semantics.

## Why This Slice

The previous candidate protocol slice established a TypeScript in-process
boundary and validated candidate availability at scale:

- current ZCodeGraph repo: 74,240 comparisons, 0 mismatches;
- VS Code sparse checkout: 1,609,764 comparisons, 0 mismatches.

That proves the TypeScript-side protocol boundary is stable enough to support
the next question:

> Can Rust produce high-volume candidate facts for the simplest lookup shapes
> without drifting from the TypeScript baseline?

`ExactName` and `KnownNamePresence` are the right first Rust producer shapes
because they dominate lookup volume and have the least semantic ambiguity:

- VS Code sparse `ExactName`: 760,610 lookups;
- VS Code sparse `KnownNamePresence`: 747,544 lookups.

This gives a meaningful Rust-ownership signal without crossing into ranking,
confidence, import semantics, framework synthesis, or dynamic dispatch.

## Scope

### In Scope

- Define a narrow Rust candidate producer protocol for `ExactName` and
  `KnownNamePresence`.
- Produce Rust candidate ids or facts for exact-name lookup from the unified
  SQLite graph.
- Produce Rust known-name presence answers from the unified SQLite graph.
- Compare Rust producer output against the TypeScript candidate protocol
  baseline in shadow mode.
- Add mismatch taxonomy and bounded samples for producer drift.
- Expose producer diagnostics in rust-hybrid profile artifacts.
- Run deterministic fixture coverage and targeted current-repo / VS Code sparse
  profile evidence.
- Close out with keep / no-go / prerequisite.

### Out of Scope

- Routing Rust producer output into final resolver decisions.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Supporting `LowerName`, `QualifiedName`, or `FileNodes`.
- Adding package resolution, framework lookup, scope tree lookup, import chain
  semantics, default import semantics, namespace import semantics, or type-only
  semantics.
- Agent A/B.
- README or user-facing performance claims.

## Protocol Boundary

The producer reads or receives enough data to answer two lookup shapes over the
unified graph after:

1. Rust core graph write.
2. TypeScript fallback append.
3. Before or during TypeScript finalization reference resolution.

The protocol must preserve mixed graph behavior:

- Rust-owned files may reference TypeScript fallback files.
- TypeScript fallback files may reference Rust-owned files.
- Lookup output must not filter by indexing engine ownership.

The TypeScript resolver remains the final consumer and final disambiguation
owner. Rust producer output is compared, measured, and recorded only.

## Diagnostics

Add a profile artifact section for the Rust candidate producer. Suggested
fields:

- `enabled`
- `shadowMode`
- `producerMs`
- `serializationMs`
- `lookupCount`
- `lookupShapeCounts`
- `comparedCount`
- `mismatchCount`
- `mismatchReasons`
- `mismatchSamples`
- `candidateCount`
- `payloadBytes`
- `disabledReason`

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Equivalence Rules

Equivalence compares candidate availability, not final resolver decisions.

For `ExactName`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior.

For `KnownNamePresence`, compare:

- present vs absent;
- missing-name behavior;
- empty graph behavior if applicable.

Ordering is not semantic unless implementation evidence shows the current
resolver depends on it. If ordering turns out to matter, document it and do
not route producer output into the main path in this slice.

Mismatch samples must be capped.

## Acceptance Evidence

Required:

- deterministic fixture tests for `ExactName` present / multiple candidates /
  missing;
- deterministic fixture tests for `KnownNamePresence` present / missing;
- mixed Rust-owned + TypeScript fallback fixture;
- public graph guard showing graphStats and resolved edge shape do not drift
  because Rust producer output is not used for final resolution;
- profile artifact diagnostics test;
- current-repo targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy comparison.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## No-Go Criteria

Stop this direction or mark it prerequisite if:

- deterministic fixture equivalence is not stable;
- VS Code sparse shows producer mismatches;
- mismatch taxonomy points to path normalization, DB schema gaps, fallback
  append timing, or candidate fact shape gaps that must be solved first;
- implementing producer parity requires changing disambiguation semantics;
- producer diagnostics cannot be separated from existing candidate protocol
  timing;
- the only way to make it useful is to route Rust output into final decisions
  before shadow equivalence is clean.

## Issue Sequence

1. Define Rust candidate producer protocol for `ExactName` and
   `KnownNamePresence`.
2. Implement Rust shadow producer for `ExactName`.
3. Implement Rust shadow producer for `KnownNamePresence`.
4. Expose Rust producer diagnostics in rust-hybrid profiles.
5. Run targeted evidence and close out the producer decision.

The sequence is intentionally narrow. It is the first Rust producer step toward
Rust-owned finalization/reference-resolution, not the migration of
disambiguation itself.

## 31. `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-gap-burndown.md`

# Rust-Hybrid ESM Direct Export Candidate Gap Burndown

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- ESM named fallback diagnostics map:
  `docs/plans/2026-06-21-rust-hybrid-esm-named-binding-fallback-diagnostics-map.md`
- ESM named fallback closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- This plan closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The ESM named binding fallback diagnostics map identified
`directExportCandidateGap` as the dominant actionable fallback bucket on the
representative VS Code sparse corpus:

- `esmNamedImportExportResolvedRefs`: 121,209
- `esmNamedImportExportFallbackRefs`: 42,317
- `directExportCandidateGap`: 29,584
- raw direct export reasons:
  - `direct-export-candidate-multiple`: 15,428
  - `direct-export-candidate-zero`: 14,156

The current repo is dominated by package/runtime and unsupported import-shape
boundaries, so it is useful as a regression fixture but should not drive this
implementation slice. VS Code sparse points to direct export candidate
availability as the next resolver migration target.

The current Rust direct export recognition is intentionally narrow. It misses
real TypeScript declaration forms such as modifier-bearing exports and direct
same-file export specifiers. This plan burns down the candidate-zero side of
the gap without changing multi-candidate disambiguation semantics.

## Goal

Reduce Rust ESM named import/export fallback caused by direct export candidate
availability gaps while preserving the current final-reference disambiguation
boundary.

The desired result is not "all direct export gaps disappear." The desired
result is:

- declaration-style direct exports that are semantically direct become
  resolvable;
- same-file `export { Name }` bindings become resolvable only when the local
  candidate is unique;
- remaining direct export gaps are reclassified clearly enough to choose the
  next slice.

## Non-Goals

- Do not implement default import resolution.
- Do not implement namespace import resolution.
- Do not implement package or runtime resolution.
- Do not change type-only import semantics.
- Do not implement multi-hop re-export chains.
- Do not implement broad candidate tie-break behavior for multiple candidates.
- Do not change TypeScript resolver behavior.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement from this slice.
- Do not record source snippets, source lines, export-list text, candidate name
  arrays, or candidate source in diagnostic artifacts.

## Scope

### Declaration-style direct exports

Expand Rust direct export declaration recognition for bounded, direct
declaration forms such as:

- `export function Name`
- `export async function Name`
- `export class Name`
- `export abstract class Name`
- `export interface Name`
- `export type Name`
- `export enum Name`
- `export const Name`
- `export let Name`
- `export var Name`
- declaration variants with TypeScript modifiers such as `declare` when they
  remain direct named declarations.

The implementation may use a parser-backed or carefully bounded recognition
strategy, but it must not accept unrelated text as proof of a direct export.

### Same-file `export { Name }`

Add same-file export specifier association for the narrow case:

- the export specifier is in the same target file;
- the exported name and local name are the same;
- exactly one local declaration candidate exists;
- the target file is already known from file-level import resolution.

Fallback remains required for:

- no local declaration candidate;
- multiple local declaration candidates;
- aliases such as `export { Local as Public }`;
- re-export forms such as `export { Name } from "./other"`;
- default, namespace, package/runtime, and type-only boundaries.

## Diagnostics

Keep the diagnostics privacy-safe and evidence-oriented.

Required direct export candidate gap sub-buckets:

- declaration-style recognized and resolved;
- same-file export specifier recognized and resolved;
- candidate multiple;
- candidate zero after this slice;
- import target unavailable or ambiguous;
- unsupported shape or out-of-scope boundary.

The exact field names can follow the existing ESM fallback taxonomy vocabulary,
but the closeout must distinguish what this slice fixed from what remains.

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Validation

Required deterministic tests:

- fixture proving declaration-style direct exports resolve where they
  previously fell back;
- fixture proving same-file `export { Name }` resolves only when exactly one
  local declaration candidate exists;
- fixture proving multiple local candidates still fall back;
- fixture proving alias, re-export, default, namespace, package/runtime, and
  type-only boundaries are not silently treated as supported;
- existing ESM named import/export and one-hop re-export success behavior still
  passes.

Required evidence:

- current repo targeted profile/taxonomy evidence;
- VS Code sparse targeted profile/taxonomy evidence;
- evidence sidecars record wall time and RSS or `rssUnavailableReason`;
- closeout decision states keep / no-go / prerequisite and updates #295, #296,
  and #165 if relevant.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. #367 Add direct export candidate gap fixtures and baseline diagnostics.
2. #368 Expand declaration-style direct export recognition.
3. #369 Add same-file `export { Name }` unique local binding association.
4. #370 Run current repo and VS Code sparse closeout evidence.

## 32. `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-multiple-taxonomy.md`

# Rust-Hybrid ESM Direct Export Candidate-Multiple Taxonomy

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- ESM named fallback diagnostics map:
  `docs/plans/2026-06-21-rust-hybrid-esm-named-binding-fallback-diagnostics-map.md`
- Direct export candidate gap burndown:
  `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-gap-burndown.md`
- Direct export candidate gap burndown closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- This plan closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The previous direct export candidate gap burndown proved that bounded direct
export recognition is useful, but it also made the next blocker clearer on VS
Code sparse:

- `esmNamedImportExportFallbackRefs`: 40,039
- `directExportCandidateGap`: 27,306
- raw direct export candidate reasons:
  - `direct-export-candidate-multiple`: 16,384
  - `direct-export-candidate-zero`: 10,864
  - `same-file-export-specifier-candidate-zero`: 58

Candidate-multiple is now the dominant direct export raw reason. It is also the
highest-risk area: TypeScript permits declaration merging, overloads,
ambient declarations, and separate type/value namespaces. A broad tie-break
would risk changing per-reference disambiguation semantics.

This plan intentionally does not change resolver behavior. It opens the
candidate-multiple map so a later slice can decide whether any bounded
tie-break is safe.

## Goal

Classify direct export candidate-multiple fallbacks into decision-oriented
subtypes and produce an evidence-backed next-step recommendation.

The output should answer:

- which candidate-multiple subtype dominates on VS Code sparse;
- which subtypes are plausible bounded tie-break candidates;
- which subtypes are no-go and must continue to fallback;
- whether the next resolver slice should change behavior or stay diagnostic.

## Non-Goals

- Do not change Rust resolver behavior.
- Do not add broad candidate tie-break behavior.
- Do not add source-order or pick-first selection.
- Do not implement default import resolution.
- Do not implement namespace import resolution.
- Do not implement package or runtime resolution.
- Do not change type-only import semantics.
- Do not implement multi-hop re-export chains.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement.
- Do not record source snippets, source lines, export-list text, candidate
  source, or full source content.

## Scope

### Candidate-multiple taxonomy

Add a dedicated direct export candidate-multiple taxonomy artifact generator.

The generator may read:

- Rust profile artifact fallback samples;
- the SQLite database for candidate metadata;
- candidate node metadata such as `id`, `kind`, `name`, `file_path`,
  `start_line`, and `end_line`;
- reference metadata and target file path already present in profile samples.

The generator must not read source file contents or emit source snippets.

Required subtype buckets:

- `interface-class-merge`
- `function-overload-signature`
- `ambient-declaration-merge`
- `type-value-namespace-collision`
- `duplicate-extraction`
- `same-kind-duplicate`
- `unknown-multiple`

The implementation may refine names if evidence shows sharper categories, but
the closeout must preserve the decision distinction:

- safe bounded tie-break candidate;
- possible prerequisite first;
- no-go / keep fallback.

### Evidence

Run deterministic evidence on:

- current repo;
- `/private/tmp/codegraph-corpus/vscode-sparse`.

VS Code sparse is the primary decision corpus. Current repo is a regression
and artifact-stability check.

Evidence sidecars must record:

- wall time;
- peak RSS or `rssUnavailableReason`;
- corpus commit for VS Code sparse.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.
- Do not close the closeout issue with current-repo-only evidence.

## Validation

Required deterministic tests:

- taxonomy artifact can classify fixture profile + DB candidate metadata;
- candidate metadata output remains privacy-safe;
- missing profile samples are reported as unavailable, not as success;
- missing database or missing candidate rows produce explicit unavailable or
  unknown buckets;
- same-file export specifier multiple reasons remain grouped under the direct
  export candidate domain.

Required closeout:

- current repo artifacts;
- VS Code sparse artifacts or needs-human-setup status;
- largest subtype;
- bounded tie-break candidate list;
- no-go subtype list;
- recommended next slice;
- tracker updates for #295, #296, and #165.

## Issue Sequence

1. #371 Add candidate-multiple taxonomy fixture and artifact contract.
2. #372 Implement DB-backed direct export candidate-multiple classifier.
3. #373 Run current repo and VS Code sparse candidate-multiple taxonomy evidence.
4. #374 Close out candidate-multiple tie-break decision.

## 33. `docs/plans/2026-06-21-rust-hybrid-esm-named-binding-fallback-diagnostics-map.md`

# Rust-Hybrid ESM Named Binding Fallback Diagnostics Map

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Relative file-node diagnostics cleanup:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The recent relative import-target work cleaned up the file-level import target
surface:

- relative JS source specifiers now resolve to same-basename source files when
  appropriate;
- non-code asset/config residuals are classified as diagnostics-known
  boundaries;
- asset/config imports still do not create graph edges.

That leaves the resolver migration effort back on the main binding-level
surface. Current Rust-hybrid profiles still show a large
`binding-level-symbol-disambiguation` fallback bucket:

- current repo: roughly thousands of binding fallbacks;
- VS Code sparse checkout: roughly one hundred thousand binding fallbacks.

Rust already owns a meaningful ESM named import/export path:

- direct same-name ESM named import/export binding;
- direct one-hop named re-export/barrel behavior;
- imported symbol usage edges once the imported binding resolves.

However, the current profile only exposes aggregate
`esmNamedImportExportFallbackRefs`. It does not explain why eligible-looking
ESM named bindings fall back. Running a large VS Code sparse profile without a
complete fallback map wastes the expensive run: it leaves the next
implementation slice partly guess-driven.

## Goal

Open the ESM named binding fallback diagnostics map.

This slice should make the Rust profile and benchmark artifacts explain the
major ESM named binding fallback reasons well enough to choose the next
implementation slice or state a no-go.

The output should feel like lifting the map fog:

- which fallback reasons dominate;
- which reasons are already expected boundaries;
- which reasons are likely implementation candidates;
- which reasons require human setup, corpus hydration, or a separate design.

## Non-Goals

- Do not change resolver behavior.
- Do not create new graph edges.
- Do not implement default import resolution.
- Do not implement namespace import resolution.
- Do not implement package resolution.
- Do not implement type-only symbol graph semantics.
- Do not broaden re-export chains beyond existing behavior.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement.
- Do not record source snippets, source lines, export lists, or candidate name
  arrays in profile samples.

## Diagnostics Contract

Add Rust profile fields for ESM named fallback diagnostics:

- `esmNamedImportExportFallbackSampleCounts`
- `esmNamedImportExportFallbackSamples`
- `esmNamedImportExportFallbackSampleCap`

The sample cap can follow the existing import fallback sample shape:

- bounded per reason;
- bounded total;
- truncation surfaced in the cap object.

Required reason map:

- `type-only-import`
- `import-edge-target-not-found`
- `import-edge-target-ambiguous`
- `target-file-content-unavailable`
- `direct-export-candidate-zero`
- `direct-export-candidate-multiple`
- `reexport-specifier-target-not-found`
- `reexport-leaf-content-unavailable`
- `reexport-leaf-candidate-zero`
- `reexport-leaf-candidate-multiple`
- `package-or-runtime-binding`
- `unsupported-import-shape`

The exact reason names may be adjusted during implementation if the code path
reveals a sharper taxonomy, but the resulting map must distinguish:

- missing/ambiguous file-level import edge;
- type-only boundaries;
- direct export candidate failures;
- one-hop re-export candidate failures;
- package/runtime/unsupported binding boundaries.

## Privacy-Safe Sample Fields

Allowed fields:

- `reason`
- `referenceName`
- `referenceKind`
- `filePath`
- `language`
- `line`
- `col`
- `targetFilePath` when a file-level target is known
- `candidateCount` when applicable
- `resolvedByAttempt` such as `direct-export` or `one-hop-reexport`

Disallowed fields:

- source snippets;
- source lines;
- full source file content;
- export list text;
- candidate name arrays;
- candidate source excerpts.

These fields are internal profile artifact diagnostics. They should not be
described as a long-term public API.

## Taxonomy Artifact

Add a dedicated ESM named fallback taxonomy artifact generator.

Do not fold this into the relative import target taxonomy script. The domains
are different:

- import target taxonomy answers file-target questions;
- ESM named fallback taxonomy answers binding resolution questions.

The script should read a Rust profile artifact and write:

- JSON artifact;
- Markdown summary artifact.

The output should include:

- reason distribution;
- total rows inspected;
- unavailable reason if the profile does not contain ESM fallback samples;
- top examples by reason;
- a concise "candidate next slice" section based on dominant actionable
  reasons.

## Validation

Required deterministic tests:

- Profile fields exist and remain bounded.
- Each major fallback reason is coverable by fixture tests or direct unit-level
  profile serialization tests where end-to-end fixture setup would be too
  artificial.
- Samples contain only privacy-safe fields.
- Existing ESM named import/export success behavior still passes.
- The dedicated taxonomy generator classifies profile samples by reason and
  writes JSON/Markdown artifacts.

Required evidence:

- Current repo targeted profile/taxonomy evidence.
- VS Code sparse targeted profile/taxonomy evidence.
- Evidence sidecars record wall time and RSS or `rssUnavailableReason`.
- Closeout must select the next implementation candidate or explicitly state
  no-go.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. #363 Add ESM named fallback reason samples to Rust profile.
2. #364 Add ESM named fallback taxonomy artifact generator.
3. #365 Run current repo and VS Code sparse ESM fallback map evidence.
4. #366 Close out ESM named binding fallback diagnostics map.

## 34. `docs/plans/2026-06-21-rust-hybrid-finalization-tail-boundary-plan.md`

# Rust-Hybrid Finalization Tail Boundary Plan

Date: 2026-06-21

## Parent

- Optimization tracker: #165
- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Architecture map:
  `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- ADR:
  `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- Previous #165 successor plan:
  `docs/plans/2026-06-21-rust-hybrid-value-token-interface-routing.md`
- Previous closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The first #165 successor plan validated one guarded semantic routing slice:
`value-token-plus-interface`. Its closeout was `keep-with-caveat`: the mechanism
is useful and produced Rust-owned edges on VS Code sparse, but it did not close
the whole collision family.

The next plan should not continue burning isolated fallback buckets by default.
The durable missing piece is the finalization tail boundary itself. The project
already has a current-state map from 2026-06-20, but it still needs an explicit
completion plan that turns the map into:

- a responsibility matrix;
- a diagnostic contract;
- migration/defer gates;
- a closeout artifact;
- a clear #165 state transition into implementation-sequence mode.

## Goal

Complete the Finalization Tail Boundary Plan.

Completion means the finalization/reference-resolution tail is explicitly
classified, the low-risk tail mechanisms have their boundary contracts defined,
framework post-extract has a deterministic pre-resolution contract, and #165 is
updated to stop asking open-ended architecture questions before implementation
work can continue.

This plan is a boundary closeout plan. It does not migrate broad resolver
semantics to Rust.

## Scope

In scope:

- finalization tail ownership matrix;
- public profile/diagnostic contract for the tail;
- framework post-extract boundary contract and deterministic fixture;
- edge write and cleanup ownership boundary;
- unresolved refs lifecycle taxonomy and fail-closed cleanup contract;
- closeout artifact under `docs/benchmarks/`;
- #165 update stating `Finalization Tail Boundary Plan completed`.

Out of scope:

- broad reference disambiguation migration;
- changing every-reference disambiguation semantics;
- moving dynamic-dispatch synthesis;
- moving framework post-extract to Rust;
- full scoreboard;
- agent A/B by default;
- README or release metric refresh;
- CLI, SDK, MCP, status, doctor, or package workflow changes unless a boundary
  test exposes an existing contract bug.

## Existing Evidence To Reuse

Default evidence source:

- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- 2026-06-21 fallback/taxonomy closeouts under `docs/benchmarks/`
- latest #165 tracker comments

Do not run a new full benchmark for this plan by default.

A single targeted profile may be run only if writing the closeout exposes a
missing field required for the boundary contract. If VS Code sparse evidence is
needed, use `/private/tmp/codegraph-corpus/vscode-sparse` only when it exists
and is a Git checkout. Do not clone automatically.

## Responsibility Classification Target

The closeout must classify each tail responsibility:

| Responsibility | Current owner | Target posture | Plan 2 action |
| --- | --- | --- | --- |
| Product shell orchestration | TypeScript | TypeScript-owned | Document as out of resolver migration scope. |
| TypeScript fallback append | TypeScript | TypeScript-owned compatibility layer | Document interaction with finalization and next full-index behavior. |
| Framework post-extract | TypeScript | Deferred migration candidate | Define boundary contract and fixture; do not migrate. |
| Broad reference resolution | TypeScript | Long-term Rust-owned | Classify; do not migrate in this plan. |
| Candidate lookup/cache | Mixed protocol/Rust work already started | Protocol/Rust-owned over time | Reference existing work; do not reopen in this plan unless diagnostic gap is found. |
| Import/export semantic slices | Mixed | Rust-owned by independently validated slices | Classify completed and residual slices. |
| Local exact references | Mixed | Rust-owned by independently validated slices | Classify completed and residual slices. |
| Edge materialization/write | TypeScript tail | Protocol-owned or Rust-owned candidate | Define boundary and evidence gate. |
| Unresolved refs cleanup | TypeScript tail | Protocol-owned or Rust-owned candidate | Define lifecycle taxonomy and fail-closed contract. |
| Dynamic-dispatch synthesis | TypeScript | Deferred | Classify as deferred due to sufficiency risk. |
| DB maintenance | TypeScript tail | TypeScript-owned or protocol-owned later | Classify; no migration in this plan. |
| Tail diagnostics/profile | Mixed | Protocol contract | Define public diagnostic fields needed for later implementation. |

## Decisions Already Made

- Plan 2 is `Finalization Tail Boundary Plan`.
- Plan 2 must complete the boundary plan, not merely discuss it.
- The plan output is boundary closeout plus issue sequence, not production Rust
  migration.
- Dynamic-dispatch synthesis is classified but deferred.
- Framework post-extract is included in the issue sequence, but only as
  boundary contract plus deterministic fixture. It must not migrate to Rust in
  this plan.
- Existing evidence should be reused by default. A targeted profile is allowed
  only for a concrete missing field.
- After closeout, #165 moves into implementation-sequence mode. Future
  implementation issues may still escalate architecture problems, but Plan 2
  should not remain open-ended.

## Issue Sequence

### 1. Finalization Tail Diagnostic Contract And Ownership Matrix

Purpose:

- turn the current architecture map into a closeable ownership matrix;
- identify public profile fields that are required for later implementation
  evidence;
- classify each tail responsibility as TypeScript-owned, Rust-owned,
  protocol-owned, or deferred.

Acceptance criteria:

- ownership matrix exists in a decision artifact or closeout draft;
- diagnostic fields are listed by responsibility;
- missing fields are either explicitly not required or converted into bounded
  follow-up work;
- no production behavior changes.

### 2. Framework Post-Extract Boundary Contract And Fixture

Purpose:

- make framework post-extract visible as a pre-reference-resolution boundary;
- prove the ordering contract with deterministic fixture coverage;
- define the migration gate for any future Rust/protocol implementation.

Acceptance criteria:

- fixture demonstrates that framework post-extract must run before reference
  resolution when it changes graph facts consumed by resolution;
- contract documents what a framework post-extract hook may mutate;
- migration gate states what evidence would be required before moving a hook to
  Rust or protocol ownership;
- no framework post-extract hook is migrated to Rust in this plan.

### 3. Edge Write And Cleanup Ownership Boundary

Purpose:

- classify edge materialization/write and cleanup as tail mechanisms separate
  from disambiguation semantics;
- define what can move without changing target selection;
- define graph parity and profile evidence required before any migration.

Acceptance criteria:

- boundary document separates semantic target selection from edge write and
  cleanup mechanics;
- graphStats/parity requirements are explicit;
- profile fields for edge insert count, endpoint validation, write time,
  cleanup row counts, and cleanup time are mapped to the responsibility;
- no semantic routing behavior changes.

### 4. Unresolved Refs Lifecycle Taxonomy And Fail-Closed Cleanup Contract

Purpose:

- make unresolved reference lifecycle explicit across Rust-owned slices,
  TypeScript fallback append, reference resolution, intentionally unresolved
  refs, and cleanup;
- prevent future cleanup migration from deleting refs that should remain
  explainable fallback evidence.

Acceptance criteria:

- lifecycle taxonomy covers created, resolved, intentionally unresolved,
  unsupported, and stale refs;
- cleanup contract is fail-closed and explains what must not be deleted;
- deterministic tests or artifact checks prove the lifecycle categories are
  visible enough for future migration;
- no broad disambiguation migration.

## Closeout Contract

This plan is complete only when a closeout artifact is written under
`docs/benchmarks/` and #165 is updated.

The closeout must include:

- final responsibility matrix;
- diagnostic contract;
- framework post-extract boundary result;
- edge write/cleanup boundary result;
- unresolved refs lifecycle result;
- links to the four issue outcomes;
- explicit deferred list for dynamic-dispatch synthesis, broad
  disambiguation, and framework migration;
- statement: `Finalization Tail Boundary Plan completed`;
- #165 state transition: implementation-sequence mode.

The closeout must not claim that #165 is complete. #165 remains the durable
post-release optimization tracker.

## Validation

Default validation:

- deterministic unit/integration tests for any fixture or contract test added;
- artifact/markdown checks where existing patterns support them;
- `git diff --check`;
- targeted profile only if required by a concrete missing diagnostic field.

Not required by default:

- full scoreboard;
- agent A/B;
- package/release smoke;
- README metric refresh;
- real-repo framework smoke unless framework behavior is changed.

RSS:

- If a targeted profile is run, record RSS or `rssUnavailableReason`.
- If no targeted profile is run, the closeout should state that RSS was not
  newly collected because the plan reused existing evidence.

## Expected Outcome

After this plan:

- the finalization tail is no longer an open-ended architecture question;
- #165 can proceed through implementation-sequence issues;
- future agents can tell which tail responsibilities are ready for
  implementation and which are explicitly deferred;
- semantic migration remains gated by parity evidence instead of convenience.

## 35. `docs/plans/2026-06-21-rust-hybrid-import-fallback-profile-samples.md`

# Rust-Hybrid Import Fallback Profile Samples

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior relative import target taxonomy plan:
  `docs/plans/2026-06-21-rust-hybrid-relative-import-target-taxonomy-and-burndown.md`
- Prior no-go closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The relative import target taxonomy slice proved that the final SQLite database
is the wrong place to sample Rust-owned import target misses. The Rust core
profile reports the gap:

- current repo `importPathAliasFallbackBySource.relative`: 9
- VS Code sparse `importPathAliasFallbackBySource.relative`: 64,191

But after TypeScript finalization cleanup, `unresolved_refs` is empty. The
taxonomy script can classify final DB rows, but there are no rows left to
classify. The next useful step is to capture privacy-safe fallback samples at
the Rust core/profile boundary before cleanup.

## Goal

Add a bounded diagnostic profile artifact that samples Rust import target
fallbacks before TypeScript finalization cleanup, then extend the taxonomy
script to classify those profile samples.

This is an evidence-quality slice. It should enable the next implementation
decision: choose one bounded relative import target burndown category, or record
a defensible no-go.

## Non-Goals

- Do not change resolver semantics.
- Do not add or remove graph edges.
- Do not change SQLite schema.
- Do not add diagnostics to `status`, `doctor`, README, or public API.
- Do not add source slices, AST text, or code bodies to artifacts.
- Do not implement query/hash stripping, path normalization, package exports,
  bundler loader semantics, asset import graph edges, dynamic/template import
  resolution, or symbol disambiguation.
- Do not run full scoreboard or agent A/B validation.
- Do not require wall-clock or RSS improvement.

## Artifact Contract

Add diagnostic fields under `rustCore` in the profile artifact. These fields are
internal benchmark diagnostics and do not promise long-term public API
stability.

Required shape:

```json
{
  "rustCore": {
    "importPathAliasFallbackSampleCounts": {
      "relative/target-not-found": 64191
    },
    "importPathAliasFallbackSamples": [
      {
        "sourceKind": "relative",
        "reason": "target-not-found",
        "referenceName": "../foo",
        "filePath": "src/bar.ts",
        "language": "typescript",
        "line": 12,
        "col": 8
      }
    ],
    "importPathAliasFallbackSampleCap": {
      "perBucket": 100,
      "total": 2000,
      "truncated": true
    }
  }
}
```

Allowed sample fields:

- `sourceKind`
- `reason`
- `referenceName`
- `filePath`
- `language`
- `line`
- `col`

Forbidden sample fields:

- source content;
- source line slice;
- AST text;
- candidate code body.

## Reason Taxonomy

The first version should classify resolver-stage reasons without doing deep
filesystem probing or reading source files.

Required reasons:

- `target-not-found`
- `file-node-not-found`
- `binding-level-symbol-disambiguation`
- `unsupported-import-form`
- `tsconfig-path-target-not-found`
- `conventional-alias-target-not-found`
- `workspace-package-target-not-found`

For relative import target fallback, the important split is:

- `target-not-found`: the resolver could not map the specifier to a file path;
- `file-node-not-found`: the resolver found a file path, but no file node exists
  in the graph.

That split tells the next slice whether the problem is likely path/extension
resolution or extraction/write/index inclusion.

## Sampling Caps

Sampling must preserve trend evidence while keeping large corpus artifacts
bounded.

Required caps:

- maximum 100 samples per `(sourceKind, reason)` bucket;
- maximum 2,000 samples total;
- full counts by `(sourceKind, reason)` must still be emitted;
- cap metadata must state whether samples were truncated.

## Taxonomy Script

Extend:

- `scripts/rust-import-target-taxonomy.mjs`

Required behavior:

- keep existing `--db` mode;
- add `--profile <path>` mode;
- in `--profile` mode, read `rustCore.importPathAliasFallbackSamples`;
- classify samples into the same taxonomy output shape as DB mode where
  possible;
- write deterministic JSON and markdown artifacts under `docs/benchmarks/`;
- if a profile has no samples, emit a clear `sampleSourceUnavailableReason`;
- do not read source files.

## Validation

Required deterministic coverage:

- Rust core/profile fixture proves fallback sample counts, samples, reasons,
  and cap metadata are emitted.
- Cap behavior is tested for both per-bucket and total limits.
- Taxonomy script fixture proves `--profile` mode classifies profile samples and
  keeps existing `--db` behavior intact.
- No test expects source content in artifacts.

Required targeted evidence:

- current-repo targeted `rust-hybrid` profile with fallback samples;
- current-repo profile taxonomy artifact;
- VS Code sparse targeted `rust-hybrid` profile with fallback samples;
- VS Code sparse profile taxonomy artifact;
- RSS or unavailable reason;
- closeout decision stating whether the next bounded burndown category can be
  selected.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. Emit Rust import fallback samples in the rustCore profile artifact.
2. Extend the relative import target taxonomy script to read profile samples.
3. Run current-repo and VS Code sparse profile taxonomy evidence.
4. Write closeout decision and update trackers.

## 36. `docs/plans/2026-06-21-rust-hybrid-parse-ast-extraction-bounded-optimization.md`

# Rust-Hybrid Parse AST Extraction Bounded Optimization

Date: 2026-06-21

## Parent

- Optimization tracker: #165
- Completed diagnostic: #224
- Plan 3 issue: #398
- Plan 2 closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- Plan 2 evidence summary:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

## Context

Plan 2 evidence identified `parseAstExtractionMs` as the dominant Rust
parse/extraction sub-bucket on both the current repo and the validated VS Code
sparse checkout:

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms |
|---|---:|---:|---|---:|
| zcodegraph | e3b9395 | 1174 | parseAstExtractionMs | 482 |
| vscode-sparse | 4a6e32fc1f0 | 23298 | parseAstExtractionMs | 9465 |

#398 is the single Plan 3 successor chosen by the #224 closeout. It must try
exactly one bounded Rust parse AST extraction optimization candidate and
conclude with either improvement evidence or a no-go reason.

## Goal

Complete #398 by trying one bounded optimization candidate in the Rust JS/TS
AST extraction walker, then record before/after evidence and update #165.

## Chosen Candidate

Reduce repeated JS/TS AST text extraction in the Rust walker, focused on:

- repeated `utf8_text()` extraction for symbol names already available in the
  same local decision;
- repeated full-node text scans for `import_statement` and `export_statement`
  binding extraction;
- small internal helper shape changes when they reduce repeated text extraction.

This candidate is deliberately narrow. It targets `parseAstExtractionMs`
without changing graph semantics.

## Decision Boundary

Allowed:

- private Rust helper shape changes inside AST extraction;
- local reuse of extracted symbol names or statement text;
- targeted contract/parity tests that prove output semantics stay stable;
- targeted before/after profile evidence for current repo;
- one VS Code sparse after-profile smoke when the existing checkout is
  available at `/private/tmp/codegraph-corpus/vscode-sparse`.

Not allowed:

- a second optimization candidate in #398;
- Tree-sitter parser optimization;
- recursive-to-iterative walker rewrite;
- resolver, finalization, SQLite, CLI, MCP, SDK, README, or release behavior
  changes;
- graph semantic changes;
- SQLite schema changes;
- full scoreboard;
- agent A/B.

## Validation

Required:

- targeted tests for graph/output parity around import/export extraction and
  symbol candidate handling;
- `cargo test --package zcodegraph-core` targeted tests for affected Rust core
  behavior;
- `npm run build` if TypeScript-facing scripts or profile tooling are touched;
- before/after current-repo targeted profile evidence;
- one VS Code sparse targeted profile smoke if
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.

RSS is not required to become available. Evidence must record either RSS or
`rssUnavailableReason`.

## Closeout Contract

#398 closes only when:

- the single candidate has been implemented or rejected as a no-go;
- before/after evidence is recorded;
- graph semantics are shown stable by tests/parity checks;
- #165 is updated with the result.

If the candidate is ineffective, #398 closes with a no-go conclusion. A future
candidate can be proposed under #165, but it must not be implemented in #398.

## Issue Sequence

1. Add graph parity and candidate contract tests for AST extraction optimization.
2. Reduce repeated JS/TS import/export text extraction in the Rust AST walker.
3. Run targeted before/after current repo and VS Code sparse profile evidence.
4. Write #398 closeout and update #165.

## 37. `docs/plans/2026-06-21-rust-hybrid-parse-extraction-evidence-decision.md`

# Rust-Hybrid Parse Extraction Evidence Decision

Date: 2026-06-21

## Parent

- Parse/extraction diagnostic issue: #224
- Optimization tracker: #165
- Plan 1 profile contract:
  `docs/plans/2026-06-21-rust-hybrid-parse-extraction-profile-contract.md`
- Plan 1 closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

## Context

Plan 1 added Rust core parse/extraction profile sub-buckets:

- `parseSourceReadMs`
- `parseNormalizationMs`
- `parseParserSetupMs`
- `parseTreeSitterMs`
- `parseAstExtractionMs`
- `parseErrorHandlingMs`
- `parseByLanguage`

#224 now needs evidence, not another optimization guess. Plan 2 uses those
fields to run targeted current-repo and VS Code sparse profile evidence, then
closes #224 with exactly one next step.

## Goal

Use `parseExtractionMs` sub-buckets to run targeted current-repo and VS Code
sparse evidence, fix targeted RSS sampling enough for those artifacts, then
close #224 with exactly one next step.

## Decision Boundary

Plan 2 is evidence-only. It must not implement a parse/extraction performance
optimization.

Allowed:

- evidence/profile tooling;
- targeted RSS sampling fixes needed for these artifacts;
- benchmark and decision artifacts;
- small diagnostic repairs if Plan 1 profile fields are unusable.

Not allowed:

- Rust parse/extraction optimization;
- graph semantic changes;
- SQLite schema changes;
- CLI, SDK, MCP, status, or doctor behavior changes;
- README metric updates;
- full scoreboard;
- agent A/B.

## RSS Boundary

RSS is required for Plan 2 artifacts, but the fix must stay narrow.

Allowed RSS work:

- make targeted CLI source-path RSS capture usable for current repo and VS Code
  sparse profile evidence;
- avoid known-bad process-list or `ps`-dependent approaches when possible;
- record `rssUnavailableReason` only after an attempted targeted fix still
  cannot capture RSS.

Not allowed RSS work:

- full cross-platform resource monitoring framework;
- daemon/runtime lifecycle changes;
- doctor/status UX changes;
- full scoreboard resource tooling.

## Evidence Scope

Required corpus scope:

- current repo targeted profile evidence;
- VS Code sparse targeted profile evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.

If VS Code sparse is unavailable, do not clone. Record a setup blocker or
unavailable reason.

Do not run Excalidraw, Gin, the README matrix, full scoreboard, or agent A/B in
this plan.

## Closeout Contract

Plan 2 must close #224.

The closeout must choose exactly one next step:

- one bounded parse/extraction optimization candidate;
- one no-go reason;
- or one narrower profiling issue.

If a bounded optimization candidate exists, create exactly one successor
implementation issue or plan under #165. That successor is Plan 3 and is not a
#224 completion blocker.

## Issue Sequence

1. Fix targeted RSS sampling for parse evidence.
2. Add parse extraction evidence summarizer.
3. Run current repo and VS Code sparse parse evidence.
4. Write #224 parse extraction decision closeout.

## 38. `docs/plans/2026-06-21-rust-hybrid-parse-extraction-profile-contract.md`

# Rust-Hybrid Parse Extraction Profile Contract

Date: 2026-06-21

## Parent

- Parse/extraction diagnostic issue: #224
- Optimization tracker: #165
- Closed architecture/performance PRD: #295

## Context

#224 remains open as the parse/extraction diagnostic lane after #295 closed.
Previous performance evidence kept a low-risk parser reuse candidate, but it did
not materially move large-corpus `rustCore.parseExtractionMs`.

The next useful step is not another parse optimization. The next useful step is
to split `parseExtractionMs` into actionable diagnostic sub-buckets so #224 can
choose one next bounded optimization candidate, record no-go, or request a
narrower profiling issue.

This plan is Plan 1 of the #224 closure path. It only defines and populates the
profile contract. Plan 2 will run current/VS Code sparse evidence and write the
#224 decision. Plan 3, if needed, will be a separate implementation issue created
from the #224 closeout.

## Goal

Expose enough Rust core parse/extraction profile detail to explain what
`parseExtractionMs` contains, without changing default indexing behavior.

## Profile Contract

Add diagnostic profile fields under the Rust core profile artifact. These fields
are profile artifact diagnostics only and do not promise long-term public API
stability.

Target sub-buckets:

- `parseSourceReadMs`
- `parseNormalizationMs`
- `parseParserSetupMs`
- `parseTreeSitterMs`
- `parseAstExtractionMs`
- `parseErrorHandlingMs`
- `parseByLanguage`

The exact names may change during implementation if the existing Rust core
structure has a more precise local vocabulary, but the final fields must still
separate:

- source/content loading or preparation;
- TypeScript/JavaScript normalization;
- parser setup or language selection;
- tree-sitter parse work;
- AST walk/extraction work;
- parse/error-gap handling;
- per-language distribution.

## Non-Goals

- Do not implement a performance optimization.
- Do not run VS Code sparse in this plan.
- Do not run a full scoreboard.
- Do not run agent A/B.
- Do not change SQLite schema.
- Do not change CLI, SDK, MCP, status, or doctor behavior except for carrying
  the existing profile artifact fields through normal profile output.
- Do not change default user-visible indexing behavior.
- Do not claim readiness, speedup, or performance improvement.
- Do not update README metrics.

## Validation

Required:

- deterministic Rust core tests for default/zero profile fields;
- deterministic result/profile JSON tests proving the new fields are emitted;
- tests or fixture smoke proving sub-buckets are populated on a reduced parse
  fixture;
- non-negative timing assertions;
- a documented relationship between `parseExtractionMs` and the sub-buckets,
  without requiring exact equality if timing overhead or nested timers make exact
  sums misleading;
- `cargo test -p zcodegraph-core`;
- targeted Vitest coverage if TypeScript profile propagation code changes;
- `npm run build`;
- `git diff --check`.

## Closure

This plan does not close #224. It enables Plan 2:

1. run targeted current repo profile evidence;
2. run VS Code sparse profile evidence if the human-provided corpus exists;
3. record RSS or unavailable reason;
4. write the #224 parse extraction evidence decision;
5. either close #224 with no-go/narrower profiling, or create one successor
   bounded optimization issue.

## Issue Sequence

1. Add Rust parseExtractionMs sub-bucket profile fields.
2. Populate parse source/normalization/parser/AST extraction timings.
3. Expose parse sub-buckets in result/profile artifacts and tests.
4. Add reduced fixture smoke for parse sub-bucket diagnostics.

## 39. `docs/plans/2026-06-21-rust-hybrid-relative-file-node-diagnostics-cleanup.md`

# Rust-Hybrid Relative File-Node Diagnostics Cleanup

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Relative JS source specifier burndown closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The relative JS source specifier burndown kept the bounded Rust resolver
fallback for explicit runtime JS specifiers:

- `.js` -> TypeScript / TSX / module source candidates when the literal JS
  target is absent;
- literal JS targets still win;
- alias, workspace, package, asset, dynamic import, and symbol-level behavior
  were intentionally unchanged.

That slice removed the large code-target `relative/target-not-found` gap, but
left a smaller `relative/file-node-not-found` bucket:

- current repo: 1 sampled residual, `../package.json`;
- VS Code sparse checkout: sampled residuals are dominated by `.css` imports.

This residual is diagnostically different from a missing source-code target.
It usually means Rust found a path-like target, but the graph does not contain a
code file node for it. For `.css` and many `.json` targets, that is expected:
they are real project inputs, but not JS/TS code graph targets in this phase.

## Goal

Make Rust-hybrid import fallback diagnostics explain non-code relative targets
at the profile source, then make the taxonomy artifact classify them by
actionability.

The goal is a cleaner decision signal:

- code-target resolver gaps remain visible;
- non-code asset/config targets are explainable;
- no graph edge is created for `.css`, `.json`, or other non-code imports;
- default user behavior remains unchanged.

## Non-Goals

- Do not resolve `.css`, `.json`, `.jsonc`, `.wasm`, `.svg`, or other non-code
  targets into graph edges.
- Do not change Rust import resolution results.
- Do not change alias, tsconfig path, workspace package, package import, or
  dynamic import behavior.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement.
- Do not require RSS availability.

## Diagnostics Contract

Keep the existing fallback `reason` values compatible. In particular, do not
rename `file-node-not-found` in this slice.

For fallback samples where Rust has enough information to describe the target,
add privacy-safe factual metadata:

- `targetExtension`: extension such as `.css`, `.json`, `.ts`, or `.tsx`;
- `targetKind`: an actionability-oriented kind such as:
  - `asset` for stylesheet/image/font/wasm-like imports;
  - `config` for JSON/YAML/TOML-like imports;
  - `source` for supported source-code extensions;
  - `unknown` when the target cannot be classified confidently.

These fields are diagnostic metadata only. They do not imply a stable public API
and do not authorize writing a graph edge.

## Taxonomy Contract

Update the import target taxonomy diagnostic so profile-mode classification can
prefer the new factual metadata when present.

Required categories:

- `nonCodeAssetTarget`
- `nonCodeConfigTarget`
- existing source-related categories such as `supportedSourceSpecifier`
- existing fallback categories for unknown, unsupported, extensionless, query,
  hash, and suspicious paths where applicable

The classification should answer: "is this a resolver blocker, a non-code
target we should leave out of the graph, or a candidate for a later feature?"

## Validation

Required deterministic tests:

- Rust profile samples preserve the existing `reason: file-node-not-found`.
- Rust profile samples include `targetKind` / `targetExtension` for non-code
  relative targets where possible.
- Profile samples remain source-content-free.
- The taxonomy script classifies profile samples with new metadata as
  `nonCodeAssetTarget` / `nonCodeConfigTarget`.
- Existing taxonomy behavior still works when metadata is absent.

Required evidence:

- Rerun current repo targeted profile/taxonomy evidence.
- Rerun VS Code sparse targeted profile/taxonomy evidence.
- Evidence sidecars must record wall time and RSS or `rssUnavailableReason`.
- Closeout must compare the residual `relative/file-node-not-found` bucket
  before and after and state whether it is a resolver blocker, a diagnostics
  known-boundary, or a follow-up feature candidate.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. #359 Add Rust profile target metadata for `file-node-not-found` fallback
   samples.
2. #360 Classify non-code target fallback samples in the import target
   taxonomy.
3. #361 Rerun current repo and VS Code sparse fallback diagnostics evidence.
4. #362 Close out relative `file-node-not-found` diagnostics cleanup.

## 40. `docs/plans/2026-06-21-rust-hybrid-relative-import-target-taxonomy-and-burndown.md`

# Rust-Hybrid Relative Import Target Taxonomy and Burndown

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior JS/TS file import target parity plan:
  `docs/plans/2026-06-20-rust-hybrid-js-ts-file-import-target-parity.md`
- Prior closeout:
  `docs/benchmarks/2026-06-20-rust-hybrid-js-ts-file-import-target-parity-closeout-decision.md`

## Context

The JS/TS file import target parity slice added Rust-owned support for
conventional aliases and workspace package subpaths, but the VS Code sparse
closeout showed that corpus did not exercise those paths. The large remaining
file-target gap is now more specifically attributable to relative import target
misses:

- `unresolved-file-level-import-target`: 64,429
- `importPathAliasFallbackBySource.relative`: 64,191

Before adding another resolver expansion, we need to know what these relative
misses actually are. Some may be low-risk code-target gaps in the Rust resolver.
Others may be asset imports, bundler semantics, sparse-checkout missing files,
dynamic imports, package semantics, or intentionally unsupported forms.

## Goal

Create a data-driven taxonomy of JS/TS relative unresolved import targets, then
attempt exactly one bounded burndown if the taxonomy identifies a low-risk
code-target category.

This is a feature-completeness and resolver-migration readiness slice, not a
performance optimization slice. The expected output is trustworthy evidence:
either a keepable narrow fix with before/after movement, or a clear no-go that
prevents speculative resolver expansion.

## Non-Goals

- Do not implement package `exports`, `main`, conditional exports, or npm
  package resolution.
- Do not resolve `.css`, `.json`, `.wasm`, `.svg`, or other non-code asset
  imports into graph nodes.
- Do not model bundler loader semantics.
- Do not treat sparse-checkout missing files as resolver bugs.
- Do not implement dynamic or template import resolution.
- Do not change binding-level symbol disambiguation.
- Do not change SQLite schema.
- Do not add taxonomy output to `status`, `doctor`, README, or public API.
- Do not run full scoreboard or agent A/B validation.
- Do not require wall-clock performance improvement as a success gate.

## Taxonomy Script

Add an internal benchmark/diagnostic script:

- `scripts/rust-import-target-taxonomy.mjs`

The script should:

- read a built `.zcodegraph/zcodegraph.db` or an explicit DB path;
- inspect only database metadata from `unresolved_refs`;
- filter JS/TS import unresolved references whose `reference_name` starts with
  `./` or `../`;
- output deterministic JSON and markdown artifacts under `docs/benchmarks/`;
- include enough grouping to choose a bounded code-target burndown or record a
  no-go.

Allowed input fields:

- `unresolved_refs.reference_name`
- `unresolved_refs.file_path`
- `unresolved_refs.language`
- `unresolved_refs.line`
- `unresolved_refs.col`

The script must not read source files. It may use path metadata and existing DB
metadata only.

## Candidate Categories

The taxonomy should separate at least these cases when possible from metadata:

- supported source extension candidate missing;
- extensionless relative path that likely maps to a supported source file;
- directory or `index` candidate shape;
- query/hash suffix such as `./x?raw` or `./x#fragment`;
- declaration-only or `.d.ts` target shape;
- asset-like target extension;
- unsupported extension;
- suspicious path normalization shape;
- dynamic/template/non-literal-like import name if present in DB;
- sparse-checkout or target-missing-likely bucket;
- unknown.

This taxonomy is intentionally approximate. It should be good enough to choose a
bounded next move, not to certify semantic correctness.

## Bounded Burndown Rules

Only implement a fix if the taxonomy identifies a low-risk code-target class.
Allowed classes:

- supported source extension candidate missing;
- path normalization bug;
- query/hash suffix stripping where the stripped target is a supported source
  file;
- `.d.ts` or declaration-only target if clear and already represented.

Disallowed classes:

- asset imports;
- bundler loader semantics;
- package `exports` / `main`;
- sparse-checkout missing files;
- dynamic/template imports;
- symbol-level disambiguation;
- any behavior that would add non-code asset imports to the graph.

If no allowed class is clearly worth attempting, the implementation issue should
close with a no-go decision and no production behavior change.

## Validation

Required deterministic coverage:

- taxonomy script output is stable for a small fixture database;
- selected bounded fix, if any, has a targeted integration test;
- no asset import target is added as a graph edge;
- existing relative import and tsconfig/jsconfig paths behavior remains intact.

Required targeted evidence:

- existing VS Code sparse DB taxonomy artifact before implementation;
- selected category decision or no-go note;
- current-repo targeted profile/smoke after the bounded attempt;
- VS Code sparse targeted profile after the bounded attempt;
- RSS or unavailable reason;
- closeout decision comparing fallback taxonomy and relative import target
  taxonomy before/after.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

Performance numbers are evidence, not a gate. The success gate is whether the
taxonomy and bounded attempt produce a defensible trend/no-go conclusion.

## Issue Sequence

1. Add the relative import target taxonomy script.
2. Run VS Code sparse taxonomy and choose one bounded category.
3. Implement one bounded relative import target burndown, or record no-go.
4. Run closeout evidence for relative import target taxonomy and burndown.

## 41. `docs/plans/2026-06-21-rust-hybrid-relative-js-source-specifier-burndown.md`

# Rust-Hybrid Relative JS Source Specifier Burndown

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Import fallback profile samples plan:
  `docs/plans/2026-06-21-rust-hybrid-import-fallback-profile-samples.md`
- Import fallback profile samples closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The import fallback profile samples slice proved that the large relative import
target gap is now explainable before TypeScript finalization cleanup.

VS Code sparse evidence:

- `relative/target-not-found`: 63,882
- `relative/file-node-not-found`: 309
- sampled relative taxonomy:
  - `supportedSourceSpecifier`: 100
  - `assetLikeTarget`: 100

Current repo evidence:

- `relative/target-not-found`: 8
- `relative/file-node-not-found`: 1
- sampled relative taxonomy:
  - `supportedSourceSpecifier`: 8
  - `assetLikeTarget`: 1

Both corpora show TypeScript files importing relative `.js` source specifiers,
for example:

- `./dom.js`
- `../common/observable.js`
- `../../src/index.js`
- `./types.js`

Rust currently treats an explicit `.js` extension literally. If `foo.js` does
not exist, it does not try `foo.ts` / `foo.tsx` / other source candidates.

## Goal

Implement a bounded Rust resolver burndown for relative `.js` source specifiers
from JS/TS files.

This should reduce code-target `relative/target-not-found` misses where a TS/JS
source file exists under the same basename, while preserving literal JS import
semantics and keeping asset imports out of the graph.

## Non-Goals

- Do not change alias, tsconfig path, conventional alias, workspace package, or
  package import behavior.
- Do not implement package `exports`, `main`, conditional exports, or npm
  package resolution.
- Do not model bundler loader semantics.
- Do not resolve `.css`, `.json`, `.wasm`, `.svg`, or other non-code asset
  imports into graph edges.
- Do not handle dynamic/template imports.
- Do not change binding-level symbol disambiguation.
- Do not change SQLite schema.
- Do not change `status`, `doctor`, README, or public API.
- Do not require wall-clock or RSS improvement.

## Resolver Behavior

Behavior change is limited to relative imports.

Rules:

1. Resolve literal paths first.
2. If the relative specifier explicitly ends in `.js`, `.mjs`, or `.cjs` and
   the literal target does not exist, try source-file candidates with the same
   basename.
3. Continue to require existing file-node validation before writing an edge.
4. Do not apply this fallback to alias/workspace/package imports.
5. Do not apply this fallback to asset or non-code extensions.

Candidate order:

- `.js` specifier:
  - literal `.js`
  - `.ts`
  - `.tsx`
  - `.mts`
  - `.cts`
  - `.jsx`
- `.mjs` specifier:
  - literal `.mjs`
  - `.mts`
  - `.ts`
  - `.tsx`
  - `.js`
- `.cjs` specifier:
  - literal `.cjs`
  - `.cts`
  - `.ts`
  - `.tsx`
  - `.js`

Literal target existence must win. If both `foo.js` and `foo.ts` exist,
`./foo.js` resolves to `foo.js`.

Implementation may use a shared helper for source-candidate generation, but only
the relative import path should opt into this behavior in this slice.

## Validation

Required deterministic coverage:

- `./target.js` resolves to `target.ts` when literal `target.js` is absent.
- `./target.js` resolves to literal `target.js` when that file exists, even if
  `target.ts` also exists.
- `.mjs` and `.cjs` source fallback order is covered.
- Asset imports such as `./style.css` remain unresolved and do not create graph
  edges.
- Alias/workspace/package behavior is unchanged.

Required evidence:

- Current repo before/after profile taxonomy evidence.
- VS Code sparse before/after profile taxonomy evidence.
- Evidence runs use `scripts/targeted-profile-evidence.mjs` so wall-clock and
  RSS/`rssUnavailableReason` are recorded in sidecar JSON.
- Closeout compares:
  - `relative/target-not-found`
  - `relative/file-node-not-found`
  - `importPathAliasFallbackBySource.relative`
  - `importPathAliasResolvedBySource.relative`
  - taxonomy `supportedSourceSpecifier`
  - taxonomy `assetLikeTarget`

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

Performance numbers are evidence only. A keep/no-go decision should be based on
semantic correctness and fallback movement, not speed.

## Issue Sequence

1. Implement relative `.js` source fallback in the Rust resolver.
2. Run current repo before/after taxonomy evidence.
3. Run VS Code sparse before/after taxonomy evidence.
4. Write closeout decision and update trackers.

## 42. `docs/plans/2026-06-21-rust-hybrid-ts-implementation-declaration-metadata.md`

# Rust-Hybrid TypeScript Implementation-Declaration Metadata

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- TypeScript overload/signature semantic decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- TypeScript overload/signature closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The TypeScript overload/signature semantic decision concluded that
candidate-multiple resolver behavior must not use source order, pick-first, or
line-range heuristics as a production tie-break. Runtime/value ESM named import
edges may target a TypeScript function implementation declaration only when
exactly one clear implementation declaration exists.

Current VS Code sparse artifacts show `function-overload-signature` is the
dominant sampled candidate-multiple subtype, but the profile/taxonomy candidate
metadata only records candidate kind and line ranges. It cannot reliably tell
which function candidate is an overload signature and which one is the runtime
implementation declaration.

## Goal

Add implementation-declaration metadata to Rust TypeScript overload/signature
diagnostics so the next resolver slice can safely decide whether a bounded
candidate-multiple tie-break is possible.

This plan is a metadata/evidence slice only. It does not change resolver
behavior.

## Decisions

- Add public diagnostic candidate metadata, not database schema.
- Do not persist `hasBody` or `declarationForm` in `nodes`.
- Do not encode implementation metadata into `signature`, `docstring`,
  decorators, or other user-facing node fields.
- Allow bounded diagnostic inference from target file content plus candidate
  line/range metadata.
- Diagnostic inference may read target files, but artifacts must not record
  source snippets or source lines.
- Every enriched candidate must state its metadata source.
- Production resolver behavior must not consume uncertain inference in this
  plan.

## Target Metadata Shape

Candidate diagnostics should be able to expose:

```json
{
  "kind": "function",
  "startLine": 12,
  "endLine": 18,
  "hasBody": true,
  "declarationForm": "implementation",
  "metadataSource": "target-file-line-range-inference"
}
```

Allowed `declarationForm` values:

- `implementation`
- `signature`
- `unknown`

Allowed `metadataSource` values for this plan:

- `rust-ast`
- `target-file-line-range-inference`
- `unavailable`

## Non-Goals

- Do not change resolver routing.
- Do not add a candidate-multiple tie-break.
- Do not change SQLite schema.
- Do not add database migrations.
- Do not expose source snippets, source lines, or inferred source text in
  artifacts.
- Do not implement type/value/namespace collision resolution.
- Do not claim performance improvement.
- Do not run agent A/B.

## Validation

Required:

- deterministic Rust TypeScript fixture proving implementation/signature
  classification;
- deterministic diagnostic artifact test proving candidate metadata fields are
  emitted without source text;
- current repo taxonomy/decision evidence;
- VS Code sparse taxonomy/decision evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` is available and is a Git
  checkout;
- tracker updates for #295, #296, and #165.

## Issue Sequence

1. Add Rust TypeScript implementation-declaration fixture coverage.
2. Enrich candidate-multiple diagnostic metadata with declaration form.
3. Write current repo and VS Code sparse implementation-declaration evidence
   closeout.

## 43. `docs/plans/2026-06-21-rust-hybrid-ts-overload-implementation-tie-break.md`

# Rust-Hybrid TypeScript Overload Implementation Tie-Break

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Implementation-declaration metadata closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

Rust ESM named import/export diagnostics can now expose TypeScript
implementation-declaration metadata for candidate-multiple samples:

- `hasBody`
- `declarationForm`
- `metadataSource`

The VS Code sparse evidence at commit `4a6e32fc1f0` showed that the dominant
sampled candidate-multiple subtype remains `function-overload-signature`, and
that a bounded subset has exactly one implementation marker. The previous
closeout therefore recommends a guarded production resolver tie-break.

## Goal

Resolve TypeScript overload/signature candidate-multiple cases in the Rust ESM
named import/export path when exactly one safe implementation declaration can
be selected.

This is a narrow production behavior slice. It should reduce candidate-multiple
fallbacks only for the guarded overload/signature subset.

## Decision

Default-on production routing is allowed only when all guard conditions hold:

- resolved target file is not a declaration file (`.d.ts`, `.d.mts`,
  `.d.cts`);
- all candidates are in the same resolved target file;
- all candidates are `function` candidates;
- candidate metadata can identify implementation declarations;
- exactly one candidate has `hasBody=true` or
  `declarationForm=implementation`;
- every non-selected candidate is not an implementation declaration.

When selected, the import edge and imported usage edges should target the
implementation candidate.

Edge metadata must use:

```json
{
  "resolvedBy": "rust-esm-named-import-export-overload-implementation"
}
```

## Profile Counter

Add a narrow resolved-ref counter:

- `esmNamedImportExportOverloadImplementationResolvedRefs`

It counts the same way as `esmNamedImportExportResolvedRefs`: import refs and
imported usage refs resolved through this guarded tie-break both count.

## Non-Goals

- Do not change SQLite schema.
- Do not resolve ambient-only overload sets.
- Do not resolve `.d.ts`, `.d.mts`, or `.d.cts` overload sets.
- Do not resolve no-implementation overload sets.
- Do not resolve type/value/namespace collisions.
- Do not change one-hop re-export behavior.
- Do not implement default imports, namespace imports, package/runtime imports,
  or multi-hop barrel chains.
- Do not run agent A/B.
- Do not do multi-run performance benchmarking.

## Validation

Required:

- deterministic fixtures for direct export overload implementation resolution;
- deterministic fixtures for same-file export specifier overload implementation
  resolution;
- deterministic fixture proving imported usage edges target the same
  implementation candidate;
- deterministic no-go fixtures proving ambient-only, declaration-file,
  no-implementation, type/value collision, and unknown metadata cases keep
  fallback;
- profile artifact coverage for
  `esmNamedImportExportOverloadImplementationResolvedRefs`;
- current repo deterministic profile/taxonomy evidence;
- one VS Code sparse deterministic profile/taxonomy evidence run when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- closeout update for #295, #296, and #165.

## Issue Sequence

1. Add guarded overload implementation resolver fixtures.
2. Implement bounded overload implementation tie-break.
3. Update taxonomy/decision tooling for overload implementation resolved
   evidence.
4. Run current and VS Code sparse evidence closeout.

## 44. `docs/plans/2026-06-21-rust-hybrid-ts-overload-signature-semantic-decision.md`

# Rust-Hybrid TypeScript Overload/Signature Semantic Decision

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Direct export candidate-multiple taxonomy:
  `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-multiple-taxonomy.md`
- Direct export candidate-multiple closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Parallel tooling follow-up: #375

## Context

The direct export candidate-multiple taxonomy classified capped VS Code sparse
samples and found that `function-overload-signature` dominates the sampled
candidate-multiple surface:

- `function-overload-signature`: 85/100
- `type-value-namespace-collision`: 13/100
- `ambient-declaration-merge`: 2/100

The closeout explicitly rejected a broad source-order or pick-first tie-break.
Before routing any candidate-multiple case into the Rust resolver main path, we
need a semantic decision for TypeScript overload/signature sets.

## Goal

Decide the graph semantics for TypeScript overload/signature candidate-multiple
cases.

The default proposed semantic is:

- runtime/value named import edges should point to the implementation
  declaration when one clear implementation declaration exists;
- imported usage edges should also point to that implementation declaration;
- overload signatures without an implementation body should not be selected as
  runtime implementation targets.

This plan does not implement that behavior. It records the decision boundary
and determines whether existing metadata is sufficient for a future
implementation slice.

## Non-Goals

- Do not change resolver behavior.
- Do not add a candidate-multiple tie-break.
- Do not change extractor behavior.
- Do not add database schema fields.
- Do not read source file contents.
- Do not implement type/value namespace collision resolution.
- Do not implement default, namespace, package/runtime, type-only, or multi-hop
  re-export semantics.
- Do not run a new full VS Code sparse index.
- Do not claim performance improvement.

## Scope

### Semantic decision

Decide and document:

- import edge target semantics for overload/signature sets;
- imported usage edge target semantics for overload/signature sets;
- the safe tie-break prerequisites for implementation declaration selection;
- no-go behavior for ambient-only, `.d.ts`, and no-implementation overload
  sets;
- whether current candidate metadata is enough to distinguish implementation
  declarations from signatures.

### Evidence

Use existing artifacts from the candidate-multiple taxonomy:

- VS Code sparse profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- VS Code sparse candidate-multiple taxonomy:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- VS Code sparse DB:
  `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`

VS Code sparse commit:

- `4a6e32fc1f0`

No new full index is required unless artifacts are missing or inconsistent. If
artifacts are missing, mark the issue as needing prerequisite evidence rather
than cloning or rerunning a large corpus automatically.

### #375 relationship

#375 tracks improving RSS sampling without `ps` process-list access. It is a
parallel tooling follow-up and does not block this semantic decision. Current
evidence may continue to record `rssUnavailableReason`.

## Validation

Required:

- fixture or artifact-level tests that encode the semantic decision for:
  - overload signatures plus one implementation declaration;
  - ambient-only / no implementation overload set;
  - `.d.ts` overload set;
  - type/value namespace collision as no-go.
- decision artifact that states whether existing metadata can support the
  future implementation.
- tracker updates for #295, #296, and #165.

## Issue Sequence

1. #376 Add overload/signature semantic decision fixtures.
2. #377 Write VS Code sparse sampled overload/signature decision artifact.
3. #378 Close out overload/signature semantic decision and tracker updates.

## 45. `docs/plans/2026-06-21-rust-hybrid-ts-type-value-namespace-collision-semantic-decision.md`

# Rust-Hybrid Type/Value/Namespace Collision Semantic Decision

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Previous closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The guarded TypeScript overload implementation tie-break is now implemented and
validated with deterministic current-repo and VS Code sparse evidence. That
slice resolved 3766 overload implementation refs on the VS Code sparse checkout
at commit `4a6e32fc1f0`.

After that route, the remaining capped candidate-multiple fallback sample shape
is dominated by `type-value-namespace-collision`:

- `type-value-namespace-collision`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2

The current taxonomy treats `type-value-namespace-collision` as one no-go class.
That is too coarse for the next resolver migration decision. Some cases may be
service-token-style runtime values paired with interfaces, while others may be
true TypeScript type/value/namespace ambiguity that should keep fallback.

## Goal

Classify TypeScript type/value/namespace collision candidate-multiple fallbacks
with bounded syntax metadata and deterministic corpus evidence, then decide
whether a safe next production routing slice exists.

This is a semantic decision and evidence slice. It must not change production
resolver behavior.

## Decision Frame

The evidence should classify collision samples into the smallest set of
decision-useful subtypes:

- `value-token-plus-interface`
- `class-plus-interface`
- `enum-or-namespace-plus-type`
- `type-alias-plus-value`
- `unknown-collision`

The decision artifact should use a three-state recommendation per relevant
subtype:

- `candidate-for-next-routing-slice`
- `needs-more-metadata`
- `no-go-keep-fallback`

`value-token-plus-interface` is a probable next production-routing candidate,
but this plan must not pre-decide that outcome. The corpus evidence should
decide whether it is safe enough to plan the next implementation slice.

## Source Metadata Boundary

The taxonomy tooling may read local corpus source files only to collect bounded
syntax metadata. Evidence artifacts must not include source snippets or source
lines.

Allowed source-derived metadata includes:

- import form:
  - `import-type`
  - `named-value-import`
  - `mixed-import`
  - `export-specifier`
  - `unknown`
- usage/context hint:
  - `decorator-token`
  - `constructor-parameter`
  - `runtime-expression`
  - `type-position`
  - `unknown`
- candidate shape:
  - `constant-interface`
  - `class-interface`
  - `enum-type`
  - `type-alias-value`
  - `other`

Artifacts may include sanitized paths, language, extension, line/column,
candidate kinds, counts, hashes if useful, and taxonomy labels. They must not
include source text.

## Non-Goals

- Do not change production resolver behavior.
- Do not add a production routing tie-break.
- Do not change SQLite schema.
- Do not change CLI, SDK, MCP, status, or doctor behavior.
- Do not update README metrics.
- Do not run agent A/B.
- Do not run multi-run performance benchmarking.
- Do not build a complete TypeScript symbol-space model.
- Do not resolve default imports, namespace imports, package imports, one-hop
  re-export, or multi-hop barrel chains.
- Do not automatically clone the VS Code sparse corpus.

## Validation

Required:

- deterministic fixtures for collision subtype classification;
- deterministic no-change coverage proving current resolver behavior keeps
  collision cases on fallback;
- taxonomy tooling that emits subtype counts and bounded syntax metadata without
  source snippets;
- current repo profile/taxonomy/decision evidence;
- VS Code sparse profile/taxonomy/decision evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- if VS Code sparse is unavailable, record a setup blocker rather than cloning;
- final closeout that decides whether any subtype is a safe next production
  routing candidate;
- tracker updates for #295, #296, and #165.

Expected VS Code sparse corpus:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Previously verified commit: `4a6e32fc1f0`

## Issue Sequence

1. Add type/value/namespace collision semantic fixtures.
2. Extend candidate-multiple taxonomy with collision subtypes.
3. Generate current repo and VS Code sparse collision evidence.
4. Write collision semantic decision closeout.

## 46. `docs/plans/2026-06-21-rust-hybrid-value-token-interface-routing.md`

# Rust-Hybrid Value Token Interface Routing

Date: 2026-06-21

## Parent

- Optimization tracker: #165
- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- Semantic predecessor:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Context

The architecture/performance PRD is complete, but #165 remains open as the
durable post-release optimization tracker. The next main-path work is the first
resolver semantic successor plan.

The predecessor semantic closeout identified `value-token-plus-interface` as a
plausible production routing candidate outside #295. VS Code sparse evidence at
commit `4a6e32fc1f0` found the capped `type-value-namespace-collision` samples
were dominated by this subtype:

| Subtype | Count |
|---|---:|
| value-token-plus-interface | 81 |
| function-overload-signature | 17 |
| ambient-declaration-merge | 2 |

For the 81 `value-token-plus-interface` samples:

- import form: `named-value-import` = 81;
- candidate shape: `constant-interface` = 81;
- usage/context hints: `decorator-token` = 63, `type-position` = 7,
  `unknown` = 11.

## Goal

Attempt one fail-closed production routing slice for
`value-token-plus-interface`, then record keep/no-go evidence and update #165.

This plan is not a broad collision-routing plan. It exists to decide whether
the dominant semantic fallback subtype can safely become production routing.

## Chosen Candidate

Route only the guarded service-token-style shape:

- subtype is explicitly classified as `value-token-plus-interface`;
- candidate shape is exactly `constant-interface`;
- import form is `named-value-import`;
- target candidates are in the same resolved target file;
- runtime/value edges target the value token candidate, not the interface;
- type-only imports keep fallback;
- default imports keep fallback;
- namespace imports keep fallback;
- package imports keep fallback;
- one-hop re-export and multi-hop barrel chains keep fallback;
- unknown context keeps fallback until usage metadata is sufficient.

## Decision Boundary

Allowed:

- deterministic fixtures for the narrow subtype;
- taxonomy/diagnostic improvements needed to prove the subtype is recognized;
- fail-closed production routing for the exact guarded shape;
- current repo and VS Code sparse targeted taxonomy/profile evidence;
- graphStats, fallback taxonomy, RSS or `rssUnavailableReason` artifacts;
- closeout with keep/no-go conclusion.

Not allowed:

- broader `type-value-namespace-collision` routing;
- `function-overload-signature` routing;
- `ambient-declaration-merge` routing;
- default import, namespace import, type-only import, package import, re-export,
  or barrel-chain expansion;
- every-reference disambiguation semantic shortcuts;
- TypeScript finalization architecture changes;
- parse/extraction optimization;
- SQLite schema changes;
- CLI, SDK, MCP, status, doctor, README, or release behavior changes;
- full scoreboard;
- agent A/B by default.

## Validation

Required:

- deterministic fixture coverage for `value-token-plus-interface`;
- graph-visible assertions proving runtime/value edges target the value token
  candidate and type-only or unknown cases keep fallback;
- fallback taxonomy evidence before/after;
- graphStats or equivalent graph parity evidence;
- current repo targeted evidence;
- VS Code sparse targeted evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- RSS recorded or explicit `rssUnavailableReason`.

Agent A/B is not required unless the closeout makes an agent sufficiency or
user-facing retrieval claim.

## Closeout Contract

The plan closes with exactly one conclusion:

- `keep`: the guarded routing reduces the target fallback subtype and graph
  semantics stay stable;
- `no-go`: the routing is unsafe, too noisy, or does not materially improve the
  target fallback subtype.

The closeout must update #165 and then hand off to the second main-path plan:
the TypeScript finalization/reference-resolution tail boundary plan.

## Issue Sequence

1. Add deterministic fixtures for value-token-plus-interface routing.
2. Implement fail-closed value-token-plus-interface routing.
3. Run current repo and VS Code sparse routing taxonomy evidence.
4. Write routing closeout and update #165.

## 47. `docs/plans/2026-06-22-rust-hybrid-finalization-tail-implementation-sequence.md`

# Rust-Hybrid Finalization Tail Implementation Sequence

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Consolidated decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- Finalization tail boundary closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Ownership matrix:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Edge write and cleanup boundary:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Unresolved refs lifecycle contract:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

## Route Map

The post-decision route has three plans:

1. **Plan A: Finalization Tail Implementation Sequence**
   - Mainline.
   - Pick one bounded finalization-tail mechanics candidate.
   - Preserve semantic target selection.
   - Require graph parity, fallback taxonomy, profile evidence, and fail-closed
     behavior.

2. **Plan B: Resolver Semantic Residuals**
   - Triggered after Plan A closeout.
   - Continue guarded semantic slices within the finalization-tail boundary.
   - Must not broaden into pick-first/source-order tie-breaks or broad
     disambiguation migration.

3. **Plan C: Parse/Extraction Follow-Up**
   - Evidence-gated.
   - Triggered only when fresh profile evidence shows parse/extraction is again
     the best system-level bet.
   - Must keep expensive diagnostics default-off.

This document fully specifies Plan A. Plans B and C are intentionally not
expanded into issue sequences yet because their details depend on Plan A
closeout.

## Goal

Start the finalization-tail implementation sequence with one bounded mechanics
candidate.

Completion means:

- a concrete candidate is selected from the completed tail boundary map;
- the candidate does not alter semantic target selection or every-reference
  disambiguation behavior;
- implementation evidence includes deterministic parity tests, targeted current
  repository evidence, and VS Code sparse evidence when available;
- closeout records `keep`, `no-go`, or `needs-architecture`;
- #165 is updated with the result and the next-route decision.

## Candidate Class

Plan A is mechanics-first.

Allowed candidate classes:

- edge materialization;
- endpoint validation mechanics;
- edge write batching or attribution;
- resolved unresolved-ref cleanup;
- intentionally unresolved cleanup mechanics;
- metadata preservation around write/cleanup mechanics.

Disallowed candidate classes:

- semantic target selection;
- broad reference disambiguation;
- source-order or pick-first routing;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- SQLite schema changes;
- package/release workflow changes.

The exact candidate is selected by issue 1 using the boundary map and baseline
evidence. Plan A must choose exactly one candidate.

## Hard Guardrails

1. No open-ended benchmarking.
   Each issue must name the candidate, success standard, and no-go condition.

2. No semantic shortcut for speed.
   The selected candidate must not change whether a reference resolves, which
   target node id is chosen, edge kind semantics, confidence semantics, or
   resolved-by semantics.

3. Diagnostics must not tax the default path.
   Any new diagnostic field must either reuse existing profile fields or be
   default-off with explicit evidence-tooling activation.

4. Graph parity is required for keep.
   Evidence must include graphStats, edge count by kind/origin where relevant,
   fallback taxonomy, and endpoint validation or unavailable reason.

5. Cleanup must fail closed.
   Unknown lifecycle state must preserve existing TypeScript behavior or keep
   fallback evidence rather than deleting unresolved refs speculatively.

## Success States

`keep`:

- graph parity and fallback taxonomy are preserved;
- the candidate improves the targeted tail sub-bucket or clearly simplifies the
  boundary without adding semantic risk;
- rollback/fail-closed behavior is explainable.

`no-go`:

- the candidate is safe but does not produce a credible trend or simplification;
- complexity exceeds the benefit;
- profile attribution shows the selected mechanism is not meaningful.

`needs-architecture`:

- implementation requires schema changes;
- implementation requires target selection changes;
- implementation requires framework ordering changes;
- implementation exposes a missing protocol or diagnostic contract that cannot
  be safely patched inside the issue.

## Validation

Required:

- deterministic parity tests for the changed mechanics surface;
- targeted current repository profile/evidence;
- targeted VS Code sparse profile/evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- graphStats or graph-visible parity summary;
- fallback taxonomy summary;
- relevant tail sub-buckets;
- RSS or unavailable reason;
- `git diff --check`.

VS Code sparse validation must not clone automatically. If the checkout is
unavailable or not a Git checkout, the evidence issue records human setup
needed.

Not required by default:

- full scoreboard;
- agent A/B;
- README metric update;
- release/npm/package smoke;
- multi-run benchmark proof.

## Issue Sequence

### 1. Candidate Selection And Baseline

Purpose:

- select one bounded finalization-tail mechanics candidate from the boundary
  map;
- record baseline profile/parity requirements before implementation;
- state keep/no-go/needs-architecture gates.

Acceptance criteria:

- candidate is selected from allowed mechanics classes only;
- semantic target selection remains out of scope;
- baseline identifies the relevant profile sub-buckets and graph parity checks;
- closeout for this issue names the candidate and why it is the first Plan A
  bet.

### 2. Implement One Bounded Tail Mechanism

Purpose:

- implement the selected mechanics candidate;
- preserve target ids, edge kind semantics, confidence/resolved-by semantics,
  and fallback taxonomy;
- provide fail-closed behavior.

Acceptance criteria:

- exactly one candidate is implemented;
- deterministic parity tests cover the changed mechanics surface;
- unsupported or unknown lifecycle states preserve fallback evidence;
- implementation does not change schema, framework post-extract ordering, or
  dynamic-dispatch synthesis.

### 3. Targeted Evidence

Purpose:

- measure the implemented candidate on current repository and VS Code sparse;
- record graph parity, fallback taxonomy, profile movement, and RSS or
  unavailable reason.

Acceptance criteria:

- current repository evidence is recorded;
- VS Code sparse evidence is recorded when the checkout is available;
- unavailable VS Code sparse setup is documented instead of auto-cloning;
- evidence includes graphStats or graph-visible parity, fallback taxonomy,
  relevant tail sub-buckets, and RSS or unavailable reason;
- no full scoreboard or agent A/B is run by default.

### 4. Plan A Closeout And Next-Route Decision

Purpose:

- decide `keep`, `no-go`, or `needs-architecture`;
- update #165;
- decide whether Plan B starts immediately or whether Plan A exposed an
  architecture prerequisite.

Acceptance criteria:

- closeout artifact exists under `docs/benchmarks/`;
- closeout links plan, issues, candidate, evidence, validation, and decision;
- #165 receives a summary comment;
- closeout states whether the next step is Plan B, another bounded Plan A
  mechanics candidate, or architecture escalation;
- no Plan B/C issues are created by default inside this closeout.

## Closeout Contract

Plan A is complete only when:

- the closeout artifact exists;
- the selected candidate has a three-state decision;
- #165 is updated;
- the next-route decision is explicit.

If the decision is `keep`, the default next route is Plan B unless the closeout
shows that another mechanics candidate is the highest-confidence follow-up.

If the decision is `no-go`, do not automatically try a second candidate. The
closeout must explain whether Plan B should still start or whether a different
Plan A mechanics candidate deserves a new plan.

If the decision is `needs-architecture`, stop implementation sequencing and
write the missing architecture/protocol decision before proceeding.

## 48. `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part1.md`

# Rust-Hybrid Import/File-Level Resolver Completion Plan Part 1

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- PlanB final closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- FileNodes handoff:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Prior file/import target plans:
  - `docs/plans/2026-06-20-rust-hybrid-js-ts-file-import-target-parity.md`
  - `docs/plans/2026-06-21-rust-hybrid-relative-import-target-taxonomy-and-burndown.md`
  - `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-gap-burndown.md`
  - `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-multiple-taxonomy.md`

## Route

This is **Import/File-Level Resolver Completion Plan Part 1**.

The full Import/File-Level Resolver Completion route has two parts:

1. **Part 1: Repo-local source import/file resolver completion**
   - relative imports;
   - tsconfig/jsconfig paths aliases;
   - same-file export specifiers;
   - direct named import/export binding;
   - one-hop direct re-export/barrel behavior;
   - FileNodes/source-file fallback interactions;
   - repo-local fallback taxonomy and burndown.

2. **Part 2: Package/runtime resolver completion**
   - package imports;
   - Node/runtime builtins;
   - package `exports`/`imports`;
   - `node_modules` package graph;
   - TypeScript full `moduleResolution`;
   - third-party type package boundaries.

Part 2 is explicitly not solved by Part 1. Part 1 closeout must create or
reference a Part 2 tracker so future agents do not mistake package/runtime
resolution as permanently out of scope.

## Goal

Complete the repo-local import/file-level resolver route for `rust-hybrid`.

Completion means:

- current repo-local import/file residuals are mapped;
- one or more bounded repo-local residuals are implemented or no-goed;
- FileNodes handoff is resolved inside the repo-local import/file route;
- supported ESM/import-export repo-local residuals are either closed, no-goed,
  or handed to a more specific architecture route;
- package/runtime resolution is explicitly handed to Part 2;
- final closeout states whether Part 1 is complete and updates #165.

## Allowed Production Changes

Part 1 may change default `rust-hybrid` behavior only inside repo-local source
resolution.

Allowed:

- relative import file target burndown;
- tsconfig/jsconfig paths alias file target burndown;
- same-file `export { foo }` binding;
- direct ESM named import/export binding;
- one-hop direct repo-local re-export/barrel behavior;
- FileNodes/source-file fallback integration;
- fallback taxonomy improvements for repo-local target-not-found,
  file-node-not-found, and unsupported local import forms.

Disallowed:

- package imports;
- Node/runtime builtins;
- `node_modules`;
- package `exports`/`imports`;
- TypeScript full `moduleResolution`;
- default imports, namespace imports, or type-only imports unless explicitly
  selected as a bounded repo-local slice in a later approved plan;
- multi-hop barrel chains unless explicitly selected in a later approved plan;
- source-order or pick-first target selection;
- broad disambiguation;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- SQLite schema changes.

## Validation Contract

Every implementation slice must include:

- deterministic fixture coverage for the selected repo-local import/file
  behavior;
- positive and fallback/no-go cases;
- current repository targeted profile/status;
- VS Code sparse targeted profile/status when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- no automatic clone when VS Code sparse is unavailable;
- fallback taxonomy movement;
- graph-readable status;
- RSS or unavailable reason;
- closeout decision: `keep`, `no-go`, `handoff-to-Part2`, or
  `needs-architecture`.

Not required by default:

- full scoreboard;
- agent A/B;
- README metric update;
- release/package smoke;
- multi-run benchmark proof.

## Hard Guardrails

1. Part 1 must not silently solve or dismiss package/runtime resolution.
   Package/runtime behavior belongs to Part 2 and must be tracked.

2. No semantic shortcut for speed.
   Do not use source-order, pick-first, or broad disambiguation behavior to
   reduce fallback counts.

3. Repo-local only.
   Production changes must stay within repo-local source import/file resolver
   semantics.

4. Evidence before closeout.
   Every slice needs fixture evidence plus targeted profile/status evidence.

5. Preserve explainability.
   Fallback taxonomy must become clearer or stay explainable. Unknown fallback
   movement is a blocker.

## Slice Sequence

### 1. Completion Map And Fallback Taxonomy Baseline

Purpose:

- freeze Part 1 and Part 2 boundaries;
- map current repo-local, package/runtime, and unsupported import/file
  fallback buckets;
- establish profile/status fields used by all later slices.

Acceptance criteria:

- completion map artifact exists;
- package/runtime resolution is explicitly assigned to Part 2;
- current repo and VS Code sparse baseline profile/status are recorded when
  available;
- fallback taxonomy separates repo-local, package/runtime, unsupported, and
  unknown buckets;
- first implementation target is selected.

### 2. File-Level Import Target Burndown

Purpose:

- reduce or no-go one bounded repo-local file-level import target fallback
  category;
- focus on relative and paths-alias source target lookup only.

Acceptance criteria:

- selected category is named before implementation;
- deterministic fixture covers positive and fallback/no-go cases;
- default `rust-hybrid` behavior changes only for repo-local source resolution;
- current repo and VS Code sparse evidence are recorded when available;
- package/runtime imports remain Part 2 taxonomy, not silently resolved.

### 3. Direct ESM Named Import/Export Residual Burndown

Purpose:

- close or no-go one bounded repo-local direct ESM named import/export residual;
- reuse existing relative/path-alias resolver boundaries;
- avoid default, namespace, type-only, package, and multi-hop behavior.

Acceptance criteria:

- selected direct named binding residual is named before implementation;
- deterministic fixture covers direct named import/export positive and fallback
  cases;
- current repo and VS Code sparse evidence are recorded when available;
- fallback taxonomy movement is explainable;
- no broad disambiguation or source-order tie-break is introduced.

### 4. One-Hop Barrel/Re-Export Residual Burndown

Purpose:

- close or no-go one bounded repo-local one-hop direct re-export/barrel
  residual;
- keep final target semantics explicit and avoid multi-hop chains.

Acceptance criteria:

- one-hop residual category is named before implementation;
- deterministic fixture proves final leaf target behavior or records no-go;
- current repo and VS Code sparse evidence are recorded when available;
- package/runtime re-exports remain Part 2 or unsupported taxonomy;
- no multi-hop barrel chain behavior is introduced.

### 5. Source-File Fallback And FileNodes Integration Closeout

Purpose:

- resolve the FileNodes handoff from PlanB inside the repo-local import/file
  route;
- decide whether FileNodes/source-file fallback is `keep`, `no-go`,
  `handoff-to-Part2`, or `needs-architecture`.

Acceptance criteria:

- FileNodes/source fallback artifact exists;
- evidence uses the same profile/status contract as implementation slices;
- current repo and VS Code sparse evidence are recorded when available;
- decision explains interaction with unresolved file-level import target
  taxonomy;
- no package resolution expansion is introduced.

### 6. Part 1 Final Closeout And Part 2 Tracker

Purpose:

- close Part 1;
- create or reference Part 2 tracker for package/runtime resolver completion;
- update #165.

Acceptance criteria:

- Part 1 final closeout artifact exists;
- all Part 1 slices are linked with decisions;
- repo-local residuals are classified as closed/keep, no-go,
  handoff-to-Part2, or needs-architecture;
- Part 2 tracker exists or is explicitly referenced;
- package/runtime resolution is not treated as solved;
- #165 is updated with Part 1 status and next route.

## 49. `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part2-typescript-module-resolution.md`

# Rust-Hybrid Import/File Resolver Completion Part 2: TypeScript Module Resolution

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Part 2 tracker: #430
- Part 1 plan:
  `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part1.md`
- Part 1 closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Route

This is **Import/File-Level Resolver Completion Plan Part 2**.

Part 1 completed repo-local source import/file resolver behavior:

- relative imports;
- tsconfig/jsconfig paths aliases;
- same-file export specifiers;
- direct named import/export;
- one-hop direct re-export/barrel behavior;
- FileNodes/source-file fallback interaction.

Part 2 owns the package/runtime side of TypeScript module resolution:

- package imports;
- Node/runtime builtins;
- package `exports`/`imports`;
- `node_modules` package graph boundaries;
- TypeScript full `moduleResolution`;
- third-party type package boundaries;
- package/runtime re-export behavior.

## Goal

Use TypeScript full `moduleResolution` as the north star, but execute it in
bounded, evidence-driven slices.

This plan should not attempt a broad resolver rewrite. It should:

1. build a TypeScript compiler API oracle diagnostic map;
2. compare oracle results against current Rust fallback/result behavior;
3. recommend how many follow-up slices are needed and what each slice should
   target;
4. complete two oracle-selected repo-local implementation slices when evidence
   supports them;
5. complete one package/runtime boundary taxonomy slice;
6. close with a decision that states what remains for the next plan.

## Strategy

The TypeScript compiler API is the semantic oracle for this plan, but it is not
part of the production runtime path.

Use it only in benchmark/evidence tooling in this plan:

- keep `typescript` as a devDependency;
- do not move `typescript` into production dependencies;
- do not call the compiler API from default `rust-hybrid` indexing;
- do not require users to install TypeScript for the CLI path.

The oracle should classify only Rust fallback package/runtime samples by
default. It should not scan all imports unless a later plan explicitly expands
scope.

## Oracle Artifact Contract

The oracle diagnostic artifact must include:

- repo-relative source file path;
- language;
- line/column;
- import specifier;
- Rust current fallback reason or current target when available;
- TypeScript compiler resolved kind;
- TypeScript resolved path when available;
- whether the resolved path is repo-local;
- delta bucket;
- recommended implementation slice;
- recommended total slice count for completing the observed package/runtime
  residuals.

The artifact may include import specifiers and repo-relative paths.

The artifact must not include:

- source content;
- source slices;
- full source lines;
- candidate source text;
- private absolute paths except explicitly documented corpus roots.

## Slice Ordering Principle

The oracle can report sample counts, but implementation priority is not pure
count order.

Sort implementation recommendations by:

1. repo-local graph target availability;
2. expected agent sufficiency value;
3. semantic risk;
4. sample volume.

This prevents high-volume low-value imports such as test framework packages or
Node builtins from crowding out repo-local package resolution work.

## Allowed Production Changes

Production code changes are allowed only for oracle-selected bounded
repo-local package/runtime slices.

Allowed examples:

- workspace package self-name imports when they resolve to repo-local source;
- package subpath imports when the target stays inside the repo;
- package `exports`/`imports` entries when they resolve to repo-local source;
- package/runtime taxonomy improvements that make status/profile evidence more
  precise.

Disallowed:

- moving `typescript` into runtime dependencies;
- default scanning or indexing of `node_modules`;
- source-order or pick-first target selection;
- broad disambiguation;
- SQLite schema changes;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- claiming package/runtime completion without oracle evidence.

## Validation Contract

Every implementation slice must include:

- deterministic fixture coverage for positive and fallback/no-go cases;
- current repository targeted profile/status evidence;
- VS Code sparse targeted profile/status evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- no automatic clone when VS Code sparse is unavailable;
- fallback taxonomy movement or explicit no-go;
- graph-readable status;
- RSS or unavailable reason;
- closeout decision: `keep`, `no-go`, `handoff-to-next-plan`, or
  `needs-architecture`.

Not required by default:

- full scoreboard;
- agent A/B;
- README metrics update;
- release/package smoke;
- multi-run benchmark proof.

## Hard Guardrails

1. Full `moduleResolution` is the target, not the first implementation step.
   This plan must not hide complexity by overclaiming partial behavior.

2. The TypeScript compiler oracle is evidence tooling only.
   It must not become production runtime behavior in this plan.

3. No `node_modules` graph expansion by default.
   Third-party packages and runtime builtins should become clearer taxonomy
   unless the oracle selects a repo-local target.

4. No source-order shortcuts.
   Candidate-multiple cases require explicit semantic decisions, not
   pick-first behavior.

5. Every production slice must be oracle-selected.
   If the oracle does not identify a safe repo-local slice, the implementation
   slice closes as no-go with evidence.

## Slice Sequence

### 1. TypeScript Module Resolution Oracle Diagnostic Map

Purpose:

- create a benchmark/evidence-only oracle using the TypeScript compiler API;
- run it only against Rust fallback package/runtime samples;
- compare TypeScript compiler resolution with Rust current fallback/result
  behavior;
- recommend how many slices are needed and what each slice should target.

Acceptance criteria:

- oracle artifact exists under `docs/benchmarks/`;
- current repo and VS Code sparse oracle maps are recorded when available;
- artifact includes classification plus Rust/TypeScript delta;
- artifact recommends slice count and per-slice goals;
- no production runtime dependency or default indexing behavior changes.

### 2. Oracle-Selected Repo-Local Package/Self-Name Slice

Purpose:

- implement or no-go the highest-priority repo-local package/self-name bucket
  selected by the oracle;
- focus on package imports that TypeScript resolves to source inside the repo.

Acceptance criteria:

- selected bucket is named before implementation;
- deterministic fixture covers positive and fallback/no-go cases;
- production behavior changes only for repo-local source targets;
- current repo and VS Code sparse targeted evidence are recorded when
  available;
- package/runtime taxonomy remains explainable.

### 3. Oracle-Selected Package `exports`/`imports` Repo-Local Slice

Purpose:

- implement or no-go the highest-priority package `exports`/`imports` bucket
  selected by the oracle;
- only resolve entries that land on repo-local source files.

Acceptance criteria:

- selected `exports`/`imports` bucket is named before implementation;
- deterministic fixture covers conditional success and fallback/no-go cases;
- no `node_modules` graph expansion is introduced;
- no source-order fallback is introduced;
- current repo and VS Code sparse targeted evidence are recorded when
  available.

### 4. Node/Runtime And Third-Party Boundary Taxonomy Slice

Purpose:

- make package/runtime boundary diagnostics precise enough that agents and
  future plans can distinguish runtime builtins, third-party packages, and
  repo-local package misses;
- avoid pretending third-party package imports are repo-local graph gaps.

Acceptance criteria:

- Node/runtime builtin taxonomy exists;
- third-party package taxonomy exists;
- package subpath taxonomy exists;
- current repo and VS Code sparse targeted evidence are recorded when
  available;
- no default third-party package or `node_modules` deep resolution is added.

### 5. Part 2 Closeout And Next Plan Recommendation

Purpose:

- close this Part 2 plan;
- summarize oracle findings, implementation decisions, no-go buckets, and
  remaining full `moduleResolution` gap;
- recommend the next plan and issue sequence.

Acceptance criteria:

- final closeout artifact exists under `docs/benchmarks/`;
- all slices are linked with decisions;
- remaining package/runtime residuals are classified as closed/keep, no-go,
  handoff-to-next-plan, or needs-architecture;
- #430 and #165 are updated;
- the closeout does not claim full TypeScript module resolution unless the
  evidence actually supports it.

## Expected Outcome

This plan should produce:

- a replayable TypeScript compiler oracle map;
- one or two bounded repo-local package/runtime behavior improvements when
  evidence supports them;
- clearer taxonomy for Node/runtime and third-party package boundaries;
- a concrete estimate of how many additional slices are needed to finish the
  observed package/runtime resolver residuals.

If the oracle shows no safe repo-local package/runtime implementation bucket,
the plan still succeeds by producing a trustworthy no-go decision and a sharper
next-plan route.

## 50. `docs/plans/2026-06-22-rust-hybrid-parse-extraction-walker-hot-path-plan.md`

# Rust-Hybrid Parse Extraction Walker Hot-Path Plan

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Parse/extraction diagnostic track: #224
- #224 Plan 2 closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- Previous bounded parse optimization closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- Finalization tail boundary closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

## Context

#224 established that `parseAstExtractionMs` is the dominant parse/extraction
sub-bucket on both the current repository and the validated VS Code sparse
checkout.

The previous bounded parse optimization tried one repeated-text-extraction
candidate. It was safe, but the result was neutral/noisy no-go:

- current repository `parseAstExtractionMs`: `482 -> 485`;
- VS Code sparse `parseAstExtractionMs`: `9465 -> 9436`.

This means the next parse/extraction implementation slice should not continue
the same small string-allocation family. The next useful bet is to identify AST
walker hot paths and try one bounded implementation candidate with a larger
expected effect.

## Goal

Complete the parse/extraction implementation slice for the architecture and
performance PRD.

Completion means:

- AST walker hot-path diagnostics are available in profile/evidence artifacts;
- exactly one bounded walker optimization candidate is selected and attempted;
- graph semantics and default user behavior are preserved;
- current repository and VS Code sparse targeted profile evidence is recorded;
- the closeout records `keep`, `tentative keep`, `too noisy`, or `no-go`;
- the next step is a consolidated decision across resolver semantic,
  finalization tail, and parse/extraction work.

## Scope

In scope:

- JS/TS Rust parse/extraction walker hot-path diagnostics;
- artifact-only diagnostic fields for engineering evidence;
- one bounded implementation candidate selected from the diagnostics;
- deterministic graph-visible parity tests for the changed extraction surface;
- targeted rust-hybrid profile evidence on the current repository;
- targeted rust-hybrid profile evidence on
  `/private/tmp/codegraph-corpus/vscode-sparse` when it exists and is a Git
  checkout;
- closeout artifact under `docs/benchmarks/`;
- updates to #165 and #224 comments with the Plan 3 result.

Out of scope:

- Tree-sitter parser setup or parser reuse optimization;
- continuing the repeated-text-extraction micro-optimization family from #398;
- broad extractor rewrite;
- graph semantic changes;
- resolver or finalization changes;
- SQLite schema changes;
- CLI, SDK, MCP, status, doctor, packaging, README, or release workflow changes;
- full scoreboard by default;
- agent A/B by default.

## Diagnostic Posture

The walker diagnostics are artifact-only diagnostics.

They may appear in profile JSON or benchmark evidence artifacts, but they are
not a stable public API and should not be surfaced in README, MCP tool output,
or user-facing status/doctor output as part of this plan.

The diagnostics should be sufficient to select one candidate. They should not
turn into a broad profiling framework.

Useful diagnostic classes may include:

- extractor stage;
- syntax shape or node family;
- scan shape, such as direct child walk vs broader descendant walk;
- visit count or candidate count when that explains cost;
- elapsed time for the smallest reliable bucket available without excessive
  instrumentation overhead.

## Implementation Candidate Rules

The implementation candidate must be selected after diagnostics identify the
most suspicious walker hot path.

Acceptable candidates include narrow changes such as:

- replacing broad descendant scans with direct named-child traversal where the
  grammar shape is already known;
- avoiding repeated traversal of the same subtree inside one extraction pass;
- specializing a high-volume import/export/class/function extraction loop;
- splitting a hot branch so unsupported shapes exit earlier without changing
  emitted graph facts.

The candidate must not:

- change emitted node or edge semantics;
- reduce fallback taxonomy explainability;
- remove supported syntax coverage;
- change reference disambiguation or finalization behavior;
- broaden into parser or Tree-sitter runtime changes.

## Success Criteria

This plan does not require strict end-to-end performance gate closure.

The candidate is successful if it produces credible `parseAstExtractionMs`
improvement on the current repository or VS Code sparse without graph parity
regression. A result may be `tentative keep` when one corpus improves and the
other is neutral, but the closeout must explain noise and applicability.

The candidate is `no-go` when:

- `parseAstExtractionMs` is neutral or worse on both corpora;
- improvement is too small or noisy to justify the added code;
- diagnostics show the selected path is not a meaningful contributor;
- graph parity or fallback evidence regresses.

RSS must be recorded when available. If RSS remains unavailable in the sandbox,
the profile artifact or closeout must record the unavailable reason explicitly.

## Validation

Required validation:

- deterministic unit/integration tests for the diagnostic contract or profile
  artifact shape;
- graph-visible parity tests for any changed extraction behavior;
- targeted rust-hybrid profile on the current repository;
- targeted rust-hybrid profile on the VS Code sparse checkout when available;
- `git diff --check`.

VS Code sparse validation must use
`/private/tmp/codegraph-corpus/vscode-sparse` only when it exists and is a Git
checkout. Do not clone automatically. If unavailable, mark the evidence issue
as requiring human setup rather than fabricating substitute large-corpus
evidence.

Not required by default:

- full scoreboard;
- agent A/B;
- README metric update;
- CHANGELOG entry unless production code changes are retained;
- package or release smoke.

## Issue Sequence

### 1. AST Walker Hot-Path Artifact Diagnostics

Purpose:

- expose enough JS/TS Rust extractor walker hot-path information to pick one
  bounded implementation candidate;
- keep diagnostics artifact-only and non-stable;
- avoid changing default user behavior.

Acceptance criteria:

- profile or evidence artifact includes walker hot-path diagnostic fields;
- diagnostic fields are documented as artifact-only;
- deterministic tests cover the diagnostic shape;
- no extraction semantics change.

### 2. Bounded Walker Optimization Candidate

Purpose:

- use the diagnostics from issue 1 to choose one suspicious AST walker path;
- implement one bounded optimization candidate;
- preserve graph-visible output.

Acceptance criteria:

- exactly one candidate is implemented;
- the candidate is not the repeated-text-extraction family already no-goed by
  #398;
- graph-visible parity tests cover the changed extraction surface;
- resolver/finalization semantics remain unchanged.

### 3. Targeted Current Repo And VS Code Sparse Evidence

Purpose:

- produce before/after targeted profile evidence for the selected candidate;
- record current repository and VS Code sparse results;
- capture RSS or unavailable reason.

Acceptance criteria:

- current repository targeted profile evidence is recorded;
- VS Code sparse targeted profile evidence is recorded when the checkout is
  available;
- if VS Code sparse is unavailable, the issue records human setup needed and no
  automatic clone is performed;
- evidence includes parse sub-buckets, graphStats or parity summary, and RSS or
  unavailable reason.

### 4. Parse Extraction Plan 3 Closeout And Tracker Update

Purpose:

- close the parse/extraction implementation slice with a reviewable decision;
- update #165 and #224 with the result;
- hand off to consolidated decision.

Acceptance criteria:

- closeout artifact exists under `docs/benchmarks/`;
- closeout states `keep`, `tentative keep`, `too noisy`, or `no-go`;
- closeout links the plan, issues, evidence artifacts, and validation;
- #165 and #224 receive summary comments;
- closeout states that the next step is consolidated decision across resolver
  semantic, finalization tail, and parse/extraction.

## Closeout Contract

This plan is complete only when the closeout artifact exists and the trackers
are updated.

The closeout must include:

- selected diagnostic fields;
- selected implementation candidate and why it was chosen;
- before/after profile results for current repository and VS Code sparse, or
  the human setup reason if VS Code sparse was unavailable;
- graph parity and fallback taxonomy result;
- RSS result or unavailable reason;
- keep/no-go decision;
- explicit statement that this plan tried one parse/extraction candidate only;
- explicit handoff to the consolidated decision plan.

## 51. `docs/plans/2026-06-22-rust-hybrid-qualifiedname-routing-semantic-residual-audit.md`

# Rust-Hybrid QualifiedName Routing Semantic Residual Audit

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Prior route decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- Plan A closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Candidate producer routing boundary:
  `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`

## Position In Route

This is **PlanB-1** in the resolver semantic residual route.

Plan A completed a finalization-tail mechanics slice and decided to proceed to
Resolver Semantic Residuals. PlanB-1 is deliberately narrower than "finish the
resolver": it validates exactly one residual slice and uses the closeout to map
how many remaining slices are likely needed.

## Goal

Audit the `QualifiedName` candidate-producer on-demand routing shape as a
resolver semantic residual.

The default outcome is an evidence-backed decision, not a production behavior
change. Production code may change only when the current diagnostics or tests
are insufficient to make the decision, and any such change must be narrow,
default-safe, and semantics-preserving.

Completion means:

- `QualifiedName` routing evidence is collected from the current repository;
- VS Code sparse evidence is collected when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- evidence reports routing shape hits, mismatch count/samples, fallback
  taxonomy, graph-readable status, and RSS or unavailable reason;
- closeout decides `keep`, `no-go`, or `needs-architecture`;
- closeout maps remaining resolver semantic residuals into:
  `closed/keep`, `needs slice`, and `needs architecture`;
- closeout gives a bounded estimate for remaining slices. Default expectation:
  **2-4 additional slices** unless this audit exposes an architecture blocker.

## Why QualifiedName First

`QualifiedName` is the best first resolver semantic residual because:

- candidate producer routing already supports it on demand;
- existing tests cover fail-closed behavior when producer output mismatches or
  is incomplete;
- it is more semantic than generic `LowerName` lookup;
- it is less likely than `FileNodes` to pull the plan into import/export,
  package resolution, or file-level resolver migration;
- it does not require framework post-extract, dynamic-dispatch synthesis, or
  broad disambiguation migration.

## Current Code Read

The current candidate protocol has these relevant properties:

- pre-collected routing lookups include `ExactName`, `KnownNamePresence`, and
  `LowerName`;
- on-demand routing can handle `ExactName`, `LowerName`, `QualifiedName`, and
  `FileNodes`;
- diagnostics expose routed shape information through
  `candidateProtocol.rustCandidateProducer.routing`;
- local project config can enable or disable experimental Rust candidate
  producer routing;
- fail-closed behavior returns to TypeScript baseline when the Rust producer
  mismatches, omits required candidates, or cannot hydrate node ids.

PlanB-1 should validate whether the existing `QualifiedName` routing path is
clean enough to count as a kept semantic residual slice.

## Hard Guardrails

1. Evidence-only by default.
   Do not implement new resolver semantics unless the evidence path itself is
   blocked by missing diagnostics or missing deterministic tests.

2. No semantic shortcut for speed.
   Do not change which reference resolves, which target node id is selected,
   edge kind semantics, confidence, or resolved-by semantics.

3. Fail closed.
   Any mismatch, missing Rust result, node hydration miss, invalid response, or
   unavailable Rust producer must preserve the TypeScript baseline route.

4. No schema or package-resolution expansion.
   Do not change SQLite schema. Do not add package resolution, framework
   post-extract migration, or dynamic-dispatch migration.

5. No broad disambiguation.
   Do not introduce source-order, pick-first, or general overload/type-value
   tie-break behavior.

6. No open-ended benchmarking.
   Use targeted current-repo and VS Code sparse profile/smoke only. Do not run
   full scoreboard or agent A/B by default.

## Required Evidence

For each available target, record:

- profile artifact path;
- graph-readable status or unavailable reason;
- `candidateProtocol.rustCandidateProducer.routing.active`;
- `activeShapes`;
- `onDemandLookupShapeCounts.QualifiedName`;
- mismatch count and samples;
- fallback reason, if any;
- fallback taxonomy entries;
- relevant reference-resolution profile fields;
- RSS or unavailable reason.

Targets:

- current repository: required;
- VS Code sparse checkout: required only if
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.
  Do not clone automatically.

## Success States

`keep`:

- `QualifiedName` routing is exercised or convincingly shown to be irrelevant
  in current evidence;
- mismatch count is zero or explainable with fail-closed behavior;
- fallback taxonomy remains visible and explainable;
- graph-readable status is preserved;
- no resolver semantic behavior changes are needed.

`no-go`:

- `QualifiedName` routing is safe but not useful enough to treat as a
  meaningful residual slice;
- evidence shows the shape rarely appears or does not affect the remaining
  residuals;
- diagnostics are sufficient to make that call.

`needs-architecture`:

- parity cannot be judged from current diagnostics;
- the shape requires broader disambiguation, package resolution, or source-order
  tie-break behavior;
- fail-closed behavior cannot distinguish a safe mismatch from a missing
  protocol contract.

## Issue Sequence

### 1. QualifiedName Residual Baseline And Audit Contract

Purpose:

- confirm the exact `QualifiedName` routing surface already present in code;
- define the audit fields and keep/no-go/needs-architecture gates;
- avoid accidental broad resolver implementation.

Acceptance criteria:

- baseline artifact names the current routing behavior;
- out-of-scope semantic changes are explicitly listed;
- required evidence fields are listed;
- decision gates are clear enough for an AFK agent.

### 2. QualifiedName Targeted Profile Evidence

Purpose:

- collect current-repo and VS Code sparse targeted evidence;
- record graph-readable status, fallback taxonomy, routed shape counts,
  mismatch diagnostics, and RSS or unavailable reason.

Acceptance criteria:

- current-repo evidence is recorded;
- VS Code sparse evidence is recorded when the checkout is available;
- no automatic clone is attempted when the checkout is unavailable;
- evidence includes `onDemandLookupShapeCounts.QualifiedName`, mismatch count,
  fallback taxonomy, and RSS or unavailable reason;
- no full scoreboard or agent A/B is run.

### 3. QualifiedName Decision Closeout

Purpose:

- decide `keep`, `no-go`, or `needs-architecture` for the `QualifiedName`
  routing residual.

Acceptance criteria:

- closeout artifact links the plan, issues, and evidence;
- decision is one of `keep`, `no-go`, or `needs-architecture`;
- any production/test changes, if made, are justified as diagnostic/test
  support rather than semantic expansion;
- #165 is updated with the result.

### 4. Resolver Residual Map And Next-Slice Estimate

Purpose:

- classify remaining resolver semantic residuals after the `QualifiedName`
  decision;
- estimate how many slices remain.

Acceptance criteria:

- residual map has three buckets: `closed/keep`, `needs slice`, and
  `needs architecture`;
- closeout gives a bounded estimate, defaulting to 2-4 additional slices unless
  evidence proves otherwise;
- next recommended slice is named;
- no PlanB-2 issues are created by default inside this issue.
