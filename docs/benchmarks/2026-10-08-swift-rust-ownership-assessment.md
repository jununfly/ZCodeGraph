# Swift Baseline Migration Ownership Assessment

Date: 2026-10-08
Roadmap: 1-6-4 Swift 基线迁移（移动桥接成为产品优先级时启动）
Mode: explore / acceptance (product code read-only; evidence = static trace)

## Question

Unlike 1-6-2 (Python) and 1-6-3 (Go), where a language was already Rust-owned
and the question was whether Rust route extraction matched TypeScript, Swift is
**fully TypeScript-owned today**. This node assesses what a Rust-ownership
migration would actually entail and whether the node's gate (iOS / bridge
semantics becoming a product priority) has been met.

## Current ownership boundary (static trace)

Swift does **not** appear in
`RUST_HYBRID_RUST_OWNED_LANGUAGES` (`src/indexing/rust-hybrid-contract.ts`),
the Rust core has no `SourceLanguage::Swift`, and `Cargo.toml` has no
`tree-sitter-swift`. Every `.swift` file is therefore a language-level
TypeScript-fallback file under rust-hybrid and indexes correctly today.

TypeScript-side surface:

| Layer | File | Size | Role |
| --- | --- | --- | --- |
| Baseline extractor | `src/extraction/languages/swift.ts` | 83 | Declarative tree-sitter `LanguageExtractor` (class/struct/protocol/enum/func/typealias/property/import, visibility, static) |
| Grammar | `tree-sitter-wasms` npm package | — | `require.resolve('tree-sitter-wasms/out/tree-sitter-swift.wasm')` at runtime (not vendored in `src/extraction/wasm/`) |
| SwiftUI resolver | `swift.ts` `swiftUIResolver.extract` | — | Emits `component` View nodes + `@main App` class |
| UIKit resolver | `swift.ts` `uikitResolver.extract` | 454 total | Emits UIViewController/UIView subclass `class` nodes |
| Vapor resolver | `swift.ts` `vaporResolver.extract` | — | Emits `route` nodes with grouped-builder prefix + `use:` handler |
| Swift/ObjC bridge | `frameworks/swift-objc.ts` | 299 | **resolve-only** (lazy `resolve()`), no `extract` |
| Closure dynamic dispatch | `resolution/callback-synthesizer.ts` | 1749 (23 Swift refs) | Swift-first closure-collection; language-agnostic DB consumer |

## Grammar availability

`tree-sitter-swift` (alex-pinkus/tree-sitter-swift, same name on crates.io) is
actively maintained: 0.6.0+ builds against tree-sitter 0.23, latest 0.7.3
(2026-06-01) is compatible with this repo's tree-sitter 0.24 ABI. It can be a
plain crates.io dependency — **no git rev-pin is needed** (unlike Kotlin).
The C external scanner uses a `cc` build step, already a proven path on all
three CI OSes via the existing c/cpp/kotlin grammars.

## Extraction-stage semantics that would regress

This is heavier than the Kotlin wave. Baseline symbols map cleanly, but four
TypeScript extraction-stage behaviors run only while Swift is a TS-fallback
language and would be lost on a naive ownership switch (the same class of
regression proven for Python routes in 1-6-2):

1. **Three framework `extract` passes** — SwiftUI View components / `@main App`,
   UIKit view-controller/view classes, and Vapor routes are produced during
   extraction, not resolution.
2. **Property-wrapper metatype references** — `@Siblings(through: Pivot.self, …)`
   pulls the `Pivot` type out of the attribute argument expression in the
   generic orchestrator (`src/extraction/tree-sitter.ts` ~L469), not in
   `swift.ts`. Moving files to Rust silently drops these impact edges (locked
   by an e2e in `extraction.test.ts`).
3. **Swift-specific syntax nodes** — closures, property wrappers,
   `if let`/`guard let`, actors, extensions, protocol `associatedtype`,
   `throws`/`async` come for free from the declarative TS extractor but need a
   hand-written Rust visitor.
4. **Node-shape contract for engine-agnostic consumers** — the Swift/ObjC bridge
   resolver and the closure-collection synthesizer are resolve/DB consumers;
   they keep working as long as Rust emits aligned `kind`/`name`/
   `qualifiedName` shapes. Lower risk, but must be fixture-locked.

## Decision

Swift is healthy under TypeScript ownership with no production gap, so this is
a performance/consistency migration (remove the TS fallback, unify on
rust-hybrid), **not** a bug fix. The node's stated gate — iOS / bridge
semantics becoming a product priority — has not been explicitly triggered by
product direction.

Recommendation:

- **Keep 1-6-4 gated**; do not start the from-scratch exploit migration now.
- When product priority is confirmed, run it as a Kotlin-shaped five-node wave:
  grammar wiring → baseline visitor → wave-0 deterministic fixtures →
  real-corpus gate → TS-fallback removal. The three framework `extract` passes
  and the property-wrapper metatype references **must** be preserved via the
  TS-shell finalize back-fill pattern established in 1-6-2-4
  (`src/indexing/rust-python-framework-routes.ts`) or ported to Rust; the
  Swift/ObjC bridge resolver and closure synthesizer stay in the TS shell
  unchanged.

Scope for this node was acceptance/read-only; product code was not modified.
