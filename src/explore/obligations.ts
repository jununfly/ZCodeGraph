/**
 * Slice 3.1: Evidence-model types (DES-universal-structural-explore-v1 §262-§437).
 *
 * This module introduces the *data model* only. It does not implement
 * anchor discovery, expansion, trace composition, or obligation closure —
 * those land in Slice 3.2-3.5 respectively. No production code path is
 * switched over to these types yet; the legacy `ExploreAnswer` shape and
 * Slice 2 observer behaviour remain unchanged.
 *
 * The contract governs the semantics of every field below. Comments cite
 * the relevant section so a reviewer can trace each type back to the
 * authoritative text.
 */

import type { Edge, EdgeKind } from '../types';

// ===========================================================================
// Certainty and roles (§282-§294)
// ===========================================================================

/**
 * How confident we are that an edge represents an actual runtime fact.
 *
 * - `observed`: direct AST/source fact.
 * - `resolved`: deterministic, uniquely-supported resolution (not a high
 *   confidence score).
 * - `inferred`: identified static heuristic.
 * - `ambiguous`: alternatives retained.
 *
 * A heuristic edge never becomes an observed runtime call by ranking
 * highly (§421-§422).
 */
export type EvidenceCertainty = 'observed' | 'resolved' | 'inferred' | 'ambiguous';

/** The role an evidence item plays in answering the query. */
export type EvidenceRole =
  | 'definition'
  | 'invocation-site'
  | 'registration-site'
  | 'scheduling-site'
  | 'condition'
  | 'state-mutation'
  | 'alternative-branch'
  | 'exception-branch'
  | 'external-terminal'
  | 'supporting';

// ===========================================================================
// SymbolIdentity (§383-§385)
// ===========================================================================

/**
 * Stable identity of a symbol. Includes receiver/container, source
 * location and, when available, parameter types/arity so same-name
 * methods and overloads are not interchangeable.
 */
export interface SymbolIdentity {
  /** The bare symbol name. */
  name: string;
  /** Container or receiver qualified path (e.g. class, namespace). */
  container?: string;
  /** Stable source location: `relativeFilePath:line`. */
  location: string;
  /** Optional parameter type signature for disambiguating overloads. */
  parameterTypes?: readonly string[];
  /** Optional arity when parameter types are unavailable. */
  arity?: number;
}

/** Canonical string form for tie-breaking and dedup. */
export function symbolIdentityKey(sym: SymbolIdentity): string {
  const params = sym.parameterTypes ? `(${sym.parameterTypes.join(',')})` : sym.arity !== undefined ? `/${sym.arity}` : '';
  return `${sym.container ? `${sym.container}.` : ''}${sym.name}${params}@${sym.location}`;
}

// ===========================================================================
// SourceLocation (used throughout)
// ===========================================================================

/** Stable source location relative to project root. */
export interface SourceLocation {
  filePath: string;
  /** 1-based inclusive start line. */
  startLine: number;
  /** 1-based inclusive end line. */
  endLine: number;
}

export function sourceLocationKey(loc: SourceLocation): string {
  return `${loc.filePath}:${loc.startLine}-${loc.endLine}`;
}

// ===========================================================================
// EdgeProvenance (§325-§332)
// ===========================================================================

/**
 * Where an edge came from. The adapter normalizes legacy metadata into
 * this shape; missing provenance stays unknown (§416).
 */
export interface EdgeProvenance {
  /** Legacy edge origin classifier, if any. */
  origin?: Edge['edgeOrigin'];
  /** Resolver that produced the edge (e.g. 'express', 'flask'). */
  resolver?: string;
  /** Synthesizer id when the edge was produced by a higher-level pattern. */
  synthesizedBy?: string;
  /** Where the registration was observed (for framework registration edges). */
  registeredAt?: SourceLocation;
  /** Where the edge itself was observed in source. */
  source?: SourceLocation;
  /** Candidate symbols when the resolution was ambiguous. */
  candidates?: readonly SymbolIdentity[];
}

// ===========================================================================
// EvidenceRelation (§306-§323)
// ===========================================================================

export type RelationSemantics =
  | 'direct-call'
  | 'conditional-branch'
  | 'registration'
  | 'scheduling'
  | 'potential-dispatch'
  | 'external-terminal'
  | 'non-execution';

/**
 * A typed relation between two nodes. `id` is a deterministic composite
 * of endpoints, kind/semantics, source site, origin/resolver and candidate
 * identity (§414-§416). Collisions retain distinct site/candidate ids
 * rather than last-write-wins.
 */
export interface EvidenceRelation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: EdgeKind;
  semantics: RelationSemantics;
  certainty: EvidenceCertainty;
  provenance: EdgeProvenance;
  /** Where the relation was observed in source, if applicable. */
  site?: SourceLocation;
  /** Residual relations (e.g. unresolved alternatives) attached to this one. */
  residuals: readonly ResidualRelation[];
}

/** An alternative relation that could not be uniquely resolved. */
export interface ResidualRelation {
  targetNodeId: string;
  certainty: EvidenceCertainty;
  provenance: EdgeProvenance;
  reason: 'ambiguous' | 'inferred' | 'external-terminal' | 'other';
}

// ===========================================================================
// TracePath / TraceStep (§334-§345)
// ===========================================================================

/**
 * A deterministic path through typed relations that covers distinct
 * anchors and mechanism roles. `status` is `connected` iff every step is
 * observed or resolved; otherwise `partial`.
 */
export interface TracePath {
  id: string;
  status: 'connected' | 'partial';
  steps: TraceStep[];
  /** IDs of relations that MUST be present for the path to be valid. */
  requiredRelationIds: string[];
}

export interface TraceStep {
  relationId: string;
  semantics: RelationSemantics;
  /** Guards on the edge (for conditional branches). */
  guards: readonly SourceLocation[];
}

// ===========================================================================
// QueryObligation (§296-§304)
// ===========================================================================

export type ObligationDisposition = 'satisfied' | 'degraded' | 'unresolved' | 'omitted';

/**
 * A normalized query obligation derived from explicit symbols, endpoints,
 * mechanism terms and requested relationships. Production query parsing
 * creates these (§271-§275); they are NOT framework-name rules and
 * cannot invent unspecified source paths.
 */
export interface QueryObligation {
  id: string;
  role: EvidenceRole;
  /** The symbol/endpoint this obligation is about, when known. */
  endpoint?: SymbolIdentity;
  /** Required obligations cannot be silently dropped. */
  required: boolean;
  /** IDs of EvidenceRequirements that close this obligation. */
  requirementIds: string[];
  disposition: ObligationDisposition;
  /** Optional gap that explains a non-satisfied disposition. */
  gapId?: string;
}

// ===========================================================================
// EvidenceRequirement (§347-§360)
// ===========================================================================

export type RequirementKind =
  | 'anchor'
  | 'path-node'
  | 'path-relation'
  | 'relationship-site'
  | 'supporting';

/**
 * The common unit of evidence (§264). A requirement is an anchor
 * definition, a selected path node or relation, a relationship/registration
 * site, a condition/state/exception role, or explicitly requested
 * supporting context. Every requirement has a stable identity, provenance,
 * optional source obligation and returned/degraded/omitted disposition.
 */
export interface EvidenceRequirement {
  id: string;
  obligationIds: readonly string[];
  kind: RequirementKind;
  role: EvidenceRole;
  /** Required vs supporting; see disposition derivation §390-§395. */
  requirement: 'required' | 'supporting';
  /** Link to the relation this requirement is about, when applicable. */
  relationId?: string;
  provenance: EdgeProvenance;
  /** The source atom this requirement points at, when applicable. */
  source?: SourceLocation;
  atomId?: string;
  disposition: 'returned' | 'degraded' | 'omitted';
  reasonCode?: string;
  gapId?: string;
}

// ===========================================================================
// RenderedClaim (§362-§367)
// ===========================================================================

/**
 * A single semantic claim in the rendered answer. Every claim MUST link
 * to its requirement/relation IDs (§385); missing links fail development
 * acceptance.
 */
export interface RenderedClaim {
  id: string;
  requirementIds: readonly string[];
  relationIds: readonly string[];
  modality: 'observed' | 'conditional' | 'potential' | 'ambiguous';
}

// ===========================================================================
// Obligation disposition derivation (§390-§395)
// ===========================================================================

/**
 * Derive a required obligation's disposition from its requirements.
 *
 * Order (§390-§392):
 *   1. missing links / unresolved evidence → 'unresolved'
 *   2. any 'omitted' → 'omitted'
 *   3. any 'degraded' → 'degraded'
 *   4. all 'returned' → 'satisfied'
 *
 * For a supporting obligation, fully returned evidence means 'satisfied';
 * otherwise 'degraded' or 'omitted' with its gap (§392-§395). Supporting
 * omissions cannot make a required answer complete by substitution.
 */
export function deriveObligationDisposition(
  obligation: Pick<QueryObligation, 'required'>,
  requirements: readonly Pick<EvidenceRequirement, 'disposition' | 'obligationIds'>[],
  opts: { hasUnresolvedLinks?: boolean } = {},
): ObligationDisposition {
  if (opts.hasUnresolvedLinks) return 'unresolved';
  if (requirements.length === 0) return obligation.required ? 'unresolved' : 'omitted';

  let anyOmitted = false;
  let anyDegraded = false;
  let allReturned = true;
  for (const r of requirements) {
    if (r.disposition === 'omitted') anyOmitted = true;
    if (r.disposition === 'degraded') anyDegraded = true;
    if (r.disposition !== 'returned') allReturned = false;
  }
  if (allReturned) return 'satisfied';
  if (obligation.required) {
    if (anyOmitted) return 'omitted';
    if (anyDegraded) return 'degraded';
    return 'unresolved';
  }
  // Supporting
  if (anyOmitted) return 'omitted';
  return 'degraded';
}
