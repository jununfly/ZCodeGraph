# Package Exports/Imports Repo-Local Slice No-Go

Date: 2026-06-22

## Parent

- Issue: #433
- Oracle closeout:
  `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-closeout.md`

## Decision

Decision: `no-go`.

The selected package `exports`/`imports` bucket is:

```text
none - oracle did not find sampled package/runtime residuals that TypeScript
resolved through package exports/imports to repo-local source targets
```

No production resolver behavior changed.

## Evidence

Current repo oracle:

- rows inspected: 100;
- repo-local package/runtime deltas: 0;
- recommended slice goals: third-party package boundary taxonomy,
  Node/runtime builtin boundary taxonomy.

VS Code sparse oracle:

- rows inspected: 100;
- repo-local package/runtime deltas: 0;
- recommended slice goals: Node/runtime builtin boundary taxonomy,
  package/runtime unresolved no-go taxonomy.

The oracle fixture proves package `exports` can resolve repo-local package
entries when present, but the real sampled evidence did not select such a
bucket.

## Deterministic Coverage

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

The fixture covers package `exports`-style repo-local self-name and subpath
imports, plus third-party package subpath and unresolved fallback cases.

## Boundary

This slice does not introduce:

- `node_modules` graph expansion;
- TypeScript runtime dependency;
- SQLite schema changes;
- broad disambiguation;
- source-order or pick-first target selection.

## Closeout

#433 closes as `no-go`.

Recommended route if this bucket is needed later:

```text
rerun the oracle on a corpus or sample set with known repo-local package exports
residuals, then select a bounded implementation slice
```
