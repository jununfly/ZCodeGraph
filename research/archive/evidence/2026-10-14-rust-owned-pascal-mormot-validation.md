---
doc-kind: evidence
authority: supporting
authority-id: BENCH-2026-10-14-rust-owned-pascal-mormot-validation
bounded-question: "Does the Rust Pascal extractor handle the mORMot real-world corpus?"
---

# Rust-Owned Pascal Validation — mORMot Corpus

Roadmap: 1-2-10-3 (completed 2026-10-14)

## Corpus

- **Source**: mORMot (Synopse) — the canonical large-scale Delphi/Object Pascal framework
- **Files**: 433 `.pas` / `.dpr` / `.inc` files
- **Clone**: shallow + sparse (source units only)

## Result

| Metric | Value |
|--------|-------|
| Files indexed | 433 / 433 |
| Parse errors | 0 |
| Pascal nodes | 44,382 |
| Unresolved refs | 87,605 |

### Node breakdown

| Kind | Count |
|------|-------|
| method | 9,800 |
| field | 7,327 |
| function | 4,976 |
| constant | 4,442 |
| import | 3,995 |
| class | 1,921 |
| enum | 404 |
| interface | 94 |

### Reference breakdown

| Kind | Count |
|------|-------|
| calls | 82,469 |
| extends | 1,063 |
| implements | 78 |

## Fixes Applied

### 1. tolerates_parse_errors

216/433 (49.9%) files trigger `has_error()` via MISSING nodes (not ERROR nodes)
on legal Delphi constructs: assembler blocks (`asm`/`end`), compiler directives
(`{$IFDEF}`), and legacy idioms. Same pattern as Kotlin, Dart, Swift, Luau.

### 2. 128 MiB scoped thread

Large mORMot units overflow the default Windows 1 MiB stack during recursive
tree-sitter descent. Pascal extraction now runs on a 128 MiB scoped thread
(same as Dart).

### 3. Lossy UTF-8 reading

8/433 files are Windows-1252 / Latin-1 encoded. Source files now read via
`fs::read` + `String::from_utf8_lossy`. This is a generic fix applicable to
all languages.

## Test Status

- 3/3 rust-hybrid fixture tests passed
- 321/322 full regression passed (1 pre-existing failure unrelated to Pascal)

## Decision

Pascal (20th rust-owned language) corpus gate: **PASS**.
TS fallback extractor removed in 1-2-10-4.
