# Resolver Semantic PlanB Final Closeout

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- QualifiedName plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- QualifiedName closeout:
  `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-closeout-decision.md`
- FileNodes audit:
  `docs/benchmarks/2026-06-22-filenodes-routing-residual-audit.md`
- Residual map:
  `docs/benchmarks/2026-06-22-resolver-semantic-residual-map.md`

## Decision

PlanB is complete.

PlanB completed the resolver semantic residual routing-shape route by:

- keeping `QualifiedName` candidate-producer on-demand routing as a guarded
  semantic residual slice;
- auditing `FileNodes` candidate-producer on-demand routing and handing it off
  to the import/file-level resolver route;
- freezing what does and does not count as a PlanB resolver semantic residual;
- classifying known residuals into final buckets.

No production code was changed in the PlanB closeout.

## Residual Definition Freeze

PlanB owns:

- candidate lookup/routing shape parity against the TypeScript baseline;
- local-config candidate-producer routing safety;
- evidence-only semantic residual decisions for already-routed shapes;
- fallback taxonomy classification when it determines whether a routing shape
  is safe to keep, no-go, or hand off.

PlanB does not own:

- package resolution;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- broad overload/namespace/type-value disambiguation;
- source-order or pick-first target selection;
- performance-only candidate lookup optimization;
- full import/file-level resolver completion.

Boundary rule:

- if a residual requires changing which target node id is selected, it is no
  longer a PlanB evidence-only routing slice and must move to an architecture
  or dedicated resolver-completion plan.

## Final Residual Classification

### Closed / Keep

| Residual | State | Evidence |
| --- | --- | --- |
| Complete local-config candidate producer routing boundary | keep | `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md` |
| `QualifiedName` candidate-producer on-demand routing | keep | `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-closeout-decision.md` |
| `LowerName` local-config routing | keep-with-caveat | Mechanism is safe behind local config; default-on was no-go due candidate lookup cost. |

### Closed / Handoff

| Residual | State | Next owner |
| --- | --- | --- |
| `FileNodes` candidate-producer on-demand routing | handoff-to-import-file-plan | Import/File-Level Resolver Completion Plan |
| unresolved file-level import targets | handoff-to-import-file-plan | Import/File-Level Resolver Completion Plan |
| supported ESM/import-export residuals | handoff-to-import-file-plan | Import/File-Level Resolver Completion Plan |

### Needs Architecture

| Residual | Reason |
| --- | --- |
| broad disambiguation migration | Requires per-reference replay/parity evidence and can change target selection. |
| source-order or pick-first tie-break behavior | Disallowed as a speed shortcut; requires explicit semantic decision if ever considered. |
| overload/namespace/type-value generalization | Can change target node selection and cannot be folded into routing-shape parity. |
| framework post-extract migration | Tied to final graph ordering and outside candidate-producer routing. |
| dynamic-dispatch synthesis migration | Requires end-to-end flow evidence because partial migration can regress agent sufficiency. |
| package resolution expansion | Excluded unless separately approved. |

### Deferred / Performance-Only

| Residual | Reason |
| --- | --- |
| candidate lookup hot-path optimization | Important for performance, but not a resolver semantic residual closeout item. |
| default-on candidate-producer routing | Prior LowerName default-on evidence no-goed default behavior; this remains outside PlanB. |

## FileNodes Result

FileNodes evidence reused the PlanB-1 targeted profile artifacts:

- current repository: `onDemandLookupShapeCounts.FileNodes = 32`;
- VS Code sparse: `onDemandLookupShapeCounts.FileNodes = 1247`;
- routing fallback reason: null;
- routing mismatch count: 0;
- graph-readable status: preserved.

Decision: `handoff-to-import-file-plan`.

Rationale:

- FileNodes routing is mechanically safe in the available evidence;
- its usage is high enough to matter;
- its semantic interpretation overlaps unresolved file-level import targets,
  relative/path-alias import target lookup, supported ESM/import-export
  residuals, and source-file fallback behavior;
- treating it as independently kept in PlanB would hide the next real boundary.

## Next Route

Next recommended route:

- **Import/File-Level Resolver Completion Plan**

Scope for that route:

- FileNodes handoff;
- unresolved file-level import target taxonomy;
- supported ESM/import-export residuals;
- relative/path-alias boundaries;
- source-file fallback interactions.

Default exclusions for that route:

- package resolution unless separately approved;
- broad disambiguation;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- performance-only candidate lookup optimization.

## Validation

Validation command:

```bash
npx vitest run __tests__/candidate-protocol.test.ts
```

Result:

- passed, 9 tests.

Additional validation:

```bash
git diff --check
```

Result:

- passed.

## Tracker Update

#165 should now read PlanB as complete.

Future work should not add more PlanB routing-shape issues by default. The next
work item should be a new Import/File-Level Resolver Completion Plan, unless a
new architecture decision changes the route.

