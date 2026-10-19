---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-14-rust-owned-luau-lute-rbxutil-v
bounded-question: "What evidence does 2026-10-14-rust-owned-luau-lute-rbxutil-validation provide?"
---
# Luau rust-owned baseline validation — lute + RbxUtil corpora (roadmap 1-2-13-3)

**Date**: 2026-10-14 · **Scope**: real-corpus gate for the Luau baseline visitor
(1-2-13-2) over tree-sitter-luau 1.2.0 (ABI 14, wired in 1-2-13-1). **Verdict**:
Luau enters `tolerates_parse_errors` (grammar-lagged legal syntax); with tolerant
gating both corpora index with **0 errored files**, walker zero-panic, and the
baseline multiset matches the TS luauExtractor shape node-for-node.

## Why these two corpora

| Corpus | SHA | Files (.luau) | Character |
|--------|-----|---------------|-----------|
| [luau-lang/lute](https://github.com/luau-lang/lute) | `7b97087` | 525 | The Luau team's own runtime: newest language surface (`@native`, `const function`, leading-pipe unions, `typeof(...)`, generic variadics `T...`, `::` casts), `@std`/`@batteries` requires |
| [Sleitnick/RbxUtil](https://github.com/Sleitnick/RbxUtil) | `31f9120` | 69 | Mainstream Roblox library: `script.Parent` instance-path requires, class-idiom methods (`Signal.new`, `M:deposit`), buffer/DataType APIs |

Two other candidates were rejected during the gate: `luau-lang/luau` tests (the
conformance suite ships intentionally-invalid and non-UTF-8 files — a parser
torture corpus, not production code) and `JohnnyMorganz/luau-lsp` (only 26
`.luau` in a large C++ tree; the rust walker scans the whole tree — marginal).

## Grammar supply

crates.io `tree-sitter-luau` **1.2.0** (2024-12, latest at probe time), ABI 14
via tree-sitter-language 0.1 — no fork, no pin-down (1-2-13-1 probe). 1.2.0 is
the newest release on crates.io, and it **still lags the language**.

## Result (tolerant gating)

| Corpus | filesIndexed | filesErrored | nodes | duration |
|--------|--------------|--------------|-------|----------|
| lute | 688 (525 luau) | **0** | 14 878 | 3 026 ms |
| RbxUtil | 91 (69 luau) | **0** | 2 292 | 375 ms |

Multiset (lute): variable 5 573 / import 931 / type_alias 633 / function 599 /
method 398 + calls 11 414 / imports 931. (RbxUtil): variable 1 318 / method 477 /
import 94 / function 93 / type_alias 84 + calls 3 106 / imports 94.

## The gate finding: grammar lag, not extractor drift

Run strictly (pre-decision), lute failed **55/525** and RbxUtil **7/69** files
with `rust-owned-parse-gap`. A per-file SEXP census over all 566 files (probe
`C:\workspace\luau-abi-probe`, argv mode) attributes every failure to
**legal modern-Luau syntax the 2024-12 grammar does not know**:

| Construct | Example (corpus) | Error shape |
|-----------|------------------|-------------|
| `@native` attribute | `batteries/base64.luau:23` | `ERROR @native` before the declaration |
| `const function` | `batteries/toml.luau:5` | `ERROR const` |
| leading-pipe union | `type T<V> = \| A \| B` (`batteries/result.luau:1`) | `ERROR \|` at column 0 |
| `typeof(...)` return | `collections/deque.luau:9` | `ERROR typeof` |
| generic variadic `T...` | `definitions/task.luau:7` | `ERROR ...` |
| nested generic cast | `{} :: Hash<"md5">` (`definitions/crypto.luau`) | local error recovery |

This is the Kotlin/Dart/Swift pattern (legal syntax flagged by a pinned grammar),
**not** the Lua 1-2-12-3 pattern (0 drift on an old-grammar corpus) — so Luau is
added to `tolerates_parse_errors`. Error-recovery nodes stay local to the
offending declaration; the walker (no `unwrap`/indexing on recovery shapes)
extracts every other symbol in the file. Strict-vs-tolerant on lute: 13 086 →
14 878 nodes (+1 792 recovered; type_alias 187 → 633 — `definitions/` files are
all-type files that strict mode dropped whole).

## Naming parity spot-checks

- `function M.greet(who: string): string` → method `M::greet`, signature
  `(who: string): string` (fixture + corpora: 736/997 lute functions+methods
  carry a `: <ret>` typed signature).
- Nested locals stack: `deserialize::byteAt`, `printDiffByLineDetailed::lineNums`.
- `@native` + `const function` file still yields `encode`/`version` **with typed
  signatures** (fixture case 4 + base64.luau).
- `::` cast initializer keeps the `= <init>` variable signature verbatim:
  `= table.create(4096) :: { number }`.
- `require(script.Parent.Signal)` → import `Signal`; `require("@batteries/base64")`
  → import `@batteries/base64` (string content kept as-is, matching the TS
  requireModule string branch).
- Anonymous `local f = function() … end` initializer pruned; its body calls are
  absent from `calls` (both fixture-verified).

## Fixtures (wave0)

`tests/rust-owned-language-fixtures.test.ts` → `describe('Luau baseline
(roadmap 1-2-13-3)')`, 4 cases: (1) module golden multiset incl. type_alias +
typed signatures + require import + dot/colon calls; (2) Luau-only syntax inert
(`update_statement`, `if_expression`, generics) — symbols/signatures exact, body
call captured, initializer call pruned; (3) multi-name locals + typed local +
anonymous-initializer prune + require dig; (4) grammar-lagged syntax recovery
(`@native`, `const function`, leading-pipe union) — file indexed, import + alias
+ functions survive. All four verified verbatim against the debug binary
(`C:\workspace\luau-fixture-check`).

## What did NOT change

- No grammar fork / rust-024 regeneration: 1.2.0 is already the newest crates.io
  release; a fork would only matter if upstream ships a new ABI-14 grammar.
- No `Language::Luau` cross-language family wiring (Luau stays out of
  jvm/apple maps), no 128 MiB worker (AST depth same class as Lua).
- `EXTRACTION_VERSION` stays 2 (unreleased wave).
- Lua (`Language::Lua`) keeps its own extractor + strict gating (its 0.2.0
  grammar matched its corpus with zero drift).
