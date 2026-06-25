# Rust-Hybrid Cleanup / Edge-Write Optimization Closeout

Date: 2026-06-25

Roadmap node:
`1-8-5. Reference-resolution cleanup / edge-write bounded optimization`

Issues:
#557, #558, #559

## Decision

Classification: `keep`

Keep the bounded implementation because the contract test proves that a mixed
batched finalization pass now deletes resolved and intentionally unresolved
terminal refs in one rowid-range cleanup call instead of two calls. The measured
current-repo evidence shows a small cleanup-total improvement with graph and
fallback guardrails stable.

This is not a plan-level performance win. It is a narrow DB round-trip
reduction that should stay because it simplifies the terminal cleanup boundary
without changing resolver semantics.

## Implementation Summary

Changed only `ReferenceResolver.resolveAndPersistBatched()` terminal cleanup:

- resolved refs and intentionally unresolved refs are combined into one
  terminal cleanup list;
- cleanup still uses the existing rowid-range path;
- resolved and intentionally unresolved row-count diagnostics remain separate;
- graph-visible resolver semantics, edge kinds, fallback taxonomy, extraction,
  schema, MCP output, and candidate lookup/cache behavior are unchanged.

## Verification

Commands:

```bash
npx vitest run __tests__/resolution.test.ts -t "batched persistence cleans resolved and intentionally unresolved refs across rowid chunks"
npx vitest run __tests__/resolution.test.ts
npm run build
node scripts/rust-hybrid-baseline.mjs --out docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result.json --repo current-repo=. --runs 3 --repo vscode-sparse=/private/tmp/codegraph-corpus/vscode-sparse --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw --timeout-ms 600000
git diff --check
```

Result artifact:
`docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result.json`

The generated `tmp-2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result/`
profile files are issue-scope evidence for this closeout.

## Current-Repo Before / After

Before:
`docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-result.json`

After:
`docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result.json`

| Metric | Before median | After median | Classification |
| --- | ---: | ---: | --- |
| wall time | `7684 ms` | `7639 ms` | stable / slight improvement |
| peak RSS | unavailable | unavailable | unavailable reason recorded |
| edge write | `138 ms` | `89 ms` | improved, but not directly attributed |
| edge write DB | `138 ms` | `89 ms` | improved, but not directly attributed |
| unresolved cleanup | `215 ms` | `196 ms` | improved |
| unresolved cleanup DB | `215 ms` | `196 ms` | improved |
| resolved cleanup | `114 ms` | `196 ms` | attribution changed |
| resolved cleanup DB | `114 ms` | `196 ms` | attribution changed |
| intentionally unresolved cleanup | `101 ms` | `196 ms` | attribution changed |
| intentionally unresolved cleanup DB | `101 ms` | `196 ms` | attribution changed |

RSS unavailable reason:
`command RSS sampling did not report maximum resident set size`

The resolved and intentionally unresolved cleanup sub-buckets are no longer
directly comparable to the prior run when both classes appear in the same batch:
they now point at the same combined terminal cleanup operation. The combined
cleanup total is the relevant comparable metric for this slice.

## Guardrails

GraphStats:

- file count: stable at `380`;
- edge count: stable at `40600`;
- node count: `17218 -> 17219`, explained by local doc/test artifact movement
  during this work, not by resolver semantic changes.

Fallback taxonomy:

- total fallback count: stable at `2645`;
- hybrid fallback taxonomy: stable at
  `{ "language-level-typescript-fallback": 5 }`.

Real repo corpora:

- `/private/tmp/codegraph-corpus/vscode-sparse`: `needs-human-setup`;
- `/private/tmp/codegraph-corpus/excalidraw`: `needs-human-setup`.

Both paths contain `.git` directories, but `git rev-parse --is-inside-work-tree`
fails, so they are not valid Git checkouts for this runner. Per plan, the agent
did not reclone them.

## Follow-Up

Do not expand this slice into schema or resolver semantic work. If future
performance work wants cleaner attribution for combined terminal cleanup, add a
separate diagnostic field rather than splitting the DB operation again.
