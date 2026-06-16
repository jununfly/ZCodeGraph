#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error('Usage: node scripts/summarize-dhat.mjs <dhat-heap.json> [--out <dhat-summary.html>]');
}

function parseArgs(argv) {
  const args = { input: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--out') {
      args.out = argv[++i] ?? null;
      continue;
    }
    if (!args.input) {
      args.input = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.input) throw new Error('Missing dhat heap JSON path');
  return args;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function frameText(report, frameIndex) {
  if (frameIndex == null) return 'unknown';
  if (Array.isArray(report.ftbl)) return report.ftbl[frameIndex] ?? `frame ${frameIndex}`;
  if (Array.isArray(report.frames)) return report.frames[frameIndex] ?? `frame ${frameIndex}`;
  return `frame ${frameIndex}`;
}

function allocationRows(report) {
  if (!Array.isArray(report.pps)) return [];
  return report.pps.map((pp, index) => {
    const totalBytes = Number(pp.tb ?? pp.totalBytes ?? pp.total_bytes ?? 0);
    const peakBytes = Number(pp.mb ?? pp.maxBytes ?? pp.max_bytes ?? 0);
    const frames = Array.isArray(pp.fs) ? pp.fs.map((frame) => frameText(report, frame)) : [];
    const callSite = frames[0] ?? pp.name ?? `program point ${index}`;
    return { totalBytes, peakBytes, callSite, frames };
  });
}

function groupByCallSite(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.callSite) ?? { callSite: row.callSite, totalBytes: 0, peakBytes: 0, count: 0 };
    current.totalBytes += row.totalBytes;
    current.peakBytes = Math.max(current.peakBytes, row.peakBytes);
    current.count += 1;
    grouped.set(row.callSite, current);
  }
  return Array.from(grouped.values());
}

function table(rows, columns) {
  const body = rows.length === 0
    ? `<tr><td colspan="${columns.length}">No allocation rows found</td></tr>`
    : rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.render(row))}</td>`).join('')}</tr>`).join('\n');
  return [
    '<table>',
    `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>`,
    `<tbody>${body}</tbody>`,
    '</table>',
  ].join('\n');
}

function renderHtml(report, inputPath) {
  const rows = allocationRows(report);
  const totalBytes = Number(report.totalBytes ?? report.total_bytes ?? rows.reduce((sum, row) => sum + row.totalBytes, 0));
  const peakBytes = Number(report.maxBytes ?? report.max_bytes ?? report.peakBytes ?? rows.reduce((max, row) => Math.max(max, row.peakBytes), 0));
  const bySize = [...rows].sort((a, b) => b.totalBytes - a.totalBytes).slice(0, 20);
  const byCallSite = groupByCallSite(rows).sort((a, b) => b.totalBytes - a.totalBytes).slice(0, 20);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>dhat heap summary</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #17202a; background: #f8fafc; }
    main { max-width: 1120px; margin: 0 auto; }
    section { margin: 24px 0; }
    table { border-collapse: collapse; width: 100%; background: white; }
    th, td { border: 1px solid #d7dde5; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #edf2f7; }
    code { background: #edf2f7; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
<main>
  <h1>dhat heap summary</h1>
  <p>Source: <code>${escapeHtml(inputPath)}</code></p>
  <section>
    <h2>Total allocations</h2>
    <p>${escapeHtml(formatBytes(totalBytes))}</p>
  </section>
  <section>
    <h2>Peak heap</h2>
    <p>${escapeHtml(formatBytes(peakBytes))}</p>
  </section>
  <section>
    <h2>Top 20 allocations by size</h2>
    ${table(bySize, [
      { label: 'Total bytes', render: (row) => formatBytes(row.totalBytes) },
      { label: 'Peak bytes', render: (row) => formatBytes(row.peakBytes) },
      { label: 'Call site', render: (row) => row.callSite },
      { label: 'Frames', render: (row) => row.frames.join('\n') },
    ])}
  </section>
  <section>
    <h2>Top 20 allocations by call site</h2>
    ${table(byCallSite, [
      { label: 'Total bytes', render: (row) => formatBytes(row.totalBytes) },
      { label: 'Peak bytes', render: (row) => formatBytes(row.peakBytes) },
      { label: 'Program points', render: (row) => row.count },
      { label: 'Call site', render: (row) => row.callSite },
    ])}
  </section>
</main>
</body>
</html>
`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const input = path.resolve(args.input);
  const out = path.resolve(args.out ?? path.join(path.dirname(input), 'dhat-summary.html'));
  const report = JSON.parse(fs.readFileSync(input, 'utf-8'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderHtml(report, input));
  console.log(out);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
