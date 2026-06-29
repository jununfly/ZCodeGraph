# Rust Indexing TypeScript Replacement Readiness Consolidated Plan

Date: 2026-06-24

## Purpose

This document is the single canonical record for the completed roadmap cycle
that evaluated whether Rust indexing can replace TypeScript indexing, then
re-scoped the work into a practical fallback-surface reduction path.

It consolidates the previous roadmap, implementation plans, closeout decisions,
and short-lived evidence artifacts from this cycle. Those intermediate files
were intentionally removed after consolidation so future agents have one place
to read before continuing.

## Final Decision

Rust indexing cannot fully replace TypeScript indexing yet.

The accepted product direction is:

- keep `rust-hybrid` as the default primary indexing path;
- make Rust own the languages it can index credibly;
- remove same-language TypeScript fallback for Rust-owned languages;
- keep TypeScript fallback only for non-Rust-owned product languages and the
  explicit `zcodegraph index --engine typescript` escape hatch;
- treat Rust-owned parse/extraction gaps as degraded diagnostics, not silent
  TypeScript recovery;
- keep reducing fallback surface with bounded language and semantic slices.

## Final Roadmap State

- [x] `1. Rust indexing TypeScript replacement readiness`
- [x] `1-1. Rust-owned language coverage boundary`
- [x] `1-2. Rust-owned semantic coverage boundary`
- [x] `1-3. Rust-hybrid fallback product contract`
- [x] `1-4. Replacement readiness decision`
- [x] `1-5. Reduce TypeScript fallback surface by migrating Rust-owned languages`
- [x] `1-5-1. Rust-owned Python indexing v1`
- [x] `1-5-2. Eliminate TypeScript indexing dependency for current Rust-owned languages`
- [x] `1-5-3. Audit Rust-owned gap diagnostics after same-language fallback removal`
- [x] `1-5-4. Make non-Rust-owned fallback append robust for sparse checkouts`

## Rust-Owned Language Boundary

After this cycle, the default `rust-hybrid` Rust-owned language set includes:

- JavaScript: `.js`
- JSX: `.jsx`
- TypeScript: `.ts`
- TSX: `.tsx`
- MTS: `.mts`
- CTS: `.cts`
- Go: `.go`
- Python baseline: `.py`, `.pyw`

This is a default ownership boundary, not a claim of complete semantic parity
with the old TypeScript indexing implementation.

## Completed Slices

### 1. Replacement Readiness Decision

Decision: `rust-hybrid-default-not-full-replacement`.

Rust indexing can be the default primary path, but not a complete replacement
for TypeScript indexing. Complete replacement would require Rust-owned coverage
for the full product language matrix, clear treatment of remaining JS/TS
semantic frontiers, and release evidence showing no sufficiency regression
without TypeScript fallback.

### 2. Same-Language TypeScript Fallback Removal

Issues: #475, #476, #477, #478.

Decision: `rust-owned-same-language-typescript-fallback-disabled`.

Rust-owned JS/JSX/TS/TSX/MTS/CTS/Go parse or extraction gaps no longer append
the same file through the TypeScript indexer under `rust-hybrid`.

Observed contract:

- Rust-owned gaps record `fallbackState: degraded`;
- `fallbackReasonTaxonomy` records the Rust-owned gap code;
- `fallbackByLanguage` does not count the Rust-owned language as TypeScript
  fallback append;
- `fallbackFileCount` counts only actual TypeScript fallback append files;
- non-Rust-owned product languages continue to use TypeScript fallback append.

Verification passed:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/sdk-rust-hybrid.test.ts
```

### 3. Rust-Owned Gap Diagnostics Audit

Issues: #479, #480, #481.

Decision: `no-rust-owned-gap-burndown-now`.

Current repository evidence:

- rust-hybrid completed;
- status file count: `315`;
- node count: `16,313`;
- edge count: `35,744`;
- Rust-owned files observed: JavaScript `4`, TypeScript `305`;
- fallback append was limited to non-Rust-owned files: YAML `3`, Rust `2`;
- Rust-owned parse gaps: `0`;
- Rust-owned extraction gaps: `0`;
- Rust-owned partial-write blocked diagnostics: `0`.

VS Code sparse audit before robustness fix:

- existing corpus: `/private/tmp/codegraph-corpus/vscode-sparse`;
- Rust core produced graph data for `5,780` files;
- rust-hybrid exited with code `1` before final hybrid metadata was stamped;
- failure came from missing non-Rust-owned fallback files in the sparse
  checkout, not from Rust-owned JS/TS/Go gaps;
- missing sparse fallback files observed: `285`.

Conclusion: there was no actionable JS/TS/Go Rust-owned gap burndown candidate.
The next required slice was sparse-checkout robustness for non-Rust-owned
fallback append.

### 4. Sparse Missing Fallback Robustness

Issues: #482, #483, #484.

Decision: `language-level-fallback-missing-file-is-degraded-not-fatal`.

When `rust-hybrid` plans language-level TypeScript fallback for a non-Rust-owned
supported file, but that file is missing at append time, the run now continues
as successful but degraded.

Diagnostic taxonomy:

```text
language-level-fallback-missing-file
```

Narrow diagnostic fields:

- `missingFallbackFileCount`
- `missingFallbackByLanguage`

Current repo after fix:

- exit code: `0`;
- success: `true`;
- files indexed: `314`;
- fallback files planned: `5`;
- missing fallback files: `0`;
- taxonomy: `language-level-typescript-fallback: 5`.

VS Code sparse after fix:

- exit code: `0`;
- success: `true`;
- files indexed: `5,780`;
- fallback files planned: `286`;
- missing fallback files: `286`;
- taxonomy:
  - `language-level-typescript-fallback: 286`;
  - `language-level-fallback-missing-file: 286`;
  - `rust-owned-parse-gap: 4`;
- missing fallback distribution:
  - Rust `81`;
  - Python `73`;
  - YAML `37`;
  - XML `35`;
  - C++ `22`;
  - C# `16`;
  - Java `7`;
  - Ruby `5`;
  - PHP `3`;
  - Objective-C `2`;
  - C `1`;
  - Razor `1`;
  - Dart `1`;
  - Lua `1`;
  - Swift `1`.

Verification passed:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts
npx vitest run __tests__/sdk-rust-hybrid.test.ts
git diff --check
```

### 5. Rust-Owned Python Extraction Baseline v1

Issues: #485, #486, #487.

Decision: `python-rust-owned-extraction-baseline-v1`.

Python entered the Rust-owned language set for the default `rust-hybrid` path
with a bounded extraction baseline.

Covered in Rust core:

- `.py` and `.pyw` source discovery;
- Python parser integration;
- file/module graph presence;
- function extraction;
- class extraction;
- method extraction;
- import extraction for basic file-level dependency visibility.

Explicitly not covered in this slice:

- decorators;
- variables/constants;
- class fields/properties;
- dataclass/Pydantic field modeling;
- Django, Flask, or FastAPI route sufficiency;
- broader Python resolver/framework parity;
- agent A/B validation.

Verification passed:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/sdk-rust-hybrid.test.ts
npx vitest run __tests__/rust-index-engine-cli.test.ts
git diff --check
```

Django real-repo smoke status:

- planned corpus: `/private/tmp/codegraph-corpus/django`;
- result: `needs-human-setup`;
- reason: the path exists but is not a usable Git checkout and contains no
  Python source files under the inspected depth;
- no replacement corpus was cloned or fabricated by the agent.

## Remaining Gaps

These are not blockers for the completed roadmap cycle, but they should shape
the next roadmap.

1. Python framework/resolver parity is not done.
2. Python real-corpus evidence still needs a valid Django or approved Python
   repository checkout.
3. Rust-owned Python is a baseline extraction claim only, not a sufficiency
   claim for Django/FastAPI/Flask.
4. TypeScript fallback still exists for non-Rust-owned product languages.
5. Some VS Code sparse fallback files are deliberately counted as degraded
   missing fallback coverage instead of fatal errors.
6. Complete TypeScript indexing removal still requires broader language
   migration and semantic parity decisions.

## Recommended Next Candidates

Use this order unless a product release need interrupts it.

1. Taxonomy cleanup: review the remaining `rust-owned-parse-gap: 4` observed in
   VS Code sparse after the sparse robustness fix and classify whether they are
   generated, malformed, parser gaps, or diagnostic-only.
2. Python real-corpus validation: provide a valid Django checkout or choose a
   different approved Python repo, then rerun deterministic rust-hybrid smoke.
3. Python sufficiency roadmap: decide whether to pursue framework route slices
   for Django/FastAPI/Flask or keep Python as baseline extraction only for now.
4. Broader fallback-surface reduction: choose the next product-supported
   language to migrate into Rust-owned indexing only if a bounded extraction
   baseline and diagnostic story are credible.

## 2026-06-27 Debt-To-Migration Roadmap Closeout

This addendum consolidates the completed debt-governance-to-Rust-migration
roadmap cycle that ran after the original replacement-readiness decision.

Final roadmap state:

- all roadmap nodes completed: `91 completed / 0 pending / 0 in_progress`;
- debt governance, CI/release trust guardrails, documentation lifecycle rules,
  and Rust migration-readiness boundaries were completed;
- the `1-5. TypeScript indexing to Rust indexing replacement mainline` branch
  is closed as a boundary map, not as a claim that TypeScript indexing can now
  be fully removed;
- the `1-6. Next exploit slice candidate backlog` branch completed the bounded
  exploit slices listed below;
- the `1-7. Explore frontiers not ready for immediate implementation` branch
  was explicitly classified so future agents do not treat deferred product
  frontiers as immediate migration debt.

### Completed Debt And Migration Slices

1. Rust core test and helper decomposition made large Rust-indexing test
   surfaces easier to navigate without changing behavior.
2. Cross-platform CI and release guardrails were tightened around the packaged
   Rust path, release workflow, credentials, SQLite file-lock risks, Node
   version policy, and package-manager behavior.
3. Documentation and evidence lifecycle rules were clarified: durable
   baseline/result/decision artifacts stay in `docs/benchmarks/`; temporary
   evidence stays with issues or plans and should be deleted or consolidated.
4. Rust-owned coverage and remaining TypeScript indexer responsibilities were
   mapped across extraction, finalization/reference-resolution,
   framework/dynamic-dispatch behavior, diagnostics, fallback, and test
   evidence.
5. The Rust core parser gap in the large ZCodeGraph Rust `lib.rs` fixture was
   fixed by avoiding the `raw` identifier shape that triggers a
   tree-sitter-rust parse error.
6. Non-Rust-owned language fallback was classified as an intentional boundary
   guardrail, not a burn-down target.
7. MCP Explore sufficiency guardrail triggers were mapped so future
   graph-semantic or MCP-visible behavior changes know when Agent Sufficiency
   evidence is required.

### Completed 2026-06-29 Bounded Exploit Slices

Issues #656, #657, and #658 completed the TS/JS repo-local file/module target
parity slice:

- relative repo-local file imports, extensionless/index-file targets,
  `tsconfig` `paths`, and `tsconfig` `rootDirs` file targets are Rust-owned for
  the bounded file/module target surface;
- package self-name and package `imports` repo-local file targets remain
  partial and fail closed for unsupported or ambiguous package map forms;
- package `exports` repo-local file targets remain `needs-oracle` before any
  broader Rust-owned claim;
- the only production-facing change was narrow diagnostics parity for
  `rootDirs` file targets; this does not claim full ReferenceResolver
  migration.

Issues #659, #660, and #661 completed the first framework `postExtract`
migration slice:

- Rust core emits typed framework post-extract update candidates through the
  Rust profile;
- the TypeScript product shell validates and applies those candidates through
  the existing node-update path;
- the only default-path allowlisted provider shape is NestJS `RouterModule`
  route-name prefix rewriting (`provider=nestjs`,
  `updateKind=route-name-prefix`, `nodeKind=route`, `field=name`);
- route node `id`, `qualifiedName`, `kind`, and `filePath` must remain stable;
- parse-time framework extraction, per-reference framework
  `resolve()`/`claimsReference()`, dynamic-dispatch synthesis, direct Rust DB
  writes, and DB maintenance remain out of scope.

Issue #662 added a cross-platform `rust-hybrid` CI smoke:

- `scripts/rust-hybrid-ci-smoke.mjs` creates a tiny deterministic TypeScript
  fixture and runs the built CLI through `init`, `index --engine rust-hybrid`,
  `status --json`, and `doctor --engine rust-hybrid --bundle --last-run`;
- the existing cross-platform `rust-packaged-path` CI matrix calls the smoke
  after TypeScript/Rust builds;
- the smoke is a path-health guardrail only, not graph parity, semantic parity,
  release-package qualification, or full migration completeness.

Issue #663 completed the cleanup protocol handoff:

- Rust core emits a `cleanupProtocol` declaration in the index profile;
- TypeScript finalization validates the declaration before reporting
  `cleanupOwnership.owner=rust-core-protocol` and
  `mode=rust-declared-typescript-executed`;
- missing or invalid declarations fail closed to the TypeScript finalization
  contract with visible fallback reasons;
- TypeScript still executes resolved and intentionally unresolved rowid-range
  cleanup, retained `unresolved_refs` backlog semantics are unchanged, and
  SQLite maintenance remains out of scope.

Issue #664 added the dynamic-dispatch heuristic edge protocol seed:

- finalization diagnostics now expose protocol fields, supported seed families,
  callback/EventEmitter metadata whitelists, TypeScript-owned graph parity
  counts/samples, and Agent Sufficiency guardrail status;
- Rust heuristic edge writes are not enabled.

Issue #665 added the first EventEmitter shadow producer:

- Rust core emits EventEmitter named-handler shadow candidates in the index
  profile;
- TypeScript finalization compares those candidates against the existing
  TypeScript heuristic EventEmitter graph under
  `dynamicDispatchHeuristicEdgeProtocol.graphParity.eventEmitterShadow`;
- candidates remain shadow-only and are not consumed for graph writes;
- Agent Sufficiency A/B remains a later gate before any production routing.

Issue #666 burned down one high-confidence resolver residual:

- direct named import binding residuals are covered for the bounded
  single-target case through existing Rust ESM named finalization semantics;
- positive fixtures prove guarded `rust-finalization` `imports` edge creation
  and final fallback taxonomy removal;
- ambiguous duplicate-candidate fixtures remain fail-closed with
  `direct-export-candidate-multiple` and a visible binding residual;
- the edge source remains the existing unresolved-reference owner node, which
  is currently the source file node for JS/TS extraction.

### Closed Boundaries And Future Entry Conditions

Full TypeScript indexer removal is classified as `needs-PRD/oracle`.
It is not a narrow debt slice. Future work must first define user-visible
behavior, explicit TypeScript-engine escape-hatch policy, non-Rust-owned
fallback commitments, language ownership boundaries, status/doctor wording,
and Agent Sufficiency success criteria.

Third-party package and `node_modules` graph expansion is classified as
`defer/no-go`. It is not a Rust migration blocker. Future work requires an
explicit product switch or dedicated PRD covering package-manager semantics,
depth limits, ignore rules, privacy expectations, benchmark guardrails, and
diagnostics.

Compiler/oracle integration is classified as `needs-PRD/oracle`. It remains a
future semantic-exactness research entry, not a blocker for repo-local Rust
ownership work. Any future slice must define oracle source, setup model, cache
invalidation, timeout/failure taxonomy, privacy/security expectations, and
fallback behavior.

Additional language support is classified as `future-explicit-slice`. New
language work should be planned per language or language family with its own
PRD/branch/slice, not mixed into the TS-to-Rust migration closeout.

Performance optimization after architecture cleanup is classified as
`future-explicit-slice`. A future performance roadmap must define baseline
standards, result artifact format, decision artifact policy, RSS or
unavailable-reason requirements, graph parity guardrails, and Agent
Sufficiency triggers for MCP-visible behavior changes.

## Consolidated And Removed Intermediate Files

The following intermediate documents and artifacts were folded into this plan
and deleted:

- `docs/plans/2026-06-23-rust-indexing-ts-replacement-readiness-roadmap.json`
- `docs/plans/2026-06-23-rust-indexing-ts-replacement-readiness-roadmap.md`
- `docs/plans/2026-06-23-remove-same-language-typescript-fallback-for-rust-owned-languages.md`
- `docs/plans/2026-06-24-rust-owned-gap-diagnostics-audit-after-ts-fallback-removal.md`
- sparse-missing fallback robustness plan, now represented by
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- `docs/plans/2026-06-24-rust-owned-python-extraction-baseline-v1.md`
- `docs/plans/2026-06-29-ts-js-repo-local-file-module-target-parity-plan.md`
- `docs/plans/2026-06-29-rust-side-framework-post-extract-protocol-plan.md`
- `docs/plans/2026-06-29-rust-hybrid-cross-platform-ci-smoke-plan.md`
- `docs/plans/2026-06-29-rust-cleanup-protocol-handoff-plan.md`
- `docs/plans/2026-06-29-rust-dynamic-dispatch-heuristic-edge-protocol-seed-plan.md`
- `docs/plans/2026-06-29-rust-event-emitter-shadow-producer-plan.md`
- `docs/plans/2026-06-29-rust-direct-named-import-binding-residual-burndown-plan.md`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-current.md`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-current.profile.json`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-current.status.json`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-vscode-sparse.md`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-vscode-sparse.errors.txt`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-vscode-sparse.last-failure.json`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-vscode-sparse.status.json`
- `docs/benchmarks/2026-06-24-rust-owned-gap-audit-closeout.md`
- `docs/benchmarks/2026-06-24-sparse-missing-fallback-current.last-run.json`
- `docs/benchmarks/2026-06-24-sparse-missing-fallback-vscode-sparse.last-run.json`
- `docs/benchmarks/2026-06-24-sparse-missing-fallback-closeout.md`
- `docs/benchmarks/2026-06-24-rust-owned-python-baseline-closeout.md`
