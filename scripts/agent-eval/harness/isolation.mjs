#!/usr/bin/env node
// Credential-free, one-shot, read-only snapshot isolation for baseline runs
// (ADR-0015 D5/D7; ADR-0016 Boundaries). Harness-owned and provider-agnostic:
// no provider name, no model id, no vendor transcript marker.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SENSITIVE_ENV = /(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_KEY|APIKEY|PRIVATE_KEY|ACCESS_KEY|COOKIE|AUTH)/i;
const SENSITIVE_FILE = /^(\.env|\.npmrc|\.netrc|id_rsa.*|.*\.pem|.*\.key|credentials.*)$/i;
const RUNTIME_DIR = '.zcodegraph';
const disposedSnapshots = new WeakSet();

/** Every consumer must reject a snapshot that has already served one run. */
export function assertUsable(snapshot) {
  if (disposedSnapshots.has(snapshot)) {
    throw new Error('snapshot is disposed; a baseline run must use a fresh one-shot snapshot');
  }
}

/** Mark the snapshot consumed and leave an auditable marker on disk. */
export async function disposeSnapshot(snapshot) {
  disposedSnapshots.add(snapshot);
  await writeFile(path.join(snapshot.root, '.consumed'), 'disposed\n', 'utf8');
}

/** Drop credential-bearing variables without mutating the source environment. */
export function sanitizeEnv(source) {
  const clean = {};
  for (const [key, value] of Object.entries(source)) {
    if (!SENSITIVE_ENV.test(key)) clean[key] = value;
  }
  return Object.freeze(clean);
}

async function copyCorpus(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SENSITIVE_FILE.test(entry.name)) continue;
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) await copyCorpus(source, target);
    else if (entry.isFile()) await copyFile(source, target);
  }
}

async function listCorpusFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    // The local MCP store is a disposable index, not protected source. Index
    // writes/WAL files must not masquerade as source-code integrity breaches.
    if (relative === RUNTIME_DIR) continue;
    if (entry.isDirectory()) {
      files.push(...await listCorpusFiles(path.join(dir, entry.name), relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
}

/** SHA-256 over sorted source paths and contents; runtime indexes are excluded. */
export async function fingerprintCorpus(corpusDir) {
  const hash = createHash('sha256');
  for (const relative of await listCorpusFiles(corpusDir)) {
    hash.update(relative, 'utf8');
    hash.update(await readFile(path.join(corpusDir, relative), 'utf8'), 'utf8');
  }
  return hash.digest('hex');
}

/** Any mutation of the snapshot invalidates the run (ADR-0015 D4). */
export async function verifySnapshot(snapshot) {
  assertUsable(snapshot);
  return await fingerprintCorpus(snapshot.corpusDir) === snapshot.fingerprint;
}

export async function createIsolatedSnapshot(options = {}) {
  const { sourceDir, env = process.env, rootBase = tmpdir() } = options;
  if (!sourceDir) throw new Error('sourceDir is required');
  const info = await stat(sourceDir);
  if (!info.isDirectory()) throw new Error('sourceDir must be a directory');

  const root = await mkdtemp(path.join(rootBase, 'zcg-iso-'));
  const corpusDir = path.join(root, 'corpus');
  await copyCorpus(sourceDir, corpusDir);

  return Object.freeze({
    root,
    corpusDir,
    readOnly: true,
    credentialFree: true,
    env: sanitizeEnv(env),
    fingerprint: await fingerprintCorpus(corpusDir),
  });
}

/**
 * Drive one with-vs-without baseline inside a fresh one-shot snapshot. The
 * context travels through adapterOptions, so harness core needs no change
 * (ADR-0016 acceptance criterion 3). Any integrity breach invalidates the
 * WHOLE run (ADR-0015 D4); partial arms are never retained as evidence.
 */
export async function runIsolatedBaseline(options = {}) {
  const { sourceDir, runBaseline, baselineOptions = {}, isolationOptions = {} } = options;
  if (typeof runBaseline !== 'function') throw new Error('runBaseline is required');

  const snapshot = await createIsolatedSnapshot({ sourceDir, ...isolationOptions });
  const context = Object.freeze({
    root: snapshot.root,
    corpusDir: snapshot.corpusDir,
    readOnly: snapshot.readOnly,
    credentialFree: snapshot.credentialFree,
    fingerprint: snapshot.fingerprint,
    env: snapshot.env,
  });

  const result = await runBaseline({
    ...baselineOptions,
    ...(baselineOptions.outDir ? { outDir: null } : {}),
    adapterOptions: { ...(baselineOptions.adapterOptions ?? {}), isolation: context },
  });

  const intact = await verifySnapshot(snapshot);
  await disposeSnapshot(snapshot);
  const isolation = Object.freeze({
    root: snapshot.root,
    fingerprint: snapshot.fingerprint,
    consumed: true,
    intact,
  });

  const output = {
    ...(result ?? {}),
    ...(intact ? {} : {
      status: 'invalid',
      invalidReason: 'snapshot integrity breach',
      arms: Object.fromEntries(Object.entries(result?.arms ?? {}).map(([arm, record]) => [
        arm, { ...record, status: 'invalid', invalidReason: 'snapshot integrity breach' },
      ])),
    }),
    isolation,
  };

  if (baselineOptions.diagnosticsDir && output.status === 'invalid') {
    const diagnostics = {
      ...(output.diagnostics ?? {}),
      kind: 'failed-baseline-diagnostics',
      evidence: false,
      runId: output.runId,
      invalidReason: output.invalidReason,
      isolation,
    };
    await mkdir(baselineOptions.diagnosticsDir, { recursive: true });
    await writeFile(
      path.join(baselineOptions.diagnosticsDir, `${output.runId}.diagnostics.json`),
      JSON.stringify(diagnostics, null, 2),
      'utf8',
    );
  }
  if (baselineOptions.outDir && output.status === 'valid') {
    await mkdir(baselineOptions.outDir, { recursive: true });
    await writeFile(
      path.join(baselineOptions.outDir, `${output.runId}.json`),
      JSON.stringify(output, null, 2),
      'utf8',
    );
  }
  return Object.freeze(output);
}
