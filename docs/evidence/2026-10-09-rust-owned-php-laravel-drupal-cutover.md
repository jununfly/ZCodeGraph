# Rust-Owned PHP Cutover — Laravel Route + Drupal Hook Back-Fill Validation

Date: 2026-10-09
Roadmap: 1-2-5-4 PHP 框架/运行时语义边界决策 + TS fallback 移除
Predecessors: 1-2-5-1 (baseline Rust PHP extractor), 1-2-5-2 (reference-edge
emission), 1-2-5-3 (real-corpus parse/supply validation,
`2026-10-09-rust-owned-php-laravel-drupal-validation.md`).

## What this gate proves

The 1-2-5-4 decision is **split** — the same boundary shape that landed for
C#/ASP.NET in 1-2-4-4:

1. Pure-syntax PHP extraction moves to Rust. `php` joins
   `RUST_HYBRID_RUST_OWNED_LANGUAGES` as the 13th language, so the hybrid plan
   routes every PHP-family file (`.php`/`.module`/`.install`/`.theme`/`.inc`)
   to Rust and schedules **zero** TypeScript-fallback files for the language.
2. Framework/runtime semantics stay in the TypeScript shell
   (`laravelResolver`, `drupalResolver`). A new
   `src/indexing/rust-php-framework-routes.ts` re-runs the mature product
   resolvers during `finalizeRustIndex`, after `runPostExtract()` and before
   the batched reference resolution, so back-filled refs resolve in the same
   pass.

PHP differs from the C#/Python templates in that the framework half has
**two distinct output shapes**, both validated here:

- **Laravel routes** — `extract()` creates *dedicated* `route` nodes
  (deterministic id `route:<file>:<line>:<VERB|RESOURCE>:<path>`); the
  route→handler ref hangs off a node the back-fill itself creates. Idempotent
  cleanup therefore keys on `kind === 'route'` nodes per file (node + edges +
  unresolved rows), exactly like the C# back-fill.
- **Drupal hooks** — `extractDrupalHooks()` returns `nodes: []`; every
  `hook_*` ref's `fromNodeId` points at a **shared Rust-extracted free-function
  node**, not a new node. Owning-node filtering would drop 100% of them and
  `deleteUnresolvedByNode` would also erase that function's Rust-baseline
  refs, so cleanup is a precise `(file_path + hook_ prefix + unresolved rowid)`
  delete-and-reinsert. This is safe because a grep of the Rust core confirms
  it never emits a reference named `hook_*`.

A second seam was verified byte-for-byte before trusting the Drupal shape:
the TS `generateNodeId(filePath, kind, name, line)` and the Rust
`generate_node_id` are the same `kind:sha256(filePath:kind:name:line).slice(0,32)`
algorithm, and the Rust free-function node for a `.module` file is built with
the same forward-slash relative path and 1-based start row that the TS
regex extractor uses — so a TS hook ref addressed at a Rust function node id
is never an orphan.

Drupal `*.routing.yml` files are YAML, which is **not** Rust-owned, so they
remain on the ordinary TS parse path and are deliberately untouched by the
back-fill (no regression, no double extraction).

## Corpora

All checkouts live OUTSIDE the repository (`C:\workspace\php-corpus`, shallow /
sparse); none are vendored. They reuse the 1-2-5-3 Rust indexes so the
baseline graphs are the identical ones the predecessor benchmark measured.

| Corpus | Role in this gate | Rust index (from 1-2-5-3) |
|---|---|---:|
| `laravel/framework` `src/Illuminate` @ `848f3ed` | Framework **library**: proves a big PSR-4 codebase emits no app routes (routes are declared at the app layer) | 1,742 PHP-family files, 28,578 nodes, 0 errors |
| `drupal/drupal` subset @ `c305d65` (`core/lib/Drupal` + `node` + `user` modules) | Procedural + OOP corpus: Drupal hook refs and `.routing.yml` routes | 2,859 PHP-family files, 32,661 nodes, 0 errors |
| `laravel/laravel` skeleton (shallow, official app scaffold + one seeded `UserController`) | Real **application** layer: artisan-detected, literal `Route::verb` routes over Rust-indexed controller methods | 30 files, 116 nodes, 0 errors |

The skeleton is the stock `laravel/laravel` scaffold with
`app/Http/Controllers/UserController.php` added (`index`/`show`/`store`) and
`routes/web.php` edited to cover the four handler shapes: a closure route,
the `[UserController::class, 'index']` tuple, a `'…UserController@show'`
string, and `Route::resource('items', UserController::class)`.

## Commands

The local Windows clone has no `node_modules`/`dist`, so vitest and the full
`finalizeRustIndex` ordering are arbitrated on the 3-OS CI matrix. Both halves
of the split were nonetheless measured with the **real product code**, not a
re-implementation:

1. Baseline symbols: the freshly built Rust core binary
   (`target/debug/zcodegraph-core.exe`, already containing PHP) produced every
   DB above in 1-2-5-3 (`--engine rust --force`).
2. TS framework half: the actual `laravelResolver` / `drupalResolver`
   `extract()` and `resolve()` were executed under node
   `--experimental-strip-types` through a small ESM loader hook
   (`php-cutover-loader.mjs`, kept outside the repo) that appends `.ts` to
   extensionless relative imports, erases runtime `from '…/types'` imports
   (pure erased types), and stubs `web-tree-sitter` (the resolvers are
   regex-only and never touch the grammar). A `ResolutionContext` was built
   directly from the Rust DB's `nodes`/`files` tables, so `resolve()` ran
   against real Rust node ids.
3. Framework detection: the real `detect(context)` against each corpus
   (`artisan` / `app/Http/Kernel.php` for Laravel; `composer.json`
   `drupal/*` + `.info.yml` for Drupal). Production `fileExists` falls back to
   disk `fs.existsSync`, so the extensionless `artisan` and root
   `composer.json` are detectable.

## Result — Drupal hook back-fill (shared-node shape)

Source half (`drupalResolver.extract()` over all 2,859 PHP-family files):

| Metric | Value |
|---|---:|
| Files scanned / read errors / extract errors | 2,859 / **0** / **0** |
| `hook_*` references emitted | **33** |
| Distinct hook names | 29 |
| Reference kinds | 33/33 `references` |
| Hook refs whose `fromNodeId` **misses** a Rust node | **0** |
| Owner nodes not `(kind=function, language=php)` | **0** |

Every back-filled hook ref is anchored to a Rust-extracted free function
(the shared-node contract holds at scale; 0/33 orphans). File spread:
`node.install` 4, `node.module` 7, `node.post_update.php` 1, `user.install` 3,
`user.module` 17, `user.post_update.php` 1. The two `.post_update.php` files
are reached because the back-fill selects files by
`f.language === 'php'` rather than an extension allow-list — the Rust
`SourceLanguage::from_path` classifies all five PHP-family extensions (plus
`.post_update.php`) as Php; filtering by language instead of by extension is
what keeps those two refs alive.

Sink half (`drupalResolver.resolve()` with the Rust graph as context):

| Resolution outcome | Count |
|---|---:|
| Resolved to a Rust `function` node (confidence 0.75, `resolvedBy: framework`) | **31** |
| Distinct Rust target functions | 28 |
| Unresolved | **2** |

The two unresolved refs are both `hook_removed_post_updates`
(`node.post_update.php`, `user.post_update.php`). This is a **pre-existing
recall ceiling in the retained TS resolver, not a cutover regression**: its
hook target scan requires the implementing function to live in a
`HOOK_FILE_EXTENSIONS` file (`.module/.install/.theme/.inc`), while the
implementations `node_removed_post_updates` / `user_removed_post_updates`
(and the canonical `hook_removed_post_updates` in
`core/lib/Drupal/Core/Extension/module.api.php`) sit in `.post_update.php` /
`.api.php`. The identical mismatch exists pre-cutover because the resolver is
unchanged code; the back-fill's job is only to preserve and route these refs,
which it does. It is recorded here as an honest follow-up candidate
(extending the sink's hook-file predicate), deliberately **not** silently
fixed inside the ownership move.

> **Addendum (2026-10-09, same day) — follow-up resolved.** The ceiling above
> was closed directly after the cutover. The sink hook branch in
> `src/resolution/frameworks/drupal.ts` now resolves in three tiers:
> (1) a *different* concrete implementation `*_{suffix}` in a hook file
> including `*.post_update.php` (private `_{module}_*` helpers excluded,
> self-links suppressed); (2) the exact `hook_{suffix}` documentation
> template declared in a `*.api.php` file; (3) the legacy `candidates[0]`
> fallback for single-implementation corpora (unchanged graph result — such a
> self edge is dropped by the edge writer). Re-running this benchmark's sink
> probe against the identical Rust corpus DB moved the result from 31/33 to
> **33/33 resolved**: the two `hook_removed_post_updates` refs now link
> cross-module (`node.post_update.php` → `user_removed_post_updates` and vice
> versa), and `hook_form_alter` resolves to the core template at
> `core/lib/Drupal/Core/Form/form.api.php` when no peer implementation exists.
> The 31 rows in the table above are preserved as the pre-follow-up snapshot.
> Locked by two `drupalResolver.resolve` unit tests in `__tests__/drupal.test.ts`
> and one rust-hybrid e2e in `__tests__/frameworks-integration.test.ts`
> (follow-up commit `996cf4d`).

### Drupal `*.routing.yml` (untouched TS path)

Five routing files under the two modules (`node.routing.yml`,
`user.routing.yml`, three test-module files) still run through the normal TS
YAML parse path — YAML is not Rust-owned and the back-fill never reads them:

| Metric | Value |
|---|---:|
| `*.routing.yml` files | 5 |
| Route nodes | **27** |
| Route→handler refs | **27** |

Per file: `node.routing.yml` 13, `user.routing.yml` 9,
`node_access_test_auto_bubbling.routing.yml` 2,
`user_language_test.routing.yml` 2, `user_form_test.routing.yml` 1. The
cutover neither removes nor double-counts these routes (the deterministic e2e
fixture asserts the `/alpha-hello` YAML route survives alongside the
Rust-anchored hook edge).

## Result — Laravel route back-fill (dedicated-node shape)

Framework library (`laravel/framework` `src/Illuminate`, 1,742 files):

| Metric | Value |
|---|---:|
| Files scanned / read errors / extract errors | 1,742 / **0** / **0** |
| Route nodes back-filled | **0** |
| Route refs back-filled | **0** |

Zero is the correct, honest result: application routes are declared in the
**app**, not the framework library. The only three `Route::verb` call sites in
`src/Illuminate` take a dynamic first argument (`$uri` / `$health`), and the
product extractor deliberately requires a literal string path, so none match.
This confirms the back-fill does not fabricate routes from the framework's
internals; the application layer is measured separately below.

Skeleton application (`laravel/laravel` + seeded `UserController`,
`detect()` = **true** via `artisan`; Rust indexed 30 files / 0 errors / 116
nodes):

| Route node | Handler shape | Ref | Sink resolution |
|---|---|---|---|
| `GET /` | closure | — (no ref emitted) | n/a |
| `GET /users` | `[UserController::class, 'index']` | `UserController@index` (`references`) | **resolved → Rust `method:index` @ `app/Http/Controllers/UserController.php`, conf 0.9** |
| `GET /users/{id}` | `'…UserController@show'` | `UserController@show` (`references`) | **resolved → Rust `method:show`, conf 0.9** |
| `resource:items` | `Route::resource('items', UserController::class)` | `UserController` (`imports`) | not framework-claimed; routed to the language-agnostic NameMatcher |

So both precise `Controller@method` handler refs (the tuple form and the
string form, Laravel 8+ style) resolve in the same finalization pass to
Rust-extracted controller methods (**2/2**, confidence 0.9). The closure route
emits no ref by design, and the resource registration emits a short-class
`imports` ref that `claimsReference()` correctly does **not** claim — it is
left to the normal `use`-import NameMatcher, matching pre-cutover behavior.

## Before / after cutover

| Metric (rust-hybrid) | Before 1-2-5-4 | After 1-2-5-4 |
|---|---:|---:|
| PHP parse/extraction errors (both 1-2-5-3 corpora) | 0 | 0 |
| Baseline PHP symbol nodes (Rust) | unchanged | unchanged |
| TS PHP-family fallback files scheduled | all (hash-no-op) | **0** (`php` owned) |
| Drupal `hook_*` refs anchored to Rust function nodes | TS parse pipeline | **33 back-fill, 0 owner-miss** |
| Drupal hook refs resolvable to Rust functions | 31 (2 sink-ceiling) | **31 (same 2 pre-existing ceiling)** |
| Drupal `*.routing.yml` routes | 27 (TS YAML path) | **27 (same path, untouched)** |
| Laravel app literal routes → Rust controller methods | TS parse pipeline | **2/2 resolved @0.9 (back-fill)** |

The post-cutover graph preserves both framework behaviors while the redundant
per-file TS parse of every PHP-family file is no longer scheduled (pre-cutover
it hash-short-circuited to a no-op because Rust had already written each
file's `sha256(raw disk content)`, proven for C# in 1-2-4-2 and identical in
mechanism here). The only unresolved hooks are the same two
`.post_update.php` cases the retained TS resolver already missed; no new gap
is introduced.

### Honest limitations recorded, not gamed

- The two unresolved `hook_removed_post_updates` refs are a retained-resolver
  recall ceiling (hook-file predicate excludes `.post_update.php` /
  `.api.php`), unchanged across the cutover. Tracked as a possible follow-up;
  not patched inside this ownership node.
- Laravel route extraction requires a literal string path and the documented
  handler shapes; dynamic `Route::verb($uri, …)` and closure handlers produce
  no route/ref, identical to pre-cutover. `Controller@method` resolution uses
  the conventional `app/Http/Controllers/<Controller>.php` location plus a
  Controllers-path name fallback; non-default route structures are out of
  scope.
- The local probe ran the real `extract()`/`resolve()` against the Rust graph
  but not the entire `finalizeRustIndex` transaction ordering (idempotent
  delete→reinsert, cache clear, batched resolve). That ordering, plus
  edge-row writes, is arbitrated end-to-end by the deterministic fixtures and
  the 3-OS CI matrix on this node's push.

## Verification gates

- New deterministic fixtures in
  `__tests__/frameworks-integration.test.ts`:
  - `describe('Laravel framework routes on rust-hybrid (roadmap 1-2-5-4 cutover)')`
    — artisan detection; tuple + string handler routes resolve to Rust
    controller methods; resource + closure shapes behave as above.
  - `describe('Drupal hook back-fill on rust-hybrid (roadmap 1-2-5-4 cutover)')`
    — two modules implement the same `hook_form_alter`; the Rust free-function
    nodes exist and a references edge links them in either direction, while
    the `alpha.routing.yml` YAML route still appears.
  Titles avoid regex metacharacters and are registered in `ci.yml` step2's
  `-t` filter; the `skip-debt-guardrail` audit confirms every `-t` branch
  matches a real test (27 branches, zero dead filters).
- Ownership contract flipped in `__tests__/extraction.test.ts`
  (`isRustHybridOwnedLanguage('php') === true`,
  `engineByLanguage.php === 'rust'`, zero PHP fallback files); the engine-CLI
  language snapshot in `rust-index-engine-cli-engine.test.ts` now lists 13
  owned languages.
- `src/extraction/languages/php.ts` and its barrel registration are
  **retained** (pure `--engine typescript` still needs PHP), following the
  C#/python/go precedent — the cutover removes PHP *fallback scheduling* via
  the ownership table, not the extractor file.
- `ALLOWED_SKIPS` unchanged; no `.skip` / `.only` introduced.
- Because the local clone cannot run vitest, the corpus half above was run
  through the real Rust binary + the retained product resolvers joined
  against the Rust SQLite graph; end-to-end vitest arbitration (including the
  actual `finalizeRustIndex` back-fill ordering) is delegated to the 3-OS CI
  matrix on this node's push, where the Windows log must show the two new
  cases **run** (`✓` with duration), not skipped (`↓`).

## Decision

The PHP framework/runtime split validation gate **passes**. On real corpora
the Rust core already extracts every PHP-family file with zero errors
(1-2-5-3), and the two framework shapes survive the ownership cutover:

- **Drupal (shared-node hooks):** 33 `hook_*` refs are back-filled with a
  **0/33 owner-miss** against Rust free-function nodes (including the two
  `.post_update.php` files reached via language-based file selection); 31/33
  resolve to Rust functions at confidence 0.75, with the 2 residuals being a
  pre-existing `.post_update.php`/`.api.php` sink-predicate ceiling in the
  retained TS resolver — not a cutover regression. The 27 `*.routing.yml`
  routes stay on their untouched TS YAML path.
- **Laravel (dedicated route nodes):** the framework library correctly yields
  0 app routes, while a real artisan application yields literal routes whose
  2/2 precise `Controller@method` refs resolve to Rust controller methods at
  confidence 0.9; closures emit nothing and resource registration flows to
  the language-agnostic NameMatcher.

Zero PHP-family TS-fallback files are scheduled after the cutover while both
framework behaviors are preserved by the explicit finalization back-fill. The
ownership cutover is safe to land once the 3-OS CI matrix is green.
`EXTRACTION_VERSION` is **not** bumped (the PHP Rust batch remains
unreleased).
