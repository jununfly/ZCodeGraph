import { describe, expect, it } from 'vitest';
import { CandidateProtocolProvider } from '../src/resolution/candidate-protocol';
import { LRUCache } from '../src/resolution/lru-cache';
import { Node } from '../src/types';

function node(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    kind: 'function',
    name: id,
    qualifiedName: `src/${id}.ts::${id}`,
    filePath: `src/${id}.ts`,
    language: 'typescript',
    startLine: 1,
    endLine: 1,
    startColumn: 0,
    endColumn: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeProvider(nodes: Node[]): CandidateProtocolProvider {
  const knownNames = new Set(nodes.map((item) => item.name));
  return new CandidateProtocolProvider({
    enabled: true,
    compareWithBaseline: true,
    caches: {
      fileNodes: new LRUCache(100),
      exactName: new LRUCache(100),
      lowerName: new LRUCache(100),
      qualifiedName: new LRUCache(100),
    },
    source: {
      getNodesInFile: (filePath) => nodes.filter((item) => item.filePath === filePath),
      getNodesByName: (name) => nodes.filter((item) => item.name === name),
      getNodesByLowerName: (lowerName) => nodes.filter((item) => item.name.toLowerCase() === lowerName),
      getNodesByQualifiedName: (qualifiedName) => nodes.filter((item) => item.qualifiedName === qualifiedName),
      getKnownNames: () => knownNames,
    },
  });
}

describe('candidate lookup/cache protocol', () => {
  it('preserves candidate availability across lookup shapes', () => {
    const sharedA = node('shared-a', {
      name: 'shared',
      qualifiedName: 'src/a.ts::shared',
      filePath: 'src/a.ts',
    });
    const sharedB = node('shared-b', {
      name: 'shared',
      qualifiedName: 'src/b.ts::shared',
      filePath: 'src/b.ts',
    });
    const lower = node('lower', {
      name: 'MixedCase',
      qualifiedName: 'src/c.ts::MixedCase',
      filePath: 'src/c.ts',
    });
    const qualified = node('qualified', {
      name: 'leaf',
      qualifiedName: 'pkg::Type.leaf',
      filePath: 'src/c.ts',
    });
    const rustOwned = node('rust-owned', {
      name: 'fromRust',
      qualifiedName: 'src/rust.ts::fromRust',
      filePath: 'src/rust.ts',
    });
    const tsFallback = node('ts-fallback', {
      name: 'fromFallback',
      qualifiedName: 'src/fallback.ts::fromFallback',
      filePath: 'src/fallback.ts',
    });
    const provider = makeProvider([sharedA, sharedB, lower, qualified, rustOwned, tsFallback]);

    expect(provider.lookupNodes({ kind: 'ExactName', name: 'shared' }).map((item) => item.id).sort()).toEqual([
      'shared-a',
      'shared-b',
    ]);
    expect(provider.lookupNodes({ kind: 'LowerName', lowerName: 'mixedcase' }).map((item) => item.id)).toEqual(['lower']);
    expect(provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'pkg::Type.leaf' }).map((item) => item.id)).toEqual(['qualified']);
    expect(provider.lookupNodes({ kind: 'FileNodes', filePath: 'src/c.ts' }).map((item) => item.id).sort()).toEqual([
      'lower',
      'qualified',
    ]);
    expect(provider.lookupNodes({ kind: 'ExactName', name: 'fromRust' }).map((item) => item.id)).toEqual(['rust-owned']);
    expect(provider.lookupNodes({ kind: 'ExactName', name: 'fromFallback' }).map((item) => item.id)).toEqual(['ts-fallback']);
    expect(provider.hasKnownName('fromRust')).toBe(true);
    expect(provider.hasKnownName('fromFallback')).toBe(true);
    expect(provider.lookupNodes({ kind: 'ExactName', name: 'missing' })).toEqual([]);
    expect(provider.hasKnownName('missing')).toBe(false);

    const diagnostics = provider.snapshotDiagnostics();
    expect(diagnostics.equivalenceComparedCount).toBe(10);
    expect(diagnostics.equivalenceMismatchCount).toBe(0);
    expect(diagnostics.lookupShapeCounts).toMatchObject({
      ExactName: 4,
      LowerName: 1,
      QualifiedName: 1,
      FileNodes: 1,
      KnownNamePresence: 3,
    });
    expect(diagnostics.candidateCount).toBe(6);
  });
});
