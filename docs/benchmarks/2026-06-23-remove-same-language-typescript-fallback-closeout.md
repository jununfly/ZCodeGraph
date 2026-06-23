# Remove Same-Language TypeScript Fallback Closeout

Date: 2026-06-23

## Decision

Rust-owned JS/JSX/TS/TSX/MTS/CTS/Go parse or extraction gaps no longer append
the same file through the TypeScript indexer under `rust-hybrid`.

The gap remains visible as degraded rust-hybrid diagnostics:

- `fallbackState: degraded`
- `fallbackReasonTaxonomy` records the Rust-owned gap code
- `fallbackByLanguage` does not count the Rust-owned language as a TypeScript
  fallback append
- `fallbackFileCount` counts only actual TypeScript fallback append files

Non-Rust-owned supported languages continue to use TypeScript fallback append.

## Evidence

### Rust-owned gap no longer appends TypeScript fallback

The CLI fake-Rust-core gap fixture now records a Rust-owned parse gap without
writing the same TypeScript file through `indexFallbackFiles()`.

Observed contract:

- no TypeScript node is recovered from the fake Rust-owned gap file;
- hybrid metadata reports `fallbackByLanguage: {}` for that gap;
- hybrid metadata reports `fallbackFileCount: 0`;
- taxonomy records `rust-owned-parse-gap: 1`;
- CLI output and `.zcodegraph/errors.log` describe warning diagnostics rather
  than "recovered by TypeScript fallback".

### Non-Rust-owned fallback remains intact

The Python fallback fixture still indexes through TypeScript fallback under
`rust-hybrid` because Python is not yet Rust-owned.

Observed contract:

- Python function extraction remains available;
- hybrid metadata reports `fallbackByLanguage: { python: 1 }`;
- hybrid metadata reports `fallbackFileCount: 1`;
- taxonomy records `language-level-typescript-fallback: 1`.

## Verification

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/sdk-rust-hybrid.test.ts
```

Results:

- `npm run build`: passed
- `__tests__/rust-index-engine-cli.test.ts`: 64 passed
- `__tests__/sdk-rust-hybrid.test.ts`: 9 passed

## Explicit Non-Goal

Python Rust-owned migration is deferred. This closeout only removes
same-language TypeScript fallback for languages Rust core already owns.
