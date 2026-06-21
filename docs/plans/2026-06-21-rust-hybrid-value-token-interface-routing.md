# Rust-Hybrid Value Token Interface Routing

Date: 2026-06-21

## Parent

- Optimization tracker: #165
- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD closeout:
  `docs/benchmarks/2026-06-21-rust-hybrid-architecture-performance-prd-closeout.md`
- Semantic predecessor:
  `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md`

## Context

The architecture/performance PRD is complete, but #165 remains open as the
durable post-release optimization tracker. The next main-path work is the first
resolver semantic successor plan.

The predecessor semantic closeout identified `value-token-plus-interface` as a
plausible production routing candidate outside #295. VS Code sparse evidence at
commit `4a6e32fc1f0` found the capped `type-value-namespace-collision` samples
were dominated by this subtype:

| Subtype | Count |
|---|---:|
| value-token-plus-interface | 81 |
| function-overload-signature | 17 |
| ambient-declaration-merge | 2 |

For the 81 `value-token-plus-interface` samples:

- import form: `named-value-import` = 81;
- candidate shape: `constant-interface` = 81;
- usage/context hints: `decorator-token` = 63, `type-position` = 7,
  `unknown` = 11.

## Goal

Attempt one fail-closed production routing slice for
`value-token-plus-interface`, then record keep/no-go evidence and update #165.

This plan is not a broad collision-routing plan. It exists to decide whether
the dominant semantic fallback subtype can safely become production routing.

## Chosen Candidate

Route only the guarded service-token-style shape:

- subtype is explicitly classified as `value-token-plus-interface`;
- candidate shape is exactly `constant-interface`;
- import form is `named-value-import`;
- target candidates are in the same resolved target file;
- runtime/value edges target the value token candidate, not the interface;
- type-only imports keep fallback;
- default imports keep fallback;
- namespace imports keep fallback;
- package imports keep fallback;
- one-hop re-export and multi-hop barrel chains keep fallback;
- unknown context keeps fallback until usage metadata is sufficient.

## Decision Boundary

Allowed:

- deterministic fixtures for the narrow subtype;
- taxonomy/diagnostic improvements needed to prove the subtype is recognized;
- fail-closed production routing for the exact guarded shape;
- current repo and VS Code sparse targeted taxonomy/profile evidence;
- graphStats, fallback taxonomy, RSS or `rssUnavailableReason` artifacts;
- closeout with keep/no-go conclusion.

Not allowed:

- broader `type-value-namespace-collision` routing;
- `function-overload-signature` routing;
- `ambient-declaration-merge` routing;
- default import, namespace import, type-only import, package import, re-export,
  or barrel-chain expansion;
- every-reference disambiguation semantic shortcuts;
- TypeScript finalization architecture changes;
- parse/extraction optimization;
- SQLite schema changes;
- CLI, SDK, MCP, status, doctor, README, or release behavior changes;
- full scoreboard;
- agent A/B by default.

## Validation

Required:

- deterministic fixture coverage for `value-token-plus-interface`;
- graph-visible assertions proving runtime/value edges target the value token
  candidate and type-only or unknown cases keep fallback;
- fallback taxonomy evidence before/after;
- graphStats or equivalent graph parity evidence;
- current repo targeted evidence;
- VS Code sparse targeted evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- RSS recorded or explicit `rssUnavailableReason`.

Agent A/B is not required unless the closeout makes an agent sufficiency or
user-facing retrieval claim.

## Closeout Contract

The plan closes with exactly one conclusion:

- `keep`: the guarded routing reduces the target fallback subtype and graph
  semantics stay stable;
- `no-go`: the routing is unsafe, too noisy, or does not materially improve the
  target fallback subtype.

The closeout must update #165 and then hand off to the second main-path plan:
the TypeScript finalization/reference-resolution tail boundary plan.

## Issue Sequence

1. Add deterministic fixtures for value-token-plus-interface routing.
2. Implement fail-closed value-token-plus-interface routing.
3. Run current repo and VS Code sparse routing taxonomy evidence.
4. Write routing closeout and update #165.
