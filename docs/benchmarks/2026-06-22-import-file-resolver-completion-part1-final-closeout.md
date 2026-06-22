# Import/File Resolver Completion Part 1 Final Closeout

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Issue: #429
- Plan:
  `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part1.md`

## Decision

Decision: `complete-with-Part2-handoff`.

Import/File-Level Resolver Completion Plan Part 1 is complete for repo-local
source import/file resolver scope.

Package/runtime resolution is not solved by Part 1. It is handed to Part 2.

## Slice Decisions

| Issue | Slice | Decision | Artifact |
| --- | --- | --- | --- |
| #424 | completion map and fallback taxonomy baseline | keep-baseline | `docs/benchmarks/2026-06-22-import-file-completion-map-baseline.md` |
| #425 | repo-local file-level import target burndown | no-go | `docs/benchmarks/2026-06-22-file-level-import-target-part1-closeout.md` |
| #426 | direct ESM named import/export residual burndown | keep | `docs/benchmarks/2026-06-22-direct-esm-named-import-export-part1-closeout.md` |
| #427 | one-hop barrel re-export residual burndown | keep | `docs/benchmarks/2026-06-22-one-hop-barrel-reexport-part1-closeout.md` |
| #428 | source-file fallback and FileNodes integration | keep | `docs/benchmarks/2026-06-22-source-file-filenodes-part1-closeout.md` |

## Final Classification

### Closed / Keep

| Residual | Decision |
| --- | --- |
| relative repo-local source import file-level edges | keep |
| tsconfig/jsconfig paths-alias repo-local source import file-level edges | keep |
| direct ESM named import/export to exactly-one repo-local target symbol | keep |
| same-file export specifier with exactly-one local declaration candidate | keep |
| one-hop direct repo-local barrel to exactly-one final leaf symbol | keep |
| FileNodes/source-file routed lookup shape | keep |

### No-Go For Part 1

| Residual | Reason |
| --- | --- |
| `relative/file-node-not-found` | remaining evidence is aggregate/sample-level and does not safely identify one production behavior change |
| `relative/target-not-found` | same as above |
| direct export candidate-zero | needs narrower evidence proving extraction or target lookup missed a supported declaration shape |
| one-hop leaf candidate-zero | needs narrower evidence proving extraction or target lookup missed a supported declaration shape |

### Needs Architecture

| Residual | Reason |
| --- | --- |
| direct export candidate-multiple | overloads, ambient declarations, and type/value namespace collisions need target semantics |
| one-hop leaf candidate-multiple | same candidate-selection risk as direct candidate-multiple |
| broad disambiguation | source-order or pick-first remains disallowed |

### Handoff To Part 2

| Residual | Next owner |
| --- | --- |
| package imports | Import/File-Level Resolver Completion Plan Part 2 |
| Node/runtime builtins | Import/File-Level Resolver Completion Plan Part 2 |
| package `exports`/`imports` | Import/File-Level Resolver Completion Plan Part 2 |
| `node_modules` package graph | Import/File-Level Resolver Completion Plan Part 2 |
| TypeScript full `moduleResolution` | Import/File-Level Resolver Completion Plan Part 2 |
| package/runtime re-exports | Import/File-Level Resolver Completion Plan Part 2 |

## Part 2 Tracker

Part 2 tracker:

```text
#430
```

Part 2 must be a separate plan/issue route. Part 1 does not silently solve,
dismiss, or permanently exclude package/runtime resolution.

## Validation

Targeted deterministic validation for Part 1:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges|resolves paths-alias ESM named imports to exported target-file symbols as Rust-owned edges|resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges|resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges|emits bounded ESM named binding fallback samples in the profile artifact"
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts __tests__/rust-esm-candidate-multiple-taxonomy.test.ts __tests__/rust-import-target-taxonomy.test.ts
```

## Tracker Update

#165 should read this route as complete for Part 1.

Next route:

```text
Import/File-Level Resolver Completion Plan Part 2: package/runtime resolver
completion
```
