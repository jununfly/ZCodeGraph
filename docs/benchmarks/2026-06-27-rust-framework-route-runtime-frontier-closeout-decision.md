# Rust Framework Route Runtime Frontier Closeout Decision

Date: 2026-06-27

## Scope

This is an explore-only closeout slice for `1-5-5. Framework route and runtime semantics beyond bounded Axum` in the Rust language indexing roadmap.

The goal is to classify Rust framework route/runtime semantics beyond the current bounded Axum route slice and decide whether the current roadmap should continue into more implementation work.

## Decision

Status: completed with taxonomy; no immediate implementation required.

The current Rust language indexing roadmap should close `1-5-5` as a semantic frontier classification, not open a new Actix/Rocket/Tauri/Leptos implementation slice inside this roadmap.

Future framework work should be started only as a bounded, explicitly scoped slice when the route/runtime pattern is repo-local, AST-visible, and can fail closed.

## Classification Axis

Classify Rust framework support by route/static extractability versus runtime/oracle dependency.

Framework names are examples. They are not the primary planning unit. The primary question is whether the graph fact can be extracted from source without evaluating runtime behavior, expanding proc macros, or requiring framework-specific execution.

## Safe-ish Exploit Candidates

These can become future bounded implementation slices when a real corpus and deterministic fixture justify them:

- Repo-local static builder-chain routes where the path literal and handler symbol are AST-visible.
- Repo-local attribute routes where the route attribute and handler function are both source-visible and uniquely paired.
- Route nodes and handler edges that can be guarded by unique same-file or repo-local symbol candidates.
- Diagnostics for route patterns that look framework-like but cannot be safely written.

Examples:

- Current bounded Axum static route wiring.
- Potential future Actix/Rocket attribute-route slice, if limited to source-visible handler functions and fail-closed guards.

## Needs Oracle / Research

These should not write graph edges without a stronger semantic oracle:

- Proc-macro-generated routes.
- Macro-generated handlers or router modules.
- Runtime route registry or plugin systems.
- Middleware stack semantics.
- Async runtime/task flow.
- Typed extractor/data-flow semantics.
- Framework behavior that requires rustc, rust-analyzer, framework metadata, or runtime execution to know the effective graph.

Reasoning: partial runtime coverage is worse than none. A half-bridged route/runtime flow can encourage an agent to over-trust an incomplete path and then fall back to Read/Grep to repair it manually.

## Defer / No-go For This Roadmap

These are explicitly out of scope for the current Rust language indexing roadmap:

- Full Rust web framework matrix.
- Tauri command/runtime wiring.
- Leptos/Yew frontend reactive runtime flow.
- Generic async task causality.
- Middleware/request extractor data-flow.
- Macro expansion.
- Cargo/rustc-backed semantic oracle integration.

These may be reopened by a future PRD or roadmap if the product goal shifts from Rust language indexing to a specific Rust framework sufficiency target.

## Current Evidence

### Axum Deterministic Fixture

Command:

```bash
cargo test -p zcodegraph-core rust_core_classifies_axum_route_taxonomy_and_writes_guarded_handler_edge -- --nocapture
```

Result:

```text
test tests::rust_core_classifies_axum_route_taxonomy_and_writes_guarded_handler_edge ... ok
```

Interpretation:

- The existing bounded Axum slice remains healthy.
- Static route-to-handler wiring can be implemented safely when path and handler candidates are AST-visible and uniquely resolved.

### mini-redis Smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Command:

```bash
target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --force
```

Result:

```json
{
  "success": true,
  "filesIndexed": 28,
  "filesSkipped": 0,
  "filesErrored": 0,
  "nodesCreated": 320,
  "edgesCreated": 315,
  "durationMs": 93,
  "rustAxumRouteTaxonomyCounts": {}
}
```

Interpretation:

- Real Rust indexing still succeeds after the semantic frontier work.
- mini-redis is not an Axum/framework route corpus; it functions here only as a real-repo Rust indexing sanity check.
- No new framework implementation should be inferred from this smoke.

## Recommended Future Candidates

If framework work resumes later, use this order:

1. Actix/Rocket attribute route taxonomy and guarded handler pairing, only for source-visible handler functions.
2. Route-like macro/proc-macro taxonomy hardening, diagnostic-only.
3. Framework-specific oracle research if a product goal requires runtime-accurate route graphs.

Do not start with runtime flow, middleware flow, or typed extractor data-flow. Those need a separate oracle/research plan.

## Closeout

`1-5-5. Framework route and runtime semantics beyond bounded Axum` is complete for this roadmap.

The Rust language indexing roadmap now has its semantic frontier classified across module visibility, trait dispatch, macro/generated code, Cargo/cfg conditions, and framework route/runtime semantics.
