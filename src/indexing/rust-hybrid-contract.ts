import { detectLanguage, isLanguageSupported } from '../extraction/grammars';
import { isGeneratedFile } from '../extraction/generated-detection';
import { scanDirectory } from '../extraction';

export const RUST_HYBRID_PHASE = 'phase-1-engine-contract';
export const RUST_HYBRID_RUST_OWNED_LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx'] as const;

export interface RustHybridMetadata {
  phase: typeof RUST_HYBRID_PHASE;
  rustOwnedLanguages: string[];
  fallbackState: 'pending';
  fallbackMessage: string;
}

export function buildRustHybridMetadata(): RustHybridMetadata {
  return {
    phase: RUST_HYBRID_PHASE,
    rustOwnedLanguages: [...RUST_HYBRID_RUST_OWNED_LANGUAGES],
    fallbackState: 'pending',
    fallbackMessage: 'Phase 1 does not implement TypeScript fallback writes; unsupported rust-hybrid source languages fail fast.',
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

  const goFile = unsupported.get('go');
  if (goFile) {
    throw new Error(
      `rust-hybrid Phase 1 cannot index ${goFile}: Go is a rust-hybrid release blocker but is not implemented yet. ` +
      'Use --engine typescript or ZCODEGRAPH_INDEX_ENGINE=typescript for this run.',
    );
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
