# Rust-Hybrid ESM Direct Export Candidate-Multiple Taxonomy

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- ESM named fallback diagnostics map:
  `docs/plans/2026-06-21-rust-hybrid-esm-named-binding-fallback-diagnostics-map.md`
- Direct export candidate gap burndown:
  `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-gap-burndown.md`
- Direct export candidate gap burndown closeout:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md`
- This plan closeout:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-taxonomy-closeout-decision.md`

## Context

The previous direct export candidate gap burndown proved that bounded direct
export recognition is useful, but it also made the next blocker clearer on VS
Code sparse:

- `esmNamedImportExportFallbackRefs`: 40,039
- `directExportCandidateGap`: 27,306
- raw direct export candidate reasons:
  - `direct-export-candidate-multiple`: 16,384
  - `direct-export-candidate-zero`: 10,864
  - `same-file-export-specifier-candidate-zero`: 58

Candidate-multiple is now the dominant direct export raw reason. It is also the
highest-risk area: TypeScript permits declaration merging, overloads,
ambient declarations, and separate type/value namespaces. A broad tie-break
would risk changing per-reference disambiguation semantics.

This plan intentionally does not change resolver behavior. It opens the
candidate-multiple map so a later slice can decide whether any bounded
tie-break is safe.

## Goal

Classify direct export candidate-multiple fallbacks into decision-oriented
subtypes and produce an evidence-backed next-step recommendation.

The output should answer:

- which candidate-multiple subtype dominates on VS Code sparse;
- which subtypes are plausible bounded tie-break candidates;
- which subtypes are no-go and must continue to fallback;
- whether the next resolver slice should change behavior or stay diagnostic.

## Non-Goals

- Do not change Rust resolver behavior.
- Do not add broad candidate tie-break behavior.
- Do not add source-order or pick-first selection.
- Do not implement default import resolution.
- Do not implement namespace import resolution.
- Do not implement package or runtime resolution.
- Do not change type-only import semantics.
- Do not implement multi-hop re-export chains.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement.
- Do not record source snippets, source lines, export-list text, candidate
  source, or full source content.

## Scope

### Candidate-multiple taxonomy

Add a dedicated direct export candidate-multiple taxonomy artifact generator.

The generator may read:

- Rust profile artifact fallback samples;
- the SQLite database for candidate metadata;
- candidate node metadata such as `id`, `kind`, `name`, `file_path`,
  `start_line`, and `end_line`;
- reference metadata and target file path already present in profile samples.

The generator must not read source file contents or emit source snippets.

Required subtype buckets:

- `interface-class-merge`
- `function-overload-signature`
- `ambient-declaration-merge`
- `type-value-namespace-collision`
- `duplicate-extraction`
- `same-kind-duplicate`
- `unknown-multiple`

The implementation may refine names if evidence shows sharper categories, but
the closeout must preserve the decision distinction:

- safe bounded tie-break candidate;
- possible prerequisite first;
- no-go / keep fallback.

### Evidence

Run deterministic evidence on:

- current repo;
- `/private/tmp/codegraph-corpus/vscode-sparse`.

VS Code sparse is the primary decision corpus. Current repo is a regression
and artifact-stability check.

Evidence sidecars must record:

- wall time;
- peak RSS or `rssUnavailableReason`;
- corpus commit for VS Code sparse.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.
- Do not close the closeout issue with current-repo-only evidence.

## Validation

Required deterministic tests:

- taxonomy artifact can classify fixture profile + DB candidate metadata;
- candidate metadata output remains privacy-safe;
- missing profile samples are reported as unavailable, not as success;
- missing database or missing candidate rows produce explicit unavailable or
  unknown buckets;
- same-file export specifier multiple reasons remain grouped under the direct
  export candidate domain.

Required closeout:

- current repo artifacts;
- VS Code sparse artifacts or needs-human-setup status;
- largest subtype;
- bounded tie-break candidate list;
- no-go subtype list;
- recommended next slice;
- tracker updates for #295, #296, and #165.

## Issue Sequence

1. #371 Add candidate-multiple taxonomy fixture and artifact contract.
2. #372 Implement DB-backed direct export candidate-multiple classifier.
3. #373 Run current repo and VS Code sparse candidate-multiple taxonomy evidence.
4. #374 Close out candidate-multiple tie-break decision.
