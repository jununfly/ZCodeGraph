---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-14-rust-owned-cpp-bodyless-header
bounded-question: "What evidence does 2026-10-14-rust-owned-cpp-bodyless-headers-validation provide?"
---
# Roadmap 1-2-3-2: C++ Bodyless Header Declarations — Validation Evidence

**Date**: 2026-10-14
**Corpus**: [nlohmann/json](https://github.com/nlohmann/json) (header-only, shallow clone `json-corpus`)
**Engine**: rust (`--engine rust`, pure Rust extraction)
**Scope**: roadmap 1-2-3-2 — emit `method`/`function`/`field` nodes for bodyless C++ header declarations (G4 backlog), so the TS shell's `resolveMethodOnType` can associate typed-pointer calls across the `.hpp`/`.cpp` split even when a header declaration is the only node a class member has.

## Summary

The enhanced Rust-owned C++ extraction was validated against the nlohmann/json real-world header-only codebase. All 495 supported files were indexed with **zero parse errors** and **zero filesErrored**, producing 22,814 nodes. The new declaration-driven symbol kinds (`method` from bodyless declarations, `field` from member declarations) appear at scale with correct shapes; legacy overload duplication (same `Class::method` qualified name across parameter-list overloads) is unchanged pre-existing behavior, not introduced by this wave.

## Corpus Profile

| Metric | Count |
|--------|-------|
| Files indexed | 495 |
| filesErrored | 0 |
| `files.errors` non-empty | 0 |
| Nodes created | 22,814 |
| Edges created | 24,474 |
| Index wall time | 8,640 ms |

## Nodes by Kind (post-enhancement)

| Kind | Count | Note |
|------|-------|------|
| variable | 10,148 | file-scope declarations unchanged |
| function | 2,456 | free prototypes now included |
| **method** | **2,438** | **+1,934 in `.hpp` (bodyless decls now emit nodes)** |
| import | 2,304 | |
| **field** | **1,884** | **new kind from member declarations** |
| type_alias | 1,516 | |
| struct | 635 | |
| file | 495 | |
| enum_member | 490 | |
| class | 232 | |
| namespace | 143 | |
| enum | 62 | |
| module | 11 | |

## Shape Verification

### Field signatures carry the declared type (pointer prefix preserved)

| name | signature |
|------|-----------|
| `value` | `BasicJsonType* value` |
| `container` | `BasicJsonType* container` |

Pointer/reference markers live on wrapper declarators (`pointer_declarator`), not on the type child; `cpp_declarator_ptr_prefix` prepends them so signatures match the TS shell's `extractField` shape (`<Type> <name>`).

### Bodyless method declarations emit `method` with class-scoped qualified name

`method` nodes in `.hpp` files: **1,934** (pre-wave: 0 — declarations emitted no node). Qualified name shape `file::[ns::]Class::name` mirrors G3 inline definitions and G4 out-of-class definitions, so `resolveMethodOnType` (suffix match on `Class::method`, kind-filtered to `method`) closes over declarations and definitions uniformly.

### Declaration/definition coexistence (by design)

Same-`qualified_name` `method` rows repeat across parameter-list overloads (e.g. `external_constructor::construct` ×18 in `json.hpp`, one per `basic_json` specialization / overload). This is **pre-existing** overload duplication identical to G3 inline definitions — declarations and definitions coexist and the resolver picks `matches[0]`; it is not a regression introduced by this wave.

## Regression Layer Results

| Layer | Result |
|-------|--------|
| Rust unit (`cargo test -p zcodegraph-core --lib`) | **181/181 passed** (180→181: +`rust_cpp_bodyless_header_declarations_symbols`; G4 multiset updated 2→4 methods for decl+def coexistence) |
| wave0 fixture (`rust-owned-language-fixtures.test.ts`) | +1 `it` "emits method/field nodes for bodyless header declarations (1-2-3-2)"; G4 `Processing` count 2→4; binary+sqlite verbatim replication **ALL PASS** (local vitest unavailable — CI runs it) |
| Real corpus (nlohmann/json) | 495 files, 0 errored, multisets above |

## Scope Boundaries (unchanged)

- Single source of truth: `crates/zcodegraph-core/src/lib.rs` only; **no TS change** (`resolveMethodOnType` / `matchMethodCall` already existed and are reused as-is).
- `EXTRACTION_VERSION` stays `2` (same unreleased C++ semantic batch as G1–G4; per node decision, no bump).
- File-scope plain declarations stay `variable` (regression-guarded); `init_declarator` initializer pruning and function-pointer exclusions are preserved.
