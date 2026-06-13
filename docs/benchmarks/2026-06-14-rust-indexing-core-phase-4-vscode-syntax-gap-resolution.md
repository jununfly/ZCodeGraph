# Rust Indexing Core Phase 4 VS Code Syntax Gap Resolution

Issue: [#88](https://github.com/jununfly/ZCodeGraph/issues/88)

Source taxonomy: [Rust Indexing Core Phase 4 VS Code Parse-Error Taxonomy](2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md)

Raw targeted slice rerun: [2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json)

Raw full sparse-checkout rerun: [2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json](2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json)

## Summary

The 16 real supported JS/TS syntax-gap paths from the VS Code taxonomy are
fixed for the Rust indexing core. A full Rust-core parse rerun on the same
large VS Code JS/TS sparse checkout moved every #88 path out of the parse-error
set.

This does not require VS Code to reach zero parse errors. The remaining 29
parse errors are the malformed fixture, prompt/generated, or colorization
fixture paths already classified by #86 as not representative normal
application source.

## Root Syntax Families

The real syntax-gap paths reduced to two parser compatibility families:

| Family | Representative paths | Fix |
| --- | --- | --- |
| Type-only `import("module").Type` queries | `build/next/index.ts`, `src/vs/code/electron-browser/workbench/workbench.ts`, `src/vs/platform/tunnel/test/node/tunnelProxy.test.ts`, `src/vs/workbench/contrib/issue/browser/issueFormService.ts` | Parser-only, byte-length-preserving normalization rewrites unsupported import-type query spans to an identifier before tree-sitter parses. The original source remains the extraction source. |
| Contextual keyword identifiers | `extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts`, `src/vs/platform/browserView/electron-browser/preload-browserView.ts` | Parser-only, byte-length-preserving normalization rewrites `abstract:` property names and `unique.` member receivers only for the parse input. |

The regression coverage uses minimal Rust-core fixtures for both families.

## Rerun Evidence

Targeted #88 path slice:

| Metric | Result |
| --- | ---: |
| Selected real syntax-gap paths | 16 |
| Files indexed | 16 |
| Files errored | 0 |

Full VS Code sparse-checkout Rust-core parse rerun:

| Metric | Before #88 fix | After #88 fix |
| --- | ---: | ---: |
| Indexed JS/TS/JSX/TSX files | 11,291 | 11,291 |
| Parse errors | 46 | 29 |
| Real supported JS/TS syntax-gap errors | 16 | 0 |

## Remaining Parse Errors

The remaining 29 paths are not accepted as normal supported JS/TS syntax gaps
for default-rollout gating. They remain documented as:

- malformed fixture / intentionally invalid test input;
- prompt-generated or prompt-heavy source not representative of normal app
  code;
- copied compiler-scale colorization fixture.

No unknown parse errors remain.

## Decision Impact

#88 is no longer a default-rollout blocker. The Phase 4 decision still stays on
the `continue opt-in + targeted blockers` path because the #87
reference-resolution database-access bottleneck remains unresolved.
