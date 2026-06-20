import { Node } from '../types';
import { LRUCache } from './lru-cache';
import {
  emptyRustCandidateProducerDiagnostics,
  runRustCandidateProducer,
  rustCandidateProducerEnabled,
  type RustCandidateProducerDiagnostics,
  type RustCandidateProducerLookup,
  type RustCandidateProducerMismatch,
} from './rust-candidate-producer';

export type CandidateLookupShape =
  | { kind: 'ExactName'; name: string }
  | { kind: 'LowerName'; lowerName: string }
  | { kind: 'QualifiedName'; qualifiedName: string }
  | { kind: 'FileNodes'; filePath: string }
  | { kind: 'KnownNamePresence'; name: string };

export interface CandidateFact {
  id: string;
  kind: Node['kind'];
  name: string;
  qualifiedName: string;
  filePath: string;
  language: Node['language'];
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  isExported?: boolean;
  isAsync?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  visibility?: Node['visibility'];
}

export interface CandidateProtocolDiagnostics {
  enabled: boolean;
  materializationMs: number;
  lookupMs: number;
  lookupCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  dbLookupCount: number;
  candidateCount: number;
  lookupShapeCounts: Record<CandidateLookupShape['kind'], number>;
  lookupShapeMs: Record<CandidateLookupShape['kind'], number>;
  equivalenceComparedCount: number;
  equivalenceMismatchCount: number;
  fallbackReasons: Record<string, number>;
  disabledReason: string | null;
  rustCandidateProducer: RustCandidateProducerDiagnostics;
}

interface CandidateProtocolCaches {
  fileNodes: LRUCache<string, Node[]>;
  exactName: LRUCache<string, Node[]>;
  lowerName: LRUCache<string, Node[]>;
  qualifiedName: LRUCache<string, Node[]>;
}

interface CandidateProtocolSource {
  getNodesInFile(filePath: string): Node[];
  getNodesByName(name: string): Node[];
  getNodesByLowerName(lowerName: string): Node[];
  getNodesByQualifiedName(qualifiedName: string): Node[];
  getKnownNames(): Set<string> | null;
}

export function candidateProtocolEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.ZCODEGRAPH_CANDIDATE_PROTOCOL;
  return raw !== '0' && raw !== 'false';
}

export function candidateProtocolEquivalenceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE;
  return raw === '1' || raw === 'true';
}

export function toCandidateFact(node: Node): CandidateFact {
  return {
    id: node.id,
    kind: node.kind,
    name: node.name,
    qualifiedName: node.qualifiedName,
    filePath: node.filePath,
    language: node.language,
    startLine: node.startLine,
    endLine: node.endLine,
    startColumn: node.startColumn,
    endColumn: node.endColumn,
    isExported: node.isExported,
    isAsync: node.isAsync,
    isStatic: node.isStatic,
    isAbstract: node.isAbstract,
    visibility: node.visibility,
  };
}

export class CandidateProtocolProvider {
  private readonly enabled: boolean;
  private readonly compareWithBaseline: boolean;
  private readonly rustProducerEnabled: boolean;
  private readonly indexPath: string | null;
  private readonly caches: CandidateProtocolCaches;
  private readonly source: CandidateProtocolSource;
  private readonly candidateIds = new Set<string>();
  private readonly exactNameBaselines = new Map<string, string[]>();
  private readonly lowerNameBaselines = new Map<string, string[]>();
  private readonly qualifiedNameBaselines = new Map<string, string[]>();
  private readonly fileNodesBaselines = new Map<string, string[]>();
  private readonly knownNameBaselines = new Map<string, boolean>();
  private diagnostics: Omit<CandidateProtocolDiagnostics, 'enabled' | 'candidateCount' | 'disabledReason' | 'rustCandidateProducer'>;

  constructor(options: {
    enabled: boolean;
    compareWithBaseline?: boolean;
    indexPath?: string | null;
    rustProducerEnabled?: boolean;
    caches: CandidateProtocolCaches;
    source: CandidateProtocolSource;
  }) {
    this.enabled = options.enabled;
    this.compareWithBaseline = options.compareWithBaseline ?? candidateProtocolEquivalenceEnabled();
    this.rustProducerEnabled = options.rustProducerEnabled ?? rustCandidateProducerEnabled();
    this.indexPath = options.indexPath ?? null;
    this.caches = options.caches;
    this.source = options.source;
    this.diagnostics = this.emptyDiagnostics();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  hasCached(lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>): boolean {
    return this.cacheFor(lookup).has(this.keyFor(lookup));
  }

  lookupNodes(lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>): Node[] {
    const started = Date.now();
    this.recordLookup(lookup.kind);
    const cache = this.cacheFor(lookup);
    const key = this.keyFor(lookup);
    const cached = cache.get(key);
    if (cached !== undefined) {
      this.diagnostics.cacheHitCount += 1;
      this.compareNodeLookup(lookup, cached);
      this.recordLookupMs(lookup.kind, started);
      return cached;
    }

    this.diagnostics.cacheMissCount += 1;
    this.diagnostics.dbLookupCount += 1;
    const result = this.readThrough(lookup);
    cache.set(key, result);
    for (const node of result) {
      this.candidateIds.add(toCandidateFact(node).id);
    }
    this.recordRustProducerNodeBaseline(lookup, result);
    this.compareNodeLookup(lookup, result);
    this.recordLookupMs(lookup.kind, started);
    return result;
  }

  hasKnownName(name: string): boolean | null {
    const started = Date.now();
    this.recordLookup('KnownNamePresence');
    const knownNames = this.source.getKnownNames();
    const result = knownNames ? knownNames.has(name) : null;
    if (result !== null) {
      this.knownNameBaselines.set(name, result);
    }
    this.compareKnownNamePresence(name, result);
    this.recordLookupMs('KnownNamePresence', started);
    return result;
  }

  resetDiagnostics(): void {
    this.candidateIds.clear();
    this.exactNameBaselines.clear();
    this.lowerNameBaselines.clear();
    this.qualifiedNameBaselines.clear();
    this.fileNodesBaselines.clear();
    this.knownNameBaselines.clear();
    this.diagnostics = this.emptyDiagnostics();
  }

  snapshotDiagnostics(): CandidateProtocolDiagnostics {
    const rustCandidateProducer = this.snapshotRustProducerDiagnostics();
    return {
      enabled: this.enabled,
      ...this.diagnostics,
      candidateCount: this.candidateIds.size,
      disabledReason: this.enabled ? null : 'disabled-by-env',
      rustCandidateProducer,
    };
  }

  private emptyDiagnostics(): Omit<CandidateProtocolDiagnostics, 'enabled' | 'candidateCount' | 'disabledReason' | 'rustCandidateProducer'> {
    return {
      materializationMs: 0,
      lookupMs: 0,
      lookupCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
      dbLookupCount: 0,
      lookupShapeCounts: {
        ExactName: 0,
        LowerName: 0,
        QualifiedName: 0,
        FileNodes: 0,
        KnownNamePresence: 0,
      },
      lookupShapeMs: {
        ExactName: 0,
        LowerName: 0,
        QualifiedName: 0,
        FileNodes: 0,
        KnownNamePresence: 0,
      },
      equivalenceComparedCount: 0,
      equivalenceMismatchCount: 0,
      fallbackReasons: {},
    };
  }

  private snapshotRustProducerDiagnostics(): RustCandidateProducerDiagnostics {
    if (!this.rustProducerEnabled) {
      return emptyRustCandidateProducerDiagnostics(false, 'disabled-by-env');
    }
    if (!this.indexPath) {
      return emptyRustCandidateProducerDiagnostics(true, 'missing-index-path');
    }

    const lookups: RustCandidateProducerLookup[] = [
      ...this.exactNameBaselines.keys(),
    ].map((name) => ({ kind: 'ExactName' as const, name }));
    for (const lowerName of this.lowerNameBaselines.keys()) {
      lookups.push({ kind: 'LowerName', lowerName });
    }
    for (const qualifiedName of this.qualifiedNameBaselines.keys()) {
      lookups.push({ kind: 'QualifiedName', qualifiedName });
    }
    for (const filePath of this.fileNodesBaselines.keys()) {
      lookups.push({ kind: 'FileNodes', filePath });
    }
    for (const name of this.knownNameBaselines.keys()) {
      lookups.push({ kind: 'KnownNamePresence', name });
    }

    const { results, diagnostics } = runRustCandidateProducer({
      indexPath: this.indexPath,
      lookups,
    });
    const exactResults = new Map<string, string[]>();
    const lowerResults = new Map<string, string[]>();
    const qualifiedResults = new Map<string, string[]>();
    const fileResults = new Map<string, string[]>();
    const presenceResults = new Map<string, boolean>();
    for (const result of results) {
      if (result.kind === 'ExactName') {
        exactResults.set(result.name, result.candidateIds);
      } else if (result.kind === 'LowerName') {
        lowerResults.set(result.lowerName, result.candidateIds);
      } else if (result.kind === 'QualifiedName') {
        qualifiedResults.set(result.qualifiedName, result.candidateIds);
      } else if (result.kind === 'FileNodes') {
        fileResults.set(result.filePath, result.candidateIds);
      } else {
        presenceResults.set(result.name, result.present);
      }
    }

    for (const [name, tsCandidateIds] of this.exactNameBaselines) {
      const rustCandidateIds = exactResults.get(name);
      diagnostics.comparedCount += 1;
      if (!rustCandidateIds) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'ExactName',
          key: name,
          reason: 'missing-rust-result',
          tsCandidateIds,
          rustCandidateIds: [],
        });
      } else if (!sameStringSet(tsCandidateIds, rustCandidateIds)) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'ExactName',
          key: name,
          reason: 'different-candidate-set',
          tsCandidateIds,
          rustCandidateIds,
        });
      }
    }

    for (const [lowerName, tsCandidateIds] of this.lowerNameBaselines) {
      const rustCandidateIds = lowerResults.get(lowerName);
      diagnostics.comparedCount += 1;
      if (!rustCandidateIds) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'LowerName',
          key: lowerName,
          reason: 'missing-rust-result',
          tsCandidateIds,
          rustCandidateIds: [],
        });
      } else if (!sameStringSet(tsCandidateIds, rustCandidateIds)) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'LowerName',
          key: lowerName,
          reason: 'different-candidate-set',
          tsCandidateIds,
          rustCandidateIds,
        });
      }
    }

    for (const [qualifiedName, tsCandidateIds] of this.qualifiedNameBaselines) {
      const rustCandidateIds = qualifiedResults.get(qualifiedName);
      diagnostics.comparedCount += 1;
      if (!rustCandidateIds) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'QualifiedName',
          key: qualifiedName,
          reason: 'missing-rust-result',
          tsCandidateIds,
          rustCandidateIds: [],
        });
      } else if (!sameStringSet(tsCandidateIds, rustCandidateIds)) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'QualifiedName',
          key: qualifiedName,
          reason: 'different-candidate-set',
          tsCandidateIds,
          rustCandidateIds,
        });
      }
    }

    for (const [filePath, tsCandidateIds] of this.fileNodesBaselines) {
      const rustCandidateIds = fileResults.get(filePath);
      diagnostics.comparedCount += 1;
      if (!rustCandidateIds) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'FileNodes',
          key: filePath,
          reason: 'missing-rust-result',
          tsCandidateIds,
          rustCandidateIds: [],
        });
      } else if (!sameStringSet(tsCandidateIds, rustCandidateIds)) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'FileNodes',
          key: filePath,
          reason: 'different-candidate-set',
          tsCandidateIds,
          rustCandidateIds,
        });
      }
    }

    for (const [name, tsPresent] of this.knownNameBaselines) {
      const rustPresent = presenceResults.get(name);
      diagnostics.comparedCount += 1;
      if (rustPresent === undefined) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'KnownNamePresence',
          key: name,
          reason: 'missing-rust-result',
          tsPresent,
          rustPresent: false,
        });
      } else if (rustPresent !== tsPresent) {
        this.recordRustProducerMismatch(diagnostics, {
          kind: 'KnownNamePresence',
          key: name,
          reason: 'different-presence',
          tsPresent,
          rustPresent,
        });
      }
    }

    return diagnostics;
  }

  private recordRustProducerMismatch(
    diagnostics: RustCandidateProducerDiagnostics,
    mismatch: RustCandidateProducerMismatch,
  ): void {
    diagnostics.mismatchCount += 1;
    diagnostics.mismatchReasons[mismatch.reason] = (diagnostics.mismatchReasons[mismatch.reason] ?? 0) + 1;
    if (diagnostics.mismatchSamples.length < 50) {
      diagnostics.mismatchSamples.push(mismatch);
    }
  }

  private recordRustProducerNodeBaseline(
    lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>,
    nodes: Node[],
  ): void {
    if (lookup.kind === 'ExactName') {
      this.exactNameBaselines.set(lookup.name, nodes.map((node) => node.id));
    } else if (lookup.kind === 'LowerName') {
      this.lowerNameBaselines.set(lookup.lowerName, nodes.map((node) => node.id));
    } else if (lookup.kind === 'QualifiedName') {
      this.qualifiedNameBaselines.set(lookup.qualifiedName, nodes.map((node) => node.id));
    } else if (lookup.kind === 'FileNodes') {
      this.fileNodesBaselines.set(lookup.filePath, nodes.map((node) => node.id));
    }
  }

  private cacheFor(lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>): LRUCache<string, Node[]> {
    switch (lookup.kind) {
      case 'ExactName':
        return this.caches.exactName;
      case 'LowerName':
        return this.caches.lowerName;
      case 'QualifiedName':
        return this.caches.qualifiedName;
      case 'FileNodes':
        return this.caches.fileNodes;
    }
  }

  private keyFor(lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>): string {
    switch (lookup.kind) {
      case 'ExactName':
        return lookup.name;
      case 'LowerName':
        return lookup.lowerName;
      case 'QualifiedName':
        return lookup.qualifiedName;
      case 'FileNodes':
        return lookup.filePath;
    }
  }

  private readThrough(lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>): Node[] {
    switch (lookup.kind) {
      case 'ExactName':
        return this.source.getNodesByName(lookup.name);
      case 'LowerName':
        return this.source.getNodesByLowerName(lookup.lowerName);
      case 'QualifiedName':
        return this.source.getNodesByQualifiedName(lookup.qualifiedName);
      case 'FileNodes':
        return this.source.getNodesInFile(lookup.filePath);
    }
  }

  private compareNodeLookup(lookup: Exclude<CandidateLookupShape, { kind: 'KnownNamePresence' }>, protocolResult: Node[]): void {
    if (!this.compareWithBaseline) return;
    this.diagnostics.equivalenceComparedCount += 1;
    const baseline = this.readThrough(lookup);
    if (!sameNodeIdSet(protocolResult, baseline)) {
      this.diagnostics.equivalenceMismatchCount += 1;
    }
  }

  private compareKnownNamePresence(name: string, protocolResult: boolean | null): void {
    if (!this.compareWithBaseline) return;
    this.diagnostics.equivalenceComparedCount += 1;
    const knownNames = this.source.getKnownNames();
    const baseline = knownNames ? knownNames.has(name) : null;
    if (protocolResult !== baseline) {
      this.diagnostics.equivalenceMismatchCount += 1;
    }
  }

  private recordLookup(kind: CandidateLookupShape['kind']): void {
    this.diagnostics.lookupCount += 1;
    this.diagnostics.lookupShapeCounts[kind] += 1;
  }

  private recordLookupMs(kind: CandidateLookupShape['kind'], started: number): void {
    const elapsed = Math.max(0, Date.now() - started);
    this.diagnostics.lookupMs += elapsed;
    this.diagnostics.lookupShapeMs[kind] += elapsed;
  }
}

function sameNodeIdSet(a: Node[], b: Node[]): boolean {
  if (a.length !== b.length) return false;
  const aIds = new Set(a.map((node) => node.id));
  if (aIds.size !== b.length) return false;
  return b.every((node) => aIds.has(node.id));
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  if (aSet.size !== b.length) return false;
  return b.every((value) => aSet.has(value));
}
