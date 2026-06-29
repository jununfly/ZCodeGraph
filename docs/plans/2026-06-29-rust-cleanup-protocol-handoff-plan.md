# Rust Cleanup Protocol Handoff Plan

## Purpose

Move finalization terminal cleanup ownership one step toward Rust without moving deletion mechanics or SQLite maintenance into Rust.

This is the forty-ninth cut for roadmap node `1-6-9. Cleanup and DB maintenance Rust migration exploit candidate`.

## Decisions

### Scope

Target terminal cleanup protocol/diagnostics parity only:

- resolved terminal cleanup;
- intentionally unresolved terminal cleanup;
- retained `unresolved_refs` backlog;
- cleanup counters/profile taxonomy.

SQLite maintenance checkpoint behavior is out of scope.

### Ownership Shape

Rust core emits a cleanup protocol declaration in its profile. The TypeScript product shell validates that declaration and continues to execute deletion through the existing rowid-range cleanup path.

This means Rust is the protocol declarer, not the cleanup executor.

### Profile Contract

Extend the existing `cleanupOwnership` diagnostic bucket instead of adding a parallel bucket.

Expected valid handoff shape:

- `owner: rust-core-protocol`
- `mode: rust-declared-typescript-executed`
- `resolvedTerminalRefs`: existing resolved cleanup row count
- `intentionallyUnresolvedTerminalRefs`: existing intentionally unresolved cleanup row count
- `retainedRefs`: existing retained unresolved backlog count
- `rustCorePrecleanedRefs: null`
- protocol metadata:
  - version `1`
  - declared categories: `resolved-terminal`, `intentionally-unresolved-terminal`, `retained-backlog`
  - executor: `typescript-shell`
  - deletion mechanics: `typescript-rowid-range`
  - DB maintenance: `out-of-scope`

### Failure Semantics

The TypeScript shell fails closed to the existing `typescript-finalization / contract-only` ownership when the Rust declaration is missing or invalid.

Indexing must still succeed. The cleanup deletion path must not change.

The fallback reason must be visible in diagnostics, with at least:

- `missing-rust-cleanup-protocol`
- `invalid-rust-cleanup-protocol`

## Issue Split

### Issue 1: Add Rust Cleanup Protocol Handoff Diagnostics

Goal: implement one vertical slice from Rust profile declaration to TypeScript cleanupOwnership diagnostics and tests.

Acceptance criteria:

- Rust core emits a cleanup protocol declaration in the index profile.
- TypeScript finalization validates the declaration before switching `cleanupOwnership` to `rust-core-protocol`.
- Missing or invalid declarations fail closed to `typescript-finalization / contract-only` with a visible fallback reason.
- Cleanup deletion mechanics, unresolved ref row counts, retained backlog behavior, and SQLite maintenance behavior do not change.
- Roadmap closeout and changelog make clear this is a protocol handoff, not Rust-executed cleanup.

Blocked by: none.

## Guardrails

- Do not move unresolved reference deletion into Rust.
- Do not change rowid-range cleanup mechanics.
- Do not delete unknown unresolved refs.
- Do not change retained backlog semantics.
- Do not migrate SQLite maintenance checkpoint behavior.
- Do not claim full cleanup or DB maintenance migration.

## Closeout

Issue:

- #663 Add Rust cleanup protocol handoff diagnostics.

Implemented behavior:

- Rust core now emits `cleanupProtocol` in its index profile.
- TypeScript finalization validates the Rust declaration before reporting cleanup ownership as `rust-core-protocol`.
- A valid declaration reports `mode: rust-declared-typescript-executed`.
- Missing declarations fail closed with `fallbackReason: missing-rust-cleanup-protocol`.
- Invalid declarations fail closed with `fallbackReason: invalid-rust-cleanup-protocol`.

Preserved guardrails:

- TypeScript still executes resolved and intentionally unresolved rowid-range cleanup.
- Retained `unresolved_refs` backlog semantics are unchanged.
- Cleanup counters continue to report resolved terminal refs, intentionally unresolved terminal refs, and retained refs.
- `rustCorePrecleanedRefs` remains `null` because this slice does not move deletion into Rust.
- SQLite maintenance checkpoint behavior remains out of scope.

Verification:

- `npx vitest run __tests__/rust-finalization-ownership-reporting.test.ts __tests__/rust-index-engine-cli-finalization-cleanup.test.ts`
- `cargo test -p zcodegraph-core result_json_emits_cleanup_protocol_declaration`
