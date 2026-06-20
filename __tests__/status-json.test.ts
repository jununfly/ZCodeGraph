/**
 * Tests for the CI/scripting fields `zcodegraph status --json` exposes (issue
 * #329): the `version`, `indexPath`, and `lastIndexed` fields, plus the
 * matching `CodeGraph.getLastIndexedAt()` library method.
 *
 * The CLI itself is exercised end-to-end against the built binary so the JSON
 * field names survive future refactors of the underlying plumbing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CodeGraph } from '../src';

const BIN = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
).version as string;

function runStatusJson(cwd: string, env: Record<string, string | undefined> = {}): Record<string, unknown> {
  const stdout = execFileSync(process.execPath, [BIN, 'status', '--json'], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...env, CODEGRAPH_NO_DAEMON: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // JSON mode prints exactly one line to stdout; be defensive about any stray
  // leading output by parsing the last non-empty line.
  const line = stdout.trim().split('\n').filter(Boolean).pop()!;
  return JSON.parse(line);
}

function runStatusText(cwd: string): string {
  return execFileSync(process.execPath, [BIN, 'status'], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, CODEGRAPH_NO_DAEMON: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function writeFakeRustCore(dir: string): string {
  const file = path.join(dir, process.platform === 'win32' ? 'zcodegraph-core.cmd' : 'zcodegraph-core');
  fs.writeFileSync(
    file,
    process.platform === 'win32'
      ? '@echo off\necho zcodegraph-core fake 1.2.3\n'
      : '#!/bin/sh\necho zcodegraph-core fake 1.2.3\n',
  );
  fs.chmodSync(file, 0o755);
  return file;
}

describe('zcodegraph status --json — CI fields (#329)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-status-json-'));
  });
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('getLastIndexedAt() is null before indexing and a recent ms timestamp after', async () => {
    const cg = CodeGraph.initSync(tempDir);
    expect(cg.getLastIndexedAt()).toBeNull();

    fs.writeFileSync(path.join(tempDir, 'a.ts'), 'export const x = 1;\n');
    const before = Date.now();
    await cg.indexAll({ engine: 'typescript' });
    const after = Date.now();

    const last = cg.getLastIndexedAt();
    expect(last).not.toBeNull();
    expect(typeof last).toBe('number');
    expect(last!).toBeGreaterThanOrEqual(before - 1000);
    expect(last!).toBeLessThanOrEqual(after + 1000);
    cg.close();
  });

  it('status --json on an UNINITIALIZED project reports version + indexPath + lastIndexed:null', () => {
    const out = runStatusJson(tempDir);
    expect(out.initialized).toBe(false);
    expect(out.version).toBe(PKG_VERSION);
    expect(typeof out.indexPath).toBe('string');
    expect(out.indexPath as string).toContain('.zcodegraph');
    expect(out.lastIndexed).toBeNull();
    expect((out as { rust: { configuredEngine: { engine: string; source: string } } }).rust.configuredEngine)
      .toMatchObject({ engine: 'rust-hybrid', source: 'default' });
  });

  it('status --json on an INDEXED project reports version + indexPath + a round-trippable lastIndexed', async () => {
    fs.writeFileSync(path.join(tempDir, 'a.ts'), 'export const x = 1;\n');
    const before = Date.now();
    const cg = CodeGraph.initSync(tempDir);
    await cg.indexAll({ engine: 'typescript' });
    const after = Date.now();
    cg.close();

    const out = runStatusJson(tempDir);
    expect(out.initialized).toBe(true);
    expect(out.version).toBe(PKG_VERSION);
    expect(out.indexPath as string).toContain('.zcodegraph');
    expect(typeof out.lastIndexed).toBe('string');
    // ISO string that round-trips back into the index window.
    const ms = Date.parse(out.lastIndexed as string);
    expect(ms).toBeGreaterThanOrEqual(before - 1000);
    expect(ms).toBeLessThanOrEqual(after + 1000);
  });

  it('status --json reports local Rust readiness diagnostics for a missing Rust core override', () => {
    const cg = CodeGraph.initSync(tempDir);
    cg.close();
    const missingCore = path.join(tempDir, 'missing-zcodegraph-core');

    const out = runStatusJson(tempDir, {
      ZCODEGRAPH_RUST_CORE_BINARY: missingCore,
    }) as {
      rust: {
        configuredEngine: { engine: string; source: string };
        core: {
          available: boolean;
          discoverySource: string;
          attemptedCommand: string;
          versionCheck: { ok: boolean; error: string };
        };
        lastIndex: { engine: string | null; engineVersion: string | null };
        latestProfile: unknown;
        experimental: {
          candidateProducerRouting: { enabled: boolean; source: string };
        };
      };
    };

    expect(out.rust.configuredEngine).toMatchObject({ engine: 'rust-hybrid', source: 'default' });
    expect(out.rust.core.available).toBe(false);
    expect(out.rust.core.discoverySource).toBe('env');
    expect(out.rust.core.attemptedCommand).toBe(missingCore);
    expect(out.rust.core.versionCheck.ok).toBe(false);
    expect(out.rust.core.versionCheck.error).toContain('does not exist');
    expect(out.rust.lastIndex.engine).toBeNull();
    expect(out.rust.lastIndex.engineVersion).toBeNull();
    expect(out.rust.latestProfile).toBeNull();
    expect(out.rust.experimental.candidateProducerRouting).toEqual({
      enabled: false,
      source: 'missing-config',
    });
  });

  it('status --json reports experimental Rust candidate producer routing local config state', () => {
    const cg = CodeGraph.initSync(tempDir);
    cg.close();

    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'config.json'),
      JSON.stringify({ experimental: { rustCandidateProducerRouting: true } }, null, 2),
    );
    expect((runStatusJson(tempDir) as { rust: { experimental: { candidateProducerRouting: unknown } } }).rust.experimental.candidateProducerRouting)
      .toEqual({ enabled: true, source: 'local-config' });

    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'config.json'),
      JSON.stringify({ experimental: { rustCandidateProducerRouting: false } }, null, 2),
    );
    expect((runStatusJson(tempDir) as { rust: { experimental: { candidateProducerRouting: unknown } } }).rust.experimental.candidateProducerRouting)
      .toEqual({ enabled: false, source: 'local-config' });

    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'config.json'),
      JSON.stringify({ experimental: { rustCandidateProducerRouting: 'yes' } }, null, 2),
    );
    expect((runStatusJson(tempDir) as { rust: { experimental: { candidateProducerRouting: unknown } } }).rust.experimental.candidateProducerRouting)
      .toEqual({ enabled: false, source: 'invalid-local-config' });

    fs.writeFileSync(path.join(tempDir, '.zcodegraph', 'config.json'), '{');
    expect((runStatusJson(tempDir) as { rust: { experimental: { candidateProducerRouting: unknown } } }).rust.experimental.candidateProducerRouting)
      .toEqual({ enabled: false, source: 'invalid-local-config' });
  });

  it('status --json reports Rust core binary override readiness when the binary is executable', () => {
    const cg = CodeGraph.initSync(tempDir);
    cg.close();
    const rustCore = writeFakeRustCore(tempDir);

    const out = runStatusJson(tempDir, {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    }) as {
      rust: {
        configuredEngine: { engine: string; source: string };
        core: {
          available: boolean;
          discoverySource: string;
          attemptedCommand: string;
          attemptedArgsPrefix: string[];
          versionCheck: { ok: boolean; stdout: string };
        };
      };
    };

    expect(out.rust.configuredEngine).toMatchObject({ engine: 'rust-hybrid', source: 'default' });
    expect(out.rust.core.available).toBe(true);
    expect(out.rust.core.discoverySource).toBe('env');
    expect(out.rust.core.attemptedCommand).toBe(rustCore);
    expect(out.rust.core.attemptedArgsPrefix).toEqual([]);
    expect(out.rust.core.versionCheck.ok).toBe(true);
    expect(out.rust.core.versionCheck.stdout).toContain('zcodegraph-core fake 1.2.3');
  });

  it('status --json includes the latest local Rust profile summary when present', () => {
    const cg = CodeGraph.initSync(tempDir);
    cg.close();
    const profile = {
      generatedAt: '2026-06-13T00:00:00.000Z',
      repos: [{ name: 'zcodegraph' }],
      gates: [{ name: 'profile', passed: true }],
    };
    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'rust-profile-summary.json'),
      JSON.stringify(profile, null, 2),
    );

    const out = runStatusJson(tempDir) as {
      rust: {
        latestProfile: unknown;
      };
    };

    expect(out.rust.latestProfile).toEqual(profile);
  });

  it('normal status output stays quiet about Rust diagnostics', () => {
    const cg = CodeGraph.initSync(tempDir);
    cg.close();

    const out = runStatusText(tempDir);

    expect(out).not.toContain('Rust diagnostics');
    expect(out).not.toContain('discovery source');
    expect(out).not.toContain('attempted command');
  });
});
