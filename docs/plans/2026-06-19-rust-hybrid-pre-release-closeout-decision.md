# Rust-Hybrid Pre-Release Polish Closeout Decision

Date: 2026-06-19

Related issues: #275, #276, #277, #278, #279, #280

## Decision

Proceed with the pre-release API polish as complete, with one explicit sufficiency caveat:

- `zcodegraph init` is now the clean first-user initialization command.
- `init -i` / `--index` is removed.
- `ZCODEGRAPH_INDEX_ENGINE` no longer selects the CLI index engine and now fails fast with guidance to use an explicit flag.
- `zcodegraph index --engine typescript` remains the supported TypeScript escape hatch.
- Source and packaged smoke passed.
- README now carries targeted 2026-06-19 rust-hybrid Agent Sufficiency spot-check data for TS/JS and Go.
- Go/Gin sufficiency is usable but prompt-dependent; it is not uniformly read-free.

## Evidence

- API cleanup and doc alignment: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md`
- Targeted source and packaged smoke: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md`
- Agent Sufficiency spot-check: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md`
- Plan: `docs/plans/2026-06-19-rust-hybrid-pre-release-polish.md`

## Release Readiness Interpretation

This slice supports a first-user pre-release path, not a broad claim that all language/framework sufficiency gaps are solved.

The release path is acceptable because:

- first-user setup has one stable command,
- stale env configuration fails loudly instead of silently changing behavior,
- the packaged path works locally without publishing,
- diagnostic bundle guidance remains available,
- the README no longer overstates Go/Gin sufficiency.

The residual Go/Gin `POST /upload` fallback is not a release blocker for this slice because the user story prioritizes usable agent sufficiency and language coverage over strict performance targets. It should inform later Go/Gin retrieval hardening.

## Follow-Up Candidates

- Improve Gin-specific precise route lookup so a concrete `METHOD path` question can resolve to handlers without reading small files.
- Run a full median-of-4 benchmark refresh after the first-user release branch stabilizes.
- Re-run package smoke on Linux and Windows only if release packaging or platform launchers change.
