# Rust Module Visibility Residual Taxonomy Decision

Date: 2026-06-27

Roadmap node: `1-5-1. Module path visibility and privacy residuals`

## Context

After the first six Rust language indexing slices, the Rust core owns `.rs`
files and now covers baseline extraction, repo-local module path resolution,
bounded trait/impl relationships, macro taxonomy, Cargo workspace/package
taxonomy, and a bounded Axum route wiring slice.

The previous taxonomy nodes under `1-1-3` are now considered covered by bounded
implementation slices, not by complete Rust semantic support. This artifact
reopens the global map at the module visibility/privacy boundary and selects a
safe next implementation candidate.

## Current Code Facts

Lightweight audit scope:

- Rust module reference resolution in `crates/zcodegraph-core/src/lib.rs`.
- Rust scoped symbol finalization in `crates/zcodegraph-core/src/lib.rs`.
- Node visibility persistence in the Rust core write path.

Observed facts:

- `rust_resolve_module_reference()` resolves module file targets for `crate`,
  `self`, `super`, and sibling-style paths by checking `<module>.rs` and
  `<module>/mod.rs`.
- `resolve_rust_module_file_imports()` writes file-level import edges after a
  module file target is found.
- `resolve_rust_scoped_symbol_refs()` resolves scoped symbol references by:
  finding the target module file, extracting the post-module symbol name, then
  requiring a unique same-file symbol candidate.
- `find_unique_rust_symbol_in_file()` filters by file, symbol name, and broad
  kind set, but does not check Rust visibility/privacy.
- The SQLite schema has a `nodes.visibility` column, but `insert_nodes()` writes
  `NULL` for Rust core nodes today.
- Rust symbol extraction does not currently persist `pub`, `pub(crate)`,
  `pub(super)`, `pub(in path)`, or private visibility metadata.

## Residual Taxonomy

### Missing-edge residuals

Cases where a valid Rust relationship may be absent because the current bounded
resolver does not model a path shape or re-export shape.

Examples:

- `pub use` re-export chains that should make a symbol reachable through a
  different module path.
- More complex module layouts or generated module declarations not represented
  by direct `.rs` / `mod.rs` lookup.
- Visibility-qualified paths that are actually accessible but not modeled.

Readiness: split-to-exploit later, after guard behavior exists. Expanding
missing edges before visibility guard raises wrong-edge risk.

### Wrong-edge risk residuals

Cases where the current resolver may write an edge to a unique same-file symbol
even if Rust privacy rules should make that target inaccessible from the source
module.

Examples:

- `crate::some_mod::private_fn()` resolving to a private function in another
  module.
- Cross-module references to private structs, traits, constants, or type aliases.
- Route or framework edges that become more confident after unique candidate
  lookup but do not verify visibility.

Readiness: best next bounded exploit candidate. It can start by extracting and
persisting visibility metadata, then using a conservative guard before writing
scoped symbol edges.

### Ambiguity residuals

Cases where multiple candidate symbols exist and visibility could eventually
reduce candidate sets, but the current implementation already fails closed by
requiring uniqueness.

Examples:

- Multiple same-name symbols across modules where visibility could identify the
  accessible one.
- Method/function name collisions where the module path narrows file target but
  not enough semantic context is available.

Readiness: not first. Since ambiguity currently fails closed, it is less risky
than wrong-edge writes.

### No-go and oracle-needed residuals

Cases that likely need rustc, Cargo metadata, macro expansion, or a richer
semantic oracle.

Examples:

- Macro-generated modules or items.
- Full conditional compilation semantics across features, targets, and cfg
  expressions.
- Precise crate graph resolution across external packages.
- Complex visibility involving `pub(in path)` when path normalization depends on
  full compiler semantics.

Readiness: keep as taxonomy/oracle-needed. Do not make this part of the next
bounded implementation slice.

## Recommendation

Next bounded implementation candidate:

**Rust module visibility wrong-edge guard for private/out-of-scope symbols.**

Suggested scope:

- Extract and persist coarse Rust visibility metadata for named symbols:
  `private`, `pub`, `pub(crate)`, `pub(super)`, and `pub(in ...)`.
- Apply a conservative guard in Rust scoped symbol finalization before writing
  cross-module symbol edges.
- Start narrow:
  - same-crate only;
  - repo-local module files only;
  - guard `function`, `method`, `struct`, `enum`, `trait`, `type_alias`,
    `constant`, and `variable` candidates;
  - fail closed for unknown or unsupported visibility.
- Record taxonomy for skipped writes:
  - `visibility-private-cross-module-skipped`;
  - `visibility-pub-crate-allowed`;
  - `visibility-pub-super-supported`;
  - `visibility-pub-in-deferred`;
  - `visibility-unknown-deferred`.

Why this before missing-edge expansion:

- The previous six slices mostly increased graph coverage.
- More coverage raises the cost of wrong edges.
- A visibility guard makes later `pub use`, re-export, and framework expansion
  safer because added edges can pass through a correctness gate.

## Non-goals For The Next Slice

- No full rustc-compatible privacy oracle.
- No external crate/package privacy resolution.
- No macro expansion.
- No complete `cfg`/feature conditional compilation model.
- No broad `pub use` re-export chain implementation in the same slice.
- No attempt to resolve ambiguous candidates by visibility until the guard
  contract is stable.

## Roadmap Closeout

`1-5-1` should be considered complete once this taxonomy and recommendation are
accepted. The next implementation slice should be created under `1-5-1-2.
Module visibility wrong-edge risk residuals`, unless later discussion changes
the priority.
