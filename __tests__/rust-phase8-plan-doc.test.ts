import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PLAN = path.join(
  REPO_ROOT,
  'docs',
  'plans',
  '2026-06-14-rust-indexing-core-phase-8-matcher-viability-hardening.md',
);

describe('Rust indexing Phase 8 plan document', () => {
  it('records matcher viability hardening guardrails without expanding the resolver boundary', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');

    expect(plan).toContain('Rust Indexing Core Phase 8 Matcher Viability Hardening And Go/No-Go Plan');
    expect(plan).toContain('judge whether the guarded Rust matcher is worth continuing');
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).toContain('Do not make Rust the default resolver or default index engine');
    expect(plan).toContain('Do not change SQLite schema');
    expect(plan).toContain('Do not let Rust query project SQLite directly');
    expect(plan).toContain('Do not let Rust write edges or delete unresolved references');
    expect(plan).toContain('Do not migrate import resolution, framework resolvers, or dynamic-dispatch synthesizers');
    expect(plan).toContain('commit `4ac5322601c`');
    expect(plan).toContain('1,725 JS/TS source files');
    expect(plan).toContain('1,727 copied JS/TS/config files');
    expect(plan).toContain('`rustMatcherMs`: 20,699');
    expect(plan).toContain('`rustMatcherSerializationMs`: 838');
    expect(plan).toContain('`rustMatcherEligibleRefs`: 145,320');
    expect(plan).toContain('`rustMatcherHandledRefs`: 104,375');
    expect(plan).toContain('`rustMatcherFallbackRefs`: 48,800');
    expect(plan).toContain('`rustMatcherSemanticMismatchRefs`: 12');
    expect(plan).toContain('#113');
    expect(plan).toContain('not a Phase 8 blocker');
    expect(plan).toContain('### 1. Phase 8 Plan And Guardrails');
    expect(plan).toContain('### 2. Semantic Mismatch Taxonomy And Zeroing');
    expect(plan).toContain('### 3. Fallback Taxonomy And One True-Gap Fix');
    expect(plan).toContain('### 4. Cost Attribution And Candidate Payload Dedup');
    expect(plan).toContain('### 5. VS Code Before/After Closeout Decision');
    expect(plan).not.toContain('default rollout is ready');
    expect(plan).not.toContain('Rust is ready to become the default');
  });
});
