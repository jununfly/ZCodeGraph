# Parse Extraction Profile Contract Closeout

Date: 2026-06-21

## Scope

This closes Plan 1 for #224:

- Plan: `docs/plans/2026-06-21-rust-hybrid-parse-extraction-profile-contract.md`
- Issues: #390, #391, #392, #393

This plan only adds parse/extraction diagnostics. It does not optimize
parse/extraction and does not close #224.

## Implemented Profile Contract

Rust core profile artifacts now preserve the existing high-level
`parseExtractionMs` field and add diagnostic sub-buckets:

- `parseSourceReadMs`
- `parseNormalizationMs`
- `parseParserSetupMs`
- `parseTreeSitterMs`
- `parseAstExtractionMs`
- `parseErrorHandlingMs`
- `parseByLanguage`

`parseByLanguage` records per-language file count and the same sub-bucket shape.

These fields are profile artifact diagnostics for #224 evidence work. They are
not a long-term public API stability promise.

## Validation

Reduced fixture smoke:

- Rust core fixture indexes TypeScript and JavaScript files.
- Profile sub-buckets are non-negative.
- `parseByLanguage` includes `typescript` and `javascript`.
- Per-language file counts match indexed files.
- Existing `parseExtractionMs` remains present.

Artifact propagation smoke:

- CLI `ZCODEGRAPH_INDEX_PROFILE_OUT` profile includes the new `rustCore`
  sub-buckets.
- Existing status/index behavior remains unchanged.

Commands run:

```bash
cargo test -p zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes a Rust-produced index and profile"
```

## Non-Changes

- No performance optimization was implemented.
- No SQLite schema changed.
- No MCP behavior changed.
- No default user-visible indexing behavior changed.
- No VS Code sparse run was performed in this plan.
- No agent A/B was run.

## Next Step

#224 remains open.

Plan 2 should use these fields to run targeted current-repo and VS Code sparse
profile evidence, record RSS or an unavailable reason, and decide exactly one
next step:

- one bounded parse/extraction optimization candidate;
- one no-go reason;
- or one narrower profiling issue.
