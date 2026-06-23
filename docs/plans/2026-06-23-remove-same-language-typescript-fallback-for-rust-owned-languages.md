# Remove Same-Language TypeScript Fallback for Rust-Owned Languages

Date: 2026-06-23

## Scope

This is a narrow rust-hybrid architecture cleanup plan.

Goal: for languages already owned by Rust core, rust-hybrid should stop using
the TypeScript indexer as a same-language recovery implementation.

Rust-owned scope:

- JavaScript: `.js`, `.jsx`
- TypeScript: `.ts`, `.tsx`, `.mts`, `.cts`
- Go: `.go`

Out of scope:

- migrating Python or any other product-supported language into Rust-owned
  indexing;
- removing TypeScript fallback for non-Rust-owned supported languages;
- removing the explicit `zcodegraph index --engine typescript` escape hatch;
- changing database schema;
- broad performance optimization.

Parent roadmap:

- `docs/plans/2026-06-23-rust-indexing-ts-replacement-readiness-roadmap.md`
- node `1-5-2. Eliminate TypeScript indexing dependency for current Rust-owned languages`

## Decision

Decision: `rust-owned-same-language-typescript-fallback-disabled`.

When a Rust-owned file reports a parse or extraction gap, rust-hybrid should
surface a degraded/fail-closed diagnostic instead of appending that same file
through the TypeScript indexer.

Rationale: as long as Rust-owned JS/TS/Go files can be silently recovered by
the TypeScript indexer, the project is forced to maintain two equivalent
indexing implementations for the same language surface. Current usage risk is
acceptable because the primary user is the maintainer.

## Target Contract

Keep:

- non-Rust-owned supported files still use language-level TypeScript fallback;
- unsupported files remain unsupported;
- process-level Rust failures still fail safely rather than falling back to a
  full TypeScript run;
- explicit `--engine typescript` remains available for troubleshooting.

Change:

- `rust-owned-parse-gap` and `rust-owned-extraction-gap` no longer add files to
  `fallbackFiles`;
- Rust-owned gap diagnostics still increment taxonomy and mark hybrid metadata
  degraded;
- CLI/status/doctor wording must make clear that Rust-owned files were not
  recovered by TypeScript fallback;
- profile metadata must distinguish:
  - non-Rust-owned TypeScript fallback append;
  - Rust-owned gap diagnostics with no append;
  - partial-write blocked diagnostics.

## Implementation Slices

### Slice 1: Contract Tests

Add or invert deterministic tests before changing behavior.

Expected changes:

- `mergeRustOwnedGapDiagnostics()` keeps `fallbackFiles` unchanged for
  Rust-owned `writtenByRust === false` diagnostics.
- metadata reports `fallbackState: degraded`;
- `fallbackReasonTaxonomy` records the Rust-owned gap code;
- `fallbackByLanguage` does not count the Rust-owned language as a TypeScript
  fallback append;
- existing non-Rust-owned fallback tests keep passing.

Likely tests:

- `__tests__/rust-index-engine-cli.test.ts`
- `__tests__/sdk-rust-hybrid.test.ts`

### Slice 2: Planner And Metadata Behavior

Update `src/indexing/rust-hybrid-contract.ts`.

Expected changes:

- keep language-level fallback append behavior in `planRustHybridAssignments`;
- change `mergeRustOwnedGapDiagnostics` so Rust-owned gap diagnostics update
  taxonomy only;
- update fallback message generation so Rust-owned gaps are described as
  diagnostics, not recovered fallback append;
- consider renaming or extending metadata fields only if needed to avoid
  ambiguity. Prefer minimal additive fields over schema churn.

### Slice 3: CLI And SDK Runtime Append Path

Keep the existing append path for non-Rust-owned fallback files, but ensure
Rust-owned gap diagnostics cannot enter that append queue.

Expected checks:

- `src/bin/zcodegraph.ts` should not print "recovered by TypeScript fallback"
  for Rust-owned gaps;
- `src/index.ts` SDK indexing should not call `indexFallbackFiles()` for
  Rust-owned gap files;
- errors log / status output should still tell the maintainer which Rust-owned
  files were degraded.

### Slice 4: Closeout Evidence

Run targeted tests and record the behavior change.

Required verification:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/sdk-rust-hybrid.test.ts
npm run build
git diff --check
```

Evidence to record:

- fake Rust-owned parse gap no longer creates TypeScript fallback append;
- non-Rust-owned fallback still appends through TypeScript;
- status/metadata clearly distinguishes the two;
- no Python migration included.

## Acceptance Criteria

- Rust-owned JS/TS/Go parse or extraction gaps do not append the same file via
  TypeScript indexing.
- Non-Rust-owned product-supported languages continue to use TypeScript
  fallback under rust-hybrid.
- Rust-owned gap diagnostics remain visible in metadata/status/doctor evidence.
- Tests cover CLI and SDK paths.
- Documentation makes clear that Python Rust-owned migration is deferred.

## Follow-Up Candidates

After this plan lands:

1. audit real current-repo and VS Code sparse rust-hybrid profiles for remaining
   Rust-owned gap diagnostics;
2. burn down the highest-confidence Rust-owned JS/TS/Go extraction gaps in
   Rust core;
3. open a separate Rust-owned Python indexing v1 target when current Rust-owned
   language cleanup is stable.
