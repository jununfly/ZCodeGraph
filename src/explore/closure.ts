/**
 * Slice 3.5: Obligation closure (DES-universal-structural-explore-v1 §456-§462).
 *
 * Before selecting output, close every required query obligation through
 * its definitions, invocation, registration and scheduling sites,
 * relevant guards, state mutations and alternative/exception branches.
 * Register every selected path node, path relation and source site.
 *
 * An unsatisfied obligation cannot be repaired by dropping it from
 * selection (§460-§461). An edge with no usable site may remain a graph
 * assertion, but its provenance and missing-site gap must be visible.
 *
 * Boundaries:
 *   - Same algorithm serves all repos (§473).
 *   - A missing graph fact is a graph-semantics blocker, not an
 *     invitation to invent a query-time path (§432-§434).
 *   - Inferred/ambiguous or potential-dispatch paths say "may reach",
 *     never a globally actual execution order (§434-§437).
 */

import type {
  EvidenceRequirement,
  EvidenceRole,
  QueryObligation,
  SymbolIdentity,
} from './obligations';
import { deriveObligationDisposition } from './obligations';
import type { AnchorMatch } from './anchors';
import type { ExpansionResult } from './expansion';
import type { TracePath } from './obligations';
import type { EvidenceRelation } from './obligations';
import type { EvidenceGap } from './ledger';

// Re-export EvidenceGap for callers that don't import ledger directly.
export type { EvidenceGap } from './ledger';

// ===========================================================================
// Query interpretation
// ===========================================================================

/**
 * Derive normalized query obligations from explicit symbols, endpoints,
 * mechanism terms and requested relationships (§271-§275).
 *
 * These are NOT framework-name rules and cannot invent unspecified
 * source paths. Failure to normalize a requested mechanism, branch or
 * relationship creates a `query-interpretation` gap and `partial`, never
 * an artificially complete subset.
 *
 * Slice 3.5 baseline: every anchor match becomes the endpoint of a
 * `definition` obligation. If the query explicitly mentions mechanism
 * terms (call/registration/scheduling/guard/state/branch/exception),
 * additional obligations are derived.
 */
export interface QueryInterpretation {
  obligations: QueryObligation[];
  /** Clues that could not be normalized into any obligation. */
  interpretationGaps: EvidenceGap[];
}

const MECHANISM_KEYWORDS: Record<string, EvidenceRole> = {
  call: 'invocation-site',
  calls: 'invocation-site',
  calling: 'invocation-site',
  invoke: 'invocation-site',
  invokes: 'invocation-site',
  invoking: 'invocation-site',
  register: 'registration-site',
  registers: 'registration-site',
  registered: 'registration-site',
  registering: 'registration-site',
  registration: 'registration-site',
  schedule: 'scheduling-site',
  schedules: 'scheduling-site',
  scheduled: 'scheduling-site',
  scheduling: 'scheduling-site',
  cron: 'scheduling-site',
  guard: 'condition',
  guards: 'condition',
  guarded: 'condition',
  if: 'condition',
  when: 'condition',
  state: 'state-mutation',
  mutate: 'state-mutation',
  mutates: 'state-mutation',
  mutated: 'state-mutation',
  mutating: 'state-mutation',
  alternative: 'alternative-branch',
  else: 'alternative-branch',
  exception: 'exception-branch',
  exceptions: 'exception-branch',
  error: 'exception-branch',
  errors: 'exception-branch',
  catch: 'exception-branch',
  catches: 'exception-branch',
  throw: 'exception-branch',
  throws: 'exception-branch',
  thrown: 'exception-branch',
  throwing: 'exception-branch',
};

export function interpretQuery(
  query: string,
  anchors: readonly AnchorMatch[],
): QueryInterpretation {
  const obligations: QueryObligation[] = [];
  const interpretationGaps: EvidenceGap[] = [];
  const lowerQuery = query.toLowerCase();

  // Always derive a `definition` obligation per anchor.
  for (const anchor of anchors) {
    const symbol: SymbolIdentity | undefined = anchor.symbol;
    obligations.push({
      id: `ob-def-${anchor.nodeId}`,
      role: 'definition',
      endpoint: symbol,
      required: true,
      requirementIds: [],
      disposition: 'unresolved',
    });
  }

  // Detect mechanism keywords and derive additional obligations.
  const detectedRoles = new Set<EvidenceRole>();
  for (const [keyword, role] of Object.entries(MECHANISM_KEYWORDS)) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)) {
      detectedRoles.add(role);
    }
  }
  for (const role of detectedRoles) {
    for (const anchor of anchors) {
      obligations.push({
        id: `ob-${role}-${anchor.nodeId}`,
        role,
        endpoint: anchor.symbol,
        required: true,
        requirementIds: [],
        disposition: 'unresolved',
      });
    }
  }

  // If the query named a mechanism but no anchor matched, record a
  // query-interpretation gap.
  if (anchors.length === 0 && detectedRoles.size > 0) {
    interpretationGaps.push({
      id: 'qi:no-anchor',
      reason: 'query-interpretation',
      detail: `Query requests mechanism roles (${[...detectedRoles].join(', ')}) but no anchor could be resolved`,
    });
  }

  return { obligations, interpretationGaps };
}

// ===========================================================================
// Closure
// ===========================================================================

export interface ClosureResult {
  obligations: QueryObligation[];
  requirements: EvidenceRequirement[];
  gaps: EvidenceGap[];
}

/**
 * Close every required obligation through the discovered traces and
 * relations. For each obligation, find evidence requirements that
 * satisfy its role:
 *
 *   - definition: the anchor node itself.
 *   - invocation-site: a direct-call relation whose target is the
 *     anchor (incoming) or source is the anchor (outgoing).
 *   - registration-site / scheduling-site: a relation with the
 *     corresponding semantics that touches the anchor.
 *   - condition / state-mutation / alternative-branch / exception-
 *     branch: source sites attached to relevant relations.
 *   - supporting: any path-node / path-relation on a trace.
 *
 * Graph-semantics blockers (§432-§434) become explicit gaps; they
 * never silently close an obligation.
 */
export function closeObligations(
  interpretation: QueryInterpretation,
  anchors: readonly AnchorMatch[],
  expansion: ExpansionResult,
  traces: readonly TracePath[],
): ClosureResult {
  const obligations: QueryObligation[] = [];
  const requirements: EvidenceRequirement[] = [];
  const gaps: EvidenceGap[] = [...interpretation.interpretationGaps];
  const anchorById = new Map(anchors.map((a) => [a.nodeId, a]));

  // Helper: register a requirement and link it to its obligation.
  const addRequirement = (
    obligation: QueryObligation,
    partial: Omit<EvidenceRequirement, 'obligationIds' | 'disposition'>,
  ): EvidenceRequirement => {
    const req: EvidenceRequirement = {
      ...partial,
      obligationIds: [obligation.id],
      disposition: 'returned',
    };
    requirements.push(req);
    obligation.requirementIds.push(req.id);
    return req;
  };

  for (const ob of interpretation.obligations) {
    // Find the anchor by node id embedded in the obligation id.
    // Convention: ob-def-<nodeId>, ob-<role>-<nodeId>. Node ids may
    // themselves contain '-', so strip only the known prefix.
    const nodeId = ob.id.replace(/^ob-(?:def|invocation-site|registration-site|scheduling-site|condition|state-mutation|alternative-branch|exception-branch|external-terminal|supporting)-/, '');
    const matchedAnchor = anchorById.get(nodeId);

    if (!matchedAnchor) {
      // No anchor → obligation stays unresolved.
      ob.disposition = 'unresolved';
      gaps.push({
        id: `gap-${ob.id}`,
        reason: 'graph-semantics-blocker',
        detail: `No anchor for obligation ${ob.id}`,
      });
      obligations.push(ob);
      continue;
    }

    switch (ob.role) {
      case 'definition': {
        // Definition requirement points at the anchor's source location.
        addRequirement(ob, {
          id: `req-def-${matchedAnchor.nodeId}`,
          kind: 'anchor',
          role: 'definition',
          requirement: 'required',
          provenance: {},
          source: matchedAnchor.location,
        });
        break;
      }
      case 'invocation-site': {
        // Find direct-call relations touching the anchor.
        let found = 0;
        for (const rel of expansion.relations.values()) {
          if (rel.semantics !== 'direct-call') continue;
          if (rel.sourceNodeId !== matchedAnchor.nodeId && rel.targetNodeId !== matchedAnchor.nodeId) continue;
          addRequirement(ob, {
            id: `req-inv-${rel.id}`,
            kind: 'path-relation',
            role: 'invocation-site',
            requirement: 'required',
            relationId: rel.id,
            provenance: rel.provenance,
            source: rel.site,
          });
          found += 1;
        }
        if (found === 0) {
          gaps.push({
            id: `gap-${ob.id}`,
            reason: 'graph-semantics-blocker',
            detail: `No direct-call relation touching anchor ${matchedAnchor.nodeId}`,
          });
        }
        break;
      }
      case 'registration-site':
      case 'scheduling-site': {
        const wanted: EvidenceRelation['semantics'] =
          ob.role === 'registration-site' ? 'registration' : 'scheduling';
        let found = 0;
        for (const rel of expansion.relations.values()) {
          if (rel.semantics !== wanted) continue;
          if (rel.sourceNodeId !== matchedAnchor.nodeId && rel.targetNodeId !== matchedAnchor.nodeId) continue;
          addRequirement(ob, {
            id: `req-${ob.role}-${rel.id}`,
            kind: 'relationship-site',
            role: ob.role,
            requirement: 'required',
            relationId: rel.id,
            provenance: rel.provenance,
            source: rel.site ?? rel.provenance.registeredAt,
          });
          found += 1;
        }
        if (found === 0) {
          gaps.push({
            id: `gap-${ob.id}`,
            reason: 'graph-semantics-blocker',
            detail: `No ${wanted} relation touching anchor ${matchedAnchor.nodeId}`,
          });
        }
        break;
      }
      case 'condition':
      case 'state-mutation':
      case 'alternative-branch':
      case 'exception-branch': {
        // These require source-site evidence on relations. Slice 3.5
        // baseline: look for relations whose site is known.
        let found = 0;
        for (const rel of expansion.relations.values()) {
          if (rel.sourceNodeId !== matchedAnchor.nodeId && rel.targetNodeId !== matchedAnchor.nodeId) continue;
          if (!rel.site) continue;
          addRequirement(ob, {
            id: `req-${ob.role}-${rel.id}`,
            kind: 'relationship-site',
            role: ob.role,
            requirement: 'required',
            relationId: rel.id,
            provenance: rel.provenance,
            source: rel.site,
          });
          found += 1;
        }
        if (found === 0) {
          gaps.push({
            id: `gap-${ob.id}`,
            reason: 'graph-semantics-blocker',
            detail: `No source-site evidence for ${ob.role} at anchor ${matchedAnchor.nodeId}`,
          });
        }
        break;
      }
      case 'external-terminal':
      case 'supporting': {
        // Supporting requirements: register every trace step that
        // touches the anchor.
        for (const path of traces) {
          for (const step of path.steps) {
            const rel = expansion.relations.get(step.relationId);
            if (!rel) continue;
            if (rel.sourceNodeId !== matchedAnchor.nodeId && rel.targetNodeId !== matchedAnchor.nodeId) continue;
            addRequirement(ob, {
              id: `req-sup-${rel.id}`,
              kind: 'path-relation',
              role: 'supporting',
              requirement: 'supporting',
              relationId: rel.id,
              provenance: rel.provenance,
              source: rel.site,
            });
          }
        }
        break;
      }
    }

    // Derive disposition per contract §390-§395.
    const obReqs = requirements.filter((r) => r.obligationIds.includes(ob.id));
    ob.disposition = deriveObligationDisposition(ob, obReqs);
    obligations.push(ob);
  }

  return { obligations, requirements, gaps };
}
