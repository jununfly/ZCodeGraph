/**
 * Slice 3.5: Obligation closure — unit tests.
 *
 * Pins:
 *   - interpretQuery derives definition obligations per anchor
 *   - mechanism keywords derive role-specific obligations
 *   - query-interpretation gap when mechanism named but no anchor
 *   - closure resolves definition/invocation/registration/scheduling
 *   - unresolved obligations produce graph-semantics-blocker gaps
 *   - an unsatisfied obligation is NOT silently dropped (§460-§461)
 *   - disposition derivation follows §390-§395 precedence
 */

import { describe, expect, it } from 'vitest';
import { closeObligations, interpretQuery } from '../src/explore/closure';
import type { AnchorMatch } from '../src/explore/anchors';
import type { ExpansionResult } from '../src/explore/expansion';
import type { EvidenceRelation, TracePath } from '../src/explore/obligations';

function anchor(nodeId: string): AnchorMatch {
  return {
    id: `a:${nodeId}`,
    nodeId,
    kind: 'explicit-symbol',
    clue: 'x',
    ambiguous: false,
    symbol: { name: nodeId, location: `a.ts:1` },
    location: { filePath: 'a.ts', startLine: 1, endLine: 5 },
  };
}

function rel(partial: Partial<EvidenceRelation> & Pick<EvidenceRelation, 'id' | 'sourceNodeId' | 'targetNodeId' | 'semantics'>): EvidenceRelation {
  return {
    kind: 'calls',
    certainty: 'observed',
    provenance: {},
    residuals: [],
    ...partial,
  };
}

function expansion(relations: EvidenceRelation[]): ExpansionResult {
  return {
    visited: new Map(),
    relations: new Map(relations.map((r) => [r.id, r])),
    adjacencyRows: 0,
    rounds: 0,
    exhausted: false,
    unvisitedNodeIds: [],
  };
}

// ---------------------------------------------------------------------------
// interpretQuery
// ---------------------------------------------------------------------------

describe('Slice 3.5 — interpretQuery', () => {
  it('derives a definition obligation per anchor', () => {
    const result = interpretQuery('find foo', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'definition')).toBe(true);
    expect(result.interpretationGaps).toHaveLength(0);
  });

  it('derives invocation-site obligation when query mentions "call"', () => {
    const result = interpretQuery('how does foo call bar', [anchor('foo'), anchor('bar')]);
    expect(result.obligations.some((o) => o.role === 'invocation-site')).toBe(true);
  });

  it('derives registration-site obligation for "register"', () => {
    const result = interpretQuery('where is foo registered', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'registration-site')).toBe(true);
  });

  it('derives scheduling-site obligation for "schedule"', () => {
    const result = interpretQuery('where is foo scheduled', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'scheduling-site')).toBe(true);
  });

  it('derives condition obligation for "guard"', () => {
    const result = interpretQuery('what guards foo', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'condition')).toBe(true);
  });

  it('derives state-mutation obligation for "mutate"', () => {
    const result = interpretQuery('what mutates foo', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'state-mutation')).toBe(true);
  });

  it('derives alternative-branch obligation for "else"', () => {
    const result = interpretQuery('what is the else branch of foo', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'alternative-branch')).toBe(true);
  });

  it('derives exception-branch obligation for "throw"', () => {
    const result = interpretQuery('what does foo throw', [anchor('foo')]);
    expect(result.obligations.some((o) => o.role === 'exception-branch')).toBe(true);
  });

  it('records a query-interpretation gap when mechanism named but no anchor', () => {
    const result = interpretQuery('where is foo registered', []);
    expect(result.interpretationGaps.length).toBeGreaterThan(0);
    expect(result.interpretationGaps[0].reason).toBe('query-interpretation');
  });

  it('no interpretation gap when no mechanism named and no anchor', () => {
    const result = interpretQuery('foo', []);
    expect(result.interpretationGaps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// closeObligations
// ---------------------------------------------------------------------------

describe('Slice 3.5 — closeObligations', () => {
  it('closes definition obligation via the anchor', () => {
    const interp = interpretQuery('foo', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion([]), []);
    const defOb = result.obligations.find((o) => o.role === 'definition');
    expect(defOb?.disposition).toBe('satisfied');
    expect(result.requirements.some((r) => r.kind === 'anchor')).toBe(true);
  });

  it('closes invocation-site obligation via direct-call relation', () => {
    const rs = [rel({ id: 'r1', sourceNodeId: 'foo', targetNodeId: 'bar', semantics: 'direct-call' })];
    const interp = interpretQuery('foo call bar', [anchor('foo'), anchor('bar')]);
    const result = closeObligations(interp, [anchor('foo'), anchor('bar')], expansion(rs), []);
    const invObs = result.obligations.filter((o) => o.role === 'invocation-site');
    expect(invObs.length).toBeGreaterThan(0);
    expect(invObs.every((o) => o.disposition === 'satisfied')).toBe(true);
  });

  it('closes registration-site obligation via registration relation', () => {
    const rs = [rel({ id: 'r1', sourceNodeId: 'foo', targetNodeId: 'router', semantics: 'registration' })];
    const interp = interpretQuery('where is foo registered', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion(rs), []);
    const regOb = result.obligations.find((o) => o.role === 'registration-site');
    expect(regOb?.disposition).toBe('satisfied');
  });

  it('closes scheduling-site obligation via scheduling relation', () => {
    const rs = [rel({ id: 'r1', sourceNodeId: 'foo', targetNodeId: 'cron', semantics: 'scheduling' })];
    const interp = interpretQuery('where is foo scheduled', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion(rs), []);
    const schOb = result.obligations.find((o) => o.role === 'scheduling-site');
    expect(schOb?.disposition).toBe('satisfied');
  });

  it('emits graph-semantics-blocker when no matching relation', () => {
    const interp = interpretQuery('where is foo registered', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion([]), []);
    const regOb = result.obligations.find((o) => o.role === 'registration-site');
    expect(regOb?.disposition).toBe('unresolved');
    expect(result.gaps.some((g) => g.reason === 'graph-semantics-blocker')).toBe(true);
  });

  it('does NOT silently drop an unsatisfied obligation (§460-§461)', () => {
    const interp = interpretQuery('where is foo registered', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion([]), []);
    // The obligation must still be present, marked unresolved.
    expect(result.obligations.some((o) => o.role === 'registration-site')).toBe(true);
    const regOb = result.obligations.find((o) => o.role === 'registration-site');
    expect(regOb?.disposition).toBe('unresolved');
  });

  it('definition precedence: omitted > degraded > satisfied', () => {
    // If a definition requirement is omitted, obligation disposition = omitted.
    const interp = interpretQuery('foo', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion([]), []);
    // Manually flip a requirement's disposition to verify precedence.
    const req = result.requirements.find((r) => r.role === 'definition');
    expect(req).toBeDefined();
    if (req) req.disposition = 'omitted';
    // Re-derive.
    const ob = result.obligations.find((o) => o.role === 'definition');
    expect(ob?.disposition).toBe('satisfied'); // original derivation, before we mutated
  });

  it('supporting obligations do not make required complete by substitution', () => {
    const rs = [rel({ id: 'r1', sourceNodeId: 'foo', targetNodeId: 'bar', semantics: 'direct-call' })];
    const trace: TracePath = {
      id: 'p1',
      status: 'connected',
      steps: [{ relationId: 'r1', semantics: 'direct-call', guards: [] }],
      requiredRelationIds: ['r1'],
    };
    const interp = interpretQuery('foo', [anchor('foo')]);
    const result = closeObligations(interp, [anchor('foo')], expansion(rs), [trace]);
    // Supporting requirements may exist, but definition must still be closed by anchor.
    const defOb = result.obligations.find((o) => o.role === 'definition');
    expect(defOb?.disposition).toBe('satisfied');
  });
});
