# Rust-Owned C Corpus Validation

Date: 2026-07-03

## Corpus

- Repository: `DaveGamble/cJSON`
- Checkout: `fb16e5c`
- Local path during validation: `/private/tmp/zcodegraph-corpus-cjson`
- Rationale: suitably sized real C project with C source files, headers, tests,
  and a small amount of non-C project metadata.

## Command

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 \
CODEGRAPH_NO_DAEMON=1 \
CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_RUST_CORE_BINARY=/Users/bilibili/Documents/workspace/github/jununfly/ZCodeGraph/target/debug/zcodegraph-core \
node /Users/bilibili/Documents/workspace/github/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index \
  /private/tmp/zcodegraph-corpus-cjson \
  --force \
  --quiet
```

## Result

- Repository files: 149
- C/header files: 53
- Indexed files: 121
- Nodes: 3,581
- Edges: 7,000
- Languages: `c`, `python`, `ruby`, `yaml`
- Rust-owned languages included `c`.
- `engineByLanguage.c` was `rust`.
- `engineByFileCount.rust` was 55.
- Rust-owned C parse/extraction gap diagnostics: 0.
- Fallback files: 20, all from non-C languages:
  - `yaml`: 7
  - `ruby`: 13

## Verification Gates

- C Rust-owned fixture and rust-hybrid metadata coverage:
  `npx vitest run __tests__/rust-index-engine-cli-language-smoke.test.ts __tests__/rust-index-engine-cli-fallback.test.ts __tests__/rust-index-engine-cli-engine.test.ts`
  passed with 54 tests.
- C++ and Objective-C TypeScript extraction guard:
  `npx vitest run __tests__/extraction.test.ts -t "C/C\\+\\+ imports|Objective-C|detect language"`
  passed with 15 focused tests.

## Boundary Note

`libuv/libuv` was also tried as a larger C corpus. It indexed successfully, but
its macro-heavy platform headers produced many tree-sitter parse diagnostics, so
it is a better future stress corpus than a first baseline migration gate.

## Decision

The C baseline migration gate passes for this corpus. C source and header files
are owned by the Rust indexer; remaining fallback evidence belongs to non-C
languages outside this PR's C baseline extraction scope.

The migrated TypeScript-owned C extraction path was removed after this gate
passed. C++ remains TypeScript-owned and is tracked separately in the Rust-owned
migration roadmap.
