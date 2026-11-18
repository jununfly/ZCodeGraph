/**
 * Shared Explore budget Module.
 *
 * Per DES-cli-p1-modularity-and-explore-v1 §Explore application composition:
 * `getExploreOutputBudget` and `tightSmallProjectBudgetEnabled` policy live
 * here. The Module receives `tightSmallProjectBudgetEnabled` as data rather
 * than reading the environment. Adapters parse the environment flag exactly
 * once per operation and pass it in via `ExploreRuntimeOptions`.
 *
 * `src/mcp/tools.ts` may temporarily re-export these without adding policy.
 */

import type { ExploreOutputBudget } from './types';

/**
 * Calculate the recommended number of `zcodegraph_explore` calls based on
 * project size. Larger codebases need more exploration calls to cover their
 * surface area; smaller ones should use fewer to avoid overhead.
 */
export function getExploreBudget(fileCount: number): number {
  if (fileCount < 500) return 1;
  if (fileCount < 5000) return 2;
  if (fileCount < 15000) return 3;
  if (fileCount < 25000) return 4;
  return 5;
}

/**
 * Compute the adaptive output budget tier.
 *
 * The `tightSmallProjectBudgetEnabled` flag is data: the caller parses
 * `ZCG_EXPLORE_TIGHT_SMALL_PROJECT` once per operation and passes it in.
 * The Module never reads process.env.
 */
export function getExploreOutputBudget(
  fileCount: number,
  tightSmallProjectBudgetEnabled: boolean,
): ExploreOutputBudget {
  // Tiered budget, scaled to project size. The budget is a CEILING (relevance
  // still gates WHAT is included), and it MUST stay under the agent's INLINE
  // tool-result cap (~25K chars). Above that, the host externalizes the result
  // to a file the agent then Reads back — re-introducing a read AND the
  // cache-write cost — which is exactly what a 35K vscode explore did in the
  // n=4 README A/B. So even large repos cap at ~24K: the answer is the handful
  // of ~100-line flow windows the agent would have grep-located and read (it
  // natively reads ~6–9 files, median 100-line ranges), NOT a sprawl of 12
  // files. Concentration onto the flow emerges from this cap + the named-file-
  // first sort dropping peripheral files. Invariant: a larger tier must never
  // get a smaller `maxCharsPerFile` than a smaller tier.
  if (fileCount < 150) {
    // Roadmap 1-2-11: opt-in tight tier for small projects. Default preserves
    // the ITER3 shape (13K/4/3.8K); with tightSmallProjectBudgetEnabled we
    // halve the output ceiling and per-file cap and skip the blast-radius
    // section, because on small projects (petclinic evidence 2026-10-21) the
    // explore answer over-fires past the byte cost of reading 2-3 equivalent
    // files directly.
    if (tightSmallProjectBudgetEnabled) {
      return {
        maxOutputChars: 8000,
        defaultMaxFiles: 3,
        maxCharsPerFile: 2200,
        gapThreshold: 7,
        maxSymbolsInFileHeader: 5,
        maxEdgesPerRelationshipKind: 4,
        includeRelationships: false,
        includeBlastRadius: false,
        includeAdditionalFiles: false,
        includeCompletenessSignal: false,
        includeBudgetNote: false,
        excludeLowValueFiles: true,
      };
    }
    return {
      // ITER3: revert iter2's aggressive body shrink (forced Read fallback —
      // the per-file 2.5K cap pushed the agent to Read instead of node).
      // Back to the iter1 shape (13K/4/3.8K) but keep the test-file
      // hard-exclude. The cost lever for this tier lives in steering the
      // agent to stop after 1-2 calls, not in this budget.
      maxOutputChars: 13000,
      defaultMaxFiles: 4,
      maxCharsPerFile: 3800,
      gapThreshold: 7,
      maxSymbolsInFileHeader: 5,
      maxEdgesPerRelationshipKind: 4,
      includeRelationships: false,
      includeAdditionalFiles: false,
      includeCompletenessSignal: false,
      includeBudgetNote: false,
      excludeLowValueFiles: true,
    };
  }
  if (fileCount < 500) {
    // Roadmap 1-2-11: same opt-in tight tier as <150, tuned slightly larger.
    if (tightSmallProjectBudgetEnabled) {
      return {
        maxOutputChars: 10000,
        defaultMaxFiles: 4,
        maxCharsPerFile: 2600,
        gapThreshold: 8,
        maxSymbolsInFileHeader: 6,
        maxEdgesPerRelationshipKind: 6,
        includeRelationships: false,
        includeBlastRadius: false,
        includeAdditionalFiles: false,
        includeCompletenessSignal: false,
        includeBudgetNote: false,
        excludeLowValueFiles: true,
      };
    }
    return {
      // ITER3: same revert/keep-filter pattern as <150.
      maxOutputChars: 18000,
      defaultMaxFiles: 5,
      maxCharsPerFile: 3800,
      gapThreshold: 8,
      maxSymbolsInFileHeader: 6,
      maxEdgesPerRelationshipKind: 6,
      includeRelationships: false,
      includeAdditionalFiles: false,
      includeCompletenessSignal: false,
      includeBudgetNote: false,
      excludeLowValueFiles: true,
    };
  }
  if (fileCount < 5000) {
    return {
      // ~150-line per-file window (the native read unit) × ~6 files, capped at
      // the ~24K inline ceiling so the response is never externalized. Per-file
      // stays ≥ the <500 tier (3800) — monotonic.
      maxOutputChars: 24000,
      defaultMaxFiles: 8,
      maxCharsPerFile: 6500,
      gapThreshold: 12,
      maxSymbolsInFileHeader: 10,
      maxEdgesPerRelationshipKind: 10,
      includeRelationships: true,
      includeAdditionalFiles: true,
      includeCompletenessSignal: true,
      includeBudgetNote: true,
      excludeLowValueFiles: false,
    };
  }
  // Large + very-large repos: SAME ~24K inline ceiling (a bigger response just
  // externalizes — see vscode). More files indexed → more CALLS via
  // getExploreBudget, not a bigger single response. Per-file 7000 (≥ smaller
  // tiers) gives the central file a ~180-line orientation window.
  if (fileCount < 15000) {
    return {
      maxOutputChars: 24000,
      defaultMaxFiles: 8,
      maxCharsPerFile: 7000,
      gapThreshold: 15,
      maxSymbolsInFileHeader: 15,
      maxEdgesPerRelationshipKind: 15,
      includeRelationships: true,
      includeAdditionalFiles: true,
      includeCompletenessSignal: true,
      includeBudgetNote: true,
      excludeLowValueFiles: false,
    };
  }
  return {
    maxOutputChars: 24000,
    defaultMaxFiles: 8,
    maxCharsPerFile: 7000,
    gapThreshold: 15,
    maxSymbolsInFileHeader: 15,
    maxEdgesPerRelationshipKind: 15,
    includeRelationships: true,
    includeAdditionalFiles: true,
    includeCompletenessSignal: true,
    includeBudgetNote: true,
    excludeLowValueFiles: false,
  };
}
