import { spawnSync } from 'child_process';
import { Node } from '../types';
import { findRustCoreCommand } from '../indexing/rust-indexer';
import { ResolvedRef, ResolutionContext, UnresolvedRef } from './types';

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
}

export interface RustNameMatcherBatchResult {
  decisions: Map<string, RustNameMatcherDecision>;
  diagnostics: RustNameMatcherDiagnostics;
}

interface RustNameMatcherResponse {
  type: 'name_match_result';
  version: 1;
  decisions: RustNameMatcherDecision[];
  diagnostics?: Partial<RustNameMatcherDiagnostics>;
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
    };
  };

  if (references.length === 0) {
    return {
      decisions: new Map(),
      diagnostics: emptyDiagnostics('no-eligible-refs'),
    };
  }

  let serialized = '';
  const serializationStarted = Date.now();
  try {
    serialized = JSON.stringify({ version: 1, references });
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
        rustMatcherSerializationMs,
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
        rustMatcherSerializationMs,
        rustMatcherEligibleRefs: parsed.diagnostics?.rustMatcherEligibleRefs ?? references.length,
        rustMatcherHandledRefs: parsed.diagnostics?.rustMatcherHandledRefs ?? decisions.size,
        rustMatcherFallbackRefs: parsed.diagnostics?.rustMatcherFallbackRefs ?? Math.max(0, references.length - decisions.size),
        rustMatcherSemanticMismatchRefs: parsed.diagnostics?.rustMatcherSemanticMismatchRefs ?? 0,
        rustMatcherFallbackReasons: parsed.diagnostics?.rustMatcherFallbackReasons ?? {},
      },
    };
  } catch {
    return {
      decisions: new Map(),
      diagnostics: {
        ...emptyDiagnostics('invalid-response'),
        rustMatcherMs,
        rustMatcherStartupMs: rustMatcherMs,
        rustMatcherSerializationMs,
      },
    };
  }
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
