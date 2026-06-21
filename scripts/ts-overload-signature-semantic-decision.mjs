#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PREFIX = `${new Date().toISOString().slice(0, 10)}-ts-overload-signature-semantic-decision`;

function usage() {
  console.log([
    'Usage: node scripts/ts-overload-signature-semantic-decision.mjs --taxonomy <path> [--out-dir <dir>] [--prefix <name>]',
    '',
    'Writes a decision artifact for TypeScript overload/signature candidate-multiple semantics.',
    'This diagnostic reads taxonomy metadata only, does not read source files, and does not change resolver behavior.',
  ].join('\n'));
}

function parseArgs(argv) {
  let taxonomyPath = null;
  let outDir = path.resolve('docs', 'benchmarks');
  let prefix = DEFAULT_PREFIX;
  let vscodeSparseCommit = 'unknown';
  let profilePath = null;
  let dbPath = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--taxonomy') {
      taxonomyPath = path.resolve(requiredValue(argv, ++i, '--taxonomy'));
      continue;
    }
    if (arg === '--out-dir') {
      outDir = path.resolve(requiredValue(argv, ++i, '--out-dir'));
      continue;
    }
    if (arg === '--prefix') {
      prefix = requiredValue(argv, ++i, '--prefix');
      continue;
    }
    if (arg === '--vscode-sparse-commit') {
      vscodeSparseCommit = requiredValue(argv, ++i, '--vscode-sparse-commit');
      continue;
    }
    if (arg === '--profile') {
      profilePath = path.resolve(requiredValue(argv, ++i, '--profile'));
      continue;
    }
    if (arg === '--db') {
      dbPath = path.resolve(requiredValue(argv, ++i, '--db'));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!taxonomyPath) throw new Error('--taxonomy is required');
  return { help: false, taxonomyPath, outDir, prefix, vscodeSparseCommit, profilePath, dbPath };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function loadTaxonomy(taxonomyPath) {
  return JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));
}

function examplesFor(taxonomy, subtype) {
  const bucket = taxonomy?.subtypes?.[subtype];
  return Array.isArray(bucket?.examples) ? bucket.examples : [];
}

function hasImplementationMarker(example) {
  return candidateRanges(example).some((candidate) => candidate.hasBody === true || candidate.declarationForm === 'implementation');
}

function implementationMarkerCount(example) {
  return candidateRanges(example).filter(
    (candidate) => candidate.hasBody === true || candidate.declarationForm === 'implementation',
  ).length;
}

function hasSignatureOnlyMarkers(example) {
  const ranges = candidateRanges(example);
  return ranges.length > 0 && ranges.every(
    (candidate) => candidate.hasBody === false || candidate.declarationForm === 'signature',
  );
}

function candidateRanges(example) {
  return Array.isArray(example?.candidateLineRanges) ? example.candidateLineRanges : [];
}

function targetFilePath(example) {
  return typeof example?.targetFilePath === 'string' ? example.targetFilePath : '';
}

function isDeclarationFile(example) {
  return /\.d\.[cm]?tsx?$/.test(targetFilePath(example));
}

function summarizeExamples(taxonomy) {
  const overloadExamples = examplesFor(taxonomy, 'function-overload-signature');
  const namespaceCollisionExamples = examplesFor(taxonomy, 'type-value-namespace-collision');
  const ambientExamples = examplesFor(taxonomy, 'ambient-declaration-merge');

  const overloadWithOneImplementation = overloadExamples.filter(
    (example) => !isDeclarationFile(example) && implementationMarkerCount(example) === 1,
  );
  const ambientOnlyOrNoImplementation = [
    ...overloadExamples.filter((example) => !isDeclarationFile(example) && !hasImplementationMarker(example)),
    ...ambientExamples,
  ];
  const declarationFileOverloads = overloadExamples.filter(isDeclarationFile);

  return {
    overloadWithOneImplementation,
    ambientOnlyOrNoImplementation,
    declarationFileOverloads,
    namespaceCollisionExamples,
    hasSignatureOnlyFixture: ambientOnlyOrNoImplementation.some(hasSignatureOnlyMarkers),
  };
}

function buildDecision({ taxonomy, taxonomyPath, vscodeSparseCommit, profilePath, dbPath }) {
  const fixtureSummary = summarizeExamples(taxonomy);
  const functionOverloadBucket = taxonomy?.subtypes?.['function-overload-signature'];
  const currentArtifactsHaveImplementationMetadata =
    fixtureSummary.overloadWithOneImplementation.length > 0
    || examplesFor(taxonomy, 'function-overload-signature').some((example) =>
      candidateRanges(example).some((candidate) => (
        Object.prototype.hasOwnProperty.call(candidate, 'hasBody')
        || Object.prototype.hasOwnProperty.call(candidate, 'declarationForm')
      )),
    );

  const metadataSufficiency = currentArtifactsHaveImplementationMetadata
    ? 'sufficient-when-exactly-one-implementation-marker-exists'
    : 'insufficient-missing-implementation-declaration-marker';

  return {
    generatedAt: new Date().toISOString(),
    taxonomyPath,
    profilePath: profilePath ?? taxonomy?.profilePath,
    dbPath: dbPath ?? taxonomy?.dbPath,
    vscodeSparseCommit,
    sourceFilesRead: 0,
    resolverBehaviorChanged: false,
    performanceClaimed: false,
    parallelToolingFollowUp: {
      issue: 375,
      relationship: 'RSS sampling tooling follow-up; not a blocker for this semantic decision',
    },
    observedTaxonomy: {
      rowsInspected: taxonomy?.rowsInspected ?? taxonomy?.summary?.rowsInspected ?? 0,
      functionOverloadSignatureCount: functionOverloadBucket?.count ?? 0,
      subtypeCounts: Object.fromEntries(
        Object.entries(taxonomy?.subtypes ?? {}).map(([subtype, bucket]) => [subtype, bucket.count ?? 0]),
      ),
    },
    semanticDecision: {
      importEdgeTarget:
        'runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists',
      importedUsageEdgeTarget:
        'imported runtime/value usage edges should target the same implementation declaration selected for the import edge',
      overloadSignatureRule:
        'overload signatures without implementation bodies are not runtime implementation targets',
      noGoRules: [
        'ambient-only overload/signature sets keep fallback',
        '.d.ts overload/signature sets keep fallback',
        'no-implementation overload/signature sets keep fallback',
        'type/value/namespace collisions keep fallback',
      ],
      safeTieBreakPrerequisites: [
        'all candidates are in the same resolved target file',
        'all candidates are runtime/value compatible function declarations',
        'candidate metadata exposes hasBody=true or declarationForm=implementation',
        'exactly one candidate is marked as the implementation declaration',
        'target file is not a .d.ts declaration file',
      ],
    },
    metadataSufficiency,
    requiredMetadataIfInsufficient: metadataSufficiency === 'insufficient-missing-implementation-declaration-marker'
      ? ['hasBody', 'declarationForm']
      : [],
    fixtureCoverage: {
      overloadSignaturesPlusOneImplementation: fixtureSummary.overloadWithOneImplementation.length,
      ambientOnlyOrNoImplementation: fixtureSummary.ambientOnlyOrNoImplementation.length,
      declarationFileOverloads: fixtureSummary.declarationFileOverloads.length,
      typeValueNamespaceCollision: fixtureSummary.namespaceCollisionExamples.length,
      signatureOnlyMarkerSeen: fixtureSummary.hasSignatureOnlyFixture,
    },
    recommendedNextSlice: metadataSufficiency === 'insufficient-missing-implementation-declaration-marker'
      ? 'add implementation-declaration metadata before changing resolver behavior'
      : 'implement a bounded candidate-multiple tie-break guarded by the safe prerequisites',
  };
}

function renderMarkdown(decision) {
  return `${[
    '# TypeScript Overload/Signature Semantic Decision',
    '',
    `Generated: ${decision.generatedAt}`,
    '',
    '## Inputs',
    '',
    `- Taxonomy: \`${decision.taxonomyPath}\``,
    `- Profile: \`${decision.profilePath ?? 'not provided'}\``,
    `- Database: \`${decision.dbPath ?? 'not provided'}\``,
    `- VS Code sparse commit: \`${decision.vscodeSparseCommit}\``,
    '- Source files read: none',
    '- Resolver behavior changed: false',
    '- Performance claim: none',
    '',
    '## Decision',
    '',
    `- Import edge target: ${decision.semanticDecision.importEdgeTarget}.`,
    `- Imported usage edge target: ${decision.semanticDecision.importedUsageEdgeTarget}.`,
    `- Overload signature rule: ${decision.semanticDecision.overloadSignatureRule}.`,
    `- Metadata sufficiency: ${decision.metadataSufficiency}.`,
    `- Recommended next slice: ${decision.recommendedNextSlice}.`,
    '',
    '## No-Go Rules',
    '',
    ...decision.semanticDecision.noGoRules.map((rule) => `- ${rule}.`),
    '',
    '## Safe Tie-Break Prerequisites',
    '',
    ...decision.semanticDecision.safeTieBreakPrerequisites.map((rule) => `- ${rule}.`),
    '',
    '## Fixture Coverage',
    '',
    `- Overload signatures plus one implementation: ${decision.fixtureCoverage.overloadSignaturesPlusOneImplementation}`,
    `- Ambient-only or no implementation: ${decision.fixtureCoverage.ambientOnlyOrNoImplementation}`,
    `- .d.ts overload set: ${decision.fixtureCoverage.declarationFileOverloads}`,
    `- Type/value namespace collision: ${decision.fixtureCoverage.typeValueNamespaceCollision}`,
    '',
    '## Parallel Tooling',
    '',
    `- #${decision.parallelToolingFollowUp.issue}: ${decision.parallelToolingFollowUp.relationship}.`,
  ].join('\n')}\n`;
}

function writeArtifacts(decision, outDir, prefix) {
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, `${prefix}.json`);
  const markdown = path.join(outDir, `${prefix}.md`);
  fs.writeFileSync(json, `${JSON.stringify(decision, null, 2)}\n`);
  fs.writeFileSync(markdown, renderMarkdown(decision));
  return { json, markdown };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!fs.existsSync(args.taxonomyPath)) {
    throw new Error(`Taxonomy not found: ${args.taxonomyPath}`);
  }
  const taxonomy = loadTaxonomy(args.taxonomyPath);
  const decision = buildDecision({
    taxonomy,
    taxonomyPath: args.taxonomyPath,
    vscodeSparseCommit: args.vscodeSparseCommit,
    profilePath: args.profilePath,
    dbPath: args.dbPath,
  });
  const artifacts = writeArtifacts(decision, args.outDir, args.prefix);
  process.stdout.write(`${JSON.stringify({ artifacts, summary: {
    metadataSufficiency: decision.metadataSufficiency,
    recommendedNextSlice: decision.recommendedNextSlice,
    fixtureCoverage: decision.fixtureCoverage,
  } }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
