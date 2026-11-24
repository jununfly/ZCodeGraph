import * as path from 'path';
import type { SqliteDatabase } from '../db/sqlite-adapter';
import { normalizePath } from '../utils';
import type { ExtractionError } from '../types';

const MAX_ORIGINAL_PATHS = 2_048;
const MAX_NORMALIZED_PATHS = 2_048;
const MAX_ORIGINAL_PATH_BYTES = 1024 * 1024;

export type JavaWriteRejection = {
  code: 'java-facts-rebuild-required' | 'java-facts-inconsistent-state' | 'java-preflight-limit'
    | 'path_traversal' | 'path_normalization_collision';
  filePath?: string;
  reason: string;
};

function reject(
  code: JavaWriteRejection['code'],
  reason: string,
  filePath?: string,
): JavaWriteRejection {
  return { code, reason, ...(filePath === undefined ? {} : { filePath }) };
}

function javaPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.java');
}

function hasPersistedJavaEvidence(db: SqliteDatabase): boolean {
  const row = db.prepare(
    "SELECT EXISTS (SELECT 1 FROM files WHERE language = 'java' OR " +
    "lower(path) LIKE '%.java' OR errors LIKE '%zcg-java-%') AS present",
  ).get() as { present: number };
  const reference = db.prepare(
    "SELECT EXISTS (SELECT 1 FROM unresolved_refs WHERE language = 'java' OR " +
    "lower(file_path) LIKE '%.java' OR metadata LIKE '%zcgJavaCall%') AS present",
  ).get() as { present: number };
  const declaration = db.prepare(
    "SELECT EXISTS (SELECT 1 FROM nodes WHERE language = 'java' OR " +
    "lower(file_path) LIKE '%.java' OR signature LIKE 'zcg-java-declaration/v1%' " +
    "OR signature LIKE 'zcg-java-declaration-incomplete/v1%') AS present",
  ).get() as { present: number };
  return row.present === 1 || reference.present === 1 || declaration.present === 1;
}

/**
 * A read-only, lexical-only preflight. No realpath/stat/read or graph mutation
 * is allowed until this returns no rejection for the whole requested batch.
 */
export function preflightJavaWrites(
  db: SqliteDatabase,
  rootDir: string,
  filePaths: readonly string[],
  options: { sync?: boolean; privateV1Replacement?: boolean } = {},
): JavaWriteRejection | null {
  if (filePaths.length > MAX_ORIGINAL_PATHS) {
    return reject('java-preflight-limit', 'Java write preflight accepts at most 2,048 original paths.');
  }
  const metadata = db.prepare(
    "SELECT key, value FROM project_metadata WHERE key IN ('java_fact_generation', 'java_finalization_state')",
  ).all() as Array<{ key: string; value: string }>;
  if (metadata.some((row) => typeof row.key !== 'string' || typeof row.value !== 'string')) {
    return reject('java-facts-inconsistent-state', 'Java fact generation or finalization metadata is unreadable.');
  }
  const values = new Map(metadata.map((row) => [row.key, row.value]));
  const generation = values.get('java_fact_generation');
  const state = values.get('java_finalization_state');
  if (generation !== undefined && (
    generation !== 'p0b-java-v1'
    || (!options.privateV1Replacement && state !== 'complete')
    || (options.privateV1Replacement && state !== 'required')
  )) {
    return reject('java-facts-inconsistent-state', 'Java fact generation or finalization state is unknown or mixed.');
  }
  if (generation === undefined && state !== undefined) {
    return reject('java-facts-inconsistent-state', 'Java fact generation is missing while lifecycle state exists.');
  }
  const javaEvidence = generation === 'p0b-java-v1' || hasPersistedJavaEvidence(db);
  let bytes = 0;
  const normalized = new Map<string, string>();
  const root = path.resolve(rootDir);
  const normalizedRoot = process.platform === 'win32' ? root.toLowerCase() : root;
  for (const original of filePaths) {
    if (typeof original !== 'string') {
      return reject('java-facts-inconsistent-state', 'Java write preflight requires string paths.');
    }
    bytes += Buffer.byteLength(original, 'utf8');
    if (bytes > MAX_ORIGINAL_PATH_BYTES) {
      return reject('java-preflight-limit', 'Java write preflight accepts at most 1 MiB of original paths.');
    }
    const absolute = path.resolve(root, original);
    const candidate = process.platform === 'win32' ? absolute.toLowerCase() : absolute;
    if (candidate !== normalizedRoot && !candidate.startsWith(normalizedRoot + path.sep)) {
      return reject('path_traversal', `Path traversal blocked: ${original}`, original);
    }
    const relative = normalizePath(path.relative(root, absolute));
    const identity = process.platform === 'win32' ? relative.toLowerCase() : relative;
    const previous = normalized.get(identity);
    if (previous !== undefined && previous !== original) {
      return reject('path_normalization_collision', `Path normalization collision: ${previous} / ${original}`, original);
    }
    normalized.set(identity, original);
  }
  if (normalized.size > MAX_NORMALIZED_PATHS) {
    return reject('java-preflight-limit', 'Java write preflight accepts at most 2,048 normalized distinct paths.');
  }

  if (options.privateV1Replacement) return null;

  if (options.sync && javaEvidence) {
    return reject('java-facts-rebuild-required', 'java-facts-rebuild-required: Java-bearing sync requires a clean full rebuild.');
  }
  if (!javaEvidence) return null;

  const lookup = db.prepare('SELECT language FROM files WHERE path = ?');
  for (const [identity] of normalized) {
    if (javaPath(identity) || lookup.get(identity)?.language === 'java') {
      return reject(
        'java-facts-rebuild-required',
        `java-facts-rebuild-required: incremental Java mutation is not supported: ${identity}`,
        identity,
      );
    }
  }
  return null;
}

export function javaPreflightError(rejection: JavaWriteRejection): ExtractionError {
  return {
    message: rejection.reason,
    ...(rejection.filePath === undefined ? {} : { filePath: rejection.filePath }),
    severity: 'error',
    code: rejection.code,
  };
}
