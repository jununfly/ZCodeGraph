import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ReferenceResolver } from '../src/resolution';
import type { QueryBuilder } from '../src/db/queries';
import type { Node, UnresolvedReference } from '../src/types';
import {
  compareNameMatcherCandidateReplay,
  compareNameMatcherCandidateReplayForRef,
} from '../src/resolution/rust-name-matcher';
import type { ResolutionContext, UnresolvedRef } from '../src/resolution/types';

const originalEnv = {
  ZCODEGRAPH_RUST_NAME_MATCHER: process.env.ZCODEGRAPH_RUST_NAME_MATCHER,
  ZCODEGRAPH_RUST_NAME_MATCHER_STRICT: process.env.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT,
  ZCODEGRAPH_RUST_CORE_BINARY: process.env.ZCODEGRAPH_RUST_CORE_BINARY,
  ZCODEGRAPH_NAME_MATCHER_REPLAY_AB: process.env.ZCODEGRAPH_NAME_MATCHER_REPLAY_AB,
};

function node(
  id: string,
  name: string,
  filePath: string,
  qualifiedName = `${filePath}::${name}`,
  kind: Node['kind'] = 'function',
): Node {
  return {
    id,
    kind,
    name,
    qualifiedName,
    filePath,
    language: 'typescript',
    startLine: 1,
    endLine: 1,
    startColumn: 0,
    endColumn: 0,
    isExported: true,
    updatedAt: Date.now(),
  };
}

function makeQueries(nodes: Node[]): QueryBuilder {
  return {
    getAllFilePaths: () => [...new Set(nodes.map((item) => item.filePath))],
    getAllNodeNames: () => [...new Set(nodes.map((item) => item.name))],
    getNodesByName: (name: string) => nodes.filter((item) => item.name === name),
    getNodesByQualifiedNameExact: (qualifiedName: string) =>
      nodes.filter((item) => item.qualifiedName === qualifiedName),
    getNodesByLowerName: (lowerName: string) =>
      nodes.filter((item) => item.name.toLowerCase() === lowerName),
    getNodesByFile: (filePath: string) => nodes.filter((item) => item.filePath === filePath),
    getNodesByKind: (kind: Node['kind']) => nodes.filter((item) => item.kind === kind),
    getNodeById: (id: string) => nodes.find((item) => item.id === id) ?? null,
  } as unknown as QueryBuilder;
}

function makeContext(nodes: Node[]): ResolutionContext {
  return {
    getAllFiles: () => [...new Set(nodes.map((item) => item.filePath))],
    getNodesByName: (name: string) => nodes.filter((item) => item.name === name),
    getNodesByQualifiedName: (qualifiedName: string) =>
      nodes.filter((item) => item.qualifiedName === qualifiedName),
    getNodesByLowerName: (lowerName: string) =>
      nodes.filter((item) => item.name.toLowerCase() === lowerName),
    getNodesInFile: (filePath: string) => nodes.filter((item) => item.filePath === filePath),
    getNodesByKind: (kind: Node['kind']) => nodes.filter((item) => item.kind === kind),
    fileExists: () => true,
    readFile: () => null,
    getProjectRoot: () => '/fixture',
  };
}

function makeBatchedQueries(nodes: Node[], unresolved: UnresolvedReference[]): QueryBuilder {
  const queries = makeQueries(nodes) as QueryBuilder & {
    __unresolved?: UnresolvedReference[];
  };
  queries.__unresolved = [...unresolved];
  return {
    ...queries,
    getUnresolvedReferencesCount: () => queries.__unresolved!.length,
    getUnresolvedReferencesBatch: (_offset: number, limit: number) => queries.__unresolved!.slice(0, limit),
    getNodeKindsByIds: (ids: string[]) => new Map(
      ids.map((id) => [id, nodes.find((item) => item.id === id)?.kind ?? 'function']),
    ),
    insertEdges: () => undefined,
    insertValidatedEdges: () => undefined,
    deleteUnresolvedReferencesByRowIds: (rowids: number[]) => {
      queries.__unresolved = queries.__unresolved!.filter((item) => !rowids.includes(item.rowid!));
    },
    deleteSpecificResolvedReferences: () => {
      queries.__unresolved = [];
    },
  } as unknown as QueryBuilder;
}

function ref(referenceName: string): UnresolvedReference {
  return {
    fromNodeId: 'caller',
    referenceName,
    referenceKind: 'calls',
    line: 3,
    column: 10,
    filePath: 'src/caller.ts',
    language: 'typescript',
  };
}

function writeFakeRustMatcher(dir: string, targetNodeId: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-matcher.cjs' : 'fake-rust-matcher');
  const marker = path.join(dir, 'rust-matcher-invoked.json');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const input = JSON.parse(fs.readFileSync(0, "utf8"));',
      'fs.writeFileSync(' + JSON.stringify(marker) + ', JSON.stringify({',
      '  argv: process.argv.slice(2),',
      '  refs: input.references.length,',
      '  candidateTableSize: Object.keys(input.candidateTable || {}).length,',
      '  firstReferenceHasCandidates: Object.prototype.hasOwnProperty.call(input.references[0] || {}, "candidates"),',
      '  firstReferenceHasCandidateIds: Object.prototype.hasOwnProperty.call(input.references[0] || {}, "candidateIds"),',
      '}));',
      'const decisions = input.references.map((entry) => ({',
      '  key: entry.key,',
      '  targetNodeId: ' + JSON.stringify(targetNodeId) + ',',
      '  confidence: 0.9,',
      '  resolvedBy: "exact-match"',
      '}));',
      'process.stdout.write(JSON.stringify({',
      '  type: "name_match_result",',
      '  version: 1,',
      '  decisions,',
      '  diagnostics: {',
      '    rustMatcherMs: 2,',
      '    rustMatcherStartupMs: 1,',
      '    rustMatcherEligibleRefs: input.references.length,',
      '    rustMatcherHandledRefs: decisions.length,',
      '    rustMatcherFallbackRefs: 0,',
      '    rustMatcherSemanticMismatchRefs: 0,',
      '    rustMatcherFallbackReasons: {}',
      '  }',
      '}));',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function writeFakeRustFallbackMatcher(dir: string, fallbackReason: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-fallback.cjs' : 'fake-rust-fallback');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const input = JSON.parse(fs.readFileSync(0, "utf8"));',
      'const decisions = input.references.map((entry) => ({',
      '  key: entry.key,',
      '  targetNodeId: null,',
      '  confidence: 0,',
      '  resolvedBy: null,',
      '  fallbackReason: ' + JSON.stringify(fallbackReason),
      '}));',
      'process.stdout.write(JSON.stringify({',
      '  type: "name_match_result",',
      '  version: 1,',
      '  decisions,',
      '  diagnostics: {',
      '    rustMatcherMs: 2,',
      '    rustMatcherStartupMs: 1,',
      '    rustMatcherEligibleRefs: input.references.length,',
      '    rustMatcherHandledRefs: 0,',
      '    rustMatcherFallbackRefs: input.references.length,',
      '    rustMatcherSemanticMismatchRefs: 0,',
      '    rustMatcherFallbackReasons: { ' + JSON.stringify(fallbackReason) + ': input.references.length }',
      '  }',
      '}));',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

describe('guarded Rust name matcher', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = originalEnv.ZCODEGRAPH_RUST_NAME_MATCHER;
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT = originalEnv.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = originalEnv.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_NAME_MATCHER_REPLAY_AB = originalEnv.ZCODEGRAPH_NAME_MATCHER_REPLAY_AB;
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  });

  it('proves candidate-set replay preserves TypeScript matcher decisions per reference', () => {
    const alpha = node('target:alpha', 'alpha', 'src/alpha.ts');
    const permissionClass = node(
      'class:PermissionEngine',
      'PermissionEngine',
      'src/permission.ts',
      'PermissionEngine',
      'class',
    );
    const validate = node(
      'method:PermissionEngine.validate',
      'validate',
      'src/permission.ts',
      'PermissionEngine::validate',
      'method',
    );
    const loose = node('function:Loose', 'Loose', 'src/loose.ts');
    const context = makeContext([
      node('caller', 'caller', 'src/caller.ts'),
      alpha,
      permissionClass,
      validate,
      loose,
    ]);
    const refs: UnresolvedRef[] = [
      { ...ref('alpha'), rowid: 1 },
      { ...ref('permissionEngine.validate'), rowid: 2 },
      { ...ref('loose'), referenceName: 'loose', rowid: 3 },
    ];

    const result = compareNameMatcherCandidateReplay(refs, context);

    expect(result).toMatchObject({
      totalRefs: 3,
      eligibleRefs: 3,
      replayedRefs: 3,
      equivalentRefs: 3,
      mismatchCount: 0,
      mismatches: [],
    });
  });

  it('keeps the candidate-set replay prototype scoped to JS and TypeScript references', () => {
    const context = makeContext([
      node('caller', 'caller', 'src/caller.ts'),
      node('target:alpha', 'alpha', 'src/alpha.ts'),
    ]);
    const refs: UnresolvedRef[] = [
      { ...ref('alpha'), rowid: 1 },
      { ...ref('alpha'), rowid: 2, language: 'python', filePath: 'src/caller.py' },
    ];

    const result = compareNameMatcherCandidateReplay(refs, context);

    expect(result.totalRefs).toBe(2);
    expect(result.eligibleRefs).toBe(1);
    expect(result.replayedRefs).toBe(1);
    expect(result.mismatchCount).toBe(0);
  });

  it('records guarded candidate replay A/B equivalence while keeping baseline decisions authoritative', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-name-replay-ab-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
    ]));
    process.env.ZCODEGRAPH_NAME_MATCHER_REPLAY_AB = '1';

    const result = resolver.resolveAll([ref('alpha')]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
    expect(result.stats.timings).toMatchObject({
      candidateReplayEligibleRefs: 1,
      candidateReplayComparedRefs: 1,
      candidateReplayEquivalentRefs: 1,
      candidateReplayMismatchRefs: 0,
      candidateReplayMismatchReasons: {},
      candidateReplayMismatchSamples: [],
    });
  });

  it('keeps baseline authoritative when guarded candidate replay mismatches', () => {
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const baseline = {
      original: ref('alpha'),
      targetNodeId: target.id,
      confidence: 0.9,
      resolvedBy: 'exact-match' as const,
    };
    const replayContext = makeContext([
      node('caller', 'caller', 'src/caller.ts'),
    ]);

    const result = compareNameMatcherCandidateReplayForRef(ref('alpha'), replayContext, baseline);

    expect(result?.replay).toBeNull();
    expect(result?.mismatch).toEqual(
      expect.objectContaining({
        referenceName: 'alpha',
        baselineTargetNodeId: target.id,
        replayTargetNodeId: null,
        reason: 'replay-unresolved',
      }),
    );
  });

  it('keeps the TypeScript matcher path by default', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustMatcher(tempDir, target.id);
    delete process.env.ZCODEGRAPH_RUST_NAME_MATCHER;

    const result = resolver.resolveAll([ref('alpha')]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
    expect(result.stats.timings?.rustMatcherEligibleRefs).toBe(0);
    expect(fs.existsSync(path.join(tempDir, 'rust-matcher-invoked.json'))).toBe(false);
  });

  it('uses a batched Rust matcher decision when guarded opt-in is enabled', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustMatcher(tempDir, target.id);
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = resolver.resolveAll([ref('alpha')]);
    const marker = JSON.parse(fs.readFileSync(path.join(tempDir, 'rust-matcher-invoked.json'), 'utf8')) as {
      argv: string[];
      refs: number;
    };

    expect(marker.argv).toEqual(['match-name']);
    expect(marker.refs).toBe(1);
    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
    expect(result.stats.timings?.rustMatcherEligibleRefs).toBe(1);
    expect(result.stats.timings?.rustMatcherHandledRefs).toBe(1);
  });

  it('deduplicates candidate facts into a batch-level payload table', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustMatcher(tempDir, target.id);
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = resolver.resolveAll([{ ...ref('alpha'), rowid: 1 }, { ...ref('alpha'), rowid: 2, line: 4 }]);
    const marker = JSON.parse(fs.readFileSync(path.join(tempDir, 'rust-matcher-invoked.json'), 'utf8')) as {
      candidateTableSize: number;
      firstReferenceHasCandidates: boolean;
      firstReferenceHasCandidateIds: boolean;
    };

    expect(result.resolved).toHaveLength(2);
    expect(marker.candidateTableSize).toBe(1);
    expect(marker.firstReferenceHasCandidates).toBe(false);
    expect(marker.firstReferenceHasCandidateIds).toBe(true);
    expect(result.stats.timings?.rustMatcherPayloadBytes).toBeGreaterThan(0);
    expect(result.stats.timings?.rustMatcherUniqueCandidateFacts).toBe(1);
  });

  it('falls back to the TypeScript matcher when Rust returns a semantic mismatch', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const wrong = node('target:wrong', 'wrong', 'src/wrong.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
      wrong,
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustMatcher(tempDir, wrong.id);
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = resolver.resolveAll([ref('alpha')]);

    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
    expect(result.stats.timings?.rustMatcherSemanticMismatchRefs).toBe(1);
    expect(result.stats.timings?.rustMatcherFallbackReasons).toMatchObject({
      'semantic-mismatch': 1,
    });
  });

  it('records semantic mismatch samples with both Rust and TypeScript decisions', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const wrong = node('target:wrong', 'wrong', 'src/wrong.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
      wrong,
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustMatcher(tempDir, wrong.id);
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = resolver.resolveAll([ref('alpha')]);

    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
    expect(result.stats.timings?.rustMatcherSemanticMismatchSamples).toEqual([
      expect.objectContaining({
        referenceName: 'alpha',
        referenceKind: 'calls',
        filePath: 'src/caller.ts',
        language: 'typescript',
        rustTargetNodeId: wrong.id,
        rustResolvedBy: 'exact-match',
        rustConfidence: 0.9,
        tsTargetNodeId: target.id,
        tsResolvedBy: 'exact-match',
        tsConfidence: 0.9,
        reason: 'different-target',
      }),
    ]);
  });

  it('preserves semantic mismatch samples when batched resolution merges timings', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const wrong = node('target:wrong', 'wrong', 'src/wrong.ts');
    const resolver = new ReferenceResolver(tempDir, makeBatchedQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
      wrong,
    ], [
      { ...ref('alpha'), rowid: 1 },
      { ...ref('alpha'), rowid: 2, line: 4 },
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustMatcher(tempDir, wrong.id);
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = await resolver.resolveAndPersistBatched(undefined, 1);

    expect(result.stats.timings?.rustMatcherSemanticMismatchRefs).toBe(2);
    expect(result.stats.timings?.rustMatcherSemanticMismatchSamples).toHaveLength(2);
    expect(result.stats.timings?.rustMatcherSemanticMismatchSamples?.[0]).toMatchObject({
      referenceName: 'alpha',
      reason: 'different-target',
    });
  });

  it('classifies Rust fallback as a true Rust gap only when TypeScript resolves it', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const target = node('target:alpha', 'alpha', 'src/target.ts');
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
      target,
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustFallbackMatcher(tempDir, 'unresolved');
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = resolver.resolveAll([ref('alpha')]);

    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
    expect(result.stats.timings?.rustMatcherFallbackReasons).toMatchObject({
      'rust-unresolved': 1,
    });
    expect(result.stats.timings?.rustMatcherFallbackReasons).not.toHaveProperty('unresolved');
  });

  it('classifies Rust fallback as baseline-unresolved when TypeScript also cannot resolve it', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-name-matcher-'));
    const resolver = new ReferenceResolver(tempDir, makeQueries([
      node('caller', 'caller', 'src/caller.ts'),
    ]));
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = writeFakeRustFallbackMatcher(tempDir, 'unresolved');
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = '1';

    const result = resolver.resolveAll([ref('missing')]);

    expect(result.resolved).toHaveLength(0);
    expect(result.stats.timings?.rustMatcherFallbackReasons).toMatchObject({
      'ts-baseline-unresolved': 1,
    });
    expect(result.stats.timings?.rustMatcherFallbackReasons).not.toHaveProperty('unresolved');
  });
});
