import { permuteWithFixedSeed, type RetrievalArm } from './zra-paired-core';

/**
 * Task-internal balanced arm order (ADR-0015 D2). Confirmation prefers k=6
 * covering all six A/C/S permutations; under cost pressure k=4 must use a
 * PRE-DECLARED balanced subset and disclose the uncovered orders. The
 * two-arm ABBA counterbalancing of earlier drafts does not apply to three
 * arms and is rejected here.
 *
 * Pure by construction: this module only builds and validates schedules.
 * It never executes a trial or changes MCP ranking.
 */

export const CONFIRMATORY_K = 6;
export const PILOT_K = 4;

/** All 3! orders; each contains A, C and S exactly once. */
export const FULL_ARM_ORDERS = [
  ['A', 'C', 'S'], ['A', 'S', 'C'], ['C', 'A', 'S'],
  ['C', 'S', 'A'], ['S', 'A', 'C'], ['S', 'C', 'A'],
] as const;

export type ArmOrder = (typeof FULL_ARM_ORDERS)[number];

export type PositionCounts = Readonly<Record<RetrievalArm, readonly [number, number, number]>>;

export interface ArmOrderSchedule {
  readonly k: 4 | 6;
  readonly orders: readonly ArmOrder[];
  /** Orders not covered by a k=4 subset; must be disclosed in the report. */
  readonly uncovered: readonly ArmOrder[];
  readonly positionCounts: PositionCounts;
  readonly balanced: boolean;
}

export interface ArmOrderScheduleOptions {
  readonly k: 4 | 6;
  readonly subset?: readonly ArmOrder[];
}

export interface TaskArmOrder {
  readonly taskId: string;
  readonly orders: readonly ArmOrder[];
}

const ARMS: readonly RetrievalArm[] = ['A', 'C', 'S'];

function orderKey(order: readonly RetrievalArm[]): string {
  return order.join('');
}

function isValidArmOrder(order: readonly RetrievalArm[]): boolean {
  if (order.length !== 3) return false;
  const seen = new Set<RetrievalArm>();
  for (const arm of order) {
    if (!ARMS.includes(arm) || seen.has(arm)) return false;
    seen.add(arm);
  }
  return FULL_ARM_ORDERS.some((candidate) => orderKey(candidate) === orderKey(order));
}

function countPositions(orders: readonly ArmOrder[]): PositionCounts {
  const counts: Record<RetrievalArm, [number, number, number]> = {
    A: [0, 0, 0], C: [0, 0, 0], S: [0, 0, 0],
  };
  for (const order of orders) {
    order.forEach((arm, position) => {
      const slot = counts[arm];
      slot[position] = (slot[position] ?? 0) + 1;
    });
  }
  return Object.freeze({
    A: Object.freeze([...counts.A] as [number, number, number]),
    C: Object.freeze([...counts.C] as [number, number, number]),
    S: Object.freeze([...counts.S] as [number, number, number]),
  });
}

/** Each position's per-arm counts may differ by at most one. */
export function isBalancedOrderSet(orders: readonly ArmOrder[]): boolean {
  const counts = countPositions(orders);
  for (let position = 0; position < 3; position += 1) {
    const values = ARMS.map((arm) => counts[arm][position] ?? 0);
    if (Math.max(...values) - Math.min(...values) > 1) return false;
  }
  return true;
}

export function armOrderSchedule(options: ArmOrderScheduleOptions): ArmOrderSchedule {
  const { k, subset } = options;
  if (k !== CONFIRMATORY_K && k !== PILOT_K) {
    throw new Error(`k must be ${PILOT_K} (pilot) or ${CONFIRMATORY_K} (confirmation)`);
  }

  if (k === CONFIRMATORY_K) {
    if (subset && (subset.length !== FULL_ARM_ORDERS.length
      || new Set(subset.map(orderKey)).size !== FULL_ARM_ORDERS.length)) {
      throw new Error('k=6 must cover all six arm orders');
    }
    const orders = [...FULL_ARM_ORDERS];
    return Object.freeze({
      k,
      orders: Object.freeze(orders),
      uncovered: Object.freeze([] as ArmOrder[]),
      positionCounts: countPositions(orders),
      balanced: true,
    });
  }

  if (!subset) throw new Error('k=4 requires a pre-declared balanced subset of arm orders');
  if (subset.length !== PILOT_K) throw new Error(`a k=4 subset must contain exactly ${PILOT_K} orders`);
  const keys = new Set(subset.map(orderKey));
  if (keys.size !== PILOT_K) throw new Error('duplicate arm orders in the pre-declared subset');
  for (const order of subset) {
    if (!isValidArmOrder(order)) throw new Error(`invalid arm order: ${orderKey(order)}`);
  }
  if (!isBalancedOrderSet(subset)) {
    throw new Error('pre-declared k=4 subset is not position-balanced');
  }

  const uncovered = FULL_ARM_ORDERS.filter((order) => !keys.has(orderKey(order)));
  return Object.freeze({
    k,
    orders: Object.freeze([...subset]),
    uncovered: Object.freeze(uncovered),
    positionCounts: countPositions(subset),
    balanced: true,
  });
}

export function flattenArmSequence(orders: readonly ArmOrder[]): RetrievalArm[] {
  return orders.reduce<RetrievalArm[]>((sequence, order) => {
    sequence.push(...order);
    return sequence;
  }, []);
}

/** Two-arm ABBA counterbalancing, mechanically x,y,y,x with x != y. */
export function hasAbbaPattern(sequence: readonly RetrievalArm[]): boolean {
  for (let i = 0; i + 3 < sequence.length; i += 1) {
    const a = sequence[i]!;
    const b = sequence[i + 1]!;
    const c = sequence[i + 2]!;
    const d = sequence[i + 3]!;
    if (a === d && b === c && a !== b) return true;
  }
  return false;
}

export function assertNoAbba(orders: readonly ArmOrder[]): void {
  if (hasAbbaPattern(flattenArmSequence(orders))) {
    throw new Error('ABBA-style two-arm counterbalancing is forbidden for three-arm designs');
  }
}

/**
 * Independently permute the schedule inside every task with a fixed seed.
 * The set of orders (hence task-internal balance) is preserved. Candidates
 * containing an ABBA pattern are skipped; exhausting attempts fails closed.
 */
export function assignOrdersToTasks(
  taskIds: readonly string[],
  orders: readonly ArmOrder[],
  seed: number,
): readonly TaskArmOrder[] {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  if (taskIds.length === 0) throw new Error('at least one task is required');
  if (orders.length === 0) throw new Error('at least one arm order is required');
  const seen = new Set<string>();
  for (const taskId of taskIds) {
    if (typeof taskId !== 'string' || taskId.length === 0 || seen.has(taskId)) {
      throw new Error('taskId must be non-empty and unique');
    }
    seen.add(taskId);
  }

  const attempts = 720; // 6! candidate permutations
  const assigned: TaskArmOrder[] = [];
  taskIds.forEach((taskId, taskIndex) => {
    let chosen: readonly ArmOrder[] | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidateSeed = (seed + taskIndex * 7919 + attempt * 104729) >>> 0;
      const candidate = permuteWithFixedSeed(orders, candidateSeed);
      if (!hasAbbaPattern(flattenArmSequence(candidate))) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) throw new Error(`no ABBA-free order permutation found for task ${taskId}`);
    assigned.push(Object.freeze({ taskId, orders: Object.freeze([...chosen]) }));
  });
  return Object.freeze(assigned);
}
