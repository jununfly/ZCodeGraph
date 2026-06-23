# Rust Indexing Core Phase 14/15 Experiment Artifact Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

The Phase 14/15 required-target and VS Code matched-work experiment files were
temporary generated process artifacts. Their reusable conclusions are
consolidated here; the individual raw rerun JSON files and generated
`decision-summary-draft` files can be deleted.

## Consolidated Findings

### Phase 14 Required-Only Full Profile

The initial required-only runs went through several unavailable or failed
attempts before producing a completed full-profile rerun.

Reusable conclusion:

- Both required targets eventually produced TypeScript and Rust graphs.
- Sufficiency passed on the completed run.
- The original performance gate was not met.
- Full-profile Rust graph output was materially different from the TypeScript
  arm, especially node/edge volume, so raw wall-clock comparison was not enough
  to explain product readiness.

Most useful completed-run summary:

| Target | TypeScript ms | Rust ms | Wall delta | Classification |
| --- | ---: | ---: | ---: | --- |
| zcodegraph | 9,818 | 11,072 | +12.77% | performance gate unmet |
| excalidraw | 25,672 | 26,408 | +2.87% | performance gate unmet |

### Phase 15 Required-Only Matched Work

The matched-work rerun controlled the most obvious graph-work mismatch from the
full-profile run.

Reusable conclusion:

- Both required targets produced TypeScript and Rust graphs.
- Sufficiency passed.
- Matched-work Rust was faster on wall time for both required targets.
- The original raw PRD performance gate was still not redefined by this
  experiment.
- The evidence changed the causal interpretation: prior full-profile results
  were materially affected by Rust doing different graph work.

Most useful matched-work summary:

| Target | Full-profile Rust delta | Matched-work Rust delta | Classification |
| --- | ---: | ---: | --- |
| zcodegraph | +12.77% | -14.95% | original gate still unmet |
| excalidraw | +2.87% | -21.99% | original gate still unmet |

### Phase 15D VS Code Matched-Work Stress

The VS Code sparse matched-work stress run eventually completed after earlier
preflight/unavailable attempts.

Reusable conclusion:

- VS Code sparse produced TypeScript and Rust graphs in the completed stress
  rerun.
- Sufficiency passed.
- Rust was faster on wall time under matched-work control.
- RSS regressed, so this was not a rollout greenlight.
- The result remained stress evidence, not a required-target completion gate.

Most useful completed-run summary:

| Target | TypeScript ms | Rust ms | Wall delta | RSS delta | Classification |
| --- | ---: | ---: | ---: | ---: | --- |
| vscode sparse | 1,046,846 | 770,037 | -26.44% | +20.08% | performance gate unmet |

## Deleted Process Artifact Classes

The cleanup removes these process artifact classes from the Phase 14/15 cluster:

- early unavailable required-only raw reruns;
- generated required-only `decision-summary-draft` files;
- generated matched-work `decision-summary-draft` files;
- early unavailable VS Code stress raw reruns;
- generated VS Code stress `decision-summary-draft` files.

## Durable Follow-On Artifacts

Later work superseded the deleted process files and remains the reusable
decision trail:

- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`

## Cleanup Boundary

This cleanup does not delete active release, resolver, or Rust-hybrid
architecture evidence. It only removes process artifacts whose decision value is
captured above or superseded by later durable documents.

## Remaining Documentation Cleanup Todolist

The repository still has historical process artifacts that may be consolidated
in later cleanup passes. Do not delete them blindly; first absorb their useful
facts into durable closeout/decision artifacts and update references.

Recommended next clusters:

1. Phase 15E/15F RSS gate and heap-profile artifacts.
   Keep active dhat/profile evidence until the RSS-gate story is consolidated.
2. Phase 16/17/18 SQLite write-path and scoreboard artifacts.
   Consolidate only after preserving the before/after wall-clock, RSS,
   graphStats, and decision classifications already used by ADR ZJ-0004.
3. Issues #193, #205, #206, #208, #209, #210, and #211 optimization evidence.
   These are candidates for a single optimization-evidence index, but several
   still support ADR ZJ-0003/ZJ-0004 and #165.
4. Phase 22/23 evidence-pipeline cleanup drafts.
   These should be merged only after checking whether their decision value is
   already represented in `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-closeout-decision.md`.
5. Rust-native module-resolution profile/oracle artifacts from 2026-06-22 and
   2026-06-23.
   Keep current resolver-roadmap evidence until the semantic-frontier decision
   pack decides what is still live.
