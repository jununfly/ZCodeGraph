# Python Framework Sufficiency under Rust-Owned Indexing

Date: 2026-09-30
Roadmap: 1-6-2 Python 框架充分性检查（Django/Flask/FastAPI 边界实证）
Mode: explore / acceptance (product code read-only; evidence = probes + tracked test fixtures)

## Question

After Python joined `RUST_HYBRID_RUST_OWNED_LANGUAGES`, the Python *baseline*
extraction moved into the Rust core, but the Django/Flask/FastAPI **framework
route extraction** was never re-validated end-to-end. The pre-existing
framework e2e tests lock `engine: 'typescript'`, so a route regression on the
default `rust-hybrid` engine would not fail CI. This node determines whether
Python framework routes survive the rust-owned path and records the ownership
boundary / gap list.

## Ownership boundary (static link trace)

- `python` is a member of `RUST_HYBRID_RUST_OWNED_LANGUAGES`
  (`src/indexing/rust-hybrid-contract.ts`), so every `.py` file is extracted by
  the Rust subprocess and is **never** added to the TypeScript `fallbackFiles`
  set.
- Framework `extract()` (route nodes) has a single invocation site:
  `extractFromSource()` in `src/extraction/tree-sitter.ts`. It is reached only
  from the TypeScript engine pipeline (`index-stages.ts`, the TS orchestrator,
  the parse worker/executor) — i.e. TS-owned and fallback files. The
  rust-hybrid path (`CodeGraph.indexExternalEngine` → `runRustIndexer` →
  `finalizeRustIndex`) never calls it for python files.
- The Rust core (`crates/zcodegraph-core/src/lib.rs`) implements route
  extraction only for Rust axum/attribute routes, Go Gin, and emits NestJS
  post-extract updates (`framework_post_extract_updates`). There is **no**
  Django / Flask / FastAPI route extraction in Rust.
- `finalizeRustIndex` applies only the Rust-supplied post-extract updates, and
  the TypeScript applier hard-gates them to `provider === 'nestjs'`,
  `updateKind === 'route-name-prefix'`, `nodeKind === 'route'`,
  `field === 'name'` (`src/index.ts` `applyRustFrameworkPostExtractUpdates`).
  It does not run `djangoResolver` / `flaskResolver` / `fastapiResolver`.

Conclusion from the trace alone: on the default `rust-hybrid` engine none of
the three Python framework extractors run, so their route nodes cannot exist.
The probes below confirm this empirically.

## Probe 1 — minimal fixtures (rust binary → SQLite)

Three minimal apps indexed with the built `target/debug/zcodegraph-core.exe`
(`--engine rust --force`), then queried directly in SQLite:

| Fixture | Source route markers | py parse errors | route nodes | non-`contains` edges |
| --- | --- | --- | --- | --- |
| Django (`path('users/', UserListView.as_view())`) | 1 | 1* | **0** | 0 |
| Flask (`@bp.route('/')` + `@bp.route('/index')`) | 2 | 0 | **0** | 0 |
| FastAPI (`@app.get('/items')` + `@app.post('/items')`) | 2 | 0 | **0** | 0 |

\* The Django fixture's `views.py` used the same-line-suite form
`def get(self, request): pass`, which triggers a Rust
`rust-owned-parse-gap`. A multi-line body parses cleanly. Tracked separately
below; it does not affect the route count (routing lives in `urls.py`, which
parsed fine).

## Probe 2 — real corpora

Shallow tarballs downloaded via proxy into `.workbuddy/probe-python/` (not
committed):

| Corpus | py files | Source-level route ground truth | Total nodes | py parse errors | **route nodes** |
| --- | ---: | --- | ---: | ---: | ---: |
| `gothinkster/django-realworld-example-app` (master) | 44 | 18 `path()/url()` calls | 332 | 0 | **0** |
| `nsidnev/fastapi-realworld-example-app` (master) | 95 | 20 `@app/@router.<method>` decorators | 878 | 0 | **0** |

Route recall on the rust-owned path is **0%** for both. The 2026-07-02 Flask
validation (`2026-07-02-rust-owned-python-flask-validation.md`) is consistent:
its edge table lists calls/contains/decorates/imports/instantiates but no
`route` edges — that gate validated python baseline extraction + decorator
`references`, and explicitly did not claim framework sufficiency.

Note: the pure-`rust` binary emits only `contains` edges because cross-file
reference resolution runs in the TypeScript-shell finalize stage. That does
not explain the missing routes — route **nodes** are produced during
extraction, before resolution, and finalize cannot synthesize a route node
that the extractor never emitted.

## What is and is not lost

- **Lost on rust-hybrid:** all `route` nodes and the route→handler
  `references` edges for Django (`path`/`re_path`/`url`, DRF
  `router.register`), Flask (`@bp.route`, Flask-RESTful `add_resource`), and
  FastAPI (`@router/app.<method>`). Agent route/impact questions
  ("which handler serves `POST /items`", getTopRouteFile) silently return
  nothing for Python projects under the default engine.
- **Preserved:** python baseline symbols (class/function/method/import/…),
  `imports`/`calls`/`references`/`decorates` resolution (TS shell + Rust
  matcher), and the Django ORM `_iterable_class` dynamic-dispatch bridge —
  *provided a resolver `resolve()` is still reached during finalize.* Route
  extraction is the absent stage; the non-route framework `resolve()` paths
  were not in this node's scope and need a separate, resolution-focused probe.

## Secondary finding — Rust python same-line-suite parse gap

`def f(...): pass` / `class C: ...` with a simple statement on the same
logical line emits `rust-owned-parse-gap` and drops the class node; multi-line
suites parse correctly. Neither real corpus triggered it (0 parse errors over
139 py files), so impact on mainstream code is low. Logged as a minor Rust
core gap, not part of the route-fix node.

## Frozen regression contract (test fixtures)

`__tests__/frameworks-integration.test.ts` gains a tracked-skip describe
"Python framework routes on rust-hybrid (roadmap 1-6-2 tracked gap)" with
three `it.skip` cases asserting the intended seam:

1. Django `path()` route node + route→view `references` edge.
2. Stacked Flask `@bp.route` nodes resolving to the view function.
3. FastAPI `@app.get/@app.post` routes resolving to their handlers.

They are `it.skip` (not passing "route === 0" assertions) so they encode the
target behaviour, not the bug. The three titles are registered in
`skip-debt-guardrail.test.ts` `ALLOWED_SKIPS` with the roadmap 1-6-2 tracker;
a static self-audit confirmed the three skip sites match the allowlist
verbatim, every skip carries a tracker, and no title collides with an active
test. Real tsc/vitest arbitration runs on the 3-OS CI matrix (the local clone
has no `node_modules`/`dist`). When the product fix lands, these become active
`it(...)` and their titles must be added to ci.yml step2's `-t` filter in the
same change.

## Decision

Python framework **route** sufficiency under rust-owned indexing **fails**:
Django, Flask, and FastAPI lose 100% of their route nodes on the default
rust-hybrid engine, masked by engine-locked TypeScript tests and green CI.
Baseline Python extraction and non-route resolution are unaffected. This node
makes no product change (acceptance scope). The fix is dispatched to a
product node which must choose between (a) running the existing TypeScript
python framework extractors during rust-hybrid finalization for rust-owned
python files (reuses mature regex resolvers, keeps framework logic in the TS
shell — consistent with Spring/Express remaining TS-owned), or (b) porting
the three route extractors into the Rust core (consistent with axum/Gin, but
larger and duplicates the regex logic). Option (a) is the recommended
minimum-risk path. Full fair-coverage numbers on real corpora require the TS
shell and are measured after the fix under that node.

## Fix — roadmap 1-6-2-4 (2026-09-30, option a)

The product fix landed on top of the acceptance evidence above, taking the
recommended option (a): re-run the TypeScript python framework route
extractors during rust-hybrid finalization rather than porting regexes to
Rust.

- New deep module `src/indexing/rust-python-framework-routes.ts`
  (`runPythonFrameworkRouteBackfill(queries, projectRoot, frameworkNames)`):
  enumerates `queries.getAllFiles()` filtered to `language === 'python'`,
  reads each file from disk, and runs the existing, regex-only
  `djangoResolver` / `flaskResolver` / `fastapiResolver` `.extract()`
  (imported directly from `resolution/frameworks/python.ts` so the path does
  not pull in the full resolver registry and its tree-sitter grammar chain).
  It inserts only `route` nodes + their unresolved references; baseline
  python symbols owned by Rust are never re-extracted.
- Seam: `src/index.ts` `finalizeRustIndex`, after `resolver.runPostExtract()`
  and before `resolveReferencesBatched()`. The newly inserted unresolved
  route->handler refs are linked into `references` edges by the existing
  batched resolution (name matching + import mapping); no edges are built by
  hand. Stats are exposed on the finalize profile as
  `pythonFrameworkRouteBackfill` (filesScanned / routeNodes /
  routeReferences / readErrors / extractErrors).
- Idempotency: route ids are deterministic (`route:<file>:<line>:...`) and
  use `INSERT OR REPLACE`; before re-extracting a file the pass removes only
  its prior `kind === 'route'` nodes (and their edges + unresolved refs), not
  all file nodes, so route deletion and incremental / `--force` re-indexes
  converge cleanly. Edges use `INSERT OR IGNORE`. Read/extractor failures are
  counted and skipped per file without aborting finalization.
- Tests: the three `it.skip` cases in `__tests__/frameworks-integration.test.ts`
  (describe renamed "...(roadmap 1-6-2-4 restored)") are active `it(...)`
  contracts; `skip-debt-guardrail.test.ts` `ALLOWED_SKIPS` is back to empty;
  `.github/workflows/ci.yml` step2's `-t` filter gains the three titles in the
  same change (guardrail statically verifies each branch hits a real test).

Local verification (the clone has no `node_modules`/`dist`): transpile syntax
check of all touched TS files is clean; an isolated CommonJS harness drove the
real three resolvers' `extract()` on the exact fixtures — django `users/` ->
`UserListView`, flask `['GET /','GET /index']` -> `index` x2, fastapi
`['GET /items','POST /items']` -> `list_items`/`create_item` — and drove the
real `runPythonFrameworkRouteBackfill` against an in-memory QueryBuilder fake
(16 assertions: counts, python-only filtering, ref ownership, clean-replace
idempotency on re-run, framework gating, no-op when undetected, read-error
tolerance). The pure-`rust` binary intentionally still emits 0 routes — the
back-fill is a TypeScript-shell finalization stage and only takes effect under
`rust-hybrid`, by design. Authoritative tsc/vitest and real-corpus
(django-realworld / fastapi-realworld) hybrid fair coverage are arbitrated by
the 3-OS CI matrix.

