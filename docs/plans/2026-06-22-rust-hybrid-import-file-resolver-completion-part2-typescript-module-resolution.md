# Rust-Hybrid Import/File Resolver Completion Part 2: TypeScript Module Resolution

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Part 2 tracker: #430
- Part 1 plan:
  `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part1.md`
- Part 1 closeout:
  `docs/benchmarks/2026-06-22-import-file-resolver-completion-part1-final-closeout.md`

## Route

This is **Import/File-Level Resolver Completion Plan Part 2**.

Part 1 completed repo-local source import/file resolver behavior:

- relative imports;
- tsconfig/jsconfig paths aliases;
- same-file export specifiers;
- direct named import/export;
- one-hop direct re-export/barrel behavior;
- FileNodes/source-file fallback interaction.

Part 2 owns the package/runtime side of TypeScript module resolution:

- package imports;
- Node/runtime builtins;
- package `exports`/`imports`;
- `node_modules` package graph boundaries;
- TypeScript full `moduleResolution`;
- third-party type package boundaries;
- package/runtime re-export behavior.

## Goal

Use TypeScript full `moduleResolution` as the north star, but execute it in
bounded, evidence-driven slices.

This plan should not attempt a broad resolver rewrite. It should:

1. build a TypeScript compiler API oracle diagnostic map;
2. compare oracle results against current Rust fallback/result behavior;
3. recommend how many follow-up slices are needed and what each slice should
   target;
4. complete two oracle-selected repo-local implementation slices when evidence
   supports them;
5. complete one package/runtime boundary taxonomy slice;
6. close with a decision that states what remains for the next plan.

## Strategy

The TypeScript compiler API is the semantic oracle for this plan, but it is not
part of the production runtime path.

Use it only in benchmark/evidence tooling in this plan:

- keep `typescript` as a devDependency;
- do not move `typescript` into production dependencies;
- do not call the compiler API from default `rust-hybrid` indexing;
- do not require users to install TypeScript for the CLI path.

The oracle should classify only Rust fallback package/runtime samples by
default. It should not scan all imports unless a later plan explicitly expands
scope.

## Oracle Artifact Contract

The oracle diagnostic artifact must include:

- repo-relative source file path;
- language;
- line/column;
- import specifier;
- Rust current fallback reason or current target when available;
- TypeScript compiler resolved kind;
- TypeScript resolved path when available;
- whether the resolved path is repo-local;
- delta bucket;
- recommended implementation slice;
- recommended total slice count for completing the observed package/runtime
  residuals.

The artifact may include import specifiers and repo-relative paths.

The artifact must not include:

- source content;
- source slices;
- full source lines;
- candidate source text;
- private absolute paths except explicitly documented corpus roots.

## Slice Ordering Principle

The oracle can report sample counts, but implementation priority is not pure
count order.

Sort implementation recommendations by:

1. repo-local graph target availability;
2. expected agent sufficiency value;
3. semantic risk;
4. sample volume.

This prevents high-volume low-value imports such as test framework packages or
Node builtins from crowding out repo-local package resolution work.

## Allowed Production Changes

Production code changes are allowed only for oracle-selected bounded
repo-local package/runtime slices.

Allowed examples:

- workspace package self-name imports when they resolve to repo-local source;
- package subpath imports when the target stays inside the repo;
- package `exports`/`imports` entries when they resolve to repo-local source;
- package/runtime taxonomy improvements that make status/profile evidence more
  precise.

Disallowed:

- moving `typescript` into runtime dependencies;
- default scanning or indexing of `node_modules`;
- source-order or pick-first target selection;
- broad disambiguation;
- SQLite schema changes;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- claiming package/runtime completion without oracle evidence.

## Validation Contract

Every implementation slice must include:

- deterministic fixture coverage for positive and fallback/no-go cases;
- current repository targeted profile/status evidence;
- VS Code sparse targeted profile/status evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- no automatic clone when VS Code sparse is unavailable;
- fallback taxonomy movement or explicit no-go;
- graph-readable status;
- RSS or unavailable reason;
- closeout decision: `keep`, `no-go`, `handoff-to-next-plan`, or
  `needs-architecture`.

Not required by default:

- full scoreboard;
- agent A/B;
- README metrics update;
- release/package smoke;
- multi-run benchmark proof.

## Hard Guardrails

1. Full `moduleResolution` is the target, not the first implementation step.
   This plan must not hide complexity by overclaiming partial behavior.

2. The TypeScript compiler oracle is evidence tooling only.
   It must not become production runtime behavior in this plan.

3. No `node_modules` graph expansion by default.
   Third-party packages and runtime builtins should become clearer taxonomy
   unless the oracle selects a repo-local target.

4. No source-order shortcuts.
   Candidate-multiple cases require explicit semantic decisions, not
   pick-first behavior.

5. Every production slice must be oracle-selected.
   If the oracle does not identify a safe repo-local slice, the implementation
   slice closes as no-go with evidence.

## Slice Sequence

### 1. TypeScript Module Resolution Oracle Diagnostic Map

Purpose:

- create a benchmark/evidence-only oracle using the TypeScript compiler API;
- run it only against Rust fallback package/runtime samples;
- compare TypeScript compiler resolution with Rust current fallback/result
  behavior;
- recommend how many slices are needed and what each slice should target.

Acceptance criteria:

- oracle artifact exists under `docs/benchmarks/`;
- current repo and VS Code sparse oracle maps are recorded when available;
- artifact includes classification plus Rust/TypeScript delta;
- artifact recommends slice count and per-slice goals;
- no production runtime dependency or default indexing behavior changes.

### 2. Oracle-Selected Repo-Local Package/Self-Name Slice

Purpose:

- implement or no-go the highest-priority repo-local package/self-name bucket
  selected by the oracle;
- focus on package imports that TypeScript resolves to source inside the repo.

Acceptance criteria:

- selected bucket is named before implementation;
- deterministic fixture covers positive and fallback/no-go cases;
- production behavior changes only for repo-local source targets;
- current repo and VS Code sparse targeted evidence are recorded when
  available;
- package/runtime taxonomy remains explainable.

### 3. Oracle-Selected Package `exports`/`imports` Repo-Local Slice

Purpose:

- implement or no-go the highest-priority package `exports`/`imports` bucket
  selected by the oracle;
- only resolve entries that land on repo-local source files.

Acceptance criteria:

- selected `exports`/`imports` bucket is named before implementation;
- deterministic fixture covers conditional success and fallback/no-go cases;
- no `node_modules` graph expansion is introduced;
- no source-order fallback is introduced;
- current repo and VS Code sparse targeted evidence are recorded when
  available.

### 4. Node/Runtime And Third-Party Boundary Taxonomy Slice

Purpose:

- make package/runtime boundary diagnostics precise enough that agents and
  future plans can distinguish runtime builtins, third-party packages, and
  repo-local package misses;
- avoid pretending third-party package imports are repo-local graph gaps.

Acceptance criteria:

- Node/runtime builtin taxonomy exists;
- third-party package taxonomy exists;
- package subpath taxonomy exists;
- current repo and VS Code sparse targeted evidence are recorded when
  available;
- no default third-party package or `node_modules` deep resolution is added.

### 5. Part 2 Closeout And Next Plan Recommendation

Purpose:

- close this Part 2 plan;
- summarize oracle findings, implementation decisions, no-go buckets, and
  remaining full `moduleResolution` gap;
- recommend the next plan and issue sequence.

Acceptance criteria:

- final closeout artifact exists under `docs/benchmarks/`;
- all slices are linked with decisions;
- remaining package/runtime residuals are classified as closed/keep, no-go,
  handoff-to-next-plan, or needs-architecture;
- #430 and #165 are updated;
- the closeout does not claim full TypeScript module resolution unless the
  evidence actually supports it.

## Expected Outcome

This plan should produce:

- a replayable TypeScript compiler oracle map;
- one or two bounded repo-local package/runtime behavior improvements when
  evidence supports them;
- clearer taxonomy for Node/runtime and third-party package boundaries;
- a concrete estimate of how many additional slices are needed to finish the
  observed package/runtime resolver residuals.

If the oracle shows no safe repo-local package/runtime implementation bucket,
the plan still succeeds by producing a trustworthy no-go decision and a sharper
next-plan route.
