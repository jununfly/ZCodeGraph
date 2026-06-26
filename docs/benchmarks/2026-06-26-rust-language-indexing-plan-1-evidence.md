# Rust Language Indexing Plan 1 Evidence

Date: 2026-06-26

Branch: `codex/rust-language-semantic-support-prd`

Plan: `docs/plans/2026-06-26-rust-language-indexing-plan-1-core-rs-baseline.md`

Issues: #566, #567, #568, #569

## Summary

Plan 1 is implemented for the bounded `.rs` baseline slice:

- Rust core recognizes `.rs` files and parses them with `tree-sitter-rust`.
- Rust core extracts baseline Rust symbols: functions, methods, structs, enums,
  enum variants, traits, type aliases, `use` imports, and basic call references.
- `rust-hybrid` assigns `rust` to the Rust-owned language set.
- Status and doctor metadata can show `.rs` files as Rust-owned, degraded, or
  failed through the existing Rust-owned taxonomy.

This does not claim compiler-grade Rust semantics. Trait dispatch, macro
expansion, Cargo feature resolution, package target semantics, and framework
route wiring remain under the Rust semantic graph roadmap.

## Validation Commands

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/sdk-rust-hybrid.test.ts
npx vitest run __tests__/rust-hybrid-doctor.test.ts
```

Results:

- `npm run build`: passed.
- `cargo test --package zcodegraph-core`: passed, 83 tests.
- `npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/sdk-rust-hybrid.test.ts`: passed, 104 tests.
- `npx vitest run __tests__/rust-hybrid-doctor.test.ts`: passed, 4 tests.

## Deterministic Fixture Coverage

Rust core fixture coverage is in `crates/zcodegraph-core/src/lib.rs`:

- `rust_core_parses_rust_files_and_reports_language_profile`
- `rust_core_extracts_baseline_rust_symbols_imports_and_calls`

Rust-hybrid fixture coverage is in:

- `__tests__/rust-index-engine-cli.test.ts`
- `__tests__/sdk-rust-hybrid.test.ts`

The fixture asserts that `.rs` files are Rust-owned under `rust-hybrid`, that
`rustOwnedLanguages` includes `rust`, and that `.rs` files no longer use
language-level TypeScript fallback.

## Smoke Evidence

### Small mixed Rust project smoke

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js index /private/tmp/zcodegraph-plan3-default-profile --engine rust-hybrid --quiet --profile-out /private/tmp/zcodegraph-rust-language-small-rust.profile.json
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js status /private/tmp/zcodegraph-plan3-default-profile --json
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js doctor /private/tmp/zcodegraph-plan3-default-profile --engine rust-hybrid --bundle --last-run
```

Result:

- Index command: passed.
- Wall time: 5.99 seconds.
- Max RSS: 280,182,784 bytes (267.2 MiB).
- Profile artifact: `complete: true`.
- Rust parse profile: 2 Rust files, 47 ms parse extraction, 0 parse errors.
- Status graph counts: 314 files, 15,695 nodes, 33,544 edges.
- Languages in status: JavaScript, JSON, Rust, TypeScript, YAML.
- Hybrid ownership: `rustOwnedLanguages` includes `rust`; `engineByLanguage.rust = "rust"`.
- Fallback taxonomy: `language-level-typescript-fallback: 3`,
  `rust-owned-parse-gap: 1`.
- Doctor bundle: created successfully from `--last-run`.

The project is mixed-language, so `fallbackState` is degraded because YAML files
still use language-level TypeScript fallback and one Rust-owned parse gap is
reported. This is expected and does not block the bounded `.rs` ownership slice.

### Large corpus attempt

Attempted corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- `/private/tmp/codegraph-corpus/vscode-sparse/cli`

Result:

- Full VS Code sparse was manually interrupted after 230.97 seconds.
- VS Code CLI subtree was manually interrupted after 115.36 seconds.

Conclusion:

- These corpora are too heavy for this targeted Plan 1 smoke in the current
  Node 26 local environment.
- This is recorded as `unavailable: large-corpus-smoke-too-heavy-for-targeted-plan-1`.
- No automatic clone was attempted.

## RSS

RSS was captured for the successful small mixed Rust project smoke from a normal
macOS Terminal run:

```text
5.99 real
5.28 user
0.58 sys
280182784 maximum resident set size
32198904 peak memory footprint
```

The max RSS value is `280,182,784` bytes (`267.2 MiB`).

Earlier Codex sandbox attempts could not sample RSS.

Unavailable reason:

```text
/usr/bin/time -l reported: sysctl kern.clockrate: Operation not permitted
```

The large-corpus attempts also terminated before successful completion, so no
trustworthy max RSS value is reported for those attempts.

## Decision

Plan 1 is complete for the bounded Rust core `.rs` baseline and rust-hybrid
ownership assignment.

Proceed to the next roadmap slice only after treating deeper Rust semantics as
separate work. In particular, do not infer from this evidence that trait
dispatch, macro expansion, Cargo feature resolution, or Rust framework route
wiring are complete.
