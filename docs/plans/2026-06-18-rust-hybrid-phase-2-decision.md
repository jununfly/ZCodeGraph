# Rust-Hybrid Phase 2 Decision: Go Extraction v1 and Gin Sufficiency Slice

## Context

Phase 2 follows the first-user release PRD and Phase 1 engine-contract work.

References:

- PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 2 plan: `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`
- Evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- Tracker: #233

## Decision

Phase 2 makes ordinary Go files Rust-owned under the default CLI `rust-hybrid` path and adds a narrow Gin direct route-handler slice.

This closes the immediate Phase 1 behavior where ordinary `.go` files failed fast solely because Go extraction was missing.

## What Changed

- Rust core now includes Go tree-sitter parsing.
- Rust core extracts Go package modules, functions, methods, structs, interfaces, fields, constants, variables, and type aliases.
- Go methods preserve receiver ownership by naming methods as `Receiver.Method`.
- Rust core emits Go same-file and unambiguous same-package direct call references that finalization can resolve into `calls` edges.
- Rust core skips generated Go files by existing generated suffix conventions.
- `rust-hybrid` now treats ordinary Go as Rust-owned instead of fail-fast.
- `rust-hybrid` status metadata includes Go in `rustOwnedLanguages`.
- `rust-hybrid` status metadata includes `skippedGeneratedByLanguage`.
- Gin direct route calls create route nodes.
- Direct Gin route handlers link to handler functions or same-package selector methods where statically obvious.

## Validation

Commands run:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "indexes Go symbols through the Rust engine"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves Go same-file and same-package direct calls"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "indexes ordinary Go|counts generated Go|fails fast for non-Rust-owned|writes rust-hybrid status"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "links Gin direct routes"
npx vitest run __tests__/rust-index-engine-cli.test.ts
```

Real-repo smoke:

- `gin-gonic/examples`
- Commit `179495dfc053bc23b8ba6f9dc8554c904188d6b4`
- Go-only smoke path: `upload-file/limit-bytes`
- `rust-hybrid` full index completed.
- Deterministic probe found `POST /upload`.
- Deterministic probe confirmed route-to-`uploadHandler` linkage.

## Explicit Non-Readiness

Phase 2 does not complete the first-user release.

Still incomplete:

- Real TypeScript fallback writes are not implemented.
- Full Go import resolution is not implemented.
- Cross-package Go semantic resolution is not implemented.
- Interface dispatch, goroutine/channel flow, and full dataflow are not implemented.
- SDK default behavior remains deferred.
- Doctor diagnostic bundles remain deferred.
- README/release messaging was not updated.
- Full repository smoke on `gin-gonic/examples` still hits the expected non-Go fallback boundary because the repository contains YAML.
- Agent A/B was not run.
- Performance remains observational and is not a gate.

## Next Plan Recommendation

Do real TypeScript fallback writes next.

Rationale:

- Ordinary Go no longer blocks the default `rust-hybrid` path.
- The next visible first-user gap is mixed-language repositories where non-Rust-owned supported files still fail fast.
- The full `gin-gonic/examples` repository exposed that boundary through YAML before the Go-only smoke succeeded.

If fallback writes are deferred, the narrower alternative is a Go/Gin hardening plan focused on `Any`, anonymous handlers, middleware route shapes, and selector-method call resolution.
