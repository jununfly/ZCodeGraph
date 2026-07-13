import { detectLanguage, isLanguageSupported } from '../extraction/grammars';
import { isGeneratedFile } from '../extraction/generated-detection';
import { scanDirectory } from '../extraction';
import type { Language } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export const RUST_HYBRID_PHASE = 'phase-6-rust-owned-per-file-gap-fallback';
export const RUST_HYBRID_RUST_OWNED_LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx', 'go', 'java', 'python', 'rust', 'c'] as const;
export type RustHybridFallbackState = 'healthy' | 'partial' | 'degraded' | 'pending';
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
  fallbackFileCount: number,
  fallbackReasonTaxonomy: Record<string, number>,
): RustHybridFallbackState {
  const hasAnyReason = fallbackFileCount > 0 || Object.keys(fallbackReasonTaxonomy).length > 0;
  if (!hasAnyReason) return 'healthy';
  const hasUnexpectedReasons = Object.keys(fallbackReasonTaxonomy).some(
    (code) => code !== 'language-level-typescript-fallback',
  );
  return hasUnexpectedReasons ? 'degraded' : 'partial';
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
  for (const [language, count] of Object.entries(diagnostics.missingFallbackByLanguage ?? {})) {
    missingFallbackByLanguage[language] = (missingFallbackByLanguage[language] ?? 0) + count;
  }

  const fallbackReasonTaxonomy = {
    ...plan.fallbackReasonTaxonomy,
    'language-level-fallback-missing-file': (plan.fallbackReasonTaxonomy['language-level-fallback-missing-file'] ?? 0) + missingFallbackFileCount,
  };

  return {
    ...plan,
    missingFallbackByLanguage,
    missingFallbackFileCount: plan.missingFallbackFileCount + missingFallbackFileCount,
    fallbackState: 'degraded',
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
    }
  }

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
    fallbackState: rustHybridFallbackStateFor(fallbackFiles.length, fallbackFiles.length > 0 ? { 'language-level-typescript-fallback': fallbackFiles.length } : {}),
    fallbackReasonTaxonomy: fallbackFiles.length > 0 ? { 'language-level-typescript-fallback': fallbackFiles.length } : {},
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
