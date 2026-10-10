# Rust-Owned Dart Corpus Validation (Flutter framework + dart-lang/collection)

Date: 2026-10-10
Roadmap: 1-2-9-3 Dart 确定性 fixture 测试 + 真实语料验证（在 1-2-9-1
SourceLanguage/grammar/baseline symbols、1-2-9-2 reference-edge emission 之
后，1-2-9-4 ownership cutover 之前）。镜像 Ruby 1-2-6-3 的
`2026-10-09-rust-owned-ruby-rails-rack-validation.md` 形态。

## Why two corpora

Dart production code has two dominant shapes that exercise different parts of
the extractor:

1. **Mega-framework OOP** — thousands of deeply nested widget-constructor
   expression trees, dense `mixin`/`extends`/`implements`, factories, enums with
   members, typedefs, and very large files (`material/icons.dart` alone is
   ~29K LOC). `flutter/packages/flutter/lib` (the framework, not an app) is the
   canonical such codebase.
2. **Classic pure-Dart library** — small generic collections with `library;`
   barrel shims, `export` directives, abstract classes and extension methods.
   `dart-lang/collection` is the canonical such codebase.

The framework corpus also surfaced two real cutover blockers (a parse gate and
a stack overflow) that no hand-written fixture could — see "Fixes the corpus
forced" below.

## Corpora

| Corpus | Repository | Checkout (shallow / sparse) | Subset indexed | Dart files | LOC |
|---|---|---|---|---:|---:|
| Flutter framework | `flutter/flutter` | tag **3.47.7** `abaf9c523780a608bd46686fd5e53740a07077f8` (`stable`, 2026-10-08) | `packages/flutter/lib` | **695** | **568,203** |
| collection | `dart-lang/collection` | tag **v1.19.0** `9354f386de3c57f5486b01ab4dfa1a2f033307d9` | `lib` | **29** | **6,050** |

Local checkouts live OUTSIDE the repository (`C:\workspace\dart-corpus`), a
shallow clone for collection and a `--filter=blob:none --sparse` cone for
Flutter; neither is vendored. All 695/29 files are `.dart`.

## Grammar supply

- tree-sitter-dart is pinned to a fork git dep
  `jununfly/tree-sitter-dart` rev `03b552c` (= UserNobody14 c1222f5, the last
  ABI-14 commit). Its AST is an exact match to the grammar the production
  tree-sitter-dart `.wasm` ships; only the Cargo dependency was bumped
  (0.22.6 → 0.24) to satisfy tree-sitter 0.24 single-native-links. Binding is
  the old-style `tree_sitter_dart::language()` function.
- The scan dispatch maps `dart` to `SourceLanguage::Dart`; the extractor lives
  in `crates/zcodegraph-core/src/dart.rs`.
- No source normalization is applied for Dart.

## Command

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI. The corpus validation used the Rust core binary
directly (debug build):

```bash
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path <subset root> \
  --index-path  <corpus>.db
```

## Fixes the corpus forced (both required to reach 0 errors)

Running the corpus against the 1-2-9-2 extractor exposed two defects, now fixed
in this node before the cutover:

### Fix 1 — Dart became parse-error tolerant (`library;`)

c1222f5 flags the **unnamed library directive `library;`** (legal since Dart
2.19) by inserting a MISSING identifier (`has_error=true`). It also misparses a
receiver that uses the contextual keyword `set` — `set.add(x)` in
`collection/lib/src/priority_queue.dart:312` — as a setter declaration (a real
ERROR node). The Rust hard gate (`root_node().has_error()` → drop the whole
file as `rust-owned-parse-gap`) therefore **rejected 7/29 collection files and
509/695 Flutter files** before this node.

The TS orchestrator never gated on `has_error` for ANY language (it always
extracted best-effort). Dart now joins Kotlin/C-family in
`SourceLanguage::tolerates_parse_errors()` (lib.rs). Rationale mirrors Kotlin:
the grammar flags *well-formed* constructs, and dropping the file would lose
the barrel `export` shims and (in Flutter) thousands of productive classes.
`dart.rs`'s walker has zero production `unwrap`/`expect`/indexing, so
error-recovery nodes cannot panic it.

### Fix 2 — Dart extraction runs on a large-stack worker

The recursive Dart walker (walk_decl + recursive `emit_type_refs`) overflowed
the default ~1 MiB Windows main-thread stack on Flutter's deep widget trees —
`thread 'main' has overflowed its stack` aborted the whole index before any DB
write. The per-file `dart::extract` call now runs in a `std::thread::scope`
worker with **`DART_EXTRACT_STACK_SIZE = 128 MiB`** (lib.rs). Extraction output
is byte-identical (host stack only); a walker panic still unwinds via
`resume_unwind`. A 2,000-level `Padding(child: …)` tree parses cleanly
(`has_error=false`) and now extracts, and deterministically guards the fix.

## Result — summary (after both fixes)

| Metric | Flutter `packages/flutter/lib` | collection `lib` |
|---|---:|---:|
| Files indexed | 695 | 29 |
| Files errored (`filesErrored`) | **0** | **0** |
| Files with non-empty `errors` column | **0** | **0** |
| Nodes with kind `ERROR` | **0** | **0** |
| Nodes persisted to `nodes` table | 29,002 | 680 |
| `contains` edges | 28,318 | 652 |
| Unresolved references | 209,475 | 2,892 |
| Files with ≥1 non-import ref | 658 | 23 |
| Wall time (debug, total) | 24.57s | 0.38s |
| parse+extract / tree-sitter / AST / SQLite (ms) | 17,490 / 7,852 / 8,586 / 5,003 | 172 / 60 / 77 / 68 |

> Counter note: the engine's result-JSON `nodesCreated` reports 29,013 / 681
> (the in-memory generated-node count, `nodes.len()` at lib.rs), while the rows
> actually persisted in the `nodes` table are 29,002 / 680. The table above and
> the distributions below use the persisted rows read directly from SQLite.
> This small in-memory/persisted difference is observed as generic engine
> behavior across languages and is not investigated further here (it does not
> affect the all-`dart` language tag or the zero-ERROR / zero-dropped-file
> gate this benchmark cares about).

The pure-Rust engine emits containment plus unresolved references; cross-file
edge resolution (calls→instantiates when a ref binds a class, extends/
implements edges) runs in the language-agnostic TS finalizer under rust-hybrid
and is gated separately by the 1-2-9-3 end-to-end fixtures. This benchmark
reports node shape and the unresolved-ref SUPPLY, not resolved edges (same
boundary as Ruby/PHP/C#).

### Node distribution

| Kind | Flutter | collection |
|---|---:|---:|
| method | 17,658 | 472 |
| import | 5,217 | 76 |
| class | 3,361 | 62 |
| enum_member | 987 | 0 |
| function (top-level) | 427 | 41 |
| type_alias | 411 | 0 |
| enum | 246 | 0 |
| file | 695 | 29 |

collection v1.19.0 declares no `typedef`/enhanced enums (its public types are
classes/functions with `library;` barrels); Flutter exercises every Dart kind.

Every Dart symbol kind the TS extractor emits is supplied at scale, including
enums with members (Flutter makes heavy use of enhanced enums) and typedefs.

### Unresolved-reference distribution

| Reference kind | Flutter | collection |
|---|---:|---:|
| calls (bare / receiver-collapsed / `new`/`const`) | 146,569 | 1,549 |
| references (type refs + capitalized static value reads) | 54,335 | 1,205 |
| imports | 5,217 | 76 |
| extends | 2,545 | 25 |
| implements (mixin `with` + `implements` clauses) | 809 | 37 |

All five Dart reference kinds are supplied at scale.

## Honest parse-recovery accounting

`filesErrored=0` means no file was dropped; it does NOT mean every tree was
syntactically clean. With the pinned c1222f5 grammar, an independent parse-only
probe over the 695 Flutter files reports:

- **495 files** have exactly one MISSING identifier — the file-header unnamed
  `library;` directive (identical benign shape every time).
- **33 files** additionally contain ≥1 real ERROR node. Root causes are c1222f5
  grammar limitations: error-recovery on CRLF-rendered license-header blocks
  (the on-disk file is LF; the grammar's recovery range simply starts at the
  first comment — confirmed unchanged after LF conversion), `external` FFI
  declarations (`@ffi.Int32() external int …` in `_window*.dart`), and the
  contextual-keyword receiver class (`set.add`).
- collection: 6 MISSING-`library;` shims + 1 real-ERROR (`set.add`), 7 files
  with `has_error=true` out of 29.

These trees still extract productively under tolerance — e.g. `scaffold.dart`
yields 149 nodes / 1,116 refs, `navigator.dart` 321 / 1,930,
`widget_inspector.dart` 283 / 2,041; collection's `set.add` file still yields 33
non-file nodes. The lost content is confined to the misparsed local expression,
matching TS best-effort parity. A grammar bump beyond ABI 14 would remove these
but is blocked by tree-sitter 0.24 (the same constraint as C# 0.23.1); it is
out of scope for this migration and tracked as a known grammar ceiling, not a
Rust extraction gap.

## Verification gates

- Deterministic wave0 fixtures in
  `__tests__/rust-owned-language-fixtures.test.ts`,
  `describe('Dart baseline (roadmap 1-2-9)')`, three cases (CI runs the whole
  file with no name filter across ubuntu/macos/windows, no `.skip`):
  1. class/mixin/enum/typedef/method/function symbols + qualified names +
     visibility matrix + `extends`/`implements`/`with` + signature type refs
     (builtins filtered, typedef RHS emits none);
  2. `dart:` / `package:` / relative / `export` import nodes and imports refs;
  3. selector/new/const calls and capitalized static value reads.
- Two new Rust integration tests in `crates/zcodegraph-core/src/lib.rs`:
  `dart_tolerates_unnamed_library_directive_and_keeps_export_shim` and
  `dart_extracts_deeply_nested_widget_tree_on_large_stack_worker`. Full lib
  suite **171 passed / 0 failed** (169 prior + 2 new).
- The 18 `dart.rs` unit tests still pass under the same full-suite run.
- Each fixture source was indexed end-to-end through the freshly built Rust
  binary and asserted directly against SQLite (symbols, qualified names, every
  reference kind); vitest arbitration and the 3-OS matrix are delegated to CI.
- `skip-debt-guardrail` audit replicated locally: `ALLOWED_SKIPS` stays empty
  (0 skip sites, no `.only`), all 33 ci.yml `-t` branches match a real title
  (0 dead), and the three Dart baseline cases correctly run under the full-file
  step1 rather than step2's cross-file `-t` filter. No ci.yml /
  skip-debt / packaged-path-contract changes were needed.

`EXTRACTION_VERSION` is **not** bumped: the Dart Rust extractor is unreleased
and the ownership cutover has not happened (1-2-9-4), so this is work inside the
same unreleased semantic batch.

## Decision

The Dart real-corpus validation gate **passes**. Two complementary real Dart
codebases — the Flutter framework (695 files / 568K LOC of mega-framework OOP
with deep widget nesting) and dart-lang/collection (29 files / 6K LOC classic
generic library with `library;` barrels) — now parse and extract through Rust
with **zero files dropped and zero ERROR-kind nodes**, rich node distributions
(17,658 methods / 3,361 classes / enhanced enums / typedefs in Flutter) and
212,367 unresolved refs spanning all five Dart kinds across 681 coupled files.
The two blockers the corpus forced — the over-strict parse gate on legal
`library;` and the main-thread stack overflow — are fixed (tolerant parsing
like Kotlin; 128 MiB extraction worker) and locked deterministically. The
ownership cutover (adding `dart` as the 15th entry of
`RUST_HYBRID_RUST_OWNED_LANGUAGES` and removing the TS fallback scheduling)
proceeds in node 1-2-9-4.
