# Rust-Hybrid ESM Direct Export Candidate Gap Burndown

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
- ESM named fallback closeout:
  `docs/benchmarks/2026-06-21-esm-named-binding-fallback-diagnostics-map-closeout-decision.md`
- This plan closeout:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md`

## Context

The ESM named binding fallback diagnostics map identified
`directExportCandidateGap` as the dominant actionable fallback bucket on the
representative VS Code sparse corpus:

- `esmNamedImportExportResolvedRefs`: 121,209
- `esmNamedImportExportFallbackRefs`: 42,317
- `directExportCandidateGap`: 29,584
- raw direct export reasons:
  - `direct-export-candidate-multiple`: 15,428
  - `direct-export-candidate-zero`: 14,156

The current repo is dominated by package/runtime and unsupported import-shape
boundaries, so it is useful as a regression fixture but should not drive this
implementation slice. VS Code sparse points to direct export candidate
availability as the next resolver migration target.

The current Rust direct export recognition is intentionally narrow. It misses
real TypeScript declaration forms such as modifier-bearing exports and direct
same-file export specifiers. This plan burns down the candidate-zero side of
the gap without changing multi-candidate disambiguation semantics.

## Goal

Reduce Rust ESM named import/export fallback caused by direct export candidate
availability gaps while preserving the current final-reference disambiguation
boundary.

The desired result is not "all direct export gaps disappear." The desired
result is:

- declaration-style direct exports that are semantically direct become
  resolvable;
- same-file `export { Name }` bindings become resolvable only when the local
  candidate is unique;
- remaining direct export gaps are reclassified clearly enough to choose the
  next slice.

## Non-Goals

- Do not implement default import resolution.
- Do not implement namespace import resolution.
- Do not implement package or runtime resolution.
- Do not change type-only import semantics.
- Do not implement multi-hop re-export chains.
- Do not implement broad candidate tie-break behavior for multiple candidates.
- Do not change TypeScript resolver behavior.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement from this slice.
- Do not record source snippets, source lines, export-list text, candidate name
  arrays, or candidate source in diagnostic artifacts.

## Scope

### Declaration-style direct exports

Expand Rust direct export declaration recognition for bounded, direct
declaration forms such as:

- `export function Name`
- `export async function Name`
- `export class Name`
- `export abstract class Name`
- `export interface Name`
- `export type Name`
- `export enum Name`
- `export const Name`
- `export let Name`
- `export var Name`
- declaration variants with TypeScript modifiers such as `declare` when they
  remain direct named declarations.

The implementation may use a parser-backed or carefully bounded recognition
strategy, but it must not accept unrelated text as proof of a direct export.

### Same-file `export { Name }`

Add same-file export specifier association for the narrow case:

- the export specifier is in the same target file;
- the exported name and local name are the same;
- exactly one local declaration candidate exists;
- the target file is already known from file-level import resolution.

Fallback remains required for:

- no local declaration candidate;
- multiple local declaration candidates;
- aliases such as `export { Local as Public }`;
- re-export forms such as `export { Name } from "./other"`;
- default, namespace, package/runtime, and type-only boundaries.

## Diagnostics

Keep the diagnostics privacy-safe and evidence-oriented.

Required direct export candidate gap sub-buckets:

- declaration-style recognized and resolved;
- same-file export specifier recognized and resolved;
- candidate multiple;
- candidate zero after this slice;
- import target unavailable or ambiguous;
- unsupported shape or out-of-scope boundary.

The exact field names can follow the existing ESM fallback taxonomy vocabulary,
but the closeout must distinguish what this slice fixed from what remains.

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Validation

Required deterministic tests:

- fixture proving declaration-style direct exports resolve where they
  previously fell back;
- fixture proving same-file `export { Name }` resolves only when exactly one
  local declaration candidate exists;
- fixture proving multiple local candidates still fall back;
- fixture proving alias, re-export, default, namespace, package/runtime, and
  type-only boundaries are not silently treated as supported;
- existing ESM named import/export and one-hop re-export success behavior still
  passes.

Required evidence:

- current repo targeted profile/taxonomy evidence;
- VS Code sparse targeted profile/taxonomy evidence;
- evidence sidecars record wall time and RSS or `rssUnavailableReason`;
- closeout decision states keep / no-go / prerequisite and updates #295, #296,
  and #165 if relevant.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. #367 Add direct export candidate gap fixtures and baseline diagnostics.
2. #368 Expand declaration-style direct export recognition.
3. #369 Add same-file `export { Name }` unique local binding association.
4. #370 Run current repo and VS Code sparse closeout evidence.
