import type { ExploreResult } from './answer';
import { utf8ByteLength, type Utf8Budget } from './budget-utf8';
import { verifyExploreTransport } from './delivery';

/** The only application-result-to-text policy used by CLI and MCP. */
export function exploreResultText(result: ExploreResult): string {
  return result.kind === 'answer' ? result.markdown : result.text;
}

/** CLI owns only its one optional output newline, not answer formatting. */
export function cliExploreOutput(result: ExploreResult): string {
  return `${exploreResultText(result)}\n`;
}

/** Internal reports are intentionally not copied to ToolResult/metadata. */
export function mcpExploreContent(result: ExploreResult): Array<{ type: 'text'; text: string }> {
  return [{ type: 'text', text: exploreResultText(result) }];
}

export function composeExploreTransport(
  result: ExploreResult,
  notices: readonly string[],
  budget?: Utf8Budget,
): string {
  const prefix = notices.length === 0 ? '' : `${notices.join('\n\n')}\n\n`;
  const text = exploreResultText(result);
  if (budget && !verifyExploreTransport(budget, notices, result)) {
    throw new Error(`budget-exhausted: transport composed bytes exceed ${budget.maxOutputUtf8Bytes}`);
  }
  return prefix + text;
}

export function composedExploreUtf8Bytes(result: ExploreResult, notices: readonly string[]): number {
  return utf8ByteLength(composeExploreTransport(result, notices));
}
