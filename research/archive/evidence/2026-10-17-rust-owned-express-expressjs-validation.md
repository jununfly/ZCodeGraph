---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-17-rust-owned-express-expressjs-v
bounded-question: "What evidence does 2026-10-17-rust-owned-express-expressjs-validation provide?"
---
# Rust-Owned Express Corpus Validation (expressjs/express)

Date: 2026-10-17
Roadmap: 1-6-6-4 真实语料 gate（在 1-6-6-1 backfill 模块、1-6-6-2 finalize 接线、
1-6-6-3 frameworks-integration e2e 之后）

## Why this corpus

`expressjs/express` is the canonical Express reference. Its `examples/`
directory is 24 self-contained real-world mini-apps (auth, sessions, cookies,
markdown, mvc, multi-router, route-separation, web-service, vhost, …) that
exercise the same `(app|router).METHOD(path, handler)` patterns production
Express code uses, plus the `lib/` core (which has no route registrations of
its own but contributes JS baseline symbols).

Unlike synthetic fixtures this corpus surfaced a real extractor gap (see
"Inline `function(){}` handler fix" below) — exactly what the real-corpus
gate is for.

## Corpus

| Item | Value |
|---|---|
| Repository | `expressjs/express` |
| Checkout | `a419aa7350389a275ab45fde2e849ed1f02449ef` (master, shallow + sparse) |
| Subset indexed | `lib/` + `examples/` |
| JS files | **49** |
| LOC (JS) | **4,899** |

Local checkout lives outside the repository at
`C:\workspace\express-corpus\express` (sparse shallow clone); it is not
vendored.

## Command

```bash
# rust-only baseline (proves the 1-6-6 problem statement)
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path C:\workspace\express-corpus\express \
  --index-path  C:\workspace\express-corpus\express\express-rust-only.db

# rust-hybrid (default; exercises the 1-6-6-1 backfill)
node dist/bin/zcodegraph.js index --force C:\workspace\express-corpus\express
```

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI; corpus validation used the Rust core binary
directly for the rust-only baseline and a locally built `dist/` for the
rust-hybrid run.

## Result — files / nodes / edges

| Metric | rust-only | rust-hybrid |
|---|---:|---:|
| Files indexed | 50 | 51 |
| Files errored | **0** | **0** |
| Nodes total | 504 | 561 |
| Edges total | 537 | 916 |
| `route` nodes | **0** | **57** |
| `calls` edges | 29 | 373 |
| `references` edges | 0 | 5 |
| `contains` edges | 454 | 454 |
| `imports` edges | 54 | 76 |
| `route → calls` edges | 0 | 8 |
| `route → references` edges | 0 | 5 |
| Routes with ≥1 handler link | 0 / 0 | **13 / 57** |

The 51st file on rust-hybrid is the Express repo root `index.js` (swept via
TypeScript fallback because the sparse cone happens to expose it outside
`lib/`/`examples/`). The seven `yaml` fallback warnings in
`.zcodegraph/errors.log` are sparse-checkout `.github/workflows/*.yml`
references — the scanner sees the planned files but the sparse cone does not
materialise them. Both are cosmetic and expected; they do not affect the
Express-route gate.

**Files-errored = 0** is the primary gate.

## Route coverage breakdown

Of the 57 emitted `route` nodes:

- **13** carry a `calls` or `references` edge to a business function
  (e.g. `POST /login → authenticate`, `GET / (view-locals) → User.count`,
  `GET /users → listUsers`, `GET /user/:id → view`).
- **44** are correctly orphaned: their handler bodies only invoke Express
  built-ins (`res.send` / `res.render` / `res.redirect` / `res.json` /
  `res.clearCookie` / …) which `RESERVED_CALLS` filters out by design — they
  carry no business-flow signal for `trace(route, service)` to surface.

Every `examples/` mini-app contributes ≥1 route; coverage spans 23 distinct
files under `examples/` plus `lib/` (which legitimately emits none).

Handler-form distribution across the corpus (counted by regex over
`app.METHOD(...)` statements):

| Handler form | Count |
|---|---:|
| Inline arrow `=> {…}` | 0 |
| Inline `function() {…}` | 44 |
| Named identifier (last arg) | 10 |

## Inline `function(){}` handler fix (roadmap 1-6-6-4 product gap)

The corpus surfaced a real extractor gap: `emitExpressRouteNodes` previously
recognised only `=>` arrow handlers and named-identifier handlers. Real-world
Express (expressjs/express examples, and most Express code written before
ES6 arrows became dominant) uses `function(req,res){…}` inline handlers —
**44 of 54** matched route statements in this corpus. Without support, every
one of those inline bodies lost its business calls (no `calls` edge from the
route node).

Fix in `src/resolution/frameworks/express.ts`:

- Detect inline `function ()` handlers in addition to `=>`.
- Reuse the same balanced-brace body-extraction path to attribute body calls
  to the route node as `calls` edges.
- The arrow path is untouched; the named-identifier path is untouched.

Regression coverage in `tests/frameworks-integration.test.ts` (existing
`Express on rust-hybrid (roadmap 1-6-6-3)` describe):

```
router.delete('/users/:id', function (req, res) { auditLog('delete'); res.send(); });
→ expect DELETE /users/:id calls auditLog (kind=calls)
```

The same `it()` title is reused so the existing `ci.yml` `-t` filter
(`extracts app.METHOD, router.METHOD, inline-arrow calls, named-handler refs,
and middleware chains on rust-hybrid`) picks the new assertion up with no
`ci.yml` edit.

### Impact on this corpus

| Metric | Before fix | After fix |
|---|---:|---:|
| Routes with handler link | 5 / 57 (named only) | **13 / 57** |
| `route → calls` edges | 0 | 8 |
| `calls` edges total | 365 | 373 |

Newly linked routes include `POST /login → authenticate` and
`GET / (view-locals) → User.count` — both are inline-`function(){}` handlers
with real business calls that were previously dropped.

## Corpus gate sign-off

- [x] Files errored = 0 on rust-hybrid
- [x] `route` node count > 0 on rust-hybrid (57 vs 0 on rust-only)
- [x] `route → handler` edges present (`calls` 8 + `references` 5)
- [x] Inline `function(){}` extractor gap closed and covered by e2e
- [x] Existing `Express on rust-hybrid` vitest still passes (1/1)
- [x] `ci.yml` `-t` filter unchanged (same `it()` title)
- [x] benchmark doc landed under `docs/benchmarks/`

Gate is **CLOSED**.
