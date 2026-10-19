import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust-hybrid candidate producer routing', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(ZCODEGRAPH_BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps resolved graph stable when Rust candidate producer shadow mode is enabled', () => {
    const makeProject = (): string => {
      const dir = makeRustIndexingTempProject();
      fs.writeFileSync(
        path.join(dir, 'rust-candidate-producer-guard-helper.ts'),
        [
          'export function producerGuardHelper(): number {',
          '  return 1;',
          '}',
        ].join('\n') + '\n',
      );
      fs.writeFileSync(
        path.join(dir, 'rust-candidate-producer-guard.ts'),
        [
          'export function producerGuardEntry(): number {',
          '  return producerGuardHelper();',
          '}',
        ].join('\n') + '\n',
      );
      return dir;
    };
    const graphSummary = (dir: string, enabled: boolean): {
      stats: { fileCount: number; nodeCount: number; edgeCount: number };
      edges: Array<{ source: string; target: string; kind: string; resolvedBy: unknown }>;
    } => {
      const result = runZcodegraphCli(dir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
        ZCODEGRAPH_CANDIDATE_PROTOCOL: '1',
        ZCODEGRAPH_RUST_CANDIDATE_PRODUCER: enabled ? '1' : '0',
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

      const cg = CodeGraph.openSync(dir);
      try {
        const entry = cg.searchNodes('producerGuardEntry').find((match) => match.node.kind === 'function')?.node;
        expect(entry).toBeDefined();
        const nodesById = new Map(cg.getNodesByKind('function').map((node) => [node.id, node.name]));
        const stats = cg.getStats();
        const edges = cg.getOutgoingEdges(entry!.id)
          .filter((edge) => edge.kind === 'calls')
          .map((edge) => ({
            source: entry!.name,
            target: nodesById.get(edge.target) ?? edge.target,
            kind: edge.kind,
            resolvedBy: edge.metadata?.resolvedBy,
          }))
          .sort((a, b) => `${a.source}:${a.target}:${a.kind}`.localeCompare(`${b.source}:${b.target}:${b.kind}`));
        return {
          stats: {
            fileCount: stats.fileCount,
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount,
          },
          edges,
        };
      } finally {
        cg.close();
      }
    };

    const enabledDir = makeProject();
    const disabledDir = makeProject();
    try {
      const enabledGraph = graphSummary(enabledDir, true);
      const disabledGraph = graphSummary(disabledDir, false);
      expect(enabledGraph.edges).toContainEqual({
        source: 'producerGuardEntry',
        target: 'producerGuardHelper',
        kind: 'calls',
        resolvedBy: 'exact-match',
      });
      expect(enabledGraph).toEqual(disabledGraph);
    } finally {
      fs.rmSync(enabledDir, { recursive: true, force: true });
      fs.rmSync(disabledDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('keeps resolved graph stable when Rust candidate producer routing is locally enabled or invalid', () => {
    const makeProject = (config: string | null, profileName: string): { dir: string; profileOut: string } => {
      const dir = makeRustIndexingTempProject();
      fs.writeFileSync(
        path.join(dir, 'rust-candidate-routing-helper.ts'),
        [
          'export function routingHelper(): number {',
          '  return 1;',
          '}',
        ].join('\n') + '\n',
      );
      fs.writeFileSync(
        path.join(dir, 'rust-candidate-routing.ts'),
        [
          'export function routingEntry(): number {',
          '  return routingHelper();',
          '}',
        ].join('\n') + '\n',
      );
      if (config !== null) {
        fs.writeFileSync(path.join(dir, '.zcodegraph', 'config.json'), config);
      }
      return { dir, profileOut: path.join(dir, '.zcodegraph', profileName) };
    };
    const graphSummary = (dir: string, profileOut: string): {
      stats: { fileCount: number; nodeCount: number; edgeCount: number };
      edges: Array<{ source: string; target: string; kind: string; resolvedBy: unknown }>;
      routing: {
        configured: boolean;
        source: string;
        active: boolean;
        activeShapes: string[];
        fallbackReason: string | null;
      };
    } => {
      const result = runZcodegraphCli(dir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

      const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
        finalize: {
          referenceResolutionBreakdown: {
            candidateProtocol: {
              rustCandidateProducer: {
                routing: {
                  configured: boolean;
                  source: string;
                  active: boolean;
                  activeShapes: string[];
                  fallbackReason: string | null;
                };
              };
            };
          };
        };
      };
      const cg = CodeGraph.openSync(dir);
      try {
        const entry = cg.searchNodes('routingEntry').find((match) => match.node.kind === 'function')?.node;
        expect(entry).toBeDefined();
        const nodesById = new Map(cg.getNodesByKind('function').map((node) => [node.id, node.name]));
        const stats = cg.getStats();
        const edges = cg.getOutgoingEdges(entry!.id)
          .filter((edge) => edge.kind === 'calls')
          .map((edge) => ({
            source: entry!.name,
            target: nodesById.get(edge.target) ?? edge.target,
            kind: edge.kind,
            resolvedBy: edge.metadata?.resolvedBy,
          }))
          .sort((a, b) => `${a.source}:${a.target}:${a.kind}`.localeCompare(`${b.source}:${b.target}:${b.kind}`));
        return {
          stats: {
            fileCount: stats.fileCount,
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount,
          },
          edges,
          routing: profile.finalize.referenceResolutionBreakdown.candidateProtocol.rustCandidateProducer.routing,
        };
      } finally {
        cg.close();
      }
    };

    const enabled = makeProject(
      JSON.stringify({ experimental: { rustCandidateProducerRouting: true } }, null, 2),
      'routing-enabled-profile.json',
    );
    const disabled = makeProject(
      JSON.stringify({ experimental: { rustCandidateProducerRouting: false } }, null, 2),
      'routing-disabled-profile.json',
    );
    const invalid = makeProject(
      JSON.stringify({ experimental: { rustCandidateProducerRouting: 'yes' } }, null, 2),
      'routing-invalid-profile.json',
    );
    try {
      const enabledGraph = graphSummary(enabled.dir, enabled.profileOut);
      const disabledGraph = graphSummary(disabled.dir, disabled.profileOut);
      const invalidGraph = graphSummary(invalid.dir, invalid.profileOut);

      expect(enabledGraph.edges).toContainEqual({
        source: 'routingEntry',
        target: 'routingHelper',
        kind: 'calls',
        resolvedBy: 'exact-match',
      });
      expect(enabledGraph.stats).toEqual(disabledGraph.stats);
      expect(enabledGraph.edges).toEqual(disabledGraph.edges);
      expect(invalidGraph.stats).toEqual(disabledGraph.stats);
      expect(invalidGraph.edges).toEqual(disabledGraph.edges);
      expect(enabledGraph.routing).toMatchObject({
        configured: true,
        source: 'local-config',
        active: true,
        activeShapes: ['ExactName', 'KnownNamePresence', 'LowerName', 'QualifiedName', 'FileNodes'],
        fallbackReason: null,
      });
      expect(disabledGraph.routing).toMatchObject({
        configured: false,
        source: 'local-config',
        active: false,
      });
      expect(invalidGraph.routing).toMatchObject({
        configured: false,
        source: 'invalid-local-config',
        active: false,
        fallbackReason: 'invalid-local-config',
      });
    } finally {
      fs.rmSync(enabled.dir, { recursive: true, force: true });
      fs.rmSync(disabled.dir, { recursive: true, force: true });
      fs.rmSync(invalid.dir, { recursive: true, force: true });
    }
  }, 30_000);
});
