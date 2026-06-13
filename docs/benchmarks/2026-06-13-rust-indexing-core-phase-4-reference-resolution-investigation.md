# Rust Indexing Core Phase 4 Reference Resolution Investigation

Issue: [#87](https://github.com/jununfly/ZCodeGraph/issues/87)

Parent decision: [Rust Indexing Core Phase 4 Results And Decision](2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

Raw profile: [2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json](2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-profile.raw.json)

Raw sufficiency guardrail: [2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json](2026-06-13-rust-indexing-core-phase-4-vscode-reference-resolution-sufficiency.raw.json)

## Scope

This is a focused single-run profile on the same large VS Code JS/TS sparse
checkout used by the Phase 4 readiness evidence. It is not a multi-run
benchmark and it does not claim end-to-end improvement over TypeScript.

- Repository: `https://github.com/microsoft/vscode`
- Commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Profile date: 2026-06-13 UTC
- Node: `v22.21.1`
- Rust: `rustc 1.95.0`
- Indexed files: 11,291
- Phase 1 copied files: 11,518

## Focused Profile Result

The focused profile confirms that `referenceResolutionMs` remains the dominant
TypeScript finalization subphase on the VS Code target.

| Finalization subphase | Time |
| --- | ---: |
| framework post-extract | 42ms |
| reference resolution | 99,543ms |
| dynamic dispatch synthesis | 8,717ms |
| DB maintenance | 208ms |

The new reference-resolution breakdown identifies the dominant subpath as
`databaseAccessMs`, followed by `nameMatchingMs`.

| Reference-resolution subpath | Time | Interpretation |
| --- | ---: | --- |
| `databaseAccessMs` | 50,614ms | Dominant cost. Includes cache warm-up, unresolved-reference batch reads, edge materialization lookups, edge writes, and unresolved-reference cleanup writes. |
| `nameMatchingMs` | 36,808ms | Second-largest cost. Covers the generic name matcher after framework and import strategies do not return a high-confidence result. |
| `importResolutionMs` | 10,260ms | Material but not dominant. Covers import prefilter checks, JVM import resolution, and JS/TS import-based resolution. |
| `frameworkMatchingMs` | 1,022ms | Not the bottleneck for this VS Code JS/TS sparse checkout. |
| `otherResolutionMs` | 431ms | Built-in/external filtering, broad prefilter checks, and language-specific special cases. |

This answers the #87 taxonomy question: the bottleneck is primarily database
access inside reference resolution, with generic name matching as the next
largest subpath. It is not primarily import resolution or framework matching on
this target.

## Optimization Status

No end-to-end optimization was implemented in this issue. The code change adds
public profiler instrumentation so future optimization attempts can be judged
against the same subpath breakdown instead of treating `referenceResolutionMs`
as an opaque bucket.

Because no optimization was implemented, there is no before/after improvement
claim in this document. The actionable next optimization target is to reduce
the database-access portion of reference resolution first, then re-run this
focused profile and the VS Code sufficiency guardrail.

## Guardrails

The profile completed successfully and produced the same large-target graph
shape as the previous Phase 4 runs:

- Rust result: success.
- Files indexed: 11,291.
- Rust nodes/edges: 557,770 / 1,648,219.
- Parse errors: 46, already covered by the Phase 4 parse-error taxonomy.

RSS sampling was unavailable in this focused run because the local sandbox
blocked `ps` with `EPERM`; the raw profile records the machine-readable
unavailable reason instead of inventing RSS numbers.

The targeted VS Code sufficiency guardrail was re-run after adding the
reference-resolution instrumentation. The configured `VS-1` prompt returned
`no regression` for both TypeScript and Rust indexes, with deterministic
Read/Grep fallback-risk signals of `0 / 0` for both engines.

## Rollout Decision

This remains a default-rollout blocker. Phase 4 must stay on the
`continue opt-in + targeted blockers` path until a follow-up optimization shows
that the large-repo reference-resolution database-access cost is reduced while
preserving Explore sufficiency and graph quality.
