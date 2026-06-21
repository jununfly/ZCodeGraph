import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export function sampleProcessTreeRssBytes(rootPid, options = {}) {
  if (!Number.isFinite(rootPid)) {
    return { peakRssBytes: null, unavailableReason: 'process pid is unavailable' };
  }

  const procSample = sampleProcessTreeRssBytesFromProc(rootPid, options);
  if (procSample.peakRssBytes != null || procSample.unavailableReason == null) {
    return procSample;
  }

  const psCommand = options.psCommand ?? process.env.ZCODEGRAPH_RSS_PS_COMMAND ?? 'ps';
  const result = spawnSync(psCommand, ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf-8' });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    return {
      peakRssBytes: null,
      unavailableReason: /EPERM|operation not permitted/i.test(message)
        ? `RSS sampling unavailable: process-list access is sandboxed (${message})`
        : `RSS sampling unavailable: ${message}`,
    };
  }
  if (result.status !== 0) {
    const message = result.stderr?.trim() || '`ps -axo pid=,ppid=,rss=` failed';
    return {
      peakRssBytes: null,
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
    return { peakRssBytes: null, unavailableReason: 'process RSS sample returned no rows' };
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
    ? { peakRssBytes: totalKb * 1024, unavailableReason: null }
    : { peakRssBytes: null, unavailableReason: 'process tree RSS sample was zero' };
}

export function sampleProcessTreeRssBytesFromProc(rootPid, options = {}) {
  const procRoot = options.procRoot ?? process.env.ZCODEGRAPH_RSS_PROC_ROOT ?? '/proc';
  if (!Number.isFinite(rootPid)) {
    return { peakRssBytes: null, unavailableReason: 'process pid is unavailable' };
  }
  if (!fs.existsSync(procRoot)) {
    return { peakRssBytes: null, unavailableReason: `procfs RSS sampling unavailable: ${procRoot} not found` };
  }

  let entries;
  try {
    entries = fs.readdirSync(procRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map((entry) => Number(entry.name));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { peakRssBytes: null, unavailableReason: `procfs RSS sampling unavailable: ${message}` };
  }

  const rows = [];
  for (const pid of entries) {
    const row = readProcStatus(procRoot, pid);
    if (row) rows.push(row);
  }
  if (rows.length === 0) {
    return { peakRssBytes: null, unavailableReason: 'procfs RSS sample returned no process rows' };
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
    ? { peakRssBytes: totalKb * 1024, unavailableReason: null }
    : { peakRssBytes: null, unavailableReason: 'procfs process tree RSS sample was zero' };
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
  const cwd = options.cwd ?? process.cwd();
  const env = { ...process.env, ...(options.env ?? {}) };
  const sampleIntervalMs = options.sampleIntervalMs ?? 50;

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
    };
    const timer = setInterval(sample, sampleIntervalMs);
    sample();

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf-8'); });
    child.on('close', (code, signal) => {
      sample();
      clearInterval(timer);
      resolve({
        code,
        signal,
        stdout,
        stderr,
        wallMs: Date.now() - startedAt,
        peakRssBytes: peakRssBytes || null,
        rssUnavailableReason: peakRssBytes > 0
          ? null
          : (rssUnavailableReason ?? 'RSS sampling did not capture a live process tree'),
      });
    });
  });
}
