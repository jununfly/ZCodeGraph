import { spawnSync } from 'child_process';
import { Node } from '../types';
import { findRustCoreCommand } from '../indexing/rust-indexer';
import { ResolvedRef, ResolutionContext, UnresolvedRef } from './types';
import { matchReference } from './name-matcher';

const JS_TS_LANGUAGES = new Set(['javascript', 'typescript', 'jsx', 'tsx']);

export interface RustNameMatcherCandidateSet {
  byName: Node[];
  byQualifiedName: Node[];
  byLeafName: Node[];
  byLowerName: Node[];
  byFileName: Node[];
  classCandidates: Node[];
  capitalizedClassCandidates: Node[];
  methodCandidates: Node[];
  nodesInFiles: Record<string, Node[]>;
}

export interface RustNameMatcherReference {
  key: string;
  ref: UnresolvedRef;
  candidates: RustNameMatcherCandidateSet;
}

interface RustNameMatcherCandidateIdSet {
  byName: string[];
  byQualifiedName: string[];
  byLeafName: string[];
  byLowerName: string[];
  byFileName: string[];
  classCandidates: string[];
  capitalizedClassCandidates: string[];
  methodCandidates: string[];
  nodesInFiles: Record<string, string[]>;
}

export interface RustNameMatcherDecision {
  key: string;
  targetNodeId: string | null;
  confidence: number;
  resolvedBy: ResolvedRef['resolvedBy'] | null;
  fallbackReason?: string;
}

export interface RustNameMatcherDiagnostics {
  rustMatcherMs: number;
  rustMatcherStartupMs: number;
  rustMatcherSerializationMs: number;
  rustMatcherEligibleRefs: number;
  rustMatcherHandledRefs: number;
  rustMatcherFallbackRefs: number;
  rustMatcherSemanticMismatchRefs: number;
  rustMatcherFallbackReasons: Record<string, number>;
  rustMatcherCandidateMaterializationMs: number;
  rustMatcherSubprocessMs: number;
  rustMatcherTsVerificationMs: number;
  rustMatcherPayloadBytes: number;
  rustMatcherUniqueCandidateFacts: number;
}

export interface RustNameMatcherBatchResult {
  decisions: Map<string, RustNameMatcherDecision>;
  diagnostics: RustNameMatcherDiagnostics;
}

export interface NameMatcherReplayMismatch {
  key: string;
  referenceName: string;
  referenceKind: string;
  filePath: string;
  language: string;
  baselineTargetNodeId: string | null;
  baselineResolvedBy: ResolvedRef['resolvedBy'] | null;
  baselineConfidence: number | null;
  replayTargetNodeId: string | null;
  replayResolvedBy: ResolvedRef['resolvedBy'] | null;
  replayConfidence: number | null;
  reason: 'different-target' | 'different-method' | 'different-confidence' | 'baseline-unresolved' | 'replay-unresolved';
}

export interface NameMatcherReplayEquivalence {
  totalRefs: number;
  eligibleRefs: number;
  replayedRefs: number;
  equivalentRefs: number;
  mismatchCount: number;
  mismatches: NameMatcherReplayMismatch[];
}

interface RustNameMatcherResponse {
  type: 'name_match_result';
  version: 1;
  decisions: RustNameMatcherDecision[];
  diagnostics?: Partial<RustNameMatcherDiagnostics>;
}

interface EncodedRustNameMatcherReference {
  key: string;
  ref: UnresolvedRef;
  candidateIds: RustNameMatcherCandidateIdSet;
}

export function rustNameMatcherEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.ZCODEGRAPH_RUST_NAME_MATCHER;
  return raw === '1' || raw === 'true';
}

export function rustNameMatcherStrict(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT;
  return raw === '1' || raw === 'true';
}

export function rustNameMatcherKey(ref: UnresolvedRef): string {
  return [
    ref.rowid ?? '',
    ref.fromNodeId,
    ref.referenceName,
    ref.referenceKind,
    ref.filePath,
    ref.line,
    ref.column,
    ref.language,
  ].join('\0');
}

export function isRustNameMatcherEligible(ref: UnresolvedRef): boolean {
  return JS_TS_LANGUAGES.has(ref.language);
}

export function collectRustNameMatcherReference(
  ref: UnresolvedRef,
  context: ResolutionContext,
): RustNameMatcherReference | null {
  if (!isRustNameMatcherEligible(ref)) return null;

  const { receiver, methodName } = parseMethodReference(ref.referenceName);
  const fileName = referenceFileName(ref.referenceName);
  const leafName = referenceLeafName(ref.referenceName);
  const capitalizedReceiver = receiver ? receiver.charAt(0).toUpperCase() + receiver.slice(1) : null;
  const classCandidates = receiver ? context.getNodesByName(receiver) : [];
  const capitalizedClassCandidates =
    capitalizedReceiver && capitalizedReceiver !== receiver
      ? context.getNodesByName(capitalizedReceiver)
      : [];
  const nodesInFiles: Record<string, Node[]> = {};
  for (const node of [...classCandidates, ...capitalizedClassCandidates]) {
    if (
      node.kind !== 'class' &&
      node.kind !== 'struct' &&
      node.kind !== 'interface'
    ) {
      continue;
    }
    nodesInFiles[node.filePath] ??= context.getNodesInFile(node.filePath);
  }

  return {
    key: rustNameMatcherKey(ref),
    ref,
    candidates: {
      byName: context.getNodesByName(ref.referenceName),
      byQualifiedName: looksQualified(ref.referenceName)
        ? context.getNodesByQualifiedName(ref.referenceName)
        : [],
      byLeafName: leafName ? context.getNodesByName(leafName) : [],
      byLowerName: context.getNodesByLowerName(ref.referenceName.toLowerCase()),
      byFileName: fileName ? context.getNodesByName(fileName) : [],
      classCandidates,
      capitalizedClassCandidates,
      methodCandidates: methodName ? context.getNodesByName(methodName) : [],
      nodesInFiles,
    },
  };
}

export function compareNameMatcherCandidateReplay(
  refs: UnresolvedRef[],
  context: ResolutionContext,
  maxMismatchSamples = 50,
): NameMatcherReplayEquivalence {
  let eligibleRefs = 0;
  let replayedRefs = 0;
  let equivalentRefs = 0;
  const mismatches: NameMatcherReplayMismatch[] = [];

  for (const ref of refs) {
    if (!isRustNameMatcherEligible(ref)) continue;
    eligibleRefs += 1;
    const candidate = collectRustNameMatcherReference(ref, context);
    if (!candidate) continue;
    replayedRefs += 1;

    const baseline = matchReference(ref, context);
    const replay = matchReference(ref, createCandidateSetResolutionContext(candidate, context));
    const reason = replayMismatchReason(baseline, replay);
    if (!reason) {
      equivalentRefs += 1;
      continue;
    }

    if (mismatches.length < maxMismatchSamples) {
      mismatches.push({
        key: candidate.key,
        referenceName: ref.referenceName,
        referenceKind: ref.referenceKind,
        filePath: ref.filePath,
        language: ref.language,
        baselineTargetNodeId: baseline?.targetNodeId ?? null,
        baselineResolvedBy: baseline?.resolvedBy ?? null,
        baselineConfidence: baseline?.confidence ?? null,
        replayTargetNodeId: replay?.targetNodeId ?? null,
        replayResolvedBy: replay?.resolvedBy ?? null,
        replayConfidence: replay?.confidence ?? null,
        reason,
      });
    }
  }

  return {
    totalRefs: refs.length,
    eligibleRefs,
    replayedRefs,
    equivalentRefs,
    mismatchCount: replayedRefs - equivalentRefs,
    mismatches,
  };
}

function createCandidateSetResolutionContext(
  entry: RustNameMatcherReference,
  baseline: ResolutionContext,
): ResolutionContext {
  const { ref, candidates } = entry;
  const { receiver, methodName } = parseMethodReference(ref.referenceName);
  const fileName = referenceFileName(ref.referenceName);
  const leafName = referenceLeafName(ref.referenceName);
  const capitalizedReceiver = receiver ? receiver.charAt(0).toUpperCase() + receiver.slice(1) : null;

  return {
    ...baseline,
    getNodesInFile: (filePath: string) => candidates.nodesInFiles[filePath] ?? [],
    getNodesByName: (name: string) => {
      if (name === ref.referenceName) return candidates.byName;
      if (leafName && name === leafName) return candidates.byLeafName;
      if (fileName && name === fileName) return candidates.byFileName;
      if (receiver && name === receiver) return candidates.classCandidates;
      if (capitalizedReceiver && name === capitalizedReceiver) return candidates.capitalizedClassCandidates;
      if (methodName && name === methodName) return candidates.methodCandidates;
      return [];
    },
    getNodesByQualifiedName: (qualifiedName: string) =>
      qualifiedName === ref.referenceName ? candidates.byQualifiedName : [],
    getNodesByLowerName: (lowerName: string) =>
      lowerName === ref.referenceName.toLowerCase() ? candidates.byLowerName : [],
  };
}

function replayMismatchReason(
  baseline: ResolvedRef | null,
  replay: ResolvedRef | null,
): NameMatcherReplayMismatch['reason'] | null {
  if (!baseline && !replay) return null;
  if (!baseline) return 'baseline-unresolved';
  if (!replay) return 'replay-unresolved';
  if (baseline.targetNodeId !== replay.targetNodeId) return 'different-target';
  if (baseline.resolvedBy !== replay.resolvedBy) return 'different-method';
  if (baseline.confidence !== replay.confidence) return 'different-confidence';
  return null;
}

export function runRustNameMatcherBatch(
  references: RustNameMatcherReference[],
): RustNameMatcherBatchResult {
  const fallbackReasons: Record<string, number> = {};
  const emptyDiagnostics = (reason: string): RustNameMatcherDiagnostics => {
    fallbackReasons[reason] = references.length;
    return {
      rustMatcherMs: 0,
      rustMatcherStartupMs: 0,
      rustMatcherSerializationMs: 0,
      rustMatcherEligibleRefs: references.length,
      rustMatcherHandledRefs: 0,
      rustMatcherFallbackRefs: references.length,
      rustMatcherSemanticMismatchRefs: 0,
      rustMatcherFallbackReasons: { ...fallbackReasons },
      rustMatcherCandidateMaterializationMs: 0,
      rustMatcherSubprocessMs: 0,
      rustMatcherTsVerificationMs: 0,
      rustMatcherPayloadBytes: 0,
      rustMatcherUniqueCandidateFacts: 0,
    };
  };

  if (references.length === 0) {
    return {
      decisions: new Map(),
      diagnostics: emptyDiagnostics('no-eligible-refs'),
    };
  }

  let serialized = '';
  let payloadBytes = 0;
  let uniqueCandidateFacts = 0;
  const serializationStarted = Date.now();
  try {
    const encoded = encodeRustNameMatcherBatch(references);
    uniqueCandidateFacts = Object.keys(encoded.candidateTable).length;
    serialized = JSON.stringify(encoded);
    payloadBytes = Buffer.byteLength(serialized, 'utf8');
  } catch {
    return {
      decisions: new Map(),
      diagnostics: emptyDiagnostics('serialization-error'),
    };
  }
  const rustMatcherSerializationMs = Date.now() - serializationStarted;

  let command;
  try {
    command = findRustCoreCommand();
  } catch {
    return {
      decisions: new Map(),
      diagnostics: {
        ...emptyDiagnostics('rust-core-unavailable'),
        rustMatcherSerializationMs,
      },
    };
  }

  const started = Date.now();
  const result = spawnSync(command.command, [...command.argsPrefix, 'match-name'], {
    cwd: command.cwd,
    env: process.env,
    input: serialized,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const rustMatcherMs = Date.now() - started;

  if (result.error || result.status !== 0) {
    return {
      decisions: new Map(),
      diagnostics: {
        ...emptyDiagnostics(result.error ? 'subprocess-error' : 'subprocess-nonzero-exit'),
        rustMatcherMs,
        rustMatcherStartupMs: rustMatcherMs,
        rustMatcherSubprocessMs: rustMatcherMs,
        rustMatcherSerializationMs,
        rustMatcherPayloadBytes: payloadBytes,
        rustMatcherUniqueCandidateFacts: uniqueCandidateFacts,
      },
    };
  }

  try {
    const parsed = JSON.parse(result.stdout) as RustNameMatcherResponse;
    if (parsed.type !== 'name_match_result' || parsed.version !== 1) {
      throw new Error('unexpected response');
    }
    const decisions = new Map(parsed.decisions.map((decision) => [decision.key, decision]));
    return {
      decisions,
      diagnostics: {
        rustMatcherMs,
        rustMatcherStartupMs: parsed.diagnostics?.rustMatcherStartupMs ?? rustMatcherMs,
        rustMatcherSubprocessMs: parsed.diagnostics?.rustMatcherSubprocessMs ?? rustMatcherMs,
        rustMatcherSerializationMs,
        rustMatcherEligibleRefs: parsed.diagnostics?.rustMatcherEligibleRefs ?? references.length,
        rustMatcherHandledRefs: parsed.diagnostics?.rustMatcherHandledRefs ?? decisions.size,
        rustMatcherFallbackRefs: parsed.diagnostics?.rustMatcherFallbackRefs ?? Math.max(0, references.length - decisions.size),
        rustMatcherSemanticMismatchRefs: parsed.diagnostics?.rustMatcherSemanticMismatchRefs ?? 0,
        rustMatcherFallbackReasons: parsed.diagnostics?.rustMatcherFallbackReasons ?? {},
        rustMatcherCandidateMaterializationMs: parsed.diagnostics?.rustMatcherCandidateMaterializationMs ?? 0,
        rustMatcherTsVerificationMs: parsed.diagnostics?.rustMatcherTsVerificationMs ?? 0,
        rustMatcherPayloadBytes: parsed.diagnostics?.rustMatcherPayloadBytes ?? payloadBytes,
        rustMatcherUniqueCandidateFacts: parsed.diagnostics?.rustMatcherUniqueCandidateFacts ?? uniqueCandidateFacts,
      },
    };
  } catch {
    return {
      decisions: new Map(),
      diagnostics: {
        ...emptyDiagnostics('invalid-response'),
        rustMatcherMs,
        rustMatcherStartupMs: rustMatcherMs,
        rustMatcherSubprocessMs: rustMatcherMs,
        rustMatcherSerializationMs,
        rustMatcherPayloadBytes: payloadBytes,
        rustMatcherUniqueCandidateFacts: uniqueCandidateFacts,
      },
    };
  }
}

function encodeRustNameMatcherBatch(references: RustNameMatcherReference[]): {
  version: 1;
  candidateTable: Record<string, Node>;
  references: EncodedRustNameMatcherReference[];
} {
  const candidateTable: Record<string, Node> = {};

  const addNodes = (nodes: Node[]): string[] => {
    const ids: string[] = [];
    for (const node of nodes) {
      candidateTable[node.id] = node;
      ids.push(node.id);
    }
    return ids;
  };

  const encodedReferences = references.map((entry) => {
    const nodesInFiles: Record<string, string[]> = {};
    for (const [filePath, nodes] of Object.entries(entry.candidates.nodesInFiles)) {
      nodesInFiles[filePath] = addNodes(nodes);
    }
    return {
      key: entry.key,
      ref: entry.ref,
      candidateIds: {
        byName: addNodes(entry.candidates.byName),
        byQualifiedName: addNodes(entry.candidates.byQualifiedName),
        byLeafName: addNodes(entry.candidates.byLeafName),
        byLowerName: addNodes(entry.candidates.byLowerName),
        byFileName: addNodes(entry.candidates.byFileName),
        classCandidates: addNodes(entry.candidates.classCandidates),
        capitalizedClassCandidates: addNodes(entry.candidates.capitalizedClassCandidates),
        methodCandidates: addNodes(entry.candidates.methodCandidates),
        nodesInFiles,
      },
    };
  });

  return {
    version: 1,
    candidateTable,
    references: encodedReferences,
  };
}

function looksQualified(referenceName: string): boolean {
  return referenceName.includes('::') || referenceName.includes('.');
}

function referenceLeafName(referenceName: string): string | null {
  if (!looksQualified(referenceName)) return null;
  const parts = referenceName.split(/[:.]/).filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function referenceFileName(referenceName: string): string | null {
  if (!referenceName.includes('/') && !/\.[A-Za-z][A-Za-z0-9]{0,3}$/.test(referenceName)) {
    return null;
  }
  return referenceName.split('/').pop() ?? null;
}

function parseMethodReference(referenceName: string): { receiver: string | null; methodName: string | null } {
  const dotMatch = referenceName.match(/^([\w.]+)\.(\w+:?(?:\w+:)*)$/);
  const colonMatch = referenceName.match(/^(\w+)::(\w+)$/);
  const match = dotMatch || colonMatch;
  if (!match) return { receiver: null, methodName: null };
  return {
    receiver: match[1] ?? null,
    methodName: match[2] ?? null,
  };
}
