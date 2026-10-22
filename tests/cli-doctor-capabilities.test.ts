/**
 * zcodegraph doctor capabilities.json [--upstream-check] — e2e (roadmap 1-2-8-4)
 *
 * Synthesizes capability-probes artifacts on disk (no network, no corpus
 * clone) and asserts the doctor consumption path:
 *   - a healthy report exits 0 and prints per-domain states
 *   - a report containing a failed domain exits 1
 *   - --json emits a machine-readable summary
 *   - --upstream-check runs offline artifact checks (wasm + rust core) and
 *     reports their states
 *   - --upstream-check without the capabilities.json form is rejected
 *   - a malformed artifact fails with a clear error
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    },
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function probeReport(state: 'healthy' | 'degraded' | 'failed') {
  const domainState = state === 'failed' ? 'failed' : state;
  return {
    metric: 'capability-probes',
    repo: 'fixture/fixture',
    ref: 'probe-dir',
    measuredAt: '2026-10-22T00:00:00.000Z',
    value: {
      overall: state,
      pass: state !== 'failed',
      domains: {
        extraction: { state: 'healthy', latencyMs: 10, detail: 'ok (status --json)' },
        resolution: { state: domainState, latencyMs: 5, detail: domainState === 'failed' ? 'callers probe blew up' : 'ok (callers)' },
      },
      probesTotalMs: 15,
    },
    evidence: { platform: 'test' },
  };
}

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-doctor-cap-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeReport(name: string, payload: unknown): string {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

describe('zcodegraph doctor capabilities.json', () => {
  it('exits 0 and prints per-domain states for a healthy report', () => {
    const file = writeReport('healthy-capabilities.json', probeReport('healthy'));
    const r = runCli(['doctor', file], REPO_ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Overall: healthy (pass)');
    expect(r.stdout).toContain('[healthy] extraction');
    expect(r.stdout).toContain('[healthy] resolution');
  });

  it('exits 1 when any domain is failed', () => {
    const file = writeReport('failed-capabilities.json', probeReport('failed'));
    const r = runCli(['doctor', file], REPO_ROOT);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('[failed] resolution');
  });

  it('emits a machine-readable summary with --json', () => {
    const file = writeReport('json-capabilities.json', probeReport('healthy'));
    const r = runCli(['doctor', file, '--json'], REPO_ROOT);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.pass).toBe(true);
    expect(parsed.overall).toBe('healthy');
    expect(parsed.domains.extraction.state).toBe('healthy');
  });

  it('runs offline upstream artifact checks with --upstream-check', () => {
    const file = writeReport('upstream-capabilities.json', probeReport('healthy'));
    const r = runCli(['doctor', file, '--upstream-check'], REPO_ROOT);
    // The repo checkout has dist wasm assets (npm run build) and a rust core
    // binary (target/debug or packaged bin), so both checks should report
    // healthy here; the key assertion is the upstream section renders and
    // the run passes.
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Upstream artifact checks (offline):');
    expect(r.stdout).toContain('wasm-assets');
    expect(r.stdout).toContain('rust-core');
  });

  it('rejects --upstream-check without the capabilities.json form', () => {
    const r = runCli(['doctor', '--upstream-check', '--bundle', '--last-run'], REPO_ROOT);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('--upstream-check requires the capabilities.json form');
  });

  it('fails with a clear error on a malformed artifact', () => {
    const file = writeReport('malformed-capabilities.json', { metric: 'something-else', value: {} });
    const r = runCli(['doctor', file], REPO_ROOT);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("expected 'capability-probes'");
  });
});
