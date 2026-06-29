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

describe('zcodegraph rust-hybrid ESM direct binding', () => {
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

  describe('shadow semantic replay diagnostics', () => {
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
  });

  describe('guarded direct named diagnostics', () => {
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
  });

  describe('direct named binding behavior', () => {
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
  });

  describe('overload implementation behavior', () => {
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
  });
});
