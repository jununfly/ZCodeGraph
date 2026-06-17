# Rust Indexing Core Phase 20 Fallback Audit

## Purpose

This audit inspects the remaining fallback surface after #204, before deciding whether #202 can close or needs another implementation slice.

The audit is not a resolver implementation and does not claim Rust default rollout readiness.

## Inputs

- Decision record: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-decision.md`
- Required-target artifact: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json`
- Rust core rerun against the required-target temporary copies to inspect pre-TypeScript-finalization `unresolved_refs`.

Rust core-only rerun commands:

```bash
target/debug/zcodegraph-core index \
  --project-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0 \
  --index-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-nh68K0/.zcodegraph/audit-rust-core.db \
  --engine rust \
  --force \
  --graph-work-profile full

target/debug/zcodegraph-core index \
  --project-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA \
  --index-path /var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-experiment-rust-TVCPwA/.zcodegraph/audit-rust-core.db \
  --engine rust \
  --force \
  --graph-work-profile full
```

The rerun profile matched the #204 required-target artifact closely enough for taxonomy inspection:

| Target | Import/path fallback | ESM named fallback | One-hop refs | Local exact fallback |
|---|---:|---:|---:|---:|
| zcodegraph | 2380 | 1445 | 279 | 28594 |
| excalidraw | 2425 | 1705 | 0 | 16213 |

## Boundary Taxonomy After #204

The Phase 20 decision boundary currently reports:

| Target | Total fallback | Binding-level import fallback | Unsupported import form | Unresolved file-level target |
|---|---:|---:|---:|---:|
| zcodegraph | 1507 | 1445 | 44 | 14 |
| excalidraw | 2400 | 1705 | 6 | 685 |

This boundary taxonomy does not include the full Rust core-only unresolved surface. It only records the finalization boundary categories currently surfaced by the TypeScript shell profile.

## Rust Core-Only Unresolved Surface

Before TypeScript finalization, the Rust core-only DB still has a much larger unresolved reference surface:

| Target | Total unresolved refs | calls | imports | exports | instantiates | references |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 32239 | 27879 | 1503 | 2142 | 715 | 0 |
| excalidraw | 19787 | 15972 | 2396 | 1004 | 241 | 174 |

This confirms that Phase 20 is not merely missing one more import/export special case. The largest Rust-core-only gap is broad JS/TS reference resolution, especially local/member/test/stdlib call references.

## Import Fallback Shape

Import-only unresolved refs from the Rust core-only DB:

| Target | Shape | Count |
|---|---|---:|
| zcodegraph | named binding or package root | 825 |
| zcodegraph | Node builtin bare specifier | 381 |
| zcodegraph | type-only binding | 216 |
| zcodegraph | Node builtin `node:` specifier | 42 |
| zcodegraph | PascalCase binding | 15 |
| zcodegraph | relative/absolute file specifier | 9 |
| zcodegraph | aliased named binding | 5 |
| zcodegraph | namespace binding | 4 |
| zcodegraph | package subpath specifier | 3 |
| zcodegraph | scoped package specifier | 2 |
| zcodegraph | default binding | 1 |
| excalidraw | named binding or package root | 943 |
| excalidraw | relative/absolute file specifier | 470 |
| excalidraw | type-only binding | 418 |
| excalidraw | PascalCase binding | 340 |
| excalidraw | `@excalidraw/*` workspace package alias specifier | 202 |
| excalidraw | package subpath specifier | 10 |
| excalidraw | default binding | 9 |
| excalidraw | scoped package specifier | 3 |
| excalidraw | aliased named binding | 1 |

Samples:

| Shape | Sample |
|---|---|
| External package named import | `import { defineConfig } from 'vitest/config';` |
| Node builtin namespace import | `import * as path from 'path';` |
| Type-only import | `import type { ShimmerWorkerMessage } from './types';` |
| Workspace package alias | `import { ... } from "@excalidraw/excalidraw";` |
| Relative default import | `import CustomStats from "./CustomStats";` |

## Interpretation

ZCodeGraph's remaining import fallback is mostly not a strong implementation target:

- Many entries are external packages, Node builtins, test framework imports, and type-only imports.
- Relative unresolved file-level imports are only 9 in the required slice.
- #203 and #204 already burned down the highest-confidence same-name direct import/export paths.

Excalidraw has a larger file-level unresolved target count, but the audit found that required-target copy incompleteness contributes materially. For example, `excalidraw-app/App.tsx` imports `./CustomStats`, but the required-target temporary copy only contains `excalidraw-app/App.tsx` in that directory. That means a resolver implementation cannot close that class of fallback without changing the corpus copy/slice or validation setup.

The broad Rust core-only unresolved surface is dominated by calls and instantiations:

- ZCodeGraph: 27879 unresolved calls and 715 unresolved instantiations before TypeScript finalization.
- Excalidraw: 15972 unresolved calls and 241 unresolved instantiations before TypeScript finalization.

Many top call names are test framework or builtin/member-style calls (`expect`, `toBe`, `join`, `map`, `filter`, `push`, `Set`, `Map`). Blindly migrating these would risk graph noise and node explosion unless the target semantics are narrowed carefully.

## Recommendation

Do not create another import/export micro-slice from this audit alone.

The next decision should be one of:

1. Accept the current known-unsupported taxonomy and close #202 as Phase 20 end-to-end opt-in complete, with #165/#193 carrying performance and deeper completeness work.
2. If Phase 20 must burn down more functionality before closure, create exactly one issue for a diagnostic slice, not implementation first: "representative missing-flow selection for broad JS/TS reference resolution." That issue should pick concrete flow prompts and identify which unresolved calls actually affect Agent Sufficiency.

Recommended answer: choose option 1 unless the maintainer requires Phase 20 to own broad JS/TS reference resolution before closure.

No Rust default rollout readiness is claimed.
