# Rust Indexing Core Phase 17: Production Final-Flush Default + End-to-End Scoreboard

## Parent

- PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Open performance gate blocker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Previous phase decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`

## Context

Phase 16 showed that the SQLite write/finalization boundary is the clearest productionization candidate. The experimental `memory-final-flush` mode materially reduced `sqliteWriteMs` and improved VS Code sparse stress wall time, while preserving graphStats shape and sufficiency smoke results. It did not close the PRD required-target gate on ZCodeGraph and Excalidraw.

The next phase shifts from pure forward implementation to result-oriented convergence:

1. Finish the opt-in Rust end-to-end path enough that the best known write strategy is the normal Rust path.
2. Build a scoreboard that reports the whole chain instead of isolated local improvements.
3. Use that scoreboard to identify the next largest blocker by segment and keep future A/B work bounded.

This phase does not claim default rollout readiness. The TypeScript indexer remains the product default. Rust remains explicit opt-in through `--engine rust` or the existing environment path.

## Goal

Make production-safe final-flush the default write path for `--engine rust`, keep a disk write escape hatch for debugging, and produce an end-to-end scoreboard that states:

- whether the PRD required gate passes or fails,
- whether graphStats parity and sufficiency remain acceptable,
- what the next largest blocker or segment appears to be.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim full default rollout readiness.
- Do not remove the TypeScript indexer or disk write escape hatch.
- Do not change the SQLite schema.
- Do not migrate ReferenceResolver, framework resolvers, synthesizers, MCP tools, or Explore rendering to Rust.
- Do not treat VS Code sparse as a replacement for required-target gate evidence.
- Do not run a packaging redesign; only smoke the affected CLI/packaging path.

## Decisions

### Rust final-flush default

`--engine rust` should use a production final-flush write path by default.

The production default must be safer than the Phase 16 experimental in-memory prototype:

- write into a temporary on-disk staging database,
- complete the Rust index into that staging database,
- atomically replace the active project index only after the staging database is valid,
- preserve the previous good index on failure.

The existing `disk` write mode remains available as a debug and escape hatch path, but it is not the scoreboard path. `memory-final-flush` can remain as an experimental/debug mode, but it must not become the production default.

### Required targets and stress target

The PRD required gate remains anchored on ZCodeGraph and Excalidraw:

- Rust must be at least 25% faster or at least 30% lower peak RSS than TypeScript.
- The other metric must not be significantly worse.
- Agent Sufficiency must not regress.

VS Code sparse remains a large-repo stress and confidence target. Evidence from VS Code can justify next optimization direction, but it cannot by itself close the PRD required gate.

### Scoreboard profiles

The scoreboard must run both profiles:

- `matched-ts-js`: performance/control baseline for the Rust JS/TS slice.
- `full`: readiness/completeness lens for the current end-to-end product path.

The scoreboard must report these separately. A `matched-ts-js` improvement does not imply full readiness; a `full` gap may point to remaining completeness or resolver/sufficiency work rather than just raw indexing performance.

### Scoreboard dimensions

The scoreboard must include:

- performance: wall time, peak RSS or unavailable reason, and relevant phase timing buckets,
- graphStats parity: files, nodes, edges, unresolved references, and indexed engine metadata,
- sufficiency: representative probe/smoke outcomes for required targets and VS Code sparse where applicable.

The output must make the gate state explicit: pass, fail, or inconclusive with reason.

### Cross-platform validation

Phase 17 must validate the production final-flush path with focused cross-platform coverage:

- macOS: required.
- Linux Docker: required for focused validation.
- Windows: required only if the implementation changes platform-sensitive replace, locking, path, or file-handle behavior; otherwise record why Windows was not required/unavailable for this phase.

Packaging/release validation defaults to smoke only. Run deeper release/npm smoke only if the implementation touches packaging, bundled binary selection, CLI status, or related release paths.

## Issue Sequence

### 17.1 Final-flush default path design and failure-safety tests

Specify the production final-flush contract and add tests that fail before implementation. Cover staging database validation, atomic active-index replacement, previous-good-index preservation, metadata readability, and disk fallback availability.

Type: AFK

Blocked by: none

### 17.2 Production final-flush default for Rust opt-in indexing

Implement the production temp on-disk final-flush path and make it the default for `--engine rust`. Keep `--sqlite-write-mode disk` as a debug escape hatch and keep `memory-final-flush` experimental/debug only.

Type: AFK

Blocked by: 17.1

### 17.3 Cross-platform focused validation and packaging/CLI smoke

Run focused validation for the production final-flush path on macOS and Linux Docker. Validate Windows only if platform-sensitive replace/locking/file-handle behavior changed, otherwise document the reason it was not required. Run packaging/CLI smoke for the affected path.

Type: AFK

Blocked by: 17.2

### 17.4 End-to-end scoreboard across matched-ts-js and full profiles

Produce the scoreboard across required targets and VS Code sparse for both `matched-ts-js` and `full` profiles. Report performance, graphStats parity, sufficiency, required gate state, and next largest blocker/segment.

Type: AFK

Blocked by: 17.2 and 17.3

### 17.5 Tracker and decision record

Track Phase 17 completion, link all artifacts, record the final gate state, decide whether #165 remains open, and name the next result-oriented blocker slice.

Type: HITL for final decision wording; AFK for artifact collection and draft decision.

Blocked by: 17.4

## Acceptance Criteria

- `--engine rust` defaults to production temp on-disk final-flush.
- `--sqlite-write-mode disk` remains available as a debug/escape hatch path.
- Experimental `memory-final-flush` is not the production default.
- Failure-safety tests prove a failed Rust index does not replace the previous good index.
- macOS and Linux Docker focused validation results are recorded.
- Windows validation is either run or explicitly marked not required/unavailable with reason.
- Packaging/CLI smoke for the affected path is recorded.
- Scoreboard reports `matched-ts-js` and `full` separately.
- Scoreboard includes performance, graphStats parity, sufficiency, required gate pass/fail, and next blocker/segment.
- Phase 17 decision does not claim Rust default rollout readiness unless the PRD gates actually pass.

## Expected Artifacts

- Production final-flush implementation and tests.
- Focused validation notes for macOS, Linux Docker, and Windows if required.
- Scoreboard raw/summary artifacts under `docs/benchmarks/`.
- Phase 17 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #49 and #165.
