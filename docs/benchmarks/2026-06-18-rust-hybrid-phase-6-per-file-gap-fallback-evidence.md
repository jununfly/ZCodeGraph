# Rust-Hybrid Phase 6 Per-File Gap Fallback Evidence

## Summary

Phase 6 implements Rust-owned per-file parse gap fallback for the CLI `rust-hybrid` path.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- ZCodeGraph version: `0.9.9`
- Node runtime observed by local `node`: `26.0.0`
- Rust core path: `target/debug/zcodegraph-core`
- Real reduced fixture: `/private/tmp/zcodegraph-phase6-real-gap-attempt`
- Diagnostic bundle: `/private/tmp/zcodegraph-phase6-real-gap-attempt/.zcodegraph/diagnostics/bundles/2026-06-18T15-43-50-513Z-last-run`

Local CLI smoke commands were run with:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1
CODEGRAPH_NO_DAEMON=1
CODEGRAPH_NO_RELAUNCH=1
```

The Node 26 guard banner was printed during local CLI smoke. The command continued under the explicit unsafe override used by the existing test harness. This evidence does not validate Node 26 support.

## Commands

Builds:

```bash
npm run build
cargo build --package zcodegraph-core
```

Targeted tests:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-hybrid-doctor.test.ts
cargo test --package zcodegraph-core emits_structured_rust_owned_parse_gap_errors
```

Real reduced fixture:

```bash
mkdir -p /private/tmp/zcodegraph-phase6-real-gap-attempt
printf 'export function ok() { return 1; }\n' \
  > /private/tmp/zcodegraph-phase6-real-gap-attempt/ok.ts
printf 'export function broken( {\n' \
  > /private/tmp/zcodegraph-phase6-real-gap-attempt/broken.ts

env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js init \
  /private/tmp/zcodegraph-phase6-real-gap-attempt \
  --engine rust-hybrid

env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js status \
  /private/tmp/zcodegraph-phase6-real-gap-attempt \
  --json

env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js doctor \
  /private/tmp/zcodegraph-phase6-real-gap-attempt \
  --engine rust-hybrid \
  --bundle \
  --last-run
```

## Test Evidence

Targeted JS/CLI and doctor tests passed:

```text
Test Files  2 passed (2)
Tests       55 passed (55)
```

Targeted Rust core contract test passed:

```text
test tests::emits_structured_rust_owned_parse_gap_errors ... ok
```

Builds passed:

```text
npm run build
cargo build --package zcodegraph-core
```

## Fake-Core Evidence

The fake-core tracer validates the CLI contract without depending on a naturally occurring Rust parse gap:

- Rust process exits successfully.
- Rust result reports a warning-level per-file gap with `filePath`, `language`, `code`, `severity`, and `writtenByRust:false`.
- CLI appends the affected Rust-owned file through the existing TypeScript fallback append path.
- `status --json` reports:
  - `fallbackState: "degraded"`,
  - `fallbackByLanguage: { "typescript": 1 }`,
  - `fallbackFileCount: 1`,
  - `fallbackReasonTaxonomy: { "rust-owned-parse-gap": 1 }`,
  - `pendingFallbacks: []`.

The partial-write blocked tracer validates the unsafe boundary:

- Rust result reports a Rust-owned gap where `writtenByRust:true`.
- CLI does not append TypeScript fallback for that file.
- `status --json` reports `rust-owned-gap-with-partial-write-blocked`.

## Real Reduced Fixture Evidence

The real reduced fixture contains:

- `ok.ts`: valid TypeScript.
- `broken.ts`: malformed TypeScript that produces a Rust parse gap.

The real `rust-hybrid` run completed successfully and printed:

```text
Rust-hybrid appended 1 TypeScript fallback files
Fallback health: degraded
```

The final status reported:

```json
{
  "fallbackByLanguage": { "typescript": 1 },
  "fallbackFileCount": 1,
  "fallbackState": "degraded",
  "fallbackMessage": "Rust-owned gap fallback appended 1 file(s).",
  "fallbackReasonTaxonomy": { "rust-owned-parse-gap": 1 },
  "pendingFallbacks": []
}
```

The final diagnostic bundle `per-file-diagnostics.json` reported:

```json
{
  "errors": [
    {
      "pathHash": "f560abac70502a0d116437d23b8e75ff06abf9bd3b8dcba2ad5281deac2bdb35",
      "extension": ".ts",
      "language": "typescript",
      "code": "rust-owned-parse-gap",
      "severity": "warning",
      "message": "parse error"
    }
  ]
}
```

The bundle does not include source code or plaintext file paths in per-file diagnostics.

## Scope Boundaries

This evidence does not validate:

- SDK default behavior or SDK engine options,
- README or release messaging,
- full release-like packaged smoke,
- per-file graph replacement after partial Rust writes,
- performance or #165,
- final first-user release readiness.
