/**
 * Synthesizer Registry — implementation.
 *
 * Thread-safe, no mutable shared state beyond the registration list.
 * Designed to replace both:
 *  - callback-synthesizer.ts's hardcoded call sequence
 *  - frameworks/index.ts's FRAMEWORK_RESOLVERS array
 */

import type {
  Synthesizer,
  SynthesizerRegistry,
  FullGraphSynthesizer,
  PerReferenceSynthesizer,
  SynthesizerStrategy,
} from './synthesizer-types';
import type { Language } from '../types';
import type { ResolutionContext } from './types';

export function createSynthesizerRegistry(): SynthesizerRegistry {
  const _entries: Synthesizer[] = [];
  const _byId = new Map<string, Synthesizer>();

  return {
    register(synth: Synthesizer): void {
      const existing = _byId.get(synth.descriptor.id);
      if (existing) {
        const idx = _entries.indexOf(existing);
        if (idx !== -1) _entries.splice(idx, 1);
      }
      _entries.push(synth);
      _byId.set(synth.descriptor.id, synth);
    },

    get(id: string): Synthesizer | undefined {
      return _byId.get(id);
    },

    list(): Synthesizer[] {
      return [..._entries];
    },

    listFiltered(opts?: {
      strategy?: SynthesizerStrategy;
      languages?: Language[];
    }): Synthesizer[] {
      let result = [..._entries];
      if (opts?.strategy) {
        result = result.filter((s) => s.descriptor.strategy === opts.strategy);
      }
      if (opts?.languages && opts.languages.length > 0) {
        result = result.filter((s) => {
          if (s.descriptor.languages.length === 0) return true; // language-agnostic
          return s.descriptor.languages.some((l) => opts.languages!.includes(l));
        });
      }
      return result;
    },

    fullGraphOrder(): FullGraphSynthesizer[] {
      const fg = _entries.filter(
        (s): s is FullGraphSynthesizer => s.descriptor.strategy === 'full-graph',
      );
      // Topological sort by dependsOn
      const idSet = new Set(fg.map((s) => s.descriptor.id));
      const inDegree = new Map<string, number>();
      const adj = new Map<string, string[]>();

      for (const s of fg) {
        inDegree.set(s.descriptor.id, 0);
        adj.set(s.descriptor.id, []);
      }
      for (const s of fg) {
        for (const dep of s.descriptor.dependsOn ?? []) {
          if (!idSet.has(dep)) continue;
          adj.get(dep)!.push(s.descriptor.id);
          inDegree.set(s.descriptor.id, (inDegree.get(s.descriptor.id) ?? 0) + 1);
        }
      }

      const queue: string[] = [];
      for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
      }

      const ordered: FullGraphSynthesizer[] = [];
      const idToSynth = new Map(fg.map((s) => [s.descriptor.id, s]));
      while (queue.length > 0) {
        const id = queue.shift()!;
        ordered.push(idToSynth.get(id)!);
        for (const next of adj.get(id) ?? []) {
          const newDeg = (inDegree.get(next) ?? 1) - 1;
          inDegree.set(next, newDeg);
          if (newDeg === 0) queue.push(next);
        }
      }

      // If topological sort didn't cover all (cycle), append remaining in
      // registration order — cycle is a config error, not a runtime error.
      const covered = new Set(ordered.map((s) => s.descriptor.id));
      for (const s of fg) {
        if (!covered.has(s.descriptor.id)) ordered.push(s);
      }

      return ordered;
    },

    detectApplicable(
      context: ResolutionContext,
      languages: Language[],
    ): PerReferenceSynthesizer[] {
      const prs = _entries.filter(
        (s): s is PerReferenceSynthesizer => s.descriptor.strategy === 'per-reference',
      );
      return prs.filter((s) => {
        // Language filter
        if (s.descriptor.languages.length > 0) {
          if (!s.descriptor.languages.some((l) => languages.includes(l))) return false;
        }
        // detect() filter
        try {
          return s.detect(context);
        } catch {
          return false;
        }
      });
    },

    remove(id: string): void {
      const synth = _byId.get(id);
      if (!synth) return;
      const idx = _entries.indexOf(synth);
      if (idx !== -1) _entries.splice(idx, 1);
      _byId.delete(id);
    },

    clear(): void {
      _entries.length = 0;
      _byId.clear();
    },
  };
}
