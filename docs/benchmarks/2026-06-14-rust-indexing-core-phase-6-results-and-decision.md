# Rust Indexing Core Phase 6 Results And Decision

Date: 2026-06-14

Classification: `ready for end-to-end prototype`.

Rust remains opt-in. Branch/default status: TypeScript remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows. Phase 6 does not claim default rollout readiness.

Next recommended plan: bounded Rust graph-pipeline prototype, starting with the
`name matcher only` boundary recorded in the feasibility decision.

## Raw Artifacts

- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-profile.raw.json`
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-vscode-sufficiency.raw.json`
- `docs/design/2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md`

## Final Large-Target Profile

Target: validated on a large VS Code JS/TS sparse checkout at commit
`275e1b31`, with 11,518 copied JS/TS/config files and 11,291 indexed files.

Runtime: Node v24.14.0 from the Codex bundled runtime. RSS sampling was not
available in the sandbox because `ps` returned `EPERM`, so RSS is recorded as
unavailable rather than inferred.

| Metric | Phase 5 final profile | Phase 6 final profile | Interpretation |
|---|---:|---:|---|
| TypeScript engine wall time | 230,262ms | 212,394ms | no material regression |
| Rust engine wall time | 246,196ms | 232,616ms | no material regression |
| Profile wall time | 236,447ms | 234,294ms | no material regression |
| TypeScript finalization | 118,521ms | 111,754ms | no material regression |
| Reference resolution | 109,673ms | 100,314ms | no material regression |
| Files errored | 29 | 29 | unchanged |

Important Phase 6 reference-resolution sub-buckets:

| Sub-bucket | Phase 6 final profile |
|---|---:|
| `databaseAccessMs` | 49,669ms |
| `nameMatchingMs` | 36,330ms |
| `perReferenceDisambiguationMs` | 32,397ms |
| `edgeWriteMs` | 25,587ms |
| `unresolvedCleanupMs` | 20,783ms |
| `importResolutionMs` | 10,156ms |
| `candidateLookupMs` | 5,953ms |
| `sharedCandidateLookupMs` | 2,025ms |
| `unresolvedReadMs` | 1,629ms |

The Phase 6 profile did not trigger the plan's 10-15% material-regression
threshold for Rust engine wall time or `referenceResolutionMs`. RSS could not
be judged in this sandbox and remains a follow-up validation gap.

## Final Sufficiency Smoke

The final VS Code sparse-checkout Explore sufficiency smoke completed under the
local Homebrew Node v26.0.0 runtime and reported no deterministic regressions.
This runtime is not the preferred supported runtime for final performance
evidence, so the profile evidence above remains the primary timing source.

Prompt `VS-1` stayed connected for both TypeScript and Rust:

- TypeScript: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Rust: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.

A bounded attempt to run the same sufficiency script under bundled Node v24.14.0
failed during the TypeScript index setup with V8 Wasm `Fatal process out of
memory: Zone`. That is recorded as an operational follow-up because it affects
the reproducibility of the large-target sufficiency guardrail in this local
environment. It does not change the sufficiency result from the completed run,
and it does not authorize default rollout.

Follow-up: #105 tracks supported-runtime sufficiency stability and collectable
RSS evidence for this large-target validation path.

## Phase 6 Completion

Phase 6 delivered the intended JS/TS Rust indexing completeness slices:

- TypeScript enum symbol extraction is covered by parity tests.
- HOF-wrapped class-field method detection is covered by parity tests.
- The end-to-end Rust graph pipeline decision is recorded as `prototype-first`.
- The final large-target profile and sufficiency smoke were recorded without
  default-rollout claims.

The final decision is `ready for end-to-end prototype`, not default rollout.
The next plan should test a narrow Rust graph-production boundary, starting
with `name matcher only`, while preserving per-reference disambiguation
semantics and Agent Sufficiency.
