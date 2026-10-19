# Rust-Owned Objective-C Corpus Validation (AFNetworking + SDWebImage)

Date: 2026-10-12
Roadmap: 1-2-14-3 Objective-C 确定性 fixture + 真实语料 gate（在
1-2-14-1 grammar 接入、1-2-14-2 baseline visitor 之后，1-2-14-4 ownership
cutover 之前）。镜像 Swift 1-6-4-4 的
`2026-10-12-rust-owned-swift-kingfisher-vapor-validation.md` 形态。

## Why two corpora

Real Objective-C code has two dominant shapes that exercise different parts
of the extractor:

1. **Small, canonical networking core** — `AFNetworking/AFNetworking` 3.2.1
   is the classic pre-Swift, pure-Objective-C codebase: a handful of large
   `.m` implementations (serializers, session manager, security policy,
   reachability) whose public `@interface` lives entirely in paired `.h`
   headers, plus a `UIKit+AFNetworking` category layer. It is the canonical
   stress test of the *header/implementation split*: when the `.h` is not
   indexed in the same pass, every `@implementation` must back-fill its own
   class node.
2. **Large, mature image-loading library** — `SDWebImage/SDWebImage` 5.21.7
   is a much bigger modern Objective-C codebase with dense message sends,
   class extensions (`@interface Foo ()`), private `@interface` declarations
   inside `.m` files, categories, and generics-light modern syntax. It
   stresses selector joining, the class/extension/implementation triple, and
   message-call volume.

Unlike the Swift gate, **neither corpus forced a parse-tolerance or
stack change**: tree-sitter-objc 3.0.2 parsed every `.m` with zero ERROR
nodes. The corpora did, however, confirm one important class/extension
dedup shape (see "Class/extension/implementation triple" below).

## Corpora

| Corpus | Repository | Checkout (shallow / sparse) | Subset indexed | `.m` files | `.m` LOC |
|---|---|---|---|---:|---:|
| AFNetworking | `AFNetworking/AFNetworking` | tag **3.2.1** `746f6c3a1e2c3a3dfbac1c3d18c08a5d121c8df3` | `AFNetworking` + `UIKit+AFNetworking` | **15** | **6,280** |
| SDWebImage | `SDWebImage/SDWebImage` | tag **5.21.7** `2de3a496eaf6df9a1312862adcfd54acd73c39c0` | `SDWebImage` + `SDWebImageMapKit` | **73** | **16,377** |

Paired headers: AFNetworking ships 19 `.h` (3,082 LOC), SDWebImage 139 `.h`
(8,773 LOC).

Local checkouts live OUTSIDE the repository (`C:\workspace\objc-corpus`), as
`--depth 1 --filter=blob:none --sparse` cones; neither is vendored.

## Grammar supply

- tree-sitter-objc is a crates.io dependency `tree-sitter-objc = "3.0"`
  (resolved **3.0.2**, tree-sitter-grammars official org, pure-C external
  scanner built with `cc` on all three CI OSes — no git fork). It bridges
  into tree-sitter 0.24 (ABI 14) via the `tree_sitter_objc::LANGUAGE.into()`
  shim (`tree-sitter-language` 0.1). Locked in the 1-2-14-1 ABI probe.
- Scan dispatch maps `.m`/`.mm` to `SourceLanguage::Objc`; the extractor
  lives in `crates/zcodegraph-core/src/objc.rs`.
- ObjC was already added to `tolerates_parse_errors()` in 1-2-14-1 (aligned
  with Kotlin/Dart/Swift best-effort). The corpora did not need the tolerance
  — no file produced an ERROR node — but it stays on as parity with the TS
  orchestrator, which never gates on `has_error`.

## Command

The local Windows clone has no `node_modules`/`dist`, so the TS shell and
vitest arbitration run on CI. The corpus validation used the Rust core binary
directly (debug build):

```bash
./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path C:/workspace/objc-corpus/AFNetworking \
  --index-path   C:/workspace/objc-corpus/afnetworking.db

./target/debug/zcodegraph-core.exe index \
  --engine rust --force \
  --project-path C:/workspace/objc-corpus/SDWebImage \
  --index-path   C:/workspace/objc-corpus/sdwebimage.db
```

## Result — summary

| Metric | AFNetworking 3.2.1 | SDWebImage 5.21.7 |
|---|---:|---:|
| `.m` files dispatched to `objc` | 15 | 73 |
| Files errored (`filesErrored`) | **0** | **0** |
| Files with non-empty `errors` column | **0** | **0** |
| Nodes with kind `ERROR` | **0** | **0** |
| Index duration (debug binary) | 258 ms | 585 ms |
| ObjC nodes persisted (excl. file nodes) | 627 | 1,414 |
| Edges persisted | 627 | 1,543 |

## ObjC node / reference multiset

| Kind | AFNetworking | SDWebImage |
|---|---:|---:|
| method | 367 | 836 |
| property | 103 | 151 |
| import | 61 | 293 |
| class | 40 | 87 |
| function (file-scope C) | 34 | 45 |
| type_alias | 21 | 2 |
| enum | 1 | 0 |
| **calls** ref | 1,705 | 3,383 |
| **references** ref | 286 | 582 |
| **imports** ref | 61 | 293 |
| **extends** ref | 11 | 3 |
| **implements** ref | 7 | 6 |

## Class/extension/implementation triple (corpus-forced parity check)

AFNetworking's implementation `.m` files have NO in-file `@interface` (the
public class declaration is in the skipped `.h`). SDWebImage additionally
uses private in-file `@interface` and anonymous class extensions
`@interface Foo ()`. tree-sitter-objc 3.0.2 models all three declaration
sites as `class_interface` / `class_implementation` (there is no separate
category node; an optional `category` field distinguishes named categories
`@interface Foo (Bar)` from anonymous extensions `@interface Foo ()`).

The Rust visitor mirrors the TS extractor exactly:

- Every `class_interface` emits a class node — the TS `createNode` builds the
  id from `(file, kind, name, startLine)` and does **not** dedup, so a public
  `@interface Foo` and an anonymous `@interface Foo ()` in the same file
  produce **two** `Foo` class rows (different start lines). This is observed
  in the data, e.g. AFURLRequestSerialization.m has two rows each for
  `AFHTTPBodyPart` (lines 625 and 1024) and `AFMultipartBodyStream`
  (lines 643 and 845).
- `class_implementation` emits NO new node. It reuses the first same-file
  `(name, kind=class, language=objc)` node; when none exists in the file (the
  AFNetworking header-split case) it back-fills a class node in the `.m` so
  its methods still attach. This is the Rust equivalent of the TS
  `visitNode` `ctx.nodes.find(...) ?? ctx.createNode('class', ...)`.
- An anonymous extension's `<NSCopying>` conformance still emits
  `implements`; the public `: NSObject` emits `extends`.

A deterministic fixture for this exact triple
(`Box.m`: public `@interface` + `@interface Box ()` + `@implementation Box`)
is in `__tests__/rust-owned-language-fixtures.test.ts`
("Objective-C baseline", roadmap 1-2-14-3), alongside the golden multiset
sample and the message-receiver-folding sample. The same contract is locked
in Rust by `objc_baseline_visitor_extracts_symbols_inheritance_and_messages`
in `crates/zcodegraph-core/src/lib.rs`.

## Header dispatch status (expected pre-cutover, deferred to 1-2-14-4)

The `.m`/`.mm` files all index through the new Rust ObjC extractor with zero
errors. The paired `.h` headers follow the **pre-cutover** heuristic in the
Rust scan loop (aligned with the TS `looksLikeCpp`/`looksLikeObjc`):

- a `.h` that looks like C++ is reclassified to Cpp;
- a `.h` that looks like Objective-C (`@interface`, `@protocol`, …) is
  **skipped** (`continue`) — routing it to the ObjC extractor is the
  1-2-14-4 cutover;
- otherwise it indexes as C.

Observed: AFNetworking's 19 headers split 3 C / 16 ObjC-skipped; SDWebImage's
139 headers split 72 C / 1 Cpp / 66 ObjC-skipped. So the 18 and 147 total
indexed files include the C/C++ headers but intentionally NOT the ObjC
headers. The `.m` back-fill path above is precisely what keeps method
ownership correct while the headers are still skipped. SDWebImage's
`Package.swift` also indexes (1 swift file node) through the existing Swift
extractor.

This is the expected baseline BEFORE 1-2-14-4, not a gap in the ObjC visitor:
`@interface`-bearing headers become ObjC-indexed only at cutover.

## Deterministic fixtures (wave 0)

`__tests__/rust-owned-language-fixtures.test.ts` gains an
"Objective-C baseline (roadmap 1-2-14-3)" describe block (pure `--engine
rust`, the #692 contract — no framework finalizers), with three cases:

1. Golden multiset sample identical in contract to the Rust golden test:
   import pair, single class + protocol (`kind='protocol'`), multi-keyword
   selector methods `Greeter::greet:withTitle:`, `+` is_static, class-only
   property, `extends NSObject` + `implements [Drivable,NSCopying]`,
   `receiver.selector` calls, and capitalized class-message `references`.
2. Message receiver folding: `self`/`super` collapse to the bare selector,
   other receivers stay qualified (`thing.sub:`), `[Worker make]` also
   references the class.
3. The class/extension/implementation triple described above.

These are engine-agnostic TS-shell e2e assertions (spawn the Rust binary,
read back SQLite). Local development runs the Rust golden test and validates
the fixture samples directly against the debug binary; the vitest run and
three-OS portability are arbitrated by CI.

## What did NOT change

- No `EXTRACTION_VERSION` bump (this is an unreleased batch; cutover lands in
  1-2-14-4).
- No `.h` dispatch change, no `RUST_OWNED` membership change, no
  `rust-objc-framework-routes.ts` yet (React-Native `RCT_EXPORT_*` macro
  finalize) — all reserved for 1-2-14-4.
- `objc.ts` stays as the pure-TS fallback/reference extractor.
- No large-stack worker was needed (both corpora index in well under a
  second on the default stack; Objective-C message/expression trees are far
  shallower than Flutter widget trees).
