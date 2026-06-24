# Rust-Hybrid Direct Named Import Semantic Replay Plan

Date: 2026-06-25

Status: ready-for-agent

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-2. Reference disambiguation semantic migration slices`

## Goal

Add a shadow-only semantic replay slice for direct ESM named import/export
bindings.

The purpose is to gather equivalence evidence before moving any reference
disambiguation decision from TypeScript into Rust/protocol-owned code.
TypeScript remains the final owner of graph output in this slice.

## Scope

In scope:

- `import { foo } from './x'` and equivalent direct named ESM imports;
- repo-local relative imports;
- path-alias imports only where the current file-level resolver already
  supports the target;
- direct exported symbol lookup in the resolved target file;
- shadow/double-read replay diagnostics in profile artifacts;
- mismatch taxonomy for replayed references;
- deterministic integration coverage showing graph output is unchanged.

Out of scope:

- default imports or exports;
- namespace imports;
- type-only imports;
- re-export or barrel chains;
- package resolution;
- fuzzy/name-matching ranking;
- changing final per-reference disambiguation semantics;
- changing SQLite schema or writing replay rows to the database;
- durable benchmark artifacts for each process run.

## Decisions

### Replay Mode

Use shadow/double-read semantic replay.

Rust/protocol code may compute a replay result for an eligible direct named
binding, but TypeScript remains the final graph-writing decision owner.

### Evidence Location

Record replay evidence in profile artifact diagnostics under a
`semanticReplay` bucket.

The diagnostics are public profile fields for optimization and migration
evidence, not a stable user-facing API.

### Mismatch Taxonomy

Use this first taxonomy:

- `import-target-unresolved`;
- `export-symbol-missing`;
- `multiple-export-candidates`;
- `ts-unresolved-rust-resolved`;
- `ts-resolved-rust-unresolved`;
- `different-target-node`;
- `different-resolution-method`.

Unsupported syntax families should remain out of this slice instead of being
split into fine-grained taxonomy.

## Acceptance Criteria

- Profile artifacts include a `semanticReplay` diagnostic bucket.
- The bucket reports eligible, compared, equivalent, mismatch, and skipped
  counts.
- Direct named import/export replay records mismatch reasons using the agreed
  taxonomy.
- The implementation does not change graphStats or final graph output for the
  covered fixture.
- The implementation does not write replay state into SQLite.
- Tests cover a matching direct named import/export and at least one taxonomy
  failure.
- Roadmap node `1-3-2` links to the tracking issue and remains focused on
  semantic replay rather than main-path migration.

## Verification

Default verification:

- targeted semantic replay tests;
- targeted rust-hybrid CLI/profile test;
- roadmap validate/render;
- `npm run build`;
- `git diff --check`.

Agent Sufficiency A/B is not required because this slice must not change graph
semantics, Explore output, language coverage, or user-facing sufficiency
claims.

