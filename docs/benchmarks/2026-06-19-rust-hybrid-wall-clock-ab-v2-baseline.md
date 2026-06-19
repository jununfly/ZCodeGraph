# Rust-Hybrid Wall-Clock A/B v2 Baseline

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-default-indexing-wall-clock-ab.md`

Issues: #291, #292, #293, #294

## Scope

This baseline covers only source-path `rust-hybrid` full indexing. It does not
run the full benchmark scoreboard, packaged smoke, release workflow, or agent
sufficiency A/B.

## Environment

- CLI: local built `dist/bin/zcodegraph.js`
- Rust core: local `target/debug/zcodegraph-core`
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`
- Guard env: `CODEGRAPH_NO_DAEMON=1`, `CODEGRAPH_NO_RELAUNCH=1`
- RSS source: `/usr/bin/time -l`

## Corpora

| Corpus | Path | Git checkout | Revision |
| --- | --- | --- | --- |
| ZCodeGraph | `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph` | yes | current `main` |
| VS Code sparse | `/private/tmp/codegraph-corpus/vscode-sparse` | yes | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |

## Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Results

| Corpus | Wall-clock | Peak RSS | Profile artifact |
| --- | ---: | ---: | --- |
| ZCodeGraph | 4.88s | 319,930,368 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json` |
| VS Code sparse | 295.14s | 2,321,973,248 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json` |

## Diagnostic Buckets

| Corpus | rustCore.parseExtractionMs | rustCore.sqliteWriteMs | typescriptFallbackAppend.durationMs | typescriptFinalizationMs | finalize.referenceResolutionMs | finalize.dynamicDispatchSynthesisMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 1,213 | 653 | 136 | 894 | 463 | 375 |
| VS Code sparse | 40,052 | 54,061 | 1,101 | 126,363 | 109,635 | 13,846 |

VS Code sparse finalization sub-buckets:

| Bucket | ms |
| --- | ---: |
| nameMatchingMs | 50,990 |
| databaseAccessMs | 45,404 |
| perReferenceDisambiguationMs | 45,450 |
| edgeWriteDbMs | 21,728 |
| unresolvedCleanupDbMs | 19,413 |
| candidateLookupMs | 8,060 |

VS Code sparse Rust-owned sub-buckets:

| Bucket | ms |
| --- | ---: |
| sqliteWriteMs | 54,061 |
| parseExtractionMs | 40,052 |
| localExactReferenceResolutionMs | 37,304 |
| esmNamedImportExportResolutionMs | 16,639 |
| importPathAliasResolutionMs | 7,106 |

## Candidate Selection

Selected bounded candidate for #292:

Reuse one tree-sitter parser per source language during Rust core extraction
instead of constructing and configuring a new parser for every file.

Reasoning:

- The largest remaining end-to-end bucket is still TypeScript finalization, but
  the low-semantic-risk options there are less obvious from this baseline and
  can easily drift into reference-disambiguation semantics.
- `rustCore.parseExtractionMs` is now a visible Rust-owned bucket on VS Code
  sparse at 40,052ms.
- The current extraction loop constructs a new `Parser` and sets its language
  for every file. Reusing parsers by language is a bounded mechanical candidate
  that should not change extracted graph semantics.
- This partially reframes #224: parse extraction remains relevant, and this
  pass tries one narrow parse/extraction overhead candidate before opening
  broader parser/extractor subsegment work.

Non-selected candidates:

- TypeScript finalization/reference-resolution semantic migration: too broad
  for this plan and explicitly outside the disambiguation guardrail.
- Finalization database write/cleanup: still large, but recent passes already
  addressed several write/cleanup mechanics; this baseline does not isolate one
  lower-risk next write candidate.
- Another Rust SQLite write candidate: the prior pass already moved
  `sqliteWriteMs` materially, and the next obvious low-risk Rust-owned bucket is
  parse/extraction overhead.

Decision for #291: proceed to #292 with the single parser reuse candidate.
