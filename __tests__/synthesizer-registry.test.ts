/**
 * Synthesizer Registry tests — Candidate 2 Phase 2.
 *
 * Tests the registry's topological sort, language filtering, strategy
 * filtering, and FrameworkResolver wrapping.
 */

import { describe, it, expect } from 'vitest';
import { createSynthesizerRegistry } from '../src/resolution/synthesizer-registry';
import type {
  SynthesizerRegistry,
  FullGraphSynthesizer,
  PerReferenceSynthesizer,
} from '../src/resolution/synthesizer-types';
import type { ResolutionContext } from '../src/resolution/types';

// ── Helpers ─────────────────────────────────────────────────────────────

function makeFgSynth(
  id: string,
  opts?: {
    languages?: string[];
    dependsOn?: string[];
    precision?: 'high' | 'medium' | 'low';
  },
): FullGraphSynthesizer {
  return {
    descriptor: {
      id,
      name: id,
      strategy: 'full-graph',
      languages: opts?.languages ?? [],
      precision: opts?.precision ?? 'medium',
      cost: 'cheap',
      knownFalsePositives: [],
      dependsOn: opts?.dependsOn,
    },
    synthesize: () => [],
  };
}

function makePrSynth(id: string, detectResult = true): PerReferenceSynthesizer {
  return {
    descriptor: {
      id,
      name: id,
      strategy: 'per-reference',
      languages: [],
      precision: 'medium',
      cost: 'cheap',
      knownFalsePositives: [],
    },
    detect: () => detectResult,
    resolve: () => null,
  };
}

function mockCtx(languages: string[] = []): ResolutionContext {
  return {
    readFile: () => '',
    getNodesInFile: () => [],
    getNodesByName: () => [],
    getNodesByKind: () => [],
    getNodesByQualifiedName: () => [],
    getNodesByLowerName: () => [],
    fileExists: () => true,
    getProjectRoot: () => '/',
    getAllFiles: () => [],
    getImportMappings: () => [],
  } as unknown as ResolutionContext;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('SynthesizerRegistry', () => {
  let reg: SynthesizerRegistry;

  beforeEach(() => {
    reg = createSynthesizerRegistry();
  });

  describe('register and list', () => {
    it('registers a synthesizer and lists it', () => {
      const synth = makeFgSynth('test-synth');
      reg.register(synth);
      expect(reg.list()).toHaveLength(1);
      expect(reg.get('test-synth')).toBe(synth);
    });

    it('replaces existing synthesizer with same id', () => {
      const a = makeFgSynth('dup', { precision: 'low' });
      const b = makeFgSynth('dup', { precision: 'high' });
      reg.register(a);
      reg.register(b);
      expect(reg.list()).toHaveLength(1);
      expect(reg.get('dup')!.descriptor.precision).toBe('high');
    });

    it('removes a synthesizer', () => {
      reg.register(makeFgSynth('a'));
      reg.register(makeFgSynth('b'));
      reg.remove('a');
      expect(reg.list()).toHaveLength(1);
      expect(reg.get('a')).toBeUndefined();
    });

    it('clears all synthesizers', () => {
      reg.register(makeFgSynth('a'));
      reg.register(makeFgSynth('b'));
      reg.clear();
      expect(reg.list()).toHaveLength(0);
    });
  });

  describe('listFiltered', () => {
    it('filters by strategy', () => {
      reg.register(makeFgSynth('fg'));
      reg.register(makePrSynth('pr'));
      const fg = reg.listFiltered({ strategy: 'full-graph' });
      expect(fg).toHaveLength(1);
      expect(fg[0]!.descriptor.id).toBe('fg');
    });

    it('filters by languages — includes language-agnostic', () => {
      reg.register(makeFgSynth('agnostic', { languages: [] }));
      reg.register(makeFgSynth('go-only', { languages: ['go'] }));
      reg.register(makeFgSynth('js-only', { languages: ['javascript'] }));
      const go = reg.listFiltered({ languages: ['go'] });
      // agnostic + go-only
      expect(go).toHaveLength(2);
      const ids = go.map((s) => s.descriptor.id);
      expect(ids).toContain('agnostic');
      expect(ids).toContain('go-only');
    });

    it('filters by both strategy and languages', () => {
      reg.register(makeFgSynth('fg-go', { languages: ['go'] }));
      reg.register(makePrSynth('pr-go'));
      const result = reg.listFiltered({ strategy: 'full-graph', languages: ['go'] });
      expect(result).toHaveLength(1);
      expect(result[0]!.descriptor.id).toBe('fg-go');
    });
  });

  describe('fullGraphOrder — topological sort', () => {
    it('returns empty for no full-graph synthesizers', () => {
      reg.register(makePrSynth('pr'));
      expect(reg.fullGraphOrder()).toHaveLength(0);
    });

    it('orders by dependsOn', () => {
      // go-impl depends on go-contains
      reg.register(makeFgSynth('go-impl', { dependsOn: ['go-contains'] }));
      reg.register(makeFgSynth('go-contains'));
      reg.register(makeFgSynth('iface', { dependsOn: ['go-impl'] }));

      const order = reg.fullGraphOrder();
      const ids = order.map((s) => s.descriptor.id);
      expect(ids.indexOf('go-contains')).toBeLessThan(ids.indexOf('go-impl'));
      expect(ids.indexOf('go-impl')).toBeLessThan(ids.indexOf('iface'));
    });

    it('handles no dependencies', () => {
      reg.register(makeFgSynth('a'));
      reg.register(makeFgSynth('b'));
      reg.register(makeFgSynth('c'));
      const order = reg.fullGraphOrder();
      expect(order).toHaveLength(3);
    });

    it('handles cycle gracefully (falls back to registration order)', () => {
      reg.register(makeFgSynth('a', { dependsOn: ['b'] }));
      reg.register(makeFgSynth('b', { dependsOn: ['a'] }));
      const order = reg.fullGraphOrder();
      expect(order).toHaveLength(2);
    });

    it('handles diamond dependency', () => {
      // d depends on b and c; b and c depend on a
      reg.register(makeFgSynth('d', { dependsOn: ['b', 'c'] }));
      reg.register(makeFgSynth('c', { dependsOn: ['a'] }));
      reg.register(makeFgSynth('b', { dependsOn: ['a'] }));
      reg.register(makeFgSynth('a'));
      const order = reg.fullGraphOrder();
      const ids = order.map((s) => s.descriptor.id);
      expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
      expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'));
      expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'));
      expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'));
    });

    it('handles dependency on non-existent synthesizer gracefully', () => {
      reg.register(makeFgSynth('a', { dependsOn: ['non-existent'] }));
      reg.register(makeFgSynth('b'));
      const order = reg.fullGraphOrder();
      expect(order).toHaveLength(2);
    });
  });

  describe('detectApplicable', () => {
    it('returns only per-reference synthesizers that detect() true', () => {
      reg.register(makePrSynth('yes', true));
      reg.register(makePrSynth('no', false));
      reg.register(makeFgSynth('fg'));
      const applicable = reg.detectApplicable(mockCtx(), []);
      expect(applicable).toHaveLength(1);
      expect(applicable[0]!.descriptor.id).toBe('yes');
    });

    it('filters by language', () => {
      const goSynth: PerReferenceSynthesizer = {
        descriptor: {
          id: 'spring',
          name: 'spring',
          strategy: 'per-reference',
          languages: ['java'],
          precision: 'medium',
          cost: 'cheap',
          knownFalsePositives: [],
        },
        detect: () => true,
        resolve: () => null,
      };
      reg.register(goSynth);
      reg.register(makePrSynth('generic', true));

      const java = reg.detectApplicable(mockCtx(), ['java']);
      expect(java).toHaveLength(2); // spring + generic

      const go = reg.detectApplicable(mockCtx(), ['go']);
      expect(go).toHaveLength(1); // only generic
      expect(go[0]!.descriptor.id).toBe('generic');
    });

    it('handles detect() throwing', () => {
      const throwing: PerReferenceSynthesizer = {
        descriptor: {
          id: 'throws',
          name: 'throws',
          strategy: 'per-reference',
          languages: [],
          precision: 'medium',
          cost: 'cheap',
          knownFalsePositives: [],
        },
        detect: () => { throw new Error('boom'); },
        resolve: () => null,
      };
      reg.register(throwing);
      reg.register(makePrSynth('ok', true));
      const applicable = reg.detectApplicable(mockCtx(), []);
      expect(applicable).toHaveLength(1);
      expect(applicable[0]!.descriptor.id).toBe('ok');
    });
  });
});
