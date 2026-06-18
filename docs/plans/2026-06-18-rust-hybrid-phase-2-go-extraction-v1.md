# Rust-Hybrid Phase 2: Rust Go Extraction v1 and Gin Sufficiency Slice

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 1 plan: `docs/plans/2026-06-18-rust-hybrid-phase-1-engine-contract.md`
- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 tracker: [#233](https://github.com/jununfly/ZCodeGraph/issues/233)
- Post-release performance tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)

## Context

Phase 1 made `rust-hybrid` the CLI full-index default and deliberately fails fast when a repository contains ordinary `.go` files. That was correct for a skeleton phase because Go extraction did not exist yet, but it now makes Go the most visible first-user blocker.

The first-user release PRD explicitly requires Go support. The next plan should therefore implement Rust-owned Go extraction v1 before true TypeScript fallback writes, SDK default behavior, doctor bundles, README/release messaging, or performance deep optimization.

## Goal

Make ordinary Go files usable in the default `rust-hybrid` path and prove a narrow Gin route-to-handler sufficiency slice on a real repository.

After Phase 2:

1. Ordinary `.go` files enter the Rust-owned path under `rust-hybrid`.
2. Generated Go files are skipped and counted, not treated as a Go release blocker.
3. Rust extracts useful Go v1 language symbols and ownership.
4. Rust emits direct Go call edges for same-file and unambiguous same-package calls.
5. Gin direct route registrations connect to handler functions or methods.
6. A deterministic real Gin repository smoke records route-to-handler evidence.
7. Status/metadata exposes enough Go ownership and generated-skip information for later doctor bundle work.

This phase still does not claim first-user release readiness.

## Non-Goals

- Do not implement a full Go module/package import resolver.
- Do not implement full cross-package semantic resolution.
- Do not implement interface dispatch, goroutine/channel flow, or full dataflow.
- Do not implement generated Go flow coverage.
- Do not implement real TypeScript fallback writes.
- Do not implement per-file Rust parse/extraction fallback to TypeScript.
- Do not change SDK default behavior.
- Do not add SDK engine options.
- Do not implement doctor diagnostic bundles.
- Do not update README main path or release notes.
- Do not run full scoreboard or performance gate validation.
- Do not close the first-user release PRD.

## Decisions

### Go extraction comes before real fallback writes

Go is a first-user release blocker and Phase 1 now exposes that blocker by failing fast on `.go` files. Adding Go extraction first makes the default `rust-hybrid` path meaningfully more useful before introducing the more complex mixed-engine write model.

True TypeScript fallback writes remain necessary after Go, but they should be a later plan.

### Success requires a Gin sufficiency slice

Go v1 is not complete just because `.go` files parse. It must prove a narrow real-world HTTP service flow:

- route registration,
- route node,
- route to handler,
- handler to directly-called same-package helper or service where present.

This is deterministic sufficiency evidence, not a full agent A/B requirement.

### Go v1 call resolution stays intentionally narrow

Go v1 should support:

- same-file direct calls,
- unambiguous same-package direct calls,
- method receiver ownership,
- handler function or selector method targets for Gin route registration.

Go v1 should not support:

- full import resolver,
- cross-package semantic resolution,
- interface dispatch,
- goroutine/channel flow,
- helper-factory route discovery.

### Gin route coverage is direct-shape only

Cover common direct registration forms:

```go
r := gin.Default()
r.GET("/path", handler)
r.POST("/path", controller.Handle)
group := r.Group("/api")
group.GET("/users", handler)
```

Supported HTTP methods should include at least `GET`, `POST`, `PUT`, `DELETE`, and `PATCH`.

Do not try to cover the full Gin group/middleware/helper-factory surface in this phase.

### Generated Go files are skipped and counted

Generated Go files may be skipped and do not block Go v1. They must be visible in status/metadata so users and maintainers can understand coverage.

Use the existing generated-file classifier patterns, including:

- `*.pb.go`
- `*_grpc.pb.go`
- `*.pulsar.go`
- `*_mock.go`
- `*_mocks.go`
- `mock_*.go`

### Rust-hybrid planner must stop failing ordinary Go

After Go v1 lands, ordinary `.go` files should no longer trigger Phase 1 fail-fast behavior under `rust-hybrid`.

Keep existing fail-safe semantics:

- Rust process/system failure aborts safely and preserves the previous good index.
- Non-Rust-owned supported languages still fail fast until true fallback writes exist.
- Go parse/extraction gaps may be recorded, but do not require TypeScript fallback in this phase.

### SDK remains deferred

This plan does not change `CodeGraph.init({ index: true })`, `cg.indexAll()`, SDK defaults, or SDK engine options. CLI `rust-hybrid` remains the user-facing release path for this phase.

### Doctor bundle remains deferred

This plan should expose Go ownership, generated skip counts, and minimal taxonomy through metadata/status in a shape that later doctor bundle work can reuse. It should not implement the doctor bundle command.

### Performance is not a gate

Performance is not an acceptance gate for this plan. Record basic profile/status where useful, but leave deep optimization to [#165](https://github.com/jununfly/ZCodeGraph/issues/165).

## Expected Behavior

### Ordinary Go files

For a repository with ordinary `.go` files:

```bash
zcodegraph index
```

Expected Phase 2 behavior:

- resolves to `rust-hybrid`,
- assigns ordinary Go files to Rust-owned extraction,
- completes without the Phase 1 Go fail-fast error,
- writes one `.zcodegraph` graph,
- reports Go as Rust-owned in status/metadata.

### Generated Go files

For a repository with generated Go files:

- generated Go files are skipped,
- skipped generated count is reported in status/metadata,
- skipped generated Go files do not cause fail-fast,
- skipped generated Go files do not count against Go release-blocker completion.

### Gin direct route

For direct Gin route registration:

```go
func listUsers(c *gin.Context) {
  users := loadUsers()
  c.JSON(200, users)
}

func loadUsers() []User {
  return []User{}
}

func main() {
  r := gin.Default()
  r.GET("/users", listUsers)
}
```

Expected graph:

- route node for `GET /users`,
- route edge/reference to `listUsers`,
- direct call edge from `listUsers` to `loadUsers`.

## Issue Sequence

## Published Issues

- [#234](https://github.com/jununfly/ZCodeGraph/issues/234) — Rust-hybrid Phase 2.1: Add Rust Go extractor skeleton
- [#235](https://github.com/jununfly/ZCodeGraph/issues/235) — Rust-hybrid Phase 2.2: Add Go direct call edges
- [#236](https://github.com/jununfly/ZCodeGraph/issues/236) — Rust-hybrid Phase 2.3: Integrate Go into rust-hybrid planner and status
- [#237](https://github.com/jununfly/ZCodeGraph/issues/237) — Rust-hybrid Phase 2.4: Add Gin direct route-handler slice
- [#238](https://github.com/jununfly/ZCodeGraph/issues/238) — Rust-hybrid Phase 2.5: Run Gin real-repo smoke and record decision

### 1. Rust Go extractor skeleton

Add Rust-owned Go file extraction for the minimal language shape.

Acceptance:

- `.go` files can be parsed by Rust core.
- Extract package/module or package-level file context where appropriate.
- Extract functions.
- Extract methods and preserve receiver ownership.
- Extract structs and fields.
- Extract interfaces.
- Extract constants and variables.
- Extract type aliases or named type declarations.
- Emit `contains` edges.
- Add deterministic fixture tests.
- Do not wire ordinary Go into `rust-hybrid` default yet if that would hide incomplete behavior before the planner/status slice.

### 2. Go direct call edges

Add narrow Go direct call extraction.

Acceptance:

- Same-file direct calls produce `calls` edges.
- Unambiguous same-package direct calls produce `calls` edges.
- Method calls preserve receiver-owned target identity where statically obvious.
- Ambiguous cross-package or interface-like calls stay unresolved rather than guessing.
- Add fixture tests for function calls, method calls, same-package calls, and ambiguity no-go behavior.

### 3. Rust-hybrid planner/status Go integration

Make ordinary Go enter the default `rust-hybrid` path and expose minimal Go metadata.

Acceptance:

- Ordinary `.go` files no longer trigger the Phase 1 Go fail-fast guard.
- Ordinary Go is assigned to Rust-owned extraction.
- Generated Go files are skipped and counted.
- Status JSON or hybrid metadata reports Go as Rust-owned.
- Status JSON or hybrid metadata reports skipped generated Go count.
- Non-Go supported non-Rust-owned languages still fail fast until true fallback writes exist.
- TypeScript escape hatch still works.
- Tests cover ordinary Go, generated Go, and non-Go fail-fast behavior.

### 4. Gin route-handler slice

Add narrow Gin route extraction and route-to-handler linkage.

Acceptance:

- Detect `gin.Default()` and `gin.New()` direct router variables.
- Detect direct route registration for at least `GET`, `POST`, `PUT`, `DELETE`, and `PATCH`.
- Detect simple `Group` prefix composition.
- Create route nodes with method and path.
- Link route nodes to handler function identifiers.
- Link route nodes to handler selector methods where the receiver target is in the same package and unambiguous.
- Preserve handler direct call edges from the Go direct call slice.
- Do not claim middleware/helper-factory/full nested group coverage.
- Add deterministic fixture tests.

### 5. Gin real-repo smoke and decision

Run a deterministic real Gin repository smoke and record evidence.

Acceptance:

- Use at least one real Go repository, prioritizing `gin-gonic/gin`; if it is not a suitable app-flow fixture, use a small public Gin application and record why.
- Record repository URL, commit/hash, commands, and environment.
- `rust-hybrid` completes full index without ordinary Go fail-fast.
- Status/metadata shows Go Rust ownership and generated Go skip count.
- Deterministic probe shows route node existence.
- Deterministic probe shows route to handler linkage.
- Deterministic probe shows handler to same-package helper/service direct call when the fixture contains one.
- Record known gaps and no-go behavior.
- Update `docs/design/dynamic-dispatch-coverage-playbook.md` or write a linked Go/Gin evidence document.
- Write a Phase 2 decision artifact.
- Explicitly state that first-user release readiness is not claimed.

## Validation

Required:

- Rust Go extractor fixture tests.
- Go direct call fixture tests.
- Rust-hybrid planner/status Go integration tests.
- Gin route-handler fixture tests.
- `npm run build`.
- Relevant Rust core tests.
- Real Gin repository deterministic smoke.
- Evidence/decision document.

Not required:

- Full agent A/B.
- Full VS Code sparse scoreboard.
- Release-like packaged smoke.
- Doctor bundle smoke.
- SDK default tests.
- Performance target gate.

## Acceptance Criteria

- Ordinary Go files are Rust-owned under the default `rust-hybrid` CLI path.
- Generated Go files are skipped and counted.
- Go package/function/method/struct/interface/field/const/var/type declarations are extracted at v1 level.
- Method receiver ownership is preserved.
- Same-file and unambiguous same-package direct call edges are emitted.
- Direct Gin route registration creates route nodes.
- Direct Gin route handlers link to handler functions or methods.
- A real Gin repository deterministic smoke is recorded.
- Status/metadata exposes Go ownership and generated Go skip count.
- Non-Go fallback writes remain out of scope.
- SDK behavior remains unchanged.
- Doctor bundle remains out of scope.
- Performance remains observational, not a gate.
- First-user release readiness is not claimed.

## Stop Conditions

Stop and write a decision instead of expanding scope if:

- Go extraction requires a full Go semantic analyzer.
- Gin route-handler linkage requires full cross-package import resolution.
- Same-package direct calls produce unacceptable false positives.
- Generated Go skip/count cannot be exposed without a broad schema migration.
- Rust-hybrid Go integration requires real TypeScript fallback writes in the same phase.
- The work starts changing SDK default behavior.
- The work starts implementing doctor bundles.
- The work starts optimizing performance as a release gate.

## Next Plan Recommendation

After Phase 2, choose the next plan based on evidence:

- If Go/Gin sufficiency is acceptable, do real TypeScript fallback writes for mixed-language repositories.
- If Go/Gin sufficiency still fails at route-handler or handler-helper linkage, do a bounded Go/Gin coverage hardening plan.
- Keep SDK default behavior as a separate slice after CLI `rust-hybrid` is stable.
