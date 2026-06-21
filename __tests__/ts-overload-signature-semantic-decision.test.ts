import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ts-overload-signature-semantic-decision.mjs');

describe('TypeScript overload/signature semantic decision script', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('encodes the safe implementation-target decision and no-go boundaries', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-overload-decision-'));
    tempDirs.push(dir);
    const taxonomyPath = path.join(dir, 'taxonomy.json');
    const outDir = path.join(dir, 'artifacts');

    fs.writeFileSync(
      taxonomyPath,
      JSON.stringify({
        rowsInspected: 4,
        resolvedEvidence: {
          overloadImplementationResolvedRefs: 3,
        },
        profilePath: '/tmp/profile.json',
        dbPath: '/tmp/zcodegraph.db',
        subtypes: {
          'function-overload-signature': {
            count: 3,
            examples: [
              {
                referenceName: 'parseThing',
                targetFilePath: 'src/parser.ts',
                candidateLineRanges: [
                  { kind: 'function', startLine: 10, endLine: 10, hasBody: false },
                  { kind: 'function', startLine: 11, endLine: 11, declarationForm: 'signature' },
                  { kind: 'function', startLine: 12, endLine: 18, hasBody: true },
                ],
              },
              {
                referenceName: 'ambientOnly',
                targetFilePath: 'src/ambient.ts',
                candidateLineRanges: [
                  { kind: 'function', startLine: 20, endLine: 20, hasBody: false },
                  { kind: 'function', startLine: 21, endLine: 21, hasBody: false },
                ],
              },
              {
                referenceName: 'declaredOnly',
                targetFilePath: 'types/parser.d.ts',
                candidateLineRanges: [
                  { kind: 'function', startLine: 1, endLine: 1, declarationForm: 'signature' },
                  { kind: 'function', startLine: 2, endLine: 2, declarationForm: 'signature' },
                ],
              },
            ],
          },
          'type-value-namespace-collision': {
            count: 1,
            examples: [
              {
                referenceName: 'Thing',
                targetFilePath: 'src/thing.ts',
                candidateKinds: ['type_alias', 'constant'],
              },
            ],
          },
        },
      }, null, 2),
    );

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--taxonomy',
        taxonomyPath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-overload-decision',
        '--vscode-sparse-commit',
        'fixture-commit',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        metadataSufficiency: string;
        recommendedNextSlice: string;
        fixtureCoverage: Record<string, number | boolean>;
      };
    };
    expect(parsed.summary.metadataSufficiency).toBe('sufficient-when-exactly-one-implementation-marker-exists');
    expect(parsed.summary.recommendedNextSlice).toBe(
      'keep guarded overload implementation routing enabled and investigate remaining candidate-multiple subtypes',
    );
    expect(parsed.summary.fixtureCoverage).toMatchObject({
      overloadSignaturesPlusOneImplementation: 1,
      ambientOnlyOrNoImplementation: 1,
      declarationFileOverloads: 1,
      typeValueNamespaceCollision: 1,
      signatureOnlyMarkerSeen: true,
    });

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      sourceFilesRead: number;
      resolverBehaviorChanged: boolean;
      performanceClaimed: boolean;
      semanticDecision: {
        importEdgeTarget: string;
        importedUsageEdgeTarget: string;
        noGoRules: string[];
        safeTieBreakPrerequisites: string[];
      };
      parallelToolingFollowUp: { issue: number; relationship: string };
      resolvedEvidence: { overloadImplementationResolvedRefs: number };
    };
    expect(artifact.resolvedEvidence.overloadImplementationResolvedRefs).toBe(3);
    expect(artifact.sourceFilesRead).toBe(0);
    expect(artifact.resolverBehaviorChanged).toBe(false);
    expect(artifact.performanceClaimed).toBe(false);
    expect(artifact.semanticDecision.importEdgeTarget).toContain('exactly one clear implementation declaration');
    expect(artifact.semanticDecision.importedUsageEdgeTarget).toContain('same implementation declaration');
    expect(artifact.semanticDecision.noGoRules).toContain('.d.ts overload/signature sets keep fallback');
    expect(artifact.semanticDecision.noGoRules).toContain('type/value/namespace collisions keep fallback');
    expect(artifact.semanticDecision.safeTieBreakPrerequisites).toContain(
      'candidate metadata exposes hasBody=true or declarationForm=implementation',
    );
    expect(artifact.parallelToolingFollowUp.issue).toBe(375);
    expect(artifact.parallelToolingFollowUp.relationship).toContain('not a blocker');

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('# TypeScript Overload/Signature Semantic Decision');
    expect(markdown).toContain('VS Code sparse commit: `fixture-commit`');
    expect(markdown).toContain('Performance claim: none');
  });

  it('requires implementation-declaration metadata before changing production behavior', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-overload-decision-metadata-'));
    tempDirs.push(dir);
    const taxonomyPath = path.join(dir, 'taxonomy.json');
    const outDir = path.join(dir, 'artifacts');

    fs.writeFileSync(
      taxonomyPath,
      JSON.stringify({
        rowsInspected: 1,
        subtypes: {
          'function-overload-signature': {
            count: 1,
            examples: [
              {
                referenceName: 'fromCurrentArtifact',
                targetFilePath: 'src/current.ts',
                candidateLineRanges: [
                  { kind: 'function', startLine: 1, endLine: 1 },
                  { kind: 'function', startLine: 2, endLine: 6 },
                ],
              },
            ],
          },
        },
      }, null, 2),
    );

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--taxonomy',
        taxonomyPath,
        '--out-dir',
        outDir,
        '--prefix',
        'missing-metadata-overload-decision',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string };
      summary: { metadataSufficiency: string; recommendedNextSlice: string };
    };
    expect(parsed.summary.metadataSufficiency).toBe('insufficient-missing-implementation-declaration-marker');
    expect(parsed.summary.recommendedNextSlice).toBe(
      'add implementation-declaration metadata before changing resolver behavior',
    );
    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      requiredMetadataIfInsufficient: string[];
    };
    expect(artifact.requiredMetadataIfInsufficient).toEqual(['hasBody', 'declarationForm']);
  });
});
