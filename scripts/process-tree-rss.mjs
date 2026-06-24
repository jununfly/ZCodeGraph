import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export function sampleProcessTreeRssBytes(rootPid, options = {}) {
  if (!Number.isFinite(rootPid)) {
    return { peakRssBytes: null, unavailableKind: 'process-ended-before-sample', unavailableReason: 'process pid is unavailable' };
  }

  const procSample = sampleProcessTreeRssBytesFromProc(rootPid, options);
  if (procSample.peakRssBytes != null || procSample.unavailableReason == null) {
    return { ...procSample, source: procSample.peakRssBytes != null ? 'procfs' : null };
  }

  const psCommand = options.psCommand ?? process.env.ZCODEGRAPH_RSS_PS_COMMAND ?? 'ps';
  const result = spawnSync(psCommand, ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf-8' });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    return {
      peakRssBytes: null,
      unavailableKind: /EPERM|operation not permitted/i.test(message) ? 'process-list-sandboxed' : 'unknown',
      unavailableReason: /EPERM|operation not permitted/i.test(message)
        ? `RSS sampling unavailable: process-list access is sandboxed (${message})`
        : `RSS sampling unavailable: ${message}`,
    };
  }
  if (result.status !== 0) {
    const message = result.stderr?.trim() || '`ps -axo pid=,ppid=,rss=` failed';
    return {
      peakRssBytes: null,
      unavailableKind: /EPERM|operation not permitted/i.test(message) ? 'process-list-sandboxed' : 'unknown',
      unavailableReason: /EPERM|operation not permitted/i.test(message)
        ? `RSS sampling unavailable: process-list access is sandboxed (${message})`
        : `RSS sampling unavailable: ${message}`,
    };
  }

  const rows = result.stdout.trim().split('\n').map((line) => {
    const [pid, ppid, rssKb] = line.trim().split(/\s+/).map(Number);
    return { pid, ppid, rssKb };
  }).filter((row) => (
    Number.isFinite(row.pid) &&
    Number.isFinite(row.ppid) &&
    Number.isFinite(row.rssKb)
  ));
  if (rows.length === 0) {
    return { peakRssBytes: null, unavailableKind: 'process-ended-before-sample', unavailableReason: 'process RSS sample returned no rows' };
  }

  const children = new Map();
  for (const row of rows) {
    const list = children.get(row.ppid) ?? [];
    list.push(row.pid);
    children.set(row.ppid, list);
  }

  const wanted = new Set([rootPid]);
  const queue = [rootPid];
  while (queue.length > 0) {
    const pid = queue.shift();
    for (const child of children.get(pid) ?? []) {
      if (wanted.has(child)) continue;
      wanted.add(child);
      queue.push(child);
    }
  }

  let totalKb = 0;
  for (const row of rows) {
    if (wanted.has(row.pid)) totalKb += row.rssKb;
  }
  return totalKb > 0
    ? { peakRssBytes: totalKb * 1024, source: 'process-tree', unavailableKind: null, unavailableReason: null }
    : { peakRssBytes: null, unavailableKind: 'process-ended-before-sample', unavailableReason: 'process tree RSS sample was zero' };
}

export function sampleProcessTreeRssBytesFromProc(rootPid, options = {}) {
  const procRoot = options.procRoot ?? process.env.ZCODEGRAPH_RSS_PROC_ROOT ?? '/proc';
  if (!Number.isFinite(rootPid)) {
    return { peakRssBytes: null, unavailableKind: 'process-ended-before-sample', unavailableReason: 'process pid is unavailable' };
  }
  if (!fs.existsSync(procRoot)) {
    return { peakRssBytes: null, unavailableKind: 'procfs-unavailable', unavailableReason: `procfs RSS sampling unavailable: ${procRoot} not found` };
  }

  let entries;
  try {
    entries = fs.readdirSync(procRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map((entry) => Number(entry.name));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { peakRssBytes: null, unavailableKind: 'procfs-unavailable', unavailableReason: `procfs RSS sampling unavailable: ${message}` };
  }

  const rows = [];
  for (const pid of entries) {
    const row = readProcStatus(procRoot, pid);
    if (row) rows.push(row);
  }
  if (rows.length === 0) {
    return { peakRssBytes: null, unavailableKind: 'process-ended-before-sample', unavailableReason: 'procfs RSS sample returned no process rows' };
  }

  const children = new Map();
  for (const row of rows) {
    const list = children.get(row.ppid) ?? [];
    list.push(row.pid);
    children.set(row.ppid, list);
  }

  const wanted = new Set([rootPid]);
  const queue = [rootPid];
  while (queue.length > 0) {
    const pid = queue.shift();
    for (const child of children.get(pid) ?? []) {
      if (wanted.has(child)) continue;
      wanted.add(child);
      queue.push(child);
    }
  }

  let totalKb = 0;
  for (const row of rows) {
    if (wanted.has(row.pid)) totalKb += row.rssKb;
  }
  return totalKb > 0
    ? { peakRssBytes: totalKb * 1024, source: 'procfs', unavailableKind: null, unavailableReason: null }
    : { peakRssBytes: null, unavailableKind: 'process-ended-before-sample', unavailableReason: 'procfs process tree RSS sample was zero' };
}

function readProcStatus(procRoot, pid) {
  try {
    const status = fs.readFileSync(path.join(procRoot, String(pid), 'status'), 'utf-8');
    const ppid = Number(status.match(/^PPid:\s+(\d+)/m)?.[1]);
    const rssKb = Number(status.match(/^VmRSS:\s+(\d+)\s+kB/m)?.[1] ?? 0);
    if (!Number.isFinite(ppid) || !Number.isFinite(rssKb)) return null;
    return { pid, ppid, rssKb };
  } catch {
    return null;
  }
}

export function spawnMeasured(command, args, options = {}) {
  if (options.rssMode === 'command') {
    return spawnMeasuredCommandRss(command, args, options);
  }

  const cwd = options.cwd ?? process.cwd();
  const env = { ...process.env, ...(options.env ?? {}) };
  const sampleIntervalMs = options.sampleIntervalMs ?? 50;
  const timeoutMs = options.timeoutMs ?? null;

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let peakRssBytes = 0;
    let rssUnavailableReason = null;
    const sample = () => {
      const rss = sampleProcessTreeRssBytes(child.pid, options);
      if (rss.peakRssBytes != null && rss.peakRssBytes > peakRssBytes) {
        peakRssBytes = rss.peakRssBytes;
        rssUnavailableReason = null;
      } else if (peakRssBytes === 0 && rss.unavailableReason) {
        rssUnavailableReason = rss.unavailableReason;
      }
      options.onSample?.({
        elapsedMs: Date.now() - startedAt,
        stdout,
        stderr,
        peakRssBytes: peakRssBytes || null,
        rssSource: peakRssBytes > 0 ? 'process-tree' : null,
        rssUnavailableKind: peakRssBytes > 0 ? null : (rss.unavailableKind ?? null),
        rssUnavailableReason: peakRssBytes > 0 ? null : rssUnavailableReason,
      });
    };
    const timer = setInterval(sample, sampleIntervalMs);
    let timedOut = false;
    const timeout = timeoutMs == null ? null : setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    sample();

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf-8'); });
    child.on('close', (code, signal) => {
      sample();
      clearInterval(timer);
      if (timeout) clearTimeout(timeout);
      resolve({
        code,
        signal,
        timedOut,
        stdout,
        stderr,
        wallMs: Date.now() - startedAt,
        peakRssBytes: peakRssBytes || null,
        rssSource: peakRssBytes > 0 ? 'process-tree' : null,
        rssUnavailableKind: peakRssBytes > 0 ? null : 'process-ended-before-sample',
        rssUnavailableReason: peakRssBytes > 0
          ? null
          : (rssUnavailableReason ?? 'RSS sampling did not capture a live process tree'),
      });
    });
  });
}

function spawnMeasuredCommandRss(command, args, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = { ...process.env, ...(options.env ?? {}) };
  const timeCommand = options.timeCommand ?? process.env.ZCODEGRAPH_RSS_TIME_COMMAND ?? (
    process.platform === 'darwin' ? '/usr/bin/time' : null
  );

  if (!timeCommand) {
    return Promise.resolve({
      code: null,
      signal: null,
      stdout: '',
      stderr: '',
      wallMs: 0,
      peakRssBytes: null,
      rssSource: null,
      rssUnavailableKind: 'command-wrapper-unavailable',
      rssUnavailableReason: 'command RSS sampling unavailable: no time-compatible command is configured',
    });
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timeoutMs = options.timeoutMs ?? null;
    const timeArgs = process.platform === 'darwin' && timeCommand === '/usr/bin/time'
      ? ['-l', command, ...args]
      : [command, ...args];
    const child = spawn(timeCommand, timeArgs, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timeout = timeoutMs == null ? null : setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf-8'); });
    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      const message = error instanceof Error ? error.message : String(error);
      resolve({
        code: null,
        signal: null,
        timedOut,
        stdout,
        stderr,
        wallMs: Date.now() - startedAt,
        peakRssBytes: null,
        rssSource: null,
        rssUnavailableKind: 'command-wrapper-unavailable',
        rssUnavailableReason: `command RSS sampling unavailable: ${message}`,
      });
    });
    child.on('close', (code, signal) => {
      if (timeout) clearTimeout(timeout);
      const peakRssBytes = parseCommandPeakRssBytes(stderr);
      resolve({
        code,
        signal,
        timedOut,
        stdout,
        stderr,
        wallMs: Date.now() - startedAt,
        peakRssBytes,
        rssSource: peakRssBytes == null ? null : 'command',
        rssUnavailableKind: peakRssBytes == null ? 'command-wrapper-no-rss' : null,
        rssUnavailableReason: peakRssBytes == null
          ? 'command RSS sampling did not report maximum resident set size'
          : null,
      });
    });
  });
}

export function parseCommandPeakRssBytes(stderr) {
  const darwin = stderr.match(/^\s*(\d+)\s+maximum resident set size\s*$/m);
  if (darwin) return Number(darwin[1]);
  const gnuKb = stderr.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  if (gnuKb) return Number(gnuKb[1]) * 1024;
  return null;
}
