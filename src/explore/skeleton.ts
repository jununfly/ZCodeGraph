import type { AnchorSet } from './anchors';
import type { EvidenceGap } from './ledger';
import type { TracePath } from './obligations';

/**
 * Pure, deterministic prefix for typed traces, retained ambiguity and
 * residuals. It contains no source bytes and is paid before source atoms.
 */
export function renderCompactExploreSkeleton(input: {
  traces: readonly TracePath[];
  anchors: readonly AnchorSet[];
  gaps: readonly EvidenceGap[];
}): string {
  const lines: string[] = [];
  const traces = [...input.traces].sort((a, b) => a.id.localeCompare(b.id)
    || a.status.localeCompare(b.status)
    || JSON.stringify(a.steps).localeCompare(JSON.stringify(b.steps)));
  for (const trace of traces) {
    // A trace is an ordered path, not a set. Canonicalize path boundaries
    // during composition; sorting its relation IDs would fabricate order.
    lines.push(
      `trace=${trace.id} status=${trace.status}`,
      ...trace.steps.map((step) => `  relation=${step.relationId} semantics=${step.semantics}`),
    );
  }
  const anchors = [...input.anchors].sort((a, b) => a.clue.localeCompare(b.clue)
    || JSON.stringify(a).localeCompare(JSON.stringify(b)));
  for (const set of anchors) {
    const ambiguous = set.matches.filter((match) => match.ambiguous);
    if (ambiguous.length === 0) continue;
    const candidates = ambiguous.map((match) => match.id).sort().join(',');
    lines.push(`ambiguity=${JSON.stringify(set.clue)} may-match=${candidates}`);
  }
  const gaps = [...input.gaps].sort((a, b) => a.id.localeCompare(b.id)
    || a.reason.localeCompare(b.reason) || a.detail.localeCompare(b.detail)
    || (a.location ?? '').localeCompare(b.location ?? ''));
  for (const gap of gaps) {
    lines.push(`gap=${gap.id} reason=${gap.reason} detail=${gap.detail}`);
  }
  return lines.length === 0 ? '' : `### Trace and residuals\n${lines.join('\n')}\n`;
}
