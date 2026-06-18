# Rust-Hybrid Phase 3: TypeScript Fallback Writes and Mixed-Language Completion

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 plan: `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`
- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 plan: `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`
- Phase 2 decision: `docs/plans/2026-06-18-rust-hybrid-phase-2-decision.md`
- Phase 2 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- Phase 3 tracker: [#239](https://github.com/jununfly/ZCodeGraph/issues/239)
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
