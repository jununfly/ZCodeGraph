import { detectLanguage, isLanguageSupported } from '../extraction/grammars';
import { isGeneratedFile } from '../extraction/generated-detection';
import { scanDirectory } from '../extraction';
import type { Language } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export const RUST_HYBRID_PHASE = 'phase-6-rust-owned-per-file-gap-fallback';
export const RUST_HYBRID_RUST_OWNED_LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx', 'go', 'java', 'kotlin', 'python', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby', 'dart', 'swift', 'objc', 'lua', 'luau', 'pascal', 'scala'] as const;

/**
 * Languages whose TypeScript-shell ownership is a deliberate design decision
 * (roadmap 1-3-x-1 keep decisions), not a Rust-core gap. Two sub-families:
 *
 *  1. File-level-only (yaml/twig/properties): extraction layer is a deliberate
 *     no-op; symbols come from TS framework resolvers (1-4 wave). Guarded by
 *     `isFileLevelOnlyLanguage` + `tests/file-level-language-ownership-guard.test.ts`.
 *  2. Delegation extractors (svelte/vue/liquid/razor/xml): custom extractors
 *     whose value is embedded-block delegation to a full language extractor
 *     (e.g. Vue `<script>` → TS/JS), which the Rust core cannot replicate
 *     without an ABI-14 grammar + sub-tree delegation mechanism.
 *
 * Files in these languages are still tracked, indexed by the TS shell, and
 * counted under `fallbackByLanguage` for observability — but they no longer
 * contribute to `fallbackReasonTaxonomy['language-level-typescript-fallback']`
 * or `language-level-fallback-missing-file`, so they cannot push the fallback
 * state to `degraded` on their own (roadmap 1-3-1).
 */
export const RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES = ['svelte', 'vue', 'liquid', 'razor', 'xml', 'yaml', 'twig', 'properties'] as const;
export type RustHybridByDesignTsShellLanguage = typeof RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES[number];

export function isByDesignTsShellLanguage(language: string): boolean {
  return (RUST_HYBRID_BY_DESIGN_TS_SHELL_LANGUAGES as readonly string[]).includes(language);
}
export type RustHybridFallbackState = 'healthy' | 'partial' | 'degraded' | 'pending';

/**
 * Roadmap 1-4-28 / ADR-0009 D4: P2 embedding failure codes whose presence
 * alone keeps the index at `partial` rather than `degraded`. These represent
 * recoverable drift (the structure graph is intact; only the embedding layer
 * is stale or behind), not a structural gap.
 *
 * `embedding-model-not-downloaded` is intentionally absent — it must never
 * reach the taxonomy at all (caller filters it; see fallback-summary.ts).
 */
export const EMBEDDING_PARTIAL_REASON_CODES = new Set<string>([
  'embedding-stale',
]);
export type RustOwnedGapCode =
  | 'rust-owned-parse-gap'
  | 'rust-owned-extraction-gap'
  | 'rust-owned-gap-with-partial-write-blocked';

export interface RustOwnedPerFileGapDiagnostic {
  filePath: string;
  language?: string;
  code: RustOwnedGapCode;
  severity: 'warning' | 'error';
  writtenByRust?: boolean;
  line?: number;
  column?: number;
  message?: string;
}

export interface RustHybridAssignmentPlan {
  rustOwnedFiles: string[];
  fallbackFiles: string[];
  unsupportedFiles: string[];
  engineByLanguage: Record<string, 'rust' | 'typescript'>;
  engineByFileCount: Record<string, number>;
  fallbackByLanguage: Record<string, number>;
  fallbackFileCount: number;
  missingFallbackByLanguage: Record<string, number>;
  missingFallbackFileCount: number;
  skippedGeneratedByLanguage: Record<string, number>;
  fallbackState: RustHybridFallbackState;
  fallbackReasonTaxonomy: Record<string, number>;
  pendingFallbacks: string[];
}

export interface RustHybridMetadata {
  phase: typeof RUST_HYBRID_PHASE;
  rustOwnedLanguages: string[];
  engineByLanguage: Record<string, 'rust' | 'typescript'>;
  engineByFileCount: Record<string, number>;
  fallbackByLanguage: Record<string, number>;
  fallbackFileCount: number;
  missingFallbackByLanguage: Record<string, number>;
  missingFallbackFileCount: number;
  fallbackState: RustHybridFallbackState;
  fallbackMessage: string;
  fallbackReasonTaxonomy: Record<string, number>;
  pendingFallbacks: string[];
  skippedGeneratedByLanguage: Record<string, number>;
}

export function rustHybridFallbackStateFor(
  _fallbackFileCount: number,
  fallbackReasonTaxonomy: Record<string, number>,
): RustHybridFallbackState {
  // Roadmap 1-3-1: by-design TS-shell languages (svelte/vue/liquid/razor/
  // xml/yaml/twig/properties) still appear in `fallbackFileCount` for
  // observability but no longer contribute any taxonomy entry, so an index
  // whose only fallbacks are by-design now reports `healthy` rather than
  // `partial`. `partial` is reserved for genuine unexpected fallbacks
  // (non-Rust-owned, non-by-design languages). The `_fallbackFileCount`
  // parameter is retained for API compatibility with existing callers but
  // no longer drives the state directly — taxonomy is the single source
  // of truth for unexpected fallback signals.
  const unexpectedLanguageFallback = fallbackReasonTaxonomy['language-level-typescript-fallback'] ?? 0;
  if (unexpectedLanguageFallback === 0 && Object.keys(fallbackReasonTaxonomy).length === 0) {
    return 'healthy';
  }
  // Roadmap 1-4-28 / ADR-0009 D4: `embedding-stale` (and any future entry in
  // EMBEDDING_PARTIAL_REASON_CODES) signals "structure intact, embedding
  // layer behind" — it caps the state at `partial` rather than `degraded`.
  // Any other unexpected reason still escalates to `degraded`.
  const keys = Object.keys(fallbackReasonTaxonomy);
  const hasDegradedReasons = keys.some(
    (code) =>
      code !== 'language-level-typescript-fallback' &&
      !EMBEDDING_PARTIAL_REASON_CODES.has(code),
  );
  if (hasDegradedReasons) return 'degraded';
  return 'partial';
}

export function buildRustHybridMetadata(projectPath: string): RustHybridMetadata {
  return buildRustHybridMetadataFromPlan(planRustHybridAssignments(projectPath));
}

export function buildRustHybridMetadataFromPlan(plan: RustHybridAssignmentPlan): RustHybridMetadata {
  const hasFallbackDiagnostics = Object.keys(plan.fallbackReasonTaxonomy).length > 0;
  return {
    phase: RUST_HYBRID_PHASE,
    rustOwnedLanguages: [...RUST_HYBRID_RUST_OWNED_LANGUAGES],
    engineByLanguage: plan.engineByLanguage,
    engineByFileCount: plan.engineByFileCount,
    fallbackByLanguage: plan.fallbackByLanguage,
    fallbackFileCount: plan.fallbackFileCount,
    missingFallbackByLanguage: plan.missingFallbackByLanguage,
    missingFallbackFileCount: plan.missingFallbackFileCount,
    fallbackState: plan.fallbackState,
    fallbackMessage: plan.fallbackFileCount > 0 || hasFallbackDiagnostics
      ? fallbackMessage(plan)
      : 'No TypeScript fallback files were needed for this rust-hybrid index.',
    fallbackReasonTaxonomy: plan.fallbackReasonTaxonomy,
    pendingFallbacks: plan.pendingFallbacks,
    skippedGeneratedByLanguage: plan.skippedGeneratedByLanguage,
  };
}

function fallbackMessage(plan: RustHybridAssignmentPlan): string {
  const rustOwnedGapCount =
    (plan.fallbackReasonTaxonomy['rust-owned-parse-gap'] ?? 0) +
    (plan.fallbackReasonTaxonomy['rust-owned-extraction-gap'] ?? 0);
  const languageLevelCount = plan.fallbackReasonTaxonomy['language-level-typescript-fallback'] ?? 0;
  const messages: string[] = [];
  if (languageLevelCount > 0) {
    messages.push(`TypeScript fallback appended ${languageLevelCount} non-Rust-owned supported file(s).`);
  }
  if (rustOwnedGapCount > 0) {
    messages.push(`Rust-owned gap diagnostics recorded ${rustOwnedGapCount} file(s) without TypeScript fallback append.`);
  }
  if (plan.missingFallbackFileCount > 0) {
    messages.push(`Sparse checkout omitted ${plan.missingFallbackFileCount} planned TypeScript fallback file(s).`);
  }
  return messages.length > 0
    ? messages.join(' ')
    : `TypeScript fallback appended ${plan.fallbackFileCount} file(s).`;
}

export function isRustHybridOwnedLanguage(language: string): boolean {
  return (RUST_HYBRID_RUST_OWNED_LANGUAGES as readonly string[]).includes(language);
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function mergeRustOwnedGapDiagnostics(
  plan: RustHybridAssignmentPlan,
  diagnostics: RustOwnedPerFileGapDiagnostic[],
): RustHybridAssignmentPlan {
  const fallbackFiles = [...plan.fallbackFiles];
  const fallbackByLanguage = { ...plan.fallbackByLanguage };
  const fallbackReasonTaxonomy = { ...plan.fallbackReasonTaxonomy };

  for (const diagnostic of diagnostics) {
    if (diagnostic.severity !== 'warning') continue;
    const language = diagnostic.language ?? detectLanguage(diagnostic.filePath);
    if (!isRustHybridOwnedLanguage(language)) continue;

    if (diagnostic.writtenByRust === false && diagnostic.code !== 'rust-owned-gap-with-partial-write-blocked') {
      increment(fallbackReasonTaxonomy, diagnostic.code);
      continue;
    }

    increment(fallbackReasonTaxonomy, 'rust-owned-gap-with-partial-write-blocked');
  }

  const fallbackFileCount = unique(fallbackFiles).length;
  const pendingFallbacks = plan.pendingFallbacks.filter((code) => {
    if (code === 'rust-owned-parse-gap' && fallbackReasonTaxonomy['rust-owned-parse-gap']) return false;
    if (code === 'rust-owned-extraction-gap' && fallbackReasonTaxonomy['rust-owned-extraction-gap']) return false;
    return true;
  });

  return {
    ...plan,
    fallbackFiles: unique(fallbackFiles),
    fallbackByLanguage,
    fallbackFileCount,
    fallbackState: rustHybridFallbackStateFor(fallbackFileCount, fallbackReasonTaxonomy) === 'degraded'
      ? 'degraded'
      : plan.fallbackState,
    fallbackReasonTaxonomy,
    pendingFallbacks,
  };
}

export function mergeMissingFallbackDiagnostics(
  plan: RustHybridAssignmentPlan,
  diagnostics: {
    missingFallbackByLanguage?: Record<string, number>;
    missingFallbackFileCount?: number;
  },
): RustHybridAssignmentPlan {
  const missingFallbackFileCount = diagnostics.missingFallbackFileCount ?? 0;
  if (missingFallbackFileCount <= 0) return plan;

  const missingFallbackByLanguage = {
    ...plan.missingFallbackByLanguage,
  };
  // Roadmap 1-3-1: missing files in by-design TS-shell languages are plan
  // drift (sparse checkout, deleted files) on languages we deliberately keep
  // on the TS shell — they don't indicate a Rust-core gap. Track them for
  // observability but exclude them from the `language-level-fallback-missing-file`
  // taxonomy entry so they cannot force `degraded` on their own.
  let unexpectedMissingCount = 0;
  for (const [language, count] of Object.entries(diagnostics.missingFallbackByLanguage ?? {})) {
    missingFallbackByLanguage[language] = (missingFallbackByLanguage[language] ?? 0) + count;
    if (!isByDesignTsShellLanguage(language)) {
      unexpectedMissingCount += count;
    }
  }

  const fallbackReasonTaxonomy = { ...plan.fallbackReasonTaxonomy };
  if (unexpectedMissingCount > 0) {
    fallbackReasonTaxonomy['language-level-fallback-missing-file'] =
      (fallbackReasonTaxonomy['language-level-fallback-missing-file'] ?? 0) + unexpectedMissingCount;
  }

  // Only escalate to degraded when there is at least one unexpected missing
  // fallback. If every missing file is in a by-design language, the previous
  // state is preserved (typically healthy after this node's plan change).
  const nextState = unexpectedMissingCount > 0
    ? 'degraded'
    : plan.fallbackState;

  return {
    ...plan,
    missingFallbackByLanguage,
    missingFallbackFileCount: plan.missingFallbackFileCount + missingFallbackFileCount,
    fallbackState: nextState,
    fallbackReasonTaxonomy,
  };
}

export function planRustHybridAssignments(projectPath: string): RustHybridAssignmentPlan {
  const rustOwnedFiles: string[] = [];
  const fallbackFiles: string[] = [];
  const unsupportedFiles: string[] = [];
  const engineByLanguage: Record<string, 'rust' | 'typescript'> = {};
  const engineByFileCount: Record<string, number> = {};
  const fallbackByLanguage: Record<string, number> = {};
  const skippedGeneratedByLanguage: Record<string, number> = {};
  // Roadmap 1-3-1: files in BY_DESIGN_TS_SHELL_LANGUAGES still flow through
  // the TS fallback extractor (they need to be indexed), but they do NOT
  // contribute to `language-level-typescript-fallback` taxonomy — their
  // TS-shell ownership is a deliberate 1-3-x-1 keep decision, not a gap.
  let unexpectedFallbackFileCount = 0;

  for (const filePath of scanDirectory(projectPath)) {
    const language = detectLanguageForRustHybridPlan(projectPath, filePath);
    if (isGeneratedFile(filePath)) {
      if (isLanguageSupported(language)) {
        skippedGeneratedByLanguage[language] = (skippedGeneratedByLanguage[language] ?? 0) + 1;
      }
      continue;
    }
    if (!isLanguageSupported(language)) {
      unsupportedFiles.push(filePath);
      continue;
    }
    if (isRustHybridOwnedLanguage(language)) {
      rustOwnedFiles.push(filePath);
      engineByLanguage[language] = 'rust';
      engineByFileCount.rust = (engineByFileCount.rust ?? 0) + 1;
    } else {
      fallbackFiles.push(filePath);
      engineByLanguage[language] = 'typescript';
      engineByFileCount.typescript = (engineByFileCount.typescript ?? 0) + 1;
      fallbackByLanguage[language] = (fallbackByLanguage[language] ?? 0) + 1;
      if (!isByDesignTsShellLanguage(language)) {
        unexpectedFallbackFileCount += 1;
      }
    }
  }

  const fallbackReasonTaxonomy: Record<string, number> = unexpectedFallbackFileCount > 0
    ? { 'language-level-typescript-fallback': unexpectedFallbackFileCount }
    : {};

  return {
    rustOwnedFiles,
    fallbackFiles,
    unsupportedFiles,
    engineByLanguage,
    engineByFileCount,
    fallbackByLanguage,
    fallbackFileCount: fallbackFiles.length,
    missingFallbackByLanguage: {},
    missingFallbackFileCount: 0,
    skippedGeneratedByLanguage,
    fallbackState: rustHybridFallbackStateFor(fallbackFiles.length, fallbackReasonTaxonomy),
    fallbackReasonTaxonomy,
    pendingFallbacks: ['rust-owned-parse-gap'],
  };
}

function detectLanguageForRustHybridPlan(projectPath: string, filePath: string): Language {
  if (!filePath.toLowerCase().endsWith('.h')) {
    return detectLanguage(filePath);
  }
  try {
    return detectLanguage(filePath, fs.readFileSync(path.join(projectPath, filePath), 'utf-8'));
  } catch {
    return detectLanguage(filePath);
  }
}
