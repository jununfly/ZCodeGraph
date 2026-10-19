# Go / Gin Route Ownership under Rust-Owned Indexing

Date: 2026-09-30
Roadmap: 1-6-3 Go/Gin 路由所有权检查
Mode: explore / acceptance (product code read-only; evidence = static trace + rust-bin probe)

## Question

Go is a member of `RUST_HYBRID_RUST_OWNED_LANGUAGES`, and unlike Python the
Rust core advertises first-class Gin route extraction. This node verifies
whether that Rust coverage actually matches the TypeScript `goResolver.extract`
surface (Gin / Chi / Echo / Fiber / gorilla-mux / net-http) end to end, so the
default `rust-hybrid` engine does not silently lose Go routes the way it lost
Python routes (see `2026-09-30-python-framework-sufficiency.md`).

## Ownership boundary (static link trace)

- `go` is rust-owned (`src/indexing/rust-hybrid-contract.ts`
  `RUST_HYBRID_RUST_OWNED_LANGUAGES`), so `.go` files never enter the TypeScript
  fallback set and `goResolver.extract` does not run for them on the
  `rust-hybrid` path.
- The Rust core implements Go route extraction in
  `crates/zcodegraph-core/src/lib.rs`:
  `extract_go_symbols` → `visit_go_node` → `extract_go_gin_route` →
  `parse_go_gin_route_call`, with `collect_go_gin_group_prefixes` for
  `router.Group("/prefix")` expansion and `collect_go_variable_types` for
  `&Handler{}` method handlers. Each match emits a `route` node, a
  file→route `contains` edge, and an unresolved `references` ref to the
  handler (resolved during finalization).
- The TS resolver `src/resolution/frameworks/go.ts` (`goResolver.extract`)
  uses one regex
  `\b\w+\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|Get|Post|Put|Patch|Delete|Handle|HandleFunc)\s*\(\s*"…"\s*,\s*…\)`,
  mapping `Handle/HandleFunc` to method `ANY`. It accepts any receiver (so
  group vars and subrouters match) but does **not** prepend group prefixes.

## Probe — one Go mini-fixture, both extractors

A single 34-line `main.go` (`.workbuddy/probe-go/ginapp/`, not committed)
covering eight source-level route markers: Gin `GET/POST/DELETE`, Gin
`OPTIONS/HEAD`, a grouped `v1.GET` under `r.Group("/api/v1")`, stdlib
`mux.HandleFunc`, and Chi-style `mux.Get`. Indexed with the built
`target/debug/zcodegraph-core.exe index --engine rust --force`, queried
directly in SQLite; the identical source fed to the real TS `goResolver.extract`
via an isolated CommonJS harness.

| # | Source marker | TS resolver | Rust core |
| --- | --- | --- | --- |
| 1 | `r.GET("/items", ListItems)` | `GET /items` | `GET /items` |
| 2 | `r.POST("/items", CreateItem)` | `POST /items` | `POST /items` |
| 3 | `r.DELETE("/items/:id", …)` | `DELETE /items/:id` | `DELETE /items/:id` |
| 4 | `r.OPTIONS("/opts", …)` | `OPTIONS /opts` | **missing** |
| 5 | `r.HEAD("/healthz", …)` | `HEAD /healthz` | **missing** |
| 6 | `v1.GET("/users", …)` under `Group("/api/v1")` | `GET /users` (prefix lost) | `GET /api/v1/users` |
| 7 | `mux.HandleFunc("/std", …)` | `ANY /std` | **missing** |
| 8 | `mux.Get("/chi", …)` (Chi) | `GET /chi` | **missing** |

Totals: **TS 8 routes, Rust 4 routes (50% recall on this fixture)**. 16 nodes /
15 edges / 0 parse errors from the Rust binary; the four routes each carry a
handler unresolved ref (`ListItems`, `CreateItem` ×2, `ListItems`).

## What this means

This is **not** the Python situation. Python had zero Rust route extraction;
Go already owns the Gin core in Rust and does group-prefix expansion more
accurately than the TS resolver (Rust yields `/api/v1/users`; TS yields the
bare `/users`). The Rust gap is three specific shapes:

1. **`OPTIONS` / `HEAD`** — `parse_go_gin_route_call` hard-codes
   `METHODS = ["GET","POST","PUT","DELETE","PATCH"]` (lib.rs), omitting the two
   remaining HTTP verbs Gin supports.
2. **Chi / Echo / Fiber idiomatic casing** — `Get/Post/Put/Patch/Delete`
   (exported-method style) are not matched; only uppercase verbs are.
3. **`net/http` + gorilla/mux `HandleFunc`/`Handle`** — the standard-library
   and gorilla forms (method-agnostic, should be recorded as `ANY`) are not
   matched. `frameworks.test.ts` already locks `router.HandleFunc` and a
   gorilla/mux subrouter `.HandleFunc(...).Methods("GET")` on the TS resolver,
   evidencing these are mainstream shapes, not edge cases.

The route→handler `references` edge resolution for Go is unchanged from other
rust-owned languages: the pure binary emits the route node + unresolved ref,
and the TypeScript-shell finalization links the edge. No Go parse errors
occurred, so this is purely an extractor-recall gap.

## Decision

Go/Gin route sufficiency **partially passes**: the Gin five-verb core and
group-prefix expansion are Rust-owned and correct (group paths are better than
TS), but `OPTIONS`/`HEAD`, Chi-style verbs, and stdlib/gorilla
`HandleFunc`/`Handle` are lost on the default rust-hybrid engine — roughly half
the TS surface. Because Go routing is already Rust-owned (and Rust owns the
more accurate group logic), the fix belongs in the **Rust core**, not in a
TypeScript finalize back-fill: extend `parse_go_gin_route_call` to accept
`OPTIONS`/`HEAD`, the Chi-cased verbs, and `HandleFunc`/`Handle` (→ `ANY`),
reusing the existing group-prefix path. A TS-shell back-fill like the Python
fix would duplicate the regex and forfeit the Rust group-prefix advantage, so
it is not recommended. Product code stays read-only in this acceptance node;
the product fix is dispatched to exploit node **1-6-3-1** (Rust extractor
extension + Rust unit tests + real rust-hybrid e2e covering gorilla/mux
chained `.Methods()` and grouped routes + 3-OS CI).

## Fix outcome (roadmap 1-6-3-1, 2026-09-30)

The fix landed in the Rust core as recommended (no TS-shell back-fill):

- `parse_go_gin_route_call` (lib.rs) replaced the hard-coded five-verb table
  with a 14-entry `VERB_SPELLINGS` list: Gin uppercase `GET/POST/PUT/DELETE/
  PATCH/OPTIONS/HEAD`, Chi title-case `Get/Post/Put/Patch/Delete` (canonicalized
  to uppercase), and `HandleFunc/Handle` → `ANY`. It selects the earliest verb
  marker in the call text; the needle includes the opening paren, so `.Handle(`
  can never match inside `.HandleFunc(` and a chained
  `s.HandleFunc("/x", h).Methods("GET")` records the registration verb (ANY),
  not the constraint verb. Group-prefix expansion and `&Handler{}` method
  handlers are unchanged.
- Five Rust unit tests lock the parser (seven verbs, Chi casing, stdlib/gorilla
  ANY + the gorilla chain, group-prefix for the new verbs, and negative
  non-route calls). `cargo test -p zcodegraph-core`: 124 passed.
- One engine-agnostic TS-shell `rust-hybrid` e2e in
  `frameworks-integration.test.ts` indexes a real temp Go module and asserts
  the route names plus route→handler `references` edges (including
  `listUsers` through the gorilla chain and the prefixed
  `GET /api/v1/users`). ci.yml step2 `-t` and the ci-rust-packaged-path
  contract were synced; no skips were added (ALLOWED_SKIPS stays empty).

Re-running this exact 8-marker fixture with the rebuilt binary
(`--engine rust --force`, direct SQLite read) moves recall from **4/8 to 8/8**
with zero parse errors (nodes 16→20, edges 15→19):

| # | Source marker | Before | After |
| --- | --- | --- | --- |
| 1–3 | Gin GET/POST/DELETE | ✓ | ✓ |
| 4 | Gin OPTIONS | missing | `OPTIONS /opts` |
| 5 | Gin HEAD | missing | `HEAD /healthz` |
| 6 | grouped `v1.GET` | `GET /api/v1/users` | `GET /api/v1/users` |
| 7 | stdlib `HandleFunc` | missing | `ANY /std` |
| 8 | Chi `mux.Get` | missing | `GET /chi` |

All eight routes carry a handler unresolved ref. The TS e2e and the three-OS
verdict run on CI (this Windows clone has no node_modules/dist for a local
vitest/tsc run).
