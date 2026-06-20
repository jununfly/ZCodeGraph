import { describe, expect, it } from 'vitest';
import {
  CandidateProtocolProvider,
  collectCandidateProducerRoutingLookups,
} from '../src/resolution/candidate-protocol';
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

function makeSource(nodes: Node[]) {
  const knownNames = new Set(nodes.map((item) => item.name));
  return {
    getNodesInFile: (filePath: string) => nodes.filter((item) => item.filePath === filePath),
    getNodesByName: (name: string) => nodes.filter((item) => item.name === name),
    getNodesByLowerName: (lowerName: string) => nodes.filter((item) => item.name.toLowerCase() === lowerName),
    getNodesByQualifiedName: (qualifiedName: string) => nodes.filter((item) => item.qualifiedName === qualifiedName),
    getNodesByIds: (ids: readonly string[]) => new Map(ids.flatMap((id) => {
      const match = nodes.find((item) => item.id === id);
      return match ? [[id, match] as const] : [];
    })),
    getKnownNames: () => knownNames,
  };
}

function makeProvider(nodes: Node[]): CandidateProtocolProvider {
  return new CandidateProtocolProvider({
    enabled: true,
    compareWithBaseline: true,
    caches: {
      fileNodes: new LRUCache(100),
      exactName: new LRUCache(100),
      lowerName: new LRUCache(100),
      qualifiedName: new LRUCache(100),
    },
    source: makeSource(nodes),
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

  it('collects only bare unresolved reference names for Rust producer routing', () => {
    expect(collectCandidateProducerRoutingLookups([
      { referenceName: 'target' },
      { referenceName: 'obj.method' },
      { referenceName: 'crate::module::leaf' },
      { referenceName: 'pkg/path' },
      { referenceName: 'target' },
      { referenceName: 'Other' },
    ])).toEqual([
      { kind: 'ExactName', name: 'Other' },
      { kind: 'KnownNamePresence', name: 'Other' },
      { kind: 'ExactName', name: 'target' },
      { kind: 'KnownNamePresence', name: 'target' },
    ]);
  });

  it('routes ExactName and KnownNamePresence through Rust producer results when local config enables it', () => {
    const target = node('target-id', { name: 'target' });
    const fallback = node('fallback-id', { name: 'fallback' });
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      rustProducerEnabled: false,
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: () => ({
        results: [
          { kind: 'ExactName', name: 'target', candidateIds: ['target-id'] },
          { kind: 'KnownNamePresence', name: 'target', present: true },
        ],
        diagnostics: {
          enabled: true,
          shadowMode: true,
          producerMs: 1,
          serializationMs: 1,
          subprocessMs: 1,
          lookupCount: 2,
          lookupShapeCounts: { ExactName: 1, LowerName: 0, QualifiedName: 0, FileNodes: 0, KnownNamePresence: 1 },
          comparedCount: 0,
          mismatchCount: 0,
          mismatchReasons: {},
          mismatchSamples: [],
          candidateCount: 1,
          payloadBytes: 10,
          disabledReason: null,
          routing: {
            configured: false,
            source: 'missing-config',
            active: false,
            activeShapes: [],
            fallbackReason: null,
            mismatchCount: 0,
            mismatchSamples: [],
          },
        },
      }),
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([target, fallback]),
    });

    provider.prepareRustCandidateProducerRouting([{ referenceName: 'target' }]);

    expect(provider.lookupNodes({ kind: 'ExactName', name: 'target' }).map((item) => item.id)).toEqual(['target-id']);
    expect(provider.hasKnownName('target')).toBe(true);
    expect(provider.lookupNodes({ kind: 'ExactName', name: 'fallback' }).map((item) => item.id)).toEqual(['fallback-id']);
    const routing = provider.snapshotDiagnostics().rustCandidateProducer.routing;
    expect(routing).toMatchObject({
      configured: true,
      source: 'local-config',
      active: true,
      activeShapes: ['ExactName', 'KnownNamePresence'],
      fallbackReason: null,
    });
  });

  it('fails closed to TypeScript baseline for the whole run on a routed candidate mismatch', () => {
    const target = node('target-id', { name: 'target' });
    const routed = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: () => ({
        results: [
          { kind: 'ExactName', name: 'target', candidateIds: [] },
          { kind: 'KnownNamePresence', name: 'target', present: true },
        ],
        diagnostics: {
          enabled: true,
          shadowMode: true,
          producerMs: 1,
          serializationMs: 1,
          subprocessMs: 1,
          lookupCount: 2,
          lookupShapeCounts: { ExactName: 1, LowerName: 0, QualifiedName: 0, FileNodes: 0, KnownNamePresence: 1 },
          comparedCount: 0,
          mismatchCount: 0,
          mismatchReasons: {},
          mismatchSamples: [],
          candidateCount: 0,
          payloadBytes: 10,
          disabledReason: null,
          routing: {
            configured: false,
            source: 'missing-config',
            active: false,
            activeShapes: [],
            fallbackReason: null,
            mismatchCount: 0,
            mismatchSamples: [],
          },
        },
      }),
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([target]),
    });

    routed.prepareRustCandidateProducerRouting([{ referenceName: 'target' }]);

    expect(routed.lookupNodes({ kind: 'ExactName', name: 'target' }).map((item) => item.id)).toEqual(['target-id']);
    expect(routed.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: false,
      fallbackReason: 'candidate-id-mismatch',
      mismatchCount: 1,
    });
  });
});
