# Rust-Hybrid Phase 4: Diagnostic Bundle v1

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Diagnostic bundle tracker: [#225](https://github.com/jununfly/ZCodeGraph/issues/225)
- Phase 3 plan: `docs/plans/2026-06-18-rust-hybrid-phase-3-typescript-fallback-writes.md`
- Phase 3 decision: `docs/plans/2026-06-18-rust-hybrid-phase-3-decision.md`
- Phase 3 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- Phase 4 tracker: [#245](https://github.com/jununfly/ZCodeGraph/issues/245)

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
