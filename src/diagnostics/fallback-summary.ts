import { rustHybridFallbackStateFor, RustHybridFallbackState } from '../indexing/rust-hybrid-contract';

export type RustHybridFallbackProfile = {
  typescriptFallbackAppend?: {
    fallbackFileCount?: number;
    missingFallbackFileCount?: number;
    missingFallbackByLanguage?: Record<string, number>;
  };
};

export type RustHybridFallbackSummaryInput = {
  success: boolean;
  errors: Array<{ severity: string; code?: string }>;
  profile?: RustHybridFallbackProfile | Record<string, unknown>;
};

export type RustHybridFallbackReasonCount = {
  code: string;
  count: number;
};

export type RustHybridFallbackSummary = {
  fallbackState: RustHybridFallbackState;
  fallbackFileCount: number;
  missingFallbackFileCount: number;
  missingFallbackByLanguage: Record<string, number>;
  fallbackReasonTaxonomy: Record<string, number>;
  topFallbackReasons: RustHybridFallbackReasonCount[];
  graphUsabilityMessage: string;
};

const DEGRADED_GRAPH_USABILITY_MESSAGE =
  'The index is usable; fallback-degraded files or diagnostics are the only parts that need review.';
const HEALTHY_GRAPH_USABILITY_MESSAGE =
  'The index is fully covered by rust-hybrid without fallback diagnostics.';

const FALLBACK_REASON_LABELS: Record<string, string> = {
  'language-level-typescript-fallback': 'TypeScript fallback files',
  'language-level-fallback-missing-file': 'planned TypeScript fallback files missing from the checkout',
  'rust-owned-parse-gap': 'Rust-owned files with parse diagnostics',
  'rust-owned-extraction-gap': 'Rust-owned files with extraction diagnostics',
  'rust-owned-gap-with-partial-write-blocked': 'Rust-owned files with partial Rust writes not fallback-appended',
};

function fallbackProfile(input: RustHybridFallbackSummaryInput): RustHybridFallbackProfile | undefined {
  return input.profile as RustHybridFallbackProfile | undefined;
}

function sortFallbackReasons(fallbackReasonTaxonomy: Record<string, number>): RustHybridFallbackReasonCount[] {
  return Object.entries(fallbackReasonTaxonomy)
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
}

export function buildRustHybridFallbackSummary(input: RustHybridFallbackSummaryInput): RustHybridFallbackSummary {
  const profile = fallbackProfile(input);
  const fallbackAppend = profile?.typescriptFallbackAppend;
  const fallbackFileCount = fallbackAppend?.fallbackFileCount ?? 0;
  const missingFallbackFileCount = fallbackAppend?.missingFallbackFileCount ?? 0;
  const missingFallbackByLanguage = fallbackAppend?.missingFallbackByLanguage ?? {};
  const fallbackReasonTaxonomy: Record<string, number> = {};

  if (fallbackFileCount > 0) {
    fallbackReasonTaxonomy['language-level-typescript-fallback'] = fallbackFileCount;
  }
  if (missingFallbackFileCount > 0) {
    fallbackReasonTaxonomy['language-level-fallback-missing-file'] = missingFallbackFileCount;
  }
  for (const err of input.errors) {
    if (err.severity === 'error') continue;
    if (!err.code?.startsWith('rust-owned-')) continue;
    fallbackReasonTaxonomy[err.code] = (fallbackReasonTaxonomy[err.code] ?? 0) + 1;
  }

  const fallbackState = rustHybridFallbackStateFor(fallbackFileCount, fallbackReasonTaxonomy);
  return {
    fallbackState,
    fallbackFileCount,
    missingFallbackFileCount,
    missingFallbackByLanguage,
    fallbackReasonTaxonomy,
    topFallbackReasons: sortFallbackReasons(fallbackReasonTaxonomy),
    graphUsabilityMessage: fallbackState === 'degraded'
      ? DEGRADED_GRAPH_USABILITY_MESSAGE
      : HEALTHY_GRAPH_USABILITY_MESSAGE,
  };
}

function formatReasonCount(reason: RustHybridFallbackReasonCount): string {
  return `${reason.count} ${FALLBACK_REASON_LABELS[reason.code] ?? reason.code}`;
}

export function formatRustHybridFallbackHealthLines(summary: RustHybridFallbackSummary): string[] {
  if (summary.fallbackState !== 'degraded') return ['Fallback health: healthy'];
  const reasons = summary.topFallbackReasons.slice(0, 3).map(formatReasonCount);
  const reasonBlock = reasons.length > 0
    ? `Top fallback reasons:\n${reasons.map((reason) => `  ${reason}`).join('\n')}`
    : 'Top fallback reasons: unavailable';
  return [
    'Fallback health: degraded',
    `${summary.graphUsabilityMessage}\n${reasonBlock}`,
  ];
}

export function formatRustHybridFallbackDoctorHint(
  summary: RustHybridFallbackSummary,
  doctorCommand = 'zcodegraph doctor --engine rust-hybrid --bundle --last-run',
): string[] {
  if (summary.fallbackState !== 'degraded') return [];
  return [
    'Indexed with rust-hybrid',
    ...formatRustHybridFallbackHealthLines(summary),
    `Run diagnostic bundle:\n  ${doctorCommand}`,
  ];
}
