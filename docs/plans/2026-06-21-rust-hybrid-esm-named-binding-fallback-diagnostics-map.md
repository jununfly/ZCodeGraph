# Rust-Hybrid ESM Named Binding Fallback Diagnostics Map

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Relative file-node diagnostics cleanup:
  `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-cleanup-closeout-decision.md`

## Context

The recent relative import-target work cleaned up the file-level import target
surface:

- relative JS source specifiers now resolve to same-basename source files when
  appropriate;
- non-code asset/config residuals are classified as diagnostics-known
  boundaries;
- asset/config imports still do not create graph edges.

That leaves the resolver migration effort back on the main binding-level
surface. Current Rust-hybrid profiles still show a large
`binding-level-symbol-disambiguation` fallback bucket:

- current repo: roughly thousands of binding fallbacks;
- VS Code sparse checkout: roughly one hundred thousand binding fallbacks.

Rust already owns a meaningful ESM named import/export path:

- direct same-name ESM named import/export binding;
- direct one-hop named re-export/barrel behavior;
- imported symbol usage edges once the imported binding resolves.

However, the current profile only exposes aggregate
`esmNamedImportExportFallbackRefs`. It does not explain why eligible-looking
ESM named bindings fall back. Running a large VS Code sparse profile without a
complete fallback map wastes the expensive run: it leaves the next
implementation slice partly guess-driven.

## Goal

Open the ESM named binding fallback diagnostics map.

This slice should make the Rust profile and benchmark artifacts explain the
major ESM named binding fallback reasons well enough to choose the next
implementation slice or state a no-go.

The output should feel like lifting the map fog:

- which fallback reasons dominate;
- which reasons are already expected boundaries;
- which reasons are likely implementation candidates;
- which reasons require human setup, corpus hydration, or a separate design.

## Non-Goals

- Do not change resolver behavior.
- Do not create new graph edges.
- Do not implement default import resolution.
- Do not implement namespace import resolution.
- Do not implement package resolution.
- Do not implement type-only symbol graph semantics.
- Do not broaden re-export chains beyond existing behavior.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement.
- Do not record source snippets, source lines, export lists, or candidate name
  arrays in profile samples.

## Diagnostics Contract

Add Rust profile fields for ESM named fallback diagnostics:

- `esmNamedImportExportFallbackSampleCounts`
- `esmNamedImportExportFallbackSamples`
- `esmNamedImportExportFallbackSampleCap`

The sample cap can follow the existing import fallback sample shape:

- bounded per reason;
- bounded total;
- truncation surfaced in the cap object.

Required reason map:

- `type-only-import`
- `import-edge-target-not-found`
- `import-edge-target-ambiguous`
- `target-file-content-unavailable`
- `direct-export-candidate-zero`
- `direct-export-candidate-multiple`
- `reexport-specifier-target-not-found`
- `reexport-leaf-content-unavailable`
- `reexport-leaf-candidate-zero`
- `reexport-leaf-candidate-multiple`
- `package-or-runtime-binding`
- `unsupported-import-shape`

The exact reason names may be adjusted during implementation if the code path
reveals a sharper taxonomy, but the resulting map must distinguish:

- missing/ambiguous file-level import edge;
- type-only boundaries;
- direct export candidate failures;
- one-hop re-export candidate failures;
- package/runtime/unsupported binding boundaries.

## Privacy-Safe Sample Fields

Allowed fields:

- `reason`
- `referenceName`
- `referenceKind`
- `filePath`
- `language`
- `line`
- `col`
- `targetFilePath` when a file-level target is known
- `candidateCount` when applicable
- `resolvedByAttempt` such as `direct-export` or `one-hop-reexport`

Disallowed fields:

- source snippets;
- source lines;
- full source file content;
- export list text;
- candidate name arrays;
- candidate source excerpts.

These fields are internal profile artifact diagnostics. They should not be
described as a long-term public API.

## Taxonomy Artifact

Add a dedicated ESM named fallback taxonomy artifact generator.

Do not fold this into the relative import target taxonomy script. The domains
are different:

- import target taxonomy answers file-target questions;
- ESM named fallback taxonomy answers binding resolution questions.

The script should read a Rust profile artifact and write:

- JSON artifact;
- Markdown summary artifact.

The output should include:

- reason distribution;
- total rows inspected;
- unavailable reason if the profile does not contain ESM fallback samples;
- top examples by reason;
- a concise "candidate next slice" section based on dominant actionable
  reasons.

## Validation

Required deterministic tests:

- Profile fields exist and remain bounded.
- Each major fallback reason is coverable by fixture tests or direct unit-level
  profile serialization tests where end-to-end fixture setup would be too
  artificial.
- Samples contain only privacy-safe fields.
- Existing ESM named import/export success behavior still passes.
- The dedicated taxonomy generator classifies profile samples by reason and
  writes JSON/Markdown artifacts.

Required evidence:

- Current repo targeted profile/taxonomy evidence.
- VS Code sparse targeted profile/taxonomy evidence.
- Evidence sidecars record wall time and RSS or `rssUnavailableReason`.
- Closeout must select the next implementation candidate or explicitly state
  no-go.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. #363 Add ESM named fallback reason samples to Rust profile.
2. #364 Add ESM named fallback taxonomy artifact generator.
3. #365 Run current repo and VS Code sparse ESM fallback map evidence.
4. #366 Close out ESM named binding fallback diagnostics map.
