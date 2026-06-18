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
