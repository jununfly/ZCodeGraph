import { createHash } from 'node:crypto';

/**
 * Side-effect-free building blocks for the ADR-0015 ZRA-Paired v1 arms.
 * Nothing here changes MCP ranking or default Explore behavior: a run harness
 * must wire these in explicitly. Keeping them pure makes the invariants
 * falsifiable without a live Agent trial.
 */

export type RetrievalArm = 'A' | 'C' | 'S';

/** Deterministic PRNG (mulberry32): identical seeds produce identical streams. */
export function makeSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * S arm ordering permutation: same candidates, content, count and payload
 * schema as C; only the order is destroyed by a fixed seed. Fisher-Yates keeps
 * the permutation uniform, and the input array is never mutated.
 */
export function permuteWithFixedSeed<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = makeSeededRandom(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = result[i]!;
    result[i] = result[j]!;
    result[j] = held;
  }
  return result;
}

/** Fields A/C/S must share verbatim. Arm identity and its seed are excluded. */
export interface SharedRunConfig {
  taskId: string;
  modelVersion: string;
  prompt: string;
  toolSchema: string;
  indexSnapshot: string;
  mcpToolSurface: string;
  responseSchema: string;
}

export interface ArmRun {
  arm: RetrievalArm;
  config: SharedRunConfig;
}

function canonicalConfig(config: SharedRunConfig): string {
  return JSON.stringify({
    taskId: config.taskId,
    modelVersion: config.modelVersion,
    prompt: config.prompt,
    toolSchema: config.toolSchema,
    indexSnapshot: config.indexSnapshot,
    mcpToolSurface: config.mcpToolSurface,
    responseSchema: config.responseSchema,
  });
}

export function computeConfigFingerprint(config: SharedRunConfig): string {
  return createHash('sha256').update(canonicalConfig(config), 'utf8').digest('hex');
}

/** Reject the whole run when any arm disagrees on the shared configuration. */
export function assertConfigParity(runs: readonly ArmRun[]): string {
  const first = runs[0];
  if (!first) throw new Error('config parity requires at least one arm run');
  const baseline = computeConfigFingerprint(first.config);
  for (const run of runs) {
    const fingerprint = computeConfigFingerprint(run.config);
    if (fingerprint !== baseline) {
      throw new Error(
        `config fingerprint mismatch: arm ${run.arm} (${fingerprint.slice(0, 12)}) ` +
        `differs from arm ${first.arm} (${baseline.slice(0, 12)}); refusing this run`,
      );
    }
  }
  return baseline;
}

/** Guard the S-arm invariant: a permutation must not add, drop or alter an item. */
export function assertSamePayload<T>(base: readonly T[], permuted: readonly T[]): void {
  if (base.length !== permuted.length) {
    throw new Error(`payload count mismatch: ${base.length} vs ${permuted.length}`);
  }
  const key = (value: T): string => JSON.stringify(value) ?? 'undefined';
  const left = base.map(key).sort();
  const right = permuted.map(key).sort();
  const differing = left.findIndex((value, index) => value !== right[index]);
  if (differing !== -1) {
    throw new Error(`payload content mismatch at sorted position ${differing}`);
  }
}
