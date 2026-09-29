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
    expect(workflow).toContain('bootstraps an uninitialized project then indexes with rust-hybrid by default');
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

  it('runs the #692 wave-0 rust-owned fixtures, skip-debt guardrail, and activated e2e cases', () => {
    const workflow = readWorkflow();

    // The pure-Rust fixtures (17 cases) + the skip-inventory/-t-sync audit
    // must run as a full-file step (no -t, so none are silently filtered out).
    expect(workflow).toContain('Verify wave-0 rust-owned fixtures and skip-debt guardrails (#692)');
    expect(workflow).toContain('__tests__/rust-owned-language-fixtures.test.ts');
    expect(workflow).toContain('__tests__/skip-debt-guardrail.test.ts');

    // The activated same-dir include (B), -I include-dir (C), and
    // cross-family negative guard (E case 2) run via -t against the larger
    // legacy suites. B/C were re-activated after the G10 file-node basename
    // normalization shipped (they had been re-skipped once CI proved the seam).
    // The branches use metacharacter-free unique substrings (vitest parses -t
    // as a raw regexp; `C++`/`(...)` would miscompile), and the skip-debt
    // guardrail keeps them in sync with the real test titles.
    expect(workflow).toContain('Verify wave-0 activated include and cross-language e2e cases (#692)');
    expect(workflow).toContain('resolves to the same-directory header, not a same-named one elsewhere');
    expect(workflow).toContain('connects #include to the real header file via include-dir scan');
    expect(workflow).toContain('does not link a static-member read across language families');
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
