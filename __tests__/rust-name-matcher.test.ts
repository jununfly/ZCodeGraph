import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ReferenceResolver } from '../src/resolution';
import type { QueryBuilder } from '../src/db/queries';
import type { Node, UnresolvedReference } from '../src/types';

const originalEnv = {
  ZCODEGRAPH_RUST_NAME_MATCHER: process.env.ZCODEGRAPH_RUST_NAME_MATCHER,
  ZCODEGRAPH_RUST_NAME_MATCHER_STRICT: process.env.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT,
  ZCODEGRAPH_RUST_CORE_BINARY: process.env.ZCODEGRAPH_RUST_CORE_BINARY,
};

function node(id: string, name: string, filePath: string, qualifiedName = `${filePath}::${name}`): Node {
  return {
    id,
    kind: 'function',
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
      'fs.writeFileSync(' + JSON.stringify(marker) + ', JSON.stringify({ argv: process.argv.slice(2), refs: input.references.length }));',
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

describe('guarded Rust name matcher', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER = originalEnv.ZCODEGRAPH_RUST_NAME_MATCHER;
    process.env.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT = originalEnv.ZCODEGRAPH_RUST_NAME_MATCHER_STRICT;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = originalEnv.ZCODEGRAPH_RUST_CORE_BINARY;
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
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
});
