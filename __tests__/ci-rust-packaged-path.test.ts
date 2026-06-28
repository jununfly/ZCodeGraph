import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');
const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');
const rustHybridCiSmokePath = path.join(root, 'scripts', 'rust-hybrid-ci-smoke.mjs');

function readWorkflow(): string {
  return fs.readFileSync(ciPath, 'utf8');
}

describe('CI Rust packaged path coverage', () => {
  it('defines rust-packaged-path as the required Rust indexing health gate', () => {
    expect(fs.existsSync(ciPath)).toBe(true);
    const workflow = readWorkflow();

    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('rust-packaged-path:');
    expect(workflow).toContain('Required Rust indexing health gate');
    expect(workflow).toContain('name: Rust packaged path (${{ matrix.os }})');
    expect(workflow).toContain('matrix:');
    expect(workflow).toContain('fail-fast: false');
    expect(workflow).toContain('ubuntu-latest');
    expect(workflow).toContain('macos-14');
    expect(workflow).toContain('windows-2025');
  });

  it('runs Rust core and packaged-path checks on macOS, Linux, and Windows', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('actions/setup-node@v6');
    expect(workflow).toContain('node-version: 22');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('cargo test');
    expect(workflow).toContain('cargo build --package zcodegraph-core');
  });

  it('checks default rust-hybrid indexing, packaged Rust discovery, and release artifact coverage', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('Verify Rust CLI engine paths');
    expect(workflow).toContain('__tests__/rust-index-engine-cli-engine.test.ts');
    expect(workflow).toContain('__tests__/rust-index-engine-cli-failure-safety.test.ts');
    expect(workflow).not.toContain('__tests__/rust-index-engine-cli.test.ts');
    expect(workflow).not.toContain('uses the TypeScript indexer by default');
    expect(workflow).toContain('uses the rust-hybrid indexer by default');
    expect(workflow).toContain('uses rust-hybrid for init indexing by default');
    expect(workflow).toContain('runs the packaged Rust subprocess from a bundle layout without an env override');
    expect(workflow).toContain('leaves the existing TypeScript index intact when the Rust binary is unavailable');
    expect(workflow).toContain('Verify release artifact contracts');
    expect(workflow).toContain('__tests__/release-workflow-rust-core.test.ts');
    expect(workflow).toContain('__tests__/rust-core-artifact-contract.test.ts');
  });

  it('runs SQLite and file-lock regression guardrails on the cross-platform CI path', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('Verify SQLite and file-lock guardrails');
    expect(workflow).toContain('__tests__/sqlite-backend.test.ts');
    expect(workflow).toContain('__tests__/concurrent-locking.test.ts');
    expect(workflow).toContain('__tests__/rust-index-engine-cli-failure-safety.test.ts');
  });

  it('runs a rust-hybrid init/index/status/doctor smoke on the cross-platform CI path', () => {
    const workflow = readWorkflow();

    expect(fs.existsSync(rustHybridCiSmokePath)).toBe(true);
    expect(workflow).toContain('Verify rust-hybrid CI smoke');
    expect(workflow).toContain('node scripts/rust-hybrid-ci-smoke.mjs');
  });

  it('keeps CI focused on source validation instead of npm install-time Rust compilation', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('CODEGRAPH_NO_DAEMON: "1"');
    expect(workflow).not.toContain('postinstall');
    expect(workflow).not.toContain('npm rebuild');
    expect(workflow).not.toContain('rust-package-smoke.mjs');
  });
});
