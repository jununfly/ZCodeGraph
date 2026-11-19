/**
 * Slice 4.2: Global source-atom allocator (DES-universal-structural-explore-v1 §538-§552).
 *
 * Multiple required files compete in ONE global allocator; there is no
 * necessary-file exception that later encounters a final hard ceiling.
 *
 * Allocation order (§538-§543):
 *   1. compact trace and ambiguity/gap skeleton
 *   2. required anchor, path-node, and relationship-site source atoms
 *   3. alternatives needed to preserve material ambiguity
 *   4. supporting context such as secondary relationships and blast radius
 *
 * Omission notices are allocated BEFORE the source they describe
 * (§551-§552). Overlapping ranges are merged (§546-§548).
 */

import type { EvidenceRole, SourceLocation } from './obligations';
import { utf8ByteLength } from './budget-utf8';
import { degradationLadder } from './degradation';

// ===========================================================================
// SourceAtom
// ===========================================================================

/**
 * A complete meaningful symbol or registration range — NOT an arbitrary
 * text window (§545-§546). May degrade to a complete signature plus
 * exact source location when the full atom cannot fit (Slice 4.3).
 */
export interface SourceAtom {
  /** Optional structured-degradation ceiling imposed by delivered-file maxFiles. */
  maximumTier?: 'full' | 'signature' | 'location';
  /** Stable atom identifier. */
  id: string;
  /** All original identifiers represented by this merged atom. */
  sourceAtomIds?: readonly string[];
  /** Requirement ids this atom satisfies. */
  requirementIds: readonly string[];
  /** The file containing this atom. */
  filePath: string;
  /** The exact range in the file. */
  range: SourceLocation;
  /** The full atom text. */
  text: string;
  /** Optional signature (used for structured degradation). */
  signature?: string;
  /** Role (drives allocation priority). */
  role: EvidenceRole;
  /** Required vs supporting. */
  required: boolean;
  /** True if this atom is an alternative needed to preserve ambiguity. */
  isAlternative?: boolean;
  /** Complete Markdown heading/fence overhead measured before allocation. */
  overhead?: string;
}

// ===========================================================================
// Allocation outcomes
// ===========================================================================

export type AtomDisposition =
  | { kind: 'returned'; atomId: string; bytes: number }
  | { kind: 'degraded'; atomId: string; degradedTo: 'signature' | 'location'; bytes: number }
  | { kind: 'omitted'; atomId: string; reason: 'budget' | 'oversized'; bytes: 0 };

export interface AllocationResult {
  dispositions: AtomDisposition[];
  /** Exact renderable units in allocation order. */
  entries: Array<{ atom: SourceAtom; text: string; disposition: AtomDisposition }>;
  /** Total bytes consumed by the body (atoms + their overhead). */
  totalBytes: number;
  /** Remaining allowance after allocation. */
  remainingBytes: number;
  /** Atoms that could not fit at all (for gap reporting). */
  omittedAtomIds: string[];
}

// ===========================================================================
// Priority order
// ===========================================================================

/**
 * Sort atoms for allocation. Required anchor/path-node/relationship-site
 * come before alternatives, which come before supporting context.
 * Within a tier, sort by (filePath, range.startLine, id) for determinism.
 */
function allocationPriority(atom: SourceAtom): number {
  if (atom.required) {
    if (atom.role === 'definition' || atom.role === 'invocation-site' ||
        atom.role === 'registration-site' || atom.role === 'scheduling-site') {
      return 0;
    }
    return 1;
  }
  if (atom.isAlternative) return 2;
  return 3;
}

const ROLE_PRIORITY: Readonly<Record<EvidenceRole, number>> = {
  definition: 0,
  'invocation-site': 1,
  'registration-site': 1,
  'scheduling-site': 1,
  condition: 2,
  'state-mutation': 2,
  'exception-branch': 3,
  'external-terminal': 4,
  'alternative-branch': 5,
  supporting: 6,
};

export function compareSourceAtoms(a: SourceAtom, b: SourceAtom): number {
  const pa = allocationPriority(a);
  const pb = allocationPriority(b);
  if (pa !== pb) return pa - pb;
  if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
  if (a.range.startLine !== b.range.startLine) return a.range.startLine - b.range.startLine;
  const roleOrder = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
  if (roleOrder !== 0) return roleOrder;
  if (a.id !== b.id) return a.id.localeCompare(b.id);
  if (a.range.endLine !== b.range.endLine) return a.range.endLine - b.range.endLine;
  if (a.required !== b.required) return Number(b.required) - Number(a.required);
  if (Boolean(a.isAlternative) !== Boolean(b.isAlternative)) {
    return Number(a.isAlternative) - Number(b.isAlternative);
  }
  return (a.signature ?? '').localeCompare(b.signature ?? '')
    || a.text.localeCompare(b.text) || (a.overhead ?? '').localeCompare(b.overhead ?? '');
}

// ===========================================================================
// Overlap merging
// ===========================================================================

/**
 * Merge overlapping atoms in the same file (§546-§548). Containers do
 * NOT implicitly pull an entire class/file. When two atoms in the same
 * file overlap, merge their ranges and keep the union of requirementIds.
 *
 * Atoms are merged only when their line ranges overlap. Shared source lines
 * must agree byte-for-byte; verified callers may replace the result with a
 * fresh bounded read of the combined range.
 */
export function mergeOverlappingAtoms(atoms: readonly SourceAtom[]): SourceAtom[] {
  // Group by file.
  const byFile = new Map<string, SourceAtom[]>();
  for (const a of atoms) {
    if (!byFile.has(a.filePath)) byFile.set(a.filePath, []);
    byFile.get(a.filePath)!.push(a);
  }

  const merged: SourceAtom[] = [];
  for (const [, fileAtoms] of byFile) {
    // Sort by start line, then end line.
    const sorted = [...fileAtoms].sort((a, b) =>
      a.range.startLine !== b.range.startLine
        ? a.range.startLine - b.range.startLine
        : a.range.endLine - b.range.endLine,
    );

    let i = 0;
    while (i < sorted.length) {
      const base = sorted[i]!;
      let endLine = base.range.endLine;
      const reqIds = new Set(base.requirementIds);
      const members: SourceAtom[] = [base];
      let j = i + 1;
      // Merge only actual overlap; adjacency does not authorize unselected lines.
      while (j < sorted.length) {
        const next = sorted[j]!;
        if (next.range.startLine > endLine) break;
        endLine = Math.max(endLine, next.range.endLine);
        for (const r of next.requirementIds) reqIds.add(r);
        members.push(next);
        j += 1;
      }

      if (members.length === 1) {
        merged.push(base);
      } else if (members.every((member) => member.id === base.id
        && member.range.startLine === base.range.startLine && member.range.endLine === base.range.endLine
        && member.text === base.text && member.signature === base.signature
        && member.role === base.role && member.required === base.required
        && member.isAlternative === base.isAlternative && member.maximumTier === base.maximumTier
        && member.overhead === base.overhead)) {
        merged.push({
          ...base,
          requirementIds: [...reqIds].sort(),
          sourceAtomIds: members.some((member) => member.sourceAtomIds !== undefined)
            ? [...new Set(members.flatMap((member) => member.sourceAtomIds ?? [member.id]))].sort()
            : undefined,
        });
      } else {        // Merge only identity/range metadata. Concatenating these texts
        // would repeat their overlap and invent bytes absent from source.
        const orderedMembers = [...members].sort(compareSourceAtoms);
        const first = orderedMembers[0]!;
        const range = {
          filePath: base.filePath,
          startLine: Math.min(...members.map((member) => member.range.startLine)),
          endLine,
        };
        const signatures = new Set(members.flatMap((member) =>
          member.signature === undefined ? [] : [member.signature]));
        const sameRange = (member: SourceAtom) =>
          member.range.startLine === range.startLine && member.range.endLine === range.endLine;
        const signatureRangeUnchanged = members.every(sameRange);
        const sourceLines = new Map<number, string>();
        for (const member of members) {
          const lines = member.text.split('\n');
          if (lines.length !== member.range.endLine - member.range.startLine + 1) {
            throw new Error(`invalid-input: unmaterialized or incomplete shared atom ${member.id}`);
          }
          for (let offset = 0; offset < lines.length; offset += 1) {
            const line = member.range.startLine + offset;
            const text = lines[offset]!;
            const previous = sourceLines.get(line);
            if (previous !== undefined && previous !== text) {
              throw new Error(`invalid-input: conflicting source for shared atom ${first.id}`);
            }
            sourceLines.set(line, text);
          }
        }
        merged.push({
          id: first.id,
          sourceAtomIds: [...new Set(members.flatMap((member) =>
            member.sourceAtomIds ?? [member.id]))].sort(),
          filePath: base.filePath,
          role: first.role,
          required: members.some((member) => member.required),
          isAlternative: first.isAlternative,
          maximumTier: members.some((m) => m.maximumTier === 'location')
            ? 'location' : members.some((m) => m.maximumTier === 'signature')
              ? 'signature' : members.some((m) => m.maximumTier === 'full') ? 'full' : undefined,
          // A signature for only part of an enlarged range is not a signature
          // for that range. Conflicting same-range signatures are also unsafe.
          signature: signatureRangeUnchanged && signatures.size === 1
            ? [...signatures][0] : undefined,
          overhead: `#### ${range.filePath}:${range.startLine}-${range.endLine}\n`,
          range,
          requirementIds: [...reqIds].sort(),
          text: Array.from({ length: endLine - range.startLine + 1 }, (_, offset) => {
            const text = sourceLines.get(range.startLine + offset);
            if (text === undefined) {
              throw new Error(`invalid-input: missing verified source for shared atom ${first.id}`);
            }
            return text;
          }).join('\n'),
        });
      }
      i = j;
    }
  }
  return merged;
}

// ===========================================================================
// Global allocation
// ===========================================================================

export interface GlobalAllocateOptions {
  /** Byte allowance for the body (output of Slice 4.1). */
  bodyAllowance: number;
  /** Frozen compact trace/ambiguity/gap prefix, paid before any source. */
  skeleton?: string;
}

/**
 * Allocate atoms globally against a fixed byte allowance.
 *
 * Returns the per-atom disposition. The algorithm never truncates an
 * atom: each atom is returned whole, degraded to a whole signature, or
 * omitted entirely (Slice 4.3 owns the degradation ladder).
 *
 * Omission notices for already-omitted required atoms are allocated
 * before attempting to place the next atom (§551-§552).
 */
export interface VerifiedAtomSource {
  readRange(range: SourceLocation): string;
}

/** Materialize an overlapping range from the same verified immutable text. */
export function rematerializeAtoms(
  atoms: readonly SourceAtom[],
  source: VerifiedAtomSource,
): SourceAtom[] {
  return mergeOverlappingAtoms(atoms).map((atom) => {
    const text = source.readRange(atom.range);
    return {
      ...atom,
      text,
      overhead: atom.overhead ?? `#### ${atom.filePath}:${atom.range.startLine}-${atom.range.endLine}\n`,
    };
  });
}

export function globalAllocateAtoms(
  atoms: readonly SourceAtom[],
  options: GlobalAllocateOptions,
): AllocationResult {
  const merged = mergeOverlappingAtoms(atoms);
  const ordered = [...merged].sort(compareSourceAtoms);
  // The frozen trace/ambiguity/gap skeleton is allocated before source.
  // Existing callers without a skeleton retain their original allowance.
  const allowance = options.bodyAllowance - utf8ByteLength(options.skeleton ?? '');
  if (allowance < 0) throw new Error('budget-exhausted: minimum skeleton exceeds body allowance');

  const entries: AllocationResult['entries'] = [];
  let usedBytes = 0;
  // Reserve every complete minimum gap before promoting any atom. A later
  // required file can therefore never be squeezed out by an earlier full body.
  for (const atom of ordered) {
    const text = `${atom.overhead ?? ''}[gap:${atom.id}:budget-exhausted]\n`;
    const bytes = utf8ByteLength(text);
    if (usedBytes + bytes > allowance) {
      throw new Error(`budget-exhausted: minimum gap for ${atom.id} exceeds body allowance`);
    }
    entries.push({
      atom,
      text,
      disposition: { kind: 'omitted', atomId: atom.id, reason: 'budget', bytes: 0 },
    });
    usedBytes += bytes;
  }

  for (const entry of entries) {
    const { atom } = entry;
    const reservedBytes = utf8ByteLength(entry.text);
    const remaining = allowance - usedBytes + reservedBytes;
    const omission = `[gap:${atom.id}:budget-exhausted]\n`;
    const locationAllowance = Math.max(0, remaining
      - utf8ByteLength(omission));
    const rendering = degradationLadder(atom, remaining);
    if (rendering?.tier === 'full') {
      entry.text = (atom.overhead ?? '') + atom.text + '\n';
      entry.disposition = { kind: 'returned', atomId: atom.id, bytes: rendering.bytes };
    } else if (rendering?.tier === 'signature') {
      entry.text = (atom.overhead ?? '') + rendering.text + '\n';
      entry.disposition = {
        kind: 'degraded', atomId: atom.id, degradedTo: 'signature', bytes: rendering.bytes,
      };
    } else if (atom.maximumTier !== 'signature' && atom.maximumTier !== 'full') {
      const location = degradationLadder(
        { ...atom, signature: undefined, maximumTier: 'location' },
        locationAllowance,
      );
      if (location?.tier === 'location') {
        entry.text = (atom.overhead ?? '') + location.text + '\n' + omission;
        entry.disposition = {
          kind: 'degraded', atomId: atom.id, degradedTo: 'location', bytes: location.bytes,
        };
      }
    }
    usedBytes += utf8ByteLength(entry.text) - reservedBytes;
  }

  if (usedBytes > allowance) {
    throw new Error('budget-exhausted: minimum atom/gap accounting exceeds body allowance');
  }
  return {
    dispositions: entries.flatMap((entry) =>
      (entry.atom.sourceAtomIds ?? [entry.atom.id]).map((atomId) => ({
        ...entry.disposition, atomId,
      }))),
    entries,
    totalBytes: utf8ByteLength(options.skeleton ?? '') + usedBytes,
    remainingBytes: Math.max(0, allowance - usedBytes),
    omittedAtomIds: entries.flatMap((entry) =>
      entry.disposition.kind === 'omitted' ? (entry.atom.sourceAtomIds ?? [entry.atom.id]) : []),
  };
}
