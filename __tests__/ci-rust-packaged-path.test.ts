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
    // The EXTRACTION_VERSION release gate and its TS/Rust mirror contract must
    // actually run on CI — the workflow enumerates test files explicitly, so a
    // new test file left off the list silently never executes.
    expect(workflow).toContain('__tests__/prepare-release.test.ts');
    expect(workflow).toContain('__tests__/extraction-version-contract.test.ts');
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

    // The pure-Rust fixtures (21 cases) + the skip-inventory/-t-sync audit
    // must run as a full-file step (no -t, so none are silently filtered out).
    expect(workflow).toContain('Verify wave-0 rust-owned fixtures and skip-debt guardrails (#692)');
    expect(workflow).toContain('__tests__/rust-owned-language-fixtures.test.ts');
    expect(workflow).toContain('__tests__/skip-debt-guardrail.test.ts');

    // The activated same-dir include (B), -I include-dir (C),
    // cross-family negative guard (E case 2), C++ free-function naming
    // (G1), C++ base_class_clause inheritance (G2), the non-receiver C++
    // virtual-override bridge (G2+G3), and the typed-pointer receiver callers
    // (G4) run via -t against the larger legacy suites. B/C were re-activated
    // after the G10 file-node basename normalization shipped (they had been
    // re-skipped once CI proved the seam); G1 after the trailing-return-type
    // naming fix; G2 once the Rust extractor emitted extends refs; the override
    // bridge once G3 made inline class methods kind `method` (extends came from
    // G2); the receiver callers once G4 preserved the receiver + promoted
    // out-of-class defs to method. The branches use metacharacter-free unique
    // substrings (vitest parses -t as a raw regexp; `C++`/`(...)` would
    // miscompile), and the skip-debt guardrail keeps them in sync with the
    // real test titles.
    expect(workflow).toContain('Verify wave-0 activated include, C++ free-function, inheritance, override, typed-pointer receiver, Java G7/G9 e2e, and cross-language cases (#692)');
    expect(workflow).toContain('__tests__/frameworks-integration.test.ts');
    expect(workflow).toContain('resolves to the same-directory header, not a same-named one elsewhere');
    expect(workflow).toContain('connects #include to the real header file via include-dir scan');
    expect(workflow).toContain('does not link a static-member read across language families');
    expect(workflow).toContain('links a type referenced only via a static field');
    expect(workflow).toContain('links @Annotation usages to them');
    expect(workflow).toContain('names a free function correctly when it has qualified-type params or a trailing return type');
    expect(workflow).toContain('resolves base_class_clause bases into extends edges');
    expect(workflow).toContain('bridges a base virtual method to the subclass override');
    expect(workflow).toContain('resolves callers through typed object pointers');
    expect(workflow).toContain('the call sits inside a return/declaration');
    // Roadmap 1-6-2-4: re-activated rust-hybrid Django/Flask/FastAPI route e2e.
    expect(workflow).toContain('creates a route->view edge from urls.py to view class on rust-hybrid');
    expect(workflow).toContain('extracts stacked @bp.route nodes and resolves them to the view on rust-hybrid');
    expect(workflow).toContain('extracts FastAPI @app.get/@app.post routes and resolves them to handlers on rust-hybrid');
    // Roadmap 1-6-3-1: extended Rust Go route extraction (OPTIONS/HEAD, Chi
    // title-case verbs, net/http + gorilla/mux HandleFunc/Handle -> ANY).
    expect(workflow).toContain('extracts OPTIONS/HEAD, Chi verbs, stdlib/gorilla ANY, and grouped routes');
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
