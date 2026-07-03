# Roadmap-Sliced Initiative State

Roadmap id: `rust-owned-c-baseline`
Branch: `zjal/rust-owned-c-baseline`
Issue / tracker:
PR:
Last updated: 2026-07-03

## Goal

Migrate C baseline extraction from TypeScript-owned fallback to Rust-owned indexing, validate on a suitably sized GitHub C project, and remove the migrated TypeScript C extraction path after parity is proven.

## Current Focus

- Parent node: `C Rust-owned baseline extraction`
- Leaf node: `C language source registration and baseline symbol parity`
- Mode: exploit
- Commit intent: Add Rust-owned C parser/extractor coverage for functions, structs, enums, typedefs, includes, calls, and header classification boundary with fixture plus real-corpus validation.

## Decisions

| Node | Decision | Durable location |
|------|----------|------------------|
| C baseline ownership | C source files move to Rust-owned per-file indexing; C/C++ header ambiguity remains a documented classification boundary rather than a framework/runtime ownership claim. | `docs/prds/2026-07-03-rust-owned-migration-roadmap.md` and `docs/benchmarks/2026-07-03-rust-owned-c-cjson-validation.md` |
| C corpus selection | `DaveGamble/cJSON` is the passing baseline validation corpus; `libuv/libuv` is deferred as a future macro-heavy stress corpus. | `docs/benchmarks/2026-07-03-rust-owned-c-cjson-validation.md` |

## Verification Evidence

| Leaf | Gate | Result | Notes |
|------|------|--------|-------|
| C Rust-owned fixture | `npx vitest run __tests__/rust-index-engine-cli-language-smoke.test.ts __tests__/rust-index-engine-cli-fallback.test.ts __tests__/rust-index-engine-cli-engine.test.ts` | Passed | 54 tests passed. |
| C++/ObjC TS extraction guard | `npx vitest run __tests__/extraction.test.ts -t "C/C\\+\\+ imports|Objective-C|detect language"` | Passed | 15 focused tests passed. |
| Real GitHub C corpus | `DaveGamble/cJSON` at `fb16e5c` | Passed | 121 indexed files; 3,581 nodes; 7,000 edges; `engineByLanguage.c = rust`; no Rust-owned C gap diagnostics. |

## Human Gates

| Gate | Decision | Scope / expiry |
|------|----------|----------------|
| Process scaffold retention | Delete accidental `.grok/`; retain `.codex/` and `zj-loop/` loop scaffolds. | Applies to this branch closeout. |

## Closeout Checklist

- [x] All leaf nodes completed, deferred with follow-up, or explicitly won't do.
- [x] Durable decisions moved into docs, ADRs, README, or pattern docs.
- [x] Process roadmap files deleted or promoted into durable docs.
- [x] Closeout commit created separately from the final feature slice.
- [ ] Branch clean.
- [ ] Branch pushed.
- [ ] PR opened or updated with verification notes and branch cleanup plan.
