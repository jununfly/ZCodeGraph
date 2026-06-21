# ESM Named Binding Fallback Taxonomy
Generated: 2026-06-21T02:08:31.803Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples`
- Source files read: none
- Database opened: false
## Summary
- Rows inspected: 379
- Candidate next slice: investigate unsupported import shapes (329 reported)
## Reasons
| Reason group | Count |
| --- | ---: |
| directExportCandidateGap | 72 |
| importEdgeTargetGap | 7 |
| packageOrRuntimeBoundary | 1233 |
| typeOnlyBoundary | 228 |
| unsupportedImportShape | 329 |

## Candidate next slice

investigate unsupported import shapes (329 reported)

## Examples

### directExportCandidateGap

- `initGrammars` from `__tests__/drupal.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `loadAllGrammars` from `__tests__/drupal.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `drupalResolver` from `__tests__/drupal.test.ts` (typescript:14:0) -> `src/resolution/frameworks/drupal.ts` candidates=0 via direct-export
- `plan` from `__tests__/explore-planner.test.ts` (typescript:6:0) -> `src/mcp/explore-planner.ts` candidates=0 via direct-export
- `initGrammars` from `__tests__/extraction.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `loadAllGrammars` from `__tests__/extraction.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `fabricViewResolver` from `__tests__/fabric-view.test.ts` (typescript:6:0) -> `src/resolution/frameworks/fabric.ts` candidates=0 via direct-export
- `initGrammars` from `__tests__/frameworks-integration.test.ts` (typescript:6:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `loadAllGrammars` from `__tests__/frameworks-integration.test.ts` (typescript:6:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `expressResolver` from `__tests__/frameworks.test.ts` (typescript:224:0) -> `src/resolution/frameworks/express.ts` candidates=0 via direct-export

### importEdgeTargetGap

- `flaskResolver` from `__tests__/frameworks.test.ts` (typescript:100:0)
- `fastapiResolver` from `__tests__/frameworks.test.ts` (typescript:100:0)
- `DEFAULT_PARSE_TIMEOUT_MS` from `src/extraction/parse-executor-worker.ts` (typescript:20:0)
- `DEFAULT_WORKER_RECYCLE_INTERVAL` from `src/extraction/parse-executor-worker.ts` (typescript:20:0)
- `fs` from `src/mcp/tools.ts` (typescript:25:0)
- `existsSync` from `src/mcp/tools.ts` (typescript:25:0)
- `wrapFrameworkResolver` from `src/resolution/frameworks/index.ts` (typescript:14:0)

### packageOrRuntimeBoundary

- `vitest` from `__tests__/access-models.test.ts` (typescript:16:0)
- `describe` from `__tests__/access-models.test.ts` (typescript:16:0)
- `it` from `__tests__/access-models.test.ts` (typescript:16:0)
- `expect` from `__tests__/access-models.test.ts` (typescript:16:0)
- `beforeEach` from `__tests__/access-models.test.ts` (typescript:16:0)
- `afterEach` from `__tests__/access-models.test.ts` (typescript:16:0)
- `fs` from `__tests__/access-models.test.ts` (typescript:17:0)
- `path` from `__tests__/access-models.test.ts` (typescript:18:0)
- `os` from `__tests__/access-models.test.ts` (typescript:19:0)
- `vitest` from `__tests__/adaptive-explore-sizing.test.ts` (typescript:27:0)

### typeOnlyBoundary

- `AgentAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `MaintenanceAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `ResolutionAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `StatusAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `QueryBuilder` from `__tests__/callback-synthesizer-language-gating.test.ts` (typescript:3:0)
- `ResolutionContext` from `__tests__/callback-synthesizer-language-gating.test.ts` (typescript:4:0)
- `RustCandidateProducerLookup` from `__tests__/candidate-protocol.test.ts` (typescript:8:0)
- `CommandContext` from `__tests__/command-context.test.ts` (typescript:21:0)
- `CommandOutput` from `__tests__/command-context.test.ts` (typescript:21:0)
- `CommandError` from `__tests__/command-context.test.ts` (typescript:21:0)

### unsupportedImportShape

- `CandidateProtocolProvider` from `__tests__/candidate-protocol.test.ts` (typescript:2:0) -> `src/resolution/candidate-protocol.ts`
- `collectCandidateProducerRoutingLookups` from `__tests__/candidate-protocol.test.ts` (typescript:2:0) -> `src/resolution/candidate-protocol.ts`
- `createTestContext` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `createProcessContext` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `TestExit` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `writeCommandOutput` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `writeCommandErrors` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `resolveProjectPath` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
- `isProjectInitialized` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
- `requireInitialized` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
