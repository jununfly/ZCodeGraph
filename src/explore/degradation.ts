/**
 * Slice 4.3: Structured degradation ladder (DES-universal-structural-explore-v1 §545-§550).
 *
 * A required source atom may degrade to a complete signature plus exact
 * source location when the full atom cannot fit; this is `partial`,
 * never `complete`. If the signature cannot fit, it degrades as a whole
 * to location plus a gap; the signature is NEVER sliced.
 *
 * An oversized single atom is reported, not sliced (§549-§550).
 *
 * Forbidden behaviors:
 *   - Slicing a method mid-body
 *   - Slicing a Unicode codepoint
 *   - Tail-cutting the assembled answer
 *   - Any "necessary-file" bypass around the allocator
 */

import type { SourceAtom } from './allocator';
import { utf8ByteLength } from './budget-utf8';

// ===========================================================================
// Degradation ladder
// ===========================================================================

export type DegradationTier = 'full' | 'signature' | 'location';

export interface DegradedRendering {
  tier: DegradationTier;
  /** The exact bytes to emit. */
  text: string;
  /** Byte length of `text`. */
  bytes: number;
}

/**
 * Compute the degradation ladder for an atom against a remaining byte
 * allowance. Returns the first tier that fits, or null if even the
 * location line does not fit (caller must then emit a gap).
 *
 * The ladder is strict: full → signature → location. We never emit
 * a partial signature, never emit a partial location, never emit a
 * partial codepoint.
 */
export function degradationLadder(
  atom: SourceAtom,
  remainingBytes: number,
  perAtomOverheadBytes: number,
): DegradedRendering | null {
  // Tier 1: full atom.
  const fullBytes = utf8ByteLength(atom.text) + perAtomOverheadBytes;
  if (fullBytes <= remainingBytes) {
    return { tier: 'full', text: atom.text, bytes: fullBytes };
  }

  // Tier 2: complete signature (never sliced).
  if (atom.signature !== undefined) {
    const sigBytes = utf8ByteLength(atom.signature) + perAtomOverheadBytes;
    if (sigBytes <= remainingBytes) {
      return { tier: 'signature', text: atom.signature, bytes: sigBytes };
    }
  }

  // Tier 3: location-only.
  const locationText = formatLocation(atom);
  const locationBytes = utf8ByteLength(locationText) + perAtomOverheadBytes;
  if (locationBytes <= remainingBytes) {
    return { tier: 'location', text: locationText, bytes: locationBytes };
  }

  return null;
}

/** Format an atom's exact source location. */
export function formatLocation(atom: SourceAtom): string {
  return `${atom.filePath}:${atom.range.startLine}-${atom.range.endLine}`;
}

// ===========================================================================
// Oversize detection
// ===========================================================================

/**
 * True iff the atom is oversized — even its full form exceeds the
 * total body allowance. Oversized atoms are REPORTED, not sliced
 * (§549-§550). The caller should emit a gap entry.
 */
export function isOversizedAtom(
  atom: SourceAtom,
  bodyAllowance: number,
  perAtomOverheadBytes: number,
): boolean {
  const fullBytes = utf8ByteLength(atom.text) + perAtomOverheadBytes;
  if (fullBytes <= bodyAllowance) return false;
  // Even the location-only form might fit; only report oversized when
  // the FULL form alone exceeds the entire allowance AND we cannot
  // show even a signature.
  if (atom.signature !== undefined) {
    const sigBytes = utf8ByteLength(atom.signature) + perAtomOverheadBytes;
    if (sigBytes <= bodyAllowance) return false;
  }
  const locationBytes = utf8ByteLength(formatLocation(atom)) + perAtomOverheadBytes;
  return locationBytes > bodyAllowance;
}

// ===========================================================================
// Unicode safety
// ===========================================================================

/**
 * Slice a string at a Unicode codepoint boundary. The budget is in
 * UTF-8 bytes, but we never split a multi-byte codepoint. This helper
 * is for DIAGNOSTIC messages that may need to be shortened — NOT for
 * source atoms (which are never sliced, per the contract).
 */
export function sliceAtCodepointBoundary(text: string, maxBytes: number): string {
  if (utf8ByteLength(text) <= maxBytes) return text;
  const buf = Buffer.from(text, 'utf8');
  let end = Math.min(maxBytes, buf.length);
  // Back off to a codepoint boundary: a UTF-8 continuation byte has
  // the high bits `10`.
  while (end > 0 && ((buf[end] ?? 0) & 0xc0) === 0x80) {
    end -= 1;
  }
  return buf.subarray(0, end).toString('utf8');
}
