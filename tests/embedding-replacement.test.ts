import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CodeGraph } from '../src/index';
import { createDatabase, type SqliteDatabase } from '../src/db/sqlite-adapter';
import { enqueueEmbedding, getEmbeddingQueueRow } from '../src/embedding/queue';
import { EmbeddingRunner } from '../src/embedding/worker-runner';
import { acquireExclusiveReplacementGate, type NativeReplacementLease } from '../src/embedding/replacement-gate';
import { findRustCoreCommand } from '../src/indexing/rust-indexer';

describe('embedding replacement coordination', () => {
  let projectRoot: string;
  let dbPath: string;
  let db: SqliteDatabase;
  let runner: EmbeddingRunner | undefined;
  let cg: CodeGraph | undefined;
  let externalWorker: ChildProcess | undefined;
  let exclusiveProbe: ChildProcess | undefined;
  let probeTimer: NodeJS.Timeout | undefined;
  let replacementLease: NativeReplacementLease | undefined;

  async function stopHelper(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.stdin?.end();
    child.kill();
    await Promise.race([
      exited,
      new Promise<void>((resolve) => setTimeout(resolve, 1_000).unref()),
    ]);
  }

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-replacement-'));
    dbPath = path.join(projectRoot, '.zcodegraph', 'zcodegraph.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    cg = CodeGraph.initSync(projectRoot);
    cg.close();
    cg = undefined;
    db = createDatabase(dbPath).db;
  });

  afterEach(async () => {
    try {
      if (probeTimer) clearTimeout(probeTimer);
      cg?.close();
      await runner?.shutdown();
      await replacementLease?.release();
      if (externalWorker) await stopHelper(externalWorker);
      if (exclusiveProbe) await stopHelper(exclusiveProbe);
      if (db.open) db.close();
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  async function startExternalWorker(): Promise<void> {
    const core = findRustCoreCommand();
    externalWorker = spawn(core.command, [
      ...core.argsPrefix,
      'worker-lease', '--project-path', projectRoot, '--wait-ms', '0',
    ], { cwd: core.cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    await new Promise<void>((resolve, reject) => {
      externalWorker!.stdout.once('data', () => resolve());
      externalWorker!.once('exit', (code) => reject(new Error(`external worker exited ${code}`)));
    });
  }

  async function tryExclusiveReplacement(): Promise<number> {
    const core = findRustCoreCommand();
    const child = spawn(core.command, [
      ...core.argsPrefix,
      'replacement-gate',
      '--project-path', projectRoot,
      '--wait-ms', '0',
    ], { cwd: core.cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    return new Promise<number>((resolve, reject) => {
      child.once('error', reject);
      child.stdout.once('data', () => {
        exclusiveProbe = child;
        probeTimer = setTimeout(() => child.kill(), 100);
        resolve(0);
      });
      child.once('exit', (code) => {
        if (code !== null) resolve(code);
      });
    });
  }

  it('keeps an idle worker lease until shutdown closes the worker', async () => {
    enqueueEmbedding(db, 'src/a.ts', 'hash-a');
    runner = new EmbeddingRunner({
      dbPath,
      projectRoot,
      vec0Path: path.join(projectRoot, 'unused-vec0.dll'),
      workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
    });
    runner.notifyEnqueued();
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 5_000;
      const inspect = () => {
        if (getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status === 'done') {
          resolve();
        } else if (Date.now() >= deadline) {
          reject(new Error('worker did not finish its batch'));
        } else {
          setTimeout(inspect, 20);
        }
      };
      inspect();
    });

    expect(runner.isRunning()).toBe(true);
    expect(await tryExclusiveReplacement()).toBe(3);

    await runner.shutdown();
    expect(await tryExclusiveReplacement()).toBe(0);
  }, 15_000);

  it('fails CodeGraph indexing before replacing an index used by an external worker', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    cg = await CodeGraph.open(projectRoot);
    const initial = await cg.indexAll({ engine: 'rust' });
    expect(initial.success).toBe(true);
    expect(cg.getFile('old.ts')).not.toBeNull();
    db = createDatabase(dbPath).db;
    db.prepare(
      "UPDATE embedding_queue SET status = 'in_progress', attempts = 1 WHERE file_path = 'old.ts'",
    ).run();
    db.close();
    await startExternalWorker();
    fs.writeFileSync(path.join(projectRoot, 'new.ts'), 'export function newIndex(): number { return 2; }\n');

    await expect(cg.indexAll({ engine: 'rust' })).rejects.toThrow(/worker is still active/);

    expect(cg.getFile('old.ts')).not.toBeNull();
    expect(cg.getFile('new.ts')).toBeNull();
    expect(cg.getEmbeddingQueueSnapshot()).toEqual([
      { filePath: 'old.ts', contentHash: cg.getFile('old.ts')!.contentHash, status: 'in_progress' },
    ]);
    expect(await tryExclusiveReplacement()).toBe(3);
    expect(externalWorker?.exitCode).toBeNull();
  }, 30_000);

  it('prevents a new worker from barging in while replacement waits', async () => {
    enqueueEmbedding(db, 'src/a.ts', 'hash-a');
    runner = new EmbeddingRunner({
      dbPath,
      projectRoot,
      vec0Path: path.join(projectRoot, 'unused-vec0.dll'),
      workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
    });
    runner.notifyEnqueued();
    await expect.poll(() => runner!.leaseHelperPidForTests(), { timeout: 5_000 }).toBeDefined();
    const waitingGate = acquireExclusiveReplacementGate(dbPath, 10_000);
    const waitingGateState = waitingGate.then(() => 'acquired', (error) => error);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    await expect(startExternalWorker()).rejects.toThrow('external worker exited 3');
    await runner.shutdown();
    replacementLease = await waitingGate;
    expect(replacementLease.processId).toBeDefined();
    expect(await waitingGateState).toBe('acquired');
  }, 20_000);

  it('stops a worker when its lease helper exits unexpectedly', async () => {
    enqueueEmbedding(db, 'src/a.ts', 'hash-a');
    runner = new EmbeddingRunner({
      dbPath,
      projectRoot,
      vec0Path: path.join(projectRoot, 'unused-vec0.dll'),
      workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
    });
    runner.notifyEnqueued();
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 5_000;
      const inspect = () => {
        if (getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status === 'done') {
          resolve();
        } else if (Date.now() >= deadline) {
          reject(new Error('worker did not finish its batch'));
        } else {
          setTimeout(inspect, 20);
        }
      };
      inspect();
    });

    process.kill(runner.leaseHelperPidForTests()!, 'SIGTERM');

    await expect.poll(() => runner!.isRunning(), { timeout: 5_000 }).toBe(false);
    expect(await tryExclusiveReplacement()).toBe(0);
  }, 15_000);

  it('reaps lease helpers when their parent is killed without exit hooks', async () => {
    db.close();
    const child = spawn(process.execPath, ['-e', `
      const { acquireExclusiveReplacementGate } = require(${JSON.stringify(path.resolve(__dirname, '../dist/embedding/replacement-gate.js'))});
      acquireExclusiveReplacementGate(${JSON.stringify(dbPath)}, 0).then(() => {
        process.stdout.write('ready\\n');
        setInterval(() => {}, 1000);
      }).catch((error) => { console.error(error); process.exit(1); });
    `], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    await expect.poll(() => output, { timeout: 5_000 }).toContain('ready');
    expect(await tryExclusiveReplacement()).toBe(3);
    child.kill('SIGKILL');
    await new Promise<void>((resolve) => child.once('close', () => resolve()));
    expect(await tryExclusiveReplacement()).toBe(0);
  }, 15_000);

  it('fails clear before deleting an index used by an external worker', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    cg = await CodeGraph.open(projectRoot);
    expect((await cg.indexAll({ engine: 'rust' })).success).toBe(true);
    await startExternalWorker();
    await expect(cg.clear()).rejects.toThrow(/worker is still active/);
    expect(cg.getFile('old.ts')).not.toBeNull();
  }, 15_000);

  it('reopens only after external workers release the replacement gate', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    cg = await CodeGraph.open(projectRoot);
    expect((await cg.indexAll({ engine: 'rust' })).success).toBe(true);
    await startExternalWorker();

    await expect(cg.reopen()).rejects.toThrow(/worker is still active/);

    expect(cg.getFile('old.ts')).not.toBeNull();
    expect(cg.isIndexing()).toBe(false);
  }, 15_000);

  it('does not finish a delayed active batch after its lease is lost', async () => {
    enqueueEmbedding(db, 'src/a.ts', 'hash-a');
    runner = new EmbeddingRunner({
      dbPath,
      projectRoot,
      vec0Path: path.join(projectRoot, 'unused-vec0.dll'),
      workerEntrypoint: path.resolve(__dirname, 'fixtures/embedding-lifecycle-worker.cjs'),
    });
    runner.notifyEnqueued();
    await vi.waitFor(() => {
      expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('in_progress');
    });

    process.kill(runner.leaseHelperPidForTests()!, 'SIGTERM');

    await vi.waitFor(() => expect(runner!.isRunning()).toBe(false));
    expect(getEmbeddingQueueRow(db, 'src/a.ts', 'hash-a')?.status).toBe('in_progress');
    expect(await tryExclusiveReplacement()).toBe(0);
  }, 15_000);

  it('does not let an old external DB handle write into the promoted generation', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    cg = await CodeGraph.open(projectRoot);
    expect((await cg.indexAll({ engine: 'rust' })).success).toBe(true);
    cg.close();
    cg = undefined;
    db = createDatabase(dbPath).db;
    db.exec("INSERT INTO project_metadata(key, value, updated_at) VALUES ('old-handle-before', 'old', 1)");
    fs.writeFileSync(path.join(projectRoot, 'new.ts'), 'export function newIndex(): number { return 2; }\n');

    cg = await CodeGraph.open(projectRoot);
    if (process.platform === 'win32') {
      // An unrelated external SQLite handle is not a lease participant. The
      // native promotion must refuse the rename while it is still open.
      await expect(cg.indexAll({ engine: 'rust' })).rejects.toThrow(/os error 32/);
      expect(cg.getFile('old.ts')).not.toBeNull();
      expect(cg.getFile('new.ts')).toBeNull();
      expect(db.prepare("SELECT value FROM project_metadata WHERE key = 'old-handle-before'").get()).toEqual({ value: 'old' });
      db.close();
      return;
    }

    const replacement = await cg.indexAll({ engine: 'rust' });
    expect(replacement.success).toBe(true);

    db.exec("INSERT INTO project_metadata(key, value, updated_at) VALUES ('old-handle-after', 'old', 1)");
    db.close();
    db = createDatabase(dbPath).db;
    expect(cg.getFile('new.ts')).not.toBeNull();
    expect(db.prepare("SELECT value FROM project_metadata WHERE key = 'old-handle-after'").get()).toBeUndefined();
  }, 30_000);

  it('fails uninitialize before deleting an index used by an external worker', async () => {
    db.close();
    cg = await CodeGraph.open(projectRoot);
    await startExternalWorker();

    await expect(cg!.uninitialize()).rejects.toThrow(/worker is still active/);

    expect(CodeGraph.isInitialized(projectRoot)).toBe(true);
    cg!.close();
    cg = undefined;
    db = createDatabase(dbPath).db;
    expect(db.prepare('SELECT COUNT(*) AS count FROM files').get()).toEqual({ count: 0 });
  }, 15_000);

  it('runs real CLI uninit without deleting an index used by an external worker', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    const cliPath = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
    const cliEnv = {
      ...process.env,
      NODE_OPTIONS: '',
      ZCG_ENABLE_EMBEDDING: '0',
      ZCG_NO_RELAUNCH: '1',
    };
    const cli = () => spawnSync(process.execPath, [
      cliPath, 'uninit', projectRoot, '--force',
    ], { cwd: projectRoot, env: cliEnv, encoding: 'utf8', timeout: 20_000 });
    expect(cli().status).toBe(0);
    expect(CodeGraph.isInitialized(projectRoot)).toBe(false);
    expect(cli().status).toBe(0);
    CodeGraph.initSync(projectRoot).close();
    cg = await CodeGraph.open(projectRoot);
    await startExternalWorker();

    const rejected = cli();

    expect(rejected.status, `${rejected.stdout}\n${rejected.stderr}`).toBe(1);
    expect(rejected.stderr).toMatch(/worker is still active/);
    expect(CodeGraph.isInitialized(projectRoot)).toBe(true);
    expect(externalWorker?.exitCode).toBeNull();
    cg.close();
    cg = undefined;
    db = createDatabase(dbPath).db;
  }, 30_000);

  it('rebuilds the queue only from files in the promoted index', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    fs.writeFileSync(path.join(projectRoot, 'removed.ts'), 'export const removed = true;\n');
    cg = await CodeGraph.open(projectRoot);
    const initial = await cg.indexAll({ engine: 'rust' });
    expect(initial.success).toBe(true);
    db = createDatabase(dbPath).db;
    const oldFile = cg.getFile('old.ts');
    const removedFile = cg.getFile('removed.ts');
    expect(oldFile).not.toBeNull();
    expect(removedFile).not.toBeNull();
    db.prepare(
      "UPDATE embedding_queue SET status = 'in_progress', attempts = 1 WHERE file_path = ?",
    ).run('old.ts');
    db.prepare(
      "UPDATE embedding_queue SET status = 'done', attempts = 1 WHERE file_path = ?",
    ).run('removed.ts');
    enqueueEmbedding(db, 'historical.ts', 'historical-hash');
    fs.writeFileSync(path.join(projectRoot, 'new.ts'), 'export function newIndex(): number { return 2; }\n');
    fs.rmSync(path.join(projectRoot, 'removed.ts'));
    db.close();

    const replacement = await cg.indexAll({ engine: 'rust' });

    expect(replacement.success).toBe(true);
    const newFile = cg.getFile('new.ts');
    expect(newFile).not.toBeNull();
    expect(cg.getEmbeddingQueueSnapshot()).toEqual([
      { filePath: 'new.ts', contentHash: newFile!.contentHash, status: 'pending' },
      { filePath: 'old.ts', contentHash: oldFile!.contentHash, status: 'pending' },
    ]);
  }, 30_000);

  it('rebuilds the queue from the promoted index when CLI fallback finalization fails', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    const cliPath = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
    const cliArgs = ['index', projectRoot, '--engine', 'rust-hybrid', '--quiet'];
    const core = findRustCoreCommand();
    const cliEnv = {
      ...process.env,
      NODE_OPTIONS: '',
      ZCG_ENABLE_EMBEDDING: '0',
      ZCG_NO_RELAUNCH: '1',
      ZCG_RUST_CORE_BINARY: core.command,
    };
    const initial = spawnSync(process.execPath, [cliPath, ...cliArgs], {
      cwd: projectRoot,
      env: cliEnv,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(initial.status, initial.stderr).toBe(0);
    cg = await CodeGraph.open(projectRoot);
    const oldFile = cg.getFile('old.ts');
    expect(oldFile).not.toBeNull();
    db = createDatabase(dbPath).db;
    db.prepare(
      'UPDATE embedding_queue SET status = ?, attempts = 1, started_at = ? WHERE file_path = ?',
    ).run('in_progress', Date.now(), 'old.ts');
    expect(cg.getEmbeddingQueueSnapshot()).toEqual([
      { filePath: 'old.ts', contentHash: oldFile!.contentHash, status: 'in_progress' },
    ]);
    cg.close();
    cg = undefined;
    db.close();

    fs.writeFileSync(path.join(projectRoot, 'new.ts'), 'export function newIndex(): number { return 2; }\n');
    fs.writeFileSync(path.join(projectRoot, 'Broken.liquid'), '{% assign broken = 1 %}\n');
    const failureFlagPath = path.join(projectRoot, 'finalization-failure.flag');
    const nativeReadyPath = path.join(projectRoot, 'native-ready.signal');
    const resumePath = path.join(projectRoot, 'resume.signal');
    const preloadPath = path.join(projectRoot, 'pause-native-result.cjs');
    // Delay only the genuine native result promise at its TypeScript boundary.
    // Pausing child stdout instead would also prevent the supervisor from
    // exiting, making finalization unreachable and the test incapable of
    // observing the intended failure. No result or extraction is mocked.
    const preload = [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const Module = require('node:module');",
      `const rustIndexerPath = ${JSON.stringify(path.resolve(__dirname, '../dist/indexing/rust-indexer.js').toLowerCase())};`,
      'const originalLoad = Module._load;',
      'Module._load = function(request, parent, isMain) {',
      '  const loaded = originalLoad.call(this, request, parent, isMain);',
      '  let resolved;',
      '  try { resolved = Module._resolveFilename(request, parent, isMain).toLowerCase(); } catch { return loaded; }',
      '  if (resolved !== rustIndexerPath) return loaded;',
      '  if (loaded.__nativeResultPauseInstalled) return loaded;',
      '  loaded.__nativeResultPauseInstalled = true;',
      'const originalRunRustIndexer = loaded.runRustIndexer;',
      'const pausedRunRustIndexer = async function(...args) {',
      '  const result = await originalRunRustIndexer.apply(this, args);',
      `  fs.writeFileSync(${JSON.stringify(nativeReadyPath)}, 'ready\\n');`,
      '  await new Promise((resolve) => {',
      '    const resume = () => {',
      `      if (!fs.existsSync(${JSON.stringify(resumePath)})) {`,
      '        setTimeout(resume, 20).unref();',
      '        return;',
      '      }',
      '      resolve();',
      '    };',
      '    resume();',
      '  });',
      '  return result;',
      '};',
      "  Object.defineProperty(loaded, 'runRustIndexer', { value: pausedRunRustIndexer, writable: true, configurable: true, enumerable: true });",
      '  return loaded;',
      '};',
      `const { CodeGraph } = require(${JSON.stringify(path.resolve(__dirname, '../dist/index.js'))});`,
      'const originalFinalize = CodeGraph.prototype.finalizeRustIndex;',
      'CodeGraph.prototype.finalizeRustIndex = async function(...args) {',
      `  if (fs.existsSync(${JSON.stringify(failureFlagPath)})) {`,
      "    throw new Error('injected post-promotion finalization failure');",
      '  }',
      '  return originalFinalize.apply(this, args);',
      '};',
      '',
    ].join('\n');
    fs.writeFileSync(preloadPath, preload, { flag: 'wx' });
    const replacement = spawn(process.execPath, [
      '--require', preloadPath, cliPath, ...cliArgs,
    ], {
      cwd: projectRoot,
      env: cliEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    replacement.stdout.on('data', (chunk) => { stdout += chunk; });
    replacement.stderr.on('data', (chunk) => { stderr += chunk; });
    const exited = new Promise<number | null>((resolve, reject) => {
      replacement.once('error', reject);
      replacement.once('close', resolve);
    });
    let resumed = false;
    try {
      const deadline = Date.now() + 20_000;
      while (!fs.existsSync(nativeReadyPath)) {
        if (replacement.exitCode !== null) {
          throw new Error(`CLI exited before native promotion: ${stderr}\n${stdout}`);
        }
        if (Date.now() >= deadline) throw new Error(`native promotion was not observed: ${stderr}\n${stdout}`);
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
      }
      // The wrapped result resolves only after the native supervisor closes,
      // so its database writes and file promotion are complete at this point.
      cg = await CodeGraph.open(projectRoot);
      expect(cg.getFile('new.ts')).not.toBeNull();
      db = createDatabase(dbPath).db;
      db.prepare(
        'UPDATE embedding_queue SET status = ?, attempts = 1, started_at = ? WHERE file_path = ?',
      ).run('in_progress', Date.now(), 'old.ts');
      db.close();
      cg.close();
      cg = undefined;
      // Native promotion is already visible. Simulate the subsequent
      // finalization failing, not a native indexing or promotion failure.
      fs.writeFileSync(failureFlagPath, 'fail\n');
      fs.writeFileSync(resumePath, 'resume\n');
      resumed = true;
      const status = await exited;
      expect(status, `${stderr}\n${stdout}`).toBe(1);
      cg = await CodeGraph.open(projectRoot);
      const newFile = cg.getFile('new.ts');
      expect(newFile).not.toBeNull();
      const expectedQueue = cg.getFiles()
        .map((file) => ({ filePath: file.path, contentHash: file.contentHash, status: 'pending' }))
        .sort((a, b) => (a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0)
          || (a.contentHash < b.contentHash ? -1 : a.contentHash > b.contentHash ? 1 : 0));
      expect(expectedQueue.length).toBeGreaterThanOrEqual(2);
      expect(cg.getEmbeddingQueueSnapshot()).toEqual(expectedQueue);
    } finally {
      if (replacement.exitCode === null) {
        if (!resumed) fs.writeFileSync(resumePath, 'resume\n');
        await Promise.race([
          exited,
          new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
        ]);
        if (replacement.exitCode === null) await stopHelper(replacement);
      }
      cg?.close();
      cg = undefined;
    }
  }, 60_000);

  it('rebuilds an empty queue when the CLI promotes an empty index', async () => {
    db.close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
    const cliArgs = ['index', projectRoot, '--engine', 'rust', '--quiet'];
    const initial = spawnSync(process.execPath, [
      path.resolve(__dirname, '../dist/bin/zcodegraph.js'), ...cliArgs,
    ], {
      cwd: projectRoot,
      env: { ...process.env, NODE_OPTIONS: '', ZCG_ENABLE_EMBEDDING: '0', ZCG_NO_RELAUNCH: '1' },
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(initial.status, initial.stderr).toBe(0);
    cg = await CodeGraph.open(projectRoot);
    expect(cg.getFile('old.ts')).not.toBeNull();
    db = createDatabase(dbPath).db;
    db.prepare(
      'UPDATE embedding_queue SET status = ?, attempts = 1, started_at = ? WHERE file_path = ?',
    ).run('in_progress', Date.now(), 'old.ts');
    expect(cg.getEmbeddingQueueSnapshot()).toEqual([
      { filePath: 'old.ts', contentHash: cg.getFile('old.ts')!.contentHash, status: 'in_progress' },
    ]);
    db.close();
    cg.close();
    cg = undefined;
    db = createDatabase(dbPath).db;
    expect(db.prepare('SELECT status, attempts FROM embedding_queue WHERE file_path = ?').get('old.ts')).toEqual({
      status: 'in_progress', attempts: 1,
    });
    db.close();
    fs.rmSync(path.join(projectRoot, 'old.ts'));

    const replacement = spawnSync(process.execPath, [
      path.resolve(__dirname, '../dist/bin/zcodegraph.js'), ...cliArgs,
    ], {
      cwd: projectRoot,
      env: { ...process.env, NODE_OPTIONS: '', ZCG_ENABLE_EMBEDDING: '0', ZCG_NO_RELAUNCH: '1' },
      encoding: 'utf8',
      timeout: 60_000,
    });
    const replacementDb = createDatabase(dbPath).db;
    const afterCliQueue = replacementDb.prepare(
      'SELECT file_path, content_hash, status, attempts FROM embedding_queue',
    ).all();
    replacementDb.close();

    expect(replacement.status, `${replacement.stderr}\n${JSON.stringify(afterCliQueue)}`).toBe(0);
    cg = await CodeGraph.open(projectRoot);
    expect(cg.getFile('old.ts')).toBeNull();
    // Even on the zero-file early return, promotion installs the new DB,
    // whose queue is empty; no claimed row from the old DB may survive.
    expect(cg.getEmbeddingQueueSnapshot(), JSON.stringify(afterCliQueue)).toEqual([]);
  }, 30_000);
});
