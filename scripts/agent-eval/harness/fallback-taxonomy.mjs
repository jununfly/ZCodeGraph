// Fallback taxonomy: classify each Read/Grep/Glob call as codegraphReplaceable
// or justified, based on what CodeGraph tools can cover. Pure function — no I/O,
// no model calls. Input is the normalized toolCalls[] array from the adapter.

const CODEGRAPH_PREFIX = 'mcp__codegraph__';

/** Tools that CodeGraph exposes for structural queries. */
const STRUCTURAL_TOOLS = new Set([
  'mcp__codegraph__zcodegraph_explore',
  'mcp__codegraph__zcodegraph_search',
  'mcp__codegraph__zcodegraph_callers',
  'mcp__codegraph__zcodegraph_callees',
  'mcp__codegraph__zcodegraph_impact',
  'mcp__codegraph__zcodegraph_node',
]);

/** File extensions that typically contain code (Read on these is replaceable). */
const CODE_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.rb', '.php',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.scala', '.vue', '.svelte',
]);

/** File extensions that are never code (Read on these is justified). */
const NON_CODE_EXTENSIONS = new Set([
  '.md', '.txt', '.rst', '.json', '.yaml', '.yml', '.toml', '.cfg', '.ini',
  '.xml', '.html', '.css', '.svg', '.png', '.jpg', '.gif', '.lock',
]);

function extOf(filePath) {
  if (typeof filePath !== 'string') return '';
  const dot = filePath.lastIndexOf('.');
  return dot >= 0 ? filePath.slice(dot).toLowerCase() : '';
}

/**
 * Classify a single tool call.
 * Returns { classification, reason, codegraphAlternative } or null for
 * non-Read/Grep/Glob calls (which are not fallback candidates).
 */
export function classifyToolCall(call) {
  const name = call?.name;
  const args = call?.arguments ?? {};

  if (name === 'Glob') {
    // Glob locates files by pattern — CodeGraph explore/search can do this.
    return {
      classification: 'codegraphReplaceable',
      reason: 'Glob locates files; explore or search can locate the same files by symbol or content',
      codegraphAlternative: 'zcodegraph_explore',
    };
  }

  if (name === 'Grep') {
    const pattern = typeof args.pattern === 'string' ? args.pattern : '';
    // Heuristic: if the pattern looks like a symbol name (identifier chars only),
    // CodeGraph search/explore can find it. If it's a complex regex, it may be justified.
    const isSymbolLike = /^[A-Za-z_][A-Za-z0-9_]*$/.test(pattern.trim());
    if (isSymbolLike) {
      return {
        classification: 'codegraphReplaceable',
        reason: `Grep for symbol "${pattern}" — CodeGraph search/explore can locate this symbol`,
        codegraphAlternative: 'zcodegraph_search',
      };
    }
    // Complex regex or content search — may be justified if CodeGraph doesn't index it.
    return {
      classification: 'codegraphReplaceable',
      reason: `Grep for pattern "${pattern.slice(0, 60)}" — CodeGraph explore can search code content`,
      codegraphAlternative: 'zcodegraph_explore',
    };
  }

  if (name === 'Read') {
    const filePath = typeof args.file_path === 'string' ? args.file_path : '';
    const ext = extOf(filePath);

    if (NON_CODE_EXTENSIONS.has(ext)) {
      return {
        classification: 'justified',
        reason: `Read non-code file (${ext}) — CodeGraph does not index this file type`,
        codegraphAlternative: null,
      };
    }

    if (CODE_EXTENSIONS.has(ext) || !ext) {
      // Reading a code file — CodeGraph explore/node can return the same source.
      return {
        classification: 'codegraphReplaceable',
        reason: `Read code file ${filePath.split('/').pop() ?? filePath} — explore/node can return this source`,
        codegraphAlternative: 'zcodegraph_node',
      };
    }

    // Unknown extension — conservative: mark as justified.
    return {
      classification: 'justified',
      reason: `Read file with unrecognized extension (${ext}) — cannot confirm CodeGraph coverage`,
      codegraphAlternative: null,
    };
  }

  // Not a Read/Grep/Glob call — not a fallback candidate.
  return null;
}

/**
 * Analyze a full toolCalls[] array and produce the fallback taxonomy.
 *
 * Returns {
 *   readGrepFallbackDisplacement: { read, grep, glob, notes },
 *   fallbackTaxonomy: { replaceable, justified, details[] },
 * }
 *
 * readGrepFallbackDisplacement counts only codegraphReplaceable calls —
 * these are the ones CodeGraph could have displaced. justified calls are
 * not counted as displacement.
 */
export function analyzeFallback(toolCalls) {
  if (!Array.isArray(toolCalls)) {
    return {
      readGrepFallbackDisplacement: null,
      fallbackTaxonomy: null,
    };
  }

  const details = [];
  let readReplaceable = 0;
  let grepReplaceable = 0;
  let globReplaceable = 0;
  let readJustified = 0;
  let grepJustified = 0;
  let globJustified = 0;

  for (let i = 0; i < toolCalls.length; i++) {
    const call = toolCalls[i];
    const result = classifyToolCall(call);
    if (!result) continue; // CodeGraph or other tool — skip.

    const entry = {
      index: i,
      tool: call.name,
      classification: result.classification,
      reason: result.reason,
      codegraphAlternative: result.codegraphAlternative,
    };
    details.push(entry);

    if (result.classification === 'codegraphReplaceable') {
      if (call.name === 'Read') readReplaceable++;
      else if (call.name === 'Grep') grepReplaceable++;
      else if (call.name === 'Glob') globReplaceable++;
    } else {
      if (call.name === 'Read') readJustified++;
      else if (call.name === 'Grep') grepJustified++;
      else if (call.name === 'Glob') globJustified++;
    }
  }

  const totalReplaceable = readReplaceable + grepReplaceable + globReplaceable;
  const totalJustified = readJustified + grepJustified + globJustified;

  return {
    readGrepFallbackDisplacement: {
      read: readReplaceable,
      grep: grepReplaceable,
      glob: globReplaceable,
      notes: `${totalReplaceable} codegraph-replaceable, ${totalJustified} justified out of ${totalReplaceable + totalJustified} Read/Grep/Glob calls`,
    },
    fallbackTaxonomy: {
      replaceable: { read: readReplaceable, grep: grepReplaceable, glob: globReplaceable },
      justified: { read: readJustified, grep: grepJustified, glob: globJustified },
      details,
    },
  };
}
