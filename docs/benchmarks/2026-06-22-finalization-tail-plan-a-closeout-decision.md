# Finalization Tail Plan A Closeout Decision

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-22-rust-hybrid-finalization-tail-implementation-sequence.md`
- Issues: #416, #417, #418, #419
- Candidate selection:
  `docs/benchmarks/2026-06-22-finalization-tail-plan-a-candidate-selection.md`
- Evidence:
  `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-evidence.md`

## Candidate

Plan A implemented **intentionally-unresolved cleanup rowid-range mechanics**.

The batched finalization cleanup path now uses the existing rowid-range helper
for both resolved refs and intentionally-unresolved refs.

## Decision

Decision: `keep`.

Keep the change because it is a narrow finalization-tail mechanics improvement:

- no semantic target selection behavior changes;
- no schema changes;
- no framework post-extract or dynamic-dispatch migration;
- deterministic cleanup coverage confirms terminal cleanup behavior and helper
  selection;
- targeted current-repo and VS Code sparse evidence preserve fallback taxonomy
  visibility and graph-readable indexes.

The performance conclusion is deliberately modest. The candidate does not prove
a large standalone speedup. Its value is consistency and cleanup-boundary
simplification, with a safe mechanics improvement in a visible tail sub-bucket.

## Validation

Commands:

```bash
npx vitest run __tests__/resolution.test.ts -t "batched persistence cleans resolved"
npx vitest run __tests__/db-perf.test.ts __tests__/access-models.test.ts
npm run build
```

Targeted profile artifacts:

- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-current.profile.json`
- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-vscode-sparse.profile.json`

Graph-readable status:

- current repository: `313` files, `16054` nodes, `34636` edges;
- VS Code sparse: `5780` files, `327425` nodes, `905484` edges.

RSS:

- current repository RSS unavailable because `/usr/bin/time -l` could not read
  `sysctl kern.clockrate` in the sandbox;
- VS Code sparse RSS unavailable because the targeted CLI profile did not
  enable a process-tree RSS sampler.

## Gate Review

| Gate | Result |
| --- | --- |
| Exactly one mechanics candidate | Passed |
| Semantic target selection unchanged | Passed |
| SQLite schema unchanged | Passed |
| Deterministic parity test | Passed |
| Current repo targeted profile | Passed |
| VS Code sparse targeted profile | Passed |
| Fallback taxonomy recorded | Passed |
| RSS or unavailable reason recorded | Passed |

## Next Route

Proceed to **Plan B: Resolver Semantic Residuals**.

Do not run another Plan A mechanics candidate by default. Plan A produced a
kept cleanup-boundary simplification, but evidence still shows the dominant
remaining work is resolver semantic/finalization behavior, not another isolated
cleanup mechanics tweak.

Plan B should stay within the existing guardrails:

- guarded semantic slices only;
- no broad disambiguation migration;
- no source-order or pick-first shortcut;
- graph parity and fallback taxonomy evidence for production changes.

