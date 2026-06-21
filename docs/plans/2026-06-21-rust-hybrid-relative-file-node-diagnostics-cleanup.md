# Rust-Hybrid Relative File-Node Diagnostics Cleanup

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Relative JS source specifier burndown closeout:
  `docs/benchmarks/2026-06-21-relative-js-source-specifier-burndown-closeout-decision.md`

## Context

The relative JS source specifier burndown kept the bounded Rust resolver
fallback for explicit runtime JS specifiers:

- `.js` -> TypeScript / TSX / module source candidates when the literal JS
  target is absent;
- literal JS targets still win;
- alias, workspace, package, asset, dynamic import, and symbol-level behavior
  were intentionally unchanged.

That slice removed the large code-target `relative/target-not-found` gap, but
left a smaller `relative/file-node-not-found` bucket:

- current repo: 1 sampled residual, `../package.json`;
- VS Code sparse checkout: sampled residuals are dominated by `.css` imports.

This residual is diagnostically different from a missing source-code target.
It usually means Rust found a path-like target, but the graph does not contain a
code file node for it. For `.css` and many `.json` targets, that is expected:
they are real project inputs, but not JS/TS code graph targets in this phase.

## Goal

Make Rust-hybrid import fallback diagnostics explain non-code relative targets
at the profile source, then make the taxonomy artifact classify them by
actionability.

The goal is a cleaner decision signal:

- code-target resolver gaps remain visible;
- non-code asset/config targets are explainable;
- no graph edge is created for `.css`, `.json`, or other non-code imports;
- default user behavior remains unchanged.

## Non-Goals

- Do not resolve `.css`, `.json`, `.jsonc`, `.wasm`, `.svg`, or other non-code
  targets into graph edges.
- Do not change Rust import resolution results.
- Do not change alias, tsconfig path, workspace package, package import, or
  dynamic import behavior.
- Do not change database schema.
- Do not change public CLI, SDK, MCP, README, or release notes.
- Do not claim performance improvement.
- Do not require RSS availability.

## Diagnostics Contract

Keep the existing fallback `reason` values compatible. In particular, do not
rename `file-node-not-found` in this slice.

For fallback samples where Rust has enough information to describe the target,
add privacy-safe factual metadata:

- `targetExtension`: extension such as `.css`, `.json`, `.ts`, or `.tsx`;
- `targetKind`: an actionability-oriented kind such as:
  - `asset` for stylesheet/image/font/wasm-like imports;
  - `config` for JSON/YAML/TOML-like imports;
  - `source` for supported source-code extensions;
  - `unknown` when the target cannot be classified confidently.

These fields are diagnostic metadata only. They do not imply a stable public API
and do not authorize writing a graph edge.

## Taxonomy Contract

Update the import target taxonomy diagnostic so profile-mode classification can
prefer the new factual metadata when present.

Required categories:

- `nonCodeAssetTarget`
- `nonCodeConfigTarget`
- existing source-related categories such as `supportedSourceSpecifier`
- existing fallback categories for unknown, unsupported, extensionless, query,
  hash, and suspicious paths where applicable

The classification should answer: "is this a resolver blocker, a non-code
target we should leave out of the graph, or a candidate for a later feature?"

## Validation

Required deterministic tests:

- Rust profile samples preserve the existing `reason: file-node-not-found`.
- Rust profile samples include `targetKind` / `targetExtension` for non-code
  relative targets where possible.
- Profile samples remain source-content-free.
- The taxonomy script classifies profile samples with new metadata as
  `nonCodeAssetTarget` / `nonCodeConfigTarget`.
- Existing taxonomy behavior still works when metadata is absent.

Required evidence:

- Rerun current repo targeted profile/taxonomy evidence.
- Rerun VS Code sparse targeted profile/taxonomy evidence.
- Evidence sidecars must record wall time and RSS or `rssUnavailableReason`.
- Closeout must compare the residual `relative/file-node-not-found` bucket
  before and after and state whether it is a resolver blocker, a diagnostics
  known-boundary, or a follow-up feature candidate.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. #359 Add Rust profile target metadata for `file-node-not-found` fallback
   samples.
2. #360 Classify non-code target fallback samples in the import target
   taxonomy.
3. #361 Rerun current repo and VS Code sparse fallback diagnostics evidence.
4. #362 Close out relative `file-node-not-found` diagnostics cleanup.
