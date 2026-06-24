# Index Pipeline Design

## Purpose

Move indexing lifecycle orchestration behind a testable pipeline interface. The pipeline separates "what happens in order" from "who owns the resources", making each stage independently testable.

## Current Code

The index pipeline lives in three modules:

- `src/extraction/index-pipeline-types.ts` — interfaces
- `src/extraction/index-pipeline.ts` — `createIndexPipeline()` factory
- `src/extraction/index-stages.ts` — `ScanStage`, `ParseStage`, `RetryStage`

The original monolithic `ExtractionOrchestrator.indexAll()` (~500 lines) remains as the production path. The pipeline is available for incremental adoption.

## Pipeline Architecture

```
IndexContext (shared state)
     │
     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ ScanStage│───▶│ParseStage│───▶│RetryStage│
└──────────┘    └──────────┘    └──────────┘
     │               │               │
     ▼               ▼               ▼
  files[]        filesIndexed    errors updated
  frameworkNames totalNodes      filesErrored--
  neededLangs    totalEdges      filesIndexed++
                 errors[]
```

Each stage:
- Reads from `IndexContext` what it needs
- Writes its contributions to `IndexContext`
- Returns `IndexStageResult` (can signal abort)

## Stage Contracts

### ScanStage

| Input (context) | Output (context) |
|-----------------|-----------------|
| `rootDir` | `files` (string[]) |
| `onProgress` | `frameworkNames` (string[]) |
| | `neededLanguages` (Language[]) |
| | `useWorker` (boolean) |
| | `parseWorkerPath` (string) |

### ParseStage

| Input (context) | Output (context) |
|-----------------|-----------------|
| `files` | `filesIndexed` |
| `frameworkNames` | `filesSkipped` |
| `neededLanguages` | `filesErrored` |
| `useWorker` | `totalNodes` |
| `parseWorkerPath` | `totalEdges` |
| `rootDir` | `errors` |
| `queries` | |
| `onProgress` | |
| `signal` | |

### RetryStage

| Input (context) | Output (context) |
|-----------------|-----------------|
| `errors` | `filesIndexed` (+ recovered) |
| `rootDir` | `filesErrored` (- recovered) |
| `frameworkNames` | `totalNodes` (+ recovered) |
| `useWorker` | `totalEdges` (+ recovered) |
| `queries` | `errors` (retryable removed) |

## Testing Strategy

- **Pipeline tests**: stage ordering, abort handling, error accumulation, context propagation
- **Stage tests**: each stage with injected file lists and mock QueryBuilder
- **Integration tests**: existing `full-pipeline.test.ts` covers end-to-end behavior

## Adoption Path

1. Pipeline types and factory are defined and tested.
2. Stages are extracted with identical behavior to the original.
3. Future: wire the pipeline into `ExtractionOrchestrator.indexAll()` as a drop-in replacement.
4. Future: add `ResolveStage` and `FinalizeStage` for the post-extraction phases currently in `CodeGraph.indexAll()`.
