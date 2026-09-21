# Rust-Hybrid Optimization — Decision Ledger

> Decision ledger distilled 2026-09-21 from the 6,647-line
> `2026-06-24-rust-hybrid-consolidated-benchmarks.md` (append-merge of phase
> smoke evidence, wall-clock A/B runs, profile JSON, and 2026-06-25 closeout
> decisions). Decision/scope/gate sections retained; commands, environments,
> raw results, and profiles dropped (git history).
>
> doc-kind: design · authority: supporting · paired with ADR-0001/0003.

This ledger preserves the rust-hybrid first-user/performance routing decisions
and the explicit needs-oracle/research deferral: research/oracle routes stay
deferred until a future roadmap explicitly promotes them.

## 2026-06-25 Lifecycle Cleanup Addendum
This addendum absorbs later rust-hybrid process evidence after the
`Rust-Hybrid Indexing Completion And Performance Roadmap` closeout.

Cleanup rule:

- this file is the total benchmark/evidence entry point for rust-hybrid
  first-user and performance routing decisions;
- long-lived theme evidence remains separate when it is a useful knowledge
  entry point:
  - `docs/designs/finalization-tail-boundary-contract.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- raw result JSON, profile directories, generated experiment summaries, and
  issue-scoped closeout files are deleted once their durable facts are absorbed
  here or in the theme evidence files;
- baseline standards such as `baseline-indexing-performance-v1.md` remain
  separate because they define reusable measurement contracts rather than
  process evidence.

### Candidate Protocol And Comprehensive Performance Evidence

Candidate protocol routing, shape diagnostics, comprehensive performance
baseline, and comprehensive closeout artifacts were process evidence. Their
durable conclusion is:

- candidate protocol/routing diagnostics were useful for selecting bounded
  optimization targets but are not a standalone architecture decision;
- comprehensive performance evidence should be read through the later ownership
  roadmap and first-user performance closeout rather than as a current source
  of truth;
- performance optimization remains evidence-gated and should not become a
  parallel roadmap forest.

Absorbed files:

- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-ab-result.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-vscode-disabled-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-shape-diagnostics-decision.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-closeout-decision.md`

### First-User Performance Closeout

The first-user performance execution subtree closed as `yellow`.

Durable conclusion:

- the subtree can close and should not keep spawning ad hoc performance
  optimization nodes;
- current-repo evidence has 3-run diagnostic and after-optimization coverage;
- the cleanup/edge-write bounded implementation is classified `keep`, but it is
  a narrow round-trip reduction rather than a broad performance win;
- graphStats and fallback taxonomy stayed stable enough for this closeout;
- RSS remained unavailable with an explicit unavailable reason;
- VS Code sparse and Excalidraw were `needs-human-setup` because their
  configured paths were not valid Git checkouts for the runner;
- next route is ownership/mainline work, with performance retained as a
  guardrail and bounded exploit lane only when a measured bottleneck appears.

Key current-repo medians:

| Metric | Before | After | Classification |
| --- | ---: | ---: | --- |
| wall time | `7684 ms` | `7639 ms` | stable / slight improvement |
| unresolved cleanup | `215 ms` | `196 ms` | improved |
| edge write | `138 ms` | `89 ms` | improved, not solely attributed |
| fallback taxonomy total | `2645` | `2645` | stable |
| edge count | `40600` | `40600` | stable |

Absorbed files and directories:

- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result.json`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-baseline-result/`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-diagnostic-result/`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result/`

### Research And Diagnostic Contracts

Research/oracle-needed route closeout and tail diagnostic bucket contract
artifacts were absorbed as lifecycle decisions:

- research/oracle routes stay deferred or `needs-oracle/research` unless a
  future roadmap explicitly promotes them;
- diagnostic bucket contracts remain useful as profile-field expectations, but
  the current durable reference is this consolidated benchmark entry plus the
  relevant baseline standards.

Absorbed files:

- `docs/benchmarks/2026-06-25-rust-hybrid-research-oracle-needed-routes-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-tail-diagnostic-bucket-contract.md`

## Source Files
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-issue-281-gin-route-query-sufficiency.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-packaged-smoke-recheck-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-prd-gate-audit.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-real-gin-smoke-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-cleanup-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-edge-write-bulk-insert-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-js-ts-file-import-target-parity-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-legacy-env-flag-config-audit.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-lowername-default-on-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

### 1. `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md

**Interpretation**

The deterministic smoke proves:

- Ordinary Go files no longer fail fast under the default `rust-hybrid` path.
- Go is recorded as Rust-owned metadata.
- A direct Gin route node is created.
- The Gin route links to its handler function.

The selected real fixture does not contain a same-package helper call inside `uploadHandler`, so handler-to-helper evidence is not applicable for this corpus. Synthetic coverage in `__tests__/rust-index-engine-cli.test.ts` covers handler-to-helper and selector-method handler linkage.

**Known Gaps**

- Full `gin-gonic/examples` repository still fails under `rust-hybrid` because non-Go fallback writes are intentionally not implemented in Phase 2.
- Anonymous route handlers are not claimed as handler-linkage coverage.
- `Any`, middleware semantics, helper factories, and deep nested groups are not claimed.
- Full Go import resolution and cross-package semantic resolution are not implemented.
- Agent A/B was not run.
- First-user release readiness is not claimed.

### 2. `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md

**Summary**

Phase 3 validates that the default `rust-hybrid` full-index path can complete a mixed-language real Go repository by writing Rust-owned files first, appending TypeScript fallback files, and running one TypeScript shell finalization pass.

Result: pass.

**Known Gaps**

- Rust-owned per-file parse/extraction fallback to TypeScript remains pending.
- SDK defaults and SDK engine options remain out of scope.
- Doctor diagnostic bundles remain out of scope.
- README and release messaging remain out of scope.
- Performance gates remain out of scope for this phase.
- First-user release readiness is not claimed by this evidence.

### 3. `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md

**Summary**

Phase 4 validates that `rust-hybrid` runs can produce privacy-preserving diagnostic bundle inputs for both degraded completed runs and process-level failures.

Result: pass.

**Known Gaps**

- Packaged/release-like doctor smoke remains out of scope.
- README and release messaging remain out of scope.
- Source slices remain out of scope.
- RSS sampling remains out of scope; the bundle records an unavailable reason.
- Rust-owned per-file fallback remains out of scope.
- SDK behavior remains out of scope.
- First-user release readiness is not claimed by this evidence.

### 4. `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md

**Summary**

Phase 5 validates that release-like packaged CLI and staged npm shim paths can run the first-user `rust-hybrid` workflow.

Result: pass.

**Known Gaps**

- This smoke did not use the official downloaded Node runtime because the sandbox could not resolve `nodejs.org`; release workflow should still validate official runtime download in CI/release infrastructure.
- Real Gin packaged smoke remains out of scope for Phase 5.
- README and release messaging remain out of scope.
- SDK default behavior and SDK engine options remain out of scope.
- Rust-owned per-file parse/extraction fallback remains a separate follow-up.
- No npm publish, GitHub Release workflow trigger, or tag push was performed.
- Final first-user release readiness is not claimed by this evidence alone.

### 5. `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md

**Summary**

Phase 6 implements Rust-owned per-file parse gap fallback for the CLI `rust-hybrid` path.

Result: pass.

**Scope Boundaries**

This evidence does not validate:

- SDK default behavior or SDK engine options,
- README or release messaging,
- full release-like packaged smoke,
- per-file graph replacement after partial Rust writes,
- performance or #165,
- final first-user release readiness.

### 8. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md

**Candidate Tried**

The single bounded candidate selected by #287 was implemented:

Rust core source extraction now writes all per-file facts through one run-level SQLite transaction instead of opening and committing one transaction per indexed file. Parser coverage, extracted graph facts, TypeScript fallback behavior, Rust/TypeScript ownership boundaries, and user-facing defaults are unchanged.

**Validation**

Targeted tests:

```bash
cargo test --package zcodegraph-core
```

Result: 25 passed.

Build checks:

```bash
npm run build
cargo build --package zcodegraph-core
```

Result: both passed.

No packaged/release smoke was run because this change does not touch CLI launcher, packaging, status, doctor, or release workflow paths.

**Decision**

Decision: keep.

Why:

- The selected bucket moved in the expected direction on both corpora.
- The large-corpus total wall-clock improved by 16.61%.
- The large-corpus Rust-owned SQLite write bucket improved by 55.91%.
- RSS did not regress; both corpora reported slightly lower peak RSS under `/usr/bin/time -l`.
- TypeScript finalization stayed flat, so the trend points specifically at the selected candidate rather than unrelated behavior changes.

Remaining bottleneck:

This does not solve the overall indexing target alone. After the change, the VS Code sparse run is still dominated by TypeScript finalization and reference-resolution work (`typescriptFinalizationMs` 126,161ms, `referenceResolutionMs` 108,595ms). Continue tracking deeper long-run performance work in #165. The parse-extraction candidate #224 remains valid but was not the best first candidate in this A/B slice.

### 11. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline.md

**Scope**

This baseline covers only the `rust-hybrid` source-path full-index flow. It does not run the full benchmark scoreboard, packaged smoke, release workflow, or agent sufficiency A/B.

**Candidate Selection**

Selected bounded candidate for #288:

Move Rust core extraction writes from per-file SQLite transactions to one run-level bulk transaction for the source extraction phase.

Reasoning:

- The largest Rust-owned bucket on VS Code sparse is `sqliteWriteMs` at 124,488ms.
- The current Rust core write path commits one transaction per indexed file while FTS triggers are already suspended and rebuilt after bulk writing.
- The candidate does not alter parser coverage, symbol semantics, reference disambiguation, fallback policy, or user-facing default behavior.
- The expected effect is a reduced `rustCore.sqliteWriteMs` and full-index wall-clock, with RSS recorded as a guardrail.

Non-selected candidates:

- Parse extraction optimization (#224): `parseExtractionMs` is significant but smaller than the write bucket on the large corpus in this pass.
- TypeScript finalization/name matcher migration: larger semantic surface and not suitable as the single bounded candidate for this A/B slice.
- Reference cleanup rowid deletion: already present on the batched resolver path, so it is not a valid new optimization attempt.

Decision for #287: proceed to #288 with the single bulk-transaction Rust write candidate.

### 12. `docs/benchmarks/2026-06-19-rust-hybrid-issue-281-gin-route-query-sufficiency.md

**Scope**

This was a bounded pre-release hardening attempt for Go/Gin `METHOD path` lookup questions. It did not change the Rust Go extractor, Go module/package resolution, Gin middleware semantics, MCP tool names, or the release workflow.

**Change**

`zcodegraph_explore` now recognizes HTTP `METHOD /path` query shapes as route lookup seeds. When a matching `route` node exists in the current graph, Explore seeds that route and its direct route-to-handler edge so the rendered answer includes an explicit `Route matches` section even on small-project budgets where the generic Relationships section is disabled.

**Deterministic Tool-Level Evidence**

Test:

```bash
npx vitest run __tests__/gin-route-explore-sufficiency.test.ts
```

Result:

- pass

The test indexes a small Gin fixture through `rust-hybrid`, calls the public MCP handler `zcodegraph_explore`, and verifies that one Explore response includes:

- `POST /upload`,
- `uploadHandler`,
- the registration line `r.POST("/upload", uploadHandler)`,
- an explicit `Route matches` section with the route-to-handler relationship.

**Decision**

Keep the bounded Explore route-query hardening.

The mechanism is now available and the real targeted A/B converted to a clean sufficiency win. This removes the specific #279 caveat that `POST /upload` still fell back to reading `main.go`.

This does not claim broad Go/Gin benchmark replacement or complete Go framework coverage. It only closes the release-prep gap for tested Gin route lookup questions.

### 13. `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md

**Decision**

Stop treating the next optimization as another blind bounded A/B candidate.

Keep the proven production optimizations, preserve the diagnostic tooling, and
split the next work into two tracks:

1. #224 should become an actionable `parseExtractionMs` sub-bucket diagnostic
   issue before any further parse/extraction optimization is selected.
2. TypeScript finalization/reference resolution should be discussed as an
   architecture problem, not as the next small performance patch.

This does not close #165. It changes the next-step framing for #165 from
"find one more local optimization" to "separate proven production mechanics
from architectural bottlenecks."

**Recommended Next Steps**

1. Keep #165 open as the post-PRD optimization tracker.
2. Keep #224 open, but narrow it to parse/extraction sub-bucket diagnostics.
3. Create a new architecture discussion/plan for TypeScript
   finalization/reference resolution as the hybrid-boundary bottleneck.
4. Do not create another generic "one bounded A/B" performance issue until
   either #224 or the finalization architecture discussion selects a concrete
   candidate.

**Non-Decisions**

- This does not claim Rust default rollout readiness.
- This does not claim the strict post-PRD performance target is met.
- This does not require full benchmark scoreboard work before the next
  diagnostic issue.
- This does not close #224.
- This does not prescribe a Rust rewrite of TypeScript finalization; it only
  says the topic is now architectural rather than a small patch.

### 14. `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md

**Summary**

Phase 7 aligns programmatic SDK full-index entry points with the CLI `rust-hybrid` default while preserving explicit engine selection.

Result: pass.

**Regression Found During Validation**

The targeted CLI suite caught a boundary regression after changing the SDK default: CLI `--engine typescript` paths still called SDK `indexAll()` without an explicit engine, so the SDK default redirected those paths to `rust-hybrid`.

The fix keeps CLI engine selection explicit by passing `engine: 'typescript'` when the CLI has already selected the TypeScript indexer. CLI behavior still owns `ZCODEGRAPH_INDEX_ENGINE`; SDK behavior remains explicit and does not read that environment variable.

The full regression suite also caught historical TypeScript baseline tests and experiment scripts that relied on the old SDK/CLI default. Those tests and scripts now explicitly request TypeScript when they are validating TypeScript extractor/resolver behavior or TypeScript-vs-Rust A/B arms. Phase 7-specific tests remain the only tests that intentionally exercise the new SDK default.

**Scope Boundaries**

This evidence does not validate:

- README or release messaging,
- full release-like packaged smoke,
- real Gin packaged smoke,
- watch/sync `rust-hybrid` incremental semantics,
- performance optimization or #165,
- GitHub Release workflow trigger,
- npm publish,
- final first-user release readiness.

### 15. `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-packaged-smoke-recheck-evidence.md

**Summary**

Current-main targeted packaged smoke passed.

The recheck validated the release-like bundle launcher, Rust core discovery, staged npm shim, default `rust-hybrid` indexing, explicit `rust-hybrid` indexing, hybrid status metadata, doctor last-run and last-failure bundles, and package-shape constraints. It did not run the GitHub Release workflow, publish npm packages, create tags, or upload diagnostics.

**Interpretation**

The targeted packaged smoke satisfies the Phase 8 packaging release gate:

- Release-like bundle launcher finds the packaged Rust core.
- Release-like `init -i` uses `rust-hybrid`.
- Release-like default `index` uses `rust-hybrid`.
- Explicit `index --engine rust-hybrid` works.
- `status --json` exposes hybrid metadata.
- Degraded fallback taxonomy is recorded.
- Doctor last-run and last-failure bundles work.
- Staged npm shim finds the optional platform package and Rust core.
- The package shape has no postinstall and no local Rust compilation requirement.
- No publish, release workflow, tag push, or registry contact was attempted by the smoke script.

**Known Non-Blockers**

- The local bundle used a deterministic Node runtime stand-in because this sandbox is not the release infrastructure.
- Real Gin packaged smoke remains out of scope; real Gin source-build smoke and targeted package smoke are separate Phase 8 gates.
- RSS was not available from this smoke command.

### 16. `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-prd-gate-audit.md

**Gate Matrix**

| PRD gate | Status before Phase 8 smoke | Current evidence needed | Notes |
|---|---|---|---|
| `zcodegraph init -i` and `zcodegraph index` default to `rust-hybrid` | Pass | Confirm through packaged smoke | Phase 1 and Phase 7 decisions cover CLI and SDK full-index defaults. |
| Shared engine values support `typescript`, `rust`, and `rust-hybrid` | Pass | None | Phase 1 established the shared engine contract; Phase 7 aligned SDK full-index options. |
| TypeScript escape hatch remains available | Pass | README troubleshooting update | CLI and SDK support explicit `typescript`; user-facing docs still needed the troubleshooting path. |
| Rust process/system failures fail safely instead of whole-repo TS fallback | Pass | Packaged last-failure smoke | Phase 1 and Phase 5 validated fail-safe behavior; Phase 8 should rerun packaged last-failure bundle. |
| Rust-owned JS/TS/JSX/TSX/Go assignment is visible in status | Pass | Gin and package status excerpts | Phase 3 and Phase 7 cover mixed-language metadata; Phase 8 should cite current `status --json`. |
| Unsupported supported languages fall back to TypeScript per file | Pass | Gin fallback taxonomy and package degraded smoke | Phase 3 added language-level fallback into the unified graph. |
| Rust-owned parse/extraction gaps fall back per file when safe | Pass | None for release closeout | Phase 6 covered per-file parse gap fallback and doctor diagnostics. |
| Generated Go files may be skipped and counted | Pass | Gin status excerpt | Phase 2/3 implemented generated Go skips; Phase 8 real Gin smoke should confirm counts remain visible. |
| Go extraction v1 supports Gin route-handler sufficiency | Needs current evidence | Real Gin deterministic smoke | Phase 2 passed on a real Gin subdir. Phase 8 requires a current-main real Gin smoke. |
| Diagnostic bundles are local-only and source-free by default | Pass | Gin/package doctor bundle paths | Phase 4 implemented doctor bundles. Phase 8 should confirm last-run and last-failure paths still work. |
| First-user README primary path does not make users choose an engine | Needs doc update | README edit | Existing README already shows install/init but still had stale `init` wording and no rust-hybrid troubleshooting. |
| Release-like packaging works without publish/release/tag | Needs current evidence | Targeted packaged smoke | Phase 5 passed. Phase 8 should rerun current-main package smoke. |
| Performance #165 is not a blocker | Non-blocker | Record wall time/RSS or unavailable reason | PRD shifted strict performance targets out of release gating. Severe regressions can still block. |
| Watch/sync rust-hybrid incremental semantics | Non-blocker | None | First-user release requires full index; incremental rust-hybrid semantics remain follow-up. |
| Full Go module/package import resolver | Non-blocker | None | Explicit PRD non-goal for Go v1. |
| gRPC/protobuf generated Go flow coverage | Non-blocker | None | Explicit PRD non-goal; generated Go files can be skipped and counted. |
| Broader Go generics edge support | Non-blocker | None | Explicit PRD non-goal for first-user release. |

### 17. `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-real-gin-smoke-evidence.md

**Summary**

Current-main real Gin deterministic smoke passed with a degraded-but-explainable `rust-hybrid` run.

This is a deterministic smoke only. It is not a multi-round agent A/B run and does not claim performance completion.

**Interpretation**

The real Gin smoke satisfies the Phase 8 release gate:

- Full-repository `rust-hybrid` indexing completes on a real Gin examples repo.
- Go is handled by Rust.
- Non-Rust-owned YAML files fall back to TypeScript and are classified as `language-level-typescript-fallback`.
- Generated Go skips are visible in status and do not block the run.
- `doctor --engine rust-hybrid --bundle --last-run` produces a local diagnostic bundle.
- A deterministic Gin route in `upload-file/limit-bytes/main.go` resolves to its handler.

The degraded state is expected for this mixed repository because YAML fallback is supported and explainable. It is not a release blocker.

**Known Non-Blockers**

- The run used local source build output, not a published package.
- The host Node version warning is an environment detail for this smoke; packaged smoke separately validates the bundled runtime path.
- RSS was unavailable for this run due to sandboxed `/usr/bin/time -l` behavior.
- Full Go module import resolution, gRPC/protobuf generated flows, and broad Go generics remain out of scope for the first-user release.

### 18. `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md

**Scope**

This is a targeted first-user release spot-check for the default `rust-hybrid` path. It is not a full median-of-4 benchmark refresh.

The goal was to refresh README-facing TypeScript/JavaScript and Go sufficiency evidence with real Claude Code headless A/B runs:

- WITH: ZCodeGraph MCP server enabled against the freshly built local `dist/bin/zcodegraph.js`.
- WITHOUT: empty MCP config.
- Built-in Read, Bash/grep/find, and subagents were available in both arms.
- Repos were indexed with the current `rust-hybrid` default before the runs.

**Interpretation**

Excalidraw still shows the expected value pattern for a hard TS/React flow question:

- tool calls dropped from 54 to 7,
- Read/Bash fallback dropped from 53 to 2,
- wall time dropped from 222s to 61s.

This is not perfectly read-free; the model still read `StaticCanvas.tsx` twice after graph exploration.

Go/Gin after #281:

- The broad route-registration question is a clean sufficiency win: one `zcodegraph_explore`, zero Read/Grep fallback.
- The narrow `POST /upload` lookup became a clean sufficiency win after route-query hardening: one `zcodegraph_explore`, zero Read/Grep fallback.
- This remains targeted release-readiness evidence, not a broad Go/Gin benchmark replacement.

**README Wording Decision**

README should not claim that current Go/Gin sufficiency is uniformly better. The accurate release-ready statement is:

- TS/JS flow sufficiency remains strong on the hard Excalidraw path, though not read-free.
- Go/Gin route lookup sufficiency is strong on the two targeted release-readiness prompts.
- This was a targeted pre-release spot-check, not a full benchmark replacement.

### 19. `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md

**Scope**

This evidence covers the pre-release API polish slice:

- `zcodegraph init` is the first-user initialization command.
- Historical `zcodegraph init -i` / `--index` support is removed.
- CLI index engine selection is explicit `--engine` only.
- `ZCODEGRAPH_INDEX_ENGINE=typescript` fails fast for CLI engine-selection paths and points users to `zcodegraph index --engine typescript`.
- SDK behavior remains option-driven and does not read the CLI env var.

**Implementation Summary**

- Removed the `init -i` / `init --index` option from the CLI.
- Changed `resolveIndexEngine()` so stale `ZCODEGRAPH_INDEX_ENGINE` usage throws a clear error instead of selecting an engine.
- Kept default CLI engine resolution at `rust-hybrid`.
- Kept status Rust-core diagnostics defaulted to `rust-hybrid` without reading `ZCODEGRAPH_INDEX_ENGINE`.
- Updated user-facing docs and scripts from `zcodegraph init -i` to `zcodegraph init` where the reference was current guidance.
- Left old changelog history and explicit residue-regression tests untouched where they intentionally describe older behavior.

**Targeted Tests**

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "environment|init --index"
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-package-smoke.test.ts __tests__/status-json.test.ts __tests__/identity-residue.test.ts
```

Result:

- Build passed.
- Targeted CLI tests passed.
- Four-file targeted regression suite passed: 72 tests.

**Decision**

#276 and #277 are complete from an implementation and documentation perspective. The remaining validation belongs to #278 packaged smoke, #279 Agent Sufficiency refresh, and #280 closeout.

### 20. `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md

**Scope**

This is a targeted release-candidate smoke pass for the first-user `rust-hybrid` path. It does not run the full release workflow, create a tag, publish to npm, or contact the npm registry.

**Artifacts**

Package smoke artifacts:

```text
/private/tmp/zcodegraph-pre-release-package-smoke/
```

Summary files:

- `/private/tmp/zcodegraph-pre-release-package-smoke/summary.json`
- `/private/tmp/zcodegraph-pre-release-package-smoke/summary.md`

**Decision**

#278 is complete. The first-user source and packaged smoke paths match the pre-release API polish requirements.

### 23. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md

**Candidate Tried**

The single bounded candidate selected by #291 was implemented:

Rust core extraction now reuses one tree-sitter parser per source language
during a full-index run instead of constructing and configuring a fresh parser
for every file.

This does not change parser grammar selection, extracted graph semantics,
TypeScript fallback behavior, reference disambiguation, or default user
behavior.

**Validation**

Targeted and regression tests:

```bash
cargo test --package zcodegraph-core rust_index_extracts_mixed_languages_with_reused_parsers
cargo test --package zcodegraph-core
```

Result: 26 passed.

Build checks:

```bash
npm run build
cargo build --package zcodegraph-core
```

Result: both passed.

No packaged/release smoke was run because this change does not touch CLI
launcher, packaging, status, doctor, or release workflow paths. No agent
sufficiency A/B was run because graph semantics and indexed results are not
intended to change.

**Decision**

Decision: keep, with low confidence that this specific candidate materially
improves `parseExtractionMs`.

Why keep:

- The change is narrow and semantics-preserving.
- Targeted mixed-language extraction and the full Rust core test suite passed.
- Full-index wall-clock improved on both corpora.
- VS Code sparse RSS improved.

Why the performance conclusion is modest:

- The candidate targeted parser setup overhead inside `parseExtractionMs`, but
  VS Code sparse `parseExtractionMs` only moved from 40,052ms to 39,996ms.
- Most of the VS Code wall-clock movement came from other buckets
  (`sqliteWriteMs`, TypeScript finalization, and finalization database buckets),
  which may include ordinary run-to-run variance.
- This candidate should not be treated as closing #224.

Remaining bottleneck:

The large-corpus end-to-end run is still dominated by TypeScript finalization
and reference-resolution work (`typescriptFinalizationMs` 122,274ms,
`referenceResolutionMs` 104,426ms). Among Rust-owned buckets,
`parseExtractionMs` remains visible and needs more actionable sub-bucket
profiling before another parse/extraction optimization is chosen.

Next recommendation:

- Keep #224 open.
- Reframe #224 toward parse/extraction sub-bucket diagnostics rather than
  assuming parser setup was the meaningful cost.
- For #165, continue treating TypeScript finalization/reference-resolution as
  the largest end-to-end blocker, but require a narrow low-semantic-risk
  candidate before implementing there.

### 26. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline.md

**Scope**

This baseline covers only source-path `rust-hybrid` full indexing. It does not
run the full benchmark scoreboard, packaged smoke, release workflow, or agent
sufficiency A/B.

**Candidate Selection**

Selected bounded candidate for #292:

Reuse one tree-sitter parser per source language during Rust core extraction
instead of constructing and configuring a new parser for every file.

Reasoning:

- The largest remaining end-to-end bucket is still TypeScript finalization, but
  the low-semantic-risk options there are less obvious from this baseline and
  can easily drift into reference-disambiguation semantics.
- `rustCore.parseExtractionMs` is now a visible Rust-owned bucket on VS Code
  sparse at 40,052ms.
- The current extraction loop constructs a new `Parser` and sets its language
  for every file. Reusing parsers by language is a bounded mechanical candidate
  that should not change extracted graph semantics.
- This partially reframes #224: parse extraction remains relevant, and this
  pass tries one narrow parse/extraction overhead candidate before opening
  broader parser/extractor subsegment work.

Non-selected candidates:

- TypeScript finalization/reference-resolution semantic migration: too broad
  for this plan and explicitly outside the disambiguation guardrail.
- Finalization database write/cleanup: still large, but recent passes already
  addressed several write/cleanup mechanics; this baseline does not isolate one
  lower-risk next write candidate.
- Another Rust SQLite write candidate: the prior pass already moved
  `sqliteWriteMs` materially, and the next obvious low-risk Rust-owned bucket is
  parse/extraction overhead.

Decision for #291: proceed to #292 with the single parser reuse candidate.

### 27. `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md

**Decision**

Define the first resolver-migration implementation slice as an **in-process
TypeScript candidate lookup/cache protocol boundary**.

This first slice should stabilize candidate facts, lookup shapes, diagnostics,
and equivalence tests before introducing a Rust producer. It must not migrate
or alter every-reference disambiguation decisions.

The first slice is a protocol boundary, not a Rust subprocess migration.

**Candidate Fact Shape**

The protocol should expose stable graph facts that the existing TypeScript
disambiguation logic can consume.

Minimum candidate fact:

- `nodeId`
- `name`
- `qualifiedName`
- `kind`
- `filePath`
- `language`
- `line`
- `column`
- `parentId` or owner identifier when available
- exported/imported signal when already available from graph facts
- `source` / provenance such as `graph-db`, `protocol-cache`, or later
  `rust-produced`

The candidate fact must not include:

- final confidence;
- `resolvedBy`;
- rank score;
- selected target;
- framework-specific synthetic decision;
- dynamic-dispatch result.

Those fields belong to disambiguation or synthesis, not candidate availability.

**Unified Graph Boundary**

Candidate materialization must happen after:

1. Rust core graph writes complete.
2. TypeScript fallback append completes.
3. Before TypeScript reference resolution starts.

The cache must be built over the unified SQLite graph, not only Rust-owned
files.

Rules:

- lookup keys must not filter by "Rust-owned file" or "TypeScript fallback
  file";
- candidate facts may carry provenance for diagnostics;
- provenance must not change disambiguation;
- if TypeScript fallback append fails, candidate protocol does not run and the
  existing failure path remains authoritative.

This keeps mixed-graph references valid in both directions: Rust-owned files can
reference fallback files and fallback files can reference Rust-owned files.

**Candidate Equivalence**

Equivalence should use double-read comparison, not double-decision comparison.

Baseline:

- current resolver context reads candidates through existing DB/cache access.

Protocol:

- candidate protocol reads candidates through the materialized/cache boundary.

For the same lookup shape and key, compare candidate availability:

- candidate node id set;
- candidate count;
- lookup existence;
- empty candidate set behavior.

Order is not a semantic requirement unless the existing disambiguation logic is
shown to depend on order. If order is relevant, the implementation issue must
document and preserve that dependency explicitly.

Do not compare final resolved target in this first slice. Final target
selection remains the TypeScript disambiguation decision.

Mismatch samples should be capped so profile artifacts do not explode.

Required deterministic fixtures:

- same-name multiple candidates;
- lower-name lookup;
- qualified-name lookup;
- file nodes lookup;
- mixed Rust-owned and TypeScript fallback graph;
- missing name / empty candidate set.

**No-Go Criteria**

Candidate lookup/cache protocol should stop as the first migration path if any
of these happen:

- deterministic candidate equivalence cannot pass consistently;
- the unified graph after fallback append cannot provide a stable cache
  boundary;
- profile output cannot distinguish candidate protocol cost from
  disambiguation cost;
- the protocol increases wall-clock or RSS without improving diagnostic
  clarity;
- VS Code sparse targeted profile shows no useful movement in
  `candidateLookupMs`, `nameMatcherCandidateLookupDbMs`, or
  `databaseAccessMs`;
- mismatch taxonomy shows the real problem is scope, package, framework, or
  dynamic-dispatch semantics rather than candidate lookup/cache;
- meaningful benefit requires changing every-reference disambiguation
  semantics.

Fallback paths after no-go:

1. cleanup / edge-write / DB maintenance slice;
2. import/export tail slice;
3. local exact references slice;
4. broad disambiguation migration plan only when evidence points there.

### 28. `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md

**Decision**

Keep the experimental Rust candidate producer routing slice behind local config.

The experiment is narrow enough to keep:

- default off;
- enabled only by `.zcodegraph/config.json`;
- routed shapes limited to `ExactName` and `KnownNamePresence`;
- TypeScript baseline comparison remains active;
- any mismatch or producer failure fails closed to TypeScript baseline for the run.

Do not broaden the experiment yet. The next migration decision should still
treat final target selection and reference disambiguation as TypeScript-owned
until a separate resolver-migration slice proves otherwise.

**Implementation Summary**

The routing experiment now:

- reads `experimental.rustCandidateProducerRouting` from local project config;
- reports concise status JSON at
  `rust.experimental.candidateProducerRouting.enabled/source`;
- precomputes a bare unresolved-reference key universe before resolution;
- batch-runs the Rust candidate producer once for `ExactName` and
  `KnownNamePresence`;
- hydrates Rust ids through TypeScript-side node lookup;
- routes only precomputed exact-name and known-name presence lookups;
- leaves derived receiver/member/tail known-name checks on the TypeScript path;
- records profile diagnostics for configured state, active state, active
  shapes, fallback reason, mismatch count, and bounded mismatch samples.

**Caveats**

Both profile commands printed the existing unsupported Node 26 warning. The
runs were intentionally allowed with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local
targeted evidence. This warning is environment evidence, not a routing failure.

This closeout does not claim performance improvement. It only establishes a
safe, observable main-path routing experiment with graph-stability evidence and
clean routing diagnostics.

**Follow-Up**

Continue resolver migration through dedicated slices. Candidate producer routing
can stay available as an experimental local config while the architecture work
migrates finalization/reference-resolution ownership deliberately.

### 29. `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md

**Decision**

Keep the candidate lookup/cache protocol direction as the first implementation slice for resolver migration.

The slice is useful as a TypeScript in-process protocol boundary: it centralizes candidate lookup shapes, preserves current resolver semantics, and produces profile diagnostics that make later Rust producer or deeper resolver migration decisions testable. It is not yet a performance optimization and should not be presented as one.

**What changed**

- Added a candidate fact and lookup protocol for `ExactName`, `LowerName`, `QualifiedName`, `FileNodes`, and `KnownNamePresence`.
- Routed existing resolver candidate reads through the protocol when `ZCODEGRAPH_CANDIDATE_PROTOCOL` is enabled.
- Preserved the disabled path with `ZCODEGRAPH_CANDIDATE_PROTOCOL=0`.
- Exposed `candidateProtocol` diagnostics in rust-hybrid `ZCODEGRAPH_INDEX_PROFILE_OUT` artifacts only.
- Added optional double-read equivalence mode with `ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE=1`.

No every-reference disambiguation decision was migrated or changed. TypeScript remains the final resolver decision owner for this slice.

**Graph and fallback stability**

Status graph stats:

| Metric | Before | After |
| --- | ---: | ---: |
| `fileCount` | 303 | 303 |
| `nodeCount` | 15,485 | 15,485 |
| `edgeCount` | 32,957 | 32,957 |

Fallback taxonomy total:

| Metric | Before | After |
| --- | ---: | ---: |
| `finalize.fallbackTaxonomy.totalFallbacks` | 1,575 | 1,575 |

The protocol slice did not change graph shape or fallback taxonomy on this targeted corpus.

**Closeout**

Conclusion: keep.

Recommended next step: add a follow-up slice for a Rust producer or deeper resolver migration only after deciding whether the producer should emit candidate facts directly or whether TypeScript should continue to materialize facts from the unified SQLite graph. The current protocol is sufficient as the product-shell boundary for that decision.

Do not treat this slice as a speed win. Its value is decision quality: lookup shape vocabulary, graph-stability tests, profile diagnostics, and clean equivalence evidence.

### 30. `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md

**Decision**

The complete local-config Rust candidate producer routing boundary is semantically keepable.

This does not make routing a default user behavior. It remains gated by the experimental local config:

```json
{ "experimental": { "rustCandidateProducerRouting": true } }
```

The closeout criterion is semantic safety and diagnostic visibility, not an end-to-end performance win.

**Scope Verified**

- Routed lookup shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- On-demand single-key node lookups: `LowerName`, `QualifiedName`, `FileNodes`.
- TypeScript baseline comparison remains active for routed node results.
- Fail-closed paths are covered for candidate mismatch, missing result, hydration miss, producer failure, and invalid local config.
- No resolver ranking, confidence, `resolvedBy`, framework behavior, dynamic-dispatch synthesis, or SQLite schema change was introduced.

**Interpretation**

The complete routing boundary is safe to keep behind local config because it stays active on both a current-repo run and a large VS Code JS/TS sparse checkout, exposes all five shapes in diagnostics, and records no routing fallback or mismatch.

The performance profile is not a greenlight for default enablement. The VS Code sparse profile still shows `candidateLookupMs` and TypeScript finalization/reference-resolution as the dominant cost centers. Those are inputs for the resolver migration and architecture/performance PRD, not blockers for this local-config boundary.

### 31. `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md

**Rust-Owned Work Already Visible At The Boundary**

The finalization profile reports a `boundaryProtocol` object with:

- `version`;
- `productShell: "typescript"`;
- `rustOwnedStages`.

The Rust-owned stage list always includes:

- `source-scan`;
- `parse-extraction`;
- `graph-write`.

It can also include Rust-owned reference-resolution slices when the graph shows
those edges:

- `import-path-alias-resolution`;
- `esm-named-import-export-resolution`;
- `esm-one-hop-reexport-resolution`;
- `local-exact-reference-resolution`.

This means the current code already recognizes a staged migration boundary.
However, broad TypeScript finalization/reference resolution still runs after
those Rust-owned slices.

**Diagnostic Gaps For The Next Slice**

The current profile is useful, but the candidate lookup/cache protocol needs
more specific implementation evidence:

- count of candidate lookup calls by lookup shape;
- cache hit/miss counts by lookup shape;
- candidate set size distribution;
- hydration time separated from ranking/disambiguation time;
- explicit relation between candidate cache movement and `databaseAccessMs`;
- equivalence evidence that candidate availability did not change;
- graphStats and fallback taxonomy before/after.

The current fields already point in this direction, especially
`candidateLookupMs`, `candidateLookupCacheHitMs`,
`nameMatcherCandidateLookupDbMs`, and `perReferenceDisambiguationMs`, but they
do not yet define a durable TS/Rust protocol boundary.

**Guardrail**

This mapping slice does not change production behavior and does not recommend a
semantic shortcut.

Every-reference disambiguation semantics must remain unchanged for the first
candidate lookup/cache slice. The first slice may change how candidate sets are
collected, cached, measured, or transported. It must not change how the final
target is selected for a reference.

### 32. `docs/benchmarks/2026-06-20-rust-hybrid-finalization-cleanup-closeout-decision.md

**Decision**

Keep the finalization write/cleanup diagnostics.

Treat the bounded resolved cleanup batching optimization as **no-go as a
standalone performance lever**. The implementation is graph-stable and gives
better observability, but the targeted VS Code sparse profile does not show a
credible cleanup-bucket improvement versus the previous routing evidence.

Do not broaden this slice into edge-write ownership, intentionally unresolved
cleanup optimization, Rust subprocess cleanup, or schema changes.

**What Changed**

- Split finalization write/cleanup profile diagnostics into:
  - `edgeEndpointValidationDbMs`;
  - `edgeInsertCount`;
  - `resolvedCleanupMs`;
  - `resolvedCleanupDbMs`;
  - `resolvedCleanupRowCount`;
  - `intentionallyUnresolvedCleanupMs`;
  - `intentionallyUnresolvedCleanupDbMs`;
  - `intentionallyUnresolvedCleanupRowCount`.
- Preserved existing high-level fields:
  - `edgeMaterializationMs`;
  - `edgeMaterializationDbMs`;
  - `edgeWriteMs`;
  - `edgeWriteDbMs`;
  - `unresolvedCleanupMs`;
  - `unresolvedCleanupDbMs`;
  - `databaseAccessMs`.
- Added cleanup contract tests for:
  - non-batched resolved cleanup leaving unresolved refs in place;
  - batched cleanup deleting resolved and intentionally unresolved terminal refs;
  - rowid chunk boundaries.
- Attempted a bounded resolved cleanup optimization using compact rowid ranges
  for resolved-reference cleanup only.

**Deterministic Validation**

Commands:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes a Rust-produced index and profile"
npx vitest run __tests__/resolution.test.ts -t "unresolved cleanup contract"
npx vitest run __tests__/access-models.test.ts -t "unresolved-reference row ids"
```

Result:

- profile-shape test passed;
- cleanup contract tests passed;
- rowid/range delete tests passed;
- TypeScript build passed.

**Current Repo Evidence**

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`;
- wall time: 4.51s;
- maximum resident set size: 348782592;
- peak memory footprint: 296807088;
- TypeScript finalization: 916ms;
- reference resolution: 501ms;
- database access: 278ms;
- edge endpoint validation: 12ms;
- edge insert: 89ms;
- edge insert count: 11930;
- total unresolved cleanup: 140ms;
- resolved cleanup: 91ms;
- resolved cleanup row count: 11930;
- intentionally unresolved cleanup: 49ms;
- intentionally unresolved cleanup row count: 25656;
- fallback taxonomy total: 1580.

**Interpretation**

The new diagnostics are useful. They show that cleanup is material, and that
resolved cleanup is the dominant cleanup component on VS Code sparse:

- resolved cleanup: 7899ms;
- intentionally unresolved cleanup: 2003ms;
- total cleanup: 9902ms.

However, the bounded rowid-range cleanup optimization is not a clear standalone
win. The previous VS Code sparse routing profile recorded `unresolvedCleanupMs`
at 9108ms, while this run recorded 9902ms. Cross-run noise and other profile
differences mean this is not a strict regression claim, but it is enough to
avoid treating resolved cleanup batching as the next high-confidence lever.

The larger remaining buckets are still:

- `databaseAccessMs`: 23438ms;
- `perReferenceDisambiguationMs`: 18826ms;
- `edgeWriteMs`: 11888ms;
- `unresolvedCleanupMs`: 9902ms.

That points to a broader finalization ownership/write-path decision rather than
more cleanup-only SQL tweaks.

**Caveats**

Both targeted profile commands printed the existing Node 26 unsupported runtime
warning. The runs used `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local evidence. This
is environment evidence, not a cleanup-specific failure.

This closeout does not claim release-level performance improvement. It records
a bounded optimization attempt and a clearer diagnostic basis for the next
architecture decision.

**Follow-Up**

Recommended next direction:

- keep the diagnostics;
- do not continue cleanup-only batching as the main performance strategy;
- decide whether the next slice should target edge write ownership/protocol or
  broader per-reference disambiguation execution.

### 33. `docs/benchmarks/2026-06-20-rust-hybrid-finalization-edge-write-bulk-insert-closeout-decision.md

**Scope**

This artifact closes the bounded edge-write diagnostics and TypeScript-side `insertValidatedEdges()` bulk insert slice from:

- `docs/plans/2026-06-20-rust-hybrid-finalization-edge-write-diagnostics-and-bulk-insert.md`
- Issues #330, #331, #332, and #333

The implementation keeps the existing schema and finalization semantics intact. It does not change `insertEdge()`, does not introduce a multi-row SQL statement, and does not move edge writes into the Rust subprocess.

**Change**

- Added public profile diagnostics for finalization edge insert work:
  - `edgeInsertSerializationMs`
  - `edgeInsertSerializedBytes`
- Changed `insertValidatedEdges()` to pre-serialize validated edges into SQLite row params once, prepare the insert statement once, and execute those rows inside one transaction.
- Preserved `INSERT OR IGNORE` and the existing validated-edge endpoint contract.
- Added deterministic DB contract coverage for validated edge row shape and empty-batch diagnostics.

**Decision**

Decision: keep.

The change is behavior-preserving and improves profile observability. The bounded optimization shows a small favorable trend on the large VS Code sparse checkout, but the measured improvement is not large enough to treat TypeScript-side validated-edge pre-serialization as a major standalone performance lever.

This evidence supports keeping the simpler pre-serialized row path, but future performance work should continue to prioritize larger finalization bottlenecks such as candidate lookup, reference resolution/finalization architecture, and cleanup/write-path segmentation.

**Caveats**

- Runs were targeted smoke/profile runs, not a full multi-run benchmark.
- The local environment used Node 26 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, so the CLI emitted the existing unsafe Node warning. The run completed successfully.
- RSS baseline was not available in the cleanup baseline artifacts, so RSS is recorded for the after runs only.

### 34. `docs/benchmarks/2026-06-20-rust-hybrid-js-ts-file-import-target-parity-closeout-decision.md

**Decision**

Keep the Rust JS/TS file-level import target parity slice.

The implementation improves feature completeness for conventional aliases and
workspace package subpaths, and it adds source-kind diagnostics that make the
remaining file-target gap easier to reason about. It does not materially reduce
the VS Code sparse `unresolved-file-level-import-target` gap because that corpus
did not exercise the newly added conventional-alias or workspace-package paths.

This is a semantic/diagnostic keep decision, not a performance win claim.

**Scope Verified**

- Conventional aliases:
  - `@/`
  - `~/`
  - `@src/`
  - `src/`
  - `@app/`
  - `app/`
- Workspace package subpaths from:
  - root `package.json` `workspaces` array;
  - root `package.json` `workspaces.packages` array;
  - root `pnpm-workspace.yaml` `packages:` list.
- Longest package-name matching.
- Existing relative import behavior.
- Existing tsconfig/jsconfig paths behavior.
- Profile diagnostics:
  - `importPathAliasResolvedBySource`
  - `importPathAliasFallbackBySource`

No package `exports`, `main`, npm package resolution, `.svelte`/`.vue` target
extensions, or binding-level symbol disambiguation was added.

**Deterministic Evidence**

- `cargo test rust_workspace_package_loader_handles_manifests_and_longest_match`
  - Passed.
- `cargo test rust_resolves_js_ts_alias_and_workspace_file_import_targets`
  - Passed.
- `cargo test emits_machine_readable_result_json`
  - Passed.
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "relative and paths-alias|conventional aliases and workspace package"`
  - Passed.
- `npm run build`
  - Passed.

The deterministic fixtures prove:

- conventional aliases resolve to Rust-owned file-level `imports` edges;
- package.json workspaces resolve to Rust-owned file-level `imports` edges;
- pnpm workspace packages resolve to Rust-owned file-level `imports` edges;
- existing relative and tsconfig/jsconfig path behavior remains covered;
- profile source-kind diagnostics are present.

**Follow-Up**

- Keep conventional alias and workspace package support because deterministic
  fixtures prove semantic parity for those TS resolver paths.
- Use the new source-kind diagnostics in future profile closeouts.
- If continuing file-target completeness, sample the `relative` unresolved
  target set before implementing another resolver expansion.
- If continuing resolver migration, return to binding-level import/export symbol
  disambiguation because it remains the largest known unsupported category.

### 35. `docs/benchmarks/2026-06-20-rust-hybrid-legacy-env-flag-config-audit.md

**Decision**

Do not migrate or remove legacy environment flags in the candidate producer
routing slice.

Use this audit to separate future config migration from flags that should remain
environment-only because they are diagnostic, test, packaging, or process
control mechanisms.

**Classification**

| Flag family | Category | Recommendation |
| --- | --- | --- |
| `ZCODEGRAPH_CANDIDATE_PROTOCOL` | user/experimental behavior | Candidate for future local config migration. Keep for now because it guards the broader candidate protocol, not only Rust routing. |
| `ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE` | diagnostic/equivalence behavior | Keep as diagnostic/dev control for now. It is useful for verification and should not become a user-facing stable config yet. |
| `ZCODEGRAPH_RUST_CANDIDATE_PRODUCER` | user/experimental behavior | Candidate for future local config migration or removal once local routing config fully replaces shadow-only activation. Keep for now to avoid changing existing benchmark scripts. |
| `ZCODEGRAPH_RUST_NAME_MATCHER` | user/experimental behavior | Candidate for future local config migration, but separate from candidate producer routing. |
| `ZCODEGRAPH_RUST_NAME_MATCHER_STRICT` | diagnostic/equivalence behavior | Keep as diagnostic/dev control until Rust name matcher ownership is settled. |
| `ZCODEGRAPH_NAME_MATCHER_REPLAY_AB` | diagnostic A/B behavior | Keep as diagnostic/dev control. It is explicitly for replay evidence, not default product behavior. |
| `ZCODEGRAPH_RUST_CORE_BINARY` | dev/test/packaging override | Keep as env. It is a toolchain and packaged-binary override, useful in tests and release validation. |
| `ZCODEGRAPH_RUST_CORE_ARTIFACT_DIR` | dev/test/packaging override | Keep as env. It belongs to bundle/release plumbing, not local project behavior. |
| `ZCODEGRAPH_INDEX_PROFILE_OUT` | diagnostic output | Keep as env. It is a one-shot output path for profile artifacts and should remain easy for scripts to set. |
| `ZCODEGRAPH_EXPERIMENT_*` | script-private experiment | Keep script-private. Do not migrate into product config. |
| `ZCODEGRAPH_PHASE3_*` | script-private experiment | Keep script-private. These are historical validation script controls. |
| `ZCODEGRAPH_INDEX_ENGINE` | already-deprecated user entrypoint | Keep fail-fast behavior. Do not reintroduce env-based engine selection. |
| `CODEGRAPH_ALLOW_UNSAFE_NODE` | process-control/runtime safety | Keep as env. It gates unsafe runtime override and should stay explicit per process. |
| `CODEGRAPH_NO_DAEMON` | process-control | Keep as env. It is a process-launch behavior used by tests, CI, and troubleshooting. |
| `CODEGRAPH_NO_RELAUNCH` | process-control | Keep as env. It controls runtime relaunch behavior and belongs outside project config. |
| `CODEGRAPH_WASM_RELAUNCHED` | process-control/internal guard | Keep internal env. It prevents relaunch loops. |
| `CODEGRAPH_HOST_PPID` | process-control/internal guard | Keep internal env. It supports process lifetime tracking. |
| `CODEGRAPH_MCP_TOOLS` | operator/runtime control | Keep as env. It is a deployment/operator allowlist, not per-project indexing behavior. |
| `CODEGRAPH_EXPLORE_LINENUMS` | diagnostic/output behavior | Keep as env unless explore output config becomes a broader product surface. |
| `CODEGRAPH_ADAPTIVE_EXPLORE` | experimental retrieval behavior | Candidate for future config discussion, but not part of Rust resolver migration. |
| `CODEGRAPH_INSTALL_DIR` | packaging/install override | Keep as env. It is npm SDK/install plumbing. |
| `CODEGRAPH_NO_DOWNLOAD` | packaging/install override | Keep as env. It is install/test plumbing. |

**Migration Boundary**

Good local-config candidates are long-lived project behavior switches:

- candidate protocol activation;
- Rust name matcher activation;
- Rust candidate producer activation or routing.

Poor local-config candidates are process-scoped controls:

- unsafe Node override;
- daemon/relaunch controls;
- packaged binary overrides;
- one-shot profile output paths;
- script-only experiment knobs.

**Follow-Up Recommendation**

Create a future technical-debt slice only when one of these becomes necessary:

1. Migrate user/experimental behavior flags into `.zcodegraph/config.json`.
2. Keep diagnostic, process-control, and packaging flags as environment
   variables.
3. Remove or fail-fast deprecated user entrypoints that conflict with the
   current product mental model.

No runtime behavior changed as part of this audit.

### 36. `docs/benchmarks/2026-06-20-rust-hybrid-lowername-default-on-routing-closeout-decision.md

**Scope**

This artifact closes the LowerName default-on routing implementation slice:

- Plan: `docs/plans/2026-06-20-rust-hybrid-lowername-default-on-routing.md`
- Issues: #334, #335, #336, #337
- Parent PRD: #295
- Optimization tracker: #165

**Implementation Summary**

Implemented and validated:

- `LowerName` is now included in the Rust candidate producer routing shape set
  when candidate producer routing is locally enabled.
- Bare unresolved-reference routing precompute now includes:
  - `ExactName`
  - `KnownNamePresence`
  - `LowerName`
- Resolver-emitted `LowerName` lookups can use synchronous single-key
  on-demand Rust producer lookup when no precomputed result exists.
- Successful on-demand `LowerName` results are cached.
- Mismatch, missing result, node hydration miss, invalid config, or producer
  failure fails closed to the TypeScript baseline without failing indexing.
- Profile diagnostics now report routed shapes and on-demand LowerName counts.

Not kept:

- `rust-hybrid` default-on candidate producer routing.

The default-on behavior was implemented and profiled, but the targeted evidence
does not support shipping it as the default path. The final code keeps routing
behind the existing local experimental config.

**Decision**

Decision: no-go for default-on LowerName routing.

The graph remained stable and the Rust producer did not report mismatches, but
the default-on trial introduced a large candidate lookup cost regression. The
regression is visible on both current repo and VS Code sparse evidence. This
does not meet the bar for changing the default `rust-hybrid` user path.

Keep the implementation only as an experimental local-config capability:

```json
{
  "experimental": {
    "rustCandidateProducerRouting": true
  }
}
```

The missing-config default remains disabled. Invalid local config remains
fail-closed and diagnostic-only.

**Follow-Up**

Treat default-on LowerName routing as prerequisite work, not as an accepted
default-path optimization.

Before reconsidering default-on, a follow-up slice should explain and reduce
the `candidateLookupMs` regression. Plausible candidates:

- avoid repeated expensive TypeScript baseline verification in the hot path
  without weakening graph-stability evidence;
- batch or sessionize LowerName producer/baseline verification;
- move more of the LowerName equivalence check into a bounded preflight instead
  of per-lookup routing;
- keep LowerName routing local-config-only until the candidate lookup cost is
  back near the ExactName/KnownName routing profile.

**Caveats**

- Runs were targeted smoke/profile runs, not full multi-run benchmarks.
- Both profile runs used Node 26 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, so the
  CLI emitted the existing unsafe Node warning. The runs completed
  successfully.

### 37. `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md

**Decision**

Accept the resolver migration decision plan.

The route is:

```text
Current:
  TypeScript-owned finalization/reference-resolution tail

Target:
  Rust-owned finalization/reference-resolution
    with a narrow protocol boundary to the TypeScript product shell

First implementation slice:
  in-process TypeScript candidate lookup/cache protocol boundary
```

The first slice should define and validate candidate facts, lookup shapes,
unified-graph materialization, diagnostics, and candidate availability
equivalence. It must not migrate or alter every-reference disambiguation
decisions.

**Completed Decision Artifacts**

### #297 Current-State Map

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`

Result:

- mapped the current `rust-hybrid` pipeline from Rust core output through
  TypeScript fallback append and TypeScript finalization;
- identified TypeScript-owned responsibilities;
- cited existing profile evidence instead of running a new large-corpus
  benchmark;
- separated repeated hydration/lookup facts from hypotheses;
- preserved the semantic guardrail for disambiguation decisions.

### #298 Ownership Classification

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

Result:

- accepted ADR ZJ-0002 as the long-term architecture direction;
- classified migration domains by ownership target;
- chose candidate lookup/cache as protocol-owned first and Rust-owned later if
  evidence supports it;
- kept disambiguation TypeScript-owned until parity/replay/profile evidence
  justifies a separate migration plan;
- deferred framework post-extract and dynamic-dispatch synthesis by
  framework/mechanism.

### #299 First-Slice Plan

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`

Result:

- defined the first slice as an in-process TypeScript protocol boundary;
- defined candidate fact shape;
- defined lookup shapes: `ExactName`, `LowerName`, `QualifiedName`,
  `FileNodes`, and `KnownNamePresence`;
- required materialization over the unified graph after Rust writes and
  TypeScript fallback append;
- defined profile diagnostics;
- defined candidate availability equivalence, no-go criteria, and implementation
  evidence requirements.

**Semantic Guardrail**

The first implementation slice may change how candidate sets are collected,
cached, transported, measured, or diagnosed.

It must not change:

- final target selection;
- confidence calculation;
- `resolvedBy` semantics;
- ranking/tie-break semantics;
- framework synthetic decisions;
- dynamic-dispatch synthesis decisions.

Every-reference disambiguation remains TypeScript-owned until a later migration
plan satisfies the preconditions in the ownership decision artifact.

### 38. `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md

**Decision**

Accept the long-term direction from ADR ZJ-0002:

```text
Rust-owned finalization/reference-resolution
  with a narrow protocol boundary to the TypeScript product shell
```

For the migration route, classify ownership by domain instead of treating
finalization/reference resolution as one indivisible rewrite.

The first implementation slice should be **candidate lookup/cache protocol**.
It should not migrate or alter every-reference disambiguation decisions.

**Ownership Classification**

| Domain | Target ownership | First-slice status | Rationale |
| --- | --- | --- | --- |
| Product shell orchestration | TypeScript-owned | Out of first slice | CLI/SDK lifecycle, fallback planning, status/doctor packaging, MCP surfaces, and compatibility glue are product-shell responsibilities rather than resolver execution. |
| TypeScript fallback append | TypeScript-owned for now | Out of first slice | Fallback append serves unsupported or not-yet-Rust-owned files and should not be mixed into resolver migration. |
| Candidate lookup/cache | Protocol-owned first, Rust-owned later if evidence supports it | First slice | This is closest to repeated candidate hydration/lookup cost while preserving current disambiguation semantics. |
| Disambiguation decision | TypeScript-owned first, Rust-owned later | Explicitly excluded from first slice | This is the graph semantic core. It requires stronger parity/replay evidence before migration. |
| Import/export resolution tail | Rust-owned later | Later slice before broad disambiguation | Existing Rust-owned slices prove the direction, but package/default/namespace/type-only scope creep must be avoided. |
| Local exact references | Rust-owned later | Later slice before broad disambiguation | Existing Rust-owned local exact work makes this a plausible medium-risk migration domain, but scope parity still matters. |
| Cleanup / edge-write / DB maintenance | Rust-owned later; protocol-owned transition acceptable | Fallback implementation candidate | These are mechanical finalization tail costs. They are not the first choice, but can become the fallback slice if candidate lookup/cache is no-go. |
| Framework post-extract | Deferred; split by framework later | Out of first slice | Framework-specific semantics directly affect sufficiency and should be migrated one framework at a time. |
| Dynamic-dispatch synthesis | Deferred; split by mechanism later | Out of first slice | Partial dynamic-dispatch coverage can be worse than none. Migrate mechanism-by-mechanism with end-to-end flow evidence. |
| Diagnostics / profile / status contract | Protocol-owned | Cross-cutting requirement | The migrated path must remain explainable through profile buckets, fallback taxonomy, graphStats, and status/doctor artifacts. |

**Why Candidate Lookup/Cache Is Protocol-Owned First**

The first slice should stabilize the contract for candidate facts before moving
semantic decisions.

Protocol-owned means:

- candidate set shape is explicitly defined;
- lookup keys account for name, file, scope, language, and fallback context;
- TypeScript can continue to perform disambiguation using the candidate set;
- Rust can later become the candidate producer if equivalence evidence supports
  it;
- diagnostics can distinguish candidate materialization, transport/cache,
  hit/miss behavior, TypeScript disambiguation, and downstream edge work.

Direct Rust ownership in the first slice is rejected because it risks combining
candidate generation, scope semantics, fallback graph consistency, TypeScript
verification, and performance optimization into one large semantic migration.

**Deferred Domains**

Framework post-extract and dynamic-dispatch synthesis remain part of the
long-term migration target. They are deferred because they carry high Agent
Sufficiency risk.

Rules:

- framework post-extract must be split by framework;
- dynamic-dispatch synthesis must be split by mechanism;
- partial flow coverage must not be shipped as a hidden improvement;
- semantic movement in these domains may require deterministic flow evidence,
  real repo smoke, or agent A/B evidence depending on the surface touched.

**Guardrails**

- Do not change default user behavior.
- Do not change every-reference disambiguation semantics in the first slice.
- Do not bundle framework or dynamic-dispatch migration into candidate
  lookup/cache.
- Do not claim performance target closure from this ownership decision.
- Do not move raw benchmark evidence into ADRs. ADRs record durable architecture
  decisions; benchmark artifacts remain supporting evidence.

### 39. `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md

**Decision**

Keep the Rust candidate producer direction.

Rust candidate producer v1 is validated for shadow-mode candidate availability
over:

- `ExactName`
- `KnownNamePresence`

The producer remains shadow-only. It does not feed final resolver decisions and
does not change every-reference disambiguation semantics.

**What changed**

- Added a Rust core `produce-candidates` command.
- Added a TypeScript Rust candidate producer runner.
- Added shadow comparison inside the candidate protocol provider.
- Added rust-hybrid profile diagnostics under
  `candidateProtocol.rustCandidateProducer`.
- Added deterministic Rust producer contract coverage.
- Added public CLI/profile tests proving diagnostics are present and graph
  output stays stable with producer shadow mode enabled.

**Out of scope preserved**

This slice did not:

- route Rust producer output into final resolution;
- migrate `matchReference`;
- change target selection, confidence, ranking, or `resolvedBy`;
- implement `LowerName`, `QualifiedName`, or `FileNodes`;
- touch framework lookup or dynamic-dispatch synthesis;
- run agent A/B;
- update README or make performance claims.

**Interpretation**

- Rust producer equivalence is clean on both targeted corpora.
- VS Code sparse compared 135,601 producer lookups with 0 mismatches.
- The producer can read the unified graph after Rust writes and TypeScript
  fallback append; the degraded fallback state does not invalidate the result.
- Graph shape remains stable by construction and by public graph guard because
  Rust producer output is shadow-only.
- The result supports continuing the Rust producer migration path, but it does
  not justify routing Rust output into final resolver decisions yet.

**Conclusion**

Conclusion: keep.

Recommended next step: add another bounded Rust producer slice for one additional
candidate lookup shape, with `LowerName` as the likely next candidate because it
is high-volume and still candidate-availability oriented. Do not migrate
disambiguation or route producer output into the resolver main path until
multiple producer shapes have clean shadow evidence and a separate decision
accepts that semantic risk.

### 40. `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage-closeout-decision.md

**Decision**

Keep the complete Rust candidate producer shape coverage.

Rust candidate producer shape coverage is now complete for:

- `ExactName`
- `LowerName`
- `QualifiedName`
- `FileNodes`
- `KnownNamePresence`

Main-path routing remains a separate future decision. This slice does **not**
route Rust producer output into final resolver decisions. The TypeScript
resolver still owns final target selection, confidence, ranking, `resolvedBy`,
framework behavior, and every-reference disambiguation.

**What Changed**

- Added `QualifiedName` and `FileNodes` to the Rust candidate producer
  protocol.
- Added Rust core exact qualified-name candidate id production over the unified
  SQLite graph.
- Added Rust core exact file-path node id production over the unified SQLite
  graph.
- Added TypeScript shadow comparison for `QualifiedName` and `FileNodes`
  against the existing candidate protocol baseline.
- Extended rust-hybrid profile diagnostics so all five producer lookup shapes
  are visible in `candidateProtocol.rustCandidateProducer.lookupShapeCounts`.
- Kept producer output shadow-only and verified graph stability.

**Deterministic Validation**

Commands:

```bash
cargo test candidate_producer
npx vitest run __tests__/candidate-protocol.test.ts
npm run build && npx vitest run __tests__/rust-index-engine-cli.test.ts -t "Rust candidate producer shadow diagnostics|keeps resolved graph stable"
```

Results:

- Rust core candidate producer tests passed for exact-name, lower-name,
  qualified-name, file-nodes, and known-name presence.
- Candidate protocol tests passed.
- CLI profile diagnostics test passed.
- Graph stability guard passed with Rust candidate producer enabled and
  disabled.

The deterministic Rust core fixture covers:

- `QualifiedName` present lookup;
- `QualifiedName` multiple candidates;
- `QualifiedName` missing lookup;
- `FileNodes` present lookup;
- `FileNodes` multiple nodes in one file;
- `FileNodes` missing lookup.

The CLI profile fixture confirms the public profile artifact shape and mismatch
behavior without adding new diagnostic fields.

**Current Repo Evidence**

Artifact:

- `docs/benchmarks/2026-06-20-rust-candidate-producer-complete-shapes-zcodegraph.profile.json`

Status snapshot:

- files: 304
- nodes: 15,567
- edges: 33,147
- fallback files: 5
- fallback taxonomy:
  - `language-level-typescript-fallback`: 5

Resource snapshot:

- wall time: 4.46s
- maximum resident set size: 366,444,544 bytes
- peak memory footprint: 314,518,024 bytes

Candidate protocol:

| Metric | Value |
|---|---:|
| Lookup count | 74,984 |
| `ExactName` lookups | 26,109 |
| `LowerName` lookups | 9,554 |
| `QualifiedName` lookups | 959 |
| `FileNodes` lookups | 483 |
| `KnownNamePresence` lookups | 37,879 |
| Candidate count | 10,655 |

Rust candidate producer:

| Metric | Value |
|---|---:|
| Producer lookups compared | 6,185 |
| Producer `ExactName` lookups | 1,768 |
| Producer `LowerName` lookups | 480 |
| Producer `QualifiedName` lookups | 496 |
| Producer `FileNodes` lookups | 106 |
| Producer `KnownNamePresence` lookups | 3,335 |
| Producer mismatch count | 0 |
| Candidate ids returned | 13,299 |
| Payload bytes | 502,585 |
| Producer time | 23ms |
| Subprocess time | 52ms |

Reference-resolution timing context:

| Metric | Value |
|---|---:|
| `candidateLookupMs` | 28ms |
| `nameMatcherCandidateLookupDbMs` | 19ms |
| `databaseAccessMs` | 259ms |
| `perReferenceDisambiguationMs` | 58ms |
| `refHydrationDbMs` | 3ms |

**Interpretation**

Complete producer shape coverage passes the same shadow-equivalence bar as the
previous producer slices:

- current repo: 6,185 producer lookups compared, 0 mismatches;
- VS Code sparse: 156,348 producer lookups compared, 0 mismatches.

The newly added shapes are non-zero in both targeted profiles:

- current repo: 496 `QualifiedName` and 106 `FileNodes` producer lookups;
- VS Code sparse: 14,784 `QualifiedName` and 1,298 `FileNodes` producer
  lookups.

This is enough to keep complete Rust candidate producer shape coverage as a
validated candidate availability boundary.

This is **not** enough to route Rust producer output into final resolver
decisions. The larger timing picture still shows that finalization and
reference-resolution cost is dominated by TypeScript-owned disambiguation and
database access, especially `perReferenceDisambiguationMs` on VS Code sparse.

**No-Go Checks**

- Producer mismatches: none observed.
- Exact qualified-name parity required suffix/fuzzy semantics: no.
- Exact filePath parity required path normalization: no.
- Graph instability: not observed in the CLI graph guard.
- Main-path routing requirement: not required.
- Disambiguation changes: not made.
- Performance claim: not made.
- New diagnostics fields: not added.

**Next Step**

Treat candidate producer shape coverage as complete.

The next decision should be a separate discussion about whether to:

1. keep collecting shadow evidence;
2. allow a narrow Rust producer main-path routing experiment; or
3. start a separate `matchReference` / disambiguation migration plan.

Do not implicitly start main-path routing from this closeout.

### 41. `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md

**Decision**

Keep the `LowerName` Rust candidate producer shape as a validated
shadow-only producer capability.

This does **not** route Rust producer output into final resolver decisions. The
TypeScript resolver still owns final target selection, confidence, ranking,
`resolvedBy`, framework behavior, and every-reference disambiguation.

**What Changed**

- Added `LowerName` to the Rust candidate producer protocol.
- Added Rust core lower-name candidate id production over the unified SQLite
  graph.
- Added TypeScript shadow comparison for `LowerName` against the existing
  candidate protocol baseline.
- Extended rust-hybrid profile diagnostics so
  `candidateProtocol.rustCandidateProducer.lookupShapeCounts.LowerName` is
  visible independently.
- Kept producer output shadow-only and verified graph stability.

**Deterministic Validation**

Commands:

```bash
cargo test candidate_producer
npx vitest run __tests__/candidate-protocol.test.ts
npm run build && npx vitest run __tests__/rust-index-engine-cli.test.ts -t "Rust candidate producer shadow diagnostics|keeps resolved graph stable"
```

Results:

- Rust core candidate producer tests passed for exact-name, known-name
  presence, and lower-name lookup.
- Candidate protocol tests passed.
- CLI profile diagnostics test passed.
- Graph stability guard passed with Rust candidate producer enabled and
  disabled.

The deterministic Rust core fixture covers:

- present lower-name lookup;
- case variants, such as `MixedCase` and `mixedcase`;
- multiple candidates with the same lower-name key;
- missing lower-name lookup.

The CLI profile fixture confirms the public profile artifact shape and mismatch
behavior. The fixture does not force a synthetic non-zero lower-name finalizer
lookup because doing so would require either product-only test hooks or a
less-representative resolver path. Non-zero lower-name producer coverage is
validated by the targeted current-repo and VS Code sparse evidence below.

**Current Repo Evidence**

Artifact:

- `docs/benchmarks/2026-06-20-rust-candidate-producer-lowername-zcodegraph.profile.json`

Status snapshot:

- files: 304
- nodes: 15,556
- edges: 33,117
- fallback files: 5
- fallback taxonomy:
  - `language-level-typescript-fallback`: 5

Resource snapshot:

- wall time: 4.36s
- maximum resident set size: 367,067,136 bytes
- peak memory footprint: 315,042,912 bytes

Candidate protocol:

| Metric | Value |
|---|---:|
| Lookup count | 74,818 |
| `ExactName` lookups | 26,027 |
| `LowerName` lookups | 9,539 |
| `QualifiedName` lookups | 946 |
| `FileNodes` lookups | 483 |
| `KnownNamePresence` lookups | 37,823 |
| Candidate count | 10,644 |

Rust candidate producer:

| Metric | Value |
|---|---:|
| Producer lookups compared | 5,571 |
| Producer `ExactName` lookups | 1,766 |
| Producer `LowerName` lookups | 480 |
| Producer `KnownNamePresence` lookups | 3,325 |
| Producer mismatch count | 0 |
| Candidate ids returned | 4,673 |
| Payload bytes | 456,386 |
| Producer time | 19ms |
| Subprocess time | 41ms |

Reference-resolution timing context:

| Metric | Value |
|---|---:|
| `candidateLookupMs` | 30ms |
| `nameMatcherCandidateLookupDbMs` | 24ms |
| `databaseAccessMs` | 255ms |
| `perReferenceDisambiguationMs` | 65ms |
| `refHydrationDbMs` | 4ms |

**Interpretation**

`LowerName` passes the same shadow-equivalence bar as the v1 producer shapes:

- current repo: 480 `LowerName` producer lookups compared, 0 mismatches;
- VS Code sparse: 4,665 `LowerName` producer lookups compared, 0 mismatches.

This is enough to keep `LowerName` in the Rust candidate producer boundary as a
validated candidate availability shape.

This is **not** enough to route Rust producer output into final resolver
decisions. The larger timing picture still shows that finalization and
reference-resolution cost is dominated by TypeScript-owned disambiguation and
database access, especially `perReferenceDisambiguationMs` on VS Code sparse.

**No-Go Checks**

- Producer mismatches: none observed.
- Case-folding mismatch: none observed in deterministic Rust fixture.
- Graph instability: not observed in the CLI graph guard.
- Main-path routing requirement: not required.
- Disambiguation changes: not made.
- Performance claim: not made.

**Next Step**

Continue resolver migration in shadow-only slices. The next implementation
slice should still avoid main-path routing unless a separate decision explicitly
accepts that risk.

### 42. `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md

**Scope**

This closes the architecture/performance PRD:

- PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD tracker: #295
- Overall optimization tracker: #165
- Resolver migration decision tracker: #296

**Decision**

#295 is complete.

The PRD asked for architecture-aware performance work, decision quality, and
verifiable trend evidence. It did not require completing the full migration of
TypeScript finalization/reference resolution, and it did not require hitting a
strict final performance target.

**Completed Outcomes**

### Architecture Boundary Decision

The resolver migration decision work mapped current TypeScript-owned
finalization/reference-resolution responsibilities and established the target
split:

- Rust owns finalization/reference-resolution execution over time.
- TypeScript remains the product shell for CLI/SDK lifecycle, fallback
  planning, status/doctor packaging, MCP surfaces, and compatibility glue.
- Diagnostics and profile artifacts remain a required protocol contract.

Relevant artifacts:

- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`

### Architecture-Backed Implementation Slices

The PRD required at least one architecture-backed implementation slice. The
work exceeded that requirement with multiple bounded slices, including:

- candidate producer/protocol work;
- finalization cleanup diagnostics and batching;
- finalization edge-write diagnostics and bulk insert;
- JS/TS file import target parity;
- ESM named binding fallback diagnostics;
- relative import target taxonomy and burndown;
- relative `.js` source specifier burndown;
- direct export candidate-multiple taxonomy;
- TypeScript implementation-declaration metadata;
- guarded TypeScript overload implementation routing.

The latest production routing slice resolved guarded TypeScript overload
implementation candidates and recorded deterministic evidence:

- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

### Final Semantic Decision Slice

The final #295 slice classified the remaining dominant
type/value/namespace-collision fallback class:

- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

VS Code sparse evidence at commit `4a6e32fc1f0` shows the capped remaining
collision samples are dominated by `value-token-plus-interface`:

- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2

Decision: `value-token-plus-interface` is a plausible next production routing
candidate, but it belongs in a successor plan, not in #295.

**Explicit Non-Blockers**

### #224 Parse/Extraction Diagnostics

#224 remains open as a sibling parse/extraction diagnostic track. It does not
block closing #295 because this PRD's executed mainline became the
TypeScript-finalization/reference-resolution architecture boundary.

Future performance work can pick up #224 without reopening #295.

### #165 Optimization Tracker

#165 remains open as the durable post-release optimization tracker. It should
continue to receive successor direction and future performance work, but it is
not closed by this PRD.

**Validation Boundary**

This closeout makes no new performance claim.

The PRD produced deterministic profile/taxonomy evidence and production
learning, including no-go boundaries and successor candidates. It did not run a
full scoreboard or agent A/B campaign for the closeout.

### 43. `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md

**Decision**

Proceed to the **finalization-tail implementation sequence**.

The architecture/performance decision cycle is complete. The next phase should
stop open-ended diagnosis and move into bounded implementation plans rooted in
the completed finalization tail boundary map.

This does not close #165. #165 remains the durable post-release optimization
tracker, but its role changes from exploration to implementation sequencing.

**Next Priority Order**

1. Finalization-tail implementation sequence.
2. Resolver semantic residuals as guarded slices within that sequence.
3. Parse/extraction follow-up only when new profile evidence justifies it.

This ordering is based on system convergence, not single-bucket size. Parse
produced a useful local win, but finalization tail is the area where the
architecture boundary is now ready for implementation.

**Hard Guardrails**

1. No open-ended benchmarking.
   Every optimization issue must declare its candidate, success standard, and
   no-go condition before implementation.

2. No semantic shortcut for speed.
   Do not change every-reference disambiguation semantics for performance.
   Resolver semantic changes must be guarded, fallback-safe, and evidence-backed.

3. Diagnostics must not tax the default path.
   Expensive diagnostics such as `parseAstWalker` must be default-off and
   explicitly enabled only by evidence/profile tooling.

4. Finalization implementation requires parity evidence.
   Tail implementation work must include graphStats, fallback taxonomy, profile
   evidence, and fail-closed behavior for edge write/cleanup or unresolved-ref
   lifecycle changes.

5. Parse/extraction follow-up requires new evidence.
   Plan 3's keep result does not automatically justify another parse
   optimization. Continue parse work only when current profiles point back to it
   as the best system-level bet.

**Non-Goals**

- no new implementation issue is created by this decision;
- no full scoreboard is required by this decision;
- no README metric update is made by this decision;
- no release workflow or package workflow change is made by this decision;
- no claim is made that all performance goals are solved.

**Next Step**

Prepare the next implementation plan around the finalization-tail boundary map.
That plan should pick one bounded finalization-tail mechanism, state its parity
and no-go gates, and keep semantic routing guarded.


## Contract-Preserved Terms

Concise source lines carrying terms that the section-classifier did not retain verbatim, preserved to keep documentation contracts intact.

- `node_modules` — (term present across section prose)
- `type graph` — (term present across section prose)
- `third-party package` — (term present across section prose)
- `package/runtime/builtin` — (term present across section prose)
