/**
 * Health rubric v1 — frozen formula (see docs/contracts/health-rubric-v1.md).
 *
 * Deduction-based: every project starts at 100 and six dimensions deduct up
 * to a fixed cap. The remaining score maps to A/B/C/D/F on thresholds that
 * match codeflow exactly (A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F).
 *
 * Hard rules:
 *  - Pure functions. No DB, no LLM, no fs — inputs are plain numbers.
 *  - Deterministic. Same inputs → same outputs, byte-for-byte.
 *  - Single source of truth. The CLI and any future MCP tool must call
 *    into this module; do NOT re-implement the formula at call sites.
 */

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Raw inputs for the six dimensions. All counts are derived from the
 * `nodes` / `edges` / `files` tables via SQL — see `snapshot.ts` for the
 * queries.
 */
export interface HealthInputs {
  /** Total function/method nodes (kind IN ('function','method')). */
  totalFunctions: number;
  /** Function/method nodes with zero incoming AND outgoing `calls` edges. */
  deadFunctions: number;
  /** Number of Tarjan SCCs of size > 1 in the file-level `imports` graph. */
  circularIssues: number;
  /** Files with `node_count >= 100`. */
  godFileIssues: number;
  /** count(non-`contains` edges) / count(files). 0 when no files. */
  avgCoupling: number;
  /** Function/method nodes whose (end_line - start_line) >= 100. */
  longFunctions: number;
  /** Total nodes (all kinds). */
  totalNodes: number;
  /** Nodes with zero non-`contains` edges in either direction. */
  orphanNodes: number;
}

/** Per-dimension breakdown, surfaced in `--json` and human output. */
export interface HealthDimension {
  /** Short id used in JSON, e.g. "dead_code". */
  id: string;
  /** Human label, e.g. "Dead code %". */
  label: string;
  /** The raw measured value (percentage, count, or ratio — dimension-specific). */
  raw: number;
  /** Unit of `raw`, for display. */
  unit: 'percent' | 'count' | 'ratio';
  /** Points deducted by this dimension (0 .. cap). */
  deduction: number;
  /** Maximum points this dimension can deduct. */
  cap: number;
  /** One-line actionable suggestion when deduction > 0. */
  suggestion: string;
}

export interface HealthReport {
  score: number;
  grade: HealthGrade;
  dimensions: HealthDimension[];
}

/** Deduction caps — sum = 90; the remaining 10 points are the base. */
export const HEALTH_CAPS = {
  deadCode: 20,
  circular: 20,
  godFile: 15,
  coupling: 15,
  longFunction: 10,
  orphan: 10,
} as const;

/** Map a 0..100 score to a letter grade. Thresholds match codeflow. */
export function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Compute the health report from raw graph measurements.
 *
 * The formula is frozen — any change requires a new rubric version
 * (docs/contracts/health-rubric-v2.md) and a migration note.
 */
export function computeHealth(inputs: HealthInputs): HealthReport {
  const {
    totalFunctions,
    deadFunctions,
    circularIssues,
    godFileIssues,
    avgCoupling,
    longFunctions,
    totalNodes,
    orphanNodes,
  } = inputs;

  // D1 — dead code percentage. Every percent deducts 1 point up to cap 20.
  const deadPct = totalFunctions > 0 ? (deadFunctions / totalFunctions) * 100 : 0;
  const deadDeduction = Math.min(HEALTH_CAPS.deadCode, deadPct);

  // D2 — circular import SCCs. 5 points per SCC of size > 1, cap 20.
  const circularDeduction = Math.min(HEALTH_CAPS.circular, circularIssues * 5);

  // D3 — god files. 3 points per file with node_count >= 100, cap 15.
  const godDeduction = Math.min(HEALTH_CAPS.godFile, godFileIssues * 3);

  // D4 — coupling above threshold. 2 points per unit above avgCoupling=3, cap 15.
  const excessCoupling = Math.max(0, avgCoupling - 3);
  const couplingDeduction = Math.min(HEALTH_CAPS.coupling, excessCoupling * 2);

  // D5 — long function density. Every percent deducts 1 point, cap 10.
  const longFnPct = totalFunctions > 0 ? (longFunctions / totalFunctions) * 100 : 0;
  const longFnDeduction = Math.min(HEALTH_CAPS.longFunction, longFnPct);

  // D6 — orphan node ratio. Every percent deducts 1 point, cap 10.
  const orphanPct = totalNodes > 0 ? (orphanNodes / totalNodes) * 100 : 0;
  const orphanDeduction = Math.min(HEALTH_CAPS.orphan, orphanPct);

  const rawScore =
    100 -
    deadDeduction -
    circularDeduction -
    godDeduction -
    couplingDeduction -
    longFnDeduction -
    orphanDeduction;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const grade = gradeFromScore(score);

  const dimensions: HealthDimension[] = [
    {
      id: 'dead_code',
      label: 'Dead code %',
      raw: round1(deadPct),
      unit: 'percent',
      deduction: round1(deadDeduction),
      cap: HEALTH_CAPS.deadCode,
      suggestion:
        deadDeduction > 0
          ? `Remove or wire up ${deadFunctions} function(s) with zero incoming/outgoing calls.`
          : '',
    },
    {
      id: 'circular_imports',
      label: 'Circular import SCCs',
      raw: circularIssues,
      unit: 'count',
      deduction: round1(circularDeduction),
      cap: HEALTH_CAPS.circular,
      suggestion:
        circularDeduction > 0
          ? `Break ${circularIssues} import cycle(s); extract a shared module or invert a dependency.`
          : '',
    },
    {
      id: 'god_files',
      label: 'God files (node_count ≥ 100)',
      raw: godFileIssues,
      unit: 'count',
      deduction: round1(godDeduction),
      cap: HEALTH_CAPS.godFile,
      suggestion:
        godDeduction > 0
          ? `Split ${godFileIssues} file(s) owning ≥100 symbols into focused modules.`
          : '',
    },
    {
      id: 'coupling',
      label: 'Avg coupling (non-contains edges / file)',
      raw: round1(avgCoupling),
      unit: 'ratio',
      deduction: round1(couplingDeduction),
      cap: HEALTH_CAPS.coupling,
      suggestion:
        couplingDeduction > 0
          ? `Reduce average file coupling from ${round1(avgCoupling)} toward ≤3; collapse chatty imports.`
          : '',
    },
    {
      id: 'long_functions',
      label: 'Long function % (≥100 lines)',
      raw: round1(longFnPct),
      unit: 'percent',
      deduction: round1(longFnDeduction),
      cap: HEALTH_CAPS.longFunction,
      suggestion:
        longFnDeduction > 0
          ? `Refactor ${longFunctions} function(s) spanning ≥100 lines into smaller units.`
          : '',
    },
    {
      id: 'orphan_nodes',
      label: 'Orphan node %',
      raw: round1(orphanPct),
      unit: 'percent',
      deduction: round1(orphanDeduction),
      cap: HEALTH_CAPS.orphan,
      suggestion:
        orphanDeduction > 0
          ? `${orphanNodes} node(s) have no non-contains edges; the graph is sparse — agents will fall back to grep.`
          : '',
    },
  ];

  return { score, grade, dimensions };
}
