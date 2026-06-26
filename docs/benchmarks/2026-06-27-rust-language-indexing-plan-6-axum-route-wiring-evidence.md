# Rust Language Indexing Plan 6 Axum Route Wiring Evidence

Date: 2026-06-27

Roadmap node: `1-4-5. Rust web framework route wiring candidates`

Issues: #586, #587, #588, #589

## Decision

Plan 6 implements a bounded Axum explicit router-call slice in the Rust core.
It recognizes static route calls shaped like:

```rust
Router::new().route("/path", get(handler).post(other_handler))
```

For static paths and simple handler identifiers, the Rust core creates `route`
nodes and emits guarded `references` edges to a handler only when the handler
candidate is repo-local and unique. Unsupported, dynamic, missing, or ambiguous
forms stay in taxonomy instead of guessing.

## Non-goals

- No Axum nesting composition.
- No middleware chain semantics.
- No fallback route ordering.
- No state or extractor modeling.
- No macro route expansion.
- No broad Rust web framework support beyond this Axum explicit-router slice.

## Deterministic synthetic fixture

Command:

```bash
cargo test -p zcodegraph-core rust_core_classifies_axum_route_taxonomy_and_writes_guarded_handler_edge -- --nocapture
```

Result:

```text
test tests::rust_core_classifies_axum_route_taxonomy_and_writes_guarded_handler_edge ... ok
```

Covered behavior:

- `Router::new().route("/users", get(list_users).post(create_user))`
  produces `GET /users` and `POST /users` route nodes.
- The route nodes write guarded `references` edges to unique repo-local
  handlers.
- Dynamic route paths are classified as deferred.
- Ambiguous handlers are classified as deferred and do not write handler edges.
- Closure handlers are classified as unsupported/deferred and do not write
  handler edges.
- `result_json` exposes `profile.rustAxumRouteTaxonomyCounts`.

Observed taxonomy in the fixture:

```text
axum-route-call-detected = 4
axum-route-static-path = 3
axum-route-dynamic-path-deferred = 1
axum-route-method-wrapper-detected = 4
axum-route-handler-candidate-unique = 2
axum-route-handler-candidate-ambiguous-deferred = 1
axum-route-handler-unsupported-deferred = 1
axum-route-handler-edge-written = 2
```

## Rust semantic regression guardrail

Command:

```bash
cargo test -p zcodegraph-core rust_core_ -- --nocapture
```

Result:

```text
11 passed; 0 failed
```

This covers the existing Rust baseline, module path, trait/impl, Cargo
workspace, macro taxonomy, and the new Axum route wiring slice.

## mini-redis smoke

Corpus:

```text
/private/tmp/codegraph-corpus/mini-redis
```

Command:

```bash
rm -rf /private/tmp/codegraph-corpus/mini-redis/.zcodegraph
target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --force
```

Result:

```text
success=true
filesIndexed=28
filesSkipped=0
filesErrored=0
nodesCreated=320
edgesCreated=315
durationMs=99
rustAxumRouteTaxonomyCounts={}
```

DB spot-check:

```text
enum|6
enum_member|24
file|28
function|40
import|82
method|109
struct|26
type_alias|5
rust-finalization edges = 23
```

`rustAxumRouteTaxonomyCounts` is empty for mini-redis, which is expected
because mini-redis is not an Axum router corpus. The smoke still proves the
existing Rust indexing path remains healthy after the Axum slice.

## RSS

RSS is unavailable in the current sandbox for `/usr/bin/time -l`; the command
fails with:

```text
time: sysctl kern.clockrate: Operation not permitted
```

This is recorded as an environment limitation, not a Plan 6 blocker.

## Closeout

Plan 6 is complete for the bounded Axum explicit route wiring slice. It provides
deterministic syntax taxonomy, unique handler candidate resolution, guarded route
edge writing, result JSON diagnostics, and mini-redis regression smoke evidence.

Remaining work should be planned separately if needed:

- Axum nesting and fallback semantics.
- Axum middleware chain modeling.
- Axum state/extractor semantic modeling.
- Attribute-macro route frameworks such as Rocket or Actix.
