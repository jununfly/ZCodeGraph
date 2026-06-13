# Rust Indexing Core Phase 4 Results And Decision

Issue: [#82](https://github.com/jununfly/ZCodeGraph/issues/82)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Decision

Branch B: continue opt-in hardening.

Branch A is not chosen. Phase 4 produced useful readiness evidence, including
valid RSS sampling, a positive bounded optimization trial, package/failure
safety refreshes, and a connected large-target Explore sufficiency probe. The
evidence does not support preparing a default-rollout plan yet.

Rust remains opt-in. The TypeScript indexer remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows until a later default-rollout plan explicitly changes that.

## Evidence Summary

Phase 4 results are real local measurements and smoke outputs, not generated
placeholder data. They are still single-run local evidence unless explicitly
called out otherwise.

Raw artifact locations:

- Profile baseline: `/tmp/zcodegraph-rust-phase4-profile-baseline.json`
- Optimization after-profile: `/tmp/zcodegraph-rust-phase4-optimization-after.json`
- Optimization sufficiency: `/tmp/zcodegraph-rust-phase4-optimization-sufficiency.json`
- Readiness package smoke:
  `/tmp/zcodegraph-rust-phase4-readiness/package-smoke/summary.json`
- Readiness failure-safety matrix:
  `/tmp/zcodegraph-rust-phase4-readiness/failure-safety-matrix/summary.json`
- VS Code profile:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`
- VS Code sufficiency:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency.raw.json`
- VS Code sufficiency prompt:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`
- Supported Node 22 VS Code profile:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-profile.raw.json`
- Supported Node 22 VS Code sufficiency:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-sufficiency.raw.json`
- VS Code reference-resolution focused profile:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json`
- VS Code reference-resolution sufficiency rerun:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json`
- VS Code syntax-gap targeted rerun:
  `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json`
- VS Code syntax-gap full sparse-checkout rerun:
  `docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json`

Human-readable summaries:

- [Profile baseline](2026-06-13-rust-indexing-core-phase-4-profile-baseline.md)
- [Optimization trial](2026-06-13-rust-indexing-core-phase-4-optimization-trial.md)
- [Readiness refresh](2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md)
- [Large-target readiness](2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md)
- [Supported Node rerun](2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md)
- [VS Code parse-error taxonomy](2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md)
- [Reference-resolution investigation](2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md)
- [VS Code syntax-gap resolution](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md)

## Benchmark Results And RSS Evidence

Hard-gate baseline profile:

| Repo | Files | TypeScript wall | TypeScript RSS | Rust wall | Rust RSS | Dominant subphase |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| ZCodeGraph | 269 | 2023ms | 360,529,920 bytes | 2890ms | 221,020,160 bytes | `dynamicDispatchSynthesisMs` |
| Excalidraw | 648 | 5292ms | 552,730,624 bytes | 6271ms | 303,022,080 bytes | `dynamicDispatchSynthesisMs` |
| Zustand | 53 | 377ms | 457,818,112 bytes | 404ms | 92,880,896 bytes | `dynamicDispatchSynthesisMs` |

RSS evidence is valid for the local macOS runs above. The profiler now records
machine-readable RSS unavailable reasons when sampling cannot observe a process
tree.

The hard-gate repos showed no Rust RSS material regression in the baseline.
End-to-end wall-clock remained mixed: Rust was close on Zustand and Excalidraw,
but slower on ZCodeGraph.

## Optimization Trend Classification

Optimization trend classification: `positive`.

The bounded optimization skipped impossible language-specific full-graph
dynamic-dispatch synthesizer passes for JS/TS-only graphs and preserved the
previous fallback behavior when language statistics are unavailable.

| Repo | Before dynamic synthesis | After dynamic synthesis | Drop |
| --- | ---: | ---: | ---: |
| ZCodeGraph | 647ms | 103ms | 84.1% |
| Excalidraw | 2312ms | 327ms | 85.9% |
| Zustand | 73ms | 6ms | 91.8% |

Guardrails passed: build, targeted Vitest suites, and the hard-gate
`rust-sufficiency-guardrail.mjs` run reported no regressions.

## Large-Target Readiness Evidence

Phase 4 validated on a large VS Code JS/TS sparse checkout, not on full VS Code.

- Repository: `https://github.com/microsoft/vscode`
- Commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Indexed JS/TS/JSX/TSX files: 11,291
- TypeScript profile: 224.8s, peak RSS 1.30GB
- Rust opt-in profile: 256.7s, peak RSS 1.46GB
- Rust node/edge counts: 557,770 / 1,648,219
- Parse errors: 46
- Dominant bottleneck: `referenceResolutionMs`

Large-target finalization subphases:

| Subphase | Time |
| --- | ---: |
| framework post-extract | 43ms |
| reference resolution | 115,939ms |
| dynamic dispatch synthesis | 9,805ms |
| DB maintenance | 783ms |

The Explore sufficiency probe returned connected Flow sections for both
TypeScript and Rust indexes. Deterministic Read/Grep fallback-risk signals were
`0 / 0` for both engines, with no regressions reported.

The supported Node 22 rerun confirmed the same large-target shape:

- Node v22.21.1 is within the supported package range.
- TypeScript profile: 221.4s, peak RSS 1.64GB.
- Rust opt-in profile: 239.7s, peak RSS 1.61GB.
- Rust node/edge counts: 557,770 / 1,648,219.
- Dominant bottleneck: `referenceResolutionMs`.
- Sufficiency probe: connected Flow sections for both engines, with `0 / 0`
  deterministic Read/Grep fallback-risk signals.

The #87 reference-resolution investigation split `referenceResolutionMs` into
subpaths on the same VS Code sparse checkout. The dominant subpath was
`databaseAccessMs` at 50,614ms, followed by `nameMatchingMs` at 36,808ms,
`importResolutionMs` at 10,260ms, `frameworkMatchingMs` at 1,022ms, and
`otherResolutionMs` at 431ms. This keeps reference resolution as a
default-rollout blocker until a targeted optimization reduces the database
access cost without regressing sufficiency.

The matching targeted sufficiency rerun reported `no regression` for both
TypeScript and Rust on the configured VS Code prompt, with deterministic
Read/Grep fallback-risk signals of `0 / 0` for both engines.

The #88 syntax-gap fix removed every real supported JS/TS syntax-gap path from
the VS Code parse-error set. A full Rust-core parse rerun on the same sparse
checkout reduced parse errors from 46 to 29; the remaining errors are the
malformed fixture, prompt/generated, or compiler-scale colorization fixture
paths already classified by the taxonomy.

## Package Smoke, Diagnostics, And Failure-Safety

Package smoke passed for:

- bundle default TypeScript indexing;
- bundle explicit Rust indexing;
- bundle missing Rust binary behavior;
- npm default TypeScript indexing;
- npm explicit Rust indexing;
- optional platform Rust core presence;
- missing optional package diagnostics;
- no local Rust compilation;
- npx-like local smoke.

Diagnostics passed through the Phase 3 validation harness and status JSON
coverage. The validation summary exposes `phase4Readiness` so package smoke,
failure safety, diagnostics, default TypeScript smoke, Rust smoke, and CI
artifact contract coverage are visible from the top-level artifact.

Failure-safety passed for missing binary, nonzero Rust subprocess exit,
malformed Rust stdout JSON, crash-after-temp-db, partial temp DB failure,
lock contention, stale lock recovery, and packaged-binary-removed cases.

## Gate Result

Branch A is blocked.

Blocking gates:

- Large-target performance is not ready: Rust was slower than TypeScript on
  the VS Code sparse checkout and used more peak RSS.
- The large-target dominant bottleneck is TypeScript finalization,
  specifically `referenceResolutionMs`, not Rust parse extraction.
- The supported Node 22 rerun still shows `referenceResolutionMs` as the
  large-target dominant bottleneck, even though Rust wall-clock improved versus
  the original Node 26 evidence.
- The #87 reference-resolution investigation identifies `databaseAccessMs` as
  the dominant subpath inside `referenceResolutionMs`, so the blocker is now
  targeted but not resolved.
- The VS Code parse-error taxonomy found no unknown errors. The later #88
  syntax-gap fix moved all 16 real supported JS/TS paths out of the parse-error
  set, so syntax gaps are no longer a default-rollout blocker.

Follow-up blockers:

- [#85](https://github.com/jununfly/ZCodeGraph/issues/85): completed supported
  Node 22 VS Code readiness smoke.
- [#86](https://github.com/jununfly/ZCodeGraph/issues/86): classify VS Code
  large-target parse errors.
- [#88](https://github.com/jununfly/ZCodeGraph/issues/88): fixed the real
  JS/TS syntax-gap subset surfaced by the taxonomy.
- [#87](https://github.com/jununfly/ZCodeGraph/issues/87): completed
  reference-resolution investigation; `databaseAccessMs` is the largest
  subpath and remains a default-rollout blocker until optimized.

Branch C is not chosen. The Rust path still passes sufficiency checks, package
smoke, failure-safety, diagnostics, and a positive bounded optimization trial.
The evidence supports continued hardening rather than stopping Rust expansion
or reassessing the Rust-core/TypeScript-shell boundary.

## Release-Cycle Evidence

Release-cycle evidence remains future work before any default engine change.
Because Branch A is not chosen, Phase 4 does not schedule a default engine
change.

Before any later default-rollout plan can change the default engine, it still
must account for:

- at least one official release carrying Rust core optional platform packages;
- post-release npm/npx explicit `--engine rust` smoke on macOS, Linux, and
  Windows;
- no unresolved packaging or install blockers from that release;
- bug reports separable by TypeScript/Rust engine metadata;
- a rollback plan that can restore TypeScript as the default without changing
  the MCP protocol or installer surface.
