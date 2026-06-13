# Rust Indexing Core Phase 4 Large-Target Readiness

Issue: #81

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Target

- Repository: https://github.com/microsoft/vscode
- Pinned commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Local target: `/private/tmp/codegraph-corpus/vscode-sparse`
- Checkout shape: blobless sparse checkout of `src`, `extensions`, `build`, `test`, `scripts`, and `.github`.
- Indexed file count: 11,291 JS/TS/JSX/TSX files.
- Acceptance field, indexed file count: 11,291.
- Acceptance field, outside the ordinary quick local test loop: yes.
- Phase 1 copied file count: 11,518 files, including JS/TS source and package/tsconfig/jsconfig files.

This is still the VS Code target, not a same-class replacement. The sparse
checkout keeps the long-running validation focused on the Rust JS/TS indexing
slice while preserving large-repo scale. It remains outside the ordinary quick
local test loop; run it only through the explicit long-running commands below.

## Raw Artifacts

- Profile raw JSON: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`
- Sufficiency raw JSON: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency.raw.json`
- Prompt file: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`

Commands:

```bash
npm run build
cargo build --package zcodegraph-core
node scripts/rust-index-profile.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse > /tmp/zcodegraph-rust-phase4-vscode-profile.json
node scripts/rust-sufficiency-guardrail.mjs \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  > /tmp/zcodegraph-rust-phase4-vscode-sufficiency.json
```

## Profile Summary

Single-run local profile on Apple M5, macOS Darwin 25.5.0, Node v26.0.0,
Rust 1.95.0. These are real measured results, not generated data, but they are
not a statistical benchmark.

| Engine | wall-clock | peak RSS | indexed files |
| --- | ---: | ---: | ---: |
| TypeScript | 224.8s | 1.30GB | 11,291 |
| Rust opt-in | 256.7s | 1.46GB | 11,291 |

Rust node/edge counts after TypeScript finalization: `557,770` nodes and
`1,648,219` edges. The run reported 46 parse errors in fixture and
prompt-heavy files; indexing still completed successfully.

## Rust Phase Timing

| Phase | time |
| --- | ---: |
| source scan | 204ms |
| parse extraction | 35,600ms |
| SQLite write | 75,859ms |
| TypeScript finalization | 126,948ms |
| subprocess startup / handoff | 5ms |

Finalization subphases:

| Subphase | time |
| --- | ---: |
| framework post-extract | 43ms |
| reference resolution | 115,939ms |
| dynamic dispatch synthesis | 9,805ms |
| DB maintenance | 783ms |

Dominant bottleneck: reference resolution during TypeScript finalization.

## Explore Sufficiency

Probe:

```text
AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService
```

| Engine | Flow section | Flow connected | missing expected | deterministic Read/Grep fallback risk |
| --- | --- | --- | ---: | ---: |
| TypeScript | yes | yes | 0 | 0 / 0 |
| Rust opt-in | yes | yes | 0 | 0 / 0 |

Conclusion: Rust indexing did not increase generic Read/Grep fallback risk on
the large-target Explore sufficiency probe. The probe is sufficient enough to
return a connected Flow section for both engines.

## Readiness Takeaway

Large-target readiness is mixed. The sufficiency signal passes, but Rust is not
faster than TypeScript on this VS Code run and uses more peak RSS. The result
supports keeping Rust opt-in while Phase 4 focuses on the dominant
finalization-side reference-resolution bottleneck before any default-rollout
decision.
