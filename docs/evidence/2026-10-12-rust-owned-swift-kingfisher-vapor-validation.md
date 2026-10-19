# Rust-Owned Swift Corpus Validation (Kingfisher UIKit/SwiftUI + Vapor server)

Date: 2026-10-12
Roadmap: 1-6-4-4 Swift 真实语料 gate（在 1-6-4-1 grammar 接入、1-6-4-2
baseline visitor、1-6-4-3 wave0 确定性夹具之后，1-6-4-5 ownership cutover
之前）。镜像 Dart 1-2-9-3 的
`2026-10-10-rust-owned-dart-flutter-validation.md` 形态。

## Why two corpora

Real Swift code has two dominant shapes that exercise different parts of the
extractor:

1. **Client / Apple-platform library** — UIKit + SwiftUI, dense `extension`
   declarations (many files extend one shared type), `final class`, generics,
   property wrappers, async/await, and deep SwiftUI view-builder expression
   trees. `onevcat/Kingfisher` (a widely used image-loading library) is the
   canonical such codebase and covers both UIKit and SwiftUI surfaces.
2. **Server / framework code** — Vapor's own `Sources`: async route handlers,
   protocols with `associatedtype`, `EventLoopFuture` promise APIs, heavy
   generics, C interop, and a bundled vendored C target (`CVaporBcrypt`).
   `vapor/vapor` is the canonical server codebase.

The corpora surfaced one real cutover blocker (an over-strict parse gate, the
same class of issue Dart hit) that no hand-written fixture could — see
"Fix the corpus forced" below. They did **not** surface a stack overflow.

## Corpora

| Corpus | Repository | Checkout (shallow / sparse) | Subset indexed | Swift files | Swift LOC |
|---|---|---|---|---:|---:|
| Kingfisher | `onevcat/Kingfisher` | tag **8.13.0** `8648fe649c5d62be38721110f835821906e9242a` | `Sources` | **98** | **22,430** |
| Vapor | `vapor/vapor` | tag **4.122.2** `33e61d0a02a9ddc9f025f8398a0dc24774f6cbe1` | `Sources` | **239** | **23,286** |

Local checkouts live OUTSIDE the repository (`C:\workspace\swift-corpus`), as
`--depth 1 --filter=blob:none --sparse` cones of `Sources`; neither is
vendored. The Vapor subset additionally contains a vendored C target,
`Sources/CVaporBcrypt` (`bcrypt.c/.h`, `blf.c/.h`, 4 files / 1,040 LOC), which
indexes through the existing C extractor — a real mixed-language SwiftPM
layout. All Swift counts below are Swift-only; the 4 C files add 68 C
`variable` nodes and 15 C `#include` imports to the same database.

## Grammar supply

- tree-sitter-swift is pinned to a crates.io dependency `tree-sitter-swift
  =0.6.0` (the last ABI-14 release, 2024-09-06 — same grammar generation as
  the production `tree-sitter-swift.wasm` in tree-sitter-wasms 0.1.13). It
  bridges into tree-sitter 0.24 via the `tree_sitter_swift::LANGUAGE.into()`
  shim (`tree-sitter-language` 0.1). The 0.7.x releases are ABI 15 and fail
  `set_language` under tree-sitter 0.24 (corrected finding vs. the 2026-10-08
  assessment; locked in the 1-6-4-1 decision). Its external scanner is plain C
  and builds with `cc` on all three CI OSes — no git fork.
- The scan dispatch maps `swift` to `SourceLanguage::Swift`; the extractor
  lives in `crates/zcodegraph-core/src/swift.rs`.
- No source normalization is applied for Swift.

## Command

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI. The corpus validation used the Rust core binary
directly (debug build):

```bash
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path <corpus>/Sources \
  --index-path  <corpus>.db
```

## Fix the corpus forced (required to reach 0 errors)

Before this node, Swift was NOT in `SourceLanguage::tolerates_parse_errors()`,
so the hard gate (`root_node().has_error()` → drop the whole file as
`rust-owned-parse-gap`) rejected **3/98 Kingfisher files and 18/239 Vapor
files**. An independent parse-only probe (tree-sitter-swift 0.6.0, same
tree-sitter 0.24.7) classified every flagged construct as *legal Swift* the
0.6.0 grammar mis-flags — never genuinely malformed source:

1. **Void tuple literal `()` (external-scanner token flag, ~14 files).** The
   pervasive promise/event-loop calls `promise.succeed(())`,
   `eventLoop.makeSucceededFuture(())`, and `Result.success(())` mark the
   argument's leaf `simple_identifier` with `has_error=true` but emit **no
   ERROR/MISSING node** (the flag sits on the leaf token itself). These are
   valid `Void` values. This is the dominant cause: 2 Kingfisher files and
   12 Vapor files.
2. **`nonisolated(unsafe)` (1 file).** A legal Swift 5.10/6 global-actor
   isolation modifier, unknown to 0.6.0; it inserts an ERROR + MISSING pair
   over the declaration (`Kingfisher/Sources/Image/Image.swift`, six
   occurrences of global caches).
3. **Local error-recovery nodes (6 Vapor files).** Modern/edge syntax beyond
   the grammar: `@_silgen_name` C-interop declarations (`Demangler.swift`),
   the `#expect`/`#require` testing macros (`VaporTesting/+TestingHTTPResponse.swift`),
   extended regex literals `#/…/#` (`Validation/Validators/Email.swift`),
   complex `switch` patterns (`Utilities/Base32.swift`, `BaseN.swift`), and a
   long `if let … try await` chain (`Middleware/FileMiddleware.swift`).

The TS orchestrator never gated on `has_error` for ANY language (it always
extracted best-effort), so dropping these files was a Rust-side regression,
not parity. Swift now joins Kotlin/Dart/C-family in
`tolerates_parse_errors()` (lib.rs). `swift.rs`'s production walker has zero
`unwrap`/`expect`/indexing, so error-recovery nodes cannot panic it; the
misparsed span merely loses its local expression, matching TS best-effort
parity.

**No large-stack worker was needed.** Unlike Dart's Flutter corpus (deep
`Padding(child:)` constructor trees that overflowed the ~1 MiB Windows main
stack, requiring a 128 MiB worker), both Swift corpora index cleanly on the
default stack in well under a second — SwiftUI view bodies here do not reach
the recursive depth Flutter's widget trees did, and `swift.rs` has no
type-list recursion analogous to Dart's `walk_decl`. Locked in the 1-6-4-4
decision.

## Result — summary (after the tolerance fix)

| Metric | Kingfisher `Sources` | Vapor `Sources` |
|---|---:|---:|
| Swift files indexed | 98 | 239 |
| Files errored (`filesErrored`) | **0** | **0** |
| Files with non-empty `errors` column | **0** | **0** |
| Swift nodes with kind `ERROR` | **0** | **0** |
| Swift nodes persisted (excl. `file`) | 1,434 | 2,241 |
| Swift `contains` edges | 1,434 | 2,241 |
| Wall time (debug, whole index) | 0.57s | 0.87s |
| parse+extract / tree-sitter / AST (ms) | 294 / 161 / 37 | 413 / 178 / 41 |

(The Vapor database as a whole — including the 4-file `CVaporBcrypt` C target
— reports 243 files indexed, 2,589 nodes and 2,360 `contains` edges; the extra
68 nodes are C `variable`s. The Swift-only numbers in the table exclude them.)

The pure-Rust engine emits containment plus unresolved references; cross-file
edge resolution (calls→instantiates when a ref binds a type, extends edges,
framework route/component nodes) runs in the language-agnostic TS finalizer
under rust-hybrid and is gated separately. This benchmark reports node shape
and the unresolved-ref SUPPLY, not resolved edges (same boundary as
Ruby/PHP/C#/Dart). The SwiftUI/UIKit/Vapor framework `extract` passes and the
`@Siblings(through:)` property-wrapper metatype edges stay TS-shell finalize
work scheduled for 1-6-4-5.

### Node distribution (Swift only)

| Kind | Kingfisher | Vapor |
|---|---:|---:|
| method | 633 | 809 |
| class (incl. `extension`-as-class) | 228 | 444 |
| import | 172 | 423 |
| struct | 85 | 240 |
| enum_member | 178 | 138 |
| interface (`protocol`) | 32 | 58 |
| enum | 44 | 55 |
| type_alias (`typealias`) | 42 | 51 |
| function (top-level) | 20 | 23 |
| file | 98 | 239 |

Every Swift symbol kind the TS extractor emits at the baseline is supplied at
scale: class/struct/enum (all sharing `class_declaration`, distinguished by
the inner keyword), `extension` surfacing as a class named after the extended
type, protocols as interfaces, multi-identifier enum cases, typealiases,
frame-qualified methods, and top-level functions. Stored properties,
`init`, and protocol requirements are deliberately absent from the baseline
(their framework/wrapper effects are the 1-6-4-5 finalize scope).

### Unresolved-reference distribution (Swift only)

| Reference kind | Kingfisher | Vapor |
|---|---:|---:|
| calls (bare / receiver-qualified / self-super collapsed) | 2,983 | 4,798 |
| extends (superclass + protocol conformance, undifferentiated) | 243 | 555 |
| imports | 172 | 423 |

All three baseline Swift reference kinds are supplied at scale; Swift files
with ≥1 non-import ref: 98/98 (Kingfisher), 226/239 (Vapor).

## Honest parse-recovery accounting

`filesErrored=0` means no file was dropped; it does NOT mean every tree was
syntactically clean. An independent parse-only probe over the pinned grammar
reports:

- **Kingfisher: 3/98 files have `has_error=true`** — 2 are void-tuple
  leaf-token flags only (`Cache/ImageCache.swift`, `Utility/Delegate.swift`,
  e.g. `.success(())`, `call(())`), and 1 (`Image/Image.swift`) carries the six
  `nonisolated(unsafe)` ERROR/MISSING pairs.
- **Vapor: 18/239 files have `has_error=true`** — 12 are void-tuple leaf-token
  flags only, and 6 contain a local error-recovery node from the modern-syntax
  cases listed above (`Demangler`, `FileMiddleware`, `Base32`, `BaseN`,
  `Email`, `VaporTesting/+TestingHTTPResponse`).

These trees still extract productively under tolerance — e.g.
`ImageCache.swift` (1,525 LOC) and the Vapor route/middleware files keep their
classes and methods; the lost content is confined to the misparsed local
expression, matching TS best-effort parity. A grammar bump past ABI 14 would
remove these but is blocked by tree-sitter 0.24 (the same constraint as Dart's
c1222f5 pin and C# 0.23.1); it is a known grammar ceiling, not a Rust
extraction gap.

## Verification gates

- Deterministic wave0 fixtures in
  `__tests__/rust-owned-language-fixtures.test.ts`,
  `describe('Swift baseline (roadmap 1-6-4-3)')`, three cases; verified green
  on the 3-OS CI run for commit d258156 (wave0 step 58→61 passed, the exact +3
  of the Swift cases; ubuntu/windows-2025/macos all green).
- Two new Rust integration tests in `crates/zcodegraph-core/src/lib.rs`
  (roadmap 1-6-4-4), each indexing end-to-end through the built binary and
  asserting against SQLite:
  1. `swift_tolerates_void_tuple_literal_calls_and_keeps_enclosing_type` —
     `promise.succeed(())` / `.success(())` no longer drop the file; the class
     and method survive, zero ERROR nodes, call refs retained
     (`promise.succeed`, and the nested `.success(())` collapses to the outer
     bare callee `CacheStoreResult` per the call-receiver rule).
  2. `swift_tolerates_nonisolated_unsafe_modifier_and_keeps_rest_of_file` —
     the unknown Swift 5.10/6 modifier does not drop the file's class, method,
     or import.
- Full lib suite **176 passed / 0 failed** (174 prior + 2 new); the five Swift
  tests pass together (grammar wiring, baseline golden, two tolerance guards,
  swift.rs unit). `cargo check` is warning-clean apart from the known
  benign Windows incremental-session lock-file message (`os error 5`).
- No `skip-debt` / `ALLOWED_SKIPS` / ci.yml changes were required; the Swift
  wave0 cases already run under the full-file step1 with no name filter.

`EXTRACTION_VERSION` is **not** bumped: the Swift Rust extractor is
unreleased and the ownership cutover has not happened (1-6-4-5), so this is
work inside the same unreleased semantic batch (same call as Dart 1-2-9-3).

## Decision

The Swift real-corpus validation gate **passes**. Two complementary real Swift
codebases — Kingfisher 8.13.0 (98 files / 22.4K LOC of UIKit+SwiftUI client
code) and Vapor 4.122.2 (239 Swift files / 23.3K LOC of server/framework code
plus a vendored C target) — now parse and extract through Rust with **zero
files dropped and zero ERROR-kind nodes**, rich node distributions (633/809
methods, 228/444 classes, structs/enums/enum members/protocols/typealiases)
and 7,781 unresolved calls + 798 extends + 595 imports across both. The one
blocker the corpus forced — the over-strict parse gate rejecting legal
void-tuple `()` calls, `nonisolated(unsafe)`, and a handful of modern-syntax
recovery cases — is fixed by making Swift parse-error tolerant like
Kotlin/Dart, locked by two deterministic integration tests. No stack-size
fix was needed. The ownership cutover (adding `swift` to
`RUST_HYBRID_RUST_OWNED_LANGUAGES`, removing the TS fallback, and back-filling
the SwiftUI/UIKit/Vapor framework `extract` passes and `@Siblings(through:)`
metatype edges via the TS-shell finalize pattern) proceeds in node 1-6-4-5.
