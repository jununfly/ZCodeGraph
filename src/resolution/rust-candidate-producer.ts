import { spawnSync } from 'child_process';
import { findRustCoreCommand } from '../indexing/rust-indexer';

export type RustCandidateProducerLookup =
  | { kind: 'ExactName'; name: string }
  | { kind: 'LowerName'; lowerName: string }
  | { kind: 'QualifiedName'; qualifiedName: string }
  | { kind: 'FileNodes'; filePath: string }
  | { kind: 'KnownNamePresence'; name: string };

export interface RustCandidateProducerDiagnostics {
  enabled: boolean;
  shadowMode: boolean;
  producerMs: number;
  serializationMs: number;
  subprocessMs: number;
  lookupCount: number;
  lookupShapeCounts: Record<RustCandidateProducerLookup['kind'], number>;
  comparedCount: number;
  mismatchCount: number;
  mismatchReasons: Record<string, number>;
  mismatchSamples: RustCandidateProducerMismatch[];
  candidateCount: number;
  payloadBytes: number;
  disabledReason: string | null;
  routing: {
    configured: boolean;
    source: 'missing-config' | 'local-config' | 'invalid-local-config';
    active: boolean;
    activeShapes: Array<'ExactName' | 'KnownNamePresence' | 'LowerName'>;
    fallbackReason: string | null;
    mismatchCount: number;
    mismatchSamples: RustCandidateProducerMismatch[];
    onDemandLookupCount?: number;
    onDemandLookupShapeCounts?: Record<RustCandidateProducerLookup['kind'], number>;
    onDemandCacheHitCount?: number;
    invalidConfigReason?: string;
  };
}

export interface RustCandidateProducerMismatch {
  kind: RustCandidateProducerLookup['kind'];
  key: string;
  reason: 'different-candidate-set' | 'different-presence' | 'missing-rust-result';
  tsCandidateIds?: string[];
  rustCandidateIds?: string[];
  tsPresent?: boolean;
  rustPresent?: boolean;
}

export type RustCandidateProducerResult =
  | { kind: 'ExactName'; name: string; candidateIds: string[] }
  | { kind: 'LowerName'; lowerName: string; candidateIds: string[] }
  | { kind: 'QualifiedName'; qualifiedName: string; candidateIds: string[] }
  | { kind: 'FileNodes'; filePath: string; candidateIds: string[] }
  | { kind: 'KnownNamePresence'; name: string; present: boolean };

interface RustCandidateProducerResponse {
  type: 'candidate_producer_result';
  version: 1;
  results: RustCandidateProducerResult[];
  diagnostics?: {
    producerMs?: number;
    lookupCount?: number;
    exactNameCount?: number;
    knownNamePresenceCount?: number;
    candidateCount?: number;
  };
}

export function rustCandidateProducerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.ZCODEGRAPH_RUST_CANDIDATE_PRODUCER;
  return raw === '1' || raw === 'true';
}

export function emptyRustCandidateProducerDiagnostics(
  enabled = rustCandidateProducerEnabled(),
  disabledReason: string | null = enabled ? null : 'disabled-by-env',
): RustCandidateProducerDiagnostics {
  return {
    enabled,
    shadowMode: true,
    producerMs: 0,
    serializationMs: 0,
    subprocessMs: 0,
    lookupCount: 0,
    lookupShapeCounts: {
      ExactName: 0,
      LowerName: 0,
      QualifiedName: 0,
      FileNodes: 0,
      KnownNamePresence: 0,
    },
    comparedCount: 0,
    mismatchCount: 0,
    mismatchReasons: {},
    mismatchSamples: [],
    candidateCount: 0,
    payloadBytes: 0,
    disabledReason,
    routing: {
      configured: false,
      source: 'missing-config',
      active: false,
      activeShapes: [],
      fallbackReason: null,
      mismatchCount: 0,
      mismatchSamples: [],
      onDemandLookupCount: 0,
      onDemandLookupShapeCounts: {
        ExactName: 0,
        LowerName: 0,
        QualifiedName: 0,
        FileNodes: 0,
        KnownNamePresence: 0,
      },
      onDemandCacheHitCount: 0,
    },
  };
}

export function runRustCandidateProducer(options: {
  indexPath: string;
  lookups: RustCandidateProducerLookup[];
}): {
  results: RustCandidateProducerResult[];
  diagnostics: RustCandidateProducerDiagnostics;
} {
  const diagnostics = emptyRustCandidateProducerDiagnostics(true, null);
  diagnostics.lookupCount = options.lookups.length;
  diagnostics.lookupShapeCounts.ExactName = options.lookups.filter((lookup) => lookup.kind === 'ExactName').length;
  diagnostics.lookupShapeCounts.LowerName = options.lookups.filter((lookup) => lookup.kind === 'LowerName').length;
  diagnostics.lookupShapeCounts.QualifiedName = options.lookups.filter((lookup) => lookup.kind === 'QualifiedName').length;
  diagnostics.lookupShapeCounts.FileNodes = options.lookups.filter((lookup) => lookup.kind === 'FileNodes').length;
  diagnostics.lookupShapeCounts.KnownNamePresence = options.lookups.filter((lookup) => lookup.kind === 'KnownNamePresence').length;

  if (options.lookups.length === 0) {
    return { results: [], diagnostics };
  }

  let payload = '';
  const serializationStarted = Date.now();
  try {
    payload = JSON.stringify({
      version: 1,
      indexPath: options.indexPath,
      lookups: options.lookups,
    });
    diagnostics.payloadBytes = Buffer.byteLength(payload, 'utf8');
  } catch {
    diagnostics.disabledReason = 'serialization-error';
    return { results: [], diagnostics };
  } finally {
    diagnostics.serializationMs = Math.max(0, Date.now() - serializationStarted);
  }

  let command;
  try {
    command = findRustCoreCommand();
  } catch {
    diagnostics.disabledReason = 'rust-core-unavailable';
    return { results: [], diagnostics };
  }

  const subprocessStarted = Date.now();
  const result = spawnSync(command.command, [...command.argsPrefix, 'produce-candidates'], {
    cwd: command.cwd,
    env: process.env,
    input: payload,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  diagnostics.subprocessMs = Math.max(0, Date.now() - subprocessStarted);
  if (result.error || result.status !== 0) {
    diagnostics.disabledReason = 'producer-subprocess-failed';
    return { results: [], diagnostics };
  }

  try {
    const parsed = JSON.parse(result.stdout) as RustCandidateProducerResponse;
    if (parsed.type !== 'candidate_producer_result' || parsed.version !== 1) {
      diagnostics.disabledReason = 'invalid-producer-response';
      return { results: [], diagnostics };
    }
    diagnostics.producerMs = parsed.diagnostics?.producerMs ?? 0;
    diagnostics.candidateCount = parsed.diagnostics?.candidateCount ?? 0;
    return {
      results: parsed.results,
      diagnostics,
    };
  } catch {
    diagnostics.disabledReason = 'invalid-producer-json';
    return { results: [], diagnostics };
  }
}
