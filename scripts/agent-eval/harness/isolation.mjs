// Credential-free, one-shot, read-only snapshot isolation for baseline runs
// (ADR-0015 D5/D7; ADR-0016 Boundaries). Harness-owned and provider-agnostic:
// no provider name, no model id, no vendor transcript marker.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SENSITIVE_ENV = /(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_KEY|APIKEY|PRIVATE_KEY|ACCESS_KEY|COOKIE|AUTH)/i;
const SENSITIVE_FILE = /^(\.env|\.npmrc|\.netrc|id_rsa.*|.*\.pem|.*\.key|credentials.*)$/i;
const RUNTIME_DIR = '.zcodegraph';
const disposedSnapshots = new WeakSet();
const POST_C_SERVER = new URL('../post-c-explore-server.mjs', import.meta.url);

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function invalidPostC(baselineOptions, snapshot, invalidReason) {
  return Object.freeze({
    runId: baselineOptions.runId,
    status: 'invalid',
    invalidReason,
    arms: {
      with: { status: 'invalid', humanReview: null },
      without: { status: 'invalid', humanReview: null },
    },
    diagnostics: { attemptedArms: [], arms: [] },
    totals: { credit: 0, totalTokens: 0, turns: 0 },
    isolation: Object.freeze({
      root: snapshot.root,
      fingerprint: snapshot.fingerprint,
      consumed: true,
      intact: true,
    }),
  });
}

/** Bind the declared candidate to this one-shot snapshot before any agent run. */
export async function preparePostCExplore(snapshot, retrieval) {
  if (retrieval?.arm !== 'C' || !/^[0-9a-f]{64}$/.test(retrieval.candidateSha256 ?? '')) {
    throw new Error('post-C retrieval requires arm C and its frozen candidate SHA-256');
  }
  const env = {
    ZCG_EVAL_SNAPSHOT_FINGERPRINT: snapshot.fingerprint,
    ZCG_EVAL_CANDIDATE_SHA256: retrieval.candidateSha256,
    ZCG_NO_DAEMON: '1',
    ZCG_NO_WATCH: '1',
  };
  const { preparePostCExplore: prepare } = await import(POST_C_SERVER.href);
  const prepared = await prepare({ corpusDir: snapshot.corpusDir, env });
  if (prepared.candidateSha256 !== retrieval.candidateSha256
      || prepared.snapshotFingerprint !== snapshot.fingerprint) {
    throw new Error('post-C Explore preparation evidence does not match the snapshot/candidate');
  }
  const config = Object.freeze({
    command: process.execPath,
    args: [fileURLToPath(POST_C_SERVER)],
    env: {
      ...env,
      ZCG_EVAL_EVIDENCE_DIR: prepared.evidenceDir,
      ZCG_EVAL_PREPARATION_PATH: prepared.preparationPath,
    },
    alwaysLoad: true,
  });
  return Object.freeze({ config, prepared });
}

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
  const { sourceDir, runBaseline, baselineOptions: requestedBaseline = {}, isolationOptions = {} } = options;
  let baselineOptions = requestedBaseline;
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

  let postCPrepared;
  if (baselineOptions.retrieval !== undefined) {
    let prepared;
    try {
      prepared = await preparePostCExplore(context, baselineOptions.retrieval);
    } catch (error) {
      const invalid = invalidPostC(baselineOptions, snapshot,
        'post-C retrieval requires snapshot-bound C Explore evidence');
      await disposeSnapshot(snapshot);
      return Object.freeze({ ...invalid, diagnostics: {
        ...invalid.diagnostics,
        error: error instanceof Error ? error.message : String(error),
      } });
    }
    postCPrepared = prepared.prepared;
    baselineOptions = {
      ...baselineOptions,
      server: prepared.config,
      retrieval: {
        ...baselineOptions.retrieval,
        preparation: {
          kind: postCPrepared.kind,
          retrievalArm: postCPrepared.retrievalArm,
          snapshotFingerprint: postCPrepared.snapshotFingerprint,
          candidateSha256: postCPrepared.candidateSha256,
          sourceDbSha256: postCPrepared.sourceDbSha256,
          symbolIndexSha256: postCPrepared.symbolIndexSha256,
        },
      },
      adapterOptions: { ...(baselineOptions.adapterOptions ?? {}), retrievalEvidence: prepared.prepared },
    };
  }

  const result = await runBaseline({
    ...baselineOptions,
    ...(baselineOptions.outDir ? { outDir: null } : {}),
    adapterOptions: { ...(baselineOptions.adapterOptions ?? {}), isolation: context },
  });

  const intact = await verifySnapshot(snapshot);
  await disposeSnapshot(snapshot);
  if (postCPrepared && intact && result.status === 'valid') {
    const withArm = result.arms.with;
    const toolCalls = withArm.toolCalls.filter((call) => {
      const name = call.name ?? call.toolName ?? '';
      return name.endsWith('zcodegraph_explore');
    });
    const toolResults = Array.isArray(withArm.toolResults) ? withArm.toolResults : [];
    if (toolCalls.length === 0) {
      result.status = 'invalid';
      result.invalidReason = 'post-C with arm did not call the real C Explore MCP tool';
    } else {
      const answers = [];
      for (const toolCall of toolCalls) {
        const toolResult = toolResults.find((candidate) =>
          typeof candidate.callId === 'string' && candidate.callId === toolCall.callId
          && typeof candidate.text === 'string');
        if (!toolResult) {
          answers.length = 0;
          break;
        }
        const answerSha256 = sha256(toolResult.text);
        let evidence;
        try {
          evidence = JSON.parse(await readFile(
            path.join(postCPrepared.evidenceDir, `${answerSha256}.json`), 'utf8',
          ));
        } catch {
          // Missing server-side evidence is an invalid run, never a valid synthetic one.
        }
        if (evidence?.kind !== 'snapshot-bound-c-explore-v1'
            || evidence.retrievalArm !== 'C'
            || evidence.snapshotFingerprint !== snapshot.fingerprint
            || evidence.candidateSha256 !== baselineOptions.retrieval.candidateSha256
            || evidence.answerSha256 !== answerSha256
            || evidence.answer !== toolResult.text
            || evidence.query !== (toolCall.input ?? toolCall.arguments)?.query
            || evidence.symbolIndexPath !== postCPrepared.symbolIndexPath) {
          answers.length = 0;
          break;
        }
        answers.push(Object.freeze({ callId: toolCall.callId, ...evidence }));
      }
      if (answers.length !== toolCalls.length) {
        result.status = 'invalid';
        result.invalidReason = 'post-C with arm tool results do not match snapshot-bound C Explore evidence';
      } else {
        withArm.mcpExploreEvidence = Object.freeze({
          kind: 'snapshot-bound-c-explore-evidence-v1',
          retrievalArm: 'C',
          snapshotFingerprint: snapshot.fingerprint,
          candidateSha256: baselineOptions.retrieval.candidateSha256,
          answers: Object.freeze(answers),
          ...(withArm.transcriptPath ? {} : {
            desEligible: false,
            evidenceLimit: 'local MCP integration only; not a real-agent DES baseline',
          }),
        });
      }
    }
    if (result.status === 'invalid') {
      result.diagnostics = {
        ...(result.diagnostics ?? {}),
        // A runner failure already supplies these fields. A successful runner
        // rejected by the post-C gate needs the same bounded audit locations.
        attemptedArms: result.diagnostics?.attemptedArms ?? ['with', 'without'],
        arms: result.diagnostics?.arms ?? ['with', 'without'].map((arm) => ({
          arm,
          outcome: 'attempted',
          exitCode: 0,
          stderrTail: '',
          transcriptPath: typeof result.arms[arm]?.transcriptPath === 'string'
            ? result.arms[arm].transcriptPath : '',
        })),
        postCPrepared,
      };
      for (const arm of ['with', 'without']) {
        result.arms[arm] = { ...result.arms[arm], status: 'invalid', invalidReason: result.invalidReason };
      }
    }
  }
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
