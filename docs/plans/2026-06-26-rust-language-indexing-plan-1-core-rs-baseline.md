# Rust Language Indexing Plan 1: Core `.rs` Baseline

Date: 2026-06-26

Branch: `codex/rust-language-semantic-support-prd`

Roadmap: `docs/plans/2026-06-26-rust-language-indexing-roadmap.json`

Roadmap scope: `1-2. Rust core ownership for .rs files`

Related feedback: #565

## Goal

Make `rust-hybrid` treat Rust source files as Rust-owned for a bounded baseline
indexing slice.

This plan makes the Rust core able to parse `.rs` files and emit useful
structural graph facts for ordinary Rust files. It does not attempt full
compiler-grade Rust semantics.

## In Scope

- Add `tree-sitter-rust` to the Rust core crate.
- Add `.rs` language detection and parser setup in Rust core.
- Extract baseline Rust graph facts from `.rs` files:
  - file node;
  - module node where applicable;
  - functions and methods;
  - structs;
  - enums and enum variants;
  - traits;
  - type aliases;
  - `use` imports;
  - basic call references.
- Add `rust` to `rust-hybrid` Rust-owned language assignment.
- Preserve existing Rust-owned parse/extraction gap taxonomy for `.rs`.
- Add deterministic fixture tests for `.rs` Rust core indexing.
- Add one real Rust repository smoke if a local corpus is available; otherwise
  record the unavailable reason.
- Keep JS/TS/Go/Python rust-hybrid regression guardrails green.

## Out of Scope

- Trait dispatch or trait coherence.
- Macro expansion.
- Cargo feature resolution.
- Full Cargo workspace/package target semantics.
- Rust framework route wiring such as Axum/Rocket.
- Replacing `rust-analyzer` or the Rust compiler.

Those remain tracked under roadmap `1-4. Rust semantic graph slices`.

## Proposed Issues

### Issue 1: Rust core parser ownership for `.rs`

Published issue: #566

Roadmap nodes: `1-2-1`, `1-2-2`

Acceptance:

- `crates/zcodegraph-core` depends on `tree-sitter-rust`.
- `SourceLanguage` recognizes `.rs` as `rust`.
- Rust core parser setup works for `.rs`.
- Profile `parseByLanguage` can report Rust files.
- Targeted Rust core tests cover parser setup and successful `.rs` parse.

### Issue 2: Rust core baseline `.rs` graph extraction

Published issue: #567

Roadmap nodes: `1-2-3`, `1-2-4`

Acceptance:

- Rust core extracts baseline Rust nodes for functions, methods, structs, enums,
  enum variants, traits, type aliases, and imports.
- Rust core records basic call references from function/method bodies.
- Extracted graph facts use existing `NodeKind` and `EdgeKind` strings.
- Tests cover a compact `.rs` fixture with representative declarations and calls.

### Issue 3: Rust-hybrid owns `.rs` assignment and diagnostics

Published issue: #568

Roadmap nodes: `1-2-5`, `1-2-6`

Acceptance:

- `RUST_HYBRID_RUST_OWNED_LANGUAGES` includes `rust`.
- `planRustHybridAssignments()` assigns `.rs` files to the Rust engine.
- Status/build metadata reports Rust in `rustOwnedLanguages` and
  `engineByLanguage`.
- Existing Rust-owned parse/extraction gap taxonomy applies to `.rs` files.
- Tests cover assignment, metadata, and doctor/status-visible taxonomy.

### Issue 4: Validation, guardrails, and evidence

Published issue: #569

Roadmap nodes: `1-2-7`, `1-3-1`, `1-3-2`, `1-3-3`, `1-3-5`, `1-3-6`

Acceptance:

- Deterministic `.rs` fixture test passes through the default `rust-hybrid`
  path.
- Existing JS/TS/Go/Python rust-hybrid tests remain green.
- One real Rust repository smoke is attempted. If no local corpus is available,
  the evidence records the unavailable reason rather than cloning automatically.
- Status/doctor output provides enough evidence to tell whether `.rs` files were
  Rust-owned, degraded, or failed.
- Evidence artifact records commands, corpus, result, graph counts, fallback
  taxonomy, and RSS or unavailable reason.

## Validation

Minimum targeted commands:

```bash
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-hybrid-doctor.test.ts
npm run build
```

If a real Rust corpus is available, additionally run:

```bash
zcodegraph index <rust-corpus> --engine rust-hybrid --quiet
zcodegraph status <rust-corpus> --json
zcodegraph doctor <rust-corpus> --engine rust-hybrid --bundle --last-run
```

## Completion Criteria

- Roadmap `1-2` can be marked completed.
- Roadmap `1-3` has evidence for the bounded `.rs` baseline slice.
- Roadmap `1-4` remains open for deeper Rust semantic graph work.
