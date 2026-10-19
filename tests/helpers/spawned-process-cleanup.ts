import type { ChildProcess } from 'child_process';
import * as fs from 'fs';

export interface TerminateSpawnedProcessOptions {
  signal?: NodeJS.Signals;
  fallbackSignal?: NodeJS.Signals;
  timeoutMs?: number;
}

export interface RemoveTempDirOptions {
  retries?: number;
  delayMs?: number;
  removeDir?: typeof fs.rmSync;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientRemoveError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false;
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY';
}

async function waitForClose(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    const done = () => {
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.off('close', done);
      child.off('error', done);
    };

    child.once('close', done);
    child.once('error', done);
  });
}

export async function terminateSpawnedProcess(
  child: ChildProcess | null | undefined,
  options: TerminateSpawnedProcessOptions = {},
): Promise<void> {
  if (!child) return;

  const signal = options.signal ?? 'SIGTERM';
  const fallbackSignal = options.fallbackSignal ?? 'SIGKILL';
  const timeoutMs = options.timeoutMs ?? 5000;
  const alreadyExited = child.exitCode !== null || child.signalCode !== null;
  const closePromise = waitForClose(child, alreadyExited ? Math.min(timeoutMs, 100) : timeoutMs);

  if (!alreadyExited && !child.killed) {
    child.kill(signal);
  }

  const closed = await closePromise;
  if (closed) return;

  if (child.exitCode === null && child.signalCode === null) {
    child.kill(fallbackSignal);
  }
  await waitForClose(child, timeoutMs);
}

export async function removeTempDirWithRetries(
  dir: string | null | undefined,
  options: RemoveTempDirOptions = {},
): Promise<void> {
  if (!dir || !fs.existsSync(dir)) return;

  const retries = options.retries ?? 5;
  const delayMs = options.delayMs ?? 100;
  const removeDir = options.removeDir ?? fs.rmSync;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      removeDir(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === retries || !isTransientRemoveError(error)) throw error;
      await delay(delayMs);
    }
  }
}

export async function cleanupSpawnedProcessAndTempDirs(
  child: ChildProcess | null | undefined,
  dirs: Array<string | null | undefined>,
): Promise<void> {
  await terminateSpawnedProcess(child);
  for (const dir of dirs) {
    await removeTempDirWithRetries(dir);
  }
}
