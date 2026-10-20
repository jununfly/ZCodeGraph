/**
 * Churn renderers
 *
 * Three output forms:
 *   - text  — human-readable top-N table (default terminal output)
 *   - json  — handled by caller via `JSON.stringify(report)` (no helper here)
 *   - html  — self-contained single-file HTML with an inline canvas heatmap.
 *             No Cytoscape (churn is a list, not a graph), no external CDN.
 */

import { ChurnReport } from './aggregate';

export function renderChurnText(report: ChurnReport, topN: number = 20): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(`Churn report — ${report.repoRoot}`);
  const window: string[] = [];
  if (report.since) window.push(`since=${report.since}`);
  if (report.until) window.push(`until=${report.until}`);
  lines.push(
    `  ${report.totalCommits} commits · ${report.summary.totalFiles} files · ` +
      `+${report.summary.totalAdds} / -${report.summary.totalDels}` +
      (window.length ? `  (${window.join(' ')})` : ''),
  );
  lines.push('');

  const files = report.files.slice(0, topN);
  if (files.length === 0) {
    lines.push('  (no file changes in window)');
    return lines.join('\n');
  }

  const pathWidth = Math.min(
    Math.max(...files.map((f) => f.path.length), 'path'.length),
    80,
  );
  const header =
    '  ' +
    'path'.padEnd(pathWidth) +
    '  ' +
    'commits'.padStart(7) +
    '  ' +
    'adds'.padStart(8) +
    '  ' +
    'dels'.padStart(8) +
    '  ' +
    'churn'.padStart(8) +
    '  ' +
    'authors'.padStart(7) +
    '  ' +
    'last'.padStart(10);
  lines.push(header);
  lines.push('  ' + '-'.repeat(header.length - 2));

  for (const f of files) {
    const displayPath =
      f.path.length > pathWidth ? '…' + f.path.slice(-(pathWidth - 1)) : f.path;
    lines.push(
      '  ' +
        displayPath.padEnd(pathWidth) +
        '  ' +
        String(f.commits).padStart(7) +
        '  ' +
        String(f.adds).padStart(8) +
        '  ' +
        String(f.dels).padStart(8) +
        '  ' +
        String(f.totalChurn).padStart(8) +
        '  ' +
        String(f.authors.length).padStart(7) +
        '  ' +
        f.lastTouched.padStart(10),
    );
  }
  if (report.files.length > topN) {
    lines.push(`  … ${report.files.length - topN} more files`);
  }
  lines.push('');
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Produce a self-contained HTML heatmap. Rows are the top-N hottest files;
 * two bar channels (commits, churn) are normalized independently to [0, 1].
 * Colors follow Chinese stock convention (red = high/hot, green = low/cold).
 */
export function renderChurnHtml(report: ChurnReport, topN: number = 50): string {
  const files = report.files.slice(0, topN);
  const maxCommits = Math.max(1, ...files.map((f) => f.commits));
  const maxChurn = Math.max(1, ...files.map((f) => f.totalChurn));

  // Interpolate green -> yellow -> red.
  function heat(t: number): string {
    const x = Math.max(0, Math.min(1, t));
    if (x < 0.5) {
      const k = x / 0.5;
      // #2da44e (green) -> #e3b008 (yellow)
      return `rgb(${Math.round(0x2d + (0xe3 - 0x2d) * k)},${Math.round(
        0xa4 + (0xb0 - 0xa4) * k,
      )},${Math.round(0x4e + (0x08 - 0x4e) * k)})`;
    }
    const k = (x - 0.5) / 0.5;
    // #e3b008 (yellow) -> #cf222e (red)
    return `rgb(${Math.round(0xe3 + (0xcf - 0xe3) * k)},${Math.round(
      0xb0 + (0x22 - 0xb0) * k,
    )},${Math.round(0x08 + (0x2e - 0x08) * k)})`;
  }

  const rowsHtml = files
    .map((f) => {
      const commitsT = f.commits / maxCommits;
      const churnT = f.totalChurn / maxChurn;
      const pctCommits = (commitsT * 100).toFixed(1);
      const pctChurn = (churnT * 100).toFixed(1);
      return (
        `<tr>` +
        `<td class="path" title="${escapeHtml(f.path)}">${escapeHtml(f.path)}</td>` +
        `<td class="num">${f.commits}</td>` +
        `<td class="num">${f.adds}</td>` +
        `<td class="num">${f.dels}</td>` +
        `<td class="num">${f.totalChurn}</td>` +
        `<td class="num">${f.authors.length}</td>` +
        `<td class="num">${escapeHtml(f.lastTouched)}</td>` +
        `<td class="bar"><div class="bar-track"><div class="bar-fill" style="width:${pctCommits}%;background:${heat(
          commitsT,
        )}"></div></div></td>` +
        `<td class="bar"><div class="bar-track"><div class="bar-fill" style="width:${pctChurn}%;background:${heat(
          churnT,
        )}"></div></div></td>` +
        `</tr>`
      );
    })
    .join('\n');

  const windowLabel = [
    report.since ? `since=${escapeHtml(report.since)}` : null,
    report.until ? `until=${escapeHtml(report.until)}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>ZCodeGraph churn — ${escapeHtml(report.repoRoot)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
         margin: 24px; background: #ffffff; color: #1f2328; }
  h1 { font-size: 18px; margin: 0 0 4px 0; }
  .meta { color: #57606a; font-size: 12px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #eaeef2; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 480px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.bar { width: 120px; }
  .bar-track { background: #eaeef2; height: 8px; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; }
  .legend { margin: 12px 0; font-size: 12px; color: #57606a; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px;
            vertical-align: middle; margin: 0 4px; }
</style>
</head>
<body>
  <h1>ZCodeGraph churn — top ${files.length} files</h1>
  <div class="meta">
    repo: <code>${escapeHtml(report.repoRoot)}</code> ·
    generated: ${escapeHtml(report.generatedAt)} ·
    commits: ${report.totalCommits} ·
    files: ${report.summary.totalFiles} ·
    +${report.summary.totalAdds} / -${report.summary.totalDels}
    ${windowLabel ? ' · ' + windowLabel : ''}
  </div>
  <div class="legend">
    Heat (Chinese convention):
    <span class="swatch" style="background:rgb(45,164,78)"></span>cold
    <span class="swatch" style="background:rgb(227,176,8)"></span>warm
    <span class="swatch" style="background:rgb(207,34,46)"></span>hot
  </div>
  <table>
    <thead>
      <tr>
        <th>path</th>
        <th style="text-align:right">commits</th>
        <th style="text-align:right">adds</th>
        <th style="text-align:right">dels</th>
        <th style="text-align:right">churn</th>
        <th style="text-align:right">authors</th>
        <th style="text-align:right">last</th>
        <th>commits heat</th>
        <th>churn heat</th>
      </tr>
    </thead>
    <tbody>
${rowsHtml}
    </tbody>
  </table>
</body>
</html>
`;
}
