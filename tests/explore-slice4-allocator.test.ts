/**
 * Slice 4.2 / 4.3: Global allocator + degradation ladder — unit tests.
 */

import { describe, expect, it } from 'vitest';
import {
  globalAllocateAtoms,
  mergeOverlappingAtoms,
  type SourceAtom,
} from '../src/explore/allocator';
import {
  degradationLadder,
  formatLocation,
  isOversizedAtom,
  sliceAtCodepointBoundary,
} from '../src/explore/degradation';
import { utf8ByteLength } from '../src/explore/budget-utf8';

function atom(partial: Partial<SourceAtom> & Pick<SourceAtom, 'id' | 'filePath' | 'text'>): SourceAtom {
  return {
    requirementIds: [],
    range: { filePath: partial.filePath, startLine: 1, endLine: 5 },
    role: 'definition',
    required: true,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// mergeOverlappingAtoms
// ---------------------------------------------------------------------------

describe('Slice 4.2 — mergeOverlappingAtoms', () => {
  it('merges adjacent atoms in the same file', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'aaa', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'bbb', range: { filePath: 'f.ts', startLine: 5, endLine: 10 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].range.endLine).toBe(10);
    expect(merged[0].text).toBe('aaabbb');
  });

  it('does NOT merge atoms in different files', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'aaa', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'g.ts', text: 'bbb', range: { filePath: 'g.ts', startLine: 1, endLine: 5 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged).toHaveLength(2);
  });

  it('does NOT merge non-overlapping atoms in the same file', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'aaa', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'bbb', range: { filePath: 'f.ts', startLine: 20, endLine: 25 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged).toHaveLength(2);
  });

  it('unions requirementIds on merge', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'a', requirementIds: ['r1'], range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'b', requirementIds: ['r2'], range: { filePath: 'f.ts', startLine: 5, endLine: 10 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged[0].requirementIds.sort()).toEqual(['r1', 'r2']);
  });
});

// ---------------------------------------------------------------------------
// globalAllocateAtoms
// ---------------------------------------------------------------------------

describe('Slice 4.2 — globalAllocateAtoms', () => {
  it('returns full atoms when budget allows', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hello' });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: 1000,
      perAtomOverheadBytes: 0,
      omissionNoticeBytes: 0,
    });
    expect(result.dispositions[0].kind).toBe('returned');
    expect(result.omittedAtomIds).toHaveLength(0);
  });

  it('degrades to signature when full does not fit', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'this is a long atom body that does not fit',
      signature: 'fn foo()',
    });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: 10,
      perAtomOverheadBytes: 0,
      omissionNoticeBytes: 0,
    });
    expect(result.dispositions[0].kind).toBe('degraded');
    if (result.dispositions[0].kind === 'degraded') {
      expect(result.dispositions[0].degradedTo).toBe('signature');
    }
  });

  it('degrades to location when signature also does not fit', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'this is a long atom body that does not fit at all',
      signature: 'fn foo() with a very long signature that also overflows',
    });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: 12,
      perAtomOverheadBytes: 0,
      omissionNoticeBytes: 0,
    });
    expect(result.dispositions[0].kind).toBe('degraded');
    if (result.dispositions[0].kind === 'degraded') {
      expect(result.dispositions[0].degradedTo).toBe('location');
    }
  });

  it('omits atom and reserves omission-notice bytes when nothing fits', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'x'.repeat(100),
      signature: 'y'.repeat(80),
    });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: 5,
      perAtomOverheadBytes: 0,
      omissionNoticeBytes: 10,
    });
    expect(result.dispositions[0].kind).toBe('omitted');
    expect(result.omittedAtomIds).toContain('a');
  });

  it('required atoms allocate before alternatives before supporting', () => {
    // Use distinct files and ranges so mergeOverlappingAtoms does NOT merge them.
    const required = atom({
      id: 'r', filePath: 'r.ts', text: 'req', required: true, isAlternative: false,
      range: { filePath: 'r.ts', startLine: 1, endLine: 3 },
    });
    const alternative = atom({
      id: 'a', filePath: 'a.ts', text: 'alt', required: false, isAlternative: true,
      range: { filePath: 'a.ts', startLine: 1, endLine: 3 },
    });
    const supporting = atom({
      id: 's', filePath: 's.ts', text: 'sup', required: false, isAlternative: false,
      range: { filePath: 's.ts', startLine: 1, endLine: 3 },
    });
    // Budget fits only the required atom ('req' = 3 bytes).
    const result = globalAllocateAtoms([supporting, alternative, required], {
      bodyAllowance: 5,
      perAtomOverheadBytes: 0,
      omissionNoticeBytes: 0,
    });
    const req = result.dispositions.find((d) => d.atomId === 'r');
    expect(req?.kind).toBe('returned');
  });
});

// ---------------------------------------------------------------------------
// degradationLadder
// ---------------------------------------------------------------------------

describe('Slice 4.3 — degradationLadder', () => {
  it('returns full when it fits', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hi' });
    const r = degradationLadder(a, 100, 0);
    expect(r?.tier).toBe('full');
  });

  it('returns signature when full does not fit but signature does', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'long body here', signature: 'fn f()' });
    const r = degradationLadder(a, 8, 0);
    expect(r?.tier).toBe('signature');
  });

  it('returns location when signature also overflows', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'long body here', signature: 'a very long signature that will not fit',
    });
    const r = degradationLadder(a, 12, 0);
    expect(r?.tier).toBe('location');
    expect(r?.text).toBe(formatLocation(a));
  });

  it('returns null when even location does not fit', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hi' });
    const r = degradationLadder(a, 1, 0);
    expect(r).toBeNull();
  });
});

describe('Slice 4.3 — isOversizedAtom', () => {
  it('detects an atom whose full form exceeds the entire allowance', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'x'.repeat(1000) });
    expect(isOversizedAtom(a, 5, 0)).toBe(true);
  });

  it('is NOT oversized when full fits', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hi' });
    expect(isOversizedAtom(a, 100, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unicode safety
// ---------------------------------------------------------------------------

describe('Slice 4.3 — sliceAtCodepointBoundary', () => {
  it('never splits a multi-byte codepoint', () => {
    const text = 'a中b'; // a=1, 中=3, b=1 → 5 bytes
    expect(utf8ByteLength(text)).toBe(5);
    // Cap at 2 bytes: should back off to 'a' (1 byte) since 中 starts at byte 1.
    const sliced = sliceAtCodepointBoundary(text, 2);
    expect(utf8ByteLength(sliced)).toBeLessThanOrEqual(2);
    expect(sliced).toBe('a');
  });

  it('returns the original string when under the cap', () => {
    const text = '中文';
    expect(sliceAtCodepointBoundary(text, 100)).toBe(text);
  });
});
