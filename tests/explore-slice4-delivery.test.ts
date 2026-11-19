import { describe, expect, it } from 'vitest';
import { globalAllocateAtoms, type SourceAtom } from '../src/explore/allocator';
import {
  deliverExploreAnswer,
  prepareExploreDelivery,
  verifyExploreTransport,
  type ExploreDeliveryInput,
} from '../src/explore/delivery';
import { utf8ByteLength } from '../src/explore/budget-utf8';
import {
  buildBudgetExhaustedEnvelope,
  CapBelowProtocolMinimumError,
  measureEnvelopeBytes,
} from '../src/explore/exhausted';
import type { EvidenceRequirement, QueryObligation } from '../src/explore/obligations';
import { makeSnapshotIdentity } from '../src/explore/snapshot';
import {
  cliExploreOutput,
  composeExploreTransport,
  mcpExploreContent,
} from '../src/explore/transport';

function atom(id: string, filePath: string, text: string, line: number): SourceAtom {
  return {
    id,
    requirementIds: [`req-${id}`],
    filePath,
    range: { filePath, startLine: line, endLine: line },
    text,
    signature: `signature ${id}`,
    role: 'definition',
    required: true,
    overhead: `#### ${filePath}:${line}-${line}\n`,
  };
}

function requirement(id: string): EvidenceRequirement {
  return {
    id,
    atomId: id.replace('req-', ''),
    obligationIds: [`ob-${id}`],
    kind: 'anchor',
    role: 'definition',
    requirement: 'required',
    provenance: {},
    disposition: 'returned',
  };
}

function obligation(id: string): QueryObligation {
  return {
    id: `ob-${id}`,
    role: 'definition',
    required: true,
    requirementIds: [id],
    disposition: 'unresolved',
  };
}

function deliveryInput(atoms: readonly SourceAtom[], maxFiles: number): ExploreDeliveryInput {
  return {
    atoms,
    requirements: atoms.map((a) => requirement(a.requirementIds[0]!)),
    obligations: atoms.map((a) => obligation(a.requirementIds[0]!)),
    gaps: [],
    snapshot: makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
    workBudget: {
      maxSeeds: 32, maxUniqueVisitedNodes: 4096, maxAdjacencyRows: 8192,
      maxRounds: 8, maxCanonicalSourceReads: 64,
    },
    searchExhausted: false,
    anchorCount: atoms.length,
    maxFiles,
  };
}

function delivery(atoms: readonly SourceAtom[], maxFiles: number, cap = 4096) {
  return deliverExploreAnswer(deliveryInput(atoms, maxFiles), prepareExploreDelivery(cap, [], 0));
}

describe('Slice 4 delivered-file maxFiles and ledger', () => {
  it('counts a canonical file once and retains other files as complete location/gaps', () => {
    const result = delivery([
      atom('a', 'a.ts', 'first atom', 1),
      atom('a2', 'a.ts', 'second atom', 3),
      atom('b', 'b.ts', 'other file', 1),
    ], 1);
    expect('detailedFileCount' in result && result.detailedFileCount).toBe(1);
    expect('markdown' in result && result.markdown).toContain('first atom\n#### a.ts:3-3\nsecond atom\n');
    expect('markdown' in result && result.markdown).toContain('b.ts:1-1\n[gap:b:budget-exhausted]');
    expect('markdown' in result && result.markdown).not.toContain('other file');
    expect('dispositions' in result && result.dispositions).toHaveLength(3);
  });

  it('does not report a maxFiles location-only atom as a satisfied obligation', () => {
    const result = delivery([atom('a', 'a.ts', 'a', 1), atom('b', 'b.ts', 'b', 1)], 1);
    expect('report' in result && result.report.status).toBe('partial');
    expect('report' in result && result.report.coverage.dispositions['req-b']).toBe('degraded');
    expect('report' in result && result.report.coverage.obligations[1]?.disposition).toBe('degraded');
  });

  it('keeps every unmaterialized requirement omitted with its source failure', () => {
    const req = { ...requirement('req-missing'), disposition: 'omitted' as const, reasonCode: 'source-changed' };
    const result = deliverExploreAnswer({
      atoms: [], requirements: [req], obligations: [obligation('req-missing')],
      gaps: [{ id: req.id, reason: 'source-changed', detail: 'changed' }],
      snapshot: makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
      workBudget: {
        maxSeeds: 32, maxUniqueVisitedNodes: 4096, maxAdjacencyRows: 8192,
        maxRounds: 8, maxCanonicalSourceReads: 64,
      },
      searchExhausted: false, anchorCount: 1, maxFiles: 2,
    }, prepareExploreDelivery(512, [], 0));
    expect('markdown' in result).toBe(true);
    expect('report' in result && result.report.coverage.dispositions[req.id]).toBe('omitted');
    expect('report' in result && result.report.coverage.obligations[0]?.disposition).toBe('omitted');
  });
});

describe('Slice 4 final ledger, shared atoms and residual reasons', () => {
  it('accounts for two requirements sharing one atom without repeating source', () => {
    const shared = { ...atom('shared', 'shared.ts', 'const shared = true;', 1), requirementIds: ['req-a', 'req-b'] };
    const reqA = { ...requirement('req-a'), atomId: 'shared', obligationIds: ['ob-a'] };
    const reqB = { ...requirement('req-b'), atomId: 'shared', obligationIds: ['ob-b'], role: 'invocation-site' as const };
    const input = {
      ...deliveryInput([shared], 2),
      requirements: [reqB, reqA],
      obligations: [
        { ...obligation('req-b'), id: 'ob-b', requirementIds: ['req-b'] },
        { ...obligation('req-a'), id: 'ob-a', requirementIds: ['req-a'] },
      ],
    };
    const forward = deliverExploreAnswer(input, prepareExploreDelivery(4096, [], 0));
    const reversed = deliverExploreAnswer({
      ...input,
      requirements: [...input.requirements].reverse(),
      obligations: [...input.obligations].reverse(),
    }, prepareExploreDelivery(4096, [], 0));
    expect('report' in forward && forward.report.coverage.selectedRequirements).toBe(2);
    expect('report' in forward && forward.report.status).toBe('complete');
    expect('markdown' in forward && forward.markdown?.split('const shared = true;')).toHaveLength(2);
    expect('markdown' in reversed && reversed.markdown).toBe('markdown' in forward ? forward.markdown : undefined);
    expect('report' in reversed && reversed.report).toEqual('report' in forward ? forward.report : undefined);
    expect('dispositions' in forward && forward.dispositions).toHaveLength(1);
  });

  it('rejects conflicting duplicate requirement identities instead of last-write-wins', () => {
    const req = requirement('req-a');
    expect(() => deliverExploreAnswer({
      ...deliveryInput([atom('a', 'a.ts', 'a', 1)], 1),
      requirements: [req, { ...req, role: 'supporting' }],
    }, prepareExploreDelivery(512, [], 0))).toThrow('invalid-input: conflicting evidence requirement identity');
  });

  it('preserves returned, signature, location and omitted dispositions in one ledger', () => {
    const returned = atom('full', 'a.ts', 'full', 1);
    const signature = {
      ...atom('signature', 'b.ts', 'full source that is deliberately much longer than its signature', 1),
      signature: 'fn b()', maximumTier: 'signature' as const,
    };
    const location = { ...atom('location', 'c.ts', 'full source', 1), maximumTier: 'location' as const };
    const omitted = { ...requirement('req-missing'), disposition: 'omitted' as const, reasonCode: 'source-unavailable' };
    const result = deliverExploreAnswer({
      ...deliveryInput([returned, signature, location], 3),
      requirements: [...deliveryInput([returned, signature, location], 3).requirements, omitted],
      obligations: [...deliveryInput([returned, signature, location], 3).obligations, obligation('req-missing')],
    }, prepareExploreDelivery(4096, [], 0));
    expect('report' in result && result.report.coverage.dispositions).toMatchObject({
      'req-full': 'returned', 'req-signature': 'degraded', 'req-location': 'degraded', 'req-missing': 'omitted',
    });
    expect('report' in result && result.report.omissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'req-signature', reason: 'budget-exhausted' }),
      expect.objectContaining({ id: 'req-location', reason: 'budget-exhausted' }),
      expect.objectContaining({ id: 'req-missing', reason: 'source-unavailable' }),
    ]));
    expect('report' in result && result.report.coverage.selectedRequirements).toBe(4);
  });

  it('keeps graph and independent search-limit gaps for the same unclosed obligation', () => {
    const ob = { ...obligation('missing'), requirementIds: [] };
    const result = deliverExploreAnswer({
      ...deliveryInput([], 1),
      obligations: [ob],
      gaps: [{ id: 'gap-ob-missing', reason: 'graph-semantics-blocker', detail: 'missing relation' }],
      searchExhausted: true,
    }, prepareExploreDelivery(1024, [], 0));
    expect('report' in result && result.report.omissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'gap-ob-missing', reason: 'graph-semantics-blocker' }),
      expect.objectContaining({ id: 'gap-ob-missing:search-limit', reason: 'search-limit' }),
    ]));
    expect('markdown' in result && result.markdown).toContain('gap-ob-missing:search-limit reason=search-limit');
    expect('report' in result && result.report.status).toBe('partial');
  });

  it('renders and charges the final budget gaps used by the allocation', () => {
    const result = delivery([atom('a', 'a.ts', 'a', 1), atom('b', 'b.ts', 'b', 1)], 1);
    expect('markdown' in result && result.markdown).toContain(
      'gap=req-b reason=budget-exhausted detail=complete source unavailable; signature or exact location delivered',
    );
    expect('markdown' in result && result.markdown).toContain('gap=gap-ob-req-b reason=budget-exhausted');
    if ('markdown' in result) {
      for (const gap of result.report.omissions) {
        expect(result.markdown.match(new RegExp(`gap=${gap.id} `, 'g'))).toHaveLength(1);
      }
    }
  });

  it('replaces a stale residual line with its final disposition', () => {
    const result = deliverExploreAnswer({
      ...deliveryInput([atom('a', 'a.ts', 'a', 1), atom('b', 'b.ts', 'b', 1)], 1),
      skeleton: '### Trace and residuals\ntrace=kept gap=req-b status=connected\n',
    }, prepareExploreDelivery(4096, [], 0));
    expect('markdown' in result && result.markdown).toContain('trace=kept status=connected');
    expect('markdown' in result && result.markdown).not.toContain('gap=req-b status');
    expect('markdown' in result && result.markdown).not.toContain('detail=stale');
    expect('markdown' in result && result.markdown).toContain('gap=req-b reason=budget-exhausted');
  });

  it('preserves distinct source and search reasons without contradictory details', () => {
    const result = deliverExploreAnswer({
      ...deliveryInput([], 1),
      obligations: [{ ...obligation('missing'), requirementIds: [] }],
      gaps: [{ id: 'gap-ob-missing', reason: 'source-changed', detail: 'source hash mismatch' }],
      searchExhausted: true,
    }, prepareExploreDelivery(4096, [], 0));
    expect('report' in result && result.report.omissions).toEqual(expect.arrayContaining([
      { id: 'gap-ob-missing', reason: 'source-changed', detail: 'source hash mismatch' },
      expect.objectContaining({ id: 'gap-ob-missing:search-limit', reason: 'search-limit' }),
    ]));
  });

  it('retains full source and both original atom identities after two merge passes', () => {
    const sharedA = {
      ...atom('a-target', 'shared.ts', 'const shared = true;', 1),
      requirementIds: ['req-a'],
    };
    const sharedB = {
      ...atom('b-target', 'shared.ts', 'const shared = true;', 1),
      requirementIds: ['req-b'],
    };
    const input = {
      ...deliveryInput([sharedA, sharedB], 1),
      requirements: [
        { ...requirement('req-a'), atomId: 'a-target' },
        { ...requirement('req-b'), atomId: 'b-target' },
      ],
    };
    const result = deliverExploreAnswer(input, prepareExploreDelivery(4096, [], 0));
    expect('markdown' in result && result.markdown).toContain('const shared = true;');
    expect('report' in result && result.report.status).toBe('complete');
    expect('dispositions' in result && result.dispositions.map((d) => d.atomId)).toEqual(['a-target']);
    expect('markdown' in result && result.markdown?.split('const shared = true;')).toHaveLength(2);
  });

  it('keeps an input residual distinct from a derived budget gap with the same base ID', () => {
    const result = deliverExploreAnswer({
      ...deliveryInput([atom('a', 'a.ts', 'a', 1), atom('b', 'b.ts', 'b', 1)], 1),
      gaps: [{ id: 'req-b', reason: 'source-changed', detail: 'source hash mismatch' }],
    }, prepareExploreDelivery(4096, [], 0));
    expect('markdown' in result && result.markdown).toContain('gap=req-b reason=source-changed');
    expect('markdown' in result && result.markdown).toContain('gap=req-b:budget-exhausted reason=budget-exhausted');
  });

  it('preserves source reason and detail in an exhausted obligation', () => {
    const input = {
      ...deliveryInput([], 1),
      requirements: [{ ...requirement('req-missing'), disposition: 'omitted' as const, reasonCode: 'source-changed' }],
      obligations: [obligation('req-missing')],
      gaps: [{ id: 'req-missing', reason: 'source-changed' as const, detail: 'source hash mismatch' }],
      skeleton: 'x'.repeat(1024),
    };
    const result = deliverExploreAnswer(input, prepareExploreDelivery(256, [], 0));
    expect(result.kind).toBe('failed');
    expect('stableIds' in result && result.stableIds).toContain('gap-ob-req-missing');
  });

  it('retains a global search gap in an exhausted zero-requirement result', () => {
    const result = deliverExploreAnswer({
      ...deliveryInput([], 1), searchExhausted: true, skeleton: 'x'.repeat(1024),
    }, prepareExploreDelivery(256, [], 0));
    expect(result.kind).toBe('failed');
    expect('stableIds' in result && result.stableIds).toEqual(['gap-search-work-ceiling']);
    expect('counts' in result && result.counts.gapCount).toBe(1);
  });

  it('keeps complete exhausted counts when the final gap set includes obligations', () => {
    const input = {
      ...deliveryInput([], 1),
      requirements: [{ ...requirement('req-missing'), disposition: 'omitted' as const, reasonCode: 'source-changed' }],
      obligations: [obligation('req-missing')],
      gaps: [{ id: 'req-missing', reason: 'source-changed' as const, detail: 'changed' }],
      skeleton: `### Trace and residuals\n${'trace=long\n'.repeat(100)}`,
    };
    const result = deliverExploreAnswer(input, prepareExploreDelivery(256, [], 0));
    expect(result.kind).toBe('failed');
    expect(result.kind === 'failed' && 'counts' in result && result.counts).toEqual({
      selectedRequirements: 1, returnedRequirements: 0, omittedRequirements: 1, gapCount: 2,
    });
    expect(result.kind === 'failed' && 'stableIds' in result && result.stableIds).toContain('gap-ob-req-missing');
  });

  it('falls back to budget-exhausted when a source gap exceeds the body allowance', () => {
    const req = {
      ...requirement('req-missing'), disposition: 'omitted' as const,
      reasonCode: 'source-changed',
    };
    const input = {
      ...deliveryInput([], 1), anchorCount: 1,
      requirements: [req], obligations: [obligation('req-missing')],
      gaps: [{ id: req.id, reason: 'source-changed' as const, detail: 'source hash mismatch' }],
      skeleton: 'trace=kept\n',
    };
    const finalSkeleton = `trace=kept\ngap=gap-ob-req-missing reason=source-changed detail=Obligation ob-req-missing is omitted; its evidence links were not fully returned\ngap=req-missing reason=source-changed detail=source hash mismatch\n`;
    expect(utf8ByteLength(finalSkeleton)).toBe(210);
    const complete = deliverExploreAnswer(input, prepareExploreDelivery(210, [], 0));
    expect('markdown' in complete && complete.markdown).toBe(finalSkeleton);
    const result = deliverExploreAnswer(input, prepareExploreDelivery(170, [], 0));
    expect(result).toMatchObject({ kind: 'failed', code: 'budget-exhausted' });
    expect('stableIds' in result && result.stableIds).toContain('req-missing');
  });

  it('does not turn an anchored all-source-failure result into no-evidence', () => {
    const req = { ...requirement('req-missing'), disposition: 'omitted' as const, reasonCode: 'source-unavailable' };
    const result = deliverExploreAnswer({
      ...deliveryInput([], 1), anchorCount: 1,
      requirements: [req], obligations: [obligation('req-missing')],
      gaps: [{ id: 'req-missing', reason: 'source-unavailable', detail: 'missing' }],
    }, prepareExploreDelivery(1024, [], 0));
    expect('markdown' in result).toBe(true);
    expect('report' in result && result.report.status).toBe('partial');
  });
});

describe('Slice 4 transport and minimum envelope', () => {
  const minimum = buildBudgetExhaustedEnvelope({
    selectedRequirements: 0, returnedRequirements: 0, omittedRequirements: 0, gapIds: [],
  });

  it('projects failed and empty results identically for MCP without exposing reports', () => {
    const empty = delivery([], 1);
    expect('text' in empty && empty.kind).toBe('empty');
    expect(mcpExploreContent(empty)).toEqual([{ type: 'text', text: 'text' in empty ? empty.text : '' }]);
    expect(JSON.stringify(mcpExploreContent(empty))).not.toContain('report');
    expect(cliExploreOutput(minimum)).toBe(`${minimum.text}\n`);
  });

  it('rejects a cap below the complete minimum before delivery', () => {
    const required = measureEnvelopeBytes(minimum);
    expect(() => prepareExploreDelivery(required - 1, [], 0)).toThrow(CapBelowProtocolMinimumError);
    expect(() => prepareExploreDelivery(required, [], 0)).not.toThrow();
  });

  it('includes notices, separators and exactly one CLI newline in its own size check', () => {
    const notices = ['pending: 中', 'worktree: dirty'];
    const budget = prepareExploreDelivery(512, notices, 1);
    const result = { kind: 'failed' as const, code: 'budget-exhausted' as const, text: minimum.text };
    expect(verifyExploreTransport(budget, notices, result)).toBe(true);
    const body = composeExploreTransport(result, notices, budget);
    expect(cliExploreOutput(result)).toBe(`${minimum.text}\n`);
    expect(utf8ByteLength(body + '\n')).toBeLessThanOrEqual(512);
    expect(mcpExploreContent(result)).toEqual([{ type: 'text', text: minimum.text }]);
    expect(mcpExploreContent(result)).not.toHaveProperty('report');
  });

  it('reduces only optional stable IDs when an exhausted envelope must fit', () => {
    const source = {
      ...atom(`a-very-long-stable-id-${'x'.repeat(100)}`, 'a.ts', 'x'.repeat(1024), 1),
      signature: undefined,
    };
    const actualMinimum = buildBudgetExhaustedEnvelope({
      selectedRequirements: 1, returnedRequirements: 0, omittedRequirements: 1,
      gapIds: [],
    });
    const minimumGapBytes = utf8ByteLength(`${source.overhead}[gap:${source.id}:budget-exhausted]\n`);
    const cap = Math.max(measureEnvelopeBytes(actualMinimum), minimumGapBytes - 1);
    expect(cap).toBeLessThan(minimumGapBytes);
    const result = delivery([source], 1, cap);
    expect(result.kind).toBe('failed');
    expect(result.kind === 'failed' && 'counts' in result && result.counts).toEqual({
      selectedRequirements: 1, returnedRequirements: 0, omittedRequirements: 1, gapCount: 2,
    });
    expect(result.kind === 'failed' && 'stableIds' in result && result.stableIds).toEqual([]);
    expect(utf8ByteLength(result.kind === 'failed' ? result.text : '')).toBeLessThanOrEqual(cap);
  });

  it('keeps a zero-requirement exhausted result within the exact protocol minimum', () => {
    const input = deliveryInput([], 1);
    const cap = measureEnvelopeBytes(minimum);
    const result = deliverExploreAnswer({
      ...input,
      obligations: [{ ...obligation('missing'), requirementIds: [] }],
      skeleton: 'x'.repeat(cap),
    }, prepareExploreDelivery(cap, [], 0));
    expect(result.kind).toBe('failed');
    expect(utf8ByteLength(result.kind === 'failed' ? result.text : '')).toBeLessThanOrEqual(cap);
  });

  it('does not disguise a count-bearing minimum envelope failure as a graph failure', () => {
    const input = deliveryInput([], 1);
    const cap = measureEnvelopeBytes(minimum);
    const result = deliverExploreAnswer({
      ...input,
      requirements: [requirement('req-a')],
      skeleton: `### Trace and residuals\n${'x'.repeat(cap)}`,
    }, prepareExploreDelivery(cap, [], 0));
    expect('kind' in result && result.kind).toBe('failed');
    expect('kind' in result && result.kind === 'failed' && result.code).toBe('budget-exhausted');
    expect(result.kind === 'failed' && 'counts' in result && result.counts.selectedRequirements).toBe(1);
    expect(utf8ByteLength(result.kind === 'failed' ? result.text : '')).toBeLessThanOrEqual(cap);
  });

  it('rejects inconsistent minimum and final transport caps without truncating', () => {
    const budget = prepareExploreDelivery(512, [], 0);
    expect(() => deliverExploreAnswer({
      atoms: [], requirements: [], obligations: [], gaps: [],
      snapshot: makeSnapshotIdentity({ projectId: 'p', databaseGeneration: 'g', readViewId: 'v' }),
      workBudget: {
        maxSeeds: 32, maxUniqueVisitedNodes: 4096, maxAdjacencyRows: 8192,
        maxRounds: 8, maxCanonicalSourceReads: 64,
      },
      searchExhausted: false, anchorCount: 0, maxFiles: 1,
    }, { ...budget, minimumErrorUtf8Bytes: 1 })).toThrow('invalid-input');
    expect(() => composeExploreTransport(
      { kind: 'failed', code: 'budget-exhausted', text: 'x'.repeat(513) }, [], budget,
    )).toThrow('budget-exhausted');
  });
});
