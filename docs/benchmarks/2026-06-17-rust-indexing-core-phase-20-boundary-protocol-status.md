# Rust Indexing Core Phase 20 Boundary Protocol Status

## Scope

This artifact records the first Phase 20 implementation step: the Rust/TypeScript finalization boundary protocol and parity artifact seam.

It does not claim that Rust finalization/reference-resolution migration is complete.

## Completed

Phase 20 now has a public artifact protocol for Rust finalization ownership and fallback taxonomy.

The Rust index profile can expose:

- `finalize.boundaryProtocol.version`
- `finalize.boundaryProtocol.productShell`
- `finalize.boundaryProtocol.rustOwnedStages`
- `finalize.fallbackTaxonomy.totalFallbacks`
- `finalize.fallbackTaxonomy.entries[]`

The formal experiment summary renders:

- `## Rust finalization boundary`
- `## Rust finalization fallback taxonomy`

The TypeScript product shell remains responsible for CLI, MCP, Explore, installer, and release integration.

## Current Baseline

The current real Rust opt-in indexing path owns:

- source scan,
- parse extraction,
- graph write.

The current TypeScript-side finalization path still owns:

- framework post-extract finalization,
- reference resolution,
- dynamic-dispatch synthesis,
- DB maintenance.

Those stages are now visible as `known-unsupported` fallback taxonomy entries rather than silent fallback.

## Blocker For The Next Slice

The next planned slice, Rust import/path-alias resolution, requires a real Rust resolver/finalization command or embedded DB-read contract. The current Rust core has extraction/write support and a standalone Rust name matcher helper, but it does not yet have a Rust-owned finalization command that can:

- read nodes/files/unresolved references from the active SQLite index,
- load tsconfig/jsconfig path aliases,
- resolve import/path-alias references with TypeScript parity,
- write resolved edges or return a persistable edge set,
- emit per-stage fallback taxonomy.

Therefore #199 should not be closed until that Rust resolver substrate exists and the import/path-alias slice is migrated through it.

## Validation

Commands run:

- `npx vitest run __tests__/rust-indexing-experiment.test.ts`
- `npm run build`

Both passed.

## Decision

#198 can be closed as complete.

#199, #200, #201, and #202 should remain open. Their implementation depends on the Rust resolver/finalization substrate described above.

No Rust default rollout readiness is claimed.
