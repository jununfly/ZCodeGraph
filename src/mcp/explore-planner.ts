/**
 * Explore Planner
 *
 * Extracted from tools.ts `handleExplore()` — the planning seam that
 * computes budgets, collects the subgraph, scores and sorts files,
 * and builds the flow spine.  The renderer consumes the plan.
 *
 * Part of Phase 1 Candidate 1: Explore Answer Planner Seam.
 * See docs/plans/2026-06-09-architecture-candidates-and-explore-planner.md
 */

import CodeGraph from '../index';
import type { Edge, Node, Subgraph } from '../types';
import type { ExploreOutputBudget, ExplorePlan, ExplorePlanEntry, FileGroup, FlowSpine } from './explore-types';
import { getExploreOutputBudget } from './tools';
import { clamp, isConfigLeafNode } from '../utils';
import { isGeneratedFile } from '../extraction/generated-detection';

/**
 * Rust path roots that have no file-system equivalent — `crate` is the
 * current crate, `super` is the parent module, `self` is the current
 * module. Used by `matchesSymbol` to strip these before file-path
 * matching so `crate::configurator::stage_apply::run` resolves the
 * same as `configurator::stage_apply::run`.
 */
const RUST_PATH_PREFIXES = new Set(['crate', 'super', 'self']);

// ===========================================================================
// matchesSymbol — extracted private method from ToolsHandler
// ===========================================================================

/**
 * Check whether a node matches a qualified or simple symbol name.
 *
 * Supports:
 * - Simple name match (node.name === symbol)
 * - File basename match for 'file' kind nodes
 * - Qualified-name match via `::` or `.` separators (qualifiedName suffix)
 * - File-path containment for Rust modules and Python packages
 *
 * Extracted from ToolsHandler.matchesSymbol.
 */
export function matchesSymbol(node: Node, symbol: string): boolean {
  // Simple name match
  if (node.name === symbol) return true;
  // File basename match (e.g., "product-card" matches "product-card.liquid")
  if (node.kind === 'file' && node.name.replace(/\.[^.]+$/, '') === symbol) return true;

  // Qualified-name lookups: split on any supported separator.
  if (!/[.\/]|::/.test(symbol)) return false;
  const parts = symbol.split(/::|[./]/).filter((p) => p.length > 0);
  if (parts.length < 2) return false;

  const lastPart = parts[parts.length - 1]!;
  if (node.name !== lastPart) return false;

  // Stage 1: qualified-name suffix match.
  const colonSuffix = parts.join('::');
  if (node.qualifiedName.includes(colonSuffix)) return true;

  // Stage 2: file-path containment.
  const containerHints = parts.slice(0, -1).filter((p) => !RUST_PATH_PREFIXES.has(p));
  if (containerHints.length === 0) return false;

  const segments = node.filePath.split('/').filter((s) => s.length > 0);
  return containerHints.every((hint) =>
    segments.some((seg) => seg === hint || seg.replace(/\.[^.]+$/, '') === hint)
  );
}

// ===========================================================================
// synthEdgeNote — extracted private method from ToolsHandler
// ===========================================================================

/**
 * Convert a heuristic (synthesized) edge into a human-readable note.
 * Returns null for non-heuristic edges or null input.
 *
 * Extracted from ToolsHandler.synthEdgeNote.
 */
export function synthEdgeNote(edge: Edge | null): { label: string; compact: string; registeredAt?: string } | null {
  if (!edge || edge.provenance !== 'heuristic') return null;
  const m = edge.metadata as Record<string, unknown> | undefined;
  const registeredAt = typeof m?.registeredAt === 'string' ? m.registeredAt : undefined;
  const at = registeredAt ? ` @${registeredAt}` : '';
  if (m?.synthesizedBy === 'callback') {
    const via = m.via ? `\`${String(m.via)}\`` : 'a registrar';
    const field = m.field ? ` on .${String(m.field)}` : '';
    return {
      label: `callback — registered via ${via}${field} (dynamic dispatch)`,
      compact: `dynamic: callback via ${via}${at}`,
      registeredAt,
    };
  }
  if (m?.synthesizedBy === 'event-emitter') {
    const ev = m.event ? `\`${String(m.event)}\`` : 'an event';
    return {
      label: `event ${ev} — emit → handler (dynamic dispatch)`,
      compact: `dynamic: event ${ev}${at}`,
      registeredAt,
    };
  }
  if (m?.synthesizedBy === 'react-render') {
    return {
      label: `React re-render — \`setState\` re-runs render() (dynamic dispatch)`,
      compact: `dynamic: React re-render via setState${at}`,
      registeredAt,
    };
  }
  if (m?.synthesizedBy === 'jsx-render') {
    const child = m.via ? `<${String(m.via)}>` : 'a child component';
    return {
      label: `renders ${child} (JSX child — dynamic dispatch)`,
      compact: `dynamic: renders ${child}`,
      registeredAt,
    };
  }
  if (m?.synthesizedBy === 'vue-handler') {
    const ev = m.event ? `@${String(m.event)}` : 'a template event';
    return {
      label: `Vue template handler — bound to ${ev} (dynamic dispatch)`,
      compact: `dynamic: Vue ${ev} handler`,
      registeredAt,
    };
  }
  if (m?.synthesizedBy === 'interface-impl') {
    return {
      label: `interface/abstract dispatch — runs the implementation override (dynamic dispatch)`,
      compact: `dynamic: interface → impl${at}`,
      registeredAt,
    };
  }
  if (m?.synthesizedBy === 'closure-collection') {
    const field = m.field ? `\`${String(m.field)}\`` : 'a collection';
    return {
      label: `closure collection — runs handlers appended to ${field} (dynamic dispatch)`,
      compact: `dynamic: runs ${field} handlers${at}`,
      registeredAt,
    };
  }
  return null;
}

// ===========================================================================
// computeGraphRelevance — extracted private method from ToolsHandler
// ===========================================================================

/**
 * Random-Walk-with-Restart (RWR) over the subgraph edges.
 *
 * Assigns each node a relevance mass: seeds start with uniform mass,
 * then mass diffuses through rank edges (calls/references/extends/…)
 * with a 0.25 restart probability.  After 25 iterations, nodes on or
 * near the flow accumulate high mass; isolated nodes get close to zero.
 *
 * Extracted from ToolsHandler.computeGraphRelevance.
 */
export function computeGraphRelevance(
  nodeIds: string[],
  edges: Edge[],
  seedIds: Set<string>,
): Map<string, number> {
  const out = new Map<string, number>();
  const n = nodeIds.length;
  if (n === 0) return out;
  const idx = new Map<string, number>();
  for (let i = 0; i < n; i++) idx.set(nodeIds[i]!, i);

  const RANK_EDGES = new Set<string>([
    'calls', 'references', 'extends', 'implements', 'overrides',
    'instantiates', 'returns', 'type_of', 'imports',
  ]);
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    if (!RANK_EDGES.has(e.kind)) continue;
    const i = idx.get(e.source);
    const j = idx.get(e.target);
    if (i === undefined || j === undefined || i === j) continue;
    adj[i]!.push(j);
    adj[j]!.push(i); // undirected — reachable either direction
  }

  // Restart vector: uniform over seeds present in the candidate set.
  const r = new Array<number>(n).fill(0);
  let rsum = 0;
  for (const id of seedIds) {
    const i = idx.get(id);
    if (i !== undefined) { r[i] = 1; rsum += 1; }
  }
  if (rsum === 0) { for (let i = 0; i < n; i++) r[i] = 1; rsum = n; }
  for (let i = 0; i < n; i++) r[i]! /= rsum;

  const alpha = 0.25;
  let s = r.slice();
  for (let iter = 0; iter < 25; iter++) {
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const si = s[i]!;
      if (si === 0) continue;
      const d = adj[i]!.length;
      if (d === 0) { next[i]! += si; continue; } // dangling: keep its mass
      const share = si / d;
      for (const j of adj[i]!) next[j]! += share;
    }
    for (let i = 0; i < n; i++) s[i] = (1 - alpha) * next[i]! + alpha * r[i]!;
  }
  for (let i = 0; i < n; i++) out.set(nodeIds[i]!, s[i]!);
  return out;
}

// ===========================================================================
// parseQueryTokens — Issue #22: token extraction for named symbol seeding
// ===========================================================================

/** Common source-file extensions to strip from tokens in explore queries. */
const FILE_EXT = /\.(?:java|kt|kts|ts|tsx|js|jsx|mjs|cjs|cs|py|go|rb|php|swift|rs|cpp|cc|cxx|c|h|hpp|scala|lua|dart|vue|svelte)$/i;

/**
 * Extract identifier tokens from an explore query for named-symbol resolution.
 *
 * Splits the query on whitespace, commas, parentheses, and brackets,
 * strips common file extensions, and keeps only tokens that are:
 * - At least 3 characters long
 * - Valid identifiers (alphanumeric + underscore + dollar sign)
 * - Optionally qualified with `::` or `.` separators
 *
 * Returns at most 16 unique tokens.
 *
 * Extracted from handleExplore() named-symbol seeding block.
 */
export function parseQueryTokens(query: string): string[] {
  return [...new Set(
    query.split(/[\s,()[\]]+/)
      .map((t) => t.replace(FILE_EXT, '').trim())
      .filter((t) => t.length >= 3 && /^[A-Za-z_$][\w$]*(?:(?:::|\.)[\w$]+)*$/.test(t))
  )].slice(0, 16);
}

// ===========================================================================
// isTestPath — Issue #22
// ===========================================================================

/**
 * Detect whether a file path belongs to test infrastructure.
 *
 * Matches:
 * - Directories: tests/, specs/, __tests__/, testdata/, mocks/, fixtures/
 * - File extensions: .test.*, .spec.*
 *
 * Extracted from handleExplore() named-symbol seeding block.
 */
export function isTestPath(filePath: string): boolean {
  return /(^|\/)(tests?|specs?|__tests__|testdata|mocks?|fixtures?)\//i.test(filePath) || /\.(test|spec)\.[a-z]+$/i.test(filePath);
}

// ===========================================================================
// bodyLines — Issue #22
// ===========================================================================

/**
 * Number of body lines in a node (endLine minus startLine, clamped to ≥ 0).
 *
 * Used to sort candidate symbols by "substantiveness" — more body lines
 * means more likely to be a real definition rather than a stub/forward-decl.
 *
 * Extracted from handleExplore() named-symbol seeding block.
 */
export function bodyLines(node: Node): number {
  return Math.max(0, (node.endLine ?? node.startLine) - node.startLine);
}

// ===========================================================================
// inNamedContext — Issue #22
// ===========================================================================

/**
 * Check if a node belongs to the "named context" — i.e., whether its
 * file path or qualified name contains any of the PascalCase type
 * tokens the agent used in the query.
 *
 * This is the overload-disambiguation heuristic: when a name (like
 * `validate`) has 10+ definitions, the agent also wrote the query as
 * `DataRequest validate`, giving us a hint that the `validate` it wants
 * is DataRequest's, not Validation.swift's.
 *
 * Extracted from handleExplore() named-symbol seeding block.
 */
export function inNamedContext(node: Node, typeTokens: string[]): boolean {
  return typeTokens.some((ct) => {
    const lc = ct.toLowerCase();
    return node.filePath.toLowerCase().includes(lc) || (node.qualifiedName || '').toLowerCase().includes(lc);
  });
}

// ===========================================================================
// seedNamedSymbols — Issue #22: main seeding function
// ===========================================================================

/**
 * Kinds of nodes considered "callable" — eligible for named-symbol seeding.
 * Exported so tests can reference the same set.
 */
export const CALLABLE_KINDS = new Set(['method', 'function', 'component', 'constructor']);

/**
 * Resolve every named token in the query to its concrete symbol definitions
 * and inject them as named seeds into the subgraph.
 *
 * Returns the set of node ids that were explicitly named by the agent
 * (including nodes that FTS already gathered — being "named by the agent"
 * is independent of whether search happened to surface them).
 *
 * Mutates `subgraph.nodes` to include any newly injected seeds.
 *
 * Overload disambiguation:
 * - ≤3 definitions → inject all (the name is specific enough)
 * - ≥4 definitions → bias toward the file/class the query also names
 *   (PascalCase type tokens act as context hints), capped at 4
 * - If no context match → fall back to the single most-substantive def
 *
 * Test/spec files are always skipped as candidates.
 *
 * Extracted from handleExplore() named-symbol seeding block.
 */
export function seedNamedSymbols(
  cg: { getNodesByName(name: string): Node[]; searchNodes(query: string, opts?: { limit?: number }): Array<{ node: Node }> },
  query: string,
  subgraph: { nodes: Map<string, Node>; edges: Edge[]; roots: string[] },
): Set<string> {
  const namedSeedIds = new Set<string>();
  const tokens = parseQueryTokens(query);
  if (tokens.length === 0) return namedSeedIds;

  // PascalCase tokens act as type/file disambiguators
  const typeTokens = tokens.filter((t) => /^[A-Z][A-Za-z0-9]{3,}/.test(t));

  for (const t of tokens) {
    // Qualified tokens use findAllSymbols (FTS + matchesSymbol);
    // unqualified tokens use the direct name index (getNodesByName).
    const isQual = /[.\/]|::/.test(t);
    const raw: Node[] = isQual ? findAllSymbols(cg as import('../index').default, t).nodes : cg.getNodesByName(t);

    const cands = raw
      .filter((n) => CALLABLE_KINDS.has(n.kind) && !isTestPath(n.filePath))
      .sort((a, b) => (bodyLines(b) > 1 ? 1 : 0) - (bodyLines(a) > 1 ? 1 : 0) || bodyLines(b) - bodyLines(a));

    let picks: Node[];
    if (cands.length <= 3) {
      picks = cands;
    } else {
      const ctx = cands.filter((n) => inNamedContext(n, typeTokens));
      picks = ctx.length > 0 ? ctx.slice(0, 4) : cands.slice(0, 1);
    }

    for (const n of picks) {
      if (!subgraph.nodes.has(n.id)) subgraph.nodes.set(n.id, n);
      namedSeedIds.add(n.id);
    }
  }

  return namedSeedIds;
}

// ===========================================================================
// isLowValue — Issue #23: test/spec/icon/i18n file detection
// ===========================================================================

/**
 * Detect whether a file path belongs to test infrastructure, icon assets,
 * or internationalization files — content that rarely answers an architecture
 * question and should be deprioritized or excluded.
 *
 * Extracted from handleExplore() file-scoring block.
 */
export function isLowValue(filePath: string): boolean {
  const lp = filePath.toLowerCase();
  return (
    /\/(tests?|__tests?__|spec)\//.test(lp) ||
    /_test\.go$/.test(lp) ||
    /(?:^|\/)test_[^/]+\.py$/.test(lp) ||
    /_test\.py$/.test(lp) ||
    /_spec\.rb$/.test(lp) ||
    /_test\.rb$/.test(lp) ||
    /\.(test|spec)\.[jt]sx?$/.test(lp) ||
    /(test|spec|tests)\.(java|kt|scala)$/.test(lp) ||
    /(tests?|spec)\.cs$/.test(lp) ||
    /tests?\.swift$/.test(lp) ||
    /_test\.dart$/.test(lp) ||
    /\bicons?\b/.test(lp) ||
    /\bi18n\b/.test(lp)
  );
}

// ===========================================================================
// buildFileGroups — Issue #23: group nodes by file, score per node
// ===========================================================================

/**
 * Group subgraph nodes by file path and compute per-node relevance scores.
 *
 * Scoring:
 *   +50 — named seed (agent explicitly asked for this symbol by name)
 *   +10 — entry node (subgraph root or named seed)
 *    +3 — directly connected to an entry node
 *    +1 — all other callable/symbol nodes
 *
 * Import/export nodes and config-leaf nodes are skipped (noise).
 *
 * Extracted from handleExplore() file-scoring block.
 */
export function buildFileGroups(
  subgraph: Subgraph,
  namedSeedIds: Set<string>,
  entryNodeIds: Set<string>,
  spineNodeIds: Set<string> = new Set(),
): Map<string, FileGroup> {
  const fileGroups = new Map<string, FileGroup>();

  // Build set of nodes directly connected to entry points (depth 1)
  const connectedToEntry = new Set<string>();
  for (const edge of subgraph.edges) {
    if (entryNodeIds.has(edge.source)) connectedToEntry.add(edge.target);
    if (entryNodeIds.has(edge.target)) connectedToEntry.add(edge.source);
  }

  for (const node of subgraph.nodes.values()) {
    // Skip import/export nodes — they add noise without information
    if (node.kind === 'import' || node.kind === 'export') continue;
    // SECURITY (#383): never render on-disk source of a config-leaf
    if (isConfigLeafNode(node)) continue;

    const group = fileGroups.get(node.filePath) || { nodes: [], score: 0 };
    group.nodes.push(node);

    if (namedSeedIds.has(node.id)) {
      group.score += 50;
    } else if (entryNodeIds.has(node.id)) {
      group.score += 10;
    } else if (spineNodeIds.has(node.id)) {
      group.score += 5;
    } else if (connectedToEntry.has(node.id)) {
      group.score += 3;
    } else {
      group.score += 1;
    }
    fileGroups.set(node.filePath, group);
  }

  return fileGroups;
}

// ===========================================================================
// countDistinctTermHits — Issue #23: query term matching per file
// ===========================================================================

/**
 * Count how many distinct query terms match each file (path + node names).
 *
 * Terms shorter than 3 characters are filtered out. This is a supplemental
 * text signal — the PRIMARY relevance is graph connectivity via RWR.
 *
 * Extracted from handleExplore() file-scoring block.
 */
export function countDistinctTermHits(
  fileGroups: Map<string, FileGroup>,
  queryTerms: string[],
): Map<string, number> {
  const uniqueTerms = [...new Set(queryTerms)].filter((t) => t.length >= 3);
  const result = new Map<string, number>();

  for (const [fp, group] of fileGroups) {
    const hay = fp.toLowerCase() + ' ' + group.nodes.map((n) => n.name.toLowerCase()).join(' ');
    let hits = 0;
    for (const t of uniqueTerms) {
      if (hay.includes(t)) hits++;
    }
    result.set(fp, hits);
  }

  return result;
}

// ===========================================================================
// aggregateFileGraphScores — Issue #23: aggregate RWR per file
// ===========================================================================

/**
 * Aggregate per-node Random-Walk-with-Restart scores to per-file totals.
 *
 * Returns both the file-level scores and the maximum score across all files
 * (used for the relevance gate and the epsilon tiebreak in sorting).
 *
 * Extracted from handleExplore() file-scoring block.
 */
export function aggregateFileGraphScores(
  subgraph: Subgraph,
  nodeRwr: Map<string, number>,
): { fileGraphScore: Map<string, number>; maxGraph: number } {
  const fileGraphScore = new Map<string, number>();

  for (const node of subgraph.nodes.values()) {
    fileGraphScore.set(
      node.filePath,
      (fileGraphScore.get(node.filePath) ?? 0) + (nodeRwr.get(node.id) ?? 0),
    );
  }

  const maxGraph = Math.max(0, ...fileGraphScore.values());
  return { fileGraphScore, maxGraph };
}

// ===========================================================================
// gateAndSortFiles — Issue #23: relevance gate + sort
// ===========================================================================

/**
 * Apply relevance gate and sort files for the explore answer.
 *
 * Pipeline:
 * 1. Filter to files with score ≥ 3
 * 2. Hard-exclude test/spec/icon/i18n files (unless query mentions tests)
 * 3. Compute per-file term hits (supplemental text signal)
 * 4. Compute per-file graph scores via RWR (primary structural signal)
 * 5. Identify central files (top-2 graph-central + textual match)
 * 6. Build entry-file and named-seed-file sets for gate protection / sort priority
 * 7. Relevance gate: keep files that are structurally relevant by ANY of:
 *    - graph score ≥ maxGraph * 0.06, or
 *    - central file, or
 *    - entry file (defines a named symbol), or
 *    - ≥2 distinct query-term hits
 * 8. Sort by: named-seed first → graph centrality → term hits → low-value → generated → score → node count
 *
 * Extracted from handleExplore() file-scoring block.
 */
export function gateAndSortFiles(
  subgraph: Subgraph,
  namedSeedIds: Set<string>,
  entryNodeIds: Set<string>,
  fileGroups: Map<string, FileGroup>,
  query: string,
  spineNodeIds: Set<string> = new Set(),
): Array<[string, FileGroup]> {
  // Step 1: Filter to files with score ≥ 3
  let relevantFiles = [...fileGroups.entries()].filter(([, group]) => group.score >= 3);

  if (relevantFiles.length === 0) return [];

  // Extract query terms
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);

  // Step 2: Hard-exclude low-value files (test/spec/icon/i18n)
  const queryMentionsTests = /\b(test|tests|testing|spec|verify|verifies)\b/i.test(query);
  if (!queryMentionsTests) {
    const nonLow = relevantFiles.filter(([p]) => !isLowValue(p));
    if (nonLow.length >= 2) {
      relevantFiles = nonLow;
    }
  }

  // Step 3: File-level term hits
  const fileTermHits = countDistinctTermHits(
    new Map(relevantFiles),
    queryTerms,
  );

  // Step 4: RWR → per-file graph scores
  const nodeRwr = computeGraphRelevance(
    [...subgraph.nodes.keys()],
    subgraph.edges,
    entryNodeIds,
  );
  const { fileGraphScore, maxGraph } = aggregateFileGraphScores(subgraph, nodeRwr);

  // Step 5: Central files (top-2 graph-central with ≥1 term hit)
  const centralFiles = new Set(
    [...fileGraphScore.entries()]
      .filter(([fp, g]) => g > 0 && (fileTermHits.get(fp) ?? 0) >= 1)
      .sort((a, b) => b[1] - a[1] || (fileTermHits.get(b[0]) ?? 0) - (fileTermHits.get(a[0]) ?? 0))
      .slice(0, 2)
      .map(([f]) => f),
  );

  // Step 6: Entry files + named-seed files
  const entryFiles = new Set<string>();
  for (const id of entryNodeIds) {
    const n = subgraph.nodes.get(id);
    if (n) entryFiles.add(n.filePath);
  }

  const namedSeedFiles = new Set<string>();
  for (const id of namedSeedIds) {
    const n = subgraph.nodes.get(id);
    if (n) namedSeedFiles.add(n.filePath);
  }

  // Step 7: Relevance gate
  // Files on the flow spine are always preserved — the agent needs them
  // to understand the call path even if their RWR score is low.
  const spineFiles = new Set<string>();
  for (const id of spineNodeIds) {
    const n = subgraph.nodes.get(id);
    if (n) spineFiles.add(n.filePath);
  }

  if (maxGraph > 0) {
    const gated = relevantFiles.filter(([fp]) =>
      (fileGraphScore.get(fp) ?? 0) >= maxGraph * 0.06
      || centralFiles.has(fp)
      || entryFiles.has(fp)
      || spineFiles.has(fp)
      || (fileTermHits.get(fp) ?? 0) >= 2,
    );
    if (gated.length >= 2) relevantFiles = gated;
  }

  // Step 8: Sort
  return relevantFiles.sort((a, b) => {
    const aPath = a[0].toLowerCase();
    const bPath = b[0].toLowerCase();

    // Named-seed files first
    const aNamed = namedSeedFiles.has(a[0]) ? 1 : 0;
    const bNamed = namedSeedFiles.has(b[0]) ? 1 : 0;
    if (aNamed !== bNamed) return bNamed - aNamed;

    // Graph connectivity (epsilon tiebreak)
    const aG = fileGraphScore.get(a[0]) ?? 0;
    const bG = fileGraphScore.get(b[0]) ?? 0;
    if (Math.abs(aG - bG) > maxGraph * 0.01) return bG - aG;

    // Distinct term hits
    const aHits = fileTermHits.get(a[0]) ?? 0;
    const bHits = fileTermHits.get(b[0]) ?? 0;
    if (aHits !== bHits) return bHits - aHits;

    // Low-value penalty
    const aLow = isLowValue(aPath);
    const bLow = isLowValue(bPath);
    if (aLow !== bLow) return aLow ? 1 : -1;

    // Generated-file penalty
    const aGen = isGeneratedFile(a[0]);
    const bGen = isGeneratedFile(b[0]);
    if (aGen !== bGen) return aGen ? 1 : -1;

    // Aggregated score
    if (a[1].score !== b[1].score) return b[1].score - a[1].score;

    // Node count (more nodes = more content)
    return b[1].nodes.length - a[1].nodes.length;
  });
}

// ===========================================================================
// readAdaptiveEnabled — Issue #24: env var reader
// ===========================================================================

/**
 * Read CODEGRAPH_ADAPTIVE_EXPLORE environment variable.
 *
 * When set to "0" or "false", adaptive explore is disabled.
 * When unset or any other value, adaptive explore is enabled.
 * This matches the semantics of adaptiveExploreEnabled() in tools.ts.
 */
export function readAdaptiveEnabled(): boolean {
  const raw = process.env['CODEGRAPH_ADAPTIVE_EXPLORE'];
  return raw === undefined || (raw !== '' && raw !== '0' && raw !== 'false');
}

// ===========================================================================
// plan() — the explore planner seam
// ==========================================================================="

/**
 * Options for the explore planner.
 */
export interface PlanOptions {
  /** Override the default maxFiles (clamped to [1, 20]). */
  maxFiles?: number;
}

/**
 * Produce a full ExplorePlan from a user query and a CodeGraph instance.
 *
 * The plan captures every decision the planner makes before rendering
 * begins: budget selection, subgraph collection, file scoring & sorting,
 * flow spine, and adaptive sizing signals.  The renderer consumes this
 * plan to produce the final markdown answer.
 *
 * This is the Phase 1 extraction from ToolsHandler.handleExplore().
 * Slices #22–#24 incrementally add named seeding, group/scoring/sorting,
 * and flow spine construction.
 */
export async function plan(
  cg: CodeGraph,
  query: string,
  opts?: PlanOptions,
): Promise<ExplorePlan> {
  // Resolve adaptive output budget from project size. Falls back to the
  // largest-tier defaults if stats aren't available.
  let budget: ExploreOutputBudget;
  try {
    budget = getExploreOutputBudget(cg.getStats().fileCount);
  } catch {
    budget = getExploreOutputBudget(Infinity);
  }
  const maxFiles = clamp(opts?.maxFiles ?? budget.defaultMaxFiles, 1, 20);

  // Step 1: Find relevant context with generous parameters.
  const subgraph = await cg.findRelevantContext(query, {
    searchLimit: 8,
    traversalDepth: 3,
    maxNodes: 200,
    minScore: 0.2,
  });

  // Step 1b: Named-symbol seeding — resolve query tokens to concrete
  // symbol definitions and inject them as named seeds, so every symbol
  // the agent explicitly named is in the subgraph and its file is scored.
  const namedSeedIds = seedNamedSymbols(cg, query, subgraph);

  // Glue nodes: pull in callers/callees of entry roots that live in
  // files the subgraph already surfaces.  This adds wiring without
  // dragging in unrelated files.
  const glueNodeIds = new Set<string>();
  const subgraphFiles = new Set<string>();
  for (const n of subgraph.nodes.values()) subgraphFiles.add(n.filePath);
  const GLUE_NODE_CAP = 60;
  for (const rootId of subgraph.roots) {
    if (glueNodeIds.size >= GLUE_NODE_CAP) break;
    let neighbors: Node[] = [];
    try {
      neighbors = [
        ...cg.getCallers(rootId).map(c => c.node),
        ...cg.getCallees(rootId).map(c => c.node),
      ];
    } catch {
      continue;
    }
    for (const nb of neighbors) {
      if (glueNodeIds.size >= GLUE_NODE_CAP) break;
      if (subgraph.nodes.has(nb.id)) continue;
      if (!subgraphFiles.has(nb.filePath)) continue;
      subgraph.nodes.set(nb.id, nb);
      glueNodeIds.add(nb.id);
    }
  }

  // Step 2: Trace the flow spine through named symbols.
  const flow = buildFlowFromNamedSymbols(cg, query);
  const spine: FlowSpine = {
    text: flow.text,
    pathNodeIds: flow.pathNodeIds,
    namedNodeIds: flow.namedNodeIds,
    uniqueNamedNodeIds: flow.uniqueNamedNodeIds,
  };

  // Step 3: Group nodes by file, score by relevance.
  const entryNodeIds = new Set([...subgraph.roots, ...namedSeedIds]);
  const fileGroups = buildFileGroups(subgraph, namedSeedIds, entryNodeIds, spine.pathNodeIds);

  // Step 4: Apply relevance gate and sort files.
  const sortedFiles = gateAndSortFiles(subgraph, namedSeedIds, entryNodeIds, fileGroups, query, spine.pathNodeIds);

  // Compute connectedToEntry: nodes directly connected by edge to any entry.
  const connectedToEntry = new Set<string>();
  for (const edge of subgraph.edges) {
    if (entryNodeIds.has(edge.source)) connectedToEntry.add(edge.target);
    if (entryNodeIds.has(edge.target)) connectedToEntry.add(edge.source);
  }

  // Compute centralFiles: top 1-2 graph-central files that also match a query term.
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
  const uniqueQueryTerms = [...new Set(queryTerms)].filter(t => t.length >= 3);
  const fileTermHits = new Map<string, number>();
  for (const [fp, group] of fileGroups) {
    const hay = fp.toLowerCase() + ' ' + group.nodes.map(n => n.name.toLowerCase()).join(' ');
    let hits = 0;
    for (const t of uniqueQueryTerms) if (hay.includes(t)) hits++;
    fileTermHits.set(fp, hits);
  }
  const nodeRwr = computeGraphRelevance(
    [...subgraph.nodes.keys()], subgraph.edges, entryNodeIds,
  );
  const fileGraphScore = new Map<string, number>();
  for (const node of subgraph.nodes.values()) {
    fileGraphScore.set(
      node.filePath,
      (fileGraphScore.get(node.filePath) ?? 0) + (nodeRwr.get(node.id) ?? 0),
    );
  }
  const centralFiles = new Set(
    [...fileGraphScore.entries()]
      .filter(([fp, g]) => g > 0 && (fileTermHits.get(fp) ?? 0) >= 1)
      .sort((a, b) => b[1] - a[1] || (fileTermHits.get(b[0]) ?? 0) - (fileTermHits.get(a[0]) ?? 0))
      .slice(0, 2)
      .map(([f]) => f),
  );

  const projectRoot = cg.getProjectRoot();

  // ===== Compute entries with evidence value annotations =====
  // Maps each sorted file to an ExplorePlanEntry with semantic labels
  // so the renderer can make per-file decisions without recomputing
  // plan-level logic.
  const entries: ExplorePlanEntry[] = [];
  for (const [filePath, group] of sortedFiles) {
    const entry: ExplorePlanEntry = {
      filePath,
      symbols: [...new Set(
        group.nodes
          .filter(n => n.kind !== 'import' && n.kind !== 'export')
          .map(n => n.name),
      )],
      evidenceValue: 'compressible', // default, overridden below
      renderMode: 'full',           // default, renderer may override
      reason: '',
      score: group.score,
    };

    // Determine evidence value from plan-level data
    const nodesInFile = group.nodes;
    const fileHasEntryNode = nodesInFile.some(n => entryNodeIds.has(n.id));
    const fileOnSpine = nodesInFile.some(n => spine.pathNodeIds.has(n.id));
    const fileHasNamedSymbol = nodesInFile.some(n =>
      spine.namedNodeIds.has(n.id) || spine.uniqueNamedNodeIds.has(n.id),
    );
    const fileConnected = nodesInFile.some(n => connectedToEntry.has(n.id));
    const isCentral = centralFiles.has(filePath);

    // Check for distracting (low-value) paths
    const isDistracting = isLowValue(filePath);

    if (isDistracting) {
      entry.evidenceValue = 'distracting';
      entry.renderMode = 'omit';
      entry.reason = 'low-value path (test/generated)';
    } else if (fileHasEntryNode || fileOnSpine) {
      entry.evidenceValue = 'critical';
      entry.reason = fileHasEntryNode
        ? 'contains entry-point nodes'
        : 'on flow spine';
    } else if (fileConnected || isCentral) {
      entry.evidenceValue = 'supportive';
      entry.reason = fileConnected
        ? 'connected to entry via graph edges'
        : 'central to query graph';
    } else if (fileHasNamedSymbol) {
      entry.evidenceValue = 'supportive';
      entry.reason = 'contains named symbol referenced by query';
    } else {
      entry.evidenceValue = 'compressible';
      entry.reason = 'additional relevant file';
    }

    // ===== Skeletonization policy (renderMode) =====
    // Only when adaptive explore is enabled, a flow spine exists,
    // and the file is NOT distracting.
    if (entry.evidenceValue !== 'distracting' && readAdaptiveEnabled() && spine.pathNodeIds.size > 0) {
      // Polymorphic-sibling detector. A class that implements/extends a
      // supertype shared by >= MIN_SIBLINGS (3) classes is one of many
      // INTERCHANGEABLE implementations — skeletonize off-spine siblings.
      const MIN_SIBLINGS = 3;
      const siblingSuper = new Map<string, boolean>();
      const isPolymorphicSibling = (nodes: Node[]): boolean => {
        for (const n of nodes) {
          for (const e of cg.getOutgoingEdges(n.id)) {
            if (e.kind !== 'implements' && e.kind !== 'extends') continue;
            let many = siblingSuper.get(e.target);
            if (many === undefined) {
              many = cg.getIncomingEdges(e.target)
                .filter((x) => x.kind === 'implements' || x.kind === 'extends').length >= MIN_SIBLINGS;
              siblingSuper.set(e.target, many);
            }
            if (many) return true;
          }
        }
        return false;
      };

      // A file that DEFINES a polymorphic supertype with ≥MIN_SIBLINGS
      // implementers is a "family" file — it still skeletonizes even when
      // the agent named a method in it.
      const superMany = new Map<string, boolean>();
      const definesPolymorphicSupertype = (nodes: Node[]): boolean => {
        for (const n of nodes) {
          if (n.kind !== 'class' && n.kind !== 'interface' && n.kind !== 'struct'
              && n.kind !== 'trait' && n.kind !== 'protocol' && n.kind !== 'type_alias') continue;
          let many = superMany.get(n.id);
          if (many === undefined) {
            many = cg.getIncomingEdges(n.id)
              .filter((x) => x.kind === 'implements' || x.kind === 'extends').length >= MIN_SIBLINGS;
            superMany.set(n.id, many);
          }
          if (many) return true;
        }
        return false;
      };

      const hasSpineNode = nodesInFile.some(n => spine.pathNodeIds.has(n.id));
      const spareNamed = nodesInFile.some(n => spine.uniqueNamedNodeIds.has(n.id));
      const fileDefinesSuper = definesPolymorphicSupertype(nodesInFile);
      const spared = spareNamed && !fileDefinesSuper;
      const isSibling = isPolymorphicSibling(nodesInFile);

      if (!hasSpineNode && isSibling && !spared) {
        // Off-spine polymorphic sibling → skeletonize
        entry.renderMode = 'skeleton';
        entry.reason += '; skeletonized: off-spine polymorphic sibling';
      } else if (hasSpineNode && isSibling && spared && !fileDefinesSuper) {
        // On-spine sibling that is uniquely named → keep focused
        entry.renderMode = 'focused';
        entry.reason += '; focused: on-spine named callable spared';
      }
      // Note: onSpineGodFile logic (renderer lines 203-217) is complex and
      // depends on file content analysis (bodyChars computation). It stays
      // in the renderer for now — the planner sets the initial renderMode
      // and the renderer may further refine it during rendering.
    }

    entries.push(entry);
  }

  const plan: ExplorePlan = {
    query,
    budget,
    maxFiles,
    subgraph,
    entryNodeIds,
    fileGroups,
    sortedFiles,
    entries,
    spine,
    adaptiveEnabled: readAdaptiveEnabled(),
    glueNodeIds,
    connectedToEntry,
    centralFiles,
    projectRoot,
  };

  return plan;
}

// ===========================================================================
// findAllSymbols — extracted private method from ToolsHandler
// ===========================================================================

/** Last `::` / `.` / `/`-separated segment of a qualified symbol. */
function lastQualifierPart(symbol: string): string {
  const parts = symbol.split(/::|[./]/).filter((p) => p.length > 0);
  return parts[parts.length - 1] ?? symbol;
}

/**
 * Find ALL symbols matching a name. Used by the explore planner to resolve
 * query tokens into concrete node references.
 *
 * For qualified symbols (containing `.`, `/`, or `::`), uses FTS +
 * `matchesSymbol` to find exact matches.  For simple names, uses
 * `cg.searchNodes` with the `matchesSymbol` filter.
 *
 * Extracted from ToolsHandler.findAllSymbols.
 */
export function findAllSymbols(cg: CodeGraph, symbol: string): { nodes: Node[]; note: string } {
  let results = cg.searchNodes(symbol, { limit: 50 });

  // Mirror the fallback in `findSymbol` for qualified queries — FTS
  // strips colons, so a module-qualified lookup needs a second pass
  // by the bare last part.
  if (results.length === 0 && /[.\/]|::/.test(symbol)) {
    const tail = lastQualifierPart(symbol);
    if (tail && tail !== symbol) results = cg.searchNodes(tail, { limit: 50 });
  }

  if (results.length === 0) {
    return { nodes: [], note: '' };
  }

  const exactMatches = results.filter(r => matchesSymbol(r.node, symbol));

  if (exactMatches.length <= 1) {
    const node = exactMatches[0]?.node ?? results[0]!.node;
    return { nodes: [node], note: '' };
  }

  // Same generated-file down-rank as findSymbol.
  const ranked = [...exactMatches].sort((a, b) => {
    const aGen = isGeneratedFile(a.node.filePath) ? 1 : 0;
    const bGen = isGeneratedFile(b.node.filePath) ? 1 : 0;
    return aGen - bGen;
  });

  const locations = ranked.map(r =>
    `${r.node.kind} at ${r.node.filePath}:${r.node.startLine}`
  );
  const note = `\n\n> **Note:** Aggregated results across ${ranked.length} symbols named "${symbol}": ${locations.join(', ')}`;
  return { nodes: ranked.map(r => r.node), note };
}

// ===========================================================================
// buildFlowFromNamedSymbols — extracted private method from ToolsHandler
// ===========================================================================

/**
 * Result of tracing the call-path spine through named symbols.
 */
export interface FlowResult {
  /** Human-readable markdown description of the call chain. */
  text: string;
  /** Node ids on the actual traced call path (the spine). */
  pathNodeIds: Set<string>;
  /** All callable entities the agent named (superset of pathNodeIds). */
  namedNodeIds: Set<string>;
  /**
   * Named callable entities that are unique (≤ 3 definitions) in the graph.
   * Safe to spare a file from skeletonization when one of these is present.
   */
  uniqueNamedNodeIds: Set<string>;
}

/**
 * Flow-from-named-symbols: an agent's explore query is a bag of
 * symbol names that usually spans the flow it's investigating.
 * Surface the longest call chain AMONG those named symbols — scoped
 * to what the agent explicitly named.
 *
 * Extracted from ToolsHandler.buildFlowFromNamedSymbols.
 */
export function buildFlowFromNamedSymbols(cg: CodeGraph, query: string): FlowResult {
  const EMPTY: FlowResult = { text: '', pathNodeIds: new Set<string>(), namedNodeIds: new Set<string>(), uniqueNamedNodeIds: new Set<string>() };
  try {
    const CALLABLE = new Set(['method', 'function', 'component', 'constructor']);
    const FILE_EXT = /\.(?:java|kt|kts|ts|tsx|js|jsx|mjs|cjs|cs|py|go|rb|php|swift|rs|cpp|cc|cxx|c|h|hpp|scala|lua|dart|vue|svelte)$/i;
    const tokens = [...new Set(
      query.split(/[\s,()[\]]+/)
        .map((t) => t.replace(FILE_EXT, '').trim())
        .filter((t) => t.length >= 3 && /^[A-Za-z_$][\w$]*(?:(?:::|\.)[\w$]+)*$/.test(t))
    )].slice(0, 16);
    if (tokens.length < 2) return EMPTY;
    // Pool of name SEGMENTS (Class + method from every token) used to
    // disambiguate an ambiguous SIMPLE name.
    const segPool = new Set<string>();
    for (const t of tokens) for (const s of t.toLowerCase().split(/::|\./)) if (s) segPool.add(s);
    const named = new Map<string, Node>();
    const uniqueNamedNodeIds = new Set<string>();
    for (const t of tokens) {
      const cands = findAllSymbols(cg, t).nodes.filter((n) => CALLABLE.has(n.kind));
      const specific = cands.length <= 3;
      const pick = specific
        ? cands
        : cands.filter((n) => {
            const segs = (n.qualifiedName || '').toLowerCase().split(/::|\./).filter(Boolean);
            const container = segs.length >= 2 ? segs[segs.length - 2] : '';
            return !!container && segPool.has(container);
          });
      for (const n of pick.slice(0, 6)) {
        named.set(n.id, n);
        if (specific) uniqueNamedNodeIds.add(n.id);
      }
      if (named.size > 40) break;
    }
    if (named.size < 2) return EMPTY;
    const MAX_HOPS = 7;
    let best: Array<{ node: Node; edge: Edge | null }> | null = null;
    // BFS the full call graph from each named seed.
    for (const seed of [...named.values()].slice(0, 8)) {
      const parent = new Map<string, { prev: string | null; edge: Edge | null; node: Node }>();
      parent.set(seed.id, { prev: null, edge: null, node: seed });
      const q: Array<{ id: string; depth: number; streak: number }> = [{ id: seed.id, depth: 0, streak: 0 }];
      let deep: string | null = null, deepDepth = 0;
      const MAX_BRIDGE = 1;
      for (let h = 0; h < q.length && parent.size < 1500; h++) {
        const { id, depth, streak } = q[h]!;
        if (id !== seed.id && named.has(id) && depth > deepDepth) { deep = id; deepDepth = depth; }
        if (depth >= MAX_HOPS - 1) continue;
        for (const c of cg.getCallees(id)) {
          if (c.edge.kind !== 'calls' || parent.has(c.node.id)) continue;
          const newStreak = named.has(c.node.id) ? 0 : streak + 1;
          if (newStreak > MAX_BRIDGE) continue;
          parent.set(c.node.id, { prev: id, edge: c.edge, node: c.node });
          q.push({ id: c.node.id, depth: depth + 1, streak: newStreak });
        }
      }
      if (!deep) continue;
      const chain: Array<{ node: Node; edge: Edge | null }> = [];
      let cur: string | null = deep;
      while (cur) { const p = parent.get(cur); if (!p) break; chain.push({ node: p.node, edge: p.edge }); cur = p.prev; }
      chain.reverse();
      if (!best || chain.length > best.length) best = chain;
    }
    const hasMain = !!best && best.length >= 3;
    const pathIds = new Set((best ?? []).map((s) => s.node.id));

    // Supplementary: dynamic-dispatch (synthesized) edges incident to a NAMED symbol.
    const synthLines: string[] = [];
    const synthSeen = new Set<string>();
    for (const n of named.values()) {
      if (synthLines.length >= 6) break;
      for (const { node: other, edge } of [...cg.getCallers(n.id), ...cg.getCallees(n.id)]) {
        if (synthLines.length >= 6) break;
        if (edge.provenance !== 'heuristic' || other.id === n.id) continue;
        if (pathIds.has(edge.source) && pathIds.has(edge.target)) continue;
        const src = edge.source === n.id ? n : other;
        const tgt = edge.source === n.id ? other : n;
        const key = `${src.name}>${tgt.name}`;
        if (synthSeen.has(key)) continue;
        synthSeen.add(key);
        const note = synthEdgeNote(edge);
        synthLines.push(`- ${src.name} → ${tgt.name}   [${note ? note.compact : edge.kind}]`);
      }
    }

    if (!hasMain && synthLines.length === 0) return EMPTY;
    const out: string[] = [];
    if (hasMain) {
      out.push('## Flow (call path among the symbols you queried)', '');
      for (let i = 0; i < best!.length; i++) {
        const step = best![i]!;
        if (step.edge) { const sy = synthEdgeNote(step.edge); out.push(`   ↓ ${sy ? sy.compact : step.edge.kind}`); }
        out.push(`${i + 1}. ${step.node.name} (${step.node.filePath}:${step.node.startLine})`);
      }
      out.push('');
    }
    if (synthLines.length) {
      out.push(
        '## Dynamic-dispatch links among your symbols',
        '(synthesized — the indirect hops grep/Read would reconstruct; the `@file:line` is the wiring site)',
        '',
        ...synthLines,
        ''
      );
    }
    out.push('> Full source for these symbols is below — the call flow among them, followed by their bodies.', '');
    return { text: out.join('\n'), pathNodeIds: pathIds, namedNodeIds: new Set(named.keys()), uniqueNamedNodeIds };
  } catch {
    return EMPTY;
  }
}
