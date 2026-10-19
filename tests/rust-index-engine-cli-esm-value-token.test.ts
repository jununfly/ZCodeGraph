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

describe('zcodegraph rust-hybrid ESM value-token collision', () => {
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
});
