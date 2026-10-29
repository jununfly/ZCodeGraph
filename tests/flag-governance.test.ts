import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { toolAllowlist } from '../src/mcp/tools';
import {
  CODE_FLAG_REGISTRY,
  FLAG_REGISTRY,
  PROJECT_EXPERIMENT_LIFECYCLES,
  inspectFlagConfig,
  readBooleanFlag,
  readIntegerFlag,
  readListFlag,
  readTextFlag,
} from '../src/config/flags';

const warn = () => undefined;

describe('ZCG flag registry and typed parsing', () => {
  it('registers exactly the 38 active code environment variables', () => {
    expect(CODE_FLAG_REGISTRY).toHaveLength(38);
    expect(new Set(CODE_FLAG_REGISTRY.map(flag => flag.name)).size).toBe(38);
    expect(FLAG_REGISTRY.every(flag => flag.name.startsWith('ZCG_'))).toBe(true);
    expect(FLAG_REGISTRY.some(flag => flag.name === 'ZCG_INDEX_ENGINE')).toBe(false);
    for (const flag of FLAG_REGISTRY) {
      expect(flag).toMatchObject({
        readTiming: expect.any(String), scope: expect.any(String),
        status: expect.any(String), evidence: expect.any(String), retirement: expect.any(String),
      });
    }
    for (const flag of FLAG_REGISTRY.filter(flag => flag.category === 'experiment')) {
      expect(flag.lifecycle).toMatchObject({
        owner: expect.any(String), metric: expect.any(String),
        evidence: expect.any(String), exit: expect.any(String),
      });
    }
    for (const lifecycle of Object.values(PROJECT_EXPERIMENT_LIFECYCLES)) {
      expect(lifecycle).toMatchObject({
        owner: expect.any(String), metric: expect.any(String),
        evidence: expect.any(String), exit: expect.any(String),
      });
    }
    expect(CODE_FLAG_REGISTRY.some(flag => flag.name === 'rustCandidateProducerRouting')).toBe(false);
  });

  it.each([
    ['1', true], [' TRUE ', true], ['0', false], [' False ', false],
  ])('parses boolean %j as %s', (raw, expected) => {
    expect(readBooleanFlag('ZCG_ENABLE_EMBEDDING', {
      env: { ZCG_ENABLE_EMBEDDING: raw }, onWarning: warn,
    })).toBe(expected);
  });

  it('uses defaults only when unset and does not read retired names', () => {
    const env = {
      CODEGRAPH_ENABLE_EMBEDDING: '1',
      ZCODEGRAPH_CANDIDATE_PROTOCOL: '0',
    };
    expect(readBooleanFlag('ZCG_ENABLE_EMBEDDING', { env, onWarning: warn })).toBe(false);
    expect(readBooleanFlag('ZCG_CANDIDATE_PROTOCOL', { env, onWarning: warn })).toBe(true);
  });

  it.each(['', 'yes', '2', 'truthy'])('warns and falls back for invalid background boolean %j', raw => {
    const warnings: string[] = [];
    expect(readBooleanFlag('ZCG_ENABLE_EMBEDDING', {
      env: { ZCG_ENABLE_EMBEDDING: raw }, onWarning: message => warnings.push(message),
    })).toBe(false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('ZCG_ENABLE_EMBEDDING');
  });

  it('fails fast for invalid safety boundary values', () => {
    expect(() => readBooleanFlag('ZCG_ALLOW_UNSAFE_NODE', {
      env: { ZCG_ALLOW_UNSAFE_NODE: '' }, onWarning: warn,
    })).toThrow(/ZCG_ALLOW_UNSAFE_NODE/);
  });

  it.each(['12abc', '1.5', '-1', '', 'Infinity'])('rejects invalid positive integer %j', raw => {
    expect(readIntegerFlag('ZCG_RESOLVER_CACHE_SIZE', {
      env: { ZCG_RESOLVER_CACHE_SIZE: raw }, onWarning: warn,
    })).toBe(5000);
  });

  it('keeps zero as an explicit watchdog disable value', () => {
    expect(readIntegerFlag('ZCG_PPID_POLL_MS', {
      env: { ZCG_PPID_POLL_MS: '0' }, onWarning: warn,
    })).toBe(0);
  });

  it('enforces the existing watcher debounce range without clamping', () => {
    expect(readIntegerFlag('ZCG_WATCH_DEBOUNCE_MS', {
      env: { ZCG_WATCH_DEBOUNCE_MS: '99' }, onWarning: warn,
    })).toBe(2000);
    expect(readIntegerFlag('ZCG_WATCH_DEBOUNCE_MS', {
      env: { ZCG_WATCH_DEBOUNCE_MS: '100' }, onWarning: warn,
    })).toBe(100);
  });

  it('parses text and comma-separated lists without truthy coercion', () => {
    expect(readTextFlag('ZCG_VERSION', {
      env: { ZCG_VERSION: ' 0.11.0 ' }, onWarning: warn,
    })).toBe('0.11.0');
    expect(readListFlag('ZCG_MCP_TOOLS', {
      env: { ZCG_MCP_TOOLS: ' explore, zcodegraph_search ' }, onWarning: warn,
    })).toEqual(['explore', 'zcodegraph_search']);
    expect(() => readListFlag('ZCG_MCP_TOOLS', {
      env: { ZCG_MCP_TOOLS: ' ' }, onWarning: warn,
    })).toThrow(/ZCG_MCP_TOOLS/);
  });

  it('reports effective values, sources, categories, and invalid inputs without reading old aliases', () => {
    const rows = inspectFlagConfig({
      ZCG_ENABLE_EMBEDDING: 'true',
      ZCG_RESOLVER_CACHE_SIZE: '5x',
      CODEGRAPH_FORCE_WATCH: '1',
    });
    expect(rows.find(row => row.name === 'ZCG_ENABLE_EMBEDDING')).toMatchObject({
      value: true, source: 'environment', category: 'product', valid: true,
    });
    expect(rows.find(row => row.name === 'ZCG_RESOLVER_CACHE_SIZE')).toMatchObject({
      value: 5000, source: 'default', valid: false,
    });
    expect(rows.find(row => row.name === 'ZCG_FORCE_WATCH')).toMatchObject({
      value: false, source: 'default',
    });
  });

  it('distinguishes files from directories and honors a valid explicit Rust core', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-flag-paths-'));
    const file = path.join(dir, 'core');
    fs.writeFileSync(file, 'fake');
    try {
      const rows = inspectFlagConfig({
        ZCG_INSTALL_DIR: dir,
        ZCG_BIN_DIR: dir,
        ZCG_RUST_CORE_BINARY: file,
      }, {
        rustCoreCandidateDirs: [path.join(dir, 'missing-packaged')],
        validateMcpToolAllowlist: toolAllowlist,
      });
      for (const name of ['ZCG_INSTALL_DIR', 'ZCG_BIN_DIR', 'ZCG_RUST_CORE_BINARY']) {
        expect(rows.find(row => row.name === name)).toMatchObject({
          value: '<set>', source: 'environment', valid: true,
        });
      }
      expect(inspectFlagConfig({ ZCG_RUST_CORE_BINARY: dir })
        .find(row => row.name === 'ZCG_RUST_CORE_BINARY')).toMatchObject({ valid: false });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a directory discovered as the default Rust core binary', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-flag-discovery-'));
    const executable = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
    fs.mkdirSync(path.join(dir, executable));
    try {
      expect(inspectFlagConfig({}, { rustCoreCandidateDirs: [dir] })
        .find(row => row.name === 'ZCG_RUST_CORE_BINARY')).toMatchObject({
        value: null, source: 'default', valid: false,
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reuses allowlist, host PID and experiment ID validation in diagnostics', () => {
    const rows = inspectFlagConfig({
      ZCG_MCP_TOOLS: 'not-a-tool',
      ZCG_HOST_PPID: 'not-a-pid',
      ZCG_EXPERIMENT_ID: '../escape',
    }, { validateMcpToolAllowlist: toolAllowlist });
    expect(rows.find(row => row.name === 'ZCG_MCP_TOOLS')).toMatchObject({
      valid: false, source: 'default',
    });
    expect(rows.find(row => row.name === 'ZCG_HOST_PPID')).toMatchObject({ valid: false });
    expect(rows.find(row => row.name === 'ZCG_EXPERIMENT_ID')).toMatchObject({ valid: false });
    expect(inspectFlagConfig({}).find(row => row.name === 'ZCG_EXPERIMENT_ID'))
      .toMatchObject({ value: 'manual', source: 'default', valid: true });
  });
});
