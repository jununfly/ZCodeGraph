import { describe, expect, it } from 'vitest';
import {
  isRustHybridOwnedLanguage,
  RUST_HYBRID_RUST_OWNED_LANGUAGES,
} from '../src/indexing/rust-hybrid-contract';

/**
 * Ownership guard for file-level / template languages that were evaluated for
 * Rust migration and deliberately KEPT on the TypeScript shell (roadmap 1-3).
 *
 * These languages are NOT tree-sitter grammar languages — they are custom
 * extractors whose value comes from delegating an embedded block to a full
 * language extractor (e.g. Svelte's <script> -> TS/JS). Each "keep" decision
 * below records why Rust ownership is rejected; this guard fails CI if the
 * language is ever added to RUST_HYBRID_RUST_OWNED_LANGUAGES without first
 * reversing that decision (new ABI-14 grammar + a Rust sub-tree delegation
 * mechanism).
 *
 * One `it` per decided language, so the failing name pinpoints which keep
 * decision was violated. Siblings are appended as their 1-3-x-1 nodes close.
 */
describe('File-level language ownership guard (roadmap 1-3 keep decisions)', () => {
  it('svelte stays TypeScript-shell owned (1-3-1-1 keep)', () => {
    // 1-3-1-1 keep rationale: no ABI-14 grammar (0.10.2 stale / -next is
    // ABI-15 / arborium uses a patched tree-sitter fork); the extractor's value
    // is <script>-block delegation to the full TS/JS extractor, which the Rust
    // core cannot replicate without a grammar + sub-tree delegation mechanism.
    expect(isRustHybridOwnedLanguage('svelte')).toBe(false);
    expect(RUST_HYBRID_RUST_OWNED_LANGUAGES).not.toContain('svelte');
  });

  it('vue stays TypeScript-shell owned (1-3-2-1 keep)', () => {
    // 1-3-2-1 keep rationale: same delegation architecture as Svelte —
    // vue-extractor.ts delegates <script>/<script setup> blocks to the full
    // TS/JS TreeSitterExtractor with line-offset remapping, plus regex-based
    // template-component extraction (kebabToPascal + builtin filter). Grammar
    // supply is inadequate: tree-sitter-vue 0.0.1 is a placeholder crate;
    // tree-sitter-vue-next extends tree-sitter-html 0.23.2 as a base grammar
    // with a C external scanner and only parses SFC structure markup — it
    // cannot replicate the script-block delegation value (Rust core has no
    // grammar + no sub-tree delegation mechanism) and drags in an html base
    // grammar + C scanner dependency. Rust core (26 modules) has zero vue.
    // Vue/Nuxt file-convention routing stays in src/resolution/frameworks/vue.ts.
    expect(isRustHybridOwnedLanguage('vue')).toBe(false);
    expect(RUST_HYBRID_RUST_OWNED_LANGUAGES).not.toContain('vue');
  });

  it('liquid stays TypeScript-shell owned (1-3-3-1 keep)', () => {
    // 1-3-3-1 keep rationale: unlike Svelte/Vue (script-block delegation the
    // Rust core can't replicate), Liquid is a self-contained parser-free regex
    // extractor (no embedded-language delegation, no functions/classes).
    // Migration is technically possible but buys nothing — regex extraction on
    // the TS side is zero-dependency, easier to audit (per node notes), and
    // easier to evolve with Shopify theme conventions; a Rust rewrite only
    // unifies form while adding regression risk around the isShopifyLiquidJson
    // JSON special case (incl. the #383 security note: never dump schema JSON
    // into docstrings) and the 4 regex families. Grammar supply is weak
    // (Shopify/tree-sitter-liquid unmaintained since 2023-11, no published
    // crate). No dedicated framework resolver — references resolve via the
    // generic path-like suffix matcher. Rust core (26 modules) has zero liquid.
    expect(isRustHybridOwnedLanguage('liquid')).toBe(false);
    expect(RUST_HYBRID_RUST_OWNED_LANGUAGES).not.toContain('liquid');
  });

  it('razor stays TypeScript-shell owned (1-3-4-1 keep)', () => {
    // 1-3-4-1 keep rationale: same delegation architecture as Svelte/Vue —
    // razor-extractor.ts delegates @code/@functions/@{} blocks to the full C#
    // TreeSitterExtractor (wrapped in a synthetic `class __RazorCode__` so the
    // block parses in a class context) with line-offset remapping; the Rust
    // core cannot replicate this without a grammar + a sub-tree delegation
    // mechanism. Framework-semantics dense: 37-entry BLAZOR_BUILTIN_COMPONENTS
    // filter, dotnet language-family sharing with csharp (Rust lib.rs:1236),
    // directive refs (@model/@inherits/@inject/@typeof), and a brace matcher
    // that skips string literals/comments. Grammar supply (tree-sitter-blazor
    // 0.2.0 / tree-sitter-razor 0.1.0 via tree-sitter-language bridge) parses
    // only markup structure — not the delegation value. Rust core has zero
    // razor extraction (only the language-family mapping in lib.rs).
    expect(isRustHybridOwnedLanguage('razor')).toBe(false);
    expect(RUST_HYBRID_RUST_OWNED_LANGUAGES).not.toContain('razor');
  });

  it('xml (MyBatis) stays TypeScript-shell owned (1-3-5-1 keep)', () => {
    // 1-3-5-1 keep rationale: mybatis-extractor.ts is a self-contained
    // parser-free regex extractor (no embedded-language delegation — SQL is
    // not parsed as an embedded language). Its emission shape (qualifiedName
    // `<namespace>::<id>`) is a domain contract consumed by the TS-side
    // mybatisJavaXmlEdges synthesizer (callback-synthesizer.ts:1425), which
    // suffix-matches Java/Kotlin `ClassName::methodName` → XML statement.
    // That synthesizer is one of the 1-4 wave's 23 framework resolvers with
    // its own ownership decision, so the extractor must stay on the TS shell
    // to keep the Java↔XML bridge contract evaluable in one layer. A generic
    // tree-sitter-xml grammar would only give XML structure, not the MyBatis
    // semantics. Rust core (26 modules) has zero xml.
    expect(isRustHybridOwnedLanguage('xml')).toBe(false);
    expect(RUST_HYBRID_RUST_OWNED_LANGUAGES).not.toContain('xml');
  });

  it('yaml stays TypeScript-shell owned (1-3-6-1 keep)', () => {
    // 1-3-6-1 keep rationale: yaml is a file-level-only language
    // (isFileLevelOnlyLanguage, grammars.ts:333) — the extraction layer is a
    // deliberate no-op (empty result, file row kept for the watcher); there is
    // NO yaml-extractor.ts and zero symbol extraction to migrate. All symbols
    // are back-filled by TS framework resolvers — drupal.ts (*.routing.yml
    // route nodes), play.ts (conf/routes via detectLanguage→yaml), java.ts
    // (Spring application.yml leaf-key nodes + @Value resolution) — each a
    // 1-4-wave resolver with its own ownership decision. Migrating an empty
    // extraction layer would be pure formalism; the per-use-case split
    // (Drupal routing / Spring config / Play routes) belongs to each
    // resolver's 1-4 decision. Rust core's only yaml mentions are
    // pnpm-workspace detection + config-file classification (not extraction).
    expect(isRustHybridOwnedLanguage('yaml')).toBe(false);
    expect(RUST_HYBRID_RUST_OWNED_LANGUAGES).not.toContain('yaml');
  });
});
