import * as fs from 'node:fs';
import * as path from 'node:path';

export type FlagCategory = 'product' | 'experiment' | 'runtime' | 'internal' | 'developer' | 'test' | 'installer';
export type FlagKind = 'boolean' | 'integer' | 'text' | 'list' | 'path';
export type InvalidFlagPolicy = 'fallback' | 'fail-fast';

export interface FlagDefinition {
  name: string;
  category: FlagCategory;
  kind: FlagKind;
  defaultValue: boolean | number | string | null;
  invalidValue: InvalidFlagPolicy;
  min?: number;
  max?: number;
  allowedValues?: readonly string[];
  zeroDisables?: boolean;
  pathType?: 'file' | 'directory';
  platformDefaults?: { windows: string; posix: string };
  readTiming: 'startup' | 'on-use' | 'test-only' | 'install';
  scope: 'process' | 'project' | 'session' | 'developer' | 'test' | 'install';
  status: 'stable' | 'experimental' | 'internal' | 'developer' | 'test' | 'installer';
  evidence: string;
  retirement: string;
  lifecycle?: ExperimentLifecycle;
}

export interface ExperimentLifecycle {
  owner: string;
  metric: string;
  evidence: string;
  exit: string;
}

export interface FlagValidationContext {
  projectRoot?: string;
  rustCoreCandidateDirs?: string[];
  validateMcpToolAllowlist?: (env: NodeJS.ProcessEnv) => void;
}

export interface ReadFlagOptions {
  env?: NodeJS.ProcessEnv;
  onWarning?: (message: string) => void;
}

export interface EffectiveFlag {
  name: string;
  category: FlagCategory;
  kind: FlagKind;
  value: boolean | number | string | string[] | null;
  source: 'default' | 'environment';
  valid: boolean;
  error?: string;
}

const flag = (
  name: string,
  category: FlagCategory,
  kind: FlagKind,
  defaultValue: FlagDefinition['defaultValue'] = null,
  invalidValue: InvalidFlagPolicy = 'fallback',
  range: { min?: number; max?: number; zeroDisables?: boolean } = {},
  allowedValues?: readonly string[],
  lifecycle?: FlagDefinition['lifecycle'],
  extra: Pick<FlagDefinition, 'pathType' | 'platformDefaults'> = {},
): FlagDefinition => ({
  name, category, kind, defaultValue, invalidValue, ...range,
  ...(allowedValues ? { allowedValues } : {}),
  ...(lifecycle ? { lifecycle } : {}),
  ...extra,
  readTiming: category === 'internal' ? 'startup'
    : category === 'test' ? 'test-only'
      : category === 'installer' ? 'install' : 'on-use',
  scope: category === 'product' || category === 'experiment' ? 'project'
    : category === 'runtime' || category === 'internal' ? 'session'
      : category === 'installer' ? 'install'
        : category === 'test' ? 'test' : 'developer',
  status: category === 'experiment' ? 'experimental'
    : category === 'internal' ? 'internal'
      : category === 'developer' ? 'developer'
        : category === 'test' ? 'test'
          : category === 'installer' ? 'installer' : 'stable',
  evidence: lifecycle?.evidence ?? 'Module consumer and tests/flag-governance.test.ts',
  retirement: lifecycle?.exit ?? 'Retain while its module consumer remains supported',
});

/** The single metadata source for code and installer environment variables. */
export const FLAG_REGISTRY: readonly FlagDefinition[] = [
  flag('ZCG_ENABLE_EMBEDDING', 'product', 'boolean', false),
  flag('ZCG_ENABLE_DATASOURCE', 'product', 'boolean', false),
  flag('ZCG_ADAPTIVE_EXPLORE', 'product', 'boolean', true),
  flag('ZCG_EXPLORE_TIGHT_SMALL_PROJECT', 'experiment', 'boolean', false, 'fallback', {}, undefined, {
    owner: 'Explore sizing maintainers',
    metric: 'Small-project token reduction without blast-radius recall regression',
    evidence: 'tests/explore-tight-small-project.test.ts; future representative A/B report',
    exit: 'Adopt only after measured recall and token gates; otherwise remove this opt-in experiment',
  }),
  flag('ZCG_EXPLORE_LINENUMS', 'product', 'boolean', true),
  flag('ZCG_EXPLORE_ELIDED_MARKERS', 'product', 'boolean', true),
  flag('ZCG_MCP_TOOLS', 'runtime', 'list', null, 'fail-fast'),
  flag('ZCG_RUST_NAME_MATCHER', 'experiment', 'boolean', false, 'fallback', {}, undefined, {
    owner: 'Rust resolution maintainers',
    metric: 'Real-corpus Rust/TS graph parity, fallback taxonomy, wall time and RSS',
    evidence: 'tests/rust-name-matcher.test.ts; ADR-0002 representative-corpus gate',
    exit: 'Default cutover requires representative-corpus evidence; otherwise retain opt-in or remove',
  }),
  flag('ZCG_RUST_NAME_MATCHER_STRICT', 'experiment', 'boolean', false, 'fallback', {}, undefined, {
    owner: 'Rust resolution maintainers',
    metric: 'Rust/TS mismatch diagnostics during opt-in matcher verification',
    evidence: 'tests/rust-name-matcher.test.ts and strict-requires-rust-name-matcher diagnostics',
    exit: 'Retire with the Rust name matcher; never enables matching independently',
  }),
  flag('ZCG_NAME_MATCHER_REPLAY_AB', 'developer', 'boolean', false),
  flag('ZCG_CANDIDATE_PROTOCOL', 'runtime', 'boolean', true),
  flag('ZCG_CANDIDATE_PROTOCOL_EQUIVALENCE', 'experiment', 'boolean', false, 'fallback', {}, undefined, {
    owner: 'Resolution maintainers',
    metric: 'Protocol and TypeScript baseline equivalence; not Rust matcher parity',
    evidence: 'Candidate protocol diagnostics and replay tests',
    exit: 'Retire with the Candidate Protocol migration after its default-path ownership decision',
  }),
  flag('ZCG_RUST_CANDIDATE_PRODUCER', 'experiment', 'boolean', false, 'fallback', {}, undefined, {
    owner: 'Rust resolution maintainers',
    metric: 'Producer lookup parity, hydration coverage and performance; routing stays separate',
    evidence: 'tests/rust-index-engine-cli-candidate-producer-diagnostics.test.ts and routing tests',
    exit: 'Shadow/routing cutover requires ADR-0002 representative-corpus parity and performance gates',
  }),
  flag('ZCG_RUST_CORE_BINARY', 'runtime', 'path', null, 'fail-fast', {}, undefined, undefined, { pathType: 'file' }),
  flag('ZCG_ALLOW_UNSAFE_NODE', 'runtime', 'boolean', false, 'fail-fast'),
  flag('ZCG_DEBUG', 'runtime', 'boolean', false),
  flag('ZCG_NO_WATCH', 'runtime', 'boolean', false),
  flag('ZCG_FORCE_WATCH', 'runtime', 'boolean', false),
  flag('ZCG_NO_DAEMON', 'runtime', 'boolean', false),
  flag('ZCG_MCP_DEBUG', 'runtime', 'boolean', false),
  flag('ZCG_MCP_LOG_ATTACH', 'runtime', 'boolean', false),
  flag('ZCG_NO_RELAUNCH', 'runtime', 'boolean', false),
  flag('ZCG_ASCII', 'product', 'boolean', false),
  flag('ZCG_UNICODE', 'product', 'boolean', false),
  flag('ZCG_VEC0_PATH', 'runtime', 'path', null, 'fail-fast', {}, undefined, undefined, { pathType: 'file' }),
  flag('ZCG_WATCH_DEBOUNCE_MS', 'runtime', 'integer', 2000, 'fallback', { min: 100, max: 60000 }),
  flag('ZCG_MAX_DIR_WATCHES', 'runtime', 'integer', 50000, 'fallback', { min: 1 }),
  flag('ZCG_PPID_POLL_MS', 'runtime', 'integer', 5000, 'fallback', { min: 0, zeroDisables: true }),
  flag('ZCG_DAEMON_IDLE_TIMEOUT_MS', 'runtime', 'integer', 300000, 'fallback', { min: 0, zeroDisables: true }),
  flag('ZCG_DAEMON_MAX_IDLE_MS', 'runtime', 'integer', 1800000, 'fallback', { min: 0, zeroDisables: true }),
  flag('ZCG_DAEMON_CLIENT_SWEEP_MS', 'runtime', 'integer', 30000, 'fallback', { min: 0, zeroDisables: true }),
  flag('ZCG_RESOLVER_CACHE_SIZE', 'runtime', 'integer', 5000, 'fallback', { min: 1 }),
  flag('ZCG_DAEMON_INTERNAL', 'internal', 'boolean', false),
  flag('ZCG_WASM_RELAUNCHED', 'internal', 'boolean', false),
  flag('ZCG_HOST_PPID', 'internal', 'integer', null, 'fallback', { min: 2 }),
  flag('ZCG_PROFILING', 'developer', 'text', null, 'fail-fast', {}, ['heap']),
  flag('ZCG_EXPERIMENT_ID', 'developer', 'text', 'manual'),
  flag('ZCG_RUST_CORE_TEST_SLEEP_MS', 'test', 'integer', 0, 'fallback', { min: 0 }),
  flag('ZCG_INSTALL_DIR', 'installer', 'path', null, 'fallback', {}, undefined, undefined, {
    pathType: 'directory',
    platformDefaults: { windows: '%LOCALAPPDATA%\\codegraph', posix: '~/.codegraph' },
  }),
  flag('ZCG_BIN_DIR', 'installer', 'path', null, 'fallback', {}, undefined, undefined, {
    pathType: 'directory',
    platformDefaults: { windows: '<install-dir>\\current\\bin', posix: '~/.local/bin' },
  }),
  flag('ZCG_DOWNLOAD_BASE', 'installer', 'text'),
  flag('ZCG_NO_DOWNLOAD', 'installer', 'boolean', false),
  flag('ZCG_VERSION', 'installer', 'text'),
] as const;

export const CODE_FLAG_REGISTRY = FLAG_REGISTRY.filter(flag => flag.category !== 'installer');

/** Project-level experimental JSON keys have lifecycle metadata but are not env flags. */
export const PROJECT_EXPERIMENT_LIFECYCLES = {
  rustCandidateProducerRouting: {
    owner: 'Rust resolution maintainers',
    metric: 'Representative-corpus candidate and graph parity, fallback taxonomy, wall time and RSS',
    evidence: 'tests/rust-index-engine-cli-candidate-producer-routing.test.ts; ADR-0002 representative-corpus gate',
    exit: 'Default cutover requires representative-corpus parity and performance evidence; otherwise retain opt-in or remove the routing implementation and JSON key',
  },
} as const satisfies Record<string, ExperimentLifecycle>;

export const SCRIPT_ENVIRONMENT_VARIABLES = [
  'ZCG_DEV_BIN', 'ZCG_EXPERIMENT_CHILD_MAX_BUFFER_BYTES', 'ZCG_EXPERIMENT_FAIL_ENGINE',
  'ZCG_EXPERIMENT_FAKE_RUST_ELAPSED_MS', 'ZCG_EXPERIMENT_FAKE_RUST_PEAK_RSS_BYTES',
  'ZCG_EXPERIMENT_FAKE_RUST_PROFILE', 'ZCG_EXPERIMENT_FAKE_RUST_SUCCESS',
  'ZCG_EXPERIMENT_FAKE_TYPESCRIPT_PEAK_RSS_BYTES', 'ZCG_EXPERIMENT_MEASURE_RSS',
  'ZCG_PHASE3_BENCHMARK_SCRIPT', 'ZCG_PHASE3_BUNDLE_DIR', 'ZCG_PHASE3_FAILURE_MATRIX_SCRIPT',
  'ZCG_PHASE3_NPM_ROOT', 'ZCG_PHASE3_PACKAGE_SMOKE_SCRIPT', 'ZCG_PHASE3_PROFILE_SCRIPT',
  'ZCG_PHASE3_SKIP_DIAGNOSTICS', 'ZCG_PHASE3_SKIP_PACKAGE_SMOKE', 'ZCG_PHASE3_SKIP_SMOKE',
  'ZCG_PHASE3_SUFFICIENCY_SCRIPT', 'ZCG_RELEASE_DIR', 'ZCG_RSS_PROC_ROOT',
  'ZCG_RSS_PS_COMMAND', 'ZCG_RSS_TIME_COMMAND', 'ZCG_RUST_CORE_ARTIFACT_DIR',
  'ZCG_FAKE_DEFAULT_MARKER', 'ZCG_TEST_TARGET',
] as const;

const definitions = new Map(FLAG_REGISTRY.map(flag => [flag.name, flag]));

function definition(name: string): FlagDefinition {
  const result = definitions.get(name);
  if (!result) throw new Error(`Unknown ZCodeGraph flag: ${name}`);
  return result;
}

function warning(options: ReadFlagOptions, message: string): void {
  (options.onWarning ?? ((text: string) => process.stderr.write(`[ZCodeGraph] ${text}\n`)))(message);
}

function invalid(def: FlagDefinition, options: ReadFlagOptions, expectation: string): string {
  const message = `${def.name} is invalid; expected ${expectation}.`;
  if (def.invalidValue === 'fail-fast') throw new Error(message);
  warning(options, `${message} Using default.`);
  return message;
}

function raw(def: FlagDefinition, options: ReadFlagOptions): string | undefined {
  return (options.env ?? process.env)[def.name];
}

export function readBooleanFlag(name: string, options: ReadFlagOptions = {}): boolean {
  const def = definition(name);
  if (def.kind !== 'boolean') throw new Error(`${name} is not a boolean flag`);
  const value = raw(def, options);
  if (value === undefined) return def.defaultValue as boolean;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') return true;
  if (normalized === '0' || normalized === 'false') return false;
  invalid(def, options, '1/true or 0/false');
  return def.defaultValue as boolean;
}

export function readIntegerFlag(name: string, options: ReadFlagOptions = {}): number {
  const def = definition(name);
  if (def.kind !== 'integer') throw new Error(`${name} is not an integer flag`);
  const value = raw(def, options);
  if (value === undefined) return def.defaultValue as number;
  const normalized = value.trim();
  if (!/^[0-9]+$/.test(normalized)) {
    invalid(def, options, 'a complete decimal integer');
    return def.defaultValue as number;
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || (def.min !== undefined && parsed < def.min) || (def.max !== undefined && parsed > def.max)) {
    invalid(def, options, `an integer in [${def.min ?? '-infinity'}, ${def.max ?? 'infinity'}]`);
    return def.defaultValue as number;
  }
  return parsed;
}

export function readTextFlag(name: string, options: ReadFlagOptions = {}): string | undefined {
  const def = definition(name);
  if (def.kind !== 'text' && def.kind !== 'path') throw new Error(`${name} is not a text flag`);
  const value = raw(def, options);
  if (value === undefined) return def.defaultValue === null ? undefined : def.defaultValue as string;
  const normalized = value.trim();
  if (!normalized) {
    invalid(def, options, 'a non-empty value');
    return def.defaultValue === null ? undefined : def.defaultValue as string;
  }
  if (def.allowedValues && !def.allowedValues.includes(normalized)) {
    invalid(def, options, `one of ${def.allowedValues.join(', ')}`);
    return def.defaultValue === null ? undefined : def.defaultValue as string;
  }
  if (def.name === 'ZCG_EXPERIMENT_ID' && !/^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/.test(normalized)) {
    invalid(def, options, "1-128 ASCII letters, digits, '-' or '_' without a leading '-'");
    return def.defaultValue === null ? undefined : def.defaultValue as string;
  }
  return normalized;
}

export function readListFlag(name: string, options: ReadFlagOptions = {}): string[] | undefined {
  const def = definition(name);
  if (def.kind !== 'list') throw new Error(`${name} is not a list flag`);
  const value = raw(def, options);
  if (value === undefined) return undefined;
  const values = value.split(',').map(item => item.trim()).filter(Boolean);
  if (values.length === 0) {
    invalid(def, options, 'a non-empty comma-separated list');
    return undefined;
  }
  return values;
}

function inspectPathFlag(
  def: FlagDefinition,
  value: EffectiveFlag['value'],
  context: FlagValidationContext,
): Pick<EffectiveFlag, 'valid' | 'error'> {
  if (typeof value !== 'string') return { valid: true };
  let valid = false;
  const pathType = def.pathType ?? 'file';
  try {
    const stat = fs.statSync(value);
    valid = pathType === 'directory' ? stat.isDirectory() : stat.isFile();
  } catch {
    // The effective-config report must never expose the raw path.
  }
  let error = valid ? undefined : `${def.name} does not exist or is not a ${pathType}.`;
  if (!valid && def.name === 'ZCG_VEC0_PATH' && context.projectRoot) {
    error += ' Run "zcodegraph embedding install" or configure a valid explicit path.';
  }
  return { valid, ...(error ? { error } : {}) };
}

export function inspectFlagConfig(
  env: NodeJS.ProcessEnv = process.env,
  context: FlagValidationContext = {},
): EffectiveFlag[] {
  return FLAG_REGISTRY.map(def => {
    const options: ReadFlagOptions = { env, onWarning: () => undefined };
    const platformDefault = def.platformDefaults
      ? process.platform === 'win32' ? def.platformDefaults.windows : def.platformDefaults.posix
      : undefined;
    let value: EffectiveFlag['value'] = platformDefault ?? def.defaultValue;
    let valid = true;
    let error: string | undefined;
    try {
      if (def.kind === 'boolean') value = readBooleanFlag(def.name, options);
      else if (def.kind === 'integer') value = readIntegerFlag(def.name, options);
      else if (def.kind === 'list') value = readListFlag(def.name, options) ?? null;
      else if (env[def.name] !== undefined || platformDefault === undefined) {
        value = readTextFlag(def.name, options) ?? null;
      }
      if (def.kind === 'integer' && env[def.name] !== undefined) {
        const normalized = env[def.name]!.trim();
        const parsed = /^[0-9]+$/.test(normalized) ? Number(normalized) : NaN;
        valid = Number.isSafeInteger(parsed) && (def.min === undefined || parsed >= def.min) && (def.max === undefined || parsed <= def.max);
      } else if (def.kind === 'boolean' && env[def.name] !== undefined) {
        valid = ['1', 'true', '0', 'false'].includes(env[def.name]!.trim().toLowerCase());
      } else if (env[def.name] !== undefined) {
        const normalized = env[def.name]!.trim();
        valid = normalized.length > 0
          && (!def.allowedValues || def.allowedValues.includes(normalized))
          && (def.name !== 'ZCG_EXPERIMENT_ID' || /^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/.test(normalized));
      }
      if (!valid) error = 'invalid input; default applied';
      if (valid && def.name === 'ZCG_MCP_TOOLS' && env[def.name] !== undefined) {
        context.validateMcpToolAllowlist?.(env);
      }
      if (valid && def.kind === 'path' && env[def.name] !== undefined) {
        const inspected = inspectPathFlag(def, value, context);
        valid = inspected.valid;
        error = inspected.error;
      } else if (valid && def.name === 'ZCG_RUST_CORE_BINARY') {
        const executable = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
        for (const candidateDir of context.rustCoreCandidateDirs ?? []) {
          const candidate = path.join(candidateDir, executable);
          if (!fs.existsSync(candidate)) continue;
          const inspected = inspectPathFlag(def, candidate, context);
          if (!inspected.valid) {
            valid = false;
            error = `Discovered Rust core is not a file in a configured candidate directory.`;
            break;
          }
        }
      }
    } catch (err) {
      valid = false;
      error = err instanceof Error ? err.message : String(err);
    }
    const explicitlySet = env[def.name] !== undefined;
    return {
      name: def.name,
      category: def.category,
      kind: def.kind,
      value: def.kind === 'path' && value ? '<set>' : value,
      source: valid && explicitlySet ? 'environment' : 'default',
      valid,
      ...(error ? { error } : {}),
    };
  });
}
