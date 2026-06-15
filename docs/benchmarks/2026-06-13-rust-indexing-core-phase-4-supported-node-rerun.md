# Rust Indexing Core Phase 4 Supported Node Rerun

Issue: [#85](https://github.com/jununfly/ZCodeGraph/issues/85)

Parent decision: [Rust Indexing Core Phase 4 Results And Decision](2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

## Summary

The VS Code readiness smoke was rerun under Node v22.21.1, which is within the
supported package range (`>=20.0.0 <25.0.0`). This confirms the #81 Node 26
large-target conclusion was not just a Node 26 runtime artifact.

The rerun keeps Rust opt-in and does not require Rust to beat TypeScript end to
end.

## Target

- Repository: `https://github.com/microsoft/vscode`
- Pinned commit: `275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0`
- Target shape: large VS Code JS/TS sparse checkout, not full VS Code.
- Indexed file count: 11,291 JS/TS/JSX/TSX files.
- Runtime: Node v22.21.1.

## Raw Artifacts

- Profile raw JSON:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-profile.raw.json`
- Sufficiency raw JSON:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-node22-sufficiency.raw.json`
- Prompt file:
  `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json`

Commands:

```bash
/private/tmp/node-v22.21.1-darwin-arm64/bin/node \
  scripts/rust-index-profile.mjs \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  > /tmp/zcodegraph-rust-phase4-vscode-node22-profile.json

/private/tmp/node-v22.21.1-darwin-arm64/bin/node \
  scripts/rust-sufficiency-guardrail.mjs \
  --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json \
  --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse \
  > /tmp/zcodegraph-rust-phase4-vscode-node22-sufficiency.json
```

## Profile Smoke

| Engine | wall-clock | peak RSS | indexed files |
| --- | ---: | ---: | ---: |
| TypeScript | 221.4s | 1.64GB | 11,291 |
| Rust opt-in | 239.7s | 1.61GB | 11,291 |

Rust node/edge counts: `557,770` nodes and `1,648,219` edges. The run reported
46 parse errors, matching the earlier large-target evidence classified by the
[VS Code parse-error taxonomy](2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md).

Finalization subphases:

| Subphase | time |
| --- | ---: |
| framework post-extract | 39ms |
| reference resolution | 93,061ms |
| dynamic dispatch synthesis | 8,125ms |
| DB maintenance | 102ms |

Dominant bottleneck: `referenceResolutionMs`.

## Sufficiency Probe

Probe:

```text
AbstractExtensionService _createExtensionHostManager _doCreateExtensionHostManager ExtensionHostManager start ExtensionHostMain MainThreadExtensionService
```

| Engine | Flow section | Flow connected | missing expected | deterministic Read/Grep fallback-risk |
| --- | --- | --- | ---: | ---: |
| TypeScript | yes | yes | 0 | 0 / 0 |
| Rust opt-in | yes | yes | 0 | 0 / 0 |

The sufficiency probe reported no regressions. Rust indexing did not increase
deterministic Read/Grep fallback-risk under Node 22.

## Node 26 Comparison

The supported-runtime profile materially improves the Rust large-target
wall-clock result compared with the Node 26 #81 run, but it does not change the
Phase 4 decision.

| Runtime | TypeScript wall | Rust wall | Rust RSS | Dominant bottleneck |
| --- | ---: | ---: | ---: | --- |
| Node v26.0.0 | 224.8s | 256.7s | 1.46GB | `referenceResolutionMs` |
| Node v22.21.1 | 221.4s | 239.7s | 1.61GB | `referenceResolutionMs` |

The supported Node result confirms the same rollout blocker: the large-target
dominant cost is still TypeScript finalization, specifically
`referenceResolutionMs`. Phase 4 should continue with opt-in hardening rather
than preparing a default-rollout plan.
