import { detectLanguage, isLanguageSupported } from '../extraction/grammars';
import { isGeneratedFile } from '../extraction/generated-detection';
import { scanDirectory } from '../extraction';

export const RUST_HYBRID_PHASE = 'phase-1-engine-contract';
export const RUST_HYBRID_RUST_OWNED_LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx', 'go'] as const;

export interface RustHybridMetadata {
  phase: typeof RUST_HYBRID_PHASE;
  rustOwnedLanguages: string[];
  fallbackState: 'pending';
  fallbackMessage: string;
  skippedGeneratedByLanguage: Record<string, number>;
}

export function buildRustHybridMetadata(projectPath: string): RustHybridMetadata {
  return {
    phase: RUST_HYBRID_PHASE,
    rustOwnedLanguages: [...RUST_HYBRID_RUST_OWNED_LANGUAGES],
    fallbackState: 'pending',
    fallbackMessage: 'Phase 1 does not implement TypeScript fallback writes; unsupported rust-hybrid source languages fail fast.',
    skippedGeneratedByLanguage: countSkippedGeneratedFiles(projectPath),
  };
}

function isRustHybridOwnedLanguage(language: string): boolean {
  return (RUST_HYBRID_RUST_OWNED_LANGUAGES as readonly string[]).includes(language);
}

export function assertRustHybridPhase1CanIndex(projectPath: string): void {
  const unsupported = new Map<string, string>();

  for (const filePath of scanDirectory(projectPath)) {
    if (isGeneratedFile(filePath)) continue;
    const language = detectLanguage(filePath);
    if (!isLanguageSupported(language) || isRustHybridOwnedLanguage(language)) continue;
    if (!unsupported.has(language)) unsupported.set(language, filePath);
  }

  const first = unsupported.entries().next();
  if (!first.done) {
    const [language, filePath] = first.value;
    throw new Error(
      `rust-hybrid Phase 1 cannot index ${filePath} (${language}): TypeScript fallback writes are not implemented yet. ` +
      'Use --engine typescript or ZCODEGRAPH_INDEX_ENGINE=typescript for this run.',
    );
  }
}

function countSkippedGeneratedFiles(projectPath: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const filePath of scanDirectory(projectPath)) {
    if (!isGeneratedFile(filePath)) continue;
    const language = detectLanguage(filePath);
    if (!isLanguageSupported(language)) continue;
    counts[language] = (counts[language] ?? 0) + 1;
  }
  return counts;
}
