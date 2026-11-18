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

// ===========================================================================
// SourceAtom
// ===========================================================================

/**
 * A complete meaningful symbol or registration range — NOT an arbitrary
 * text window (§545-§546). May degrade to a complete signature plus
 * exact source location when the full atom cannot fit (Slice 4.3).
 */
export interface SourceAtom {
  /** Stable atom identifier. */
  id: string;
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

function compareAtoms(a: SourceAtom, b: SourceAtom): number {
  const pa = allocationPriority(a);
  const pb = allocationPriority(b);
  if (pa !== pb) return pa - pb;
  if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
  if (a.range.startLine !== b.range.startLine) return a.range.startLine - b.range.startLine;
  return a.id.localeCompare(b.id);
}

// ===========================================================================
// Overlap merging
// ===========================================================================

/**
 * Merge overlapping atoms in the same file (§546-§548). Containers do
 * NOT implicitly pull an entire class/file. When two atoms in the same
 * file overlap, merge their ranges and keep the union of requirementIds.
 *
 * Atoms are merged only when their line ranges overlap or are directly
 * adjacent. The merged atom's text must be recomputed by the caller
 * (we don't have file contents here).
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
      // Merge subsequent atoms that overlap or are adjacent.
      while (j < sorted.length) {
        const next = sorted[j]!;
        if (next.range.startLine > endLine + 1) break;
        endLine = Math.max(endLine, next.range.endLine);
        for (const r of next.requirementIds) reqIds.add(r);
        members.push(next);
        j += 1;
      }

      if (members.length === 1) {
        merged.push(base);
      } else {
        // Merge: keep the earliest atom's id + role + signature, but
        // expand the range and union requirementIds. Text composition:
        //   - If all members share the same text (true duplicates),
        //     keep just one copy (no double-counting).
        //   - Otherwise concatenate (overlapping ranges — the caller
        //     is responsible for re-materializing from disk if needed).
        const allSameText = members.every((m) => m.text === base.text);
        const combinedText = allSameText ? base.text : members.map((m) => m.text).join('');
        merged.push({
          id: base.id,
          filePath: base.filePath,
          role: base.role,
          required: base.required,
          isAlternative: base.isAlternative,
          signature: base.signature,
          range: { filePath: base.range.filePath, startLine: base.range.startLine, endLine },
          requirementIds: [...reqIds],
          text: combinedText,
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
  /** Per-atom overhead bytes (fences, line-number gutter, etc.). */
  perAtomOverheadBytes: number;
  /** Bytes for each omission notice (allocated BEFORE the source it describes). */
  omissionNoticeBytes: number;
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
export function globalAllocateAtoms(
  atoms: readonly SourceAtom[],
  options: GlobalAllocateOptions,
): AllocationResult {
  // Merge overlapping atoms first so we never double-count bytes.
  const merged = mergeOverlappingAtoms(atoms);
  // Deterministic order.
  const ordered = [...merged].sort(compareAtoms);

  const dispositions: AtomDisposition[] = [];
  const omittedAtomIds: string[] = [];
  let usedBytes = 0;

  for (const atom of ordered) {
    const atomBytes = utf8ByteLength(atom.text) + options.perAtomOverheadBytes;

    // Try to fit the full atom.
    if (usedBytes + atomBytes <= options.bodyAllowance) {
      dispositions.push({ kind: 'returned', atomId: atom.id, bytes: atomBytes });
      usedBytes += atomBytes;
      continue;
    }

    // Try signature degradation (if signature present).
    if (atom.signature !== undefined) {
      const sigBytes = utf8ByteLength(atom.signature) + options.perAtomOverheadBytes;
      if (usedBytes + sigBytes <= options.bodyAllowance) {
        dispositions.push({ kind: 'degraded', atomId: atom.id, degradedTo: 'signature', bytes: sigBytes });
        usedBytes += sigBytes;
        continue;
      }
    }

    // Try location-only degradation.
    const locationText = `${atom.filePath}:${atom.range.startLine}-${atom.range.endLine}`;
    const locationBytes = utf8ByteLength(locationText) + options.perAtomOverheadBytes;
    if (usedBytes + locationBytes <= options.bodyAllowance) {
      dispositions.push({ kind: 'degraded', atomId: atom.id, degradedTo: 'location', bytes: locationBytes });
      usedBytes += locationBytes;
      continue;
    }

    // Cannot fit even a location — omit and reserve bytes for the
    // omission notice (allocated before the next atom, §551-§552).
    dispositions.push({ kind: 'omitted', atomId: atom.id, reason: 'budget', bytes: 0 });
    omittedAtomIds.push(atom.id);
    usedBytes += options.omissionNoticeBytes;
  }

  return {
    dispositions,
    totalBytes: usedBytes,
    remainingBytes: Math.max(0, options.bodyAllowance - usedBytes),
    omittedAtomIds,
  };
}
