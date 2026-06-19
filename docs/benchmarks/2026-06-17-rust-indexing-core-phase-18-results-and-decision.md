# Rust Indexing Core Phase 18 Results And Decision

## Scope

Phase 18 segmented the full-profile end-to-end path and tried one bounded Rust SQLite write-path A/B optimization. Rust remains opt-in. TypeScript remains the product default.

This phase does not claim default rollout readiness and does not close #165.

Architecture records:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Candidate

Candidate: `final-flush` staging database fast-write PRAGMAs.

The candidate changes only the temporary staging database used by Rust `final-flush`:

- use faster staging-local journal/synchronous/temp-store/locking settings while writing,
- restore the active-index connection settings before promotion,
- keep the active index readable with WAL mode,
- preserve the existing SQLite schema.

No SQLite schema change was made. No resolver/finalization optimization was implemented.

## Artifacts

| Artifact | Path |
|---|---|
| Plan | `docs/plans/2026-06-17-rust-indexing-core-phase-18-full-profile-bottleneck-ab.md` |
| Reduced before manifest | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-before.experiment.json` |
| Reduced before raw | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-before.raw.json` |
| Reduced before summary | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-before-summary.md` |
| Reduced after manifest | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-after.experiment.json` |
| Reduced after raw | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-after.raw.json` |
| Reduced after summary | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-after-summary.md` |
| Required after manifest | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-required-sqlite-after.experiment.json` |
| Required after raw | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-required-sqlite-after.raw.json` |
| Required after summary | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-required-sqlite-after-summary.md` |
| VS Code after manifest | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-vscode-sqlite-after.experiment.json` |
| VS Code after raw | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-vscode-sqlite-after.raw.json` |
| VS Code after summary | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-vscode-sqlite-after-summary.md` |

## Validation

| Check | Result |
|---|---|
| `cargo test --package zcodegraph-core` | passed |
| `npx vitest run __tests__/rust-indexing-experiment.test.ts -t "records Rust index profile breakdown"` | passed |
| Reduced full-profile A/B | completed |
| Required-target full-profile after | completed |
| VS Code sparse full-profile final after | completed |

The CLI and benchmark commands were run under Node `v26.0.0` with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, matching the existing local validation pattern for this thread.

## Segmentation Harness

The experiment summary now includes `## Full-profile end-to-end segments`, generated from run artifacts rather than hand-maintained prose.

Segments include:

- Rust source scan.
- Rust parse extraction.
- Rust SQLite write.
- Rust subprocess startup/handoff.
- TypeScript finalization.
- Reference resolution.
- Dynamic-dispatch synthesis.
- DB maintenance.
- graphStats measurement.
- sufficiency measurement availability.

## Reduced A/B Result

Fixture: `/private/tmp/zcodegraph-phase18-reduced-fixture`

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Rust total | 2,732 ms | 2,501 ms | -231 ms |
| Rust SQLite write | 786 ms | 549 ms | -237 ms |
| Rust parse extraction | 254 ms | 255 ms | +1 ms |
| TypeScript finalization | 87 ms | 88 ms | +1 ms |
| Reference resolution | 57 ms | 58 ms | +1 ms |
| Rust RSS | 56,868,864 | 56,786,944 | -81,920 |
| Sufficiency | passed | passed | no regression |

Reduced interpretation:

- The candidate improved the intended segment.
- graphStats remained stable for the reduced fixture.
- Sufficiency did not regress.

## Required Target Result

Phase 18 after is compared against the Phase 17 full-profile baseline.

| Target | Phase 17 Rust total | Phase 18 Rust total | Phase 17 SQLite write | Phase 18 SQLite write | Sufficiency | Gate |
|---|---:|---:|---:|---:|---|---|
| zcodegraph | 6,423 ms | 5,877 ms | 1,693 ms | 1,296 ms | passed | failed |
| excalidraw | 4,004 ms | 3,756 ms | 667 ms | 519 ms | passed | failed |

Required target interpretation:

- The candidate improved the Rust SQLite write segment on both required targets.
- The PRD required performance gate still fails.
- #165 remains open.

## VS Code Sparse Final After

Phase 18 after is compared against the Phase 17 full-profile baseline.

| Target | Phase 17 Rust total | Phase 18 Rust total | Phase 17 SQLite write | Phase 18 SQLite write | Phase 17 reference resolution | Phase 18 reference resolution | Sufficiency |
|---|---:|---:|---:|---:|---:|---:|---|
| vscode sparse | 606,168 ms | 599,881 ms | 160,722 ms | 153,186 ms | 124,152 ms | 127,909 ms | passed |

VS Code interpretation:

- The candidate improved Rust SQLite write time by 7,536 ms in this single final-after run.
- The full-profile wall-time gate remains failed.
- TypeScript finalization/reference resolution remains a major blocker and did not improve.

## Decision

Keep the SQLite PRAGMA candidate. It is bounded, preserves the schema, preserves active-index WAL behavior, and improves the intended write segment.

Do not treat this as sufficient for rollout readiness. The improvement is not large enough to close the PRD required-target gate.

#165 remains open.

Next largest blocker: TypeScript finalization/reference resolution in the full-profile path.

Recommended next slice: bounded full-profile finalization/reference-resolution segmentation and first A/B optimization, with resolver semantics and sufficiency protected by tests.
