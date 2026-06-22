# Rust-Hybrid Import/File-Level Resolver Completion Plan Part 1

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- PlanB final closeout:
  `docs/benchmarks/2026-06-22-resolver-semantic-planb-final-closeout.md`
- FileNodes handoff:
  `docs/benchmarks/2026-06-22-filenodes-routing-residual-audit.md`
- Prior file/import target plans:
  - `docs/plans/2026-06-20-rust-hybrid-js-ts-file-import-target-parity.md`
  - `docs/plans/2026-06-21-rust-hybrid-relative-import-target-taxonomy-and-burndown.md`
  - `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-gap-burndown.md`
  - `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-multiple-taxonomy.md`

## Route

This is **Import/File-Level Resolver Completion Plan Part 1**.

The full Import/File-Level Resolver Completion route has two parts:

1. **Part 1: Repo-local source import/file resolver completion**
   - relative imports;
   - tsconfig/jsconfig paths aliases;
   - same-file export specifiers;
   - direct named import/export binding;
   - one-hop direct re-export/barrel behavior;
   - FileNodes/source-file fallback interactions;
   - repo-local fallback taxonomy and burndown.

2. **Part 2: Package/runtime resolver completion**
   - package imports;
   - Node/runtime builtins;
   - package `exports`/`imports`;
   - `node_modules` package graph;
   - TypeScript full `moduleResolution`;
   - third-party type package boundaries.

Part 2 is explicitly not solved by Part 1. Part 1 closeout must create or
reference a Part 2 tracker so future agents do not mistake package/runtime
resolution as permanently out of scope.

## Goal

Complete the repo-local import/file-level resolver route for `rust-hybrid`.

Completion means:

- current repo-local import/file residuals are mapped;
- one or more bounded repo-local residuals are implemented or no-goed;
- FileNodes handoff is resolved inside the repo-local import/file route;
- supported ESM/import-export repo-local residuals are either closed, no-goed,
  or handed to a more specific architecture route;
- package/runtime resolution is explicitly handed to Part 2;
- final closeout states whether Part 1 is complete and updates #165.

## Allowed Production Changes

Part 1 may change default `rust-hybrid` behavior only inside repo-local source
resolution.

Allowed:

- relative import file target burndown;
- tsconfig/jsconfig paths alias file target burndown;
- same-file `export { foo }` binding;
- direct ESM named import/export binding;
- one-hop direct repo-local re-export/barrel behavior;
- FileNodes/source-file fallback integration;
- fallback taxonomy improvements for repo-local target-not-found,
  file-node-not-found, and unsupported local import forms.

Disallowed:

- package imports;
- Node/runtime builtins;
- `node_modules`;
- package `exports`/`imports`;
- TypeScript full `moduleResolution`;
- default imports, namespace imports, or type-only imports unless explicitly
  selected as a bounded repo-local slice in a later approved plan;
- multi-hop barrel chains unless explicitly selected in a later approved plan;
- source-order or pick-first target selection;
- broad disambiguation;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- SQLite schema changes.

## Validation Contract

Every implementation slice must include:

- deterministic fixture coverage for the selected repo-local import/file
  behavior;
- positive and fallback/no-go cases;
- current repository targeted profile/status;
- VS Code sparse targeted profile/status when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- no automatic clone when VS Code sparse is unavailable;
- fallback taxonomy movement;
- graph-readable status;
- RSS or unavailable reason;
- closeout decision: `keep`, `no-go`, `handoff-to-Part2`, or
  `needs-architecture`.

Not required by default:

- full scoreboard;
- agent A/B;
- README metric update;
- release/package smoke;
- multi-run benchmark proof.

## Hard Guardrails

1. Part 1 must not silently solve or dismiss package/runtime resolution.
   Package/runtime behavior belongs to Part 2 and must be tracked.

2. No semantic shortcut for speed.
   Do not use source-order, pick-first, or broad disambiguation behavior to
   reduce fallback counts.

3. Repo-local only.
   Production changes must stay within repo-local source import/file resolver
   semantics.

4. Evidence before closeout.
   Every slice needs fixture evidence plus targeted profile/status evidence.

5. Preserve explainability.
   Fallback taxonomy must become clearer or stay explainable. Unknown fallback
   movement is a blocker.

## Slice Sequence

### 1. Completion Map And Fallback Taxonomy Baseline

Purpose:

- freeze Part 1 and Part 2 boundaries;
- map current repo-local, package/runtime, and unsupported import/file
  fallback buckets;
- establish profile/status fields used by all later slices.

Acceptance criteria:

- completion map artifact exists;
- package/runtime resolution is explicitly assigned to Part 2;
- current repo and VS Code sparse baseline profile/status are recorded when
  available;
- fallback taxonomy separates repo-local, package/runtime, unsupported, and
  unknown buckets;
- first implementation target is selected.

### 2. File-Level Import Target Burndown

Purpose:

- reduce or no-go one bounded repo-local file-level import target fallback
  category;
- focus on relative and paths-alias source target lookup only.

Acceptance criteria:

- selected category is named before implementation;
- deterministic fixture covers positive and fallback/no-go cases;
- default `rust-hybrid` behavior changes only for repo-local source resolution;
- current repo and VS Code sparse evidence are recorded when available;
- package/runtime imports remain Part 2 taxonomy, not silently resolved.

### 3. Direct ESM Named Import/Export Residual Burndown

Purpose:

- close or no-go one bounded repo-local direct ESM named import/export residual;
- reuse existing relative/path-alias resolver boundaries;
- avoid default, namespace, type-only, package, and multi-hop behavior.

Acceptance criteria:

- selected direct named binding residual is named before implementation;
- deterministic fixture covers direct named import/export positive and fallback
  cases;
- current repo and VS Code sparse evidence are recorded when available;
- fallback taxonomy movement is explainable;
- no broad disambiguation or source-order tie-break is introduced.

### 4. One-Hop Barrel/Re-Export Residual Burndown

Purpose:

- close or no-go one bounded repo-local one-hop direct re-export/barrel
  residual;
- keep final target semantics explicit and avoid multi-hop chains.

Acceptance criteria:

- one-hop residual category is named before implementation;
- deterministic fixture proves final leaf target behavior or records no-go;
- current repo and VS Code sparse evidence are recorded when available;
- package/runtime re-exports remain Part 2 or unsupported taxonomy;
- no multi-hop barrel chain behavior is introduced.

### 5. Source-File Fallback And FileNodes Integration Closeout

Purpose:

- resolve the FileNodes handoff from PlanB inside the repo-local import/file
  route;
- decide whether FileNodes/source-file fallback is `keep`, `no-go`,
  `handoff-to-Part2`, or `needs-architecture`.

Acceptance criteria:

- FileNodes/source fallback artifact exists;
- evidence uses the same profile/status contract as implementation slices;
- current repo and VS Code sparse evidence are recorded when available;
- decision explains interaction with unresolved file-level import target
  taxonomy;
- no package resolution expansion is introduced.

### 6. Part 1 Final Closeout And Part 2 Tracker

Purpose:

- close Part 1;
- create or reference Part 2 tracker for package/runtime resolver completion;
- update #165.

Acceptance criteria:

- Part 1 final closeout artifact exists;
- all Part 1 slices are linked with decisions;
- repo-local residuals are classified as closed/keep, no-go,
  handoff-to-Part2, or needs-architecture;
- Part 2 tracker exists or is explicitly referenced;
- package/runtime resolution is not treated as solved;
- #165 is updated with Part 1 status and next route.

