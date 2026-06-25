# ZCodeGraph 0.10.0 Release Go/No-Go Handoff

Date: 2026-06-25

Decision: go, with explicit maintainer release steps

## Summary

The repository is ready for the maintainer to proceed with the formal 0.10.0
release flow after reviewing the caveats below. Do not publish manually.

This handoff accounts for:

- release snapshot evidence:
  `docs/benchmarks/2026-06-25-zcodegraph-0-10-0-release-snapshot.md`;
- machine-readable snapshot result:
  `docs/benchmarks/2026-06-25-zcodegraph-0-10-0-release-snapshot-result.json`;
- release-critical local validation:
  `docs/benchmarks/2026-06-25-zcodegraph-0-10-0-release-critical-validation.md`;
- README refresh for installation, usage, capabilities, language ownership,
  troubleshooting, and replayable issue reports;
- `CHANGELOG.md` `[Unreleased]` audit.

## Validation Result

Local validation passed:

- `npm test`: pass;
- `npm run build`: pass;
- targeted packaged smoke: pass;
- source-path install/uninstall/init/index/status/doctor smoke: pass.

Snapshot status:

- current repository `rust-hybrid` snapshot completed 3/3 runs;
- external TypeScript/JavaScript and Go/Gin corpus measurements are
  `needs-human-setup` because the directories under `/private/tmp/codegraph-corpus/`
  were not Git checkouts;
- RSS was unavailable in the command wrapper and is recorded with the specific
  reason.

## Known Caveats

- The local development shell is Node `v26.0.0`, which ZCodeGraph correctly
  warns about. Local smoke used `CODEGRAPH_ALLOW_UNSAFE_NODE=1`; release users
  should use the bundled CLI runtime or supported Node versions for library
  embedding.
- The current repository snapshot is degraded because non-Rust-owned YAML/Rust
  files are appended through TypeScript fallback. This is expected under the
  current ownership boundary and is documented in the snapshot.
- The representative external TypeScript/JavaScript and Go/Gin corpora need
  human setup before they can back new broad performance claims.
- Static-analysis frontiers remain: runtime dispatch, reflection, dependency
  injection containers, generated code, and framework conventions can still
  require explicit follow-up evidence.

## Changelog Audit

`CHANGELOG.md` `[Unreleased]` contains user-facing entries for:

- breaking changes around `Subgraph.entryNodes`, access model names,
  `.zcodegraph/` namespace, `zcodegraph init`, and explicit engine selection;
- security fixes;
- new `rust-hybrid` and language/framework capabilities;
- fixes for diagnostics, packaging, indexing, MCP behavior, and graph
  semantics.

The section is large but release-workflow compatible: it remains under
`[Unreleased]`, and no pre-created `## [0.10.0]` block was added.

## Maintainer Release Steps

When ready, bump `package.json` to `0.10.0` on `main`. The GitHub Release
workflow will:

1. sync `package-lock.json` to the package version if needed;
2. promote `[Unreleased]` in `CHANGELOG.md` into `[0.10.0] - <date>`;
3. build platform bundles;
4. create the GitHub Release;
5. publish the npm shim and per-platform packages.

Do not run `npm publish`, create release tags, or trigger manual package
publishing from this agent session.

