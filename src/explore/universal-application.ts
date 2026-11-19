import { createHash } from 'node:crypto';
import type CodeGraph from '../index';
import type { Node } from '../types';
import { resolveAnchors, ANCHOR_WORK_CEILING } from './anchors';
import type { ExploreFailureCode, ExploreResult } from './answer';
import { closeObligations, interpretQuery } from './closure';
import { measureEnvelopeBytes, validateCapAgainstProtocolMinimum } from './exhausted';
import { deliverExploreAnswer, minimumExploreEnvelope, ExploreDeliveryAssertionError } from './delivery';
import { EXPANSION_WORK_CEILING, expandFromAnchors } from './expansion';
import type { EvidenceGap } from './ledger';
import type { EvidenceRequirement, SourceLocation } from './obligations';
import { RootConfinedExploreSourceRead } from './ports';
import { openCodeGraphSnapshot } from './snapshot-observer';
import { snapshotContentHash } from './snapshot';
import { composeTraces } from './trace';
import type { ExploreApplication, ExploreOptions } from './types';
import { getExploreOutputBudget } from './budget';
import type { SourceAtom } from './allocator';
import { rematerializeAtoms } from './allocator';
import { renderCompactExploreSkeleton } from './skeleton';

const SOURCE_BYTE_CEILING = 1024 * 1024;
const SOURCE_READ_CEILING = 64;

class SnapshotGraph {
  constructor(private readonly graph: CodeGraph, private readonly snapshot: { assertActive(): void }) {}
  getNodesByName(name: string): Node[] {
    this.snapshot.assertActive();
    return this.graph.getNodesByName(name);
  }
  getNodesByKind(kind: Node['kind']): Node[] {
    this.snapshot.assertActive();
    return this.graph.getNodesByKind(kind);
  }
  getNode(id: string): Node | undefined {
    this.snapshot.assertActive();
    return this.graph.getNode(id) ?? undefined;
  }
  getOutgoingEdges(id: string) {
    this.snapshot.assertActive();
    return this.graph.getOutgoingEdges(id);
  }
  getIncomingEdges(id: string) {
    this.snapshot.assertActive();
    return this.graph.getIncomingEdges(id);
  }
  getFile(filePath: string) {
    this.snapshot.assertActive();
    return this.graph.getFile(filePath);
  }
  getStats() {
    this.snapshot.assertActive();
    return this.graph.getStats();
  }
}

function checkAbort(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error('aborted');
}

/** One explicitly selected implementation; never a second legacy answer pass. */
export class UniversalExploreApplication implements ExploreApplication {
  async explore(graph: CodeGraph, query: string, options: ExploreOptions): Promise<ExploreResult> {
    if (!options.delivery) return { kind: 'failed', code: 'invalid-input', text: 'invalid-input: missing frozen UTF-8 delivery budget' };
    if (options.signal?.aborted) return { kind: 'failed', code: 'aborted', text: 'aborted: explore could not produce verified evidence' };
    validateCapAgainstProtocolMinimum(options.delivery, minimumExploreEnvelope());
    const requiredMinimum = options.delivery.transportReservation.utf8Bytes
      + measureEnvelopeBytes(minimumExploreEnvelope()) + options.delivery.optionalCliNewlineBytes;
    if (options.delivery.minimumErrorUtf8Bytes < requiredMinimum) {
      return { kind: 'failed', code: 'invalid-input', text: 'invalid-input: inconsistent minimum error reservation' };
    }
    const projectId = createHash('sha256');
    let snapshot: ReturnType<typeof openCodeGraphSnapshot> | undefined;
    try {
      const projectRoot = graph.getProjectRoot();
      projectId.update(projectRoot);
      snapshot = openCodeGraphSnapshot(graph, projectId.digest('hex').slice(0, 16));
      checkAbort(options.signal);
      const port = new SnapshotGraph(graph, snapshot);
      const anchors = resolveAnchors(query, port, snapshot);
      const allAnchors = anchors.anchors.flatMap((set) => set.matches);
      const interpretation = interpretQuery(query, allAnchors);
      checkAbort(options.signal);
      const expansion = expandFromAnchors(allAnchors, port, snapshot);
      const traces = composeTraces(allAnchors, expansion);
      const closure = closeObligations(interpretation, allAnchors, expansion, traces);
      checkAbort(options.signal);
      const nodes = new Map<string, Node | undefined>();
      for (const anchor of allAnchors) nodes.set(anchor.nodeId, port.getNode(anchor.nodeId));
      for (const id of expansion.visited.keys()) if (!nodes.has(id)) nodes.set(id, port.getNode(id));
      const requests = closure.requirements.map((requirement) => {
        const node = [...nodes.values()].find((candidate) =>
          candidate && requirement.source && candidate.filePath === requirement.source.filePath
          && candidate.startLine === requirement.source.startLine);
        // A relationship without its own source site is not a definition.
        // Preserve its missing-site residual instead of fabricating an atom.
        const location: SourceLocation | undefined = requirement.source;
        return { requirement, node, location };
      });
      const files = new Set(requests.flatMap((request) => request.location ? [request.location.filePath] : []));
      const source = new RootConfinedExploreSourceRead(projectRoot);
      const fileCache = new Map<string, string>();
      const fileFailures = new Map<string, EvidenceGap['reason']>();
      const gaps: EvidenceGap[] = [...closure.gaps];
      let sourceCeilingReached = false;
      for (const filePath of [...files].sort()) {
        checkAbort(options.signal);
        snapshot.assertActive();
        if (fileCache.size + fileFailures.size >= SOURCE_READ_CEILING) {
          fileFailures.set(filePath, 'graph-semantics-blocker');
          sourceCeilingReached = true;
          continue;
        }
        const read = source.readBounded(filePath, SOURCE_BYTE_CEILING);
        if (read.kind !== 'ok') {
          fileFailures.set(filePath, read.kind === 'too-large' ? 'source-too-large' : 'source-unavailable');
          continue;
        }
        const text = read.text;
        if (Buffer.byteLength(text, 'utf8') > SOURCE_BYTE_CEILING) {
          fileFailures.set(filePath, 'source-too-large');
          continue;
        }
        const indexed = port.getFile(filePath);
        if (!indexed || snapshotContentHash(text) !== indexed.contentHash) {
          fileFailures.set(filePath, indexed ? 'source-changed' : 'source-unavailable');
          continue;
        }
        fileCache.set(filePath, text);
      }
      const atoms: SourceAtom[] = [];
      const requirements: EvidenceRequirement[] = [];
      for (const request of requests) {
        const { requirement, node, location } = request;
        const failure = location
          ? fileFailures.get(location.filePath)
          : 'graph-semantics-blocker';
        const lines = location ? fileCache.get(location.filePath)?.split('\n') : undefined;
        const validRange = location && lines && location.startLine >= 1
          && location.endLine >= location.startLine && location.endLine <= lines.length;
        if (!location || !validRange || failure) {
          const reason = failure ?? (requirement.source ? 'source-unavailable' : 'graph-semantics-blocker');
          requirements.push({ ...requirement, disposition: 'omitted', reasonCode: reason });
          gaps.push({
            id: requirement.id,
            reason,
            detail: sourceCeilingReached && reason === 'graph-semantics-blocker' && location
              ? 'canonical source-read ceiling reached'
              : requirement.source ? 'source acquisition failed for selected requirement'
                : 'selected relationship has no exact source site; graph-semantics blocker',
            location: location ? `${location.filePath}:${location.startLine}-${location.endLine}` : undefined,
          });
          continue;
        }
        const atomId = requirement.atomId
          ?? `atom:${location.filePath}:${location.startLine}-${location.endLine}`;
        requirements.push({ ...requirement, atomId });
        // Keep one requirement per obligation and let the shared atom merge
        // path select the strongest role and deduplicate source bytes later.
        atoms.push({
          id: atomId,
          requirementIds: [requirement.id],
          filePath: location.filePath,
          range: location,
          text: lines.slice(location.startLine - 1, location.endLine).join('\n'),
          signature: node?.signature,
          role: requirement.role,
          required: requirement.requirement === 'required',
          isAlternative: requirement.role === 'alternative-branch',
          overhead: `#### ${location.filePath}:${location.startLine}-${location.endLine}\n`,
        });
      }
      const canonicalRequests = [...requirements].sort((a, b) => a.id.localeCompare(b.id));
      const firstFailure = canonicalRequests.find((requirement) =>
        requirement.disposition === 'omitted' && (requirement.reasonCode === 'source-unavailable'
          || requirement.reasonCode === 'source-changed' || requirement.reasonCode === 'source-too-large'));
      if (atoms.length === 0 && requests.length > 0 && firstFailure) {
        const code = firstFailure.reasonCode === 'source-changed'
          || firstFailure.reasonCode === 'source-too-large'
          ? firstFailure.reasonCode : 'source-unavailable';
        return { kind: 'failed', code, text: `${code}: no verified source evidence` };
      }
      if (requests.length === 0) {
        return deliverExploreAnswer({
          atoms: [], requirements: [], obligations: closure.obligations, gaps,
          snapshot: snapshot.identity,
          workBudget: {
            maxSeeds: ANCHOR_WORK_CEILING.globalLimit,
            maxUniqueVisitedNodes: EXPANSION_WORK_CEILING.maxUniqueVisitedNodes,
            maxAdjacencyRows: EXPANSION_WORK_CEILING.maxAdjacencyRows,
            maxRounds: EXPANSION_WORK_CEILING.maxRounds,
            maxCanonicalSourceReads: SOURCE_READ_CEILING,
          },
          searchExhausted: expansion.exhausted || anchors.anchors.some((set) => set.truncated), anchorCount: anchors.uniqueAnchorCount,
          maxFiles: options.maxFiles ?? 1, skeleton: '',
        }, options.delivery) as ExploreResult;
      }
      const materialized = rematerializeAtoms(atoms, {
        readRange: (range) => {
          const sourceLines = fileCache.get(range.filePath)?.split('\n');
          if (!sourceLines) throw new Error(`verified source missing: ${range.filePath}`);
          return sourceLines.slice(range.startLine - 1, range.endLine).join('\n');
        },
      });
      const skeleton = renderCompactExploreSkeleton({ traces, anchors: anchors.anchors, gaps: [] });
      const output = getExploreOutputBudget(port.getStats().fileCount, options.runtime.tightSmallProjectBudgetEnabled);
      snapshot.assertActive();
      const delivered = deliverExploreAnswer({
        atoms: materialized,
        requirements,
        obligations: closure.obligations,
        gaps,
        snapshot: snapshot.identity,
        workBudget: {
          maxSeeds: ANCHOR_WORK_CEILING.globalLimit,
          maxUniqueVisitedNodes: EXPANSION_WORK_CEILING.maxUniqueVisitedNodes,
          maxAdjacencyRows: EXPANSION_WORK_CEILING.maxAdjacencyRows,
          maxRounds: EXPANSION_WORK_CEILING.maxRounds,
          maxCanonicalSourceReads: SOURCE_READ_CEILING,
        },
        searchExhausted: expansion.exhausted || anchors.anchors.some((set) => set.truncated) || sourceCeilingReached,
        anchorCount: anchors.uniqueAnchorCount,
        maxFiles: options.maxFiles ?? output.defaultMaxFiles,
        skeleton,
      }, options.delivery);
      checkAbort(options.signal);
      if ('markdown' in delivered) return { kind: 'answer', markdown: delivered.markdown, report: delivered.report };
      return delivered;
    } catch (error) {
      const code: ExploreFailureCode = options.signal?.aborted || (error instanceof Error && error.message === 'aborted')
        ? 'aborted'
        : error instanceof Error && error.name === 'SnapshotLostError' ? 'snapshot-lost'
          : error instanceof Error && error.message.startsWith('invalid-input:') ? 'invalid-input'
            : error instanceof ExploreDeliveryAssertionError
              || (error instanceof Error && error.message.startsWith('budget-exhausted:'))
              ? 'budget-exhausted'
              : 'graph-unavailable';
      return { kind: 'failed', code, text: `${code}: explore could not produce verified evidence` };
    } finally {
      await snapshot?.close();
    }
  }
}
