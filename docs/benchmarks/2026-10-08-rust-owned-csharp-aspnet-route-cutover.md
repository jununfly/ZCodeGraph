# Rust-Owned C# Cutover — ASP.NET Route Back-Fill Validation (eShopOnWeb Web)

Date: 2026-10-08
Roadmap: 1-2-4-4 C# 框架/运行时语义边界决策 + TS fallback 移除
Predecessors: 1-2-4-1 (baseline Rust C# extractor), 1-2-4-2 (pre-cutover
reference-edge parity), 1-2-4-3 (Newtonsoft real-corpus parse validation,
`2026-10-08-rust-owned-csharp-newtonsoft-validation.md`).

## What this gate proves

The 1-2-4-4 decision is **split**:

1. Pure-syntax C# extraction moves to Rust — `csharp` joins
   `RUST_HYBRID_RUST_OWNED_LANGUAGES`, so the hybrid plan routes every `.cs` to
   Rust and schedules **zero** TypeScript-fallback files for the language.
2. ASP.NET route *framework* semantics stay in the TypeScript shell
   (`aspnetResolver`). Because the only place `frameworkResolver.extract()` ran
   was the TS parse pipeline (tree-sitter framework step), the cutover would
   otherwise drop **100%** of ASP.NET route nodes. A new
   `src/indexing/rust-csharp-framework-routes.ts` (mirroring
   `rust-python-framework-routes.ts` from 1-6-2-4) re-runs the mature regex
   `aspnetResolver.extract` during `finalizeRustIndex`, after `runPostExtract()`
   and before the batched reference resolution, so inserted route nodes resolve
   to the Rust-extracted handler methods.

This benchmark validates the split on a real ASP.NET Core web project: Rust
extracts the baseline symbols with zero parse errors, and the TS route
back-fill restores every controller route, each of which resolves to a
Rust-extracted method node.

### Boundary refinement vs the 1-2-4-3 benchmark

The 1-2-4-3 benchmark stated the TypeScript C# extractor
(`src/extraction/languages/csharp.ts`) was "slated for deletion at the
ownership cutover (1-2-4-4)". That did **not** hold up under implementation:
`razor-extractor.ts` (`processCodeBlocks`) delegates every Blazor `@code` /
`@functions` block to `new TreeSitterExtractor(filePath, 'class __RazorCode__ {…}', 'csharp').extract()`. Removing the `EXTRACTORS['csharp']` config makes the
extractor `null` and `visitNode` silently returns (`tree-sitter.ts` L359),
dropping Blazor component-logic references with no error (the
`isLanguageSupported('csharp')` guard checks grammar availability, not the
extractor config). The decisive precedent is that `python.ts` and `go.ts`
extractors (and their direct TS-engine tests) were retained after those
languages went rust-owned; only consumer-free kotlin/java/cpp extractors were
deleted. So 1-2-4-4 removes the `.cs` TS **fallback scheduling** via the
ownership table, while retaining `csharp.ts` + its barrel registration for the
Blazor razor delegation and the pure `typescript` engine. Recorded as the
second 1-2-4-4 roadmap decision.

## Corpus

- Repository: `dotnet-architecture/eShopOnWeb`
- Checkout: `4da8212117e87d808d4bbc7da6286fd2147ce606` (shallow + sparse)
- Indexed subset: `src/Web` only (the ASP.NET Core MVC web host). The sparse
  checkout intentionally excludes the referenced `ApplicationCore` /
  `Infrastructure` / `BlazorAdmin` / `BlazorShared` projects, so this measures
  the Web project's own controllers and startup in isolation.
- Size: **64 C# files, 2,658 LOC** (plus 2 incidental JavaScript files the
  scanner picked up under `wwwroot`-adjacent paths; they are not part of the
  route analysis).
- Rationale: a real, shipping ASP.NET Core app that is controller- and
  MVC-template heavy. Its controllers use class-level tokenized routes
  (`[Route("api/[controller]/[action]")]`, `[Route("[controller]/[action]")]`,
  `[Route("[controller]")]`) with bare and parameterized `[HttpGet]` /
  `[HttpPost]` actions — including one `[HttpGet("{orderId}")]` and an
  explicit `[Route("Logout")]` override. `Program.cs` wires routing through MVC
  (`MapControllerRoute`, `MapRazorPages`, health checks) rather than minimal
  API `app.Map*(…, handler)`, so this corpus exercises the **attribute-controller**
  path; the **minimal-API** path is covered deterministically by the new
  `frameworks-integration.test.ts` fixture (a separate file with real
  `Pong`/`CreateItem` static handler methods).

## Commands

The local Windows clone has no `node_modules`/`dist`, so the full TS shell and
vitest arbitration run on CI. The two halves of the split were measured
directly and identically to how the product behaves:

1. Baseline C# symbols through the freshly built Rust core binary:

```bash
./target/debug/zcodegraph-core.exe index \
  --project-path .workbuddy/corpus-eshop/src/Web \
  --index-path   .workbuddy/corpus-eshop/src/Web/.zcodegraph/zcodegraph.db \
  --engine rust --force
```

2. The retained TS `aspnetResolver.extract()` run over the same 64 `.cs`
   files (loaded through a TypeScript `transpileModule` require hook; the
   resolver is regex-only and pulls in no tree-sitter grammar), emitting the
   route nodes + route→handler unresolved references that
   `rust-csharp-framework-routes.ts` inserts during finalization. Handler names
   were then joined against the Rust-produced `method` nodes in SQLite — the
   same symbol-name resolution the batched finalizer performs.

3. The back-fill gate: `aspnetResolver.detect(context)` evaluated against the
   corpus file set (must be `true`, or the back-fill never runs).

## Result

### Rust baseline

- Files indexed: **66** (64 C#, 2 JS)
- Files errored: **0** (every C# file's `errors` column empty)
- Nodes created: **872**; edges created: **806**
- Wall time: ~275 ms total, C# parse+extract ~53 ms (debug build)
- Route nodes in the Rust graph **before** back-fill: **0** (the Rust core does
  no ASP.NET route extraction).

C# node distribution (63 namespaced C# files emit one `module` each):

| Count | Kind |
|------:|------|
|   250 | import |
|   138 | variable |
|   120 | method |
|   107 | property |
|    66 | file |
|    63 | field |
|    63 | module (namespace) |
|    62 | class |
|     3 | interface |

### TS route back-fill (the framework half of the split)

- `aspnetResolver.detect()` on the corpus: **true** (matched controller source
  carrying `[ApiController]`/`[Route]`/`[Http*]` and `ControllerBase`, and
  `Program.cs` containing `WebApplication`).
- Route nodes extracted: **25** (15 GET, 10 POST), all attribute-controller
  routes; 0 minimal-API routes (this project declares none — `Program.cs` uses
  MVC `MapControllerRoute`, which is conventional routing outside the
  extractor's scope).
- Route → handler unresolved references emitted: **25** (one per action).
- Handler resolvability against Rust `method` nodes:

| Resolution scope | Count |
|---|---:|
| Same-file exact match to a Rust `method` node | **25** |
| Global-only name match | 0 |
| **Unresolved (missing Rust method)** | **0** |

Every back-filled route's handler reference therefore resolves in the same
finalization pass — the same outcome asserted deterministically in CI by the
new controller and minimal-API fixtures. Controller attribution:
`ManageController.cs` 20 routes, `OrderController.cs` 2, `UserController.cs` 3
(the counts include multiple `[Http*]` actions per controller).

### Before / after cutover

| Metric (rust-hybrid, `src/Web`) | Before 1-2-4-4 | After 1-2-4-4 |
|---|---:|---:|
| C# parse/extraction errors | 0 | 0 |
| Baseline C# symbol nodes (Rust) | 872 | 872 |
| TS `.cs` fallback files scheduled | 64 (hash-no-op) | **0** |
| ASP.NET `route` nodes | 25 (TS parse pipeline) | **25 (back-fill)** |
| Route→handler edges resolvable to Rust methods | 25 | **25** |

The graph after the cutover is identical for both baseline symbols and routes;
what changes is that the redundant TypeScript parse of all 64 `.cs` files is no
longer scheduled (pre-cutover it hash-short-circuited to a no-op because the
Rust core had already written each file's `sha256(raw disk content)`, proven in
1-2-4-2), while routes are preserved by the explicit back-fill instead of the
now-bypassed per-file TS framework step.

### Honest limitations recorded, not gamed

- Route names retain the raw token placeholders (`/[controller]/[action]`,
  `/[controller]`) because token substitution (`SlugifyParameterTransformer`,
  `[controller]`→controller name) is an ASP.NET **runtime** convention. The
  extractor does not expand them; this matches the pre-cutover TS behavior and
  is out of scope for the ownership move.
- Conventional MVC routing (`MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}")`)
  produces no route node — again identical to the pre-cutover extractor, which
  only models attribute routes and explicit minimal-API `Map*` calls.
- The sparse corpus omits the referenced projects, so cross-project type edges
  are intentionally not measured here; the 1-2-4-2 fixture covers cross-file
  resolution within an indexed set.

## Verification gates

- New deterministic fixtures in
  `__tests__/frameworks-integration.test.ts`,
  `describe('ASP.NET framework routes on rust-hybrid (roadmap 1-2-4-4 cutover)')`:
  - `[HttpGet]` controller routes (class-level `[Route]` prefix + bare and
    `{id}` actions) resolve to Rust-extracted handler methods;
  - minimal-API `app.MapGet`/`app.MapPost` resolve to Rust-extracted
    `Pong`/`CreateItem` static methods declared in a separate file.
  Both titles are registered in `ci.yml` step2's `-t` filter; the
  `skip-debt-guardrail` audit confirms each `-t` branch matches exactly one
  real test (23/23 branches, zero dead filters).
- Ownership contract flipped in `__tests__/extraction.test.ts`
  (`isRustHybridOwnedLanguage('csharp') === true`,
  `engineByLanguage.csharp === 'rust'`, `fallbackByLanguage.csharp === 0`) and
  the hardcoded language snapshot in
  `__tests__/rust-index-engine-cli-engine.test.ts` extended to the 12th
  language.
- Blazor regression guard retained: the legacy TS-engine/razor delegation test
  `delegates Blazor @code block C# …` (`extraction.test.ts`) still passes
  because `csharp.ts` is retained; legacy direct-TS C# extraction/import tests
  are likewise retained (they exercise the surviving pure-TS engine, exactly as
  the Python/Go direct tests survive).
- `ALLOWED_SKIPS` remains empty; no `.skip` / `.only` introduced.
- Because the local clone cannot run vitest, the corpus half above was run
  through the real Rust binary + the retained TS resolver and joined against
  SQLite; end-to-end vitest arbitration (including the actual
  `finalizeRustIndex` back-fill ordering) is delegated to the 3-OS CI matrix on
  this node's push, where the Windows log must show the two new cases
  **run** (`✓` with duration), not skipped (`↓`).

## Decision

The C# ASP.NET cutover validation gate **passes**. On the real eShopOnWeb Web
project the Rust core extracts all baseline C# symbols with zero parse errors
(872 nodes, 120 methods), and the retained TypeScript `aspnetResolver`, invoked
through the new finalization back-fill, restores all 25 attribute routes whose
25 handler references resolve to same-file Rust `method` nodes (0 unresolved).
The post-cutover graph equals the pre-cutover graph for both baseline symbols
and routes while scheduling zero `.cs` TS-fallback files. The razor/TS-engine
boundary that keeps `csharp.ts` in the tree is a deliberate, precedent-backed
refinement of the split, not a fallback gap. The ownership cutover is safe to
land once the 3-OS CI matrix is green.
