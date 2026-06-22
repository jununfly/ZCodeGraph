# Repo-Local Package Self-Name Resolution No-Go

Date: 2026-06-22

## Parent

- Issue: #432
- Oracle closeout:
  `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-closeout.md`

## Decision

Decision: `no-go`.

The selected oracle bucket is:

```text
none - oracle did not find sampled package/runtime residuals that TypeScript
resolved to repo-local package/self-name source targets
```

No production resolver behavior changed.

## Evidence

Current repo oracle:

| Delta bucket | Count |
| --- | ---: |
| `ts-resolves-third-party-boundary` | 74 |
| `ts-runtime-builtin-boundary` | 26 |

VS Code sparse oracle:

| Delta bucket | Count |
| --- | ---: |
| `ts-runtime-builtin-boundary` | 85 |
| `ts-unresolved-package-runtime` | 15 |

The sampled evidence contains no `ts-resolves-repo-local-rust-fallback` bucket.
Therefore there is no oracle-selected repo-local package/self-name target for
this slice.

## Deterministic Coverage

The oracle script has deterministic fixture coverage proving it can identify
repo-local package/self-name and package subpath targets when they exist:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

## Boundary

This no-go does not mean repo-local package/self-name resolution is unnecessary.
It means this plan's sampled package/runtime residuals did not justify a
production behavior change for that bucket.

Disallowed behavior remains disallowed:

- no TypeScript runtime dependency;
- no `node_modules` scan;
- no SQLite schema change;
- no source-order or pick-first target selection.

## Closeout

#432 closes as `no-go`.

Recommended route if this bucket matters later:

```text
expand the oracle input beyond capped Rust fallback samples or use a corpus with
known repo-local package self-name imports, then rerun selection
```
