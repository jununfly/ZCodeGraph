import { describe, expect, it } from 'vitest';
import { synthesizeCallbackEdges } from '../src/resolution/callback-synthesizer';
import type { QueryBuilder } from '../src/db/queries';
import type { ResolutionContext } from '../src/resolution/types';

describe('callback synthesizer language gating', () => {
  it('skips language-specific full-graph synthesizers when the project has no matching files', () => {
    const queries = {
      getStats: () => ({
        nodeCount: 0,
        edgeCount: 0,
        fileCount: 1,
        nodesByKind: {},
        edgesByKind: {},
        filesByLanguage: { typescript: 1 },
        dbSizeBytes: 0,
        lastUpdated: Date.now(),
      }),
      getNodesByKind: (kind: string) => {
        if (kind === 'method') {
          throw new Error('Go-only method scan should be skipped for a TypeScript-only project');
        }
        return [];
      },
      iterateNodesByKind: function* () {},
      getOutgoingEdges: () => [],
      getNodeById: () => null,
      getAllNodes: () => [],
      getNodesByQualifiedNameExact: () => [],
      insertEdges: () => {},
    } as unknown as QueryBuilder;

    const context = {
      getAllFiles: () => [],
      readFile: () => null,
      getProjectRoot: () => '',
      getNodesInFile: () => [],
      getNodesByName: () => [],
      getNodesByQualifiedName: () => [],
      getNodesByKind: () => [],
      fileExists: () => false,
      getNodesByLowerName: () => [],
      getImportMappings: () => [],
    } as ResolutionContext;

    expect(() => synthesizeCallbackEdges(queries, context)).not.toThrow();
  });

  it('still runs JavaScript-family synthesizers for TSX-only projects', () => {
    const queries = {
      getStats: () => ({
        nodeCount: 0,
        edgeCount: 0,
        fileCount: 1,
        nodesByKind: {},
        edgesByKind: {},
        filesByLanguage: { tsx: 1 },
        dbSizeBytes: 0,
        lastUpdated: Date.now(),
      }),
      getNodesByKind: () => [],
      iterateNodesByKind: function* () {},
      getOutgoingEdges: () => [],
      getNodeById: () => null,
      getAllNodes: () => [],
      getNodesByQualifiedNameExact: () => [],
      insertEdges: () => {},
    } as unknown as QueryBuilder;

    let allFilesReads = 0;
    const context = {
      getAllFiles: () => {
        allFilesReads++;
        return [];
      },
      readFile: () => null,
      getProjectRoot: () => '',
      getNodesInFile: () => [],
      getNodesByName: () => [],
      getNodesByQualifiedName: () => [],
      getNodesByKind: () => [],
      fileExists: () => false,
      getNodesByLowerName: () => [],
      getImportMappings: () => [],
    } as ResolutionContext;

    synthesizeCallbackEdges(queries, context);

    expect(allFilesReads).toBeGreaterThan(0);
  });
});
