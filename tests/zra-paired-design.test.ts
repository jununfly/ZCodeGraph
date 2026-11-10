import { describe, expect, it } from 'vitest';
import {
  CONFIRMATORY_K,
  FULL_ARM_ORDERS,
  PILOT_K,
  armOrderSchedule,
  assignOrdersToTasks,
  assertNoAbba,
  flattenArmSequence,
  hasAbbaPattern,
  isBalancedOrderSet,
  type ArmOrder,
} from '../src/eval/zra-paired-design';

const [ACS, ASC, CAS, CSA, SAC, SCA] = FULL_ARM_ORDERS;

describe('task-internal balanced arm order', () => {
  it('freezes the six permutations and the k=6 / k=4 design', () => {
    expect(CONFIRMATORY_K).toBe(6);
    expect(PILOT_K).toBe(4);
    expect(FULL_ARM_ORDERS).toHaveLength(6);
    expect(new Set(FULL_ARM_ORDERS.map((order) => order.join(''))).size).toBe(6);
    for (const order of FULL_ARM_ORDERS) {
      expect([...order].sort()).toEqual(['A', 'C', 'S']);
    }
    expect(isBalancedOrderSet(FULL_ARM_ORDERS)).toBe(true);
  });

  it('covers all six orders for confirmation and discloses none as uncovered', () => {
    const schedule = armOrderSchedule({ k: 6 });
    expect(schedule.k).toBe(6);
    expect(schedule.orders).toHaveLength(6);
    expect(schedule.uncovered).toEqual([]);
    expect(schedule.balanced).toBe(true);
    for (const arm of ['A', 'C', 'S'] as const) {
      expect(schedule.positionCounts[arm]).toEqual([2, 2, 2]);
    }
  });

  it('accepts a pre-declared balanced k=4 subset and discloses the two uncovered orders', () => {
    const subset: readonly ArmOrder[] = [ASC!, CAS!, SAC!, SCA!];
    const schedule = armOrderSchedule({ k: 4, subset });

    expect(schedule.orders).toEqual(subset);
    expect(schedule.uncovered).toEqual([ACS, CSA]);
    expect(schedule.balanced).toBe(true);
    for (let position = 0; position < 3; position += 1) {
      const values = (['A', 'C', 'S'] as const)
        .map((arm) => schedule.positionCounts[arm][position] ?? 0);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });

  it('rejects an unbalanced subset, a missing declaration and invalid k', () => {
    const unbalanced: readonly ArmOrder[] = [ACS!, ASC!, CAS!, CSA!];
    expect(isBalancedOrderSet(unbalanced)).toBe(false);
    expect(() => armOrderSchedule({ k: 4, subset: unbalanced }))
      .toThrow(/not position-balanced/);
    expect(() => armOrderSchedule({ k: 4 })).toThrow(/pre-declared balanced subset/);
    expect(() => armOrderSchedule({ k: 5 as 4 })).toThrow(/k must be 4/);
    expect(() => armOrderSchedule({ k: 6, subset: [ACS!] })).toThrow(/must cover all six/);
    expect(() => armOrderSchedule({ k: 4, subset: [ACS!, ACS!, CAS!, CSA!] }))
      .toThrow(/duplicate arm orders/);
    expect(() => armOrderSchedule({
      k: 4,
      subset: [['A', 'A', 'C'] as unknown as ArmOrder, ASC!, CAS!, CSA!],
    })).toThrow(/invalid arm order/);
  });

  it('detects and rejects ABBA-style two-arm counterbalancing', () => {
    expect(hasAbbaPattern(['A', 'C', 'C', 'A'])).toBe(true);
    expect(hasAbbaPattern(['A', 'C', 'S', 'A'])).toBe(false);
    expect(hasAbbaPattern(['A', 'A', 'A', 'A'])).toBe(false);
    expect(() => assertNoAbba([ACS!, SCA!])).toThrow(/forbidden for three-arm/);
    expect(flattenArmSequence(FULL_ARM_ORDERS)).toHaveLength(18);
  });

  it('assigns reproducible ABBA-free permutations while preserving task-internal balance', () => {
    const taskIds = ['T-1', 'T-2', 'T-3'];
    const first = assignOrdersToTasks(taskIds, FULL_ARM_ORDERS, 42);
    const second = assignOrdersToTasks(taskIds, FULL_ARM_ORDERS, 42);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    for (const task of first) {
      expect(task.orders).toHaveLength(6);
      expect(new Set(task.orders.map((order) => order.join(''))).size).toBe(6);
      expect(hasAbbaPattern(flattenArmSequence(task.orders))).toBe(false);
      expect(() => assertNoAbba(task.orders)).not.toThrow();
    }
    expect(() => assignOrdersToTasks([], FULL_ARM_ORDERS, 1)).toThrow(/at least one task/);
    expect(() => assignOrdersToTasks(['T-1', 'T-1'], FULL_ARM_ORDERS, 1)).toThrow(/unique/);
  });
});
