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

describe('zcodegraph index engine selection', () => {
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

  it('resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges', () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(srcDir, 'lib.ts'), 'export function libValue() { return 1; }\n');
    fs.writeFileSync(path.join(srcDir, 'alias-target.ts'), 'export function aliasValue() { return 2; }\n');
    fs.writeFileSync(
      path.join(srcDir, 'main.ts'),
      [
        'import { libValue } from "./lib";',
        'import { aliasValue } from "@app/alias-target";',
        'export function mainValue() {',
        '  return libValue() + aliasValue();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-import-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        boundaryProtocol: { rustOwnedStages: string[] };
      };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('import-path-alias-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      const relativeTarget = files.find((node) => node.filePath === 'src/lib.ts');
      const aliasTarget = files.find((node) => node.filePath === 'src/alias-target.ts');
      expect(mainFile).toBeDefined();
      expect(relativeTarget).toBeDefined();
      expect(aliasTarget).toBeDefined();

      const imports = cg.getOutgoingEdges(mainFile!.id).filter((edge) => edge.kind === 'imports');
      expect(imports.some((edge) => edge.target === relativeTarget!.id)).toBe(true);
      expect(imports.some((edge) => edge.target === aliasTarget!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves JS/TS conventional aliases and workspace package imports as Rust-owned file-level edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'packages/ui/widgets'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'tools/logger'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'root', private: true, workspaces: ['packages/*'] }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), "packages:\n  - 'tools/*'\n");
    fs.writeFileSync(
      path.join(tempDir, 'packages/ui/package.json'),
      JSON.stringify({ name: '@scope/ui', version: '1.0.0' }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'tools/logger/package.json'),
      JSON.stringify({ name: '@tools/logger', version: '1.0.0' }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'src/alias-target.ts'), 'export const aliasValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'app/service.ts'), 'export const serviceValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'packages/ui/widgets/index.ts'), 'export const widgetValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'tools/logger/index.ts'), 'export const loggerValue = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import { aliasValue } from "@/alias-target";',
        'import { serviceValue } from "app/service";',
        'import { widgetValue } from "@scope/ui/widgets";',
        'import { loggerValue } from "@tools/logger";',
        'export const total = aliasValue + serviceValue + widgetValue + loggerValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-import-parity-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        importPathAliasResolvedRefs: number;
        importPathAliasUnresolvedFallbackRefs: number;
        importPathAliasResolvedBySource: {
          conventionalAlias: number;
          workspacePackage: number;
        };
        importPathAliasFallbackBySource: {
          conventionalAlias: number;
          workspacePackage: number;
        };
      };
    };
    expect(profile.rustCore.importPathAliasResolvedRefs).toBeGreaterThanOrEqual(4);
    expect(profile.rustCore.importPathAliasUnresolvedFallbackRefs).toBe(0);
    expect(profile.rustCore.importPathAliasResolvedBySource).toMatchObject({
      conventionalAlias: 2,
      workspacePackage: 2,
    });
    expect(profile.rustCore.importPathAliasFallbackBySource).toMatchObject({
      conventionalAlias: 0,
      workspacePackage: 0,
    });

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      const targets = new Set(
        cg.getOutgoingEdges(mainFile!.id)
          .filter((edge) => edge.kind === 'imports')
          .map((edge) => files.find((node) => node.id === edge.target)?.filePath)
          .filter(Boolean),
      );
      expect(targets).toEqual(new Set([
        'app/service.ts',
        'packages/ui/widgets/index.ts',
        'src/alias-target.ts',
        'tools/logger/index.ts',
      ]));
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves only relative JS source specifiers to TypeScript source candidates', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src/exact'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'src/only-ts.ts'), 'export const onlyTs = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/view.tsx'), 'export const view = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/module.ts'), 'export const moduleValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/common.ts'), 'export const commonValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/exact/literal.js'), 'export const literal = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/exact/literal.ts'), 'export const literal = 2;\n');
    fs.writeFileSync(path.join(tempDir, 'src/alias-only.ts'), 'export const aliasOnly = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import { onlyTs } from "./only-ts.js";',
        'import { view } from "./view.js";',
        'import { moduleValue } from "./module.mjs";',
        'import { commonValue } from "./common.cjs";',
        'import { literal } from "./exact/literal.js";',
        'import styles from "./style.css";',
        'import { aliasOnly } from "@app/alias-only.js";',
        'export const total = onlyTs + view + moduleValue + commonValue + literal + String(styles) + aliasOnly;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-relative-js-source-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        importPathAliasResolvedBySource: { relative: number; tsconfigPaths: number };
        importPathAliasFallbackSampleCounts: Record<string, number>;
      };
    };
    expect(profile.rustCore.importPathAliasResolvedBySource.relative).toBe(3);
    expect(profile.rustCore.importPathAliasResolvedBySource.tsconfigPaths).toBe(1);
    expect(profile.rustCore.importPathAliasFallbackSampleCounts).toMatchObject({
      'relative/target-not-found': 3,
    });

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      expect(mainFile).toBeDefined();
      const targets = new Set(
        cg.getOutgoingEdges(mainFile!.id)
          .filter((edge) => edge.kind === 'imports')
          .map((edge) => files.find((node) => node.id === edge.target)?.filePath)
          .filter(Boolean),
      );
      expect(targets).toEqual(new Set([
        'src/alias-only.ts',
        'src/exact/literal.ts',
        'src/only-ts.ts',
        'src/view.tsx',
      ]));
      expect(targets.has('src/exact/literal.js')).toBe(false);
      expect(targets.has('src/common.ts')).toBe(false);
      expect(targets.has('src/module.ts')).toBe(false);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('emits bounded Rust import fallback samples in the profile artifact', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src/style.css'), '.root { color: red; }\n');
    fs.writeFileSync(path.join(tempDir, 'src/settings.json'), '{"enabled":true}\n');
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import missing from "./missing";',
        'import styles from "./style.css";',
        'import settings from "./settings.json";',
        'export const total = missing + String(styles) + String(settings.enabled);',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-import-fallback-samples-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        importPathAliasFallbackSampleCounts: Record<string, number>;
        importPathAliasFallbackSamples: Array<Record<string, unknown>>;
        importPathAliasFallbackSampleCap: {
          perBucket: number;
          total: number;
          truncated: boolean;
        };
      };
    };

    expect(profile.rustCore.importPathAliasFallbackSampleCounts).toMatchObject({
      'relative/file-node-not-found': 1,
      'relative/target-not-found': 1,
    });
    expect(profile.rustCore.importPathAliasFallbackSampleCap).toEqual({
      perBucket: 100,
      total: 2000,
      truncated: false,
    });
    expect(profile.rustCore.importPathAliasFallbackSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKind: 'relative',
          reason: 'target-not-found',
          referenceName: './missing',
          filePath: 'src/main.ts',
          language: 'typescript',
          line: expect.any(Number),
          col: expect.any(Number),
        }),
        expect.objectContaining({
          sourceKind: 'relative',
          reason: 'file-node-not-found',
          referenceName: './style.css',
          targetKind: 'asset',
          targetExtension: '.css',
          filePath: 'src/main.ts',
          language: 'typescript',
          line: expect.any(Number),
          col: expect.any(Number),
        }),
      ]),
    );
    for (const sample of profile.rustCore.importPathAliasFallbackSamples) {
      expect(sample).not.toHaveProperty('source');
      expect(sample).not.toHaveProperty('sourceContent');
      expect(sample).not.toHaveProperty('sourceLine');
      expect(sample).not.toHaveProperty('candidateCode');
    }

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      expect(mainFile).toBeDefined();
      const importedTargets = cg.getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports')
        .map((edge) => files.find((node) => node.id === edge.target)?.filePath)
        .filter(Boolean);
      expect(importedTargets).toEqual(['src/settings.json', 'src/settings.json']);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves same-file exact callable references as Rust-owned edges', () => {
    fs.writeFileSync(
      path.join(tempDir, 'local-calls.ts'),
      [
        'function localHelper() {',
        '  return 1;',
        '}',
        '',
        'export function localEntry() {',
        '  return localHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-local-reference-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: { boundaryProtocol: { rustOwnedStages: string[] } };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('local-exact-reference-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('localEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('localHelper').find((match) => match.node.kind === 'function')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps exact-name resolved graph stable when candidate protocol is enabled or disabled', () => {
    const makeProject = (): string => {
      const dir = makeRustIndexingTempProject();
      fs.writeFileSync(
        path.join(dir, 'candidate-protocol.ts'),
        [
          'function protocolHelper() {',
          '  return 1;',
          '}',
          '',
          'export function protocolEntry() {',
          '  return protocolHelper();',
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
        ZCODEGRAPH_CANDIDATE_PROTOCOL: enabled ? '1' : '0',
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

      const cg = CodeGraph.openSync(dir);
      try {
        const entry = cg.searchNodes('protocolEntry').find((match) => match.node.kind === 'function')?.node;
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
        source: 'protocolEntry',
        target: 'protocolHelper',
        kind: 'calls',
        resolvedBy: 'rust-local-exact-reference',
      });
      expect(enabledGraph).toEqual(disabledGraph);
    } finally {
      fs.rmSync(enabledDir, { recursive: true, force: true });
      fs.rmSync(disabledDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('writes candidate protocol diagnostics in rust-hybrid profile artifacts', () => {
    fs.writeFileSync(
      path.join(tempDir, 'candidate-profile.ts'),
      [
        'function profileHelper() {',
        '  return 1;',
        '}',
        '',
        'export function profileEntry() {',
        '  return profileHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'candidate-protocol-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          candidateLookupMs: number;
          candidateLookupCacheHitMs: number;
          nameMatcherCandidateLookupDbMs: number;
          perReferenceDisambiguationMs: number;
          rustMatcherTsVerificationReusedCandidateRefs: number;
          databaseAccessMs: number;
          refHydrationDbMs: number;
          candidateProtocol: {
            enabled: boolean;
            materializationMs: number;
            lookupMs: number;
            lookupCount: number;
            cacheHitCount: number;
            cacheMissCount: number;
            dbLookupCount: number;
            candidateCount: number;
            lookupShapeCounts: Record<string, number>;
            lookupShapeMs: Record<string, number>;
            fileNodesLookup: {
              requestedCount: number;
              reusedCount: number;
              missedCount: number;
              fallbackCount: number;
              lookupMs: number;
              batchMaterializationMs: number;
              batchMaterializedCount: number;
              batchHitCount: number;
              batchMissCount: number;
              batchUnavailableCount: number;
              batchUnavailableReason: string | null;
            };
            factsProtocol: {
              shapes: Record<string, {
                ownership: string;
                status: string;
                defaultRoute: string;
                semanticBoundary: string;
              }>;
            };
            equivalenceComparedCount: number;
            equivalenceMismatchCount: number;
            fallbackReasons: Record<string, number>;
            disabledReason: string | null;
          };
        };
      };
    };

    expect(profile.finalize.referenceResolutionBreakdown.candidateProtocol).toMatchObject({
      enabled: true,
      materializationMs: expect.any(Number),
      lookupMs: expect.any(Number),
      lookupCount: expect.any(Number),
      cacheHitCount: expect.any(Number),
      cacheMissCount: expect.any(Number),
      dbLookupCount: expect.any(Number),
      candidateCount: expect.any(Number),
      lookupShapeCounts: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      lookupShapeMs: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      fileNodesLookup: expect.objectContaining({
        requestedCount: expect.any(Number),
        reusedCount: expect.any(Number),
        missedCount: expect.any(Number),
        fallbackCount: expect.any(Number),
        lookupMs: expect.any(Number),
        batchMaterializationMs: expect.any(Number),
        batchMaterializedCount: expect.any(Number),
        batchHitCount: expect.any(Number),
        batchMissCount: expect.any(Number),
        batchUnavailableCount: expect.any(Number),
        batchUnavailableReason: expect.anything(),
      }),
      factsProtocol: {
        shapes: {
          LowerName: {
            ownership: 'protocol-owned',
            status: 'candidate-for-bounded-exploit',
            defaultRoute: 'typescript-baseline-with-optional-rust-routing',
            semanticBoundary: 'candidate-set-only',
          },
          QualifiedName: {
            ownership: 'protocol-owned',
            status: 'partial-keep-with-taxonomy',
            defaultRoute: 'typescript-baseline-with-dotted-rust-routing',
            semanticBoundary: 'candidate-set-only',
          },
          FileNodes: {
            ownership: 'protocol-owned',
            status: 'keep-with-caveat',
            defaultRoute: 'run-scoped-batch-then-typescript-fallback',
            semanticBoundary: 'candidate-set-only',
          },
        },
      },
      equivalenceComparedCount: expect.any(Number),
      equivalenceMismatchCount: expect.any(Number),
      fallbackReasons: expect.any(Object),
      disabledReason: null,
    });
    expect(profile.finalize.referenceResolutionBreakdown.candidateProtocol.lookupCount).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.candidateLookupMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.candidateLookupCacheHitMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.nameMatcherCandidateLookupDbMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.perReferenceDisambiguationMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.rustMatcherTsVerificationReusedCandidateRefs)
      .toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.databaseAccessMs).toBeGreaterThanOrEqual(
      profile.finalize.referenceResolutionBreakdown.refHydrationDbMs,
    );
  }, 30_000);

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
