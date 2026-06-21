# Rust-Hybrid TypeScript Implementation-Declaration Metadata

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- TypeScript overload/signature semantic decision:
  `docs/benchmarks/2026-06-21-ts-overload-signature-semantic-decision.md`
- TypeScript overload/signature closeout:
  `docs/benchmarks/2026-06-21-ts-overload-signature-semantic-closeout-decision.md`

## Context

The TypeScript overload/signature semantic decision concluded that
candidate-multiple resolver behavior must not use source order, pick-first, or
line-range heuristics as a production tie-break. Runtime/value ESM named import
edges may target a TypeScript function implementation declaration only when
exactly one clear implementation declaration exists.

Current VS Code sparse artifacts show `function-overload-signature` is the
dominant sampled candidate-multiple subtype, but the profile/taxonomy candidate
metadata only records candidate kind and line ranges. It cannot reliably tell
which function candidate is an overload signature and which one is the runtime
implementation declaration.

## Goal

Add implementation-declaration metadata to Rust TypeScript overload/signature
diagnostics so the next resolver slice can safely decide whether a bounded
candidate-multiple tie-break is possible.

This plan is a metadata/evidence slice only. It does not change resolver
behavior.

## Decisions

- Add public diagnostic candidate metadata, not database schema.
- Do not persist `hasBody` or `declarationForm` in `nodes`.
- Do not encode implementation metadata into `signature`, `docstring`,
  decorators, or other user-facing node fields.
- Allow bounded diagnostic inference from target file content plus candidate
  line/range metadata.
- Diagnostic inference may read target files, but artifacts must not record
  source snippets or source lines.
- Every enriched candidate must state its metadata source.
- Production resolver behavior must not consume uncertain inference in this
  plan.

## Target Metadata Shape

Candidate diagnostics should be able to expose:

```json
{
  "kind": "function",
  "startLine": 12,
  "endLine": 18,
  "hasBody": true,
  "declarationForm": "implementation",
  "metadataSource": "target-file-line-range-inference"
}
```

Allowed `declarationForm` values:

- `implementation`
- `signature`
- `unknown`

Allowed `metadataSource` values for this plan:

- `rust-ast`
- `target-file-line-range-inference`
- `unavailable`

## Non-Goals

- Do not change resolver routing.
- Do not add a candidate-multiple tie-break.
- Do not change SQLite schema.
- Do not add database migrations.
- Do not expose source snippets, source lines, or inferred source text in
  artifacts.
- Do not implement type/value/namespace collision resolution.
- Do not claim performance improvement.
- Do not run agent A/B.

## Validation

Required:

- deterministic Rust TypeScript fixture proving implementation/signature
  classification;
- deterministic diagnostic artifact test proving candidate metadata fields are
  emitted without source text;
- current repo taxonomy/decision evidence;
- VS Code sparse taxonomy/decision evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` is available and is a Git
  checkout;
- tracker updates for #295, #296, and #165.

## Issue Sequence

1. Add Rust TypeScript implementation-declaration fixture coverage.
2. Enrich candidate-multiple diagnostic metadata with declaration form.
3. Write current repo and VS Code sparse implementation-declaration evidence
   closeout.
