/**
 * Health rubric v1 — pure-function unit tests.
 *
 * Locks the formula in docs/contracts/health-rubric-v1.md. Any change to
 * these expectations requires a new rubric version (v2) and a migration note.
 */

import { describe, expect, it } from 'vitest';
import {
  computeHealth,
  gradeFromScore,
  HEALTH_CAPS,
  HealthInputs,
} from '../src/health/rubric';

function zeroInputs(): HealthInputs {
  return {
    totalFunctions: 0,
    deadFunctions: 0,
    circularIssues: 0,
    godFileIssues: 0,
    avgCoupling: 0,
    longFunctions: 0,
    totalNodes: 0,
    orphanNodes: 0,
  };
}

describe('gradeFromScore', () => {
  it('maps thresholds to A/B/C/D/F exactly like codeflow', () => {
    expect(gradeFromScore(100)).toBe('A');
    expect(gradeFromScore(90)).toBe('A');
    expect(gradeFromScore(89)).toBe('B');
    expect(gradeFromScore(80)).toBe('B');
    expect(gradeFromScore(79)).toBe('C');
    expect(gradeFromScore(70)).toBe('C');
    expect(gradeFromScore(69)).toBe('D');
    expect(gradeFromScore(60)).toBe('D');
    expect(gradeFromScore(59)).toBe('F');
    expect(gradeFromScore(0)).toBe('F');
  });
});

describe('computeHealth — empty project', () => {
  it('empty inputs produce a perfect A with zero deductions', () => {
    const report = computeHealth(zeroInputs());
    expect(report.score).toBe(100);
    expect(report.grade).toBe('A');
    for (const d of report.dimensions) {
      expect(d.deduction).toBe(0);
      expect(d.suggestion).toBe('');
    }
  });

  it('dimension caps sum to 90 (10 points are the base)', () => {
    const sum =
      HEALTH_CAPS.deadCode +
      HEALTH_CAPS.circular +
      HEALTH_CAPS.godFile +
      HEALTH_CAPS.coupling +
      HEALTH_CAPS.longFunction +
      HEALTH_CAPS.orphan;
    expect(sum).toBe(90);
  });
});

describe('computeHealth — D1 dead code', () => {
  it('deducts 1 point per percent of dead functions, capped at 20', () => {
    const inputs = { ...zeroInputs(), totalFunctions: 100, deadFunctions: 5 };
    const r = computeHealth(inputs);
    expect(r.score).toBe(95);
    const d = r.dimensions.find((x) => x.id === 'dead_code')!;
    expect(d.raw).toBe(5);
    expect(d.deduction).toBe(5);
    expect(d.cap).toBe(20);
  });

  it('caps the deduction at 20 when dead code exceeds 20%', () => {
    const inputs = { ...zeroInputs(), totalFunctions: 100, deadFunctions: 50 };
    const r = computeHealth(inputs);
    const d = r.dimensions.find((x) => x.id === 'dead_code')!;
    expect(d.raw).toBe(50);
    expect(d.deduction).toBe(20);
    expect(r.score).toBe(80);
    expect(r.grade).toBe('B');
  });

  it('treats totalFunctions=0 as 0% dead (no NaN)', () => {
    const inputs = { ...zeroInputs(), totalFunctions: 0, deadFunctions: 0 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'dead_code')!.raw).toBe(0);
  });
});

describe('computeHealth — D2 circular imports', () => {
  it('deducts 5 points per SCC, capped at 20', () => {
    const inputs = { ...zeroInputs(), circularIssues: 2 };
    const r = computeHealth(inputs);
    expect(r.score).toBe(90);
    expect(r.grade).toBe('A');
  });

  it('caps at 20 (4 cycles)', () => {
    const inputs = { ...zeroInputs(), circularIssues: 10 };
    const r = computeHealth(inputs);
    const d = r.dimensions.find((x) => x.id === 'circular_imports')!;
    expect(d.deduction).toBe(20);
    expect(r.score).toBe(80);
  });
});

describe('computeHealth — D3 god files', () => {
  it('deducts 3 points per god file, capped at 15', () => {
    const inputs = { ...zeroInputs(), godFileIssues: 3 };
    const r = computeHealth(inputs);
    expect(r.score).toBe(91);
    expect(r.grade).toBe('A');
  });

  it('caps at 15 (5 files)', () => {
    const inputs = { ...zeroInputs(), godFileIssues: 10 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'god_files')!.deduction).toBe(15);
    expect(r.score).toBe(85);
  });
});

describe('computeHealth — D4 coupling', () => {
  it('deducts 0 when avgCoupling <= 3', () => {
    const inputs = { ...zeroInputs(), avgCoupling: 3 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'coupling')!.deduction).toBe(0);
    expect(r.score).toBe(100);
  });

  it('deducts 2 points per unit above 3, capped at 15', () => {
    const inputs = { ...zeroInputs(), avgCoupling: 5 };
    const r = computeHealth(inputs);
    // excess = 2, deduction = 4
    expect(r.score).toBe(96);
  });

  it('caps at 15 (avgCoupling >= 10.5)', () => {
    const inputs = { ...zeroInputs(), avgCoupling: 20 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'coupling')!.deduction).toBe(15);
    expect(r.score).toBe(85);
  });
});

describe('computeHealth — D5 long function density', () => {
  it('deducts 1 point per percent of long functions, capped at 10', () => {
    const inputs = { ...zeroInputs(), totalFunctions: 100, longFunctions: 7 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'long_functions')!.raw).toBe(7);
    expect(r.dimensions.find((x) => x.id === 'long_functions')!.deduction).toBe(7);
    expect(r.score).toBe(93);
  });

  it('caps at 10', () => {
    const inputs = { ...zeroInputs(), totalFunctions: 100, longFunctions: 30 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'long_functions')!.deduction).toBe(10);
    expect(r.score).toBe(90);
  });
});

describe('computeHealth — D6 orphan node ratio', () => {
  it('deducts 1 point per percent of orphan nodes, capped at 10', () => {
    const inputs = { ...zeroInputs(), totalNodes: 200, orphanNodes: 10 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'orphan_nodes')!.raw).toBe(5);
    expect(r.dimensions.find((x) => x.id === 'orphan_nodes')!.deduction).toBe(5);
    expect(r.score).toBe(95);
  });

  it('caps at 10', () => {
    const inputs = { ...zeroInputs(), totalNodes: 100, orphanNodes: 80 };
    const r = computeHealth(inputs);
    expect(r.dimensions.find((x) => x.id === 'orphan_nodes')!.deduction).toBe(10);
    expect(r.score).toBe(90);
  });
});

describe('computeHealth — combined dimensions', () => {
  it('all six deductions add up correctly', () => {
    const inputs: HealthInputs = {
      totalFunctions: 100,
      deadFunctions: 10, // -10
      circularIssues: 2, // -10
      godFileIssues: 2, // -6
      avgCoupling: 5, // -4
      longFunctions: 5, // -5
      totalNodes: 200,
      orphanNodes: 20, // -10 → capped
    };
    const r = computeHealth(inputs);
    // 100 - 10 - 10 - 6 - 4 - 5 - 10 = 55
    expect(r.score).toBe(55);
    expect(r.grade).toBe('F');
  });

  it('score is clamped to >= 0 when deductions exceed 100', () => {
    const inputs: HealthInputs = {
      totalFunctions: 100,
      deadFunctions: 100,
      circularIssues: 100,
      godFileIssues: 100,
      avgCoupling: 100,
      longFunctions: 100,
      totalNodes: 100,
      orphanNodes: 100,
    };
    const r = computeHealth(inputs);
    expect(r.score).toBe(10); // 100 - (20+20+15+15+10+10) = 10
    expect(r.grade).toBe('F');
  });
});

describe('computeHealth — determinism & shape', () => {
  it('same inputs produce byte-identical reports', () => {
    const inputs: HealthInputs = {
      totalFunctions: 50,
      deadFunctions: 5,
      circularIssues: 1,
      godFileIssues: 1,
      avgCoupling: 4.5,
      longFunctions: 2,
      totalNodes: 100,
      orphanNodes: 5,
    };
    const a = computeHealth(inputs);
    const b = computeHealth(inputs);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('every dimension carries a non-empty suggestion when deduction > 0', () => {
    const inputs: HealthInputs = {
      totalFunctions: 100,
      deadFunctions: 10,
      circularIssues: 1,
      godFileIssues: 1,
      avgCoupling: 5,
      longFunctions: 5,
      totalNodes: 100,
      orphanNodes: 5,
    };
    const r = computeHealth(inputs);
    for (const d of r.dimensions) {
      if (d.deduction > 0) {
        expect(d.suggestion.length, `suggestion for ${d.id}`).toBeGreaterThan(0);
      }
    }
  });
});
