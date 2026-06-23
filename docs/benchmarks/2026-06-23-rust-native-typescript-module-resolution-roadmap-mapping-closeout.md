# Rust-Native TypeScript Module Resolution Roadmap Mapping Closeout

Date: 2026-06-23

## Parent

- Optimization tracker: #165
- Import/file resolver Part 2 tracker: #430
- Roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`

## Decision

Decision: `mainline-bounded-complete-with-semantic-frontier-todolist`.

The current roadmap-mapped campaign has converged for the bounded repo-local
graph sufficiency path:

- Rust-native module-resolution request/decision/profile architecture exists.
- Config interpretation covers the repo-local compiler-option surface used by
  the bounded resolver.
- Repo-local package self-name, workspace package, package exports/imports,
  paths/rootDirs, extension substitution, directory/index lookup, and safe
  declaration/runtime pairing have bounded implementation coverage.
- Guarded graph writing covers file-level import edges, bounded ESM named
  symbol edges, bounded default/namespace decisions, bounded repo-local package
  named symbol edges, and bounded one-hop named re-export edges.
- Parity/oracle evidence exists for current repo and VS Code sparse where
  available; the VS Code sparse bounded profile unavailable reason is recorded
  rather than hidden.

This closeout does not claim full TypeScript `moduleResolution`. The remaining
work is now intentionally grouped as semantic-frontier todolist items, not as
unfinished work inside the current bounded mainline campaign.

## Current Roadmap State

| Subtree | Status | Interpretation |
| --- | --- | --- |
| `1. Main subtree: repo-local graph sufficiency path` | complete | Bounded repo-local architecture and graph-writing route is done. |
| `2. Explore subtree: semantic frontier` | deferred todolist | Known complexity map for future planning, not the current implementation queue. |
| `3. Exploit slices: bounded implementation work` | complete | The bounded implementation slices mapped from this campaign have landed. |

The root roadmap remains open because full TypeScript module-resolution parity
requires explicit semantic-frontier decisions. That is a product/architecture
choice for the next round, not a hidden failure of the current bounded route.

## Closed Mapping

The current campaign should be read through these closeout artifacts:

| Area | Artifact |
| --- | --- |
| Part 2 oracle/taxonomy route | `docs/benchmarks/2026-06-22-typescript-module-resolution-part2-closeout.md` |
| TS compiler oracle | `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-closeout.md` |
| Runtime sibling graph write | `docs/benchmarks/2026-06-23-guarded-runtime-sibling-graph-write-closeout.md` |
| Direct ESM named symbol graph writes | `docs/benchmarks/2026-06-23-guarded-esm-named-symbol-edges-completion-closeout.md` |
| Reopened bounded ESM named symbol semantics | `docs/benchmarks/2026-06-23-esm-named-symbol-reopen-closeout.md` |
| One-hop named re-export graph writes | `docs/benchmarks/2026-06-23-guarded-one-hop-reexport-edges-closeout.md` |
| Third-party package indexing boundary | `docs/benchmarks/2026-06-23-third-party-package-indexing-boundary-decision.md` |

## Todolist For Next Round

### A. Semantic Frontier Decision Pack

Classify each `2.x` node before implementation:

- `2-1. full node_modules graph expansion`
- `2-2. third-party package symbol indexing`
- `2-3. typesVersions`
- `2-4. Classic and Node10 legacy exactness`
- `2-5. symlink/preserveSymlinks/pnpm virtual store behavior`
- `2-6. custom loaders and bundler plugins`
- `2-7. JSON/CSS/assets/custom non-code modules`
- `2-8. type-only vs runtime target divergence`
- `2-9. package manager specific edge cases`
- `2-10. advanced declaration/runtime semantics beyond repo-local same-basename
  pairing`

Recommended classifications:

- `defer/no-go`: keep taxonomy only.
- `promote-to-mainline`: make it part of the next product/architecture target.
- `split-to-exploit-slices`: turn into bounded implementation issues.
- `needs-oracle/research`: add fixtures or TS oracle evidence before touching
  production code.

### B. Re-Export Semantic Gaps

The bounded `1-7-3` route completed named one-hop repo-local re-export graph
writing. The following remain future semantic-frontier work:

- `export * from` re-export semantics;
- default re-export chains beyond the bounded direct form;
- namespace re-export member semantics;
- package or `node_modules` re-export semantics;
- multi-hop re-export chains.

These should not be reopened inside the bounded `1-7-3` closeout. Promote them
as explicit future slices if they become product-critical.

### C. Type Graph Semantics

Current value-graph semantics intentionally do not write type-only value graph
edges. Future work should decide whether a separate type graph is useful before
adding type-only import/export relationships.

### D. Large-Corpus Evidence Hygiene

Keep the existing rule:

- use `/private/tmp/codegraph-corpus/vscode-sparse` when it already exists and
  is a Git checkout;
- do not automatically clone large corpora;
- if bounded VS Code sparse evidence cannot complete, record an unavailable
  reason instead of fabricating parity confidence.

The current VS Code sparse bounded profile evidence for this roadmap has an
unavailable reason recorded in:

```text
docs/benchmarks/2026-06-23-rust-native-module-resolution-oracle-profile-cleanup.md
```

## Tracker Guidance

#430 should remain the tracker for the broader import/file resolver Part 2
route until the semantic-frontier todolist is either explicitly deferred or
promoted into a new plan.

#165 should continue tracking architecture/performance work. The current
roadmap closeout is about resolver semantics and graph sufficiency, not a
performance greenlight.

## Next Recommended Plan

Recommended next plan:

```text
TypeScript Module Resolution Semantic Frontier Decision Pack
```

Goal:

- decide which semantic-frontier nodes are product-relevant;
- choose a small number of bounded exploit slices for the next implementation
  round;
- keep `node_modules`, package-manager, loader, and type-graph expansion out of
  production code until each has a clear product reason and verification route.
