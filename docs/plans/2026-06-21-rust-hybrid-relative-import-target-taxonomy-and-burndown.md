# Rust-Hybrid Relative Import Target Taxonomy and Burndown

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior JS/TS file import target parity plan:
  `docs/plans/2026-06-20-rust-hybrid-js-ts-file-import-target-parity.md`
- Prior closeout:
  `docs/benchmarks/2026-06-20-rust-hybrid-js-ts-file-import-target-parity-closeout-decision.md`

## Context

The JS/TS file import target parity slice added Rust-owned support for
conventional aliases and workspace package subpaths, but the VS Code sparse
closeout showed that corpus did not exercise those paths. The large remaining
file-target gap is now more specifically attributable to relative import target
misses:

- `unresolved-file-level-import-target`: 64,429
- `importPathAliasFallbackBySource.relative`: 64,191

Before adding another resolver expansion, we need to know what these relative
misses actually are. Some may be low-risk code-target gaps in the Rust resolver.
Others may be asset imports, bundler semantics, sparse-checkout missing files,
dynamic imports, package semantics, or intentionally unsupported forms.

## Goal

Create a data-driven taxonomy of JS/TS relative unresolved import targets, then
attempt exactly one bounded burndown if the taxonomy identifies a low-risk
code-target category.

This is a feature-completeness and resolver-migration readiness slice, not a
performance optimization slice. The expected output is trustworthy evidence:
either a keepable narrow fix with before/after movement, or a clear no-go that
prevents speculative resolver expansion.

## Non-Goals

- Do not implement package `exports`, `main`, conditional exports, or npm
  package resolution.
- Do not resolve `.css`, `.json`, `.wasm`, `.svg`, or other non-code asset
  imports into graph nodes.
- Do not model bundler loader semantics.
- Do not treat sparse-checkout missing files as resolver bugs.
- Do not implement dynamic or template import resolution.
- Do not change binding-level symbol disambiguation.
- Do not change SQLite schema.
- Do not add taxonomy output to `status`, `doctor`, README, or public API.
- Do not run full scoreboard or agent A/B validation.
- Do not require wall-clock performance improvement as a success gate.

## Taxonomy Script

Add an internal benchmark/diagnostic script:

- `scripts/rust-import-target-taxonomy.mjs`

The script should:

- read a built `.zcodegraph/zcodegraph.db` or an explicit DB path;
- inspect only database metadata from `unresolved_refs`;
- filter JS/TS import unresolved references whose `reference_name` starts with
  `./` or `../`;
- output deterministic JSON and markdown artifacts under `docs/benchmarks/`;
- include enough grouping to choose a bounded code-target burndown or record a
  no-go.

Allowed input fields:

- `unresolved_refs.reference_name`
- `unresolved_refs.file_path`
- `unresolved_refs.language`
- `unresolved_refs.line`
- `unresolved_refs.col`

The script must not read source files. It may use path metadata and existing DB
metadata only.

## Candidate Categories

The taxonomy should separate at least these cases when possible from metadata:

- supported source extension candidate missing;
- extensionless relative path that likely maps to a supported source file;
- directory or `index` candidate shape;
- query/hash suffix such as `./x?raw` or `./x#fragment`;
- declaration-only or `.d.ts` target shape;
- asset-like target extension;
- unsupported extension;
- suspicious path normalization shape;
- dynamic/template/non-literal-like import name if present in DB;
- sparse-checkout or target-missing-likely bucket;
- unknown.

This taxonomy is intentionally approximate. It should be good enough to choose a
bounded next move, not to certify semantic correctness.

## Bounded Burndown Rules

Only implement a fix if the taxonomy identifies a low-risk code-target class.
Allowed classes:

- supported source extension candidate missing;
- path normalization bug;
- query/hash suffix stripping where the stripped target is a supported source
  file;
- `.d.ts` or declaration-only target if clear and already represented.

Disallowed classes:

- asset imports;
- bundler loader semantics;
- package `exports` / `main`;
- sparse-checkout missing files;
- dynamic/template imports;
- symbol-level disambiguation;
- any behavior that would add non-code asset imports to the graph.

If no allowed class is clearly worth attempting, the implementation issue should
close with a no-go decision and no production behavior change.

## Validation

Required deterministic coverage:

- taxonomy script output is stable for a small fixture database;
- selected bounded fix, if any, has a targeted integration test;
- no asset import target is added as a graph edge;
- existing relative import and tsconfig/jsconfig paths behavior remains intact.

Required targeted evidence:

- existing VS Code sparse DB taxonomy artifact before implementation;
- selected category decision or no-go note;
- current-repo targeted profile/smoke after the bounded attempt;
- VS Code sparse targeted profile after the bounded attempt;
- RSS or unavailable reason;
- closeout decision comparing fallback taxonomy and relative import target
  taxonomy before/after.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

Performance numbers are evidence, not a gate. The success gate is whether the
taxonomy and bounded attempt produce a defensible trend/no-go conclusion.

## Issue Sequence

1. Add the relative import target taxonomy script.
2. Run VS Code sparse taxonomy and choose one bounded category.
3. Implement one bounded relative import target burndown, or record no-go.
4. Run closeout evidence for relative import target taxonomy and burndown.
