---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-15-rust-owned-scala-spark-validat
bounded-question: "What evidence does 2026-10-15-rust-owned-scala-spark-validation provide?"
---
# Rust-Owned Scala Corpus Validation (apache/spark)

Date: 2026-10-15
Roadmap: 1-2-11-3 Scala 确定性 fixture + 真实语料 gate（在 1-2-11-1
grammar/dispatch 接入、1-2-11-2 reference edge emission + gap diagnostics
之后，1-2-11-4 ownership cutover 之前）。镜像 1-2-12-3 Lua 的
`2026-10-13-rust-owned-lua-penlight-plenary-validation.md` 形态。

## Why one corpus

Scala's real-world shape is dominated by a single, dense idiom: the JVM
trait/class/object hierarchy with `val`/`var` fields, `def` methods, and
package-qualified imports. The most faithful stress test is a large,
production-grade JVM codebase that exercises:

- deep `extends ... with ...` mixin chains,
- `case class` / `case object` sugar,
- Scala 3 `enum` definitions coexisting with Scala 2 source,
- `type` aliases, generic signatures, and chained receiver calls.

`apache/spark` is the canonical such corpus — it is one of the largest
open-source Scala codebases in the world and stresses every one of those
paths.

**This corpus DID force a parse-tolerance change** (unlike Lua, which needed
none). 42 of 690 dispatched files initially failed with parse gaps. Root cause
analysis of the three error classes (below) concluded they are all *legal*
Scala that the grammar does not yet implement — not extractor bugs. Scala was
therefore added to `tolerates_parse_errors()`, matching the parity contract the
TS orchestrator already provides (it never gated on `has_error`). After the
change: **0 errored files** and +2,109 recovered nodes.

## Corpora

| Corpus | Repository | Checkout (shallow / sparse) | Subset indexed | `.scala` files | `.scala` LOC |
|---|---|---|---|---:|---:|
| Spark | `apache/spark` | `de2035fcfbf2358eed0ef05feb8e8bd38509922f` (default branch HEAD) | `core/src/main/scala` + `common/utils/src/main/scala` | **681** | **162,045** |

The index dispatches 690 total files (681 `.scala` + 9 other source files in the
cone that map to already-owned languages); the Scala-language gate is the 681.

Local checkout lives OUTSIDE the repository (`C:\workspace\scala-corpus\spark`),
as a `--depth 1 --filter=blob:none --sparse` cone; it is not vendored.

## Grammar supply

- tree-sitter-scala is a crates.io dependency `tree-sitter-scala = "=0.24.1"`
  (last ABI-14 release; 0.25.x jumped to tree-sitter 0.25 / ABI 15 and fails
  `set_language` with `LanguageError{version:15}` — the same pin class as
  c-sharp 0.23.1, swift 0.6.0, objc 3.0.2, lua 0.2.0, luau 1.2.0, pascal
  0.10.2). It bridges into tree-sitter 0.24 via
  `tree_sitter_scala::LANGUAGE.into()` (tree-sitter-language 0.1 shim) — no git
  fork. Locked in the 1-2-11-1 ABI probe.
- Scan dispatch maps `.scala` / `.sc` to `SourceLanguage::Scala`; the extractor
  lives in `crates/zcodegraph-core/src/scala.rs` and is invoked on the main
  thread (no scoped worker — Scala ASTs are not pathologically deep).
- Scala was ADDED to `tolerates_parse_errors()` by this gate (see next section).

## Parse-tolerance decision (the 42 → 0 narrative)

The first index run reported `filesErrored = 42`. An error-focused AST probe
(`scala-error-probe.exe`) classified every failure into exactly three grammar
gaps, all on *legal* Scala:

1. **XML literals** — Spark UI pages embed Scala 2 XML literals (`<div>…</div>`),
   which the tree-sitter-scala grammar does not implement. Largest single class.
2. **`enum` as an identifier** — Scala 2 code uses `enum` as a plain binding
   (`case Some(enum) => enum`); the grammar reserves `enum` as a Scala 3 keyword.
3. **Lambda-with-ascription** — `{ v: T => v.toString }` is mis-parsed as an
   ascription with an `ERROR` on the `=>`.

All three are grammar limitations, not source errors. The TS orchestrator never
gated extraction on `has_error`, so blocking these files on the Rust side would
be a *regression* in parity. Scala was added to `tolerates_parse_errors()` with
a doc comment naming these three classes. Result:

| Metric | Before tolerance | After tolerance |
|---|---:|---:|
| Files errored | **42** | **0** |
| Nodes persisted | 24,757 | **26,866** (+2,109) |
| Edges persisted | 24,067 | **26,176** |

## Command

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI. The corpus validation used the Rust core binary
directly (debug build):

```bash
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path C:/workspace/scala-corpus/spark \
  --index-path   C:/workspace/scala-corpus/spark/.zcodegraph/index.db
```

## Result — summary

| Metric | Spark `de2035f` |
|---|---:|
| `.scala` files dispatched to `scala` | 681 |
| Total files indexed (incl. other owned langs) | 690 |
| Files errored (`filesErrored`) | **0** |
| Files with non-empty `errors` column | **0** |
| Index duration (debug binary) | ~3.7 s |
| Scala nodes persisted (incl. file nodes) | 26,866 |
| Contains edges persisted | 26,176 |
| Unresolved refs (all kinds) | 32,248 |

## Scala node / reference multiset

| Kind | Count |
|---|---:|
| method (`def` in class/trait/object) | 7,736 |
| constant (`val` at class/top level) | 7,251 |
| import | 4,618 |
| field (`var`, and `val` in ctor/local scope) | 3,597 |
| class | 1,708 |
| file | 690 |
| variable (local `val`/`var`) | 549 |
| function (top-level `def`) | 534 |
| trait | 143 |
| type_alias (`type X = …`) | 31 |
| module | 9 |

| Unresolved ref kind | Count |
|---|---:|
| calls | 24,888 |
| imports | 4,618 |
| extends | 1,395 |
| references (val/var type subtrees) | 1,347 |

Edge kinds: `contains` 26,176 (only — `extends`/`implements`/`references` are
persisted as unresolved refs for the resolver, matching every other rust-owned
language).

## Naming parity spot-checks (vs the TS extractor contract)

- **Import `@path` filtering**: tree-sitter-scala 0.24.1 tags BOTH the
  identifier segments AND the `.` separator tokens with the `@path` field. The
  extractor filters `kind == "identifier"` before joining with `.`, so
  `import scala.collection.mutable` resolves to `scala.collection.mutable`, not
  `scala...collection...mutable`. Verified in corpus: `org.apache.spark` (171),
  `scala.collection.mutable` (88), `scala.jdk.CollectionConverters` (125).
- **Trait vs class vs object**: `trait_definition` → `trait`,
  `class_definition`/`object_definition` → `class`, `enum_definition` → `enum`.
  Spark is trait-heavy (143 traits vs 1,708 classes) — the `Logging` mixin
  alone shows up as an `extends`/`references` ref 306+157 times.
- **`val`/`var` name from `@pattern`**: names live in the `@pattern` field, not
  `@name`; `tuple_pattern` falls back to the first identifier child.
- **Bare `intM.empty` is a `field_expression`**: a no-paren method reference
  parses as `field_expression`, NOT `call_expression`, and emits no `calls`
  ref — faithful parity with the TS baseline (documented in the fixture).
- **Calls keep receiver qualification**: `field_expression` folds to
  `recv.method`, dropping `this`/`super`/`self`. Verified: `conf.get` (122),
  `context.reply` (95), `Utils.bytesToString` (74).

## Deterministic fixtures (wave 0)

`__tests__/rust-owned-language-fixtures.test.ts` gains a
"Scala baseline (roadmap 1-2-11-3)" describe block (pure `--engine rust`, the
#692 contract — no framework finalizers; Scala has none on this baseline), with
three cases:

1. `Greeter.scala` — trait/class/object/enum members with extends refs and
   imports (asserts imports joined with `.`, trait/class/enum/enum_member/
   type_alias qualified names, method vs function split, private visibility,
   field vs constant, extends/references/calls refs).
2. Type-subtree references — `val`/`var` type annotations walk
   `type_identifier` recursively, skipping `SCALA_BUILTIN_TYPES`, plus
   receiver-qualified calls.
3. Extension body hoisting — `extension_definition` children are visited
   directly and hoisted without an extra container node (handles both the
   bare-def shape, where `@body` IS the `function_definition`, and the block
   shape).

These are engine-agnostic TS-shell e2e assertions (spawn the Rust binary, read
back SQLite). Local development built the debug binary and validated the same
samples byte-for-byte against it with direct SQLite probes — all assertions
passed (success, `filesErrored=0`); the vitest run and three-OS portability are
arbitrated by CI. The same contract is also locked in Rust by two lib tests in
`crates/zcodegraph-core/src/lib.rs`:
`scala_parses_and_dispatches_through_rust_pipeline_grammar_wiring` and
`scala_baseline_visitor_extracts_symbols_inheritance_and_calls` (186 lib tests
green).

## What did NOT change

- No `EXTRACTION_VERSION` bump (this is an unreleased batch; cutover lands in
  1-2-11-4).
- No `RUST_HYBRID_RUST_OWNED_LANGUAGES` membership change — cutover is reserved
  for 1-2-11-4 (mirrors the Lua 1-2-12-2/-4 and Pascal 1-2-10-2/-4 rhythm).
  Briefly added during 1-2-11-2 and rolled back once the rhythm was confirmed.
- No large-stack worker (Scala ASTs are not pathologically deep; no Dart/128
  MiB scoped thread needed).
- No framework finalizer / route table on this baseline — the Play boundary
  decision is part of 1-2-11-4.
- `src/extraction/languages/scala.ts` stays as the pure-TS fallback/reference
  extractor.
- The pinned 0.24.1 grammar needed no fork; the three parse-gap classes are
  handled by tolerance, not by rebuilding the grammar. 1-2-11-4 can proceed
  with the crates.io `=0.24.1` pin as-is.
