# Rust-Hybrid Pre-Release API Cleanup Evidence

Date: 2026-06-19

Related issues: #276, #277

## Scope

This evidence covers the pre-release API polish slice:

- `zcodegraph init` is the first-user initialization command.
- Historical `zcodegraph init -i` / `--index` support is removed.
- CLI index engine selection is explicit `--engine` only.
- `ZCODEGRAPH_INDEX_ENGINE=typescript` fails fast for CLI engine-selection paths and points users to `zcodegraph index --engine typescript`.
- SDK behavior remains option-driven and does not read the CLI env var.

## Implementation Summary

- Removed the `init -i` / `init --index` option from the CLI.
- Changed `resolveIndexEngine()` so stale `ZCODEGRAPH_INDEX_ENGINE` usage throws a clear error instead of selecting an engine.
- Kept default CLI engine resolution at `rust-hybrid`.
- Kept status Rust-core diagnostics defaulted to `rust-hybrid` without reading `ZCODEGRAPH_INDEX_ENGINE`.
- Updated user-facing docs and scripts from `zcodegraph init -i` to `zcodegraph init` where the reference was current guidance.
- Left old changelog history and explicit residue-regression tests untouched where they intentionally describe older behavior.

## Targeted Tests

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "environment|init --index"
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-package-smoke.test.ts __tests__/status-json.test.ts __tests__/identity-residue.test.ts
```

Result:

- Build passed.
- Targeted CLI tests passed.
- Four-file targeted regression suite passed: 72 tests.

## Behavior Verified

- `zcodegraph init` defaults to `rust-hybrid`.
- `zcodegraph init --index` is rejected by commander as an unknown option.
- `ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index` fails fast with:

```text
ZCODEGRAPH_INDEX_ENGINE is no longer supported for selecting the index engine. Use: zcodegraph index --engine typescript
```

- `zcodegraph index --engine typescript` remains the explicit escape hatch.
- Status JSON configured-engine diagnostics no longer report env-selected TypeScript.

## Documentation Alignment

Updated current user-facing guidance in:

- `README.md`
- `src/installer/index.ts`
- `src/mcp/server-instructions.ts`
- `src/sync/worktree.ts`
- `scripts/add-lang/bench.sh`
- `scripts/agent-eval/audit.sh`
- `docs/design/dynamic-dispatch-coverage-playbook.md`
- `docs/design/callback-edge-synthesis.md`
- `docs/design/architecture-roadmap-validation.md`
- `docs/SEARCH_QUALITY_LOOP.md`
- `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- `CHANGELOG.md`

## Decision

#276 and #277 are complete from an implementation and documentation perspective. The remaining validation belongs to #278 packaged smoke, #279 Agent Sufficiency refresh, and #280 closeout.
