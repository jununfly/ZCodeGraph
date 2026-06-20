# Rust Hybrid Complete Candidate Producer Routing Boundary Closeout

Date: 2026-06-20

## Decision

The complete local-config Rust candidate producer routing boundary is semantically keepable.

This does not make routing a default user behavior. It remains gated by the experimental local config:

```json
{ "experimental": { "rustCandidateProducerRouting": true } }
```

The closeout criterion is semantic safety and diagnostic visibility, not an end-to-end performance win.

## Scope Verified

- Routed lookup shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- On-demand single-key node lookups: `LowerName`, `QualifiedName`, `FileNodes`.
- TypeScript baseline comparison remains active for routed node results.
- Fail-closed paths are covered for candidate mismatch, missing result, hydration miss, producer failure, and invalid local config.
- No resolver ranking, confidence, `resolvedBy`, framework behavior, dynamic-dispatch synthesis, or SQLite schema change was introduced.

## Evidence

### Deterministic Tests

- `npx vitest run __tests__/candidate-protocol.test.ts`
  - 9 tests passed.
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolved graph stable when Rust candidate producer routing"`
  - Graph stability passed with local-config routing enabled, disabled, and invalid.
- `cargo test candidate_producer`
  - 3 Rust producer tests passed.
- `npm run build`
  - TypeScript build passed.

### Current Repo Profile

Artifact:

- `docs/benchmarks/2026-06-20-complete-routing-boundary-current.profile.json`

Command used Node 24.14.0 from the Codex runtime to avoid the host Node 26 unsupported-version gate:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-complete-routing-boundary-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 530.50s.
- RSS: unavailable. `/usr/bin/time -l` returned `time: sysctl kern.clockrate: Operation not permitted` in the sandbox before reporting max RSS.
- Routing configured: true.
- Routing active: true.
- Active shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- Routing fallback reason: null.
- Routing mismatch count: 0.
- Candidate protocol lookup count: 75,756.
- Candidate protocol DB lookup count: 1,015.
- On-demand routed lookup count: 656.
- On-demand routed lookup shape counts:
  - `LowerName`: 304
  - `QualifiedName`: 320
  - `FileNodes`: 32
- Fallback taxonomy total: 1,582.
- Largest reference-resolution taxonomy entries:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1,520
  - `unsupported-import-form-not-yet-rust-owned`: 44
  - `unresolved-file-level-import-target`: 14

### VS Code Sparse Profile

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Verified as a Git checkout containing `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`.

Artifact:

- `docs/benchmarks/2026-06-20-complete-routing-boundary-vscode-sparse.profile.json`

Command:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-complete-routing-boundary-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 637.72s.
- RSS: unavailable. `/usr/bin/time -l` returned `time: sysctl kern.clockrate: Operation not permitted` in the sandbox before reporting max RSS.
- Routing configured: true.
- Routing active: true.
- Active shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- Routing fallback reason: null.
- Routing mismatch count: 0.
- Candidate protocol lookup count: 1,609,764.
- Candidate protocol DB lookup count: 28,206.
- On-demand routed lookup count: 1,693.
- On-demand routed lookup shape counts:
  - `QualifiedName`: 445
  - `FileNodes`: 1,248
- Fallback taxonomy total: 170,387.
- Largest reference-resolution taxonomy entries:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919
  - `unresolved-file-level-import-target`: 64,429
  - `unsupported-import-form-not-yet-rust-owned`: 35

## Interpretation

The complete routing boundary is safe to keep behind local config because it stays active on both a current-repo run and a large VS Code JS/TS sparse checkout, exposes all five shapes in diagnostics, and records no routing fallback or mismatch.

The performance profile is not a greenlight for default enablement. The VS Code sparse profile still shows `candidateLookupMs` and TypeScript finalization/reference-resolution as the dominant cost centers. Those are inputs for the resolver migration and architecture/performance PRD, not blockers for this local-config boundary.

## Follow-up Inputs

- Continue treating TypeScript finalization/reference-resolution as the architectural bottleneck for default-path performance.
- Use the fallback taxonomy to prioritize remaining Rust ownership:
  - binding-level symbol disambiguation;
  - unresolved file-level import targets;
  - unsupported import forms.
- Re-run RSS capture outside this sandbox if memory evidence becomes a release gate.
