# Rust-Owned Java Corpus Validation

Date: 2026-07-03

## Corpus

- Repository: `spring-projects/spring-petclinic`
- Checkout: `b3ee2c5`
- Local path during validation: `/private/tmp/codegraph-corpus/spring-petclinic-java`
- Rationale: small-to-medium real Java/Spring project with production and test
  Java files plus non-Java resource files.

## Command

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 \
CODEGRAPH_NO_DAEMON=1 \
CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_RUST_CORE_BINARY=/Users/bilibili/Documents/workspace/github/jununfly/ZCodeGraph/target/debug/zcodegraph-core \
node /Users/bilibili/Documents/workspace/github/jununfly/ZCodeGraph/dist/bin/zcodegraph.js init \
  /private/tmp/codegraph-corpus/spring-petclinic-java \
  --engine rust-hybrid
```

## Result

- Indexed files: 72
- Nodes: 989
- Edges: 1,656
- Languages: `java`, `properties`, `xml`, `yaml`
- Rust-owned languages included `java`.
- `engineByLanguage.java` was `rust`.
- `engineByFileCount.rust` was 47.
- Fallback files: 25, all from non-Java resources:
  - `yaml`: 8
  - `properties`: 14
  - `xml`: 3

## Decision

The Java baseline migration gate passes for this corpus. Java source files are
owned by the Rust indexer; remaining fallback evidence belongs to resource-file
languages outside this PR's Java baseline extraction scope.
