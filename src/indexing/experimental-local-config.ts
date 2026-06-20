import * as fs from 'fs';
import * as path from 'path';

export type CandidateProducerRoutingConfigSource =
  | 'missing-config'
  | 'local-config'
  | 'invalid-local-config';

export interface CandidateProducerRoutingConfig {
  enabled: boolean;
  source: CandidateProducerRoutingConfigSource;
  invalidReason?: string;
}

export function loadCandidateProducerRoutingConfig(projectPath: string): CandidateProducerRoutingConfig {
  const configPath = path.join(projectPath, '.zcodegraph', 'config.json');
  if (!fs.existsSync(configPath)) {
    return { enabled: false, source: 'missing-config' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return { enabled: false, source: 'invalid-local-config', invalidReason: 'invalid-json' };
  }

  if (!isPlainObject(parsed)) {
    return { enabled: false, source: 'invalid-local-config', invalidReason: 'root-not-object' };
  }

  const experimental = parsed.experimental;
  if (experimental === undefined) {
    return { enabled: false, source: 'local-config' };
  }
  if (!isPlainObject(experimental)) {
    return { enabled: false, source: 'invalid-local-config', invalidReason: 'experimental-not-object' };
  }

  const value = experimental.rustCandidateProducerRouting;
  if (value === undefined) {
    return { enabled: false, source: 'local-config' };
  }
  if (typeof value !== 'boolean') {
    return { enabled: false, source: 'invalid-local-config', invalidReason: 'rustCandidateProducerRouting-not-boolean' };
  }
  return { enabled: value, source: 'local-config' };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
