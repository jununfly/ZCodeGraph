import { detectLanguage, isLanguageSupported } from '../extraction/grammars';
import { isGeneratedFile } from '../extraction/generated-detection';
import { scanDirectory } from '../extraction';

export const RUST_HYBRID_PHASE = 'phase-6-rust-owned-per-file-gap-fallback';
export const RUST_HYBRID_RUST_OWNED_LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx', 'go'] as const;
export type RustHybridFallbackState = 'healthy' | 'degraded' | 'pending';
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
  fallbackState: RustHybridFallbackState;
  fallbackMessage: string;
  fallbackReasonTaxonomy: Record<string, number>;
  pendingFallbacks: string[];
  skippedGeneratedByLanguage: Record<string, number>;
}

export function buildRustHybridMetadata(projectPath: string): RustHybridMetadata {
  return buildRustHybridMetadataFromPlan(planRustHybridAssignments(projectPath));
}

export function buildRustHybridMetadataFromPlan(plan: RustHybridAssignmentPlan): RustHybridMetadata {
  return {
    phase: RUST_HYBRID_PHASE,
    rustOwnedLanguages: [...RUST_HYBRID_RUST_OWNED_LANGUAGES],
    engineByLanguage: plan.engineByLanguage,
    engineByFileCount: plan.engineByFileCount,
    fallbackByLanguage: plan.fallbackByLanguage,
    fallbackFileCount: plan.fallbackFileCount,
    fallbackState: plan.fallbackState,
    fallbackMessage: plan.fallbackFileCount > 0
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
    messages.push(`Rust-owned gap fallback appended ${rustOwnedGapCount} file(s).`);
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
      fallbackFiles.push(diagnostic.filePath);
      increment(fallbackByLanguage, language);
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
    fallbackState: fallbackFileCount > 0 || Object.keys(fallbackReasonTaxonomy).length > 0 ? 'degraded' : plan.fallbackState,
    fallbackReasonTaxonomy,
    pendingFallbacks,
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
    const language = detectLanguage(filePath);
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
    skippedGeneratedByLanguage,
    fallbackState: fallbackFiles.length > 0 ? 'degraded' : 'healthy',
    fallbackReasonTaxonomy: fallbackFiles.length > 0 ? { 'language-level-typescript-fallback': fallbackFiles.length } : {},
    pendingFallbacks: ['rust-owned-parse-gap'],
  };
}
