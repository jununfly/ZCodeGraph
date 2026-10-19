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

/**
 * #686: one row per distinct (language, code, message) triple observed across
 * the per-file diagnostics — the aggregate collapses N identical entries
 * (e.g. 136 Vue files all reporting the same parser_error) into a single
 * scannable first-screen finding.
 */
export type RustHybridAggregatedFinding = {
  language: string;
  code: string;
  message: string;
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
  /**
   * #686: populated by the doctor bundle builder after grouping per-file
   * diagnostics; rendered by formatRustHybridFallbackHealthLines for any
   * non-healthy state. Optional so existing callers that never see per-file
   * diagnostics keep their current output byte-identical.
   */
  aggregatedFindings?: RustHybridAggregatedFinding[];
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

// #686: keep first-screen aggregate lines short enough to scan. The full
// un-truncated message lives in per-file-diagnostics.json; the first screen
// only needs enough to classify the finding.
const AGGREGATED_MESSAGE_BUDGET = 80;

function formatAggregatedFinding(finding: RustHybridAggregatedFinding): string {
  const message = finding.message.length > AGGREGATED_MESSAGE_BUDGET
    ? `${finding.message.slice(0, AGGREGATED_MESSAGE_BUDGET)}…`
    : finding.message;
  return `${finding.count} ${finding.language} ${finding.code} "${message}"`;
}

function formatAggregatedFindingsBlock(findings: RustHybridAggregatedFinding[] | undefined): string {
  if (!findings || findings.length === 0) return '';
  const sorted = [...findings].sort(
    (a, b) => b.count - a.count || a.language.localeCompare(b.language) || a.code.localeCompare(b.code),
  );
  const lines = sorted.slice(0, 3).map((finding) => `  ${formatAggregatedFinding(finding)}`);
  return `\nTop aggregated findings:\n${lines.join('\n')}`;
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
      `${summary.graphUsabilityMessage}\n${summary.fallbackFileCount} files indexed via TypeScript fallback (non-Rust-owned languages)${langBlock}${formatAggregatedFindingsBlock(summary.aggregatedFindings)}`,
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
    `${summary.graphUsabilityMessage}\n${reasonBlock}${langBlock}${formatAggregatedFindingsBlock(summary.aggregatedFindings)}`,
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
