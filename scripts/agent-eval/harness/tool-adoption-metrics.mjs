// Tool adoption metrics: extract CodeGraph usage patterns from normalized
// toolCalls[]. Pure function — no I/O, no model calls.

const CODEGRAPH_PREFIX = 'mcp__codegraph__';

/** CodeGraph tools that represent structural query paths (not just file listing). */
const STRUCTURAL_TOOLS = new Set([
  'mcp__codegraph__zcodegraph_explore',
  'mcp__codegraph__zcodegraph_callers',
  'mcp__codegraph__zcodegraph_callees',
  'mcp__codegraph__zcodegraph_impact',
]);

/**
 * Compute tool adoption metrics from a normalized toolCalls[] array.
 *
 * Returns {
 *   graphStats: {
 *     firstCodeGraphCallIndex,   // 0-based index of first CodeGraph call, or -1
 *     codeGraphCallCount,        // total CodeGraph calls
 *     totalToolCallCount,        // total non-CodeGraph + CodeGraph calls
 *     codeGraphCallRatio,        // codeGraphCallCount / totalToolCallCount (0-1)
 *     exploreUsageRate,          // explore calls / codeGraphCallCount (0-1)
 *     structuralPathCoverage,    // true if any structural tool was called
 *     codeGraphToolSequence,     // ordered list of CodeGraph tool names called
 *     nonCodeGraphCalls,         // count of Read/Grep/Glob/other calls
 *   }
 * }
 */
export function analyzeToolAdoption(toolCalls) {
  if (!Array.isArray(toolCalls)) return { graphStats: null };

  const codeGraphCalls = [];
  const nonCodeGraphCalls = [];
  let firstCodeGraphCallIndex = -1;

  for (let i = 0; i < toolCalls.length; i++) {
    const call = toolCalls[i];
    const name = call?.name ?? '';
    if (name.startsWith(CODEGRAPH_PREFIX)) {
      codeGraphCalls.push({ index: i, name, arguments: call.arguments });
      if (firstCodeGraphCallIndex === -1) firstCodeGraphCallIndex = i;
    } else {
      nonCodeGraphCalls.push({ index: i, name });
    }
  }

  const totalToolCallCount = toolCalls.length;
  const codeGraphCallCount = codeGraphCalls.length;
  const exploreCalls = codeGraphCalls.filter(
    c => c.name === 'mcp__codegraph__zcodegraph_explore',
  ).length;
  const structuralPathCoverage = codeGraphCalls.some(
    c => STRUCTURAL_TOOLS.has(c.name),
  );

  return {
    graphStats: {
      firstCodeGraphCallIndex,
      codeGraphCallCount,
      totalToolCallCount,
      codeGraphCallRatio: totalToolCallCount > 0
        ? codeGraphCallCount / totalToolCallCount
        : 0,
      exploreUsageRate: codeGraphCallCount > 0
        ? exploreCalls / codeGraphCallCount
        : 0,
      structuralPathCoverage,
      codeGraphToolSequence: codeGraphCalls.map(c => c.name),
      nonCodeGraphCalls: nonCodeGraphCalls.length,
    },
  };
}
