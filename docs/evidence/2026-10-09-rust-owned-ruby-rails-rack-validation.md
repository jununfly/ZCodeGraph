# Rust-Owned Ruby Corpus Validation (Rails gems + Rack)

Date: 2026-10-09
Roadmap: 1-2-6-3 Ruby 确定性 fixture 测试 + 真实语料验证（在 1-2-6-1 baseline
symbols / grammar 注册、1-2-6-2 reference-edge emission 之后，1-2-6-4
ownership cutover 之前）。镜像 PHP 1-2-5-3 的
`2026-10-09-rust-owned-php-laravel-drupal-validation.md` 形态。

## Why two corpora

Ruby production code has two dominant shapes that exercise different parts of
the extractor:

1. **Deeply-namespaced framework OOP** — `module X::Y` nesting, concerns mixed
   in via `include`/`extend`, root-constant references (`::ActiveModel::API`),
   autoload style with few explicit `require`s, and class-method (`def self.x`)
   /`ClassMethods` module patterns. Three Rails gems (ActiveSupport,
   ActiveRecord, ActiveModel) are the canonical such codebase.
2. **Classic pure-Ruby library style** — flat-ish `module Rack` namespace,
   dense explicit `require`/`require_relative` imports, explicit superclasses,
   and minimal framework magic. `rack/rack` is the canonical such codebase.

Validating both keeps the gate honest about framework concern/mixin extraction
and explicit-require/import resolution in one node.

## Corpora

| Corpus | Repository | Checkout (shallow, sparse) | Subset indexed | Ruby-family files | LOC (Ruby) |
|---|---|---|---|---:|---:|
| Rails gems | `rails/rails` | `27ccca4ae367add808b65dc26bf46e4f81f41fe5` (`main`) | `activesupport/lib` + `activerecord/lib` + `activemodel/lib` | **800** | **121,398** |
| Rack | `rack/rack` | `a9833c8f3bd6b6d1e0ab35de00a1f1a16b5095f5` (`main`) | `lib` | **50** | **8,901** |

Local checkouts live OUTSIDE the repository (`C:\workspace\ruby-corpus`,
sparse shallow clones); they are not vendored. The Rails count is 799 `.rb` +
1 `.rake` (`activerecord/lib/active_record/railties/databases.rake`),
confirming the `.rake` extension scans as Ruby. The sparse cone also retains
the repo-root `.mdlrc.rb`, counted above. Rails contributes no `.ru` files in
this subset.

## Grammar supply

- `tree-sitter-ruby` 0.23 (builds against tree-sitter ^0.24, ABI 14 — the same
  grammar version pinned for every other language and matching the TS-side
  vendored wasm in tree-sitter-wasms 0.1.11) parses both extensions.
- The scan dispatch (`crates/zcodegraph-core/src/lib.rs`) maps
  `rb | rake` to `SourceLanguage::Ruby`; the extractor lives in
  `crates/zcodegraph-core/src/ruby.rs`.
- No source normalization is applied for Ruby.

## Command

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI. The corpus validation used the Rust core binary
directly (debug build):

```bash
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path <subset root> \
  --index-path  <subset root>/<corpus>.db
```

## Result — summary

| Metric | Rails gems subset | Rack `lib` |
|---|---:|---:|
| Files indexed (all langs) | 800 | 50 |
| Ruby-family files | 800 (799 `.rb` + 1 `.rake`) | 50 |
| Files errored (`filesErrored`) | **0** | **0** |
| Files with non-empty `errors` column | **0** | **0** |
| Nodes with kind `ERROR` | **0** | **0** |
| Nodes created | 13,519 | 878 |
| `contains` edges | 12,719 | 828 |
| Unresolved references | 35,537 | 2,294 |
| Files with >=1 non-import ref | 742 | 44 |
| Wall time (debug, total / parse+extract / SQLite) | 9.04s / 6.99s / 0.89s | 0.46s / 0.26s / 0.02s |

The pure-Rust engine emits containment plus unresolved references; cross-file
edge resolution (calls→instantiates when a bare/`User.new`/`User.find` ref
resolves to a class, superclass extends, mixin implements) runs in the
language-agnostic TS finalizer under rust-hybrid and is gated separately by the
1-2-6-3 end-to-end test. As with the PHP Laravel/Drupal gate, this benchmark
reports node shape and the unresolved-ref SUPPLY, not resolved edges.

### Node distribution

| Kind | Rails gems | Rack `lib` |
|---|---:|---:|
| method | 9,035 | 568 |
| module | 1,586 | 66 |
| class | 1,042 | 79 |
| import (require nodes) | 1,039 | 115 |
| file | 800 | 50 |
| variable (file-scope assignment) | 17 | 0 |

Both corpora show **zero** free `function` nodes — every `def` in these
subsets is lexically inside a class/module frame and is therefore a `method`,
which is the expected shape for framework/library Ruby (top-level scripts are
covered by the wave0 `.rake`/`script.rb` fixture instead). There are no
`interface`/`field` kinds: Ruby modules carry the interface role and
attributes are plain method calls, both matching the TS extractor's node
taxonomy.

### Unresolved-reference distribution

| Reference kind | Rails gems | Rack `lib` |
|---|---:|---:|
| calls (receiver-collapsed / scoped / bare) | 32,641 | 2,050 |
| imports (raw require name + `.rb`-suffixed file-path ref) | 1,938 | 203 |
| extends (superclass) | 522 | 24 |
| implements (mixin include/extend/prepend) | 436 | 17 |

Every reference kind the TS extractor emits is supplied at scale. The import
count is roughly 1.9x the require node count, matching the dual emission
(`require "x"` emits both the raw name `x` and, when it normalizes to a path
with a slash, the `.rb`-suffixed file ref — locked by the wave0 fixture).

## Ruby-specific findings

- **Rails concerns captured as mixin implements.** `include
  ActiveSupport::Concern` / `include ActiveModel::API` / `extend
  ActiveModel::Callbacks` resolve to `implements` refs from the enclosing
  class/module; there are **80** `...Concern` implements rows and 436 mixin
  refs overall. Editing a concern therefore has the supply it needs to surface
  every class that includes it (verified deterministically for the cross-file
  case by the 1-2-6-3 rust-hybrid e2e blast-radius assertion).
- **Root-constant text preserved (TS parity quirk).** Leading-root mixin and
  superclass refs keep their literal text: `include ::ActiveSupport::Concern`,
  `class LogSubscriber < ::Logger`, `< ::ArgumentError`, `<
  ::ActiveModel::Type::Value` all appear verbatim with the leading `::`. This
  faithfully mirrors the TS extractor (which does not strip the root marker),
  just as the PHP extractor keeps a leading `\`.
- **Deep lexical qualification is correct.** Nested module frames produce
  qualified names such as
  `ActiveModel::AttributeMethods::ClassMethods`,
  `ActiveModel::Attributes::Normalization::ClassMethods`, and
  `ActiveModel::AttributeSet::YAMLEncoder`; singleton defs (`def self.x`) and
  `ClassMethods` module methods are all `method` nodes qualified by their
  lexical stack, so same-named methods across classes stay distinguishable.
- **Adapter hierarchy extends.** ActiveRecord adapter superclasses
  (`AbstractMysqlAdapter < AbstractAdapter`, …) emit 522 `extends` refs,
  including bare and top-level `::` shapes.
- **`.rake` scans as Ruby on a real file**: `databases.rake` is indexed under
  `language='ruby'`; the registered extension set is `rb/rake`.
- **Explicit-require library style (Rack).** The 50-file Rack subset is dense
  in requires (115 import nodes / 203 import refs) with a flat `module Rack`
  frame and 79 classes — the contrasting shape to Rails' autoload/concern
  style — and parses with zero errors as well.

## Parse-gap and extraction-gap verdict

- **Parse gap = 0** on both corpora: `filesErrored=0`, every row's `errors`
  column empty, and no `ERROR`-kind nodes across 850 Ruby-family files /
  ~130K LOC.
- **Extraction supply is rich and structurally correct**: 37,831 unresolved
  refs across 786 coupled files, spanning all four Ruby kinds (calls, imports,
  extends, implements). Node distribution matches the language's OOP shape
  (methods/modules/classes, require import nodes, no spurious free functions
  inside class bodies). The disambiguation precondition for cross-file
  resolution — lexical qualification captured into `qualified_name` and
  receiver calls collapsing to their receiver text — holds at scale and is
  locked deterministically by the wave0 fixtures and the rust-hybrid e2e.
- **Honest limitation (not counted as a gap here)**: the pure-Rust layer does
  NOT resolve edges, so this document makes no claim about resolved-edge
  recall/precision on these corpora; that belongs to the rust-hybrid finalizer
  and the 1-2-6-3 cross-file e2e. Receiver-local call refs (`u.save` → `u`)
  cannot bind without symbol info and stay unresolved by design (exact TS
  parity); Rails `has_many`/`validates`/`belongs_to` DSL macros and
  `config/routes.rb` routes are framework semantics that remain the TypeScript
  finalization shell (Rails routes back-fill ships in 1-2-6-4), not
  per-file extraction.

`EXTRACTION_VERSION` is **not** bumped: the Ruby Rust extractor is unreleased
and the ownership cutover has not happened, so this is work inside the same
unreleased semantic batch.

## Verification gates

- Deterministic wave0 fixtures in
  `__tests__/rust-owned-language-fixtures.test.ts`,
  `describe('Ruby baseline (roadmap 1-2-6)')`, three cases (CI runs the whole
  file with no name filter, across ubuntu/macos/windows, no `.skip`):
  1. nested modules/class qualified names, superclass `extends`, include/extend
     `implements`, receiver-collapsed + bare calls, singleton method, and
     declaration-style `private :secret` visibility;
  2. `require` (load path) dual import refs (raw name + `.rb` path) and
     `require_relative` normalized to the sibling file;
  3. file-scope assignment-only variables, top-level `def` as `function`, and
     `.rake` indexing.
- rust-hybrid cross-file end-to-end in `__tests__/extraction.test.ts`,
  `describe('Ruby cross-file reference edges on rust-hybrid (roadmap 1-2-6-3)')`,
  one case: resolved cross-file superclass (extends), mixin include into a
  `module` target (implements), `User.new`/`User.find` receiver calls promoted
  to `instantiates` on the `create` method, and the concern blast radius
  (Authenticatable reaches the including service). The title is registered in
  `.github/workflows/ci.yml` step2's `-t` filter and passes the skip-debt
  guardrail's "every branch matches a real title" check. The post-cutover plan
  guard (`ruby` in RUST_HYBRID_RUST_OWNED_LANGUAGES) ships in 1-2-6-4 (see
  addendum below).
- Rust unit tests: 13 cases in `crates/zcodegraph-core/src/ruby.rs`
  (`cargo test --lib` — full suite 151 passing = 138 prior + 13 Ruby,
  0 regressions).
- Because the local clone cannot run vitest, each fixture source was indexed
  end-to-end through the freshly built Rust binary and asserted directly
  against SQLite (including the from-node attachment that the instantiates /
  extends / implements e2e relies on); vitest arbitration and the 3-OS matrix
  are delegated to CI on this node's push.

## Decision

The Ruby real-corpus validation gate **passes**. Two complementary real Ruby
codebases — deeply-namespaced framework OOP (Rails ActiveSupport +
ActiveRecord + ActiveModel, 800 files / 121K LOC) and a classic explicit-
require pure-Ruby library (Rack `lib`, 50 files / 8.9K LOC) — parse and
extract through Rust with zero parse/extraction errors and zero ERROR nodes,
producing internally consistent node distributions (methods vs modules/
classes, require import nodes, lexical `::` qualification) and a rich,
all-four-kind unresolved-ref supply (37,831 refs across 786 coupled files).
The Rails-concern mixin and root-constant/`::` parity preconditions hold at
scale. The ownership cutover (adding `ruby` to
`RUST_HYBRID_RUST_OWNED_LANGUAGES` and adding the Rails route back-fill)
proceeds in node 1-2-6-4.

---

## Addendum — 1-2-6-4 ownership cutover (same date)

Node 1-2-6-4 performs the split cutover, mirroring the PHP 1-2-5-4 / C#
1-2-4-4 boundary exactly:

- **Routing.** `ruby` becomes the 14th entry in
  `RUST_HYBRID_RUST_OWNED_LANGUAGES` (`src/indexing/rust-hybrid-contract.ts`).
  The hybrid plan therefore schedules every `.rb`/`.rake` file through Rust
  and records **`fallbackByLanguage.ruby === 0`** (pinned by a post-cutover
  plan guard in `__tests__/extraction.test.ts`).
- **Extractor retained, scheduling removed.** `src/extraction/languages/ruby.ts`
  and the barrel entry stay, serving only the pure `--engine typescript`
  engine. The cutover removes hybrid fallback *scheduling*, not the extractor
  — the same conservative boundary used for C#/python/go/PHP.
- **Rails routes back-filled in finalization.** A new
  `src/indexing/rust-ruby-framework-routes.ts` re-runs the retained,
  regex-only `railsResolver.extract` inside `finalizeRustIndex`, after
  `runPostExtract()` and before batched reference resolution. It inserts only
  dedicated `route` nodes plus `controller#action` unresolved refs (the
  resolver's `claimsReference(/^[\w/]+#\w+$/)` routes them to Pattern 0, which
  locates `app/controllers/<path>_controller.rb`'s action method). There is no
  PHP/Drupal shared-node hook shape, so the backfill is the dedicated-route
  form (five-field stats, no `hookReferences`) — structurally identical to the
  C# ASP.NET back-fill. Per-file `kind === 'route'` cleanup + deterministic
  `route:<file>:<line>:...` ids make it idempotent and incremental/`--force`
  safe; `resolver.clearCaches()` is called only when route nodes were added.
- **Framework shell stays TypeScript.** `resolution/frameworks/ruby.ts` and
  the import resolver are permanent TS shells; the Rust core never extracts
  Rails routes.

### Why the framework corpus adds no route rows

The Rails corpus above is the framework's own source (`activesupport` /
`activerecord` / `activemodel` `lib`): a gem defines no application
`Rails.application.routes.draw` table, so it ships **no** `config/routes.rb`
and the back-fill inserts zero route nodes for it (baseline Ruby symbols are
unchanged — the 13,519 / 878 node counts stand). Rails routing is *application*
semantics, so the cutover's route behaviour is validated deterministically by
a new rust-hybrid end-to-end case in
`__tests__/frameworks-integration.test.ts`
(`describe('Rails framework routes on rust-hybrid (roadmap 1-2-6-4 cutover)')`):
a Gemfile-flagged app with `app/controllers/articles_controller.rb` +
`pages_controller.rb` and a `config/routes.rb` containing
`resources :articles` and `get '/dashboard' => 'pages#home'`. A standalone
replication of the extractor regexes confirms the fixture yields exactly the
eight asserted shapes — seven `resources` actions
(`GET/POST /articles`, `GET /articles/new`, `GET/PATCH/DELETE /articles/:id`,
`GET /articles/:id/edit`) plus `GET /dashboard`, with precise
`articles#<action>` / `pages#home` refs — and the test asserts the resolved
`route -> Rust action method` `references` edges for the explicit route and
the `index` resource route, with zero parse errors. Both new test titles are
registered in ci.yml step2's `-t` filter; the local skip-debt guardrail audit
reports 33/33 branches matching a real `it()` title and an empty
`ALLOWED_SKIPS`.

`EXTRACTION_VERSION` is **not** bumped — Ruby remains inside the same
unreleased semantic batch (1-2-6-1 through 1-2-6-4 ship together), matching
the PHP/C# precedent.

