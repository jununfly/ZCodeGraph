import { rustHybridFallbackStateFor, RustHybridFallbackState } from '../indexing/rust-hybrid-contract';

export type RustHybridFallbackProfile = {
  typescriptFallbackAppend?: {
    fallbackFileCount?: number;
    fallbackByLanguage?: Record<string, number>;
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
  fallbackByLanguage: Record<string, number>;
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
const PARTIAL_GRAPH_USABILITY_MESSAGE =
  'Index is complete; some files were indexed via TypeScript fallback for non-Rust-owned languages.';

const FALLBACK_REASON_LABELS: Record<string, string> = {
  'language-level-typescript-fallback': 'non-Rust-owned files via TypeScript fallback',
  'language-level-fallback-missing-file': 'planned TypeScript fallback files missing from the checkout',
  'rust-owned-parse-gap': 'Rust-owned files with parse diagnostics',
  'rust-owned-extraction-gap': 'Rust-owned files with extraction diagnostics',
  'rust-owned-gap-with-partial-write-blocked': 'Rust-owned files with partial Rust writes not fallback-appended',
};

export function rustHybridFallbackReasonLabel(code: string): string {
  return FALLBACK_REASON_LABELS[code] ?? code;
}

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
  const fallbackByLanguage = fallbackAppend?.fallbackByLanguage ?? {};
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
    fallbackByLanguage,
    missingFallbackFileCount,
    missingFallbackByLanguage,
    fallbackReasonTaxonomy,
    topFallbackReasons: sortFallbackReasons(fallbackReasonTaxonomy),
    graphUsabilityMessage: fallbackState === 'degraded'
      ? DEGRADED_GRAPH_USABILITY_MESSAGE
      : fallbackState === 'partial'
        ? PARTIAL_GRAPH_USABILITY_MESSAGE
        : HEALTHY_GRAPH_USABILITY_MESSAGE,
  };
}

function formatReasonCount(reason: RustHybridFallbackReasonCount): string {
  return `${reason.count} ${rustHybridFallbackReasonLabel(reason.code)}`;
}

export function formatRustHybridFallbackHealthLines(summary: RustHybridFallbackSummary): string[] {
  if (summary.fallbackState === 'healthy') return ['Fallback health: healthy'];
  if (summary.fallbackState === 'partial') {
    const langEntries = Object.entries(summary.fallbackByLanguage)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const langBlock = langEntries.length > 0
      ? `\nFallback by source language: ${langEntries.map(([lang, count]) => `${lang} (${count})`).join(', ')}`
      : '';
    return [
      'Fallback health: partial',
      `${summary.graphUsabilityMessage}\n${summary.fallbackFileCount} files indexed via TypeScript fallback (non-Rust-owned languages)${langBlock}`,
    ];
  }
  const reasons = summary.topFallbackReasons.slice(0, 3).map(formatReasonCount);
  const reasonBlock = reasons.length > 0
    ? `Top fallback reasons:\n${reasons.map((reason) => `  ${reason}`).join('\n')}`
    : 'Top fallback reasons: unavailable';
  const langEntries = Object.entries(summary.fallbackByLanguage)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const langBlock = langEntries.length > 0
    ? `\nFallback by source language: ${langEntries.map(([lang, count]) => `${lang} (${count})`).join(', ')}`
    : '';
  return [
    'Fallback health: degraded',
    `${summary.graphUsabilityMessage}\n${reasonBlock}${langBlock}`,
  ];
}

export function formatRustHybridFallbackDoctorHint(
  summary: RustHybridFallbackSummary,
  doctorCommand = 'zcodegraph doctor --engine rust-hybrid --bundle --last-run',
): string[] {
  if (summary.fallbackState === 'healthy') return [];
  return [
    'Indexed with rust-hybrid',
    ...formatRustHybridFallbackHealthLines(summary),
    ...(summary.fallbackState === 'degraded' ? [`Run diagnostic bundle:\n  ${doctorCommand}`] : []),
  ];
}
