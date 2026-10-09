# Rust-Owned PHP Corpus Validation (Laravel + Drupal)

Date: 2026-10-09
Roadmap: 1-2-5-3 PHP 确定性 fixture 测试 + 真实语料验证（在 1-2-5-1 baseline
symbols、1-2-5-2 reference-edge emission 之后，1-2-5-4 ownership cutover 之前）

## Why two corpora

PHP production code has two dominant shapes that exercise different parts of
the extractor:

1. **Modern PSR-4 OOP** — deep namespaces, dense `use` imports, static facade
   calls, same-named contracts across namespaces (the Laravel Factory
   ambiguity). `laravel/framework` is the canonical such codebase.
2. **Drupal's mixed style** — PSR-4 classes under `core/lib/Drupal` **plus**
   procedural `.module`/`.install` hook files without a namespace, legacy
   no-namespace classes, and the non-`.php` extensions the extractor must still
   scan as PHP (`module`/`install`/`theme`/`inc`).

Validating both keeps the gate honest about OOP namespace resolution and the
procedural/Drupal-specific extension path in one node.

## Corpora

| Corpus | Repository | Checkout (shallow, sparse) | Subset indexed | PHP-family files | LOC (PHP) |
|---|---|---|---|---:|---:|
| Laravel | `laravel/framework` | `848f3edfc03fc5b235344126340543281950bfb4` | `src/Illuminate` | **1,742** | **275,240** |
| Drupal | `drupal/drupal` (`git.drupalcode.org/project/drupal`) | `c305d6533a66de8fdff5e868df366cf3034bbeaf` (`main`) | `core/lib/Drupal` + `core/modules/node` + `core/modules/user` | **2,859** | **329,402** |

Local checkouts live OUTSIDE the repository (`C:\workspace\php-corpus`, sparse
shallow clones); they are not vendored. The Drupal PHP-family count is 2,855
`.php` + 2 `.module` + 2 `.install`. The sparse cone also retains a handful of
repo-root entry/API files (index.php, update.php, install.php, autoload.php,
`core/lib/Drupal.php`, `core/core.api.php`, …), all counted above; the two
modules' `.module`/`.install` files contribute 994 LOC of procedural code.

The indexes also swept a few JS files that ship inside the sparse subsets
(Laravel exception-renderer `vite.config.js`/`scripts.js`, Drupal module
`js/*.js`); those are JavaScript and are excluded from all PHP counts below.

## Grammar supply

- `tree-sitter-php` (PHP-only grammar, pinned in
  `crates/zcodegraph-core/Cargo.toml`) parses all five PHP-family extensions.
- The scan dispatch (`crates/zcodegraph-core/src/lib.rs`) maps
  `php | module | install | theme | inc` to `SourceLanguage::Php`.
- No source normalization is applied for PHP (unlike C#'s preprocessor
  blanking).

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

| Metric | Laravel `src/Illuminate` | Drupal subset |
|---|---:|---:|
| Files indexed (all langs) | 1,744 | 2,865 |
| PHP-family files | 1,742 | 2,859 |
| Files errored (`filesErrored`) | **0** | **0** |
| Files with non-empty `errors` column | **0** | **0** |
| Nodes with kind `ERROR` | **0** | **0** |
| Nodes created | 28,578 | 32,661 |
| `contains` edges | 26,834 | 29,796 |
| Unresolved references | 54,324 | 72,148 |
| Files with >=1 non-import ref | 1,466 | 2,434 |
| Wall time (debug, total / parse+extract / SQLite) | 6.9s / 2.66s / 1.96s | 10.7s / 4.78s / 2.37s |

The pure-Rust engine emits containment plus unresolved references; cross-file
edge resolution (calls/instantiates/references/extends→implements) runs in the
language-agnostic TS finalizer under rust-hybrid and is gated separately by the
1-2-5-3 end-to-end test. As with the C# Newtonsoft gate, this benchmark reports
node shape and the unresolved-ref SUPPLY, not resolved edges.

### Node distribution

| Kind | Laravel | Drupal |
|---|---:|---:|
| method | 14,277 | 12,241 |
| import | 6,274 | 8,750 |
| field | 2,781 | 2,898 |
| file | 1,744 | 2,865 |
| module (namespace) | 1,651 | 2,607 |
| class | 1,274 | 2,050 |
| interface | 177 | 448 |
| trait | 191 | 96 |
| function (free/procedural) | 116 | 223 |
| constant | 64 | 367 |
| enum | 5 | 21 |
| enum_member | 24 | 89 |
| variable | 0 | 6 |

### Unresolved-reference distribution

| Reference kind | Laravel | Drupal |
|---|---:|---:|
| calls (function / member / scoped) | 40,311 | 50,412 |
| imports (`NS::leaf` use refs) | 5,086 | 8,673 |
| references (type hints + static value-reads) | 3,981 | 7,147 |
| instantiates (`new`) | 3,278 | 2,938 |
| implements (incl. in-class trait `use`) | 1,092 | 1,468 |
| extends | 571 | 1,510 |

(Laravel also shows 5 `exports` rows, all from the one JavaScript
`vite.config.js` swept in by the sparse subset — zero PHP `exports`.)

## Drupal-specific findings

- **Procedural hooks extracted as free functions.** The four
  `.module`/`.install` files yield namespace-free functions correctly, e.g.
  `node_install`, `node_schema`, `node_access_rebuild`, `node_mass_update`,
  `user_cancel`, `user_load_by_name`, `user_role_grant_permissions`,
  `_user_mail_notify` (34 such functions). Fully-qualified refs inside a hook
  (`new \Drupal\...\X()`, `\Drupal\Component\...\f()`) keep their leading-`\`
  text and are owned by the free-function frame, matching the wave0 fixture.
- **Legacy no-namespace classes keep bare qualified names.** Classes declared
  without a namespace (older `Drupal\Component`/renderer code) are indexed with
  a bare `qualifiedName` (e.g. `BatchStorage`, `MatcherDumper`), not a
  fabricated namespace — so they do not collide with namespaced symbols.
- **Extension coverage confirmed on real files**: `.module` and `.install`
  files are scanned as PHP and counted under `language='php'`; the registered
  set is `php/module/install/theme/inc`.

## Parse-gap and extraction-gap verdict

- **Parse gap = 0** on both corpora: `filesErrored=0`, every row's `errors`
  column empty, and no `ERROR`-kind nodes across 4,601 PHP-family files /
  ~605K LOC.
- **Extraction supply is rich and structurally correct**: 126,472 unresolved
  refs across 3,900 coupled files, spanning all six PHP kinds. The disambiguation
  precondition for the Laravel Factory case holds at scale — namespace is
  captured into the qualified name (`Contracts\Cache::Factory` vs
  `Contracts\Mail::Factory` are distinct), and `use` import refs rewrite to
  `NS::leaf`, which the hybrid NameMatcher binds (locked deterministically by
  the wave0 Factory fixture and the rust-hybrid e2e).
- **Honest limitation (not counted as a gap here)**: the pure-Rust layer does
  NOT resolve edges, so this document makes no claim about the resolved-edge
  recall/precision on these corpora; that belongs to the rust-hybrid finalizer
  and the 1-2-5-3 cross-file e2e. Property types deliberately emit no ref
  (exact TS parity, `extractField` PHP early-return); pseudo/primitive types are
  filtered. These are locked by fixtures, not measured as missing edges.

`EXTRACTION_VERSION` is **not** bumped: the PHP Rust extractor is unreleased
and the ownership cutover has not happened, so this is work inside the same
unreleased PHP semantic batch (v2).

## Verification gates

- Deterministic wave0 fixtures in
  `__tests__/rust-owned-language-fixtures.test.ts`,
  `describe('PHP baseline (roadmap 1-2-5)')`, six cases (CI runs the whole file
  with no name filter, across ubuntu/macos/windows, no `.skip`):
  1. class extraction + extends/implements + param/return type refs + calls
     (mirrors the legacy TS `PHP Extraction` cases);
  2. all five `use` forms as import nodes + namespaced-only `NS::leaf` import
     refs (global `Mockery`/`Closure` emit none);
  3. same-named Factory interfaces qualified by namespace + the
     use-disambiguated import ref;
  4. the three call shapes + fully-qualified `new \NS\Class`;
  5. param/return + static value-read refs, filtering property types, pseudo
     types, and primitives;
  6. interface `extends` (base_clause), enum `implements` (class_interface_clause),
     in-class trait `use`, and a Drupal `.module` procedural hook file.
- rust-hybrid cross-file end-to-end in `__tests__/extraction.test.ts`,
  `describe('PHP cross-file reference edges on rust-hybrid (roadmap 1-2-5-3)')`,
  two cases: resolved cross-file calls/implements/instantiates/references/
  imports with the Factory use-import blast-radius (Cache reaches Service, Mail
  does not), and a pre-cutover plan guard (`php` still on the TypeScript
  fallback side; flipped in 1-2-5-4). Both titles are registered in
  `.github/workflows/ci.yml` step2's `-t` filter and pass the skip-debt
  guardrail's "every branch matches a real title" check.
- Because the local clone cannot run vitest, each fixture source was indexed
  end-to-end through the freshly built Rust binary and asserted directly
  against SQLite; vitest arbitration and the 3-OS matrix are delegated to CI on
  this node's push.

## Decision

The PHP real-corpus validation gate **passes**. Two complementary,
medium-to-large real PHP codebases — modern PSR-4 Laravel (1,742 files /
275K LOC) and mixed PSR-4 + procedural Drupal (2,859 files / 329K LOC) — parse
and extract through Rust with zero parse/extraction errors and zero ERROR
nodes, producing internally consistent node distributions (namespaces as
modules, classes/interfaces/traits/enums, methods vs fields, free functions for
hooks) and a rich, all-six-kind unresolved-ref supply (126,472 refs across
3,900 coupled files). The namespace/use disambiguation precondition that the
Laravel Factory case depends on holds at scale. The ownership cutover (adding
`php` to `RUST_HYBRID_RUST_OWNED_LANGUAGES` and adding the Laravel route
back-fill) proceeds in node 1-2-5-4.
