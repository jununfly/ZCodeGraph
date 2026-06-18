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
