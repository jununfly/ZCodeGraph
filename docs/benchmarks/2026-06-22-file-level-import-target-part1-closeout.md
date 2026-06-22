# File-Level Import Target Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #425
- Baseline: `docs/benchmarks/2026-06-22-import-file-completion-map-baseline.md`
- Prior closeout:
  `docs/benchmarks/2026-06-21-relative-import-target-burndown-closeout-decision.md`

## Decision

Decision: `no-go`.

The selected repo-local file-level import target category is:

```text
relative/file-node-not-found and relative/target-not-found
```

No additional production resolver behavior is changed in this slice.

## Why No-Go

The existing Rust-owned resolver already supports repo-local relative source
imports and tsconfig/jsconfig paths aliases in deterministic fixtures.

The remaining VS Code sparse file-target residuals are visible in profile
sample counts, but the previous burndown found that the final SQLite database
does not retain enough pre-cleanup unresolved import rows to safely choose a
bounded production behavior change from aggregate counters alone.

That means changing path normalization, query/hash stripping, extension
fallback, or any file-node selection behavior here would be speculative.

## Deterministic Fixture Coverage

Positive coverage exists in
`__tests__/rust-index-engine-cli.test.ts`:

- `resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges`

Fallback/no-go evidence exists in:

- `__tests__/rust-import-target-taxonomy.test.ts`
- `docs/benchmarks/2026-06-21-relative-import-target-burndown-closeout-decision.md`

The fallback classifier separates query/hash targets, asset-like targets,
extensionless/index candidates, declaration targets, and ignored non-relative
forms without reading source slices.

## Evidence

Current repo:

| Field | Count |
| --- | ---: |
| `importPathAliasResolvedBySource.relative` | 645 |
| `importPathAliasResolvedBySource.tsconfigPaths` | 17 |
| `relative/file-node-not-found` | 1 |

VS Code sparse:

| Field | Count |
| --- | ---: |
| `importPathAliasResolvedBySource.relative` | 59,042 |
| `relative/file-node-not-found` | 309 |
| `relative/target-not-found` | 4,871 |

The evidence confirms the category is real, but not safely actionable from the
available retained rows.

## Part 2 Boundary

Package/runtime imports remain out of scope. This slice does not add package
resolution, Node/runtime builtin handling, `node_modules`, package
`exports`/`imports`, or full TypeScript `moduleResolution`.

## Closeout

#425 closes as `no-go`.

Recommended prerequisite before revisiting this residual:

```text
preserve a pre-cleanup, privacy-safe unresolved file-target diagnostic sample
```

Without that prerequisite, repo-local file-target changes would risk changing
semantic behavior without a replayable reason.
