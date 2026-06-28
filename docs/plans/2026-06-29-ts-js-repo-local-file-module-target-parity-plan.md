# TS/JS Repo-Local File/Module Target Parity Plan

## Purpose

Turn the completed ReferenceResolver residual boundary map into a narrow implementation sequence for TypeScript/JavaScript repo-local file and module target parity on the Rust-owned indexing path.

This is an execution plan for roadmap node `1-6-6. Bounded ReferenceResolver semantic migration exploit candidate`.

## Scope

In scope:

- TS/JS repo-local import file/module target parity.
- Relative imports.
- Extensionless and index-file targets.
- `tsconfig` `paths` and `rootDirs` parity.
- Follow-up boundaries for existing package self-name, package `exports`, and package `imports` repo-local target behavior.
- Parity evidence that distinguishes Rust-owned file/module target decisions from TypeScript finalization fallback.

Out of scope:

- Binding-level symbol disambiguation.
- Overload, value/type token, receiver/method, or framework semantic ownership.
- Candidate lookup/cache protocol promotion beyond candidate-set-only behavior.
- Go module path resolution.
- Rust module path resolution.
- Python import semantics.
- Cross-language resolver semantics.
- Dynamic-dispatch synthesis.
- Framework `postExtract()` migration.
- Cleanup or DB maintenance migration.

## Guardrails

- Preserve current default user behavior unless the issue explicitly scopes a guarded change.
- Keep candidate lookup/cache protocol boundaries candidate-set-only unless a separate plan promotes them.
- Treat `1-5-4-3-1` as prior evidence, not proof of complete ReferenceResolver ownership.
- Require parity/oracle evidence for resolver decisions before claiming Rust ownership.
- Do not claim full Rust ownership of ReferenceResolver semantics.
- Do not add benchmark requirements unless a later issue explicitly asks for performance evidence.

## Issue Split

### Issue 1: Parity Inventory And Fixture Taxonomy

Goal: identify the exact TS/JS repo-local file/module target shapes already covered by Rust and the smallest missing shape worth implementing next.

Acceptance criteria:

- Inventory relative, extensionless, index-file, `paths`, `rootDirs`, package self-name, package `exports`, and package `imports` repo-local target shapes.
- Classify each shape as `rust-owned`, `typescript-owned`, `candidate-set-only`, `known-unsupported`, or `needs-oracle`.
- Add or update contract fixtures/tests only where needed to make the chosen next shape unambiguous.
- Record why the chosen shape is bounded enough for Issue 2.

Blocked by: none.

### Issue 2: One Bounded Rust-Owned Target Shape Exploit

Goal: implement exactly one high-confidence TS/JS repo-local file/module target shape on the Rust-owned path.

Acceptance criteria:

- Implement one shape selected by Issue 1.
- Keep the behavior narrow to repo-local file/module target resolution.
- Do not implement binding-level symbol disambiguation.
- Preserve existing TypeScript fallback behavior for unsupported or ambiguous forms.
- Add focused tests proving graph parity for the selected shape.

Blocked by: Issue 1.

### Issue 3: Guardrail And Closeout

Goal: prove the bounded slice is safe to count as Rust-owned file/module target progress without overclaiming ReferenceResolver ownership.

Acceptance criteria:

- Add closeout evidence that names the selected Rust-owned shape and remaining TypeScript-owned shapes.
- Ensure status/doctor/profile wording does not imply full ReferenceResolver migration.
- Verify roadmap and contract tests reflect the completed slice.
- Decide whether the next follow-up belongs under `1-6-6` or a different roadmap node.

Blocked by: Issue 2.

## Closeout

Issues:

- #656 Inventory TS/JS repo-local file-module target parity.
- #657 Implement one bounded TS/JS repo-local target shape in Rust.
- #658 Close out TS/JS repo-local target parity guardrails.

Inventory result:

| Shape | Classification | Evidence |
| --- | --- | --- |
| Relative repo-local file imports | `rust-owned` | Rust finalization writes file-level `imports` edges for relative imports. |
| Extensionless and index-file targets | `rust-owned` | Covered as part of relative and package self-name file target lookup. |
| `tsconfig` `paths` file targets | `rust-owned` | Rust finalization writes file-level `imports` edges for path alias targets. |
| `tsconfig` `rootDirs` file targets | `rust-owned` | This slice promoted public diagnostics to match the existing Rust core edge-write behavior. |
| Package self-name repo-local file targets | `partial` | Repo-local file targets are supported; unsupported/ambiguous package map forms remain fail-closed. |
| Package `imports` repo-local file targets | `partial` | Direct, pattern, and condition file targets are supported; unsafe/unsupported forms remain fail-closed. |
| Package `exports` repo-local file targets | `needs-oracle` | Existing bounded behavior covers some declaration/runtime target relationships, but full package exports parity still needs oracle-backed semantics. |

Implemented bounded shape:

- `tsconfig` `rootDirs` file targets are now reported as Rust-owned in the public `moduleEdgeWrite` diagnostics.
- The implementation does not change rootDirs resolver semantics; it aligns the TypeScript-facing profile/status contract with the already-present Rust core behavior.
- Focused CLI coverage proves a rootDirs import writes a Rust finalization file-level `imports` edge and reports `rootDirs-file-target` as `rust-owned`.

Remaining guardrails:

- This closeout does not claim full ReferenceResolver migration.
- Binding-level symbol disambiguation remains out of scope.
- Package `exports` exactness remains `needs-oracle` before any broader Rust-owned claim.
- TypeScript fallback remains required for unsupported or ambiguous resolver forms.
- Follow-up work should stay under `1-6-6` only when it is another bounded TS/JS repo-local file/module target slice; framework, dynamic-dispatch, cleanup, DB maintenance, Go, Rust, Python, or cross-language semantics belong to separate roadmap nodes.
