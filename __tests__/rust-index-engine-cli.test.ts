import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import { ToolHandler } from '../src/mcp/tools';
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

  it('indexes ordinary Go files under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.go).toBe(1);
      expect(cg.searchNodes('main').some((match) => match.node.kind === 'function' && match.node.language === 'go')).toBe(true);
      expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'rust-hybrid' });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes Rust files as Rust-owned under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.rs'), 'fn worker() -> i32 { 1 }\n');

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.rust).toBe(1);
      expect(cg.searchNodes('worker').some((match) => match.node.kind === 'function' && match.node.language === 'rust')).toBe(true);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        rustOwnedLanguages: expect.arrayContaining(['rust']),
        engineByLanguage: { rust: 'rust' },
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: {},
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes Python as Rust-owned under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.py'), 'def worker():\n    return 1\n');

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.python).toBe(1);
      expect(cg.searchNodes('worker').some((match) => match.node.kind === 'function' && match.node.language === 'python')).toBe(true);
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        rustOwnedLanguages: expect.arrayContaining(['python']),
        engineByLanguage: { python: 'rust' },
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: {},
        pendingFallbacks: ['rust-owned-parse-gap'],
      });
    } finally {
      cg.close();
    }
  }, 30_000);

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

  it('writes shadow semantic replay diagnostics for direct named ESM imports', () => {
    fs.writeFileSync(
      path.join(tempDir, 'semantic-target.ts'),
      [
        'export function semanticReplayTarget(): number {',
        '  return 1;',
        '}',
        'export interface SemanticReplayType {',
        '  value: number;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'semantic-entry.ts'),
      [
        "import { semanticReplayTarget } from './semantic-target';",
        "import type { SemanticReplayType } from './semantic-target';",
        '',
        'export function semanticReplayEntry(input?: SemanticReplayType): number {',
        '  return semanticReplayTarget();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'semantic-replay-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          semanticReplay: {
            eligibleRefs: number;
            comparedRefs: number;
            equivalentRefs: number;
            mismatchRefs: number;
            skippedRefs: number;
            mismatchReasons: Record<string, number>;
            mismatchSamples: unknown[];
          };
        };
      };
    };

    expect(profile.finalize.referenceResolutionBreakdown.semanticReplay).toMatchObject({
      eligibleRefs: expect.any(Number),
      comparedRefs: expect.any(Number),
      equivalentRefs: expect.any(Number),
      mismatchRefs: expect.any(Number),
      skippedRefs: expect.any(Number),
      mismatchReasons: expect.any(Object),
      mismatchSamples: expect.any(Array),
    });
    expect(profile.finalize.referenceResolutionBreakdown.semanticReplay.eligibleRefs).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.semanticReplay.comparedRefs).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.semanticReplay.equivalentRefs).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.semanticReplay.mismatchRefs).toBe(0);
  }, 30_000);

  it('records shadow semantic replay taxonomy for unresolved direct named ESM imports', () => {
    fs.writeFileSync(
      path.join(tempDir, 'semantic-missing-target.ts'),
      'export function otherSemanticReplayName(): number { return 1; }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'semantic-missing-entry.ts'),
      [
        "import { missingSemanticReplayTarget } from './semantic-missing-target';",
        "import type { MissingSemanticReplayType } from './semantic-missing-target';",
        '',
        'export function semanticReplayMissingEntry(input?: MissingSemanticReplayType): number {',
        '  return missingSemanticReplayTarget();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'semantic-replay-missing-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          semanticReplay: {
            eligibleRefs: number;
            comparedRefs: number;
            mismatchRefs: number;
            skippedRefs: number;
            mismatchReasons: Record<string, number>;
            mismatchSamples: Array<Record<string, unknown>>;
          };
        };
      };
    };
    const semanticReplay = profile.finalize.referenceResolutionBreakdown.semanticReplay;
    expect(semanticReplay.eligibleRefs).toBeGreaterThan(0);
    expect(semanticReplay.skippedRefs).toBeGreaterThan(0);
    expect(semanticReplay.comparedRefs).toBe(0);
    expect(semanticReplay.mismatchRefs).toBe(0);
    expect(semanticReplay.mismatchReasons).toMatchObject({
      'export-symbol-missing': expect.any(Number),
    });
    expect(semanticReplay.mismatchSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        referenceName: 'missingSemanticReplayTarget',
        reason: 'export-symbol-missing',
      }),
    ]));
  }, 30_000);

  it('writes guarded Rust finalization diagnostics and usage edges for direct named ESM imports', () => {
    fs.writeFileSync(
      path.join(tempDir, 'guarded-target.ts'),
      [
        'export function guardedUsageTarget(): number {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'guarded-entry.ts'),
      [
        "import { guardedUsageTarget } from './guarded-target';",
        '',
        'export function guardedUsageEntry(): number {',
        '  return guardedUsageTarget();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'guarded-edge-write-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('guardedUsageEntry').find((match) => match.node.kind === 'function')?.node;
      const target = cg.searchNodes('guardedUsageTarget').find((match) => match.node.kind === 'function')?.node;
      expect(entry).toBeDefined();
      expect(target).toBeDefined();

      const guardedUsageEdges = cg
        .getOutgoingEdges(entry!.id, ['calls'], 'rust-finalization')
        .filter((edge) => edge.target === target!.id);
      expect(guardedUsageEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'calls',
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-named-import-export',
          }),
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          guardedEdgeWrite: {
            eligibleRefs: number;
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            skipSamples: unknown[];
            edgeKindCounts: Record<string, number>;
          };
        };
      };
    };

    expect(profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite).toMatchObject({
      eligibleRefs: expect.any(Number),
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      skipSamples: expect.any(Array),
      edgeKindCounts: expect.any(Object),
    });
    expect(profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite.eligibleRefs).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite.attemptedRefs).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite.writtenEdges).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite.edgeKindCounts.calls).toBeGreaterThan(0);
  }, 30_000);

  it('writes guarded Rust finalization edges for direct default function and class imports', () => {
    fs.writeFileSync(
      path.join(tempDir, 'default-function.ts'),
      'export default function runDefault(): number { return 1; }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'default-class.ts'),
      'export default class DefaultWidget { value(): number { return 2; } }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'default-entry.ts'),
      [
        "import localRun from './default-function';",
        "import LocalWidget from './default-class';",
        '',
        'export function defaultEntry(): number {',
        '  const widget: LocalWidget | null = null;',
        '  return localRun() + (widget ? widget.value() : 0);',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'guarded-default-edge-write-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entryFunction = cg.searchNodes('defaultEntry').find((match) => match.node.kind === 'function')?.node;
      const entryFile = cg.searchNodes('default-entry.ts').find((match) => match.node.kind === 'file')?.node;
      const functionFile = cg.searchNodes('default-function.ts').find((match) => match.node.kind === 'file')?.node;
      const classFile = cg.searchNodes('default-class.ts').find((match) => match.node.kind === 'file')?.node;
      const defaultFunction = cg.searchNodes('runDefault').find((match) => match.node.kind === 'function')?.node;
      const defaultClass = cg.searchNodes('DefaultWidget').find((match) => match.node.kind === 'class')?.node;
      expect(entryFunction).toBeDefined();
      expect(entryFile).toBeDefined();
      expect(functionFile).toBeDefined();
      expect(classFile).toBeDefined();
      expect(defaultFunction).toBeDefined();
      expect(defaultClass).toBeDefined();

      const usageEdges = cg.getOutgoingEdges(entryFunction!.id, undefined, 'rust-finalization');
      expect(usageEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'calls',
          target: defaultFunction!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-default-import-export',
          }),
        }),
      ]));
      const classImportEdges = cg.getOutgoingEdges(entryFile!.id, ['imports'], 'rust-finalization');
      expect(classImportEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: defaultClass!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-default-import-export',
          }),
        }),
      ]));

      const fileImportEdges = cg.getOutgoingEdges(entryFile!.id, ['imports'], 'rust-finalization');
      expect(fileImportEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: functionFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
        expect.objectContaining({
          target: classFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          guardedEdgeWrite: {
            eligibleRefs: number;
            attemptedRefs: number;
            writtenEdges: number;
            edgeKindCounts: Record<string, number>;
          };
        };
      };
    };
    const guardedEdgeWrite = profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite;
    expect(guardedEdgeWrite.eligibleRefs).toBeGreaterThanOrEqual(2);
    expect(guardedEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(2);
    expect(guardedEdgeWrite.writtenEdges).toBeGreaterThanOrEqual(2);
    expect(guardedEdgeWrite.edgeKindCounts.calls).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('records guarded edge-write skip taxonomy for unresolved direct named ESM imports', () => {
    fs.writeFileSync(
      path.join(tempDir, 'guarded-missing-target.ts'),
      'export function otherGuardedName(): number { return 1; }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'guarded-missing-entry.ts'),
      [
        "import { missingGuardedTarget } from './guarded-missing-target';",
        '',
        'export function guardedMissingEntry(): number {',
        '  return missingGuardedTarget();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'guarded-edge-write-missing-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          guardedEdgeWrite: {
            eligibleRefs: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            skipSamples: Array<Record<string, unknown>>;
          };
        };
      };
    };
    const guardedEdgeWrite = profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite;
    expect(guardedEdgeWrite.eligibleRefs).toBeGreaterThan(0);
    expect(guardedEdgeWrite.skippedRefs).toBeGreaterThan(0);
    expect(guardedEdgeWrite.skipReasons).toMatchObject({
      'export-symbol-missing': expect.any(Number),
    });
    expect(guardedEdgeWrite.skipSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        referenceName: 'missingGuardedTarget',
        reason: 'export-symbol-missing',
      }),
    ]));
  }, 30_000);

  it('records default import fail-closed taxonomy for unsupported default export forms', () => {
    fs.writeFileSync(
      path.join(tempDir, 'default-expression-target.ts'),
      [
        'const expressionDefault = () => 1;',
        'export default expressionDefault;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'default-expression-entry.ts'),
      [
        "import expressionLocal from './default-expression-target';",
        '',
        'export function defaultExpressionEntry(): number {',
        '  return expressionLocal();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'guarded-default-skip-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entryFunction = cg.searchNodes('defaultExpressionEntry').find((match) => match.node.kind === 'function')?.node;
      const expressionDefault = cg.searchNodes('expressionDefault')
        .find((match) => match.node.filePath === 'default-expression-target.ts')?.node;
      expect(entryFunction).toBeDefined();
      expect(expressionDefault).toBeDefined();

      const rustEdges = cg.getOutgoingEdges(entryFunction!.id, undefined, 'rust-finalization');
      expect(rustEdges.some((edge) => edge.target === expressionDefault!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          guardedEdgeWrite: {
            eligibleRefs: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            skipSamples: Array<Record<string, unknown>>;
          };
        };
      };
    };
    const guardedEdgeWrite = profile.finalize.referenceResolutionBreakdown.guardedEdgeWrite;
    expect(guardedEdgeWrite.eligibleRefs).toBeGreaterThan(0);
    expect(guardedEdgeWrite.skippedRefs).toBeGreaterThan(0);
    expect(guardedEdgeWrite.skipReasons).toMatchObject({
      'direct-default-export-candidate-zero': expect.any(Number),
    });
    expect(guardedEdgeWrite.skipSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        referenceName: 'expressionLocal',
        reason: 'direct-default-export-candidate-zero',
        resolvedByAttempt: 'direct-default-export',
      }),
    ]));
  }, 30_000);

  it('reports Rust-owned module edge-write diagnostics for relative and paths-alias file imports', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
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
    fs.writeFileSync(
      path.join(tempDir, 'src', 'helper.ts'),
      'export const helperValue = 1;\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'relative-entry.ts'),
      'import "./helper";\nexport const relativeEntry = helperValue;\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'alias-entry.ts'),
      'import "@app/helper";\nexport const aliasEntry = 1;\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'module-edge-write-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const relativeFile = cg.searchNodes('relative-entry.ts').find((match) => match.node.kind === 'file')?.node;
      const aliasFile = cg.searchNodes('alias-entry.ts').find((match) => match.node.kind === 'file')?.node;
      const helperFile = cg.searchNodes('helper.ts').find((match) => match.node.kind === 'file')?.node;
      expect(relativeFile).toBeDefined();
      expect(aliasFile).toBeDefined();
      expect(helperFile).toBeDefined();

      const relativeImports = cg.getOutgoingEdges(relativeFile!.id, ['imports'], 'rust-finalization');
      const aliasImports = cg.getOutgoingEdges(aliasFile!.id, ['imports'], 'rust-finalization');
      expect(relativeImports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: helperFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      expect(aliasImports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: helperFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            owner: string;
            mode: string;
            eligibleRefs: number;
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            edgeKindCounts: Record<string, number>;
            supportedSources: string[];
            excludedSources: string[];
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite).toMatchObject({
      owner: 'rust-core',
      mode: 'guarded-file-imports',
      eligibleRefs: expect.any(Number),
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      edgeKindCounts: expect.objectContaining({
        imports: expect.any(Number),
      }),
      supportedSources: ['relative', 'tsconfigPaths'],
      excludedSources: expect.arrayContaining([
        'rootDirs',
        'packageSelfName',
        'packageImports',
        'packageExports',
        'defaultImports',
        'symbolUsageEdges',
        'declarationRuntimeRewrite',
      ]),
    });
    expect(moduleEdgeWrite.excludedSources).not.toContain('namespaceImports');
    expect(moduleEdgeWrite.eligibleRefs).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.writtenEdges).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.edgeKindCounts.imports).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it('writes namespace import module dependencies as Rust-owned file dependency edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'source.ts'), 'export const SOME_CONST = 42;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import * as NS from './source';",
        'export const value = NS.SOME_CONST;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'namespace-import-edge-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const sourceFile = cg.searchNodes('source.ts').find((match) => match.node.kind === 'file')?.node;
      const sourceSymbol = cg.searchNodes('SOME_CONST').find((match) => match.node.filePath === 'src/source.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(sourceFile).toBeDefined();
      expect(sourceSymbol).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: sourceFile!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-import-path-alias',
          }),
        }),
      ]));
      expect(importEdges.some((edge) => edge.target === sourceSymbol!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            attemptedRefs: number;
            writtenEdges: number;
            edgeKindCounts: Record<string, number>;
            excludedSources: string[];
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.writtenEdges).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.edgeKindCounts.imports).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.excludedSources).not.toContain('namespaceImports');
  }, 30_000);

  it('reports fail-closed module edge-write skip taxonomy without writing missing target imports', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@missing/*': ['src/missing/*'],
            '@ghost': ['src/ghost.txt'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'src', 'dep.ts'), 'export const dep = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'ghost.txt'), 'not indexed as code\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { dep } from './dep';",
        "import { missing } from '@missing/value';",
        "import { ghost } from '@ghost';",
        'export const total = dep;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'module-edge-write-skip-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const depFile = cg.searchNodes('dep.ts').find((match) => match.node.kind === 'file')?.node;
      const depSymbol = cg.searchNodes('dep').find((match) => match.node.filePath === 'src/dep.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(depFile).toBeDefined();
      expect(depSymbol).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: depFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      const allowedTargets = new Set([depFile!.id, depSymbol!.id]);
      expect(importEdges.every((edge) => allowedTargets.has(edge.target))).toBe(true);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            edgeKindCounts: Record<string, number>;
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite).toMatchObject({
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: {
        'tsconfig-path-target-not-found': expect.any(Number),
        'file-node-not-found': expect.any(Number),
      },
      edgeKindCounts: {
        imports: expect.any(Number),
      },
    });
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(3);
    expect(moduleEdgeWrite.writtenEdges).toBe(1);
    expect(moduleEdgeWrite.skippedRefs).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.skipReasons['tsconfig-path-target-not-found']).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.skipReasons['file-node-not-found']).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports namespace import fail-closed taxonomy without writing unsafe file edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import * as MissingNS from './missing';",
        'export const value = MissingNS.SOME_CONST;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'namespace-import-fail-closed-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual([]);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            excludedSources: string[];
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.writtenEdges).toBe(0);
    expect(moduleEdgeWrite.skippedRefs).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.skipReasons['target-not-found']).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.excludedSources).not.toContain('namespaceImports');
  }, 30_000);

  it('reports declaration/runtime module edge-write diagnostics in the public profile', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root' }) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'api.d.ts'), 'export declare const api: number;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'api.ts'), 'export const api = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'main.ts'), "import './api.d.ts';\n");

    const profileOut = path.join(tempDir, '.zcodegraph', 'declaration-runtime-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            declarationRuntime: {
              mode: string;
              eligibleRefs: number;
              rewrittenEdges: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
            };
          };
        };
      };
    };
    const declarationRuntime = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime;
    expect(declarationRuntime).toMatchObject({
      mode: 'single-runtime-sibling-only',
      eligibleRefs: expect.any(Number),
      rewrittenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
    });
    expect(declarationRuntime.eligibleRefs).toBeGreaterThanOrEqual(1);
    expect(declarationRuntime.rewrittenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('rewrites declaration module imports to unique runtime sibling file edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root' }) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'api.d.ts'), 'export declare const api: number;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'api.ts'), 'export const api = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'main.ts'), "import './api.d.ts';\n");

    const profileOut = path.join(tempDir, '.zcodegraph', 'declaration-runtime-rewrite-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const declarationFile = cg.searchNodes('api.d.ts').find((match) => match.node.kind === 'file')?.node;
      const runtimeFile = cg.searchNodes('api.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(declarationFile).toBeDefined();
      expect(runtimeFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: runtimeFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      expect(importEdges.some((edge) => edge.target === declarationFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            declarationRuntime: {
              rewrittenEdges: number;
            };
          };
        };
      };
    };
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime.rewrittenEdges)
      .toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports fail-closed declaration/runtime skip taxonomy without choosing uncertain runtime siblings', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root' }) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'multi.d.ts'), 'export declare const multi: number;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'multi.ts'), 'export const multi = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'multi.js'), 'export const multi = 2;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'missing.d.ts'), 'export declare const missing: number;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import './multi.d.ts';",
        "import './missing.d.ts';",
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'declaration-runtime-skip-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const multiTsFile = cg.searchNodes('multi.ts').find((match) => match.node.kind === 'file')?.node;
      const multiJsFile = cg.searchNodes('multi.js').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(multiTsFile).toBeDefined();
      expect(multiJsFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges.some((edge) => edge.target === multiTsFile!.id)).toBe(false);
      expect(importEdges.some((edge) => edge.target === multiJsFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            declarationRuntime: {
              skippedRefs: number;
              skipReasons: Record<string, number>;
            };
          };
        };
      };
    };
    const declarationRuntime = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime;
    expect(declarationRuntime.skippedRefs).toBeGreaterThanOrEqual(2);
    expect(declarationRuntime.skipReasons).toMatchObject({
      'multiple-runtime-siblings': expect.any(Number),
      'no-runtime-sibling': expect.any(Number),
    });
    expect(declarationRuntime.skipReasons['multiple-runtime-siblings']).toBeGreaterThanOrEqual(1);
    expect(declarationRuntime.skipReasons['no-runtime-sibling']).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports package self-name module edge-write diagnostics in the public profile', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: '@fixture/app',
      private: true,
    }) + '\n');
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const rootValue = 1;\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { rootValue } from '@fixture/app';",
        'export const total = rootValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-self-name-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              mode: string;
              eligibleRefs: number;
              writtenEdges: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageSelfName = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName;
    expect(packageSelfName).toMatchObject({
      mode: 'repo-local-file-targets-only',
      eligibleRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      outcomeCounts: expect.objectContaining({
        resolvedRootIndex: expect.any(Number),
      }),
    });
    expect(packageSelfName.eligibleRefs).toBeGreaterThanOrEqual(1);
    expect(packageSelfName.writtenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports package imports module edge-write diagnostics in the public profile', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#internal': './src/internal.ts',
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'internal.ts'), 'export const internalValue = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { internalValue } from '#internal';",
        'export const total = internalValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              mode: string;
              eligibleRefs: number;
              attemptedRefs: number;
              writtenEdges: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageImports = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports;
    expect(packageImports).toMatchObject({
      mode: 'repo-local-file-targets-only',
      eligibleRefs: expect.any(Number),
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      outcomeCounts: expect.objectContaining({
        importsResolved: expect.any(Number),
      }),
    });
    expect(packageImports.eligibleRefs).toBeGreaterThanOrEqual(1);
    expect(packageImports.attemptedRefs).toBeGreaterThanOrEqual(1);
    expect(packageImports.writtenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('writes package imports direct keys as Rust-owned file dependency edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#internal': './src/internal.ts',
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'internal.ts'), 'export const internalValue = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { internalValue } from '#internal';",
        'export const total = internalValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-edge-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const internalFile = cg.searchNodes('internal.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(internalFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: internalFile!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-import-path-alias',
          }),
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports.writtenEdges)
      .toBeGreaterThanOrEqual(1);
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports.outcomeCounts)
      .toMatchObject({ importsResolved: expect.any(Number) });
  }, 30_000);

  it('writes package imports pattern and condition targets as Rust-owned file dependency edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#feature/*': './src/features/*.ts',
        '#typed': {
          import: {
            default: './src/typed.ts',
          },
        },
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src', 'features'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'features', 'tool.ts'), 'export const featureValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'typed.ts'), 'export const typedValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { featureValue } from '#feature/tool';",
        "import { typedValue } from '#typed';",
        'export const total = featureValue + typedValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-pattern-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const featureFile = cg.searchNodes('tool.ts').find((match) => match.node.kind === 'file')?.node;
      const typedFile = cg.searchNodes('typed.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(featureFile).toBeDefined();
      expect(typedFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: featureFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
        expect.objectContaining({
          target: typedFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageImports = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports;
    expect(packageImports.writtenEdges).toBeGreaterThanOrEqual(2);
    expect(packageImports.outcomeCounts).toMatchObject({
      importsResolved: expect.any(Number),
    });
    expect(packageImports.outcomeCounts.importsResolved).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it('reports package imports fail-closed taxonomy without writing unsafe package edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#blocked': null,
        '#array': ['./src/array.ts'],
        '#missing': './src/missing.ts',
        '#escape': '../shared/index.ts',
      },
    }, null, 2) + '\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'array.ts'), 'export const arrayValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'shared', 'index.ts'), 'export const sharedValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { blockedValue } from '#blocked';",
        "import { arrayValue } from '#array';",
        "import { missingValue } from '#missing';",
        "import { sharedValue } from '#escape';",
        'export const total = 0;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-fail-closed-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const arrayFile = cg.searchNodes('array.ts').find((match) => match.node.kind === 'file')?.node;
      const sharedFile = cg.searchNodes('index.ts')
        .find((match) => match.node.kind === 'file' && match.node.filePath === 'shared/index.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(arrayFile).toBeDefined();
      expect(sharedFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges.some((edge) => edge.target === arrayFile!.id)).toBe(false);
      expect(importEdges.some((edge) => edge.target === sharedFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              eligibleRefs: number;
              attemptedRefs: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageImports = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports;
    expect(packageImports.eligibleRefs).toBeGreaterThanOrEqual(4);
    expect(packageImports.attemptedRefs).toBe(packageImports.eligibleRefs);
    expect(packageImports.skippedRefs).toBeGreaterThanOrEqual(4);
    expect(packageImports.outcomeCounts).toMatchObject({
      importsBlocked: expect.any(Number),
      importsUnsupported: expect.any(Number),
      importsMissingTarget: expect.any(Number),
      importsTargetEscapesPackage: expect.any(Number),
    });
    expect(packageImports.skipReasons).toMatchObject({
      importsBlocked: expect.any(Number),
      importsUnsupported: expect.any(Number),
      importsMissingTarget: expect.any(Number),
      importsTargetEscapesPackage: expect.any(Number),
    });
  }, 30_000);

  it('rewrites package imports declaration targets to runtime sibling file edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#typed': {
          import: {
            types: './types/typed.d.ts',
            default: './src/typed.ts',
          },
        },
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'types'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'types', 'typed.d.ts'), 'export declare const typedValue: number;\n');
    fs.writeFileSync(path.join(tempDir, 'types', 'typed.ts'), 'export const typedValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'typed.ts'), 'export const runtimeTypedValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { typedValue } from '#typed';",
        'export const total = typedValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-runtime-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const declarationFile = cg.searchNodes('typed.d.ts').find((match) => match.node.kind === 'file')?.node;
      const runtimeSiblingFile = cg.searchNodes('typed.ts')
        .find((match) => match.node.kind === 'file' && match.node.filePath === 'types/typed.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(declarationFile).toBeDefined();
      expect(runtimeSiblingFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: runtimeSiblingFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      expect(importEdges.some((edge) => edge.target === declarationFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
            declarationRuntime: {
              rewrittenEdges: number;
            };
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.packageImports.writtenEdges).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.packageImports.outcomeCounts).toMatchObject({
      importsResolved: expect.any(Number),
    });
    expect(moduleEdgeWrite.declarationRuntime.rewrittenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('writes package self-name root imports as Rust-owned file dependency edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: '@fixture/app',
      private: true,
    }) + '\n');
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const rootValue = 1;\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { rootValue } from '@fixture/app';",
        'export const total = rootValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-self-name-edge-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const entryFile = cg.searchNodes('index.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(entryFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: entryFile!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-import-path-alias',
          }),
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName.writtenEdges)
      .toBeGreaterThanOrEqual(1);
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName.outcomeCounts)
      .toMatchObject({ resolvedRootIndex: expect.any(Number) });
  }, 30_000);

  it('rewrites package exports declaration targets to runtime sibling file edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: '@fixture/app',
      private: true,
      exports: {
        '.': {
          types: './types/index.d.ts',
          default: './src/index.ts',
        },
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'types'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'types', 'index.d.ts'), 'export declare const api: number;\n');
    fs.writeFileSync(path.join(tempDir, 'types', 'index.ts'), 'export const api = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'export const runtimeEntry = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { api } from '@fixture/app';",
        'export const total = api;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-exports-runtime-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const declarationFile = cg.searchNodes('index.d.ts').find((match) => match.node.kind === 'file')?.node;
      const runtimeFile = cg.searchNodes('index.ts').find((match) => match.node.kind === 'file' && match.node.filePath === 'types/index.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(declarationFile).toBeDefined();
      expect(runtimeFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: runtimeFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      expect(importEdges.some((edge) => edge.target === declarationFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
            declarationRuntime: {
              rewrittenEdges: number;
            };
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.packageSelfName.writtenEdges).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.packageSelfName.outcomeCounts).toMatchObject({
      exportsResolved: expect.any(Number),
    });
    expect(moduleEdgeWrite.declarationRuntime.rewrittenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports package self-name fail-closed taxonomy without writing unsupported package edges', () => {
    fs.mkdirSync(path.join(tempDir, 'packages', 'blocked', 'internal'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'packages', 'array'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root', private: true }) + '\n');
    fs.writeFileSync(
      path.join(tempDir, 'packages', 'blocked', 'package.json'),
      JSON.stringify({
        name: '@fixture/blocked',
        exports: {
          './internal/*': null,
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'packages', 'array', 'package.json'),
      JSON.stringify({
        name: '@fixture/array',
        exports: ['./index.ts'],
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'packages', 'blocked', 'internal', 'foo.ts'), 'export const blockedValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'packages', 'array', 'index.ts'), 'export const arrayValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { blockedValue } from '@fixture/blocked/internal/foo';",
        "import { arrayValue } from '@fixture/array';",
        'export const total = 0;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-self-name-fail-closed-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const blockedFile = cg.searchNodes('foo.ts').find((match) => match.node.kind === 'file')?.node;
      const arrayFile = cg.searchNodes('index.ts')
        .find((match) => match.node.kind === 'file' && match.node.filePath === 'packages/array/index.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(blockedFile).toBeDefined();
      expect(arrayFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges.some((edge) => edge.target === blockedFile!.id)).toBe(false);
      expect(importEdges.some((edge) => edge.target === arrayFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageSelfName = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName;
    expect(packageSelfName.skippedRefs).toBeGreaterThanOrEqual(2);
    expect(packageSelfName.outcomeCounts).toMatchObject({
      exportsBlocked: expect.any(Number),
      exportsUnsupported: expect.any(Number),
    });
    expect(packageSelfName.skipReasons).toMatchObject({
      exportsBlocked: expect.any(Number),
      exportsUnsupported: expect.any(Number),
    });
  }, 30_000);

  it('reports finalization cleanup ownership as a public contract diagnostic', () => {
    fs.writeFileSync(
      path.join(tempDir, 'cleanup_contract.rb'),
      [
        'def cleanup_target',
        '  1',
        'end',
        '',
        'def cleanup_entry',
        '  cleanup_target',
        'end',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'cleanup-missing.ts'),
      [
        'export function cleanupMissingEntry(): void {',
        '  missingCleanupTarget();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'cleanup-ownership-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          resolvedCleanupRowCount: number;
          intentionallyUnresolvedCleanupRowCount: number;
          cleanupOwnership: {
            owner: string;
            mode: string;
            resolvedTerminalRefs: number;
            intentionallyUnresolvedTerminalRefs: number;
            retainedRefs: number;
            rustCorePrecleanedRefs: number | null;
            notes: string[];
          };
        };
      };
    };
    const breakdown = profile.finalize.referenceResolutionBreakdown;

    expect(breakdown.cleanupOwnership).toMatchObject({
      owner: 'typescript-finalization',
      mode: 'contract-only',
      resolvedTerminalRefs: breakdown.resolvedCleanupRowCount,
      intentionallyUnresolvedTerminalRefs: breakdown.intentionallyUnresolvedCleanupRowCount,
      retainedRefs: expect.any(Number),
      rustCorePrecleanedRefs: null,
      notes: expect.arrayContaining([
        expect.stringContaining('does not migrate cleanup into Rust core'),
      ]),
    });
    expect(breakdown.cleanupOwnership.resolvedTerminalRefs).toBeGreaterThan(0);
    expect(breakdown.cleanupOwnership.intentionallyUnresolvedTerminalRefs).toBeGreaterThan(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.queries.getUnresolvedReferencesCount()).toBe(breakdown.cleanupOwnership.retainedRefs);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('writes Rust candidate producer shadow diagnostics for exact, lower, and known-name lookups', () => {
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer.ts'),
      [
        'export class MixedProducerName {',
        '  value = 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer-helper.ts'),
      [
        'export function producerHelper(): number {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer-calls.ts'),
      [
        'type MixedProducerAlias = MixedProducerName;',
        '',
        'export function producerEntry(value: MixedProducerName): number {',
        '  return producerHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-candidate-producer-profile.json');
    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'config.json'),
      JSON.stringify({ experimental: { rustCandidateProducerRouting: false } }, null, 2),
    );
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_CANDIDATE_PROTOCOL: '1',
      ZCODEGRAPH_RUST_CANDIDATE_PRODUCER: '1',
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          candidateProtocol: {
            rustCandidateProducer: {
              enabled: boolean;
              shadowMode: boolean;
              lookupCount: number;
              lookupShapeCounts: Record<string, number>;
              comparedCount: number;
              mismatchCount: number;
              mismatchReasons: Record<string, number>;
              mismatchSamples: unknown[];
              candidateCount: number;
              payloadBytes: number;
              disabledReason: string | null;
            };
          };
        };
      };
    };
    const producer = profile.finalize.referenceResolutionBreakdown.candidateProtocol.rustCandidateProducer;
    expect(producer).toMatchObject({
      enabled: true,
      shadowMode: true,
      lookupShapeCounts: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      comparedCount: expect.any(Number),
      mismatchCount: 0,
      mismatchReasons: {},
      mismatchSamples: [],
      disabledReason: null,
    });
    expect(producer.lookupCount).toBeGreaterThan(0);
    expect(producer.lookupShapeCounts.ExactName).toBeGreaterThan(0);
    expect(producer.lookupShapeCounts.LowerName).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.QualifiedName).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.FileNodes).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.KnownNamePresence).toBeGreaterThan(0);
    expect(producer.comparedCount).toBe(producer.lookupCount);
    expect(producer.candidateCount).toBeGreaterThan(0);
    expect(producer.payloadBytes).toBeGreaterThan(0);
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

  it('resolves direct ESM named imports to exported target-file symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'target.ts'),
      [
        'export function importedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { importedHelper } from "./target";',
        'export function importedEntry() {',
        '  return importedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-named-import-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: { boundaryProtocol: { rustOwnedStages: string[] } };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('esm-named-import-export-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('importedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('importedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/target.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves paths-alias ESM named imports to exported target-file symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
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
    fs.writeFileSync(
      path.join(tempDir, 'src', 'alias-target.ts'),
      [
        'export function aliasedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { aliasedHelper } from "@app/alias-target";',
        'export function aliasedEntry() {',
        '  return aliasedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('aliasedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('aliasedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/alias-target.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves declaration-style ESM named exports with TypeScript modifiers', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'target.ts'),
      [
        'export async function asyncHelper() {',
        '  return 41;',
        '}',
        'export abstract class AbstractWorker {',
        '  abstract run(): number;',
        '}',
        'export declare function declaredHelper(): number;',
        'export const typedValue: number = 42;',
        'export var mutableValue = 43;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { asyncHelper, AbstractWorker, declaredHelper, typedValue, mutableValue } from "./target";',
        'export function useDeclarationStyleExports() {',
        '  asyncHelper();',
        '  declaredHelper();',
        '  return [AbstractWorker, typedValue, mutableValue];',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-declaration-style-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        esmNamedImportExportFallbackSampleCounts?: Record<string, number>;
      };
    };
    expect(profile.rustCore.esmNamedImportExportFallbackSampleCounts ?? {}).not.toHaveProperty(
      'direct-export-candidate-zero',
    );

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      const importEdges = cg.getOutgoingEdges(mainFile!.id).filter((edge) => edge.kind === 'imports');
      for (const name of ['asyncHelper', 'AbstractWorker', 'declaredHelper', 'typedValue', 'mutableValue']) {
        const target = cg.searchNodes(name).find((match) => match.node.filePath === 'src/target.ts')?.node;
        expect(target, `${name} should be indexed`).toBeDefined();
        expect(
          importEdges.some((edge) => edge.target === target!.id && edge.edgeOrigin === 'rust-finalization'),
          `${name} import should resolve to target symbol`,
        ).toBe(true);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves same-file ESM export specifiers only for unique local bindings', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'target.ts'),
      [
        'function localOnlyHelper() {',
        '  return 41;',
        '}',
        'export { localOnlyHelper };',
        'interface AmbiguousThing { value: number; }',
        'class AmbiguousThing {',
        '  value = 1;',
        '}',
        'export { AmbiguousThing };',
        'function AliasLocal() {',
        '  return 42;',
        '}',
        'export { AliasLocal as AliasPublic };',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { localOnlyHelper, AmbiguousThing, AliasPublic } from "./target";',
        'export function useSameFileExports() {',
        '  localOnlyHelper();',
        '  return [AmbiguousThing, AliasPublic];',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-same-file-export-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const helper = cg.searchNodes('localOnlyHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/target.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(helper).toBeDefined();

      const importEdges = cg.getOutgoingEdges(mainFile!.id).filter((edge) => edge.kind === 'imports');
      expect(importEdges.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);

      const ambiguousTargets = cg.searchNodes('AmbiguousThing')
        .filter((match) => match.node.filePath === 'src/target.ts')
        .map((match) => match.node.id);
      expect(ambiguousTargets.length).toBeGreaterThanOrEqual(2);
      expect(
        importEdges.some((edge) => ambiguousTargets.includes(edge.target) && edge.edgeOrigin === 'rust-finalization'),
      ).toBe(false);

      const aliasTarget = cg.searchNodes('AliasLocal').find((match) => match.node.filePath === 'src/target.ts')?.node;
      expect(aliasTarget).toBeDefined();
      expect(importEdges.some((edge) => edge.target === aliasTarget!.id && edge.edgeOrigin === 'rust-finalization')).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        esmNamedImportExportFallbackSampleCounts: Record<string, number>;
        esmNamedImportExportFallbackSamples: Array<Record<string, unknown>>;
      };
    };
    expect(profile.rustCore.esmNamedImportExportFallbackSampleCounts).toMatchObject({
      'same-file-export-specifier-candidate-multiple': 1,
      'direct-export-candidate-zero': 1,
    });
    expect(profile.rustCore.esmNamedImportExportFallbackSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'same-file-export-specifier-candidate-multiple',
          referenceName: 'AmbiguousThing',
          candidateCount: 2,
          resolvedByAttempt: 'same-file-export-specifier',
        }),
        expect.objectContaining({
          reason: 'direct-export-candidate-zero',
          referenceName: 'AliasPublic',
          candidateCount: 0,
          resolvedByAttempt: 'direct-export',
        }),
      ]),
    );
  }, 30_000);

  it('resolves guarded TypeScript overload implementations and keeps no-go cases as fallback', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'direct.ts'),
      [
        'export function parseDirect(value: string): string;',
        'export function parseDirect(value: number): string;',
        'export function parseDirect(value: string | number) {',
        '  return String(value);',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'same-file.ts'),
      [
        'function parseSameFile(value: string): string;',
        'function parseSameFile(value: number): string;',
        'function parseSameFile(value: string | number) {',
        '  return String(value);',
        '}',
        'export { parseSameFile };',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'ambient.ts'),
      [
        'export declare function ambientOnly(value: string): string;',
        'export declare function ambientOnly(value: number): string;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'types.d.ts'),
      [
        'export declare function declaredOnly(value: string): string;',
        'export declare function declaredOnly(value: number): string;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'collision.ts'),
      [
        'export type Collided = { value: string };',
        "export const Collided = { value: 'x' };",
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { parseDirect } from "./direct";',
        'import { parseSameFile } from "./same-file";',
        'import { ambientOnly } from "./ambient";',
        'import { declaredOnly } from "./types";',
        'import { Collided } from "./collision";',
        'export function useOverloads() {',
        "  return [parseDirect('x'), parseSameFile('x'), ambientOnly('x'), declaredOnly('x'), Collided];",
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-overload-implementation-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const entry = cg.searchNodes('useOverloads').find((match) => match.node.kind === 'function')?.node;
      const directImplementation = cg.searchNodes('parseDirect')
        .find((match) => match.node.kind === 'function' && match.node.filePath === 'src/direct.ts' && match.node.startLine === 3)?.node;
      const sameFileImplementation = cg.searchNodes('parseSameFile')
        .find((match) => match.node.kind === 'function' && match.node.filePath === 'src/same-file.ts' && match.node.startLine === 3)?.node;
      expect(mainFile).toBeDefined();
      expect(entry).toBeDefined();
      expect(directImplementation).toBeDefined();
      expect(sameFileImplementation).toBeDefined();

      const importEdges = cg.getOutgoingEdges(mainFile!.id).filter((edge) => edge.kind === 'imports');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: directImplementation!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-named-import-export-overload-implementation',
          }),
        }),
        expect.objectContaining({
          target: sameFileImplementation!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-named-import-export-overload-implementation',
          }),
        }),
      ]));

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: directImplementation!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-named-import-export-overload-implementation',
          }),
        }),
        expect.objectContaining({
          target: sameFileImplementation!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-named-import-export-overload-implementation',
          }),
        }),
      ]));

      for (const name of ['ambientOnly', 'declaredOnly', 'Collided']) {
        const noGoTargets = cg.searchNodes(name).map((match) => match.node.id);
        expect(importEdges.some((edge) => noGoTargets.includes(edge.target) && edge.edgeOrigin === 'rust-finalization')).toBe(false);
      }
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        esmNamedImportExportOverloadImplementationResolvedRefs?: number;
        esmNamedImportExportFallbackSampleCounts: Record<string, number>;
      };
    };
    expect(profile.rustCore.esmNamedImportExportOverloadImplementationResolvedRefs).toBe(4);
    expect(profile.rustCore.esmNamedImportExportFallbackSampleCounts).toMatchObject({
      'direct-export-candidate-multiple': 3,
    });
  }, 30_000);

  it('routes guarded value-token plus interface imports only when value usage is visible', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'token.ts'),
      [
        'export interface ServiceToken { value: string }',
        'export const ServiceToken = Symbol("ServiceToken");',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'view.tsx'),
      [
        'import { ServiceToken } from "./token";',
        'export function View() {',
        '  return <ServiceToken />;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'decorated.ts'),
      [
        'import { ServiceToken } from "./token";',
        'export class Decorated {',
        '  constructor(@ServiceToken service: unknown) {}',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'type-only.ts'),
      [
        'import type { ServiceToken } from "./token";',
        'export type Alias = ServiceToken;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'type-position.ts'),
      [
        'import { ServiceToken } from "./token";',
        'export const typed = (value: ServiceToken) => value;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'unknown.ts'),
      [
        'import { ServiceToken } from "./token";',
        'export const untouched = 1;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-value-token-interface-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const viewFile = cg.searchNodes('view.tsx').find((match) => match.node.kind === 'file')?.node;
      const viewFunction = cg.searchNodes('View')
        .find((match) => ['function', 'component'].includes(match.node.kind))?.node;
      const decoratedFile = cg.searchNodes('decorated.ts').find((match) => match.node.kind === 'file')?.node;
      const typeOnlyFile = cg.searchNodes('type-only.ts').find((match) => match.node.kind === 'file')?.node;
      const typePositionFile = cg.searchNodes('type-position.ts').find((match) => match.node.kind === 'file')?.node;
      const unknownFile = cg.searchNodes('unknown.ts').find((match) => match.node.kind === 'file')?.node;
      const tokenConstant = cg.searchNodes('ServiceToken')
        .find((match) => match.node.kind === 'constant' && match.node.filePath === 'src/token.ts')?.node;
      const tokenInterface = cg.searchNodes('ServiceToken')
        .find((match) => match.node.kind === 'interface' && match.node.filePath === 'src/token.ts')?.node;
      expect(viewFile).toBeDefined();
      expect(viewFunction).toBeDefined();
      expect(decoratedFile).toBeDefined();
      expect(typeOnlyFile).toBeDefined();
      expect(typePositionFile).toBeDefined();
      expect(unknownFile).toBeDefined();
      expect(tokenConstant).toBeDefined();
      expect(tokenInterface).toBeDefined();

      const viewImports = cg.getOutgoingEdges(viewFile!.id).filter((edge) => edge.kind === 'imports');
      expect(viewImports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: tokenConstant!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-value-token-interface',
          }),
        }),
      ]));
      expect(viewImports.some((edge) => edge.target === tokenInterface!.id && edge.edgeOrigin === 'rust-finalization')).toBe(false);

      const decoratedImports = cg.getOutgoingEdges(decoratedFile!.id).filter((edge) => edge.kind === 'imports');
      expect(decoratedImports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: tokenConstant!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-value-token-interface',
          }),
        }),
      ]));
      expect(decoratedImports.some((edge) => edge.target === tokenInterface!.id && edge.edgeOrigin === 'rust-finalization')).toBe(false);

      const viewReferences = cg.getOutgoingEdges(viewFunction!.id).filter((edge) => edge.kind === 'references');
      expect(viewReferences).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: tokenConstant!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-esm-value-token-interface',
          }),
        }),
      ]));
      expect(viewReferences.some((edge) => edge.target === tokenInterface!.id && edge.edgeOrigin === 'rust-finalization')).toBe(false);

      for (const file of [typeOnlyFile!, typePositionFile!, unknownFile!]) {
        const edges = cg.getOutgoingEdges(file.id).filter((edge) => edge.edgeOrigin === 'rust-finalization');
        expect(edges.some((edge) => edge.target === tokenConstant!.id || edge.target === tokenInterface!.id)).toBe(false);
      }
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        esmNamedImportExportFallbackSampleCounts: Record<string, number>;
        esmNamedImportExportFallbackSamples: Array<Record<string, unknown>>;
      };
    };
    expect(profile.rustCore.esmNamedImportExportFallbackSampleCounts).toMatchObject({
      'type-only-import': 1,
      'direct-export-candidate-multiple': 2,
    });
    expect(profile.rustCore.esmNamedImportExportFallbackSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reason: 'type-only-import',
        referenceName: 'ServiceToken',
        filePath: 'src/type-only.ts',
      }),
      expect.objectContaining({
        reason: 'direct-export-candidate-multiple',
        referenceName: 'ServiceToken',
        filePath: 'src/type-position.ts',
        candidateCount: 2,
      }),
      expect.objectContaining({
        reason: 'direct-export-candidate-multiple',
        referenceName: 'ServiceToken',
        filePath: 'src/unknown.ts',
        candidateCount: 2,
      }),
    ]));
  }, 30_000);

  it('resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'leaf.ts'),
      [
        'export function reexportedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'barrel.ts'),
      'export { reexportedHelper } from "./leaf";\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { reexportedHelper } from "./barrel";',
        'export function reexportedEntry() {',
        '  return reexportedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-reexport-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: { boundaryProtocol: { rustOwnedStages: string[] } };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('esm-one-hop-reexport-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('reexportedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('reexportedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/leaf.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
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
    fs.writeFileSync(
      path.join(tempDir, 'src', 'leaf.ts'),
      [
        'export function aliasReexportedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'barrel.ts'),
      'export { aliasReexportedHelper } from "@app/leaf";\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { aliasReexportedHelper } from "@app/barrel";',
        'export function aliasReexportedEntry() {',
        '  return aliasReexportedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('aliasReexportedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('aliasReexportedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/leaf.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('emits bounded ESM named binding fallback samples in the profile artifact', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src/types.ts'),
      'export interface TypeOnlyThing { value: number; }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src/direct-zero.ts'),
      'export function otherName() { return 1; }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src/direct-multiple.ts'),
      [
        'export interface DuplicateThing { value: number; }',
        'export class DuplicateThing {',
        '  value = 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src/barrel-missing.ts'),
      'export { MissingLeaf } from "./missing-leaf";\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src/barrel-zero.ts'),
      'export { LeafMissing } from "./leaf-zero";\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src/leaf-zero.ts'),
      'export function otherLeaf() { return 2; }\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import type { TypeOnlyThing } from "./types";',
        'import { MissingExport } from "./direct-zero";',
        'import { DuplicateThing } from "./direct-multiple";',
        'import { MissingLeaf } from "./barrel-missing";',
        'import { LeafMissing } from "./barrel-zero";',
        'import { describe } from "vitest";',
        'export const useFallbacks = [MissingExport, DuplicateThing, MissingLeaf, LeafMissing, describe];',
        'export type UseTypeOnly = TypeOnlyThing;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-fallback-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        esmNamedImportExportFallbackRefs: number;
        esmNamedImportExportFallbackSampleCounts: Record<string, number>;
        esmNamedImportExportFallbackSamples: Array<Record<string, unknown>>;
        esmNamedImportExportFallbackSampleCap: {
          perBucket: number;
          total: number;
          truncated: boolean;
        };
      };
    };

    expect(profile.rustCore.esmNamedImportExportFallbackRefs).toBeGreaterThanOrEqual(7);
    expect(profile.rustCore.esmNamedImportExportFallbackSampleCounts).toMatchObject({
      'type-only-import': 1,
      'direct-export-candidate-zero': 2,
      'direct-export-candidate-multiple': 1,
      'reexport-specifier-target-not-found': 1,
      'reexport-leaf-candidate-zero': 1,
      'package-or-runtime-binding': 2,
    });
    expect(profile.rustCore.esmNamedImportExportFallbackSampleCap).toEqual({
      perBucket: 100,
      total: 2000,
      truncated: false,
    });
    expect(profile.rustCore.esmNamedImportExportFallbackSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'type-only-import',
          referenceName: 'TypeOnlyThing',
          referenceKind: 'imports',
          filePath: 'src/main.ts',
          language: 'typescript',
        }),
        expect.objectContaining({
          reason: 'direct-export-candidate-zero',
          referenceName: 'MissingExport',
          targetFilePath: 'src/direct-zero.ts',
          candidateCount: 0,
          resolvedByAttempt: 'direct-export',
        }),
        expect.objectContaining({
          reason: 'direct-export-candidate-multiple',
          referenceName: 'DuplicateThing',
          targetFilePath: 'src/direct-multiple.ts',
          candidateCount: 2,
          resolvedByAttempt: 'direct-export',
        }),
        expect.objectContaining({
          reason: 'reexport-specifier-target-not-found',
          referenceName: 'MissingLeaf',
          targetFilePath: 'src/barrel-missing.ts',
          candidateCount: 0,
          resolvedByAttempt: 'one-hop-reexport',
        }),
        expect.objectContaining({
          reason: 'reexport-leaf-candidate-zero',
          referenceName: 'LeafMissing',
          targetFilePath: 'src/barrel-zero.ts',
          candidateCount: 0,
          resolvedByAttempt: 'one-hop-reexport',
        }),
        expect.objectContaining({
          reason: 'package-or-runtime-binding',
          referenceName: 'describe',
        }),
      ]),
    );
    for (const sample of profile.rustCore.esmNamedImportExportFallbackSamples) {
      expect(sample).not.toHaveProperty('source');
      expect(sample).not.toHaveProperty('sourceContent');
      expect(sample).not.toHaveProperty('sourceLine');
      expect(sample).not.toHaveProperty('exportList');
      expect(sample).not.toHaveProperty('candidateNames');
      expect(sample).not.toHaveProperty('candidateSource');
    }
  }, 30_000);

  it('reports Rust index-engine metadata through MCP status', async () => {
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const handler = new ToolHandler(cg);
      const result = await handler.execute('zcodegraph_status', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('**Index engine:** rust');
      expect(result.content[0].text).toContain('**Index engine version:** 0.1.0');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes one JavaScript file so TypeScript queries can find its symbols', () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.js'),
      [
        'export function beta(value) {',
        '  return value + 1;',
        '}',
        '',
        'export class Widget {',
        '  render() { return beta(1); }',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const stats = cg.getStats();
      expect(stats.fileCount).toBeGreaterThanOrEqual(2);
      expect(stats.nodeCount).toBeGreaterThanOrEqual(3);
      expect(cg.searchNodes('beta').some((match) => match.node.name === 'beta')).toBe(true);
      expect(cg.searchNodes('Widget').some((match) => match.node.name === 'Widget')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes Go symbols through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'server.go'),
      [
        'package main',
        '',
        'type User struct {',
        '  Name string',
        '}',
        '',
        'type Store interface {',
        '  List() []User',
        '}',
        '',
        'type Handler struct {',
        '  store Store',
        '}',
        '',
        'const DefaultLimit = 10',
        'var cachedUsers []User',
        '',
        'type UserID = string',
        '',
        'func NewHandler(store Store) *Handler {',
        '  return &Handler{store: store}',
        '}',
        '',
        'func (h *Handler) ListUsers() []User {',
        '  return h.store.List()',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.go).toBe(1);
      const expectations = [
        ['main', 'module'],
        ['User', 'struct'],
        ['Name', 'field'],
        ['Store', 'interface'],
        ['Handler', 'struct'],
        ['store', 'field'],
        ['DefaultLimit', 'constant'],
        ['cachedUsers', 'variable'],
        ['UserID', 'type_alias'],
        ['NewHandler', 'function'],
        ['Handler.ListUsers', 'method'],
      ] as const;
      for (const [name, kind] of expectations) {
        expect(
          cg.searchNodes(name).some((match) => match.node.name === name && match.node.kind === kind && match.node.language === 'go'),
          `${name} (${kind}) should be indexed as Go`,
        ).toBe(true);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves Go same-file and same-package direct calls through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'handler.go'),
      [
        'package main',
        '',
        'type Handler struct {}',
        '',
        'func (h *Handler) ListUsers() []string {',
        '  return loadUsers()',
        '}',
        '',
        'func loadUsers() []string {',
        '  return buildUsers()',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'store.go'),
      [
        'package main',
        '',
        'func buildUsers() []string {',
        '  return []string{"ada"}',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const listUsers = cg.searchNodes('Handler.ListUsers').find((match) => match.node.kind === 'method')?.node;
      const loadUsers = cg.searchNodes('loadUsers').find((match) => match.node.kind === 'function')?.node;
      const buildUsers = cg.searchNodes('buildUsers').find((match) => match.node.kind === 'function')?.node;
      expect(listUsers).toBeDefined();
      expect(loadUsers).toBeDefined();
      expect(buildUsers).toBeDefined();

      const listCalls = cg.getOutgoingEdges(listUsers!.id).filter((edge) => edge.kind === 'calls');
      const loadCalls = cg.getOutgoingEdges(loadUsers!.id).filter((edge) => edge.kind === 'calls');
      expect(listCalls.some((edge) => edge.target === loadUsers!.id)).toBe(true);
      expect(loadCalls.some((edge) => edge.target === buildUsers!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('links Gin direct routes to handlers and handler helpers under rust-hybrid', () => {
    fs.writeFileSync(
      path.join(tempDir, 'main.go'),
      [
        'package main',
        '',
        'import "github.com/gin-gonic/gin"',
        '',
        'type Controller struct {}',
        '',
        'func main() {',
        '  r := gin.Default()',
        '  r.GET("/health", healthHandler)',
        '  api := r.Group("/api")',
        '  controller := &Controller{}',
        '  api.POST("/users", controller.CreateUser)',
        '}',
        '',
        'func healthHandler(c *gin.Context) {',
        '  writeHealth()',
        '}',
        '',
        'func writeHealth() {}',
        '',
        'func (c *Controller) CreateUser(ctx *gin.Context) {',
        '  saveUser()',
        '}',
        '',
        'func saveUser() {}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const routes = cg.getNodesByKind('route');
      const healthRoute = routes.find((node) => node.name === 'GET /health');
      const createUserRoute = routes.find((node) => node.name === 'POST /api/users');
      const healthHandler = cg.searchNodes('healthHandler').find((match) => match.node.kind === 'function')?.node;
      const writeHealth = cg.searchNodes('writeHealth').find((match) => match.node.kind === 'function')?.node;
      const createUser = cg.searchNodes('Controller.CreateUser').find((match) => match.node.kind === 'method')?.node;
      const saveUser = cg.searchNodes('saveUser').find((match) => match.node.kind === 'function')?.node;

      expect(healthRoute).toBeDefined();
      expect(createUserRoute).toBeDefined();
      expect(healthHandler).toBeDefined();
      expect(writeHealth).toBeDefined();
      expect(createUser).toBeDefined();
      expect(saveUser).toBeDefined();

      const healthRouteEdges = cg.getOutgoingEdges(healthRoute!.id).filter((edge) => edge.kind === 'references');
      const createUserRouteEdges = cg.getOutgoingEdges(createUserRoute!.id).filter((edge) => edge.kind === 'references');
      const healthHandlerCalls = cg.getOutgoingEdges(healthHandler!.id).filter((edge) => edge.kind === 'calls');
      const createUserCalls = cg.getOutgoingEdges(createUser!.id).filter((edge) => edge.kind === 'calls');

      expect(healthRouteEdges.some((edge) => edge.target === healthHandler!.id)).toBe(true);
      expect(createUserRouteEdges.some((edge) => edge.target === createUser!.id)).toBe(true);
      expect(healthHandlerCalls.some((edge) => edge.target === writeHealth!.id)).toBe(true);
      expect(createUserCalls.some((edge) => edge.target === saveUser!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps indexing valid JavaScript files when one JavaScript file has a parse error', () => {
    fs.writeFileSync(
      path.join(tempDir, 'valid.js'),
      [
        'export function stillIndexed() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'broken.js'), 'export function broken( {\n');

    const indexResult = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(indexResult.status).toBe(0);

    const resultLine = indexResult.stdout
      .trim()
      .split('\n')
      .filter((line) => line.includes('"type":"result"'))
      .pop();
    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine!) as {
      filesErrored: number;
      errors: Array<{ message: string; filePath?: string; code?: string; severity?: string; writtenByRust?: boolean }>;
    };
    expect(result.filesErrored).toBeGreaterThanOrEqual(1);
    expect(result.errors).toContainEqual(expect.objectContaining({
      message: 'parse error',
      filePath: 'broken.js',
      code: 'rust-owned-parse-gap',
      severity: 'warning',
      writtenByRust: false,
    }));

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('stillIndexed').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('broken.js').some((match) => match.node.kind === 'file')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('skips unsupported Phase 1 languages while indexing supported files', () => {
    fs.writeFileSync(
      path.join(tempDir, 'supported.ts'),
      [
        'export function supportedSymbol() {',
        '  return 7;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# not indexed by the Rust Phase 1 engine\n');

    const indexResult = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(indexResult.status).toBe(0);

    const resultLine = indexResult.stdout
      .trim()
      .split('\n')
      .filter((line) => line.includes('"type":"result"'))
      .pop();
    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine!) as {
      filesIndexed: number;
      filesSkipped: number;
      filesErrored: number;
      errors: Array<{ message: string }>;
    };
    expect(result.filesIndexed).toBeGreaterThanOrEqual(2);
    expect(result.filesSkipped).toBe(0);
    expect(result.filesErrored).toBe(0);
    expect(result.errors).toEqual([]);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('supportedSymbol').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('README.md').some((match) => match.node.kind === 'file')).toBe(false);
      expect(cg.getStats().filesByLanguage).not.toHaveProperty('markdown');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('serves Rust-produced indexes through MCP search and graph tools', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'callee.ts'),
      [
        'export function mcpHelper() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'caller.ts'),
      [
        'import { mcpHelper } from "./callee";',
        'export function mcpEntry() {',
        '  return mcpHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const handler = new ToolHandler(cg);
      const search = await handler.execute('zcodegraph_search', { query: 'mcpHelper' });
      expect(search.isError).toBeFalsy();
      expect(search.content[0].text).toContain('mcpHelper');

      const callers = await handler.execute('zcodegraph_callers', { symbol: 'mcpHelper' });
      expect(callers.isError).toBeFalsy();
      expect(callers.content[0].text).toContain('mcpEntry');

      const callees = await handler.execute('zcodegraph_callees', { symbol: 'mcpEntry' });
      expect(callees.isError).toBeFalsy();
      expect(callees.content[0].text).toContain('mcpHelper');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('treats exported arrow-function constants as callable functions in Rust-produced indexes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'renderer.ts'),
      [
        'const localImpl = () => {',
        '  return 1;',
        '};',
        '',
        'export const renderPublic = () => {',
        '  return localImpl();',
        '};',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'canvas.ts'),
      [
        'import { renderPublic } from "./renderer";',
        'export function StaticCanvas() {',
        '  return renderPublic();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const renderPublic = cg.searchNodes('renderPublic').find((match) => match.node.kind === 'function')?.node;
      const localImpl = cg.searchNodes('localImpl').find((match) => match.node.kind === 'function')?.node;
      const staticCanvas = cg.searchNodes('StaticCanvas').find((match) => match.node.kind === 'function')?.node;
      expect(renderPublic).toBeDefined();
      expect(localImpl).toBeDefined();
      expect(staticCanvas).toBeDefined();

      expect(cg.getCallees(staticCanvas!.id).some((entry) => entry.node.id === renderPublic!.id)).toBe(true);
      expect(cg.getCallees(renderPublic!.id).some((entry) => entry.node.id === localImpl!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('treats class field arrow callbacks as callable methods in Rust-produced indexes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'scene.ts'),
      [
        'type Callback = () => void;',
        'export class Scene {',
        '  private callbacks = new Set<Callback>();',
        '  triggerUpdate() {',
        '    for (const callback of Array.from(this.callbacks)) {',
        '      callback();',
        '    }',
        '  }',
        '  onUpdate(cb: Callback) {',
        '    this.callbacks.add(cb);',
        '  }',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'app.ts'),
      [
        'import { Scene } from "./scene";',
        'export class App extends React.Component {',
        '  scene = new Scene();',
        '  triggerRender = () => {',
        '    this.setState({});',
        '  };',
        '  render() {',
        '    return null;',
        '  }',
        '  mount() {',
        '    this.scene.onUpdate(this.triggerRender);',
        '  }',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const triggerUpdate = cg.searchNodes('triggerUpdate').find((match) => match.node.kind === 'method')?.node;
      const triggerRender = cg.searchNodes('triggerRender').find((match) => match.node.kind === 'method')?.node;
      const render = cg.searchNodes('render').find((match) => match.node.kind === 'method')?.node;
      const app = cg.searchNodes('App').find((match) => match.node.kind === 'class')?.node;
      expect(app).toBeDefined();
      expect(triggerUpdate).toBeDefined();
      expect(triggerRender).toBeDefined();
      expect(render).toBeDefined();

      expect(cg.getCallees(triggerUpdate!.id).some((entry) => (
        entry.node.id === triggerRender!.id &&
        entry.edge.kind === 'calls' &&
        entry.edge.edgeOrigin === 'heuristic'
      ))).toBe(true);
      expect(cg.getCallees(triggerRender!.id).some((entry) => (
        entry.node.id === render!.id &&
        entry.edge.kind === 'calls' &&
        entry.edge.edgeOrigin === 'heuristic'
      ))).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes TypeScript, JSX, and TSX symbols through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'helpers.js'),
      [
        'import { loadUser } from "./models";',
        'function localHelper() { return loadUser("1"); }',
        'export function exportedHelper() { return localHelper(); }',
        'class LocalWidget {',
        '  constructor() {}',
        '  render() { return exportedHelper(); }',
        '}',
        'export class ExportedWidget {',
        '  render() { return new LocalWidget(); }',
        '}',
        'let mutableCount = 0;',
        'const JS_LIMIT = 3;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'models.ts'),
      [
        'import { ProfileCard } from "./card";',
        'export { ProfileCard } from "./card";',
        'export interface User { id: UserId; name: string }',
        'export type UserId = string;',
        'export const DEFAULT_LIMIT = 25;',
        'let mutableUser: User | null = null;',
        'export function loadUser(id: UserId): User {',
        '  return { id, name: "Ada" };',
        '}',
        'export class UserService {',
        '  cache = new Map<string, User>();',
        '  constructor() {}',
        '  get(id: UserId): User { return loadUser(id); }',
        '}',
        'export const store = {',
        '  fetchUser(id: UserId) { return loadUser(id); },',
        '};',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'card.jsx'),
      [
        'export function ProfileCard(props) {',
        '  return <section><Avatar /></section>;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'dashboard.tsx'),
      [
        'export const Dashboard = () => {',
        '  const service = new UserService();',
        '  return <ProfileCard name={service.get("1")} />;',
        '};',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const statusResult = runZcodegraphCli(tempDir, ['status', '--json']);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    const status = JSON.parse(statusLine!) as { languages: string[] };
    expect(status.languages).toEqual(expect.arrayContaining(['typescript', 'jsx', 'tsx']));

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('localHelper').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('exportedHelper').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('LocalWidget').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('ExportedWidget').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('mutableCount').some((match) => match.node.kind === 'variable')).toBe(true);
      expect(cg.searchNodes('JS_LIMIT').some((match) => match.node.kind === 'constant')).toBe(true);
      expect(cg.searchNodes('User').some((match) => match.node.kind === 'interface')).toBe(true);
      expect(cg.searchNodes('UserId').some((match) => match.node.kind === 'type_alias')).toBe(true);
      expect(cg.searchNodes('DEFAULT_LIMIT').some((match) => match.node.kind === 'constant')).toBe(true);
      expect(cg.searchNodes('mutableUser').some((match) => match.node.kind === 'variable')).toBe(true);
      expect(cg.searchNodes('loadUser').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('UserService').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('cache').some((match) => match.node.kind === 'field')).toBe(true);
      expect(cg.searchNodes('constructor').some((match) => match.node.kind === 'method')).toBe(true);
      expect(cg.searchNodes('fetchUser').some((match) => match.node.kind === 'method')).toBe(true);
      expect(cg.searchNodes('ProfileCard').some((match) => match.node.kind === 'component')).toBe(true);
      expect(cg.searchNodes('Dashboard').some((match) => match.node.kind === 'component')).toBe(true);

      const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { all(): unknown[] } } } }).db.getDb();
      const symbolRows = db.prepare(
        "SELECT kind, name FROM nodes WHERE kind IN ('import', 'export') ORDER BY kind, name",
      ).all() as Array<{ kind: string; name: string }>;
      expect(symbolRows).toEqual(
        expect.arrayContaining([
          { kind: 'import', name: './models' },
          { kind: 'import', name: './card' },
          { kind: 'export', name: './card' },
        ]),
      );

      const localHelper = cg.searchNodes('localHelper').find((match) => match.node.kind === 'function')!.node;
      const exportedHelper = cg.searchNodes('exportedHelper').find((match) => match.node.kind === 'function')!.node;
      const loadUser = cg.searchNodes('loadUser').find((match) => match.node.kind === 'function')!.node;
      const dashboard = cg.searchNodes('Dashboard').find((match) => match.node.kind === 'component')!.node;
      const profileCard = cg.searchNodes('ProfileCard').find((match) => match.node.kind === 'component')!.node;

      expect(cg.getCallers(localHelper.id).some((entry) => entry.node.id === exportedHelper.id)).toBe(true);
      expect(cg.getCallees(exportedHelper.id).some((entry) => entry.node.id === localHelper.id)).toBe(true);
      expect(cg.getCallers(loadUser.id).some((entry) => entry.node.id === localHelper.id)).toBe(true);
      expect(cg.getCallees(dashboard.id).some((entry) => entry.node.id === profileCard.id)).toBe(true);

      const sourceRows = db.prepare(
        "SELECT name, kind, language, start_line AS startLine, start_column AS startColumn FROM nodes WHERE name IN ('helpers.js', 'localHelper', 'mutableUser', 'cache', 'ProfileCard', 'Dashboard')",
      ).all() as Array<{
        name: string;
        kind: string;
        language: string;
        startLine: number;
        startColumn: number;
      }>;
      expect(sourceRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'helpers.js', kind: 'file', language: 'javascript' }),
          expect.objectContaining({ name: 'localHelper', kind: 'function', language: 'javascript' }),
          expect.objectContaining({ name: 'mutableUser', kind: 'variable', language: 'typescript' }),
          expect.objectContaining({ name: 'cache', kind: 'field', language: 'typescript' }),
          expect.objectContaining({ name: 'ProfileCard', kind: 'component', language: 'jsx' }),
          expect.objectContaining({ name: 'Dashboard', kind: 'component', language: 'tsx' }),
        ]),
      );
      for (const row of sourceRows) {
        expect(row.startLine).toBeGreaterThanOrEqual(1);
        expect(row.startColumn).toBeGreaterThanOrEqual(0);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves Rust-extracted cross-file references through TypeScript graph queries', () => {
    fs.writeFileSync(
      path.join(tempDir, 'callee.ts'),
      [
        'export function sharedHelper() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'caller.ts'),
      [
        'import { sharedHelper } from "./callee";',
        'export function runFeature() {',
        '  return sharedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const helper = cg.searchNodes('sharedHelper').find((match) => match.node.kind === 'function')?.node;
      const caller = cg.searchNodes('runFeature').find((match) => match.node.kind === 'function')?.node;
      expect(helper).toBeDefined();
      expect(caller).toBeDefined();

      expect(cg.getCallers(helper!.id).some((entry) => entry.node.id === caller!.id)).toBe(true);
      expect(cg.getCallees(caller!.id).some((entry) => entry.node.id === helper!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('runs dynamic synthesizers after Rust extraction so JSX child edges are queryable', () => {
    fs.writeFileSync(
      path.join(tempDir, 'Child.tsx'),
      [
        'export function ChildWidget() {',
        '  return <span />;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'Parent.tsx'),
      [
        'import { ChildWidget } from "./Child";',
        'export function ParentWidget() {',
        '  return <ChildWidget />;',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const parent = cg.searchNodes('ParentWidget').find((match) => match.node.kind === 'component')?.node;
      const child = cg.searchNodes('ChildWidget').find((match) => match.node.kind === 'component')?.node;
      expect(parent).toBeDefined();
      expect(child).toBeDefined();

      const childEdges = cg.getCallees(parent!.id);
      expect(childEdges.some((entry) => entry.node.id === child!.id && entry.edge.kind === 'calls')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);


});
