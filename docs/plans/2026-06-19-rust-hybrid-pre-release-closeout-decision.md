# Rust-Hybrid Pre-Release Polish Closeout Decision

Date: 2026-06-19

Related issues: #275, #276, #277, #278, #279, #280, #281

## Decision

Proceed with the pre-release API polish as complete:

- `zcodegraph init` is now the clean first-user initialization command.
- `init -i` / `--index` is removed.
- `ZCODEGRAPH_INDEX_ENGINE` no longer selects the CLI index engine and now fails fast with guidance to use an explicit flag.
- `zcodegraph index --engine typescript` remains the supported TypeScript escape hatch.
- Source and packaged smoke passed.
- README now carries targeted 2026-06-19 rust-hybrid Agent Sufficiency spot-check data for TS/JS and Go.
- A bounded #281 hardening pass made the tested Gin `POST /upload` route lookup read-free through one `zcodegraph_explore` call.

## Evidence

- API cleanup and doc alignment: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md`
- Targeted source and packaged smoke: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md`
- Agent Sufficiency spot-check: `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md`
- Gin route-query hardening: `docs/benchmarks/2026-06-19-rust-hybrid-issue-281-gin-route-query-sufficiency.md`
- Plan: `docs/plans/2026-06-19-rust-hybrid-pre-release-polish.md`

## Release Readiness Interpretation

This slice supports a first-user pre-release path, not a broad claim that all language/framework sufficiency gaps are solved.

The release path is acceptable because:

- first-user setup has one stable command,
- stale env configuration fails loudly instead of silently changing behavior,
- the packaged path works locally without publishing,
- diagnostic bundle guidance remains available,
- README Go/Gin sufficiency wording is backed by targeted A/B evidence.

The earlier Go/Gin `POST /upload` fallback from #279 was addressed by #281. The remaining caveat is scope, not a known release blocker: this is targeted route-query evidence, not a full Go/Gin benchmark replacement.

## Follow-Up Candidates

- Run a full median-of-4 benchmark refresh after the first-user release branch stabilizes.
- Re-run package smoke on Linux and Windows only if release packaging or platform launchers change.
