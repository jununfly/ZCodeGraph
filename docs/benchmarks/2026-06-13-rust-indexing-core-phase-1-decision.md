# Rust Indexing Core Phase 1 Stop/Continue Decision

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 1 Plan](../plans/2026-06-12-rust-indexing-core-phase-1.md)
Issue: [#59](https://github.com/jununfly/ZCodeGraph/issues/59)

## Decision

Continue the Rust indexing core as an experimental, opt-in migration path.

Do not make Rust the default index engine in Phase 1. The TypeScript indexer
remains the default and fallback path for CLI, MCP, npm, npx, installer, and
upgrade flows.

## Evidence

| Gate | Evidence | Decision |
|---|---|---|
| Semantic parity for JS/TS/JSX/TSX | Fixture parity and real-repo parity are complete in the phase plan. | Good enough for Phase 1. |
| TypeScript resolver handoff | Rust extraction is followed by existing TypeScript resolution, framework finalization, dynamic-dispatch synthesis, and TypeScript MCP/Explore readback. | Good enough for Phase 1. |
| Performance and memory | [Phase 1 performance gate](2026-06-13-rust-indexing-core-phase-1-performance.md) records ZCodeGraph and Excalidraw baselines. Rust is slower but uses 86.0% and 91.1% less peak RSS. | Memory hard gate passes; speed remains a Phase 2 optimization target. |
| Agent Sufficiency | [Agent Sufficiency guardrail](2026-06-13-rust-indexing-core-agent-sufficiency.md) records no Rust-only Flow, Read-risk, or Grep-risk regression. | Good enough for Phase 1. |

## Packaging And Release Readiness

Local development:

- Build the TypeScript shell with `npm run build`.
- Build the Rust subprocess with `cargo build --package zcodegraph-core`.
- Run the experimental path by setting `ZCODEGRAPH_RUST_CORE_BINARY` to the
  built binary, or by using the default local debug path after the binary exists.
- Validate with `cargo test`, the Rust CLI integration tests, the parity script,
  the benchmark script, and the sufficiency guardrail script before expanding
  the Rust slice.

Release packaging:

- Phase 1 does not change npm install, npx, installer, or upgrade behavior when
  Rust is unused.
- The published npm and npx path must continue to launch the TypeScript indexer
  by default.
- Per-platform bundle inclusion is not complete in Phase 1. The release bundle
  scripts currently package Node, compiled TypeScript, schema, WASM grammars, and
  production dependencies; they do not yet build or include
  `zcodegraph-core`.
- Until per-platform Rust binaries are packaged, the Rust path must remain
  clearly experimental and require an explicit engine selection plus a local
  Rust binary. If the binary is unavailable, the CLI must fail cleanly without
  corrupting the active index.

Unsupported or unavailable Rust path:

- Unsupported platforms should keep the normal TypeScript indexer path
  unchanged.
- `zcodegraph index` without `--engine rust` and without
  `ZCODEGRAPH_INDEX_ENGINE=rust` must keep working through the TypeScript
  indexer.
- `npm install`, `npx @jununfly/zcodegraph`, installer-generated MCP configs,
  and the bundled launcher must not require Rust while the feature is
  experimental.

Rollback:

- Stop using `--engine rust`.
- Unset `ZCODEGRAPH_INDEX_ENGINE`.
- Re-index with the default TypeScript engine using `zcodegraph index -f`.

## Phase 2 Proposal

Open Phase 2 issues before expanding language coverage:

1. Package `zcodegraph-core` into every release bundle and npm platform package.
2. Add CI coverage for `cargo test` plus Rust CLI integration tests on macOS,
   Linux, and Windows.
3. Optimize Rust indexing wall-clock time, focusing on extraction throughput,
   SQLite write batching, subprocess handoff, and remaining TypeScript
   finalization cost.
4. Add a packaged-binary availability test that proves default TypeScript
   indexing still works when the Rust binary is absent.
5. Select the next language slice only after packaged Rust binaries and CI are
   in place; prefer another high-volume tree-sitter language with existing
   parity fixtures and real-repo sufficiency prompts.

## Final Phase 1 Status

Phase 1 passes the stop/continue gate because semantic parity, resolver handoff,
MCP/Explore readback, memory, and Agent Sufficiency are good enough for an
experimental opt-in path.

Phase 1 does not justify default rollout because wall-clock indexing is slower
and release packaging for the Rust binary is not complete.
