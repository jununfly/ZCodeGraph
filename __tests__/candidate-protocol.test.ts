import { describe, expect, it } from 'vitest';
import {
  CandidateProtocolProvider,
  collectCandidateProducerRoutingLookups,
} from '../src/resolution/candidate-protocol';
import { LRUCache } from '../src/resolution/lru-cache';
import { Node } from '../src/types';
import type { RustCandidateProducerLookup } from '../src/resolution/rust-candidate-producer';

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

function rustProducerDiagnostics(lookups: RustCandidateProducerLookup[], disabledReason: string | null = null) {
  return {
    enabled: true,
    shadowMode: true,
    producerMs: 1,
    serializationMs: 1,
    subprocessMs: 1,
    lookupCount: lookups.length,
    lookupShapeCounts: {
      ExactName: lookups.filter((lookup) => lookup.kind === 'ExactName').length,
      LowerName: lookups.filter((lookup) => lookup.kind === 'LowerName').length,
      QualifiedName: lookups.filter((lookup) => lookup.kind === 'QualifiedName').length,
      FileNodes: lookups.filter((lookup) => lookup.kind === 'FileNodes').length,
      KnownNamePresence: lookups.filter((lookup) => lookup.kind === 'KnownNamePresence').length,
    },
    comparedCount: 0,
    mismatchCount: 0,
    mismatchReasons: {},
    mismatchSamples: [],
    candidateCount: 0,
    payloadBytes: 10,
    disabledReason,
    routing: {
      configured: false,
      source: 'missing-config' as const,
      active: false,
      activeShapes: [],
      fallbackReason: null,
      mismatchCount: 0,
      mismatchSamples: [],
    },
  };
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
      { kind: 'LowerName', lowerName: 'other' },
      { kind: 'QualifiedName', qualifiedName: 'Other' },
      { kind: 'ExactName', name: 'target' },
      { kind: 'KnownNamePresence', name: 'target' },
      { kind: 'LowerName', lowerName: 'target' },
      { kind: 'QualifiedName', qualifiedName: 'target' },
      { kind: 'LowerName', lowerName: 'crate::module::leaf' },
      { kind: 'QualifiedName', qualifiedName: 'crate::module::leaf' },
      { kind: 'LowerName', lowerName: 'obj.method' },
      { kind: 'QualifiedName', qualifiedName: 'obj.method' },
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
          { kind: 'LowerName', lowerName: 'target', candidateIds: ['target-id'] },
        ],
        diagnostics: {
          enabled: true,
          shadowMode: true,
          producerMs: 1,
          serializationMs: 1,
          subprocessMs: 1,
          lookupCount: 3,
          lookupShapeCounts: { ExactName: 1, LowerName: 1, QualifiedName: 0, FileNodes: 0, KnownNamePresence: 1 },
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
      activeShapes: ['ExactName', 'KnownNamePresence', 'LowerName', 'QualifiedName', 'FileNodes'],
      fallbackReason: null,
    });
  });

  it('routes on-demand node lookup shapes through Rust producer lookups when the resolver asks for them', () => {
    const target = node('target-id', { name: 'target' });
    const lower = node('lower-id', { name: 'MixedCase' });
    const qualified = node('qualified-id', {
      name: 'leaf',
      qualifiedName: 'pkg::Type.leaf',
      filePath: 'src/c.ts',
    });
    const fileNode = node('file-node-id', {
      name: 'fileLeaf',
      qualifiedName: 'src/c.ts::fileLeaf',
      filePath: 'src/c.ts',
    });
    const producerLookups: string[] = [];
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => {
        producerLookups.push(...lookups.map((lookup) => {
          if (lookup.kind === 'LowerName') return `LowerName:${lookup.lowerName}`;
          if (lookup.kind === 'QualifiedName') return `QualifiedName:${lookup.qualifiedName}`;
          if (lookup.kind === 'FileNodes') return `FileNodes:${lookup.filePath}`;
          return lookup.kind;
        }));
        return {
          results: lookups.map((lookup) => {
            if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: lookup.name === 'target' ? ['target-id'] : [] };
            if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: lookup.name === 'target' };
            if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: lookup.lowerName === 'mixedcase' ? ['lower-id'] : [] };
            if (lookup.kind === 'QualifiedName') return { kind: 'QualifiedName' as const, qualifiedName: lookup.qualifiedName, candidateIds: lookup.qualifiedName === 'pkg::Type.leaf' ? ['qualified-id'] : [] };
            if (lookup.kind === 'FileNodes') return { kind: 'FileNodes' as const, filePath: lookup.filePath, candidateIds: lookup.filePath === 'src/c.ts' ? ['qualified-id', 'file-node-id'] : [] };
            throw new Error(`unexpected lookup ${lookup.kind}`);
          }),
          diagnostics: {
            enabled: true,
            shadowMode: true,
            producerMs: 1,
            serializationMs: 1,
            subprocessMs: 1,
            lookupCount: lookups.length,
            lookupShapeCounts: {
              ExactName: lookups.filter((lookup) => lookup.kind === 'ExactName').length,
              LowerName: lookups.filter((lookup) => lookup.kind === 'LowerName').length,
              QualifiedName: lookups.filter((lookup) => lookup.kind === 'QualifiedName').length,
              FileNodes: lookups.filter((lookup) => lookup.kind === 'FileNodes').length,
              KnownNamePresence: lookups.filter((lookup) => lookup.kind === 'KnownNamePresence').length,
            },
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
        };
      },
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([target, lower, qualified, fileNode]),
    });

    provider.prepareRustCandidateProducerRouting([{ referenceName: 'target' }]);

    expect(provider.lookupNodes({ kind: 'LowerName', lowerName: 'mixedcase' }).map((item) => item.id)).toEqual(['lower-id']);
    expect(provider.lookupNodes({ kind: 'LowerName', lowerName: 'mixedcase' }).map((item) => item.id)).toEqual(['lower-id']);
    expect(provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'pkg::Type.leaf' }).map((item) => item.id)).toEqual(['qualified-id']);
    expect(provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'pkg::Type.leaf' }).map((item) => item.id)).toEqual(['qualified-id']);
    expect(provider.lookupNodes({ kind: 'FileNodes', filePath: 'src/c.ts' }).map((item) => item.id).sort()).toEqual([
      'file-node-id',
      'qualified-id',
    ]);
    expect(provider.lookupNodes({ kind: 'FileNodes', filePath: 'src/c.ts' }).map((item) => item.id).sort()).toEqual([
      'file-node-id',
      'qualified-id',
    ]);
    expect(producerLookups.filter((entry) => entry === 'LowerName:mixedcase')).toHaveLength(1);
    expect(producerLookups.filter((entry) => entry === 'QualifiedName:pkg::Type.leaf')).toHaveLength(1);
    expect(producerLookups.filter((entry) => entry === 'FileNodes:src/c.ts')).toHaveLength(1);
    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: true,
      activeShapes: ['ExactName', 'KnownNamePresence', 'LowerName', 'QualifiedName', 'FileNodes'],
      onDemandLookupCount: 3,
      onDemandLookupShapeCounts: {
        ExactName: 0,
        LowerName: 1,
        QualifiedName: 1,
        FileNodes: 1,
        KnownNamePresence: 0,
      },
      onDemandCacheHitCount: 0,
      qualifiedNameOnDemandSourceShapeCounts: {
        'colon-qualified-reference': 1,
      },
    });
  });

  it('prebatches FileNodes routing lookups from unresolved reference file paths with diagnostics', () => {
    const fileNode = node('file-node-id', {
      name: 'fileLeaf',
      qualifiedName: 'src/c.ts::fileLeaf',
      filePath: 'src/c.ts',
    });
    const producerLookups: string[] = [];
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => {
        producerLookups.push(...lookups.map((lookup) => {
          if (lookup.kind === 'FileNodes') return `FileNodes:${lookup.filePath}`;
          return lookup.kind;
        }));
        return {
          results: lookups.map((lookup) => {
            if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] };
            if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: false };
            if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: [] };
            if (lookup.kind === 'QualifiedName') return { kind: 'QualifiedName' as const, qualifiedName: lookup.qualifiedName, candidateIds: [] };
            return { kind: 'FileNodes' as const, filePath: lookup.filePath, candidateIds: lookup.filePath === 'src/c.ts' ? ['file-node-id'] : [] };
          }),
          diagnostics: rustProducerDiagnostics(lookups),
        };
      },
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([fileNode]),
    });

    provider.prepareRustCandidateProducerRouting([
      { referenceName: 'missing', filePath: 'src/c.ts' },
      { referenceName: 'missingAgain', filePath: 'src/c.ts' },
    ]);

    expect(provider.lookupNodes({ kind: 'FileNodes', filePath: 'src/c.ts' }).map((item) => item.id)).toEqual([
      'file-node-id',
    ]);
    expect(producerLookups.filter((entry) => entry === 'FileNodes:src/c.ts')).toHaveLength(1);

    const diagnostics = provider.snapshotDiagnostics();
    expect(diagnostics.fileNodesLookup).toMatchObject({
      requestedCount: 1,
      reusedCount: 1,
      missedCount: 0,
      fallbackCount: 0,
    });
    expect(diagnostics.rustCandidateProducer.routing).toMatchObject({
      onDemandLookupShapeCounts: {
        FileNodes: 0,
      },
    });
  });

  it('classifies residual QualifiedName on-demand lookups by source shape', () => {
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => ({
        results: lookups.map((lookup) => {
          if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] };
          if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: false };
          if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: [] };
          if (lookup.kind === 'QualifiedName') return { kind: 'QualifiedName' as const, qualifiedName: lookup.qualifiedName, candidateIds: [] };
          return { kind: 'FileNodes' as const, filePath: lookup.filePath, candidateIds: [] };
        }),
        diagnostics: rustProducerDiagnostics(lookups),
      }),
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([]),
    });

    provider.prepareRustCandidateProducerRouting([]);
    provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'Widget' });
    provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'obj.method' });
    provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'crate::module::leaf' });
    provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'src/module.ts::helper' });
    provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: '' });

    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing.qualifiedNameOnDemandSourceShapeCounts)
      .toEqual({
        'bare-name-qualified-check': 1,
        'dotted-reference': 1,
        'colon-qualified-reference': 1,
        'external-or-path-like-excluded': 1,
        unknown: 1,
      });
  });

  it('prebatches dotted QualifiedName routing results while leaving colon-qualified lookups on demand', () => {
    const dotted = node('dotted-id', {
      name: 'method',
      qualifiedName: 'obj.method',
      filePath: 'src/dotted.ts',
    });
    const colon = node('colon-id', {
      name: 'leaf',
      qualifiedName: 'crate::module::leaf',
      filePath: 'src/colon.ts',
    });
    const producerLookups: string[] = [];
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => {
        producerLookups.push(...lookups.map((lookup) => {
          if (lookup.kind === 'QualifiedName') return `QualifiedName:${lookup.qualifiedName}`;
          if (lookup.kind === 'LowerName') return `LowerName:${lookup.lowerName}`;
          return lookup.kind;
        }));
        return {
          results: lookups.map((lookup) => {
            if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] };
            if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: false };
            if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: [] };
            if (lookup.kind === 'QualifiedName') {
              return {
                kind: 'QualifiedName' as const,
                qualifiedName: lookup.qualifiedName,
                candidateIds: lookup.qualifiedName === 'obj.method' ? ['dotted-id'] : ['colon-id'],
              };
            }
            return { kind: 'FileNodes' as const, filePath: lookup.filePath, candidateIds: [] };
          }),
          diagnostics: rustProducerDiagnostics(lookups),
        };
      },
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([dotted, colon]),
    });

    provider.prepareRustCandidateProducerRouting([
      { referenceName: 'obj.method' },
      { referenceName: 'crate::module::leaf' },
    ]);

    expect(producerLookups).toContain('QualifiedName:obj.method');
    expect(producerLookups).toContain('QualifiedName:crate::module::leaf');
    expect(provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'obj.method' }).map((item) => item.id))
      .toEqual(['dotted-id']);
    expect(provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'crate::module::leaf' }).map((item) => item.id))
      .toEqual(['colon-id']);
    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: true,
      onDemandLookupShapeCounts: {
        QualifiedName: 1,
      },
      qualifiedNameOnDemandSourceShapeCounts: {
        'colon-qualified-reference': 1,
      },
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
          { kind: 'LowerName', lowerName: 'target', candidateIds: ['target-id'] },
        ],
        diagnostics: {
          enabled: true,
          shadowMode: true,
          producerMs: 1,
          serializationMs: 1,
          subprocessMs: 1,
          lookupCount: 3,
          lookupShapeCounts: { ExactName: 1, LowerName: 1, QualifiedName: 0, FileNodes: 0, KnownNamePresence: 1 },
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

  it('fails closed to TypeScript baseline when on-demand LowerName output mismatches', () => {
    const lower = node('lower-id', { name: 'MixedCase' });
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => ({
        results: lookups.map((lookup) => {
          if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] };
          if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: false };
          if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: [] };
          throw new Error(`unexpected lookup ${lookup.kind}`);
        }),
        diagnostics: {
          enabled: true,
          shadowMode: true,
          producerMs: 1,
          serializationMs: 1,
          subprocessMs: 1,
          lookupCount: lookups.length,
          lookupShapeCounts: { ExactName: 0, LowerName: lookups.filter((lookup) => lookup.kind === 'LowerName').length, QualifiedName: 0, FileNodes: 0, KnownNamePresence: 0 },
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
      source: makeSource([lower]),
    });

    provider.prepareRustCandidateProducerRouting([]);

    expect(provider.lookupNodes({ kind: 'LowerName', lowerName: 'mixedcase' }).map((item) => item.id)).toEqual(['lower-id']);
    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: false,
      fallbackReason: 'candidate-id-mismatch',
      mismatchCount: 1,
      onDemandLookupCount: 1,
    });
  });

  it('fails closed to TypeScript baseline when on-demand LowerName producer fails', () => {
    const lower = node('lower-id', { name: 'MixedCase' });
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => ({
        results: lookups.some((lookup) => lookup.kind === 'LowerName')
          ? []
          : lookups.map((lookup) =>
            lookup.kind === 'ExactName'
              ? { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] }
              : { kind: 'KnownNamePresence' as const, name: lookup.name, present: false }
          ),
        diagnostics: {
          enabled: true,
          shadowMode: true,
          producerMs: 1,
          serializationMs: 1,
          subprocessMs: 1,
          lookupCount: lookups.length,
          lookupShapeCounts: { ExactName: 0, LowerName: lookups.filter((lookup) => lookup.kind === 'LowerName').length, QualifiedName: 0, FileNodes: 0, KnownNamePresence: 0 },
          comparedCount: 0,
          mismatchCount: 0,
          mismatchReasons: {},
          mismatchSamples: [],
          candidateCount: 0,
          payloadBytes: 10,
          disabledReason: lookups.some((lookup) => lookup.kind === 'LowerName') ? 'producer-subprocess-failed' : null,
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
      source: makeSource([lower]),
    });

    provider.prepareRustCandidateProducerRouting([]);

    expect(provider.lookupNodes({ kind: 'LowerName', lowerName: 'mixedcase' }).map((item) => item.id)).toEqual(['lower-id']);
    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: false,
      fallbackReason: 'producer-subprocess-failed',
      onDemandLookupCount: 1,
    });
  });

  it('fails closed to TypeScript baseline when an on-demand routed result is missing', () => {
    const qualified = node('qualified-id', {
      name: 'leaf',
      qualifiedName: 'pkg::Type.leaf',
      filePath: 'src/c.ts',
    });
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => ({
        results: lookups
          .filter((lookup) => lookup.kind !== 'QualifiedName')
          .map((lookup) => {
            if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] };
            if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: false };
            if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: [] };
            return { kind: 'FileNodes' as const, filePath: lookup.filePath, candidateIds: [] };
          }),
        diagnostics: rustProducerDiagnostics(lookups),
      }),
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([qualified]),
    });

    provider.prepareRustCandidateProducerRouting([]);

    expect(provider.lookupNodes({ kind: 'QualifiedName', qualifiedName: 'pkg::Type.leaf' }).map((item) => item.id)).toEqual(['qualified-id']);
    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: false,
      fallbackReason: 'missing-rust-result',
      mismatchCount: 1,
      onDemandLookupShapeCounts: {
        QualifiedName: 1,
      },
    });
  });

  it('fails closed to TypeScript baseline when an on-demand routed id cannot be hydrated', () => {
    const fileNode = node('file-node-id', {
      name: 'fileLeaf',
      qualifiedName: 'src/c.ts::fileLeaf',
      filePath: 'src/c.ts',
    });
    const provider = new CandidateProtocolProvider({
      enabled: true,
      compareWithBaseline: true,
      indexPath: '/tmp/zcodegraph.db',
      candidateProducerRouting: { enabled: true, source: 'local-config' },
      rustProducerRunner: ({ lookups }) => ({
        results: lookups.map((lookup) => {
          if (lookup.kind === 'ExactName') return { kind: 'ExactName' as const, name: lookup.name, candidateIds: [] };
          if (lookup.kind === 'KnownNamePresence') return { kind: 'KnownNamePresence' as const, name: lookup.name, present: false };
          if (lookup.kind === 'LowerName') return { kind: 'LowerName' as const, lowerName: lookup.lowerName, candidateIds: [] };
          if (lookup.kind === 'QualifiedName') return { kind: 'QualifiedName' as const, qualifiedName: lookup.qualifiedName, candidateIds: [] };
          return { kind: 'FileNodes' as const, filePath: lookup.filePath, candidateIds: ['file-node-id', 'missing-id'] };
        }),
        diagnostics: rustProducerDiagnostics(lookups),
      }),
      caches: {
        fileNodes: new LRUCache(100),
        exactName: new LRUCache(100),
        lowerName: new LRUCache(100),
        qualifiedName: new LRUCache(100),
      },
      source: makeSource([fileNode]),
    });

    provider.prepareRustCandidateProducerRouting([]);

    expect(provider.lookupNodes({ kind: 'FileNodes', filePath: 'src/c.ts' }).map((item) => item.id)).toEqual(['file-node-id']);
    expect(provider.snapshotDiagnostics().rustCandidateProducer.routing).toMatchObject({
      active: false,
      fallbackReason: 'node-hydration-miss',
      mismatchCount: 1,
      onDemandLookupShapeCounts: {
        FileNodes: 1,
      },
    });
  });
});
