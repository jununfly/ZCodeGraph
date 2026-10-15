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
});
