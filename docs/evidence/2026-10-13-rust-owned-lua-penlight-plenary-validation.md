---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-13-rust-owned-lua-penlight-plenar
bounded-question: "What evidence does 2026-10-13-rust-owned-lua-penlight-plenary-validation provide?"
---
# Rust-Owned Lua Corpus Validation (Penlight + plenary.nvim)

Date: 2026-10-13
Roadmap: 1-2-12-3 Lua 确定性 fixture + 真实语料 gate（在 1-2-12-1
grammar/dispatch 接入、1-2-12-2 baseline visitor 之后，1-2-12-4 ownership
cutover 之前）。镜像 1-2-14-3 Objective-C 的
`2026-10-12-rust-owned-objc-afnetworking-sdwebimage-validation.md` 形态。

## Why two corpora

Real Lua has two dominant dialect shapes that exercise different parts of the
extractor — and, more importantly for this gate, they stress the **grammar
generation gap** flagged in 1-2-12-1: the Rust side pins the older
tree-sitter-lua **0.2.0** (last ABI-14 release, MunifTanjim grammar) while the
production TS wasm uses the newer @tree-sitter-grammars ABI-15 grammar. This
gate verifies the pinned grammar's multiset/error-recovery against modern real
code.

1. **Classic stdlib-style Lua** — `lunarmodules/Penlight` at `dfa483d` is the
   canonical pure-Lua utility library (Lua 5.1/LuaJIT style, no 5.2+
   constructs). It is dense with the `local M = {}` / `function M.x()` /
   `function M:y()` table-module idiom, `local function` nesting, and
   `require('pl.mod')` dotted-module imports. It stresses function/method
   splitting by the `name` field child and `table::name` qualified naming.
2. **Modern Neovim Lua** — `nvim-lua/plenary.nvim` at `74b06c6` uses newer and
   more varied syntax: Lua 5.2 `goto`/`::label::`, 5.3 bitwise operators, ~95
   anonymous `function()` closures, and a 1,072-LOC deeply-nested profiler.
   It stresses the old grammar's error recovery and the visitor's pruning of
   anonymous function initializers.

**Neither corpus forced a parse-tolerance or stack change**: tree-sitter-lua
0.2.0 parsed every `.lua` file with zero ERROR nodes, including the goto/bit-op
modern syntax and the deepest file. Unlike Dart (128 MiB scoped worker) no
large-stack thread was needed — both corpora index in well under a second on
the default stack (Lua ASTs are shallow, like Go/Java). Lua stays OUT of
`tolerates_parse_errors()`.

## Corpora

| Corpus | Repository | Checkout (shallow / sparse) | Subset indexed | `.lua` files | `.lua` LOC |
|---|---|---|---|---:|---:|
| Penlight | `lunarmodules/Penlight` | `dfa483dddc0d751be1047667f4580dd90319169c` (default branch HEAD) | `lua/` + cone root `run.lua` | **40** | **14,235** |
| plenary.nvim | `nvim-lua/plenary.nvim` | `74b06c6c75e4eeb3108ec01852001636d85a932b` (default branch HEAD) | `lua/` | **80** | **13,138** |

The Penlight cone has 39 files under `lua/`; the indexed 40th is the sparse
cone root `run.lua` — all 40 on-disk `.lua` files are indexed, no gap.

Local checkouts live OUTSIDE the repository (`C:\workspace\lua-corpus`), as
`--depth 1 --filter=blob:none --sparse` cones; neither is vendored.

## Grammar supply

- tree-sitter-lua is a crates.io dependency `tree-sitter-lua = "=0.2.0"` (last
  ABI-14 release; 0.4.x/0.5.x generated parser.c are ABI 15 and fail
  `set_language` with `LanguageError{version:15}`; 0.1.0 has no `LANGUAGE`
  constant). It bridges into tree-sitter 0.24 via
  `tree_sitter_lua::LANGUAGE.into()` (tree-sitter-language 0.1 shim) — no git
  fork (same shape as tree-sitter-objc 3.0 / tree-sitter-swift 0.6). Locked in
  the 1-2-12-1 ABI probe.
- Scan dispatch maps `.lua` to `SourceLanguage::Lua`; the extractor lives in
  `crates/zcodegraph-core/src/lua.rs` and is invoked directly on the main
  thread (no scoped worker).
- Lua is NOT in `tolerates_parse_errors()` (aligned with Go/Java/Ruby) and has
  no cross-language family. This gate produced no reason to change either.

## Command

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI. The corpus validation used the Rust core binary
directly (debug build):

```bash
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path C:/workspace/lua-corpus/Penlight \
  --index-path   C:/workspace/lua-corpus/Penlight.db

./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path C:/workspace/lua-corpus/plenary.nvim \
  --index-path   C:/workspace/lua-corpus/plenary.nvim.db
```

## Result — summary

| Metric | Penlight `dfa483d` | plenary.nvim `74b06c6` |
|---|---:|---:|
| `.lua` files dispatched to `lua` | 40 | 80 |
| Files errored (`filesErrored`) | **0** | **0** |
| Files with non-empty `errors` column | **0** | **0** |
| Nodes with kind `ERROR` | **0** | **0** |
| Index duration (debug binary) | 385 ms | 377 ms |
| Lua nodes persisted (excl. file nodes) | 2,474 | 1,834 |
| Contains edges persisted | 2,475 | 1,836 |
| Unresolved refs (`calls` + `imports`) | 2,371 | 2,280 |

## Lua node / reference multiset

| Kind / ref | Penlight | plenary.nvim |
|---|---:|---:|
| variable (`local …`) | 1,701 | 1,331 |
| method (`function t.f()` / `function t:m()`) | 485 | 244 |
| function (global / `local function`) | 207 | 144 |
| import (`require(...)`) | 81 | 115 |
| **calls** ref | 2,290 | 2,165 |
| **imports** ref | 81 | 115 |

Lua has no classes/structs/interfaces/enums/type aliases and therefore no
`extends`/`implements`/`references` symbol-typed edges: tables are used for
everything, so the reference multiset is exactly `calls` + `imports`.

## Naming parity spot-checks (old 0.2.0 grammar vs the TS extractor contract)

- **Table methods** (`function List:clone()` / `function List.clone()`):
  simple name is the trailing `field`/`method`; qualified name is forced to
  `<table>::<name>` — observed `List::clone`, `List::append`,
  `utils::writefile`, `utils::split`. Because a Lua table carries no class
  node, the method's `contains` edge attaches to the stack head (file or
  enclosing function), matching TS `extractMethod` when its receiver owner
  lookup finds no struct/class/enum/trait.
- **Nested local functions** stack qualified names: `parse_date_unsafe` holds
  a nested local function reported as `parse_date_unsafe::nextp`.
- **require imports**: dotted module strings resolve to their content —
  `pl.utils` (26), `pl.List` (9), `pl.tablex` (8). A **dynamic**
  `require('pl.' .. name)` (import_into.lua:39,67) resolves to the literal
  string prefix `pl.`; this is faithful parity — the TS extractor also reads
  only the `string_content` text and cannot evaluate the concatenation.
- **Calls** keep the full `name` field text verbatim (dot and colon both
  preserved, `self` not folded), exactly like the TS Lua branch which never
  enters the member-expression receiver fold.
- **Anonymous closures** (`local f = function() … end`, ~95 in plenary) emit
  no `function` node; the enclosing local is the `variable` with an
  `= function()…` signature, and the initializer body is pruned. Deterministic
  coverage for the prune is in the wave-0 fixture `locals.lua` (its inner
  `lost()` is asserted absent from `calls`).

## Deterministic fixtures (wave 0)

`tests/rust-owned-language-fixtures.test.ts` gains a
"Lua baseline (roadmap 1-2-12-3)" describe block (pure `--engine rust`, the
#692 contract — no framework finalizers; Lua has none), with three cases:

1. `src/module.lua` — golden multiset: plain functions with stacked qnames
   (`helper`, `helper::inner`, global `top`), one table method `M::greet`,
   locals `net`/`M`, a `require('net.http')` import + `imports` ref, and calls
   including the colon `acct:deposit` and dotted/identifier callees.
2. `src/calls.lua` — callee spelling: `M.greet` dot kept, `self:add` /
   `selfish:nest` colon kept with `self` NOT folded, nested calls in arguments
   (`foo(bar())`), and a `require` nested in `wrap(require('dep'))` captured as
   an import, never a call.
3. `src/locals.lua` — multi-name locals (`local a, b = 1, 2`), an anonymous
   `local f = function() … lost() … end` whose body is pruned (`lost()` not in
   `calls`, no anonymous function node, variable signature starts with
   `= function()`), and a require-initializer local dug out explicitly.

These are engine-agnostic TS-shell e2e assertions (spawn the Rust binary, read
back SQLite). Local development built the debug binary and validated the same
three samples byte-for-byte against it with direct SQLite probes — all
assertions passed (success, `filesErrored=0`); the vitest run and three-OS
portability are arbitrated by CI. The same contract is also locked in Rust by
`lua_baseline_visitor_extracts_functions_methods_requires_and_calls` in
`crates/zcodegraph-core/src/lib.rs` (180 lib tests green).

## What did NOT change

- No `EXTRACTION_VERSION` bump (this is an unreleased batch; cutover lands in
  1-2-12-4).
- No `tolerates_parse_errors()` change, no large-stack worker, no
  `RUST_OWNED` membership change, no framework finalizer (Lua has no route
  table / framework macros) — all reserved/irrelevant for 1-2-12-4.
- `src/extraction/languages/lua.ts` stays as the pure-TS fallback/reference
  extractor.
- The pinned 0.2.0 grammar showed **zero multiset/error-recovery drift** on
  both the Lua 5.1 stdlib dialect and the modern Neovim dialect, so the Dart
  fork-and-regenerate fallback (rebuild the newer grammar as ABI 14) was not
  needed. 1-2-12-4 can proceed with the crates.io 0.2.0 pin as-is.
