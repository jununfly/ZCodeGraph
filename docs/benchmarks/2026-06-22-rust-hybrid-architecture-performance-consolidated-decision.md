# Rust-Hybrid Architecture Performance Consolidated Decision

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Parse/extraction diagnostic track: #224
- Architecture/performance PRD: #295
- Resolver semantic closeouts:
  - `docs/benchmarks/2026-06-21-ts-overload-signature-semantic-closeout-decision.md`
  - `docs/benchmarks/2026-06-21-ts-overload-implementation-tie-break-closeout-decision.md`
  - `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md`
  - `docs/benchmarks/2026-06-21-value-token-interface-routing-closeout.md`
- Finalization tail closeout:
  `docs/benchmarks/2026-06-21-finalization-tail-boundary-closeout.md`
- Parse/extraction closeout:
  `docs/benchmarks/2026-06-22-parse-walker-hot-path-closeout.md`

## Decision

Proceed to the **finalization-tail implementation sequence**.

The architecture/performance decision cycle is complete. The next phase should
stop open-ended diagnosis and move into bounded implementation plans rooted in
the completed finalization tail boundary map.

This does not close #165. #165 remains the durable post-release optimization
tracker, but its role changes from exploration to implementation sequencing.

## Consolidated Read

### Resolver Semantic

Resolver semantic work produced guarded production routes and clear residual
boundaries:

- overload implementation routing is `keep`;
- value-token/interface routing is `keep-with-caveat`;
- type/value/namespace collision evidence identified service-token-style
  routes as useful but not a full bucket burndown;
- broad disambiguation remains unsafe to migrate without per-reference parity
  and replay evidence.

Interpretation:

- continue guarded semantic slices;
- do not broaden by source-order, pick-first, or speed-motivated shortcuts;
- resolver semantic residuals should be handled inside the finalization-tail
  implementation sequence, not as an unbounded fallback-bucket chase.

### Finalization Tail

The finalization tail boundary plan is complete:

- ownership matrix exists;
- diagnostic/profile fields are mapped;
- framework post-extract boundary is documented and tested;
- edge write/cleanup is separated from target selection;
- unresolved refs lifecycle taxonomy and fail-closed cleanup contract exist.

Interpretation:

- this is the best next implementation mainline;
- future work should pick bounded mechanisms from the boundary map;
- every production migration must bring graph parity, fallback taxonomy, and
  profile evidence.

### Parse/Extraction

Parse/extraction work produced a retained local optimization:

- artifact-only `parseAstWalker` diagnostics identify hot syntax shapes;
- diagnostics are explicitly off by default;
- one bounded candidate was retained: skip JS/TS extractor checks for anonymous
  leaf syntax nodes;
- default-path evidence showed `parseAstExtractionMs` moving from `482 -> 418`
  on zcodegraph and `9465 -> 8216` on VS Code sparse.

Interpretation:

- keep the candidate;
- do not immediately chain another parse/extraction candidate by default;
- any future parse/extraction work needs fresh evidence that parse/extraction
  is again the best system-level bet.

## Next Priority Order

1. Finalization-tail implementation sequence.
2. Resolver semantic residuals as guarded slices within that sequence.
3. Parse/extraction follow-up only when new profile evidence justifies it.

This ordering is based on system convergence, not single-bucket size. Parse
produced a useful local win, but finalization tail is the area where the
architecture boundary is now ready for implementation.

## Hard Guardrails

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

## Tracker State

#165 remains open.

#165 should now be read as:

- architecture/performance decision cycle complete;
- next mainline is finalization-tail implementation sequence;
- resolver semantic residuals are guarded implementation slices;
- parse/extraction has a retained local win and is deferred until fresh
  evidence says otherwise.

#224 is complete as a parse/extraction diagnostic track. It produced the
dominant-bucket evidence, no-goed one small candidate, kept one walker candidate,
and should not remain the default place to append more parse bets.

#295 is complete for the architecture decision cycle. Implementation continues
under #165 rather than reopening broad PRD discovery.

## Non-Goals

- no new implementation issue is created by this decision;
- no full scoreboard is required by this decision;
- no README metric update is made by this decision;
- no release workflow or package workflow change is made by this decision;
- no claim is made that all performance goals are solved.

## Next Step

Prepare the next implementation plan around the finalization-tail boundary map.
That plan should pick one bounded finalization-tail mechanism, state its parity
and no-go gates, and keep semantic routing guarded.
