import {
  compareSourceAtoms,
  globalAllocateAtoms,
  mergeOverlappingAtoms,
  type AllocationResult,
  type AtomDisposition,
  type SourceAtom,
} from './allocator';
import { resolveResultState, type ExploreResult } from './answer';
import {
  computeApplicationBodyAllowance,
  utf8ByteLength,
  verifyComposedCap,
  type Utf8Budget,
} from './budget-utf8';
import {
  buildBudgetExhaustedEnvelope,
  measureEnvelopeBytes,
  validateCapAgainstProtocolMinimum,
} from './exhausted';
import { deriveCoverageLedger } from './ledger';
import type { EvidenceGap, ExploreReport, RequirementDisposition } from './ledger';
import {
  deriveObligationDisposition,
  type EvidenceRequirement,
  type QueryObligation,
} from './obligations';
import type { SnapshotIdentity, ExploreWorkBudget } from './snapshot';
import { fingerprintWorkBudget } from './snapshot';

/** The final non-failure body, never a truncated version of another answer. */
export interface DeliveredExploreAnswer {
  markdown: string;
  report: ExploreReport;
  dispositions: readonly AtomDisposition[];
  detailedFileCount: number;
}

export interface ExploreDeliveryInput {
  atoms: readonly SourceAtom[];
  requirements: readonly EvidenceRequirement[];
  obligations: readonly QueryObligation[];
  gaps: readonly EvidenceGap[];
  snapshot: SnapshotIdentity;
  workBudget: ExploreWorkBudget;
  searchExhausted: boolean;
  anchorCount: number;
  maxFiles: number;
  /** Trace/ambiguity prefix; final residual lines are replaced and charged with allocation. */
  skeleton?: string;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function canonicalizeRequirements(
  input: readonly EvidenceRequirement[],
): EvidenceRequirement[] {
  const byId = new Map<string, EvidenceRequirement>();
  for (const requirement of input) {
    const previous = byId.get(requirement.id);
    if (!previous) {
      byId.set(requirement.id, {
        ...requirement,
        atomId: undefined,
        obligationIds: [...new Set(requirement.obligationIds)].sort(),
      });
      continue;
    }
    const identity = (value: EvidenceRequirement) => {
      const { obligationIds: _links, atomId: _atomId, ...identityFields } = value;
      return JSON.stringify(identityFields);
    };
    if (identity(previous) !== identity(requirement)) {
      throw new Error(`invalid-input: conflicting evidence requirement identity: ${requirement.id}`);
    }
    previous.obligationIds = [...new Set([
      ...previous.obligationIds, ...requirement.obligationIds,
    ])].sort();
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const RESIDUAL_REASONS = new Set<EvidenceGap['reason']>([
  'snapshot-lost', 'source-unavailable', 'source-changed', 'source-too-large',
  'graph-semantics-blocker', 'query-interpretation', 'search-limit', 'aborted', 'other',
]);

function requirementReason(requirement: EvidenceRequirement): EvidenceGap['reason'] {
  return RESIDUAL_REASONS.has(requirement.reasonCode as EvidenceGap['reason'])
    ? requirement.reasonCode as EvidenceGap['reason'] : 'budget-exhausted';
}

function requirementGap(
  requirement: EvidenceRequirement,
  atom: SourceAtom | undefined,
): EvidenceGap {
  const residual = requirementReason(requirement);
  return {
    id: requirement.id,
    reason: requirement.disposition === 'omitted' && residual !== 'budget-exhausted'
      ? residual : 'budget-exhausted',
    detail: requirement.disposition === 'degraded'
      ? 'complete source unavailable; signature or exact location delivered'
      : residual !== 'budget-exhausted'
        ? 'selected source requirement was not materialized within the fixed snapshot'
        : 'selected source requirement was not materialized within the UTF-8 budget',
    location: atom ? `${atom.filePath}:${atom.range.startLine}-${atom.range.endLine}` : undefined,
  };
}

function obligationGapReason(
  requirements: readonly EvidenceRequirement[],
  gaps: readonly EvidenceGap[],
): EvidenceGap['reason'] {
  const linkedReasons = requirements.map((requirement) =>
    gaps.find((gap) => gap.id === requirement.id)?.reason ?? requirementReason(requirement));
  return linkedReasons.find((reason) => reason === 'search-limit')
    ?? linkedReasons.find((reason) => reason !== 'budget-exhausted')
    ?? 'budget-exhausted';
}

/** Trace/ambiguity lines are retained; gap lines always describe the final allocation. */
export function renderExploreFinalSkeleton(base: string, gaps: readonly EvidenceGap[]): string {
  const retained = base.split('\n').filter((line) => !line.startsWith('gap='))
    .map((line) => line.split(/[ \t]+/).filter((field) => !field.startsWith('gap=')).join(' '))
    .filter((line) => line.length > 0);
  while (retained.at(-1) === '') retained.pop();
  if (retained.length === 0 && gaps.length > 0) retained.push('### Trace and residuals');
  const byId = new Map<string, EvidenceGap>();
  for (const gap of [...gaps].sort((a, b) => a.id.localeCompare(b.id))) {
    const previous = byId.get(gap.id);
    if (previous && (previous.reason !== gap.reason || previous.detail !== gap.detail
        || previous.location !== gap.location)) {
      throw new Error(`invalid-input: conflicting final evidence gap identity: ${gap.id}`);
    }
    byId.set(gap.id, gap);
  }
  const lines = [...retained, ...[...byId.values()].map((gap) =>
    `gap=${gap.id} reason=${gap.reason} detail=${gap.detail}`)];
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}

interface FinalResiduals {
  gaps: EvidenceGap[];
  obligations: QueryObligation[];
  requiredObligationGapIds: Set<string>;
}

/** Derive both normal and exhausted residual accounting from the same rules. */
function deriveFinalResiduals(options: {
  requirements: readonly EvidenceRequirement[];
  obligations: readonly QueryObligation[];
  inputGaps: ReadonlyMap<string, EvidenceGap>;
  atomFor(requirement: EvidenceRequirement): SourceAtom | undefined;
  searchExhausted: boolean;
}): FinalResiduals {
  const { requirements, obligations, inputGaps, atomFor, searchExhausted } = options;
  const gaps = [...inputGaps.values()];
  const appendGap = (gap: EvidenceGap): void => {
    if (inputGaps.has(gap.id)) return;
    const previous = gaps.find((existing) => existing.id === gap.id);
    if (!previous) {
      gaps.push(gap);
      return;
    }
    if (previous.reason !== gap.reason) {
      throw new Error(`invalid-input: conflicting derived evidence gap identity: ${gap.id}`);
    }
    if (previous.detail !== gap.detail || previous.location !== gap.location) {
      gaps[gaps.indexOf(previous)] = gap;
    }
  };
  for (const requirement of requirements) {
    if (requirement.disposition === 'returned') continue;
    const gap = requirementGap(requirement, atomFor(requirement));
    appendGap(inputGaps.has(gap.id) && inputGaps.get(gap.id)!.reason !== gap.reason
      ? { ...gap, id: `${gap.id}:${gap.reason}` } : gap);
  }
  const byRequirementId = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const requiredObligationGapIds = new Set<string>();
  const finalObligations = obligations.map((obligation) => {
    const linked = obligation.requirementIds.map((id) => byRequirementId.get(id))
      .filter((requirement) => requirement !== undefined);
    const disposition = deriveObligationDisposition(obligation, linked, {
      hasUnresolvedLinks: obligation.requirementIds.length === 0
        || linked.length !== obligation.requirementIds.length,
    });
    const gapId = obligation.gapId ?? `gap-${obligation.id}`;
    if (disposition !== 'satisfied') {
      if (obligation.required) requiredObligationGapIds.add(gapId);
      appendGap({
        id: gapId,
        reason: obligationGapReason(linked, gaps),
        detail: inputGaps.get(gapId)?.detail
          ?? `Obligation ${obligation.id} is ${disposition}; its evidence links were not fully returned`,
      });
      if (searchExhausted) {
        const searchGapId = `${gapId}:search-limit`;
        if (obligation.required) requiredObligationGapIds.add(searchGapId);
        appendGap({
          id: searchGapId,
          reason: 'search-limit',
          detail: `Search work ceiling left obligation ${obligation.id} ${disposition}`,
        });
      }
    }
    return { ...obligation, disposition, gapId: disposition === 'satisfied' ? undefined : gapId };
  });
  if (searchExhausted && !gaps.some((gap) => gap.reason === 'search-limit')) {
    appendGap({
      id: 'gap-search-work-ceiling',
      reason: 'search-limit',
      detail: 'Search work ceiling was reached before all discovery work completed',
    });
  }
  gaps.sort((a, b) => a.id.localeCompare(b.id));
  return { gaps, obligations: finalObligations, requiredObligationGapIds };
}

export function minimumExploreEnvelope() {
  return buildBudgetExhaustedEnvelope({
    selectedRequirements: 0, returnedRequirements: 0, omittedRequirements: 0, gapIds: [],
  });
}

function exhaustedResult(
  requirements: readonly EvidenceRequirement[],
  gaps: readonly EvidenceGap[],
  allowance: number,
): ExploreResult {
  const ids = uniqueStrings([
    ...requirements.map((requirement) => requirement.id),
    ...gaps.map((gap) => gap.id),
  ]);
  let envelope = buildBudgetExhaustedEnvelope({
    selectedRequirements: requirements.length,
    returnedRequirements: 0,
    omittedRequirements: requirements.length,
    gapIds: ids,
    gapCount: uniqueStrings(gaps.map((gap) => gap.id)).length,
  });
  // Counts remain complete; only the optional bounded ID list is reduced.
  // Never slice the diagnostic text or a Unicode codepoint to make it fit.
  while (measureEnvelopeBytes(envelope) > allowance && envelope.stableIds.length > 0) {
    envelope = buildBudgetExhaustedEnvelope({
      selectedRequirements: requirements.length,
      returnedRequirements: 0,
      omittedRequirements: requirements.length,
      gapIds: ids.slice(0, envelope.stableIds.length - 1),
      gapCount: uniqueStrings(gaps.map((gap) => gap.id)).length,
    });
  }
  if (measureEnvelopeBytes(envelope) > allowance) throw new Error('budget-exhausted: minimum envelope exceeds body allowance');
  return envelope;
}

function downgrade(atom: SourceAtom): SourceAtom {
  return { ...atom, maximumTier: 'location' };
}

function dispositionFor(requirement: EvidenceRequirement, atom?: SourceAtom): RequirementDisposition {
  if (!atom) return 'omitted';
  if (requirement.disposition === 'omitted') return 'omitted';
  if (requirement.disposition === 'degraded') return 'degraded';
  return 'returned';
}

/** Pure allocation and ledger update; no source, graph, environment or clock reads. */
export class ExploreDeliveryAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExploreDeliveryAssertionError';
  }
}

export function deliverExploreAnswer(
  input: ExploreDeliveryInput,
  budget: Utf8Budget,
): DeliveredExploreAnswer | ExploreResult {
  validateCapAgainstProtocolMinimum(budget, minimumExploreEnvelope());
  const canonicalRequirements = canonicalizeRequirements(input.requirements);
  const requiredMinimum = budget.transportReservation.utf8Bytes
    + measureEnvelopeBytes(minimumExploreEnvelope()) + budget.optionalCliNewlineBytes;
  if (budget.minimumErrorUtf8Bytes < requiredMinimum) {
    throw new Error('invalid-input: minimum error reservation excludes the frozen envelope or transport');
  }
  const allowance = computeApplicationBodyAllowance(budget);
  const merged = mergeOverlappingAtoms(input.atoms).sort(compareSourceAtoms);
  const atomFor = (requirement: EvidenceRequirement): SourceAtom | undefined =>
    merged.find((candidate) => candidate.id === requirement.atomId
      || candidate.sourceAtomIds?.includes(requirement.atomId ?? '')
      || candidate.requirementIds.includes(requirement.id));
  const inputGapIds = new Map<string, EvidenceGap>();
  for (const gap of input.gaps) {
    const previous = inputGapIds.get(gap.id);
    if (previous && (previous.reason !== gap.reason || previous.detail !== gap.detail
        || previous.location !== gap.location)) {
      throw new Error(`invalid-input: conflicting evidence gap identity: ${gap.id}`);
    }
    inputGapIds.set(gap.id, gap);
  }
  const canonicalObligations = [...input.obligations].map((obligation) => ({
    ...obligation, requirementIds: [...new Set(obligation.requirementIds)].sort(),
  })).sort((a, b) => a.id.localeCompare(b.id));
  const requiredIds = new Set(canonicalRequirements.flatMap((requirement) =>
    requirement.requirement === 'required' ? [requirement.id] : []));
  let skeleton = renderExploreFinalSkeleton(input.skeleton ?? '', [...inputGapIds.values()]);
  const maxFiles = Math.max(0, Math.floor(input.maxFiles));
  const maximumPasses = canonicalRequirements.length + canonicalObligations.length + 2;
  for (let pass = 0; pass < maximumPasses; pass += 1) {
  let allocation: AllocationResult;
  try {
    const initial = globalAllocateAtoms(merged, {
      bodyAllowance: allowance,
      skeleton,
    });
    const detailed = initial.dispositions.filter((d) =>
      d.kind === 'returned' || (d.kind === 'degraded' && d.degradedTo === 'signature'));
    const deliveredFiles = new Set<string>();
    const byId = new Map(merged.flatMap((atom) =>
      (atom.sourceAtomIds ?? [atom.id]).map((id) => [id, atom] as const)));
    const candidateFiles = new Set(detailed.flatMap((disposition) => {
      const filePath = byId.get(disposition.atomId)?.filePath;
      return filePath ? [filePath] : [];
    }));
    for (const atom of [...merged].sort(compareSourceAtoms)) {
      if (!candidateFiles.has(atom.filePath) || deliveredFiles.has(atom.filePath)) continue;
      if (deliveredFiles.size >= maxFiles) break;
      deliveredFiles.add(atom.filePath);
    }
    allocation = candidateFiles.size > deliveredFiles.size
      ? globalAllocateAtoms(merged.map((atom) =>
        deliveredFiles.has(atom.filePath) ? atom : downgrade(atom)), {
        bodyAllowance: allowance,
            skeleton,
      })
      : initial;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('budget-exhausted:')) throw error;
    const exhaustedRequirements = canonicalRequirements.map((requirement) => ({
      ...requirement, disposition: 'omitted' as const,
    }));
    const finalResiduals = deriveFinalResiduals({
      requirements: exhaustedRequirements,
      obligations: canonicalObligations,
      inputGaps: inputGapIds, atomFor, searchExhausted: input.searchExhausted,
    });
    return exhaustedResult(exhaustedRequirements, finalResiduals.gaps, allowance);
  }

  const canonicalAllocationDispositions = allocation.dispositions.filter((disposition) =>
    merged.some((atom) => atom.id === disposition.atomId));
  const byAtomId = new Map(canonicalAllocationDispositions.map((d) => [d.atomId, d]));
  const requirements = canonicalRequirements.map((requirement) => {
    const atom = atomFor(requirement);
    const allocated = atom ? byAtomId.get(atom.id) : undefined;
    const disposition: RequirementDisposition = requirement.disposition === 'omitted'
      ? 'omitted'
      : requirement.disposition === 'degraded'
        ? 'degraded'
        : allocated?.kind === 'omitted'
          ? 'omitted'
          : allocated?.kind === 'degraded' ? 'degraded'
            : dispositionFor(requirement, atom);
    return { ...requirement, disposition };
  });
  const dispositions: Record<string, RequirementDisposition> = {};
  for (const requirement of requirements) dispositions[requirement.id] = requirement.disposition;
  const finalResiduals = deriveFinalResiduals({
    requirements, obligations: canonicalObligations,
    inputGaps: inputGapIds, atomFor, searchExhausted: input.searchExhausted,
  });
  const { gaps, obligations, requiredObligationGapIds } = finalResiduals;
  const hasRequiredGap = input.searchExhausted || gaps.some((gap) => requiredIds.has(gap.id)
    || requiredObligationGapIds.has(gap.id) || gap.reason === 'query-interpretation');
  const allRequiredSatisfied = obligations.some((obligation) => obligation.required)
    && obligations.every((o) => !o.required || o.disposition === 'satisfied')
    && !input.searchExhausted;
  const finalSkeleton = renderExploreFinalSkeleton(input.skeleton ?? '', gaps);
  if (finalSkeleton !== skeleton) {
    if (pass + 1 >= maximumPasses) {
      throw new ExploreDeliveryAssertionError('final gap skeleton did not converge');
    }
    skeleton = finalSkeleton;
    continue;
  }
  const coverage = deriveCoverageLedger({
    dispositions,
    requiredIds,
    gaps,
    obligations,
    searchExhausted: input.searchExhausted,
  });
  const state = resolveResultState({
    anchorCount: input.anchorCount,
    returnedOrDegradedCount: coverage.returnedRequirements + coverage.degradedRequirements,
    hasQueryInterpretationGap: gaps.some((gap) => gap.reason === 'query-interpretation'),
    allRequiredSatisfied,
    hasRequiredGap,
  });
  coverage.status = state === 'empty' ? 'no-evidence'
    : state === 'answer-complete' ? 'complete' : 'partial';
  coverage.selectedEvidencePreserved = coverage.selectedEvidencePreserved
    && obligations.every((o) => !o.required
      || (o.disposition !== 'omitted' && o.disposition !== 'unresolved'));
  const report: ExploreReport = {
    status: coverage.status,
    snapshot: input.snapshot,
    coverage,
    omissions: gaps,
    diagnostics: [],
    workBudgetFingerprint: fingerprintWorkBudget(input.workBudget),
  };
  const markdown = skeleton + allocation.entries.map((entry) => entry.text).join('');
  if (utf8ByteLength(markdown) > allowance) {
    throw new ExploreDeliveryAssertionError('budget-exhausted: final application body exceeds allowance');
  }
  if (state === 'empty') {
    const text = 'No verified source evidence found for the requested symbols.';
    if (utf8ByteLength(text) > allowance) {
      throw new ExploreDeliveryAssertionError('budget-exhausted: no-evidence body exceeds allowance');
    }
    return { kind: 'empty', text, report };
  }
  return {
    markdown,
    report,
    dispositions: canonicalAllocationDispositions,
    detailedFileCount: countDetailedFiles(merged, canonicalAllocationDispositions),
  };
  }
  throw new ExploreDeliveryAssertionError('final gap allocation did not converge');
}

export function countDetailedFiles(
  atoms: readonly SourceAtom[],
  dispositions: readonly AtomDisposition[],
): number {
  const byId = new Map(atoms.flatMap((atom) =>
    (atom.sourceAtomIds ?? [atom.id]).map((id) => [id, atom] as const)));
  const files = new Set<string>();
  for (const disposition of dispositions) {
    if (disposition.kind === 'returned'
        || (disposition.kind === 'degraded' && disposition.degradedTo === 'signature')) {
      const atom = byId.get(disposition.atomId);
      if (atom) files.add(atom.filePath);
    }
  }
  return files.size;
}

/** Adapter validation occurs before graph/source retrieval. */
export function minimumExploreErrorUtf8Bytes(notices: readonly string[], cliNewlineBytes: 0 | 1): number {
  const reservation = notices.length === 0 ? 0 : utf8ByteLength(notices.join('\n\n') + '\n\n');
  return reservation + measureEnvelopeBytes(minimumExploreEnvelope()) + cliNewlineBytes;
}

export function prepareExploreDelivery(cap: number, notices: readonly string[], cliNewlineBytes: 0 | 1): Utf8Budget {
  if (!Number.isSafeInteger(cap) || cap < 0) throw new Error('invalid-input: maxOutputUtf8Bytes must be a non-negative integer');
  const reservation = notices.length === 0 ? 0 : utf8ByteLength(notices.join('\n\n') + '\n\n');
  const minimum = minimumExploreEnvelope();
  const budget: Utf8Budget = {
    maxOutputUtf8Bytes: cap,
    transportReservation: { utf8Bytes: reservation },
    optionalCliNewlineBytes: cliNewlineBytes,
    minimumErrorUtf8Bytes: reservation + measureEnvelopeBytes(minimum) + cliNewlineBytes,
  };
  validateCapAgainstProtocolMinimum(budget, minimum);
  return budget;
}

export function verifyExploreTransport(
  budget: Utf8Budget,
  notices: readonly string[],
  result: ExploreResult,
): boolean {
  const notice = notices.length === 0 ? '' : notices.join('\n\n') + '\n\n';
  const body = result.kind === 'answer' ? result.markdown : result.text;
  return verifyComposedCap(budget, utf8ByteLength(notice), utf8ByteLength(body));
}
