/**
 * Slice 3.2: Anchor discovery (DES-universal-structural-explore-v1 §441-§445).
 *
 * Resolve explicit symbols, qualified names, types, modules, routes and
 * file paths with bounded exact/structural searches. Each query clue
 * retains a small representative set of anchors so a global top-k never
 * eliminates an entire kind of anchor. Ambiguity is retained — ordinary
 * concepts may add candidates but cannot be presented as uniquely named
 * endpoints.
 *
 * Boundaries (contract §473-§475):
 *   - The same algorithm serves all repositories. No branch may inspect
 *     a repository/framework name to select a candidate, weight,
 *     required file, trace, or budget exception.
 *   - Anchor discovery never re-implements FTS ranking; that is the
 *     legacy composition's job.
 *   - All reads belong to the Slice 2 fixed snapshot. Any read that
 *     would observe a different generation throws SnapshotLostError.
 */

import type { Node } from '../types';
import type { ExploreReadSnapshot } from './snapshot';
import type { SymbolIdentity, SourceLocation } from './obligations';

// ===========================================================================
// Public shape
// ===========================================================================

/** The kind of clue that produced an anchor. */
export type AnchorKind =
  | 'explicit-symbol'
  | 'qualified-name'
  | 'type-name'
  | 'module'
  | 'route'
  | 'file-path'
  | 'concept';

/** One matched anchor. */
export interface AnchorMatch {
  /** Stable identifier for tie-breaking and dedup. */
  id: string;
  /** The graph node backing this anchor. */
  nodeId: string;
  /** How the clue was interpreted. */
  kind: AnchorKind;
  /** The clue text that produced this match. */
  clue: string;
  /** Resolved symbol identity when available. */
  symbol?: SymbolIdentity;
  /** Source location of the anchor. */
  location?: SourceLocation;
  /** True if this anchor is one of several equally-valid matches. */
  ambiguous: boolean;
}

/** Per-clue representative anchor set. */
export interface AnchorSet {
  clue: string;
  kind: AnchorKind;
  matches: AnchorMatch[];
  /** True iff the per-clue ceiling was hit (searchExhausted for this clue). */
  truncated: boolean;
}

/** Aggregate result of anchor discovery. */
export interface AnchorResolution {
  anchors: AnchorSet[];
  /** Total unique anchors across all clues (after dedup). */
  uniqueAnchorCount: number;
  /** Clues that produced zero matches. */
  unmatchedClues: string[];
}

// ===========================================================================
// Work ceilings (Slice 3 fixed implementation constants — contract §450)
// ===========================================================================

/**
 * Fixed implementation ceilings for anchor discovery. These are not
 * transport knobs; their values and fingerprint are reported in the
 * work budget. Changing them is a reviewed semantic change.
 */
export const ANCHOR_WORK_CEILING = Object.freeze({
  /** Max anchors retained per clue (per contract §444). */
  perClueLimit: 4,
  /** Max total anchors across all clues (before dedup). */
  globalLimit: 32,
  /** Max clues considered in a single query. */
  maxClues: 8,
});

// ===========================================================================
// Clue extraction
// ===========================================================================

/**
 * Extract query clues. Slice 3.2 intentionally uses a conservative
 * tokenizer: it splits on whitespace and common separators, retains
 * dotted / path-like / CamelCase / snake_case tokens as clues, and
 * discards stopwords. There is no framework-specific handling — the
 * same algorithm serves every repo (§473).
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or',
  'how', 'what', 'where', 'when', 'why', 'is', 'are', 'was', 'were',
  'do', 'does', 'did', 'show', 'tell', 'me', 'find', 'get', 'list',
]);

export function extractClues(query: string): string[] {
  const tokens = query
    .split(/[\s,;:!?(){}\[\]<>"'`]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .filter((t) => !STOPWORDS.has(t.toLowerCase()));
  // Dedupe preserving order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
      if (out.length >= ANCHOR_WORK_CEILING.maxClues) break;
    }
  }
  return out;
}

// ===========================================================================
// Anchor classification
// ===========================================================================

/**
 * Classify a clue into an anchor kind. Pure string-based heuristics,
 * no repo-specific knowledge.
 *
 * File-path disambiguation: a clue with a single dot is only a file-path
 * when its extension is a recognized source-code extension. Otherwise
 * `Foo.bar` would be misclassified as a file. This is intentionally a
 * fixed allow-list, not repo-specific logic.
 */
const SOURCE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'cs',
  'c', 'h', 'cc', 'cpp', 'hpp', 'hh',
  'php', 'swift', 'scala', 'lua', 'ex', 'exs',
  'vue', 'svelte', 'astro',
  'json', 'yaml', 'yml', 'toml', 'xml', 'md',
  'sql', 'sh', 'bash', 'ps1', 'bat',
]);

export function classifyClue(clue: string): AnchorKind {
  if (clue.includes('/')) {
    // Route-like (e.g. /api/users) or path-like (e.g. src/foo/bar)
    if (clue.startsWith('/')) return 'route';
    if (/^[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+$/.test(clue)) return 'file-path';
    return 'module';
  }
  if (clue.includes('.')) {
    // Distinguish file-path (foo.ts) from qualified-name (Foo.bar).
    // The latter has a non-source extension or starts with an uppercase
    // container segment.
    const match = clue.match(/\.([a-zA-Z]+)$/);
    if (match && SOURCE_EXTENSIONS.has(match[1].toLowerCase())) {
      return 'file-path';
    }
    return 'qualified-name';
  }
  if (/^[A-Z][a-zA-Z0-9]*$/.test(clue)) return 'type-name';
  if (/^[a-z_][a-zA-Z0-9_]*$/.test(clue)) return 'explicit-symbol';
  return 'concept';
}

// ===========================================================================
// Snapshot-aware graph surface
// ===========================================================================

/**
 * Narrow graph surface required by anchor discovery. Implementations
 * MUST check `snapshot.assertActive()` inside every method so that any
 * read after invalidation throws SnapshotLostError.
 */
export interface AnchorGraphRead {
  /** Exact name lookup (no FTS ranking). */
  getNodesByName(name: string): Node[];
  /** All nodes of a kind. Used for type-name clue matching. */
  getNodesByKind(kind: Node['kind']): Node[];
}

// ===========================================================================
// Anchor discovery
// ===========================================================================

function toSymbolIdentity(node: Node): SymbolIdentity {
  return {
    name: node.name,
    container: node.filePath,
    location: `${node.filePath}:${node.startLine}`,
  };
}

function toSourceLocation(node: Node): SourceLocation {
  return {
    filePath: node.filePath,
    startLine: node.startLine,
    endLine: node.endLine,
  };
}

function makeAnchorId(clue: string, node: Node): string {
  return `${clue}→${node.kind}:${node.id}`;
}

/**
 * Resolve anchors for a query. For each clue, run bounded exact/structural
 * searches and retain up to `perClueLimit` matches. Sets `ambiguous=true`
 * when a clue produced more than one match. Never ranks, never picks a
 * single winner.
 */
export function resolveAnchors(
  query: string,
  graph: AnchorGraphRead,
  snapshot: ExploreReadSnapshot,
): AnchorResolution {
  const clues = extractClues(query);
  const anchors: AnchorSet[] = [];
  const unmatchedClues: string[] = [];
  const seenNodeIds = new Set<string>();
  let total = 0;

  for (const clue of clues) {
    if (total >= ANCHOR_WORK_CEILING.globalLimit) break;
    snapshot.assertActive();

    const kind = classifyClue(clue);
    const matches: AnchorMatch[] = [];

    // Strategy 1: exact name lookup (covers explicit-symbol, qualified-name, type-name).
    if (kind === 'explicit-symbol' || kind === 'qualified-name' || kind === 'type-name') {
      const bareName = kind === 'qualified-name' ? clue.split('.').pop()! : clue;
      const candidates = graph.getNodesByName(bareName);
      for (const node of candidates) {
        if (matches.length >= ANCHOR_WORK_CEILING.perClueLimit) break;
        if (total >= ANCHOR_WORK_CEILING.globalLimit) break;
        matches.push({
          id: makeAnchorId(clue, node),
          nodeId: node.id,
          kind,
          clue,
          symbol: toSymbolIdentity(node),
          location: toSourceLocation(node),
          ambiguous: false, // filled in below
        });
        total += 1;
      }
    }

    // Strategy 2: file-path clue → look up `file` nodes by exact path.
    if (kind === 'file-path' && matches.length === 0) {
      const files = graph.getNodesByKind('file');
      for (const node of files) {
        if (matches.length >= ANCHOR_WORK_CEILING.perClueLimit) break;
        if (total >= ANCHOR_WORK_CEILING.globalLimit) break;
        if (node.filePath === clue || node.filePath.endsWith(`/${clue}`) || node.name === clue) {
          matches.push({
            id: makeAnchorId(clue, node),
            nodeId: node.id,
            kind,
            clue,
            location: toSourceLocation(node),
            ambiguous: false,
          });
          total += 1;
        }
      }
    }

    // Strategy 3: route clue → look up `route` nodes whose name contains the clue.
    if (kind === 'route' && matches.length === 0) {
      const routes = graph.getNodesByKind('route');
      for (const node of routes) {
        if (matches.length >= ANCHOR_WORK_CEILING.perClueLimit) break;
        if (total >= ANCHOR_WORK_CEILING.globalLimit) break;
        if (node.name.includes(clue)) {
          matches.push({
            id: makeAnchorId(clue, node),
            nodeId: node.id,
            kind,
            clue,
            location: toSourceLocation(node),
            ambiguous: false,
          });
          total += 1;
        }
      }
    }

    // Strategy 4: module clue → match `module` nodes by name suffix.
    if (kind === 'module' && matches.length === 0) {
      const modules = graph.getNodesByKind('module');
      for (const node of modules) {
        if (matches.length >= ANCHOR_WORK_CEILING.perClueLimit) break;
        if (total >= ANCHOR_WORK_CEILING.globalLimit) break;
        if (node.name === clue || node.name.endsWith(clue) || node.filePath.endsWith(clue)) {
          matches.push({
            id: makeAnchorId(clue, node),
            nodeId: node.id,
            kind,
            clue,
            location: toSourceLocation(node),
            ambiguous: false,
          });
          total += 1;
        }
      }
    }

    // Mark ambiguity and dedupe.
    const ambiguous = matches.length > 1;
    for (const m of matches) {
      m.ambiguous = ambiguous;
      seenNodeIds.add(m.nodeId);
    }

    if (matches.length === 0) {
      unmatchedClues.push(clue);
    } else {
      anchors.push({
        clue,
        kind,
        matches,
        truncated: matches.length >= ANCHOR_WORK_CEILING.perClueLimit,
      });
    }
  }

  return {
    anchors,
    uniqueAnchorCount: seenNodeIds.size,
    unmatchedClues,
  };
}
