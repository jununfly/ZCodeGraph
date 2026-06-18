import { detectLanguage, isLanguageSupported } from '../extraction/grammars';
import { isGeneratedFile } from '../extraction/generated-detection';
import { scanDirectory } from '../extraction';

export const RUST_HYBRID_PHASE = 'phase-3-typescript-fallback-writes';
export const RUST_HYBRID_RUST_OWNED_LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx', 'go'] as const;
export type RustHybridFallbackState = 'healthy' | 'degraded' | 'pending';

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
      ? `TypeScript fallback appended ${plan.fallbackFileCount} non-Rust-owned supported file(s).`
      : 'No TypeScript fallback files were needed for this rust-hybrid index.',
    fallbackReasonTaxonomy: plan.fallbackReasonTaxonomy,
    pendingFallbacks: plan.pendingFallbacks,
    skippedGeneratedByLanguage: plan.skippedGeneratedByLanguage,
  };
}

export function isRustHybridOwnedLanguage(language: string): boolean {
  return (RUST_HYBRID_RUST_OWNED_LANGUAGES as readonly string[]).includes(language);
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
