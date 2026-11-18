/**
 * Blast-radius Markdown renderer per DES-cli-p1-modularity-and-explore-v1
 * §Shared blast-radius Module.
 *
 * The renderer is a pure function of `ExploreBlastRadius` data; it does no
 * graph, filesystem, environment, or process work.
 */

import type { ExploreBlastRadius } from './blast-radius';

const FILE_CAP = 4;

/**
 * Render the Markdown section. Returns '' when there are no entries, so the
 * caller can splice the result into the answer without an extra blank line.
 *
 * Preserves the legacy heading, blank lines, trailing newline, `+N more`,
 * singular/plural, and "no covering tests" warning exactly.
 */
export function renderExploreBlastRadius(result: ExploreBlastRadius): string {
  if (result.entries.length === 0) return '';
  const rel = (p: string) => p.replace(/\\/g, '/');

  const lines: string[] = [];
  for (const entry of result.entries) {
    const shown = entry.callerFiles.slice(0, FILE_CAP).map((f) => `\`${f}\``).join(', ');
    const more = entry.callerFiles.length > FILE_CAP
      ? ` +${entry.callerFiles.length - FILE_CAP} more`
      : '';
    const where = entry.callerFiles.length > 0 ? ` in ${shown}${more}` : '';
    const tests = entry.testFiles.length > 0
      ? `; tests: ${entry.testFiles.slice(0, FILE_CAP).map((f) => `\`${f}\``).join(', ')}${entry.testFiles.length > FILE_CAP ? ` +${entry.testFiles.length - FILE_CAP}` : ''}`
      : '; ⚠️ no covering tests found';

    const node = entry.entryNode;
    lines.push(
      `- \`${node.name}\` (${rel(node.filePath)}:${node.startLine}) — ${entry.callerCount} caller${entry.callerCount === 1 ? '' : 's'}${where}${tests}`,
    );
  }
  if (lines.length === 0) return '';

  return [
    '### Blast radius — what depends on these (update/verify before editing)',
    '',
    ...lines,
    '',
  ].join('\n');
}
