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
