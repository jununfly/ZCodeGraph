# Rust Attribute Route And Route Macro Evidence

Date: 2026-06-27

## Scope

This records the implementation evidence for the follow-up issues from the Rust framework route/runtime frontier closeout:

- #606 Rust Actix/Rocket attribute route guarded pairing slice
- #607 Rust route-like macro and proc-macro taxonomy hardening

#608 remains a ready-for-human oracle research decision and was not closed by this implementation.

## Implementation Summary

Rust core now supports a bounded source-visible attribute route slice:

- `#[get("/path")]`
- `#[post("/path")]`
- `#[put("/path")]`
- `#[delete("/path")]`
- `#[patch("/path")]`
- `#[head("/path")]`
- `#[options("/path")]`
- `#[route("/path", method = "...")]`

The implementation only writes graph facts when:

- the route attribute is source-visible,
- the path is a string literal,
- the next source-visible Rust function can be identified as the handler,
- finalization finds a unique repo-local handler symbol.

Ambiguous handlers, dynamic paths, unsupported handlers, and route-like macros stay diagnostic-only.

Rust route diagnostics now include generic route buckets alongside the existing Axum buckets:

- `rust-attribute-route-detected`
- `rust-attribute-route-static-path`
- `rust-attribute-route-dynamic-path-deferred`
- `rust-attribute-route-handler-missing-deferred`
- `rust-route-handler-candidate-unique`
- `rust-route-handler-candidate-missing-deferred`
- `rust-route-handler-candidate-ambiguous-deferred`
- `rust-route-handler-edge-written`
- `rust-route-like-proc-macro-deferred`
- `rust-route-like-function-macro-deferred`
- `rust-route-like-macro-generated-deferred`

## Non-goals Preserved

- No proc-macro expansion.
- No runtime route registry interpretation.
- No middleware flow.
- No async task flow.
- No typed extractor/data-flow.
- No framework-specific execution.
- No full Rust web framework matrix.

## Deterministic Tests

Commands:

```bash
cargo test -p zcodegraph-core rust_core_writes_guarded_attribute_route_handler_edges -- --nocapture
cargo test -p zcodegraph-core rust_core_classifies_route_like_macro_patterns_without_writing_edges -- --nocapture
cargo test -p zcodegraph-core rust_core_ -- --nocapture
cargo test -p zcodegraph-core
```

Results:

```text
test tests::rust_core_writes_guarded_attribute_route_handler_edges ... ok
test tests::rust_core_classifies_route_like_macro_patterns_without_writing_edges ... ok
test result: ok. 18 passed; 0 failed; 0 ignored; 81 filtered out
test result: ok. 99 passed; 0 failed; 0 ignored; 0 filtered out
```

## mini-redis Smoke

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
  "durationMs": 115,
  "rustAxumRouteTaxonomyCounts": {}
}
```

Interpretation:

- The new route scanner does not disturb mini-redis.
- The graph remains conservative for non-framework Rust code.
- Route-like macro/proc-macro patterns are visible as taxonomy, not graph truth.

## Decision

#606 and #607 are complete.

#608 should remain open as ready-for-human until the maintainer decides whether runtime-accurate Rust framework route graphs are a product goal and which oracle path, if any, is acceptable.
