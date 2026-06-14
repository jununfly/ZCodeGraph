import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PLAN = path.join(
  REPO_ROOT,
  'docs',
  'plans',
  '2026-06-14-rust-indexing-core-phase-7-guarded-name-matcher-prototype.md',
);

describe('Rust indexing Phase 7 plan document', () => {
  it('records the guarded Rust-assisted name matcher prototype boundary', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');

    expect(plan).toContain('Phase 7 is a guarded Rust-assisted name matcher prototype');
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).toContain('guarded actual resolver path');
    expect(plan).toContain('TypeScript performs candidate lookup');
    expect(plan).toContain('Do not change SQLite schema');
    expect(plan).toContain('Do not let Rust write edges or delete unresolved references');
    expect(plan).toContain('Per-reference disambiguation semantics must not change');
    expect(plan).toContain('Batch subprocess is allowed; per-reference subprocess is not allowed');
    expect(plan).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(plan).toContain('promote to guarded resolver path');
    expect(plan).toContain('continue matcher prototype');
    expect(plan).toContain('abandon Rust matcher');
    expect(plan).toContain('regressed');
    expect(plan).toContain('### 1. Phase 7 Plan And Guardrails');
    expect(plan).toContain('### 2. Narrow Protocol And Exact/Qualified Tracer Bullet');
    expect(plan).toContain('### 3. Complete Matcher Branches Within The Narrow Boundary');
    expect(plan).toContain('### 4. Guarded Actual Resolver Integration');
    expect(plan).toContain('### 5. Benchmark Attribution And Reduced Fixture Optimization');
    expect(plan).toContain('### 6. Large-Target Closeout Decision');
    expect(plan).not.toContain('default rollout is ready');
    expect(plan).not.toContain('Rust is ready to become the default');
  });
});
