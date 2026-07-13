# ZJ-0007: Three-tier fallback health state (healthy/partial/degraded)

## Status

Accepted

## Context

The `rust-hybrid` indexing engine falls back to TypeScript extraction for
files it cannot parse natively. The original binary state model classified
any fallback as `degraded`, which caused false alarms: indexing a
TypeScript-heavy project (ZAgenticLoop) reported `Fallback health: degraded`
for 58 YAML files — but these are expected fallbacks for non-Rust-owned
languages, not indexing problems.

Issue #680 first fixed the label wording (from "TypeScript fallback files"
to "non-Rust-owned files via TypeScript fallback") and added per-language
breakdown. Issue #682 then refined the state semantics to distinguish
expected fallbacks from unexpected gaps.

Supporting evidence:

- Issue #680 — Clarify rust-hybrid fallback messaging (PR #684, merged)
- Issue #682 — Three-tier fallback health state (merged to main)

## Decision

Use a three-tier fallback health state instead of the original binary model:

| State | Condition |
|-------|-----------|
| `healthy` | Zero fallbacks, zero gaps |
| `partial` | Only `language-level-typescript-fallback` (non-Rust-owned languages, successfully indexed) |
| `degraded` | Any `rust-owned-*` gap or `language-level-fallback-missing-file` |

The durable direction is:

- `partial` is an informational state — the index is complete and usable,
  just not 100% Rust-native. CLI output uses `clack.log.info()` and omits
  the "need review" message and doctor command.
- `degraded` is a warning state — something went wrong (Rust-owned parse
  failure or missing file). CLI output uses `clack.log.warn()` and includes
  the doctor command for diagnosis.
- Graph health classification treats `partial` as healthy — expected
  fallbacks do not degrade graph usability.
- `language-level-fallback-missing-file` is classified as `degraded` because
  a missing file means the index is incomplete, unlike a successfully indexed
  non-Rust-owned file.

## Consequences

- Users no longer see false `degraded` alarms for YAML, TOML, or other
  non-Rust-owned language files.
- The `partial` state clearly communicates "index is fine, some files used
  TypeScript fallback" without implying problems.
- `degraded` now carries real signal: when a user sees it, something
  genuinely needs attention.
- The `RustHybridFallbackState` type, `rustHybridFallbackStateFor()`,
  `formatRustHybridFallbackHealthLines()`, `formatRustHybridFallbackDoctorHint()`,
  and CLI log levels all branch on the three-tier model.
- Adding new languages to the Rust-owned set is a separate parser engineering
  task, not a fallback-state concern.

## Alternatives considered

### Binary with threshold change (healthy = only expected fallbacks)

Rejected. Collapses `healthy` and `partial` into one state, losing the
information that some files used fallback. Users benefit from seeing which
languages went through TypeScript fallback even when it is expected.

### Rename only (degraded -> partial, keep binary logic)

Rejected. Fixes the alarming word but not the semantic issue. A
Rust-owned parse failure would also show as `partial`, which is
misleading — that is a real problem, not an expected fallback.

### Add non-Rust-owned languages (YAML, etc.) to the Rust parser

Rejected for this issue. Expanding Rust-owned language support is a separate
parser engineering task with its own scope and trade-offs. This ADR addresses
the state semantics; parser expansion should be tracked independently.
