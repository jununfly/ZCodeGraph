/**
 * Full-Graph Synthesizer modules — wraps the 19+ exported synthesizer
 * functions from callback-synthesizer.ts into FullGraphSynthesizer entries
 * with precision/cost/ordering metadata.
 *
 * The original functions are now `export function` in callback-synthesizer.ts;
 * this file provides the descriptor and registry wiring without duplicating
 * any implementation code.
 */

import type { Edge } from '../types';
import type { QueryBuilder } from '../db/queries';
import type { ResolutionContext } from './types';
import type { FullGraphSynthesizer, SynthesizerRegistry } from './synthesizer-types';
import {
  fieldChannelEdges,
  closureCollectionEdges,
  eventEmitterEdges,
  reactRenderEdges,
  reactJsxChildEdges,
  vueTemplateEdges,
  flutterBuildEdges,
  cppOverrideEdges,
  goImplementsEdges,
  goCrossFileMethodContainsEdges,
  kotlinExpectActualEdges,
  interfaceOverrideEdges,
  goGrpcStubImplEdges,
  rnEventEdges,
  expoCrossPlatformEdges,
  rnCrossPlatformEdges,
  fabricNativeImplEdges,
  mybatisJavaXmlEdges,
  ginMiddlewareChainEdges,
  pascalFormEdges,
  svelteKitLoadEdges,
} from './callback-synthesizer';

// ── Synthesizer module definitions (descriptors + wrappers) ────────────

/**
 * Build a FullGraphSynthesizer that delegates to a (queries, ctx) function.
 */
function wrap2(
  descriptor: FullGraphSynthesizer['descriptor'],
  fn: (queries: QueryBuilder, ctx: ResolutionContext) => Edge[],
): FullGraphSynthesizer {
  return { descriptor, synthesize: fn };
}

/**
 * Build a FullGraphSynthesizer that delegates to a (ctx)-only function.
 */
function wrapCtx(
  descriptor: FullGraphSynthesizer['descriptor'],
  fn: (ctx: ResolutionContext) => Edge[],
): FullGraphSynthesizer {
  return {
    descriptor,
    synthesize(_queries: QueryBuilder, ctx: ResolutionContext): Edge[] {
      return fn(ctx);
    },
  };
}

/**
 * Build a FullGraphSynthesizer that delegates to a (queries)-only function.
 */
function wrapQ(
  descriptor: FullGraphSynthesizer['descriptor'],
  fn: (queries: QueryBuilder) => Edge[],
): FullGraphSynthesizer {
  return {
    descriptor,
    synthesize(queries: QueryBuilder, _ctx: ResolutionContext): Edge[] {
      return fn(queries);
    },
  };
}

// Registration order mirrors the original call sequence in
// synthesizeCallbackEdges() to preserve behavioural equivalence.

export const SYNTHESIZERS: FullGraphSynthesizer[] = [
  // 1. Go cross-file method → type contains edges  (queries only)
  wrapQ(
    {
      id: 'go-cross-file-contains',
      name: 'Go cross-file method→type contains',
      strategy: 'full-graph',
      languages: ['go'],
      precision: 'high',
      cost: 'moderate',
      knownFalsePositives: [],
    },
    goCrossFileMethodContainsEdges,
  ),

  // 2. Go implicit interface implements (queries only, after go-cross-file-contains)
  wrapQ(
    {
      id: 'go-implements',
      name: 'Go implicit interface implements',
      strategy: 'full-graph',
      languages: ['go'],
      precision: 'high',
      cost: 'moderate',
      knownFalsePositives: [],
      dependsOn: ['go-cross-file-contains'],
    },
    goImplementsEdges,
  ),

  // 3. Field-backed observer channels (queries + ctx)
  wrap2(
    {
      id: 'field-channel',
      name: 'Field-backed observer channels',
      strategy: 'full-graph',
      languages: [],
      precision: 'low',
      cost: 'moderate',
      knownFalsePositives: [
        'Broad registrar names (onUpdate, subscribe) can match unrelated methods.',
        'Field name collision across unrelated classes in same file.',
      ],
    },
    fieldChannelEdges,
  ),

  // 4. Closure-collection dispatch (queries + ctx)
  wrap2(
    {
      id: 'closure-collection',
      name: 'Closure-collection dispatch',
      strategy: 'full-graph',
      languages: [],
      precision: 'low',
      cost: 'expensive',
      knownFalsePositives: [
        'Field-name matching across unrelated classes.',
        'Generic field names like `handlers` can fan out too broadly.',
      ],
    },
    closureCollectionEdges,
  ),

  // 5. EventEmitter string-keyed dispatch (ctx only)
  wrapCtx(
    {
      id: 'event-emitter',
      name: 'EventEmitter string-keyed dispatch',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'medium',
      cost: 'moderate',
      knownFalsePositives: [
        'Generic event names like "error" can match across unrelated emitters.',
        'Fan-out cap may miss legitimate dense event systems.',
      ],
    },
    eventEmitterEdges,
  ),

  // 6. React class-component setState → render (queries + ctx)
  wrap2(
    {
      id: 'react-render',
      name: 'React class-component re-render',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'medium',
      cost: 'cheap',
      knownFalsePositives: ['setState in non-React classes (unlikely in practice).'],
    },
    reactRenderEdges,
  ),

  // 7. React JSX child components (ctx only)
  wrapCtx(
    {
      id: 'react-jsx-child',
      name: 'React JSX child components',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'medium',
      cost: 'moderate',
      knownFalsePositives: [
        'JSX tags matching built-in HTML elements (filtered by uppercase check).',
        'Imported components with aliased names not in the graph.',
      ],
    },
    reactJsxChildEdges,
  ),

  // 8. Vue SFC template edges (ctx only)
  wrapCtx(
    {
      id: 'vue-template',
      name: 'Vue SFC template edges',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'medium',
      cost: 'moderate',
      knownFalsePositives: [
        'Kebab-to-Pascal conversion can match unrelated components.',
        'Event handler names without @/v-on: prefix are not captured.',
      ],
    },
    vueTemplateEdges,
  ),

  // 9. Flutter build → setState edges (queries + ctx)
  wrap2(
    {
      id: 'flutter-build',
      name: 'Flutter build→setState re-render',
      strategy: 'full-graph',
      languages: ['dart'],
      precision: 'medium',
      cost: 'cheap',
      knownFalsePositives: ['setState in non-widget classes (rare in practice).'],
    },
    flutterBuildEdges,
  ),

  // 10. C++ virtual override edges (queries only)
  wrapQ(
    {
      id: 'cpp-override',
      name: 'C++ virtual method overrides',
      strategy: 'full-graph',
      languages: ['cpp', 'c'],
      precision: 'high',
      cost: 'cheap',
      knownFalsePositives: [],
    },
    cppOverrideEdges,
  ),

  // 11. Kotlin expect/actual (queries only)
  wrapQ(
    {
      id: 'kotlin-expect-actual',
      name: 'Kotlin expect/actual edges',
      strategy: 'full-graph',
      languages: ['kotlin'],
      precision: 'high',
      cost: 'cheap',
      knownFalsePositives: [],
    },
    kotlinExpectActualEdges,
  ),

  // 12. Interface/abstract method dispatch (queries only, after go-implements)
  wrapQ(
    {
      id: 'interface-impl',
      name: 'Interface/abstract method dispatch',
      strategy: 'full-graph',
      languages: ['java', 'kotlin', 'csharp', 'javascript', 'typescript', 'swift', 'scala', 'go', 'rust'],
      precision: 'high',
      cost: 'cheap',
      knownFalsePositives: [],
      dependsOn: ['go-implements'],
    },
    interfaceOverrideEdges,
  ),

  // 13. Go gRPC stub → impl (queries only)
  wrapQ(
    {
      id: 'go-grpc-stub-impl',
      name: 'Go gRPC stub→impl edges',
      strategy: 'full-graph',
      languages: ['go'],
      precision: 'medium',
      cost: 'cheap',
      knownFalsePositives: ['Stub/impl naming convention mismatch in non-gRPC contexts.'],
    },
    goGrpcStubImplEdges,
  ),

  // 14. React Native event edges (ctx only)
  wrapCtx(
    {
      id: 'rn-event',
      name: 'React Native event edges',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'low',
      cost: 'moderate',
      knownFalsePositives: [
        'Event name matching across unrelated native modules.',
      ],
    },
    rnEventEdges,
  ),

  // 15. Expo cross-platform edges (queries only)
  wrapQ(
    {
      id: 'expo-cross-platform',
      name: 'Expo cross-platform edges',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'low',
      cost: 'cheap',
      knownFalsePositives: [
        'Platform file matching may produce false positives for similarly named non-Expo files.',
      ],
    },
    expoCrossPlatformEdges,
  ),

  // 16. React Native cross-platform edges (queries only)
  wrapQ(
    {
      id: 'rn-cross-platform',
      name: 'React Native cross-platform edges',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'low',
      cost: 'cheap',
      knownFalsePositives: [
        'Platform file matching may produce false positives for similarly named non-RN files.',
      ],
    },
    rnCrossPlatformEdges,
  ),

  // 17. Fabric native impl edges (ctx only)
  wrapCtx(
    {
      id: 'fabric-native-impl',
      name: 'Fabric native impl edges',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'low',
      cost: 'moderate',
      knownFalsePositives: [
        'Native module name collision across platforms.',
      ],
    },
    fabricNativeImplEdges,
  ),

  // 18. MyBatis Java ↔ XML edges (queries only)
  wrapQ(
    {
      id: 'mybatis-java-xml',
      name: 'MyBatis Java↔XML mapper edges',
      strategy: 'full-graph',
      languages: ['java'],
      precision: 'medium',
      cost: 'moderate',
      knownFalsePositives: [
        'Method-name matching in non-MyBatis contexts.',
      ],
    },
    mybatisJavaXmlEdges,
  ),

  // 19. Gin middleware chain edges (queries + ctx)
  wrap2(
    {
      id: 'gin-middleware-chain',
      name: 'Gin middleware chain edges',
      strategy: 'full-graph',
      languages: ['go'],
      precision: 'medium',
      cost: 'moderate',
      knownFalsePositives: [
        'Function-name matching in non-Gin contexts.',
      ],
    },
    ginMiddlewareChainEdges,
  ),

  // 20. Pascal form edges (ctx only)
  wrapCtx(
    {
      id: 'pascal-form',
      name: 'Pascal form edges',
      strategy: 'full-graph',
      languages: ['pascal'],
      precision: 'medium',
      cost: 'cheap',
      knownFalsePositives: [],
    },
    pascalFormEdges,
  ),

  // 21. SvelteKit load edges (ctx only)
  wrapCtx(
    {
      id: 'sveltekit-load',
      name: 'SvelteKit load edges',
      strategy: 'full-graph',
      languages: ['javascript', 'typescript'],
      precision: 'medium',
      cost: 'cheap',
      knownFalsePositives: [],
    },
    svelteKitLoadEdges,
  ),
];

// ── Registry population ─────────────────────────────────────────────────

/**
 * Register all full-graph synthesizers into the registry.
 * The registry handles execution ordering via dependsOn.
 */
export function registerFullGraphSynthesizers(registry: SynthesizerRegistry): void {
  for (const s of SYNTHESIZERS) {
    registry.register(s);
  }
}

/**
 * Execute all registered full-graph synthesizers in dependency order.
 * Replaces the hardcoded call sequence in synthesizeCallbackEdges().
 *
 * @returns total number of edges synthesized.
 */
export function executeFullGraphSynthesizers(
  registry: SynthesizerRegistry,
  queries: QueryBuilder,
  ctx: ResolutionContext,
): number {
  const ordered = registry.fullGraphOrder();
  let total = 0;
  for (const synth of ordered) {
    try {
      const edges = synth.synthesize(queries, ctx);
      if (edges.length > 0) {
        // Dedup before insert
        const seen = new Set<string>();
        const deduped: Edge[] = [];
        for (const e of edges) {
          const key = `${e.source}>${e.target}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(e);
        }
        if (deduped.length > 0) queries.insertEdges(deduped);
        total += deduped.length;
      }
    } catch {
      // synthesis is additive and optional; ignore failures
    }
  }
  return total;
}
