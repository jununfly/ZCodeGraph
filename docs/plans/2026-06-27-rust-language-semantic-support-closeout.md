# Rust Language Semantic Support Closeout

Date: 2026-06-27

Branch: `codex/rust-language-semantic-support-prd`

Related PRD: `docs/prds/2026-06-26-rust-language-semantic-support.md`

Related feedback: #565

## Status

Completed for the bounded Rust language semantic support branch.

This closeout consolidates the completed roadmap, plan notes, evidence artifacts,
and no-go decisions from the Rust language indexing work. The previous roadmap
and per-slice process artifacts were useful while the work was active, but this
document is now the durable navigation artifact.

## Product Boundary

`rust-hybrid` remains the indexing engine path. It means the default indexing
path uses the Rust-backed core for Rust-owned languages and falls back to the
mature TypeScript indexer for the rest of the supported source set.

Rust language semantic support is separate. It describes how well ZCodeGraph can
answer Rust programming-language questions about `.rs` files. This branch
improves that support, but it does not claim compiler-grade Rust semantics.

## Completed Roadmap

The completed roadmap had 80 nodes:

- completed: 80
- pending: 0
- in progress: 0
- blocked: 0
- decisions recorded: 104

Top-level roadmap:

```text
[x] 1. Rust Language Indexing Support
├── [x] 1-1. Rust language support baseline and taxonomy
├── [x] 1-2. Rust core ownership for .rs files
├── [x] 1-3. Rust release validation and product surface
├── [x] 1-4. Rust semantic graph slices
└── [x] 1-5. Rust language semantic frontier after Plan 6
```

The roadmap is no longer kept as a live JSON/Markdown pair because all nodes are
closed and the reusable decisions are consolidated here.

## Implemented Slices

### 1. Rust-owned `.rs` baseline

Rust core now recognizes `.rs` files, parses them with `tree-sitter-rust`, and
extracts baseline Rust symbols, imports, and basic call references.

Included:

- Rust files are Rust-owned under `rust-hybrid`;
- baseline symbols include functions, methods, structs, enums, enum variants,
  traits, type aliases, imports, and basic calls;
- status/doctor/profile diagnostics include Rust-owned `.rs` state;
- `.rs` files no longer use same-language TypeScript fallback.

Validation:

- `npm run build`
- `cargo test --package zcodegraph-core`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/sdk-rust-hybrid.test.ts`
- `npx vitest run __tests__/rust-hybrid-doctor.test.ts`
- mini-redis real-repo smoke

### 2. Repo-local module path resolution

Rust core now resolves direct repo-local module declarations and simple module
paths without routing `.rs` same-language semantics through the TypeScript
resolver.

Included:

- `mod foo;` / `pub mod foo;` to `foo.rs` or `foo/mod.rs`;
- `crate::`, `self::`, and `super::` file-level dependencies;
- sibling qualified references such as `helper::run()` when the target is
  repo-local and unique;
- taxonomy for missing, ambiguous, or unsupported targets.

Deferred:

- Cargo package/dependency resolution;
- `#[path] mod` attributes;
- `pub use` chains;
- glob imports;
- feature/cfg-aware module variants.

### 3. Trait definition and impl relationships

Rust core now exposes bounded trait/impl structure and guards unsupported
semantic edges.

Included:

- trait/impl taxonomy;
- `Type implements Trait` structural edges only for high-confidence local
  candidates;
- impl-method to trait-method declaration `references` edges only when the
  relation and method name are unique;
- fail-closed taxonomy for generic, blanket, where-clause, cfg-affected,
  cross-crate, ambiguous, unsupported, and missing-method cases.

Deferred:

- `dyn Trait` dispatch;
- generic inference;
- associated type resolution;
- rustc/cargo metadata oracle;
- macro-expanded impl exactness;
- cross-crate trait exactness.

### 4. Cargo workspace, package, feature, and cfg diagnostics

Rust core now exposes package/workspace and cfg diagnostics without claiming
active Cargo resolution.

Included:

- Cargo package/workspace metadata taxonomy;
- Rust file package and crate-root ownership diagnostics;
- workspace-local crate candidate taxonomy;
- condition-source diagnostics such as feature-gated, target-gated, test/doc
  only, cfg_attr, and conditionally-present Rust items;
- conditional semantic edge suppression diagnostics.

Deferred:

- active cfg evaluation;
- feature unification;
- target triple exactness;
- Cargo resolver compatibility;
- `cargo metadata` integration;
- external dependency graph expansion;
- build script execution or generated source loading.

### 5. Macro/cfg and generated-code frontier

Rust core now makes macro/cfg risk visible while keeping graph writes
conservative.

Included:

- macro taxonomy for `macro_rules!`, function-like invocations, derive
  attributes, attribute macros, cfg/cfg_attr, and macro-affected semantic
  regions;
- generated-code no-go taxonomy for detectable `include!`, `OUT_DIR`, and
  `build.rs` patterns;
- no generated macro semantic edges are written by these diagnostics.

Deferred:

- macro expansion;
- cfg expression evaluation;
- generated source loading;
- build script execution;
- route graph facts generated only by macros.

### 6. Rust route wiring candidates

Rust core now supports bounded route facts only when they are source-visible and
fail-closed.

Included:

- Axum explicit `Router::new().route("/path", get(handler))` style route
  detection;
- source-visible Rust attribute routes such as `#[get("/path")]`,
  `#[post("/path")]`, and `#[route("/path", method = "...")]`;
- guarded route-to-handler edges only when the handler candidate is repo-local
  and unique;
- route-like macro/proc-macro taxonomy without graph writes.

Deferred:

- proc-macro-generated routes;
- runtime route registries;
- middleware stack semantics;
- async runtime/task flow;
- typed extractor/data-flow semantics;
- full Rust web framework matrix.

### 7. Visibility guarded scoped symbol edges

Rust core now fails closed before writing cross-module scoped symbol edges when
coarse visibility does not support the edge.

Included:

- coarse Rust symbol visibility persistence;
- cross-module scoped symbol edge guard;
- taxonomy for private, unknown, unsupported, and `pub(in ...)` cases;
- same-file edges remain unaffected.

Deferred:

- `pub use` expansion;
- external crate privacy;
- macro/cfg generated module semantics;
- full rustc privacy compatibility;
- exact `pub(in path)` reasoning.

## Real Repository Evidence

Primary corpus:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

Representative successful smoke results across the branch:

- Rust source files indexed: 28
- files skipped: 0
- files errored: 0
- graph size remained stable around 320 nodes and 315-539 edges depending on
  whether CLI hybrid status or Rust core direct indexing was measured
- Rust parse errors: 0 in the primary baseline smoke
- `.rs` files were Rust-owned
- TypeScript fallback was limited to non-Rust-owned files such as YAML in the
  mixed CLI path

RSS was captured outside the Codex sandbox for mini-redis:

```text
0.42 real
0.28 user
0.08 sys
136888320 maximum resident set size
32035088 peak memory footprint
```

Sandbox RSS attempts may report `sysctl kern.clockrate: Operation not
permitted`; that is an environment limitation, not an indexing failure.

### Deterministic Explore Probe

Named Rust question:

```text
How does the mini-redis server route the GET command to the get command handler? Command get apply
```

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node scripts/agent-eval/probe-explore.mjs \
  /private/tmp/codegraph-corpus/mini-redis \
  "How does the mini-redis server route the GET command to the get command handler? Command get apply"
```

Result:

- passed;
- output size: 12,658 characters;
- returned `src/cmd/get.rs` with `Get.apply`, `Get.parse_frames`,
  `Get.into_frame`, and `Get.new`;
- returned `src/cmd/mod.rs` with `Command.from_frame`, `Command.apply`, and the
  `Command::Get(Get::parse_frames(...))` / `Get(cmd) => cmd.apply(...)` path;
- returned surrounding server/subscription context without requiring a generic
  file read in the probe.

Interpretation:

This is deterministic `zcodegraph_explore` evidence for a named Rust code
question. It is not a stochastic multi-run agent A/B result and does not claim
full agent-stop behavior; it proves that the branch indexes and surfaces the
key Rust command-routing evidence through the normal Explore path.

## PRD Release Criteria

### Explicit support claims

Satisfied. README language distinguishes `rust-hybrid` engine ownership from
Rust programming-language semantic depth, and this closeout records implemented
bounded slices plus frontiers.

### Real Rust repository deterministic evidence

Satisfied for deterministic evidence. mini-redis was used as the real Rust
corpus throughout the branch. It validates Rust-owned `.rs` indexing, module
path behavior, conservative trait/macro/Cargo diagnostics, route slice
no-regression, status/doctor/profile evidence, and one named
`zcodegraph_explore` Rust command-routing probe.

No stochastic multi-run agent A/B is claimed for this PRD.

### Existing rust-hybrid language guardrails

Satisfied for the branch scope. The branch ran Rust core and CLI/SDK/doctor
guardrails while keeping JavaScript, TypeScript, Go, Python, and non-Rust-owned
fallback semantics unchanged in the relevant tests.

### Unsupported Rust semantic features produce taxonomy

Satisfied. Unsupported or unsafe Rust semantics are classified instead of
silently writing optimistic graph edges. This includes macro expansion,
generated code, cfg/feature semantics, cross-crate trait exactness, runtime
framework route graphs, and route-like proc macros.

## Durable Decisions

### Rust language support is not full compiler semantics

The completed branch improves Agent Sufficiency for Rust code, but it remains a
bounded static indexing implementation. It does not promise rustc-grade
semantics for macros, lifetimes, trait coherence, Cargo feature resolution, or
runtime framework behavior.

### Wrong graph edges are worse than missing graph edges

The branch consistently chose fail-closed guards and taxonomy for uncertain
Rust semantics. This is why many mini-redis trait and macro-related facts remain
diagnostic-only rather than being guessed as graph edges.

### Runtime-accurate framework graphs are no-go for this roadmap

Runtime-accurate Rust framework route graphs do not enter this roadmap or
near-term mainline implementation. Future work may reopen the area only through
a new PRD that first chooses an oracle path, such as rust-analyzer, rustc,
rustdoc, cargo metadata, framework metadata, or another explicit source of
truth.

### Future work starts from a PRD or bounded slice

Do not restart implementation directly from deferred taxonomy. Promote a
frontier into either:

- a new PRD when the product goal changes; or
- a bounded slice when the graph fact is repo-local, AST-visible, testable, and
  can fail closed.

## Remaining Frontiers

These are not blockers for this PRD. They are known semantic frontiers:

- full Rust compiler privacy compatibility;
- exact `pub(in path)` reasoning;
- `pub use` expansion and multi-hop re-export chains;
- external crate dependency graph semantics;
- active cfg and feature evaluation;
- macro expansion and generated symbols;
- rustc/rust-analyzer-backed semantic oracle;
- runtime route registries and framework lifecycle hooks;
- async runtime/task causality;
- typed extractor/data-flow semantics;
- full Rust web framework matrix.

## Issue Closeout

Roadmap implementation issues through #608 were closed or resolved by this
branch. Related feedback #565 should close with this conclusion:

- the released 0.10.0 diagnostic/docs mismatch was addressed on main in
  `5eac15a1`;
- the Rust semantic support gap was addressed on this branch within the bounded
  scope described above;
- remaining compiler/runtime-grade Rust semantics are explicitly frontiers, not
  hidden bugs in the completed roadmap.

## Process Artifact Consolidation

The following process artifacts were consolidated into this closeout and removed:

- per-slice Rust language indexing plan documents;
- per-slice Rust language indexing evidence documents;
- explore-only frontier decision artifacts;
- the completed roadmap JSON and Markdown view.

Future agents should start here and in the PRD rather than reconstructing the
branch from the deleted process files.
