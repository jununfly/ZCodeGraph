# Rust-Native Module Resolution Oracle/Profile Artifact Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Durable decisions remain in:

- `docs/benchmarks/2026-06-22-rust-native-module-resolution-shadow-foundation-closeout.md`
- `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-closeout.md`
- `docs/benchmarks/2026-06-22-typescript-module-resolution-part2-closeout.md`
- `docs/benchmarks/2026-06-23-rust-native-typescript-module-resolution-roadmap-mapping-closeout.md`

Generated oracle JSON/Markdown, profile JSON, status JSON, and targeted
evidence JSON artifacts can be deleted after this cleanup because the reusable
facts are captured by the closeout documents and summarized here.

## Rust Shadow Foundation Evidence

Current repo evidence:

| Field | Value |
| --- | ---: |
| `moduleResolutionShadowDecisionRefs` | 2894 |
| sampled decisions | 336 |
| `relative` | 1516 |
| `tsconfigPaths` | 36 |
| `nodeRuntimeBuiltin` | 573 |
| `packageOrRuntime` | 769 |
| oracle rows inspected | 336 |
| oracle parity `match` | 336 |
| oracle parity `mismatch` | 0 |

RSS was unavailable because process-list access was sandboxed.

VS Code sparse evidence:

- the checkout was expected at `/private/tmp/codegraph-corpus/vscode-sparse`;
- bounded profile smoke was attempted but did not finish in the local evidence
  window;
- existing index status remained readable;
- unavailable profile evidence was recorded as unavailable rather than treated
  as passing.

## TypeScript Oracle Evidence

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

The oracle supported boundary taxonomy work but did not select a safe
repo-local package self-name or package `exports`/`imports` implementation
bucket from the sampled evidence.

## Deleted Process Artifact Classes

This cleanup deletes:

- Rust module-resolution profile JSON;
- Rust targeted evidence/status JSON;
- Rust oracle JSON/Markdown;
- TypeScript oracle JSON/Markdown.

## Cleanup Boundary

This cleanup does not delete the durable closeout documents or the roadmap
document. It also does not claim full TypeScript `moduleResolution` completion.
The semantic-frontier todolist remains the source of future planning work.
