import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CodeGraph } from '../src/index';
import {
  acquireExclusiveReplacementGate,
  ReplacementGateBusyError,
  type NativeReplacementLease,
} from '../src/embedding/replacement-gate';
import { findRustCoreCommand } from '../src/indexing/rust-indexer';
import { readIndexWriteLeaseDiagnostics } from '../src/indexing/index-write-lease';
import { removeTempDirWithRetries } from './helpers/spawned-process-cleanup';

const REPO_ROOT = path.resolve(__dirname, '..');
const OWNER_FIXTURE = path.join(__dirname, 'fixtures/supervised-index-owner.cjs');
const WRITER_FIXTURE = path.join(
  REPO_ROOT,
  'target/debug',
  process.platform === 'win32' ? 'supervised-writer-fixture.exe' : 'supervised-writer-fixture',
);

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(file: string): number {
  const pid = Number(fs.readFileSync(file, 'utf8').trim());
  expect(Number.isSafeInteger(pid)).toBe(true);
  expect(pid).toBeGreaterThan(0);
  return pid;
}

function killOwnedProcess(pid: number | undefined): void {
  if (!pid || pid === process.pid || !processAlive(pid)) return;
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // The supervised process may already have exited.
  }
}

describe('native process supervision and crash recovery', () => {
  let projectRoot: string;
  let dbPath: string;
  let owner: ChildProcess | undefined;
  let ownerStderr = '';
  let gate: NativeReplacementLease | undefined;
  const ownedPids = new Set<number>();

  beforeEach(() => {
    expect(fs.existsSync(WRITER_FIXTURE), 'run cargo build --package zcodegraph-core --bins').toBe(true);
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-process-supervision-'));
    dbPath = path.join(projectRoot, '.zcodegraph', 'zcodegraph.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    CodeGraph.initSync(projectRoot).close();
    fs.writeFileSync(path.join(projectRoot, 'old.ts'), 'export function oldIndex(): number { return 1; }\n');
  });

  afterEach(async () => {
    if (owner && owner.exitCode === null && owner.signalCode === null) {
      killOwnedProcess(owner.pid);
      await new Promise<void>((resolve) => owner!.once('close', () => resolve()));
    }
    await gate?.release();
    for (const pid of ownedPids) killOwnedProcess(pid);
    await removeTempDirWithRetries(projectRoot);
  });

  function spawnOwner(args: string[]): ChildProcess {
    owner = spawn(process.execPath, [OWNER_FIXTURE, ...args], {
      cwd: projectRoot,
      env: { ...process.env, NODE_OPTIONS: '', ZCG_ENABLE_EMBEDDING: '0', ZCG_RUST_CORE_TEST_SLEEP_MS: '15000' },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    owner.stderr.on('data', (chunk) => { ownerStderr += chunk.toString(); });
    ownedPids.add(owner.pid!);
    return owner;
  }

  async function killOwnerAndWait(child: ChildProcess): Promise<void> {
    const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
    killOwnedProcess(child.pid);
    await closed;
  }

  async function expectGateBusy(): Promise<void> {
    await expect(acquireExclusiveReplacementGate(dbPath, 0)).rejects.toBeInstanceOf(ReplacementGateBusyError);
  }

  async function expectGateRecovered(): Promise<void> {
    gate = await acquireExclusiveReplacementGate(dbPath, 0);
    await gate.release();
    gate = undefined;
  }

  it.each(['parent-sigkill', 'channel-eof'] as const)(
    'stops real SQLite descendant writes and reclaims the gate after %s',
    async (failure) => {
      const writerDb = path.join(projectRoot, 'writer.db');
      const writerState = path.join(projectRoot, 'writer-state.json');
      const supervisorPidPath = path.join(projectRoot, 'supervisor.pid');
      const child = spawnOwner(['writer-fixture', projectRoot, WRITER_FIXTURE, writerDb, writerState]);
      await vi.waitFor(() => {
        expect(fs.existsSync(writerState), ownerStderr).toBe(true);
      }, { timeout: 10_000 });
      await vi.waitFor(() => {
        const state = JSON.parse(fs.readFileSync(writerState, 'utf8')) as { count: number };
        expect(state.count).toBeGreaterThan(3);
      });
      const supervisorPid = readPid(supervisorPidPath);
      const writerPid = (JSON.parse(fs.readFileSync(writerState, 'utf8')) as { pid: number }).pid;
      ownedPids.add(supervisorPid);
      ownedPids.add(writerPid);
      await expectGateBusy();

      if (failure === 'parent-sigkill') {
        await killOwnerAndWait(child);
      } else {
        const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
        child.stdin.end();
        await closed;
      }
      await vi.waitFor(() => {
        expect(processAlive(supervisorPid), ownerStderr).toBe(false);
        expect(processAlive(writerPid), ownerStderr).toBe(false);
      }, { timeout: 10_000 });
      const stoppedCount = (JSON.parse(fs.readFileSync(writerState, 'utf8')) as { count: number }).count;
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(JSON.parse(fs.readFileSync(writerState, 'utf8')).count).toBe(stoppedCount);
      const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
      const db = new DatabaseSync(writerDb);
      const committedCount = () => (
        db.prepare('SELECT COUNT(*) AS count FROM writes').get() as { count: number }
      ).count;
      try {
        const committedAtDeath = committedCount();
        expect(committedAtDeath).toBeGreaterThanOrEqual(stoppedCount + 1);
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(committedCount()).toBe(committedAtDeath);
      } finally {
        db.close();
      }
      await expectGateRecovered();
    },
    30_000,
  );

  it.each(['parent-sigkill', 'channel-eof'] as const)(
    'reaps the real production native writer and preserves the active DB after %s',
    async (failure) => {
      let cg = await CodeGraph.open(projectRoot);
      expect((await cg.indexAll({ engine: 'rust' })).success).toBe(true);
      await cg.closeAndWait();
      fs.writeFileSync(path.join(projectRoot, 'new.ts'), 'export function newIndex(): number { return 2; }\n');
      const supervisorPidPath = path.join(projectRoot, 'supervisor.pid');
      const legacyLockPath = path.join(projectRoot, '.zcodegraph', 'zcodegraph.lock');
      const child = spawnOwner(['production-index', projectRoot]);
      await vi.waitFor(() => {
        expect(fs.existsSync(legacyLockPath), ownerStderr).toBe(true);
        expect(fs.existsSync(supervisorPidPath), ownerStderr).toBe(true);
      }, { timeout: 10_000 });
      const supervisorPid = readPid(supervisorPidPath);
      const leaseDiagnostics = readIndexWriteLeaseDiagnostics(projectRoot);
      expect(leaseDiagnostics.state, ownerStderr).toBe('active-writer');
      const writerPid = leaseDiagnostics.owner!.pid;
      ownedPids.add(supervisorPid);
      ownedPids.add(writerPid);
      expect(writerPid).not.toBe(supervisorPid);
      expect(processAlive(writerPid)).toBe(true);
      await expectGateBusy();

      if (failure === 'parent-sigkill') {
        await killOwnerAndWait(child);
      } else {
        child.stdin.end();
        await vi.waitFor(() => {
          expect(child.exitCode, ownerStderr).toBe(2);
        });
        await expectGateRecovered();
      }

      await vi.waitFor(() => {
        expect(processAlive(supervisorPid), ownerStderr).toBe(false);
        expect(processAlive(writerPid), ownerStderr).toBe(false);
      }, { timeout: 10_000 });
      await expectGateRecovered();
      cg = await CodeGraph.open(projectRoot);
      expect(cg.getFile('old.ts')).not.toBeNull();
      expect(cg.getFile('new.ts')).toBeNull();
      // This also exercises the existing stale legacy-lock recovery separately
      // from the OS-backed replacement gate acquired above.
      expect((await cg.indexAll({ engine: 'rust' })).success).toBe(true);
      expect(cg.getFile('new.ts')).not.toBeNull();
      await cg.closeAndWait();
    },
    45_000,
  );
});
