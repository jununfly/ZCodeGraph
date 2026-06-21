import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const OWNERSHIP_DOC = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-21-finalization-tail-ownership-matrix.md',
);
const FRAMEWORK_POST_EXTRACT_DOC = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-21-framework-post-extract-boundary-contract.md',
);
const EDGE_WRITE_CLEANUP_DOC = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-21-edge-write-cleanup-ownership-boundary.md',
);
const UNRESOLVED_LIFECYCLE_DOC = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-21-unresolved-refs-lifecycle-contract.md',
);
const CLOSEOUT_DOC = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-21-finalization-tail-boundary-closeout.md',
);
const PLAN_DOC = path.join(
  REPO_ROOT,
  'docs/plans/2026-06-21-rust-hybrid-finalization-tail-boundary-plan.md',
);

describe('Finalization tail boundary plan artifacts', () => {
  it('records the ownership matrix and public diagnostic contract', () => {
    expect(fs.existsSync(PLAN_DOC)).toBe(true);
    expect(fs.existsSync(OWNERSHIP_DOC)).toBe(true);

    const doc = fs.readFileSync(OWNERSHIP_DOC, 'utf8');
    for (const section of [
      '## Responsibility Matrix',
      '## Public Diagnostic Contract',
      '## Missing Fields',
      '## Deferred Boundaries',
    ]) {
      expect(doc).toContain(section);
    }

    for (const responsibility of [
      'Product shell orchestration',
      'TypeScript fallback append',
      'Framework post-extract',
      'Broad reference resolution',
      'Candidate lookup/cache',
      'Import/export semantic slices',
      'Local exact references',
      'Edge materialization/write',
      'Unresolved refs cleanup',
      'Dynamic-dispatch synthesis',
      'Database maintenance',
      'Tail diagnostics/profile',
    ]) {
      expect(doc).toContain(responsibility);
    }

    for (const owner of ['TypeScript-owned', 'Rust-owned', 'protocol-owned', 'deferred']) {
      expect(doc).toContain(owner);
    }

    for (const field of [
      'frameworkPostExtractMs',
      'referenceResolutionMs',
      'candidateProtocol',
      'edgeEndpointValidationDbMs',
      'edgeWriteDbMs',
      'resolvedCleanupRowCount',
      'intentionallyUnresolvedCleanupRowCount',
      'dynamicDispatchSynthesisMs',
      'dbMaintenanceMs',
      'boundaryProtocol',
      'fallbackTaxonomy',
    ]) {
      expect(doc).toContain(field);
    }

    expect(doc).toContain('Broad disambiguation is not migrated by this plan');
    expect(doc).toContain('Dynamic-dispatch synthesis is not migrated by this plan');
  });

  it('records the framework post-extract ordering and migration gate', () => {
    expect(fs.existsSync(FRAMEWORK_POST_EXTRACT_DOC)).toBe(true);

    const doc = fs.readFileSync(FRAMEWORK_POST_EXTRACT_DOC, 'utf8');
    for (const section of [
      '## Boundary Contract',
      '## Ordering Contract',
      '## Deterministic Fixture',
      '## Migration Gate',
    ]) {
      expect(doc).toContain(section);
    }
    expect(doc).toContain('Framework post-extract remains TypeScript-owned and deferred for migration');
    expect(doc).toContain('framework post-extract');
    expect(doc).toContain('reference resolution');
    expect(doc).toContain('GET /admin/users/:id');
    expect(doc).toContain('not accidentally');
    expect(doc).toContain('dynamic-dispatch synthesis');
  });

  it('records the edge write and cleanup ownership boundary', () => {
    expect(fs.existsSync(EDGE_WRITE_CLEANUP_DOC)).toBe(true);

    const doc = fs.readFileSync(EDGE_WRITE_CLEANUP_DOC, 'utf8');
    for (const section of [
      '## Boundary Split',
      '## Profile Contract',
      '## Graph Parity Contract',
      '## Migration Gate',
      '## No-Go Conditions',
    ]) {
      expect(doc).toContain(section);
    }
    expect(doc).toContain('target selection');
    expect(doc).toContain('edge materialization');
    expect(doc).toContain('endpoint validation');
    expect(doc).toContain('cleanup');
    expect(doc).toContain('edgeEndpointValidationDbMs');
    expect(doc).toContain('edgeWriteDbMs');
    expect(doc).toContain('resolvedCleanupRowCount');
    expect(doc).toContain('intentionallyUnresolvedCleanupRowCount');
    expect(doc).toContain('No semantic routing or every-reference disambiguation behavior is changed');
  });

  it('records the unresolved refs lifecycle and fail-closed cleanup contract', () => {
    expect(fs.existsSync(UNRESOLVED_LIFECYCLE_DOC)).toBe(true);

    const doc = fs.readFileSync(UNRESOLVED_LIFECYCLE_DOC, 'utf8');
    for (const section of [
      '## Lifecycle Taxonomy',
      '## Fail-Closed Cleanup Contract',
      '## Rust-Hybrid Interaction',
      '## Visibility Contract',
      '## No-Go Conditions',
    ]) {
      expect(doc).toContain(section);
    }
    for (const lifecycleState of [
      'created',
      'resolved',
      'intentionally unresolved',
      'unsupported',
      'stale',
    ]) {
      expect(doc).toContain(lifecycleState);
    }
    expect(doc).toContain('Rust-owned slices');
    expect(doc).toContain('TypeScript fallback append');
    expect(doc).toContain('TypeScript reference resolution');
    expect(doc).toContain('must not be deleted');
    expect(doc).toContain('No broad disambiguation migration is introduced');
  });

  it('records the finalization tail boundary closeout and #165 state transition', () => {
    expect(fs.existsSync(CLOSEOUT_DOC)).toBe(true);

    const doc = fs.readFileSync(CLOSEOUT_DOC, 'utf8');
    expect(doc).toContain('Finalization Tail Boundary Plan completed');
    expect(doc).toContain('implementation-sequence mode');
    for (const issue of ['#407', '#408', '#409', '#410', '#411']) {
      expect(doc).toContain(issue);
    }
    for (const artifact of [
      '2026-06-21-finalization-tail-ownership-matrix.md',
      '2026-06-21-framework-post-extract-boundary-contract.md',
      '2026-06-21-edge-write-cleanup-ownership-boundary.md',
      '2026-06-21-unresolved-refs-lifecycle-contract.md',
    ]) {
      expect(doc).toContain(artifact);
    }
    expect(doc).toContain('Dynamic-dispatch synthesis remains deferred');
    expect(doc).toContain('Broad disambiguation remains deferred');
    expect(doc).toContain('#165 remains open');
  });
});
