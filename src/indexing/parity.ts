export interface SemanticFileFact {
  path: string;
  language: string;
}

export interface SemanticNodeFact {
  kind: string;
  name: string;
  filePath: string;
  language: string;
  startLine: number;
  startColumn: number;
}

export interface SemanticEdgeFact {
  kind: string;
  source: string;
  target: string;
}

export interface SemanticUnresolvedRefFact {
  from: string;
  referenceName: string;
  referenceKind: string;
  filePath: string;
  language: string;
  line: number;
  column: number;
}

export interface SemanticSnapshot {
  files: SemanticFileFact[];
  nodes: SemanticNodeFact[];
  edges: SemanticEdgeFact[];
  unresolvedRefs: SemanticUnresolvedRefFact[];
}

export type ParityDifferenceCategory = 'expected' | 'acceptable' | 'blocking';

export interface ParityDifference {
  key: string;
  kind: 'missing' | 'extra' | 'location';
  category: ParityDifferenceCategory;
  message: string;
}

export interface SemanticParityOptions {
  locationToleranceLines?: number;
  expectedDifferenceKeys?: ReadonlySet<string>;
  acceptableDifferenceKeys?: ReadonlySet<string>;
}

export interface SemanticParityResult {
  differences: ParityDifference[];
  summary: Record<ParityDifferenceCategory, number>;
}

export function compareSemanticSnapshots(
  typescriptSnapshot: SemanticSnapshot,
  rustSnapshot: SemanticSnapshot,
  options: SemanticParityOptions = {},
): SemanticParityResult {
  const differences: ParityDifference[] = [];
  const tolerance = options.locationToleranceLines ?? 0;

  compareFactSet(
    new Set(typescriptSnapshot.files.map(fileKey)),
    new Set(rustSnapshot.files.map(fileKey)),
    'file',
    differences,
    options,
  );
  compareFactSet(
    new Set(typescriptSnapshot.edges.map(edgeKey)),
    new Set(rustSnapshot.edges.map(edgeKey)),
    'edge',
    differences,
    options,
  );
  compareFactSet(
    new Set(typescriptSnapshot.unresolvedRefs.map(unresolvedRefKey)),
    new Set(rustSnapshot.unresolvedRefs.map(unresolvedRefKey)),
    'unresolved_ref',
    differences,
    options,
  );

  const tsNodes = new Map(typescriptSnapshot.nodes.map((node) => [nodeKey(node), node]));
  const rustNodes = new Map(rustSnapshot.nodes.map((node) => [nodeKey(node), node]));
  compareFactSet(new Set(tsNodes.keys()), new Set(rustNodes.keys()), 'node', differences, options);

  for (const [key, tsNode] of tsNodes) {
    const rustNode = rustNodes.get(key);
    if (!rustNode) continue;
    if (
      Math.abs(tsNode.startLine - rustNode.startLine) > tolerance ||
      tsNode.startColumn !== rustNode.startColumn
    ) {
      differences.push({
        key,
        kind: 'location',
        category: categorize(key, options),
        message: `Source location differs for ${key}: TypeScript ${tsNode.startLine}:${tsNode.startColumn}, Rust ${rustNode.startLine}:${rustNode.startColumn}`,
      });
    }
  }

  return {
    differences,
    summary: {
      blocking: differences.filter((diff) => diff.category === 'blocking').length,
      acceptable: differences.filter((diff) => diff.category === 'acceptable').length,
      expected: differences.filter((diff) => diff.category === 'expected').length,
    },
  };
}

export function fileKey(file: SemanticFileFact): string {
  return `file:${file.path}`;
}

export function nodeKey(node: SemanticNodeFact): string {
  return `node:${node.kind}:${node.filePath}:${node.name}`;
}

export function edgeKey(edge: SemanticEdgeFact): string {
  return `edge:${edge.kind}:${edge.source}->${edge.target}`;
}

export function unresolvedRefKey(ref: SemanticUnresolvedRefFact): string {
  return `unresolved_ref:${ref.referenceKind}:${ref.filePath}:${ref.from}->${ref.referenceName}`;
}

function compareFactSet(
  typescriptKeys: Set<string>,
  rustKeys: Set<string>,
  label: string,
  differences: ParityDifference[],
  options: SemanticParityOptions,
): void {
  for (const key of typescriptKeys) {
    if (rustKeys.has(key)) continue;
    differences.push({
      key,
      kind: 'missing',
      category: categorize(key, options),
      message: `Rust snapshot is missing ${label} ${key}`,
    });
  }
  for (const key of rustKeys) {
    if (typescriptKeys.has(key)) continue;
    differences.push({
      key,
      kind: 'extra',
      category: categorize(key, options),
      message: `Rust snapshot has extra ${label} ${key}`,
    });
  }
}

function categorize(key: string, options: SemanticParityOptions): ParityDifferenceCategory {
  if (options.expectedDifferenceKeys?.has(key)) return 'expected';
  if (options.acceptableDifferenceKeys?.has(key)) return 'acceptable';
  return 'blocking';
}
