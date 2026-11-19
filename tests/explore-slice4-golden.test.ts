/**
 * Slice 4.5: Golden test matrix (DES-universal-structural-explore-v1 §648-§657).
 *
 * Covers exact UTF-8 cap boundaries, transport notices, single oversized
 * atom/signature, several necessary large files, duplicate atoms, omission
 * overhead, minimum-envelope exhaustion, no mid-method/Unicode/text-tail
 * cut, byte-identical repeated rendering.
 */

import { describe, expect, it } from 'vitest';
import {
  computeApplicationBodyAllowance,
  freezeTransportNotice,
  utf8ByteLength,
  verifyComposedCap,
  type Utf8Budget,
} from '../src/explore/budget-utf8';
import { globalAllocateAtoms, rematerializeAtoms, type SourceAtom } from '../src/explore/allocator';
import { sliceAtCodepointBoundary } from '../src/explore/degradation';
import { renderCompactExploreSkeleton } from '../src/explore/skeleton';
import type { TracePath } from '../src/explore/obligations';
import {
  buildBudgetExhaustedEnvelope,
  measureEnvelopeBytes,
} from '../src/explore/exhausted';

function atom(partial: Partial<SourceAtom> & Pick<SourceAtom, 'id' | 'filePath' | 'text'>): SourceAtom {
  return {
    requirementIds: [],
    range: { filePath: partial.filePath, startLine: 1, endLine: 5 },
    role: 'definition',
    required: true,
    ...partial,
  };
}

describe('Slice 4.5 — golden matrix', () => {
  it('exact UTF-8 cap boundary is honored (no off-by-one)', () => {
    const body = '中'.repeat(10); // 30 UTF-8 bytes
    const a = atom({ id: 'a', filePath: 'f.ts', text: body });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: utf8ByteLength(body + '\n'), // exact fit, including the real separator
    });
    expect(result.dispositions[0].kind).toBe('returned');
    expect(result.totalBytes).toBe(31);

    const result29 = globalAllocateAtoms([a], {
      bodyAllowance: utf8ByteLength('[gap:a:budget-exhausted]\n'), // full cannot fit; complete gap can
    });
    expect(result29.dispositions[0].kind).not.toBe('returned');
  });

  it('transport notice reservation is subtracted before body allocation', () => {
    const budget: Utf8Budget = {
      maxOutputUtf8Bytes: 100,
      transportReservation: freezeTransportNotice({
        noticeLines: ['pending: 3 files', 'worktree: dirty'],
        separatorBytes: 1,
        cliNewlineBytes: 1,
      }),
      optionalCliNewlineBytes: 1,
      minimumErrorUtf8Bytes: 20,
    };
    const allowance = computeApplicationBodyAllowance(budget);
    expect(allowance).toBe(100 - budget.transportReservation.utf8Bytes - 1);
    expect(allowance).toBeLessThan(100);
  });

  it('single oversized atom is reported, not sliced', () => {
    const big = atom({ id: 'big', filePath: 'f.ts', text: 'x'.repeat(10000) });
    const result = globalAllocateAtoms([big], {
      bodyAllowance: 100,
    });
    // Full form does not fit; if no signature, location-only may fit;
    // either way the FULL text must NOT appear truncated.
    for (const d of result.dispositions) {
      if (d.kind === 'returned') {
        // If returned, the byte count must match the full atom.
        expect(d.bytes).toBeGreaterThanOrEqual(10000);
      }
    }
  });

  it('several necessary large files compete in ONE global allocator (no necessary-file bypass)', () => {
    const a = atom({ id: 'a', filePath: 'a.ts', text: 'x'.repeat(40) });
    const b = atom({ id: 'b', filePath: 'b.ts', text: 'y'.repeat(40) });
    const c = atom({ id: 'c', filePath: 'c.ts', text: 'z'.repeat(40) });
    // Two full atoms plus one complete omission; no source is cut to make room.
    const result = globalAllocateAtoms([a, b, c], {
      bodyAllowance: 82 + utf8ByteLength('[gap:c:budget-exhausted]\n'),
    });
    const returned = result.dispositions.filter((d) => d.kind === 'returned');
    // At most 2 can be returned.
    expect(returned.length).toBeLessThanOrEqual(2);
    // At least one is not returned (omitted or degraded).
    expect(result.dispositions.some((d) => d.kind !== 'returned')).toBe(true);
  });

  it('duplicate atoms do not double-count bytes', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hello', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const dup = atom({ id: 'a', filePath: 'f.ts', text: 'hello', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const result = globalAllocateAtoms(rematerializeAtoms([a, dup], {
      readRange: () => 'hello',
    }), {
      bodyAllowance: 100,
    });
    // The exact source/header separator is retained; duplicate source is emitted once.
    expect(result.totalBytes).toBe(utf8ByteLength('#### f.ts:1-5\nhello\n'));
  });

  it('omission notices are allocated before the source they describe', () => {
    const a = atom({ id: 'a', filePath: 'a.ts', text: 'x'.repeat(100) });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: utf8ByteLength('[gap:a:budget-exhausted]\n'),
    });
    // The complete omission is reserved before its source and charged once.
    expect(result.dispositions[0].kind).toBe('omitted');
    expect(result.totalBytes).toBe(utf8ByteLength('[gap:a:budget-exhausted]\n'));
  });

  it('minimum-envelope exhaustion produces a stable bounded envelope', () => {
    const env = buildBudgetExhaustedEnvelope({
      selectedRequirements: 5,
      returnedRequirements: 0,
      omittedRequirements: 5,
      gapIds: ['g1', 'g2'],
    });
    expect(env.kind).toBe('failed');
    expect(env.code).toBe('budget-exhausted');
    expect(measureEnvelopeBytes(env)).toBeGreaterThan(0);
    expect(env.stableIds).toEqual(['g1', 'g2']);
  });

  it('no mid-Unicode cut when slicing diagnostics', () => {
    const text = 'a中文b🚀c';
    for (let cap = 0; cap <= utf8ByteLength(text); cap++) {
      const sliced = sliceAtCodepointBoundary(text, cap);
      // Result must be valid UTF-8 (no replacement characters).
      expect(sliced).not.toContain('�');
      expect(utf8ByteLength(sliced)).toBeLessThanOrEqual(cap);
    }
  });

  it('repeated rendering is byte-identical (determinism)', () => {
    const atoms = [
      atom({ id: 'a', filePath: 'a.ts', text: 'foo' }),
      atom({ id: 'b', filePath: 'b.ts', text: 'bar' }),
    ];
    const r1 = globalAllocateAtoms(atoms, { bodyAllowance: 100 });
    const r2 = globalAllocateAtoms(atoms, { bodyAllowance: 100 });
    expect(JSON.stringify(r1.dispositions)).toBe(JSON.stringify(r2.dispositions));
    expect(r1.totalBytes).toBe(r2.totalBytes);
  });

  it('keeps A→B→C trace steps in path order while sorting trace boundaries', () => {
    const step = (relationId: string): TracePath['steps'][number] => ({
      relationId, semantics: 'direct-call', guards: [],
    });
    const traces: TracePath[] = [
      { id: 'trace-z', status: 'connected', requiredRelationIds: [], steps: [step('z-last')] },
      { id: 'trace-a', status: 'connected', requiredRelationIds: [], steps: [step('c-third'), step('a-first'), step('b-second')] },
    ];
    const skeleton = renderCompactExploreSkeleton({ traces, anchors: [], gaps: [] });
    expect(skeleton.indexOf('trace-a')).toBeLessThan(skeleton.indexOf('trace-z'));
    expect(skeleton.indexOf('relation=c-third')).toBeLessThan(skeleton.indexOf('relation=a-first'));
    expect(skeleton.indexOf('relation=a-first')).toBeLessThan(skeleton.indexOf('relation=b-second'));
  });

  it('composed cap postcondition holds for the assembled answer', () => {
    const budget: Utf8Budget = {
      maxOutputUtf8Bytes: 100,
      transportReservation: { utf8Bytes: 10 },
      optionalCliNewlineBytes: 1,
      minimumErrorUtf8Bytes: 20,
    };
    const noticeBytes = 8;
    const bodyBytes = 80;
    expect(verifyComposedCap(budget, noticeBytes, bodyBytes)).toBe(true);
    expect(verifyComposedCap(budget, noticeBytes, 95)).toBe(false);
  });
});
