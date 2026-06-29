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

describe('zcodegraph rust-hybrid ESM default and re-export edges', () => {
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

  describe('default import guarded edges', () => {
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
  });

  describe('one-hop re-export guarded edges', () => {
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
  });

  describe('re-export fallback sample diagnostics', () => {
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
  });
});
