/**
 * Synthesizer Registry Types
 *
 * Candidate 2: Dynamic Dispatch Synthesizer Registry / Seam.
 *
 * Unifies two existing mechanisms under one registry:
 *  - Full-graph synthesizers (callback-synthesizer.ts — 19 private functions)
 *  - Per-reference framework resolvers (frameworks/*.ts — 21 resolvers)
 *
 * Each entry declares its precision, performance profile, and known
 * false-positive scenarios so callers can make informed enable/disable
 * decisions.
 */

import type { Edge, Language } from '../types';
import type { QueryBuilder } from '../db/queries';
import type { ResolutionContext, FrameworkResolver } from './types';

// ── Precision ──────────────────────────────────────────────────────────

/**
 * How confident we are that a synthesized edge represents a real
 * code relationship (not noise).
 *
 * - `high`: nearly always correct (e.g. Go implicit implements, C++ vtable
 *   overrides — structurally verifiable).
 * - `medium`: correct in most cases but has known edge-case misclassifications
 *   (e.g. interface-impl by name convention, EventEmitter with narrow fan-out).
 * - `low`: useful signal but expect some noise; edges should be weighted
 *   lower in scoring (e.g. closure-collection by field-name match, field-channel
 *   observer with broad registrar name).
 */
export type Precision = 'high' | 'medium' | 'low';

// ── Strategy ────────────────────────────────────────────────────────────

/**
 * How the synthesizer operates.
 *
 * - `per-reference`: called once per unresolved reference during the batch
 *   resolution loop. Matches FrameworkResolver's resolve() pattern.
 * - `full-graph`: called once after all baseline edges are persisted. Scans
 *   the entire graph for patterns. Matches callback-synthesizer's
 *   synthesizeCallbackEdges() pattern.
 */
export type SynthesizerStrategy = 'per-reference' | 'full-graph';

// ── Synthesizer descriptor ──────────────────────────────────────────────

/**
 * Static metadata for a synthesizer. Used for registry listing, filtering,
 * and enable/disable decisions.
 */
export interface SynthesizerDescriptor {
  /** Unique identifier (e.g. "go-implements", "spring-di", "field-channel"). */
  readonly id: string;

  /** Human-readable name for logs and progress UI. */
  readonly name: string;

  /** How this synthesizer operates. */
  readonly strategy: SynthesizerStrategy;

  /**
   * Languages this synthesizer applies to. An empty array means
   * language-agnostic (run on every project).
   */
  readonly languages: Language[];

  /** Confidence level for edges produced by this synthesizer. */
  readonly precision: Precision;

  /**
   * Estimated per-file or per-reference cost.
   * - `per-reference`: cost per unresolved reference processed.
   * - `full-graph`: cost per file or per node scanned.
   * Qualitative label for filtering (e.g. skip expensive synthesizers on
   * very large projects).
   */
  readonly cost: 'cheap' | 'moderate' | 'expensive';

  /**
   * Known false-positive scenarios. Human-readable, used in docs and
   * debug output. Example: "Closure-collection by field name can match
   * two unrelated properties named `validators`."
   */
  readonly knownFalsePositives: string[];

  /**
   * Dependencies on other synthesizers. The registry orders execution so
   * that a dependency's edges are persisted before this synthesizer runs.
   * Example: "go-implements" must run before "interface-impl".
   */
  readonly dependsOn?: string[];
}

// ── Synthesizer implementations ─────────────────────────────────────────

/**
 * A full-graph synthesizer — scans the entire code graph after baseline
 * edges are persisted. Replaces the 19 private functions in
 * callback-synthesizer.ts.
 *
 * Strategy: `full-graph`.
 */
export interface FullGraphSynthesizer {
  readonly descriptor: SynthesizerDescriptor;

  /**
   * Synthesize edges from the full graph. Called once after all baseline
   * edges are persisted.
   *
   * @returns edges to insert. An empty array is valid (no pattern matched).
   * @throws should never throw — callers wrap in try/catch.
   */
  synthesize(queries: QueryBuilder, ctx: ResolutionContext): Edge[];
}

/**
 * A per-reference synthesizer — resolves individual unresolved references
 * using framework-specific patterns. Wraps the existing FrameworkResolver
 * interface.
 *
 * Strategy: `per-reference`.
 */
export interface PerReferenceSynthesizer {
  readonly descriptor: SynthesizerDescriptor;

  /**
   * Detect whether the framework is used in this project.
   * Called once at startup.
   */
  detect(context: ResolutionContext): boolean;

  /**
   * Check whether this synthesizer claims a reference name, even when no
   * node is named that. Allows dynamic dispatch names to pass through the
   * name-exists pre-filter.
   */
  claimsReference?(name: string): boolean;

  /**
   * Resolve a single reference. Returns null if the reference doesn't match
   * this framework's patterns.
   */
  resolve(ref: {
    fromNodeId: string;
    referenceName: string;
    referenceKind: string;
    line: number;
    column: number;
    filePath: string;
    language: Language;
    candidates?: string[];
  }, context: ResolutionContext): {
    targetNodeId: string;
    method: string;
    confidence?: number;
  } | null;
}

/**
 * Union type for any registered synthesizer.
 */
export type Synthesizer = FullGraphSynthesizer | PerReferenceSynthesizer;

// ── Registry ────────────────────────────────────────────────────────────

/**
 * The synthesizer registry. Holds all registered synthesizers and provides
 * filtered access by language, strategy, and precision.
 */
export interface SynthesizerRegistry {
  /** Register a synthesizer (replaces any existing entry with the same id). */
  register(synth: Synthesizer): void;

  /** Get a synthesizer by id. */
  get(id: string): Synthesizer | undefined;

  /** List all registered synthesizers. */
  list(): Synthesizer[];

  /**
   * List synthesizers filtered by strategy and/or language.
   * An empty `languages` array means no language filter.
   */
  listFiltered(opts?: {
    strategy?: SynthesizerStrategy;
    languages?: Language[];
  }): Synthesizer[];

  /**
   * List synthesizers in dependency order for full-graph execution.
   * Synthesizers with no dependencies come first; those that depend on
   * earlier ones are ordered after their dependencies.
   */
  fullGraphOrder(): FullGraphSynthesizer[];

  /**
   * List per-reference synthesizers for the given languages.
   * Only returns those whose detect() passes for the project.
   */
  detectApplicable(context: ResolutionContext, languages: Language[]): PerReferenceSynthesizer[];

  /** Remove a synthesizer by id. */
  remove(id: string): void;

  /** Clear all registered synthesizers. */
  clear(): void;
}

// ── FrameworkResolver adapter ───────────────────────────────────────────

/**
 * Create a PerReferenceSynthesizer descriptor from a FrameworkResolver.
 * Maps the existing FrameworkResolver interface fields to the unified
 * SynthesizerDescriptor.
 */
export function frameworkResolverDescriptor(fw: FrameworkResolver): SynthesizerDescriptor {
  return {
    id: `fw-${fw.name}`,
    name: fw.name,
    strategy: 'per-reference',
    languages: fw.languages ?? [],
    precision: 'medium', // framework resolvers are name/pattern-based → medium by default
    cost: 'cheap',
    knownFalsePositives: [],
  };
}

/**
 * Wrap a FrameworkResolver as a PerReferenceSynthesizer.
 * The existing FrameworkResolver interface is a near-perfect match for
 * PerReferenceSynthesizer — only the resolve() return type differs
 * slightly (ResolvedRef vs { targetNodeId, method, confidence? }).
 */
export function wrapFrameworkResolver(fw: FrameworkResolver): PerReferenceSynthesizer {
  return {
    descriptor: frameworkResolverDescriptor(fw),
    detect: (ctx) => fw.detect(ctx),
    claimsReference: fw.claimsReference?.bind(fw),
    resolve: (ref, ctx) => {
      const result = fw.resolve(
        {
          fromNodeId: ref.fromNodeId,
          referenceName: ref.referenceName,
          referenceKind: ref.referenceKind as any,
          line: ref.line,
          column: ref.column,
          filePath: ref.filePath,
          language: ref.language,
          candidates: ref.candidates,
        },
        ctx,
      );
      if (!result) return null;
      return {
        targetNodeId: result.targetNodeId,
        method: result.resolvedBy,
        confidence: result.confidence,
      };
    },
  };
}
