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
- `docs/benchmarks/2026-06-14-rust-indexing-core-phase-6-issue105-vscode-sufficiency-node24.raw.json`
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

The original final VS Code sparse-checkout Explore sufficiency smoke completed
under the local Homebrew Node v26.0.0 runtime and reported no deterministic
regressions. Issue #105 then aligned the sufficiency guardrail copy scope with
the profiler's JavaScript/TypeScript/config slice and reproduced the same smoke
under the supported bundled Node v24.14.0 runtime.

Prompt `VS-1` stayed connected for both TypeScript and Rust:

- TypeScript: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Rust: `flowConnected=true`, no missing expected symbols, deterministic
  generic Read/Grep fallback signals at 0.
- Supported-runtime rerun: Node v24.14.0, `copyMode=js-ts-config-slice`,
  11,518 copied JS/TS/config files per engine, no deterministic regressions.

The previous Node v24.14.0 failure was specific to the guardrail's full-repo
copy behavior on this large sparse checkout. The #105 rerun did not reproduce
the V8 Wasm `Fatal process out of memory: Zone` failure after the guardrail was
scoped to the JS/TS/config slice.

RSS remains unavailable inside this sandbox when process-list access is denied.
The profiler now documents that limitation in its help text and records a
sandbox-specific `rssUnavailableReason` instead of leaving RSS ambiguity.

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
