# Rust-Hybrid First-User Release PRD

## Superseding Note: 2026-06-19 Pre-Release API Polish

Phase 8 remains valid for the evidence it collected under the then-current
release boundary. Before the actual first-user release, the command surface was
narrowed:

- the primary setup command is now `zcodegraph init`, which builds the initial index;
- historical `zcodegraph init -i` / `--index` support should be removed;
- `ZCODEGRAPH_INDEX_ENGINE` should no longer select an engine;
- engine overrides should use explicit CLI flags, such as `zcodegraph index --engine typescript`.

The pre-release polish decision supersedes Phase 8 only for command shape,
environment-based engine selection, README metric refresh, and the final
release-candidate decision.

## Problem Statement

ZCodeGraph is already useful for real development through its existing local indexing, MCP tools, and agent sufficiency behavior. The next product step is not another internal Rust performance slice. The next step is a first-user release that makes the faster Rust-owned indexing path usable by real external projects without forcing users to understand or choose indexing internals.

The product promise for first users is:

- ZCodeGraph indexes the project locally.
- Agent answers remain sufficient enough to reduce generic Read/Grep fallback.
- JavaScript, TypeScript, JSX, TSX, and Go projects receive stronger Rust-owned indexing coverage.
- Files or languages not yet handled by Rust are covered by the mature TypeScript indexer where possible.
- When something fails or degrades, users can produce a privacy-preserving diagnostic bundle that maintainers can replay or analyze.

This PRD intentionally shifts the release gate away from strict performance targets. Performance still matters as a guardrail, but the first-user release is judged primarily by agent sufficiency, language coverage, fallback clarity, diagnostic quality, and release-like packaging behavior.

## Solution

Introduce `rust-hybrid` as the first-user indexing strategy.

`rust-hybrid` is Rust-first and TypeScript-backed:

1. A file planner assigns files by language and extension.
2. Rust indexes Rust-owned files first.
3. Files that Rust does not support, or individual files that hit Rust parse/extraction gaps, fall back to the TypeScript indexer.
4. TypeScript shell finalization runs once over the unified graph.
5. The final `.zcodegraph` index remains one SQLite graph consumed by the existing CLI, MCP tools, Explore planner, and graph queries.

For this release, `rust-hybrid` becomes the default strategy for the user-facing first-user release path:

```bash
zcodegraph init
zcodegraph index
```

Both commands should use `rust-hybrid` by default in that release path. Users should not need to learn which indexer is active. TypeScript-only indexing remains available as an escape hatch:

```bash
zcodegraph index --engine typescript
```

Advanced users and maintainers can also select the strategy explicitly:

```bash
zcodegraph index --engine rust-hybrid
```

## User Stories

1. As a first user, I want `zcodegraph init` to index my project without asking me to choose an engine, so that setup stays simple.
2. As a first user, I want ZCodeGraph to use its best available indexing path automatically, so that I focus on product usefulness rather than implementation internals.
3. As an agent user, I want Explore answers after `rust-hybrid` indexing to remain sufficient, so that agents do not fall back to broad Read/Grep exploration.
4. As a Go user, I want Go projects to be covered by Rust-owned indexing, so that Gin and Go service flows are useful in real codebases.
5. As a JavaScript or TypeScript user, I want the existing Rust JS/TS coverage to remain available through the default indexing path.
6. As a user with a mixed-language repository, I want unsupported Rust languages to be covered by the TypeScript indexer where possible, so that enabling the new default does not silently drop useful files.
7. As a user with generated Go files, I want generated files to be skipped or handled transparently without blocking useful Go coverage.
8. As a user, I want `zcodegraph status` to tell me whether indexing was healthy, degraded, or failed, so that I know when to trust the graph.
9. As a user reporting a problem, I want one command to generate a local diagnostic bundle, so that I can give maintainers useful evidence without sharing source code by default.
10. As a maintainer, I want the diagnostic bundle to include engine assignment, fallback taxonomy, graphStats, profile data, and corpus fingerprints, so that user reports are replayable or at least analyzable.
11. As a maintainer, I want process-level Rust failures to fail safely instead of silently falling back to full TypeScript indexing, so that users do not think they are testing `rust-hybrid` when they are not.
12. As a maintainer, I want existing indexes to remain stable after upgrade, so that users are not forced into an automatic reindex.
13. As a release maintainer, I want release-like packaging smoke for `rust-hybrid`, so that the first-user path works outside the source checkout.
14. As a maintainer, I want #165 performance optimization to remain separate, so that first-user release work is not blocked by deeper performance targets.

## Product Decisions

### `rust-hybrid` is the first-user default strategy

In the first-user release path, both full-index entry points default to `rust-hybrid`:

- `zcodegraph init`
- `zcodegraph index`

The product documentation should keep the user mental model simple: ZCodeGraph indexes the project locally. The README main path should not make users choose between TypeScript and Rust.

The TypeScript-only path remains supported as a troubleshooting escape hatch, not the primary product story.

### Engine selection surface

Supported engine values:

- `typescript`: mature TypeScript indexing path and escape hatch.
- `rust`: pure Rust opt-in/debug/validation path for maintainers.
- `rust-hybrid`: first-user default strategy.

Environment-based engine selection is not part of the first-user release
surface. Use explicit `--engine` flags for troubleshooting and maintainer
validation.

### File-level fallback

Fallback granularity is per file and per language.

Default assignment for this release:

- Rust-owned: JavaScript, TypeScript, JSX, TSX, Go.
- TypeScript fallback: supported languages that Rust does not own yet.
- TypeScript fallback: individual Rust-owned files that hit parse/extraction gaps.
- Skipped: generated Go files and files excluded by existing ignore/generated-file rules.

Per-file Rust gaps should not abort the whole run. They should fall back to TypeScript and be recorded.

Rust core or process-level failures are different. If the Rust binary is missing, crashes, cannot write safely, cannot acquire the lock, corrupts staging state, or otherwise fails at the process/system level, the run should fail safely and preserve the previous good index. It should not silently perform a full TypeScript fallback.

### Unified graph write model

`rust-hybrid` should write one unified `.zcodegraph` graph:

1. Rust writes Rust-owned files into a staging graph.
2. TypeScript appends fallback files into the same staging graph.
3. TypeScript shell finalization runs once over the unified graph.
4. The active index replacement remains failure-safe.

The user should not have to know which engine produced which node during normal agent use.

### Go support is a release blocker

Go support is required for the first-user release.

Go v1 scope:

- `.go` files enter the Rust-owned path.
- Extract package/module nodes where appropriate.
- Extract functions, methods, structs, interfaces, fields, constants, variables, and type aliases.
- Preserve method receiver ownership.
- Emit basic `contains` and `calls` edges.
- Support route-handler shapes needed for Gin or equivalent Go HTTP sufficiency.

Non-goals for Go v1:

- Full Go module/package import resolver.
- Full cross-package semantic equivalence with the TypeScript path.
- gRPC/protobuf generated edge cases.
- Every Go generic edge case.
- Generated file flow coverage.

If Rust Go extraction does not support the Gin sufficiency gate, the release cannot be downgraded to JS/TS-only.

### Generated Go files

Generated Go files may be skipped and do not count as a Go release blocker.

Patterns include:

- `*.pb.go`
- `*_grpc.pb.go`
- `*.pulsar.go`
- `*_mock.go`
- `*_mocks.go`
- `mock_*.go`

Skipped generated Go files must be visible in status and diagnostic output. They do not count against the Rust-owned Go coverage floor.

### User-visible health

The CLI should not silently hide fallback.

Healthy completion:

- no unexpected Rust-owned fallback, or only expected unsupported/generated skips.

Degraded completion:

- `rust-hybrid` completed, but some Rust-owned files fell back to TypeScript.

Failed completion:

- Rust process/system failure prevented safe hybrid indexing and the previous good index was preserved.

CLI summaries should show concise health and the doctor command when useful:

```text
Indexed with rust-hybrid
Fallback health: degraded
Run diagnostic bundle:
  zcodegraph doctor --engine rust-hybrid --bundle --last-run
```

System-level failure should be explicit:

```text
Rust-hybrid indexing failed before fallback could safely continue.
Previous index was preserved.
Run:
  zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

### Status and diagnostics

`zcodegraph status` should expose engine and fallback state:

- last index engine,
- engine version,
- engine health,
- Rust-owned languages,
- engineByLanguage,
- engineByFileCount,
- TypeScript fallback file count,
- skipped generated file count,
- fallback health,
- fallback reason taxonomy,
- recommended next action when degraded or failed.

MCP tools should not normally expose engine internals. `zcodegraph_explore`, `node`, `callers`, and `callees` should keep answering code questions. Engine/fallback details belong in status, doctor bundles, CLI degraded/failure summaries, benchmark artifacts, and debug logs. A brief MCP warning is acceptable only when graph health may affect trust.

### Diagnostic bundle

First-user feedback must be reproducible or analyzable through a bundle command:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
```

Process failures should support:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

The bundle must be local-only. It must not upload automatically.

Default bundle contents:

- version, platform, architecture, runtime, install method if available,
- selected engine and relevant flags,
- command metadata, exit code, elapsed time,
- sanitized stdout/stderr tail or structured logs,
- Rust and TypeScript profile buckets when available,
- peak RSS or unavailable reason,
- graphStats and node/edge kind counts,
- parse/index error taxonomy,
- engine assignment summary,
- engineByLanguage and engineByFileCount,
- fallbackByLanguage and fallback reason taxonomy,
- corpus fingerprint: file counts, extension distribution, total bytes, git commit if available, dirty status if available, ignore-rule summary if available,
- per-file diagnostic records for failed/fallback files without source code,
- replay manifest describing how maintainers can attempt local reproduction,
- privacy summary.

Default bundle must not include source code.

Per-file diagnostics may include:

- file path hash,
- extension,
- detected language,
- file size,
- error taxonomy,
- line/column,
- git blob hash if available,
- engine assignment,
- fallback reason.

Future explicit opt-in may support:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run --include-source-slice
```

`--include-source-slice` is not required for this release and must not be enabled silently.

### Upgrade behavior

Existing `.zcodegraph` indexes should not be automatically rebuilt on package upgrade.

New projects:

- `zcodegraph init` uses `rust-hybrid` in the first-user release path.

Existing projects:

- upgrade does not reindex automatically,
- next full `zcodegraph index` uses the current default strategy,
- users can explicitly run `--engine typescript` to preserve the old path.

`sync` and watch:

- full index is the release blocker,
- watch/sync rust-hybrid incremental semantics are not release blockers,
- existing TypeScript-built sync/watch behavior must not regress,
- if an existing TypeScript-built index cannot be safely mixed with rust-hybrid incremental semantics, status or sync should recommend a full `zcodegraph index`.

### README and product messaging

README should present the simple product path:

```bash
zcodegraph install
zcodegraph init
```

It should not teach users to choose an index engine in the primary path.

The implementation detail can be explained in a user-centered way:

- ZCodeGraph uses a fast Rust-backed path where available.
- It automatically falls back to the mature TypeScript path for unsupported files.
- Users can run doctor to generate a diagnostic bundle.

TypeScript-only escape hatch belongs in troubleshooting or advanced docs.

## Release Gates

### Functional gates

- `zcodegraph init` defaults to `rust-hybrid` in the first-user release path.
- `zcodegraph index` defaults to `rust-hybrid` in the first-user release path.
- `--engine rust-hybrid` works.
- stale `ZCODEGRAPH_INDEX_ENGINE` usage fails clearly and points to explicit `--engine`.
- `--engine typescript` remains available.
- Existing TypeScript default behavior is available as an escape hatch.
- `rust-hybrid` writes one active graph readable by the existing TypeScript shell and MCP-compatible graph path.
- Process/system failures preserve the previous good index.

### Coverage and sufficiency gates

- JS/TS/JSX/TSX remain covered by the Rust-owned path.
- Go is covered by the Rust-owned path.
- Reduced Go fixture passes.
- Gin or Go HTTP route fixture passes.
- Real Gin repo smoke passes:
  - index completes,
  - status/doctor shows Go handled by Rust,
  - fallback taxonomy is explainable,
  - graphStats/readability are available.
- Gin sufficiency smoke passes or produces a blocker decision:
  - prompt focuses on middleware/handler flow,
  - Read/Grep fallback risk is recorded,
  - failure includes diagnostic evidence.

### Fallback and diagnostics gates

- Per-file Rust gaps fall back to TypeScript and are recorded.
- Unsupported languages use TypeScript fallback where currently supported.
- Generated Go skips are recorded and do not count as Go release blockers.
- Status shows engine/fallback health.
- Doctor bundle can be generated for last run.
- Doctor bundle can be generated for last failure.
- Bundle excludes source code by default.
- Bundle includes replay manifest and privacy summary.

### Packaging and release-like gates

- Local build succeeds.
- Release-like packaged CLI discovers the Rust core binary.
- Release-like `zcodegraph init` path works.
- Release-like `zcodegraph index --engine rust-hybrid` path works.
- Release-like stale env selection fails clearly.
- Release-like status shows hybrid metadata.
- Release-like doctor bundle generation works.
- No actual `npm publish` is required by this PRD.
- No GitHub Release workflow trigger is required by this PRD.

### Performance guardrail

#165 post-PRD performance optimization is not a release blocker.

This PRD does not require Rust indexing to be 25% faster than TypeScript or 30% lower RSS.

The first-user release must still record wall time and RSS or unavailable reason on smoke artifacts. It must not be catastrophically slower or memory-hostile on smoke targets. Any severe regression should stop the release and produce a decision artifact.

## Non-Goals

- Do not close #165.
- Do not require the deeper post-PRD performance target to pass.
- Do not make users choose an engine in the README primary path.
- Do not expose engine internals in normal MCP answers.
- Do not require full Go module/package import resolution.
- Do not require gRPC/protobuf generated Go flow coverage.
- Do not require complete Go generic edge coverage.
- Do not require watch/sync rust-hybrid incremental support as a release blocker.
- Do not automatically rebuild existing indexes on upgrade.
- Do not include source code in diagnostic bundles by default.
- Do not upload diagnostics automatically.
- Do not change MCP tool names or protocol.
- Do not rewrite the MCP server, installer, or release workflow in Rust.

## Open Follow-Ups

- #165 remains open as post-release performance optimization.
- #224 remains the next profiling issue for `parseExtractionMs` unless superseded by this PRD plan.
- #225 tracks the initial diagnostic bundle capability and should be expanded to cover `rust-hybrid` last-run and last-failure bundles.

## Decision

Proceed toward a first-user release built around `rust-hybrid` as the default internal indexing strategy.

The product success measure is not strict performance superiority. The success measure is that real users can run the simple ZCodeGraph workflow, receive sufficient agent answers on JS/TS and Go projects, avoid losing coverage through TypeScript fallback, and provide maintainers with privacy-preserving diagnostic evidence when the graph is degraded or fails.
