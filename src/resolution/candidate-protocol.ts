import { Node } from '../types';
import { LRUCache } from './lru-cache';

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
  private readonly caches: CandidateProtocolCaches;
  private readonly source: CandidateProtocolSource;
  private readonly candidateIds = new Set<string>();
  private diagnostics: Omit<CandidateProtocolDiagnostics, 'enabled' | 'candidateCount' | 'disabledReason'>;

  constructor(options: {
    enabled: boolean;
    compareWithBaseline?: boolean;
    caches: CandidateProtocolCaches;
    source: CandidateProtocolSource;
  }) {
    this.enabled = options.enabled;
    this.compareWithBaseline = options.compareWithBaseline ?? candidateProtocolEquivalenceEnabled();
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
    this.compareNodeLookup(lookup, result);
    this.recordLookupMs(lookup.kind, started);
    return result;
  }

  hasKnownName(name: string): boolean | null {
    const started = Date.now();
    this.recordLookup('KnownNamePresence');
    const knownNames = this.source.getKnownNames();
    const result = knownNames ? knownNames.has(name) : null;
    this.compareKnownNamePresence(name, result);
    this.recordLookupMs('KnownNamePresence', started);
    return result;
  }

  resetDiagnostics(): void {
    this.candidateIds.clear();
    this.diagnostics = this.emptyDiagnostics();
  }

  snapshotDiagnostics(): CandidateProtocolDiagnostics {
    return {
      enabled: this.enabled,
      ...this.diagnostics,
      candidateCount: this.candidateIds.size,
      disabledReason: this.enabled ? null : 'disabled-by-env',
    };
  }

  private emptyDiagnostics(): Omit<CandidateProtocolDiagnostics, 'enabled' | 'candidateCount' | 'disabledReason'> {
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
