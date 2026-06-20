# Rust-hybrid legacy environment flag config audit

Date: 2026-06-20

Related:

- #325
- `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`

## Decision

Do not migrate or remove legacy environment flags in the candidate producer
routing slice.

Use this audit to separate future config migration from flags that should remain
environment-only because they are diagnostic, test, packaging, or process
control mechanisms.

## Classification

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

## Migration Boundary

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

## Follow-Up Recommendation

Create a future technical-debt slice only when one of these becomes necessary:

1. Migrate user/experimental behavior flags into `.zcodegraph/config.json`.
2. Keep diagnostic, process-control, and packaging flags as environment
   variables.
3. Remove or fail-fast deprecated user entrypoints that conflict with the
   current product mental model.

No runtime behavior changed as part of this audit.
