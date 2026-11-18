/**
 * Slice 3.1: Evidence-model types — unit tests.
 *
 * These tests pin the data model and the obligation-disposition derivation
 * order (contract §390-§395). They do NOT exercise anchor discovery,
 * expansion, trace composition, or closure — those land in Slice 3.2-3.5.
 */

import { describe, expect, it } from 'vitest';
import {
  deriveObligationDisposition,
  symbolIdentityKey,
  sourceLocationKey,
  type EvidenceCertainty,
  type EvidenceRole,
  type EvidenceRequirement,
  type QueryObligation,
  type SymbolIdentity,
} from '../src/explore/obligations';
import { deriveCoverageLedger } from '../src/explore/ledger';

// ---------------------------------------------------------------------------
// Type-level assertions (compile-time checks that the data model is complete)
// ---------------------------------------------------------------------------

describe('Slice 3.1 — type model', () => {
  it('EvidenceCertainty covers all four contract values', () => {
    const values: EvidenceCertainty[] = ['observed', 'resolved', 'inferred', 'ambiguous'];
    expect(values).toHaveLength(4);
  });

  it('EvidenceRole covers every contract role', () => {
    const roles: EvidenceRole[] = [
      'definition',
      'invocation-site',
      'registration-site',
      'scheduling-site',
      'condition',
      'state-mutation',
      'alternative-branch',
      'exception-branch',
      'external-terminal',
      'supporting',
    ];
    expect(roles).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// SymbolIdentity / SourceLocation canonical keys
// ---------------------------------------------------------------------------

describe('Slice 3.1 — canonical keys', () => {
  it('symbolIdentityKey disambiguates overloads by parameter types', () => {
    const a: SymbolIdentity = { name: 'foo', location: 'a.ts:1', parameterTypes: ['string'] };
    const b: SymbolIdentity = { name: 'foo', location: 'a.ts:5', parameterTypes: ['number'] };
    expect(symbolIdentityKey(a)).not.toBe(symbolIdentityKey(b));
  });

  it('symbolIdentityKey falls back to arity when parameter types are missing', () => {
    const a: SymbolIdentity = { name: 'foo', location: 'a.ts:1', arity: 2 };
    const b: SymbolIdentity = { name: 'foo', location: 'a.ts:1', arity: 3 };
    expect(symbolIdentityKey(a)).not.toBe(symbolIdentityKey(b));
  });

  it('symbolIdentityKey includes container for method disambiguation', () => {
    const a: SymbolIdentity = { name: 'run', container: 'Foo', location: 'a.ts:1' };
    const b: SymbolIdentity = { name: 'run', container: 'Bar', location: 'a.ts:10' };
    expect(symbolIdentityKey(a)).toContain('Foo.run');
    expect(symbolIdentityKey(b)).toContain('Bar.run');
  });

  it('sourceLocationKey is stable', () => {
    expect(sourceLocationKey({ filePath: 'a.ts', startLine: 3, endLine: 7 })).toBe('a.ts:3-7');
  });
});

// ---------------------------------------------------------------------------
// deriveObligationDisposition (contract §390-§395)
// ---------------------------------------------------------------------------

describe('Slice 3.1 — obligation disposition derivation', () => {
  it('required: missing links → unresolved', () => {
    const disp = deriveObligationDisposition(
      { required: true },
      [],
      { hasUnresolvedLinks: true },
    );
    expect(disp).toBe('unresolved');
  });

  it('required: empty requirements → unresolved', () => {
    const disp = deriveObligationDisposition({ required: true }, []);
    expect(disp).toBe('unresolved');
  });

  it('required: any omitted → omitted', () => {
    const disp = deriveObligationDisposition({ required: true }, [
      { disposition: 'returned', obligationIds: [] },
      { disposition: 'omitted', obligationIds: [] },
    ]);
    expect(disp).toBe('omitted');
  });

  it('required: any degraded (no omitted) → degraded', () => {
    const disp = deriveObligationDisposition({ required: true }, [
      { disposition: 'returned', obligationIds: [] },
      { disposition: 'degraded', obligationIds: [] },
    ]);
    expect(disp).toBe('degraded');
  });

  it('required: all returned → satisfied', () => {
    const disp = deriveObligationDisposition({ required: true }, [
      { disposition: 'returned', obligationIds: [] },
      { disposition: 'returned', obligationIds: [] },
    ]);
    expect(disp).toBe('satisfied');
  });

  it('supporting: empty requirements → omitted', () => {
    const disp = deriveObligationDisposition({ required: false }, []);
    expect(disp).toBe('omitted');
  });

  it('supporting: any omitted → omitted', () => {
    const disp = deriveObligationDisposition({ required: false }, [
      { disposition: 'omitted', obligationIds: [] },
    ]);
    expect(disp).toBe('omitted');
  });

  it('supporting: any degraded → degraded', () => {
    const disp = deriveObligationDisposition({ required: false }, [
      { disposition: 'degraded', obligationIds: [] },
    ]);
    expect(disp).toBe('degraded');
  });

  it('supporting: all returned → satisfied', () => {
    const disp = deriveObligationDisposition({ required: false }, [
      { disposition: 'returned', obligationIds: [] },
    ]);
    expect(disp).toBe('satisfied');
  });

  it('required disposition precedence: unresolved > omitted > degraded > satisfied', () => {
    // Multiple dispositions present: omitted wins over degraded
    const disp = deriveObligationDisposition({ required: true }, [
      { disposition: 'degraded', obligationIds: [] },
      { disposition: 'omitted', obligationIds: [] },
      { disposition: 'returned', obligationIds: [] },
    ]);
    expect(disp).toBe('omitted');
  });
});

// ---------------------------------------------------------------------------
// CoverageLedger now carries obligations (Slice 3.1 extension)
// ---------------------------------------------------------------------------

describe('Slice 3.1 — CoverageLedger carries obligations', () => {
  it('obligations defaults to empty when not supplied (Slice 2 behaviour)', () => {
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'returned' },
      requiredIds: new Set(['a']),
      gaps: [],
      searchExhausted: false,
    });
    expect(ledger.obligations).toEqual([]);
  });

  it('obligations are surfaced when supplied (Slice 3 wiring)', () => {
    const obligation: QueryObligation = {
      id: 'ob-1',
      role: 'definition',
      required: true,
      requirementIds: ['a'],
      disposition: 'satisfied',
    };
    const ledger = deriveCoverageLedger({
      dispositions: { a: 'returned' },
      requiredIds: new Set(['a']),
      gaps: [],
      searchExhausted: false,
      obligations: [obligation],
    });
    expect(ledger.obligations).toHaveLength(1);
    expect(ledger.obligations[0].id).toBe('ob-1');
    expect(ledger.obligations[0].role).toBe('definition');
  });

  it('EvidenceRequirement type carries the contract fields', () => {
    const req: EvidenceRequirement = {
      id: 'req-1',
      obligationIds: ['ob-1'],
      kind: 'anchor',
      role: 'definition',
      requirement: 'required',
      provenance: {},
      disposition: 'returned',
    };
    expect(req.kind).toBe('anchor');
    expect(req.requirement).toBe('required');
  });
});
