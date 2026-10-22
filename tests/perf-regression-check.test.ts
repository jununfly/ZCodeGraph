/**
 * perf-regression-check red-line evaluation — unit layer (roadmap 1-2-8-2)
 *
 * The heavy end-to-end path (clone + 3x reindex + explore) is exercised by
 * the CI step that runs scripts/measure/perf-regression-check.mjs against
 * the committed baseline artifact. Here we pin the *verdict logic* in
 * isolation:
 *   - index regression > 15% fails; exactly 15% passes
 *   - explore regression > 20% fails; exactly 20% passes
 *   - improvements (negative regression) always pass
 *   - one failing metric fails the whole verdict
 */

import { describe, expect, it } from 'vitest';

// evaluateRegression is exported from the mjs script; vitest can import ESM.
// @ts-expect-error no type declarations for the mjs measurement script
import { evaluateRegression } from '../scripts/measure/perf-regression-check.mjs';

function value(indexMedianMs: number, exploreMedianMs: number) {
  return {
    repetitions: 3,
    indexMedianMs,
    indexRunsMs: [indexMedianMs],
    exploreMedianMs,
    exploreQueries: [],
  };
}

describe('perf-regression-check red-line verdicts', () => {
  const baselineValue = value(1000, 500);

  it('passes when both metrics are under the red lines', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(1100, 580) });
    expect(v.pass).toBe(true);
    expect(v.checks.find((c: any) => c.metric === 'index').pass).toBe(true);
    expect(v.checks.find((c: any) => c.metric === 'explore').pass).toBe(true);
  });

  it('passes at exactly the index 15% line', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(1150, 500) });
    expect(v.checks.find((c: any) => c.metric === 'index').pass).toBe(true);
    expect(v.pass).toBe(true);
  });

  it('fails just above the index 15% line', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(1151, 500) });
    expect(v.checks.find((c: any) => c.metric === 'index').pass).toBe(false);
    expect(v.pass).toBe(false);
  });

  it('passes at exactly the explore 20% line', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(1000, 600) });
    expect(v.checks.find((c: any) => c.metric === 'explore').pass).toBe(true);
    expect(v.pass).toBe(true);
  });

  it('fails just above the explore 20% line', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(1000, 601) });
    expect(v.checks.find((c: any) => c.metric === 'explore').pass).toBe(false);
    expect(v.pass).toBe(false);
  });

  it('improvements never fail', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(500, 250) });
    expect(v.pass).toBe(true);
  });

  it('a single failing metric fails the whole verdict', () => {
    const v = evaluateRegression({ baselineValue, currentValue: value(1200, 400) });
    expect(v.pass).toBe(false);
  });
});
