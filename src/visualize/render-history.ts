/**
 * Visualize history HTML renderer (1-3-6 P1-4)
 *
 * Reads `history-template.html` + `cytoscape.min.js` from `dist/visualize/`
 * (or `src/visualize/` in ts-node tests) and embeds the
 * `VisualizeHistorySnapshot` IR into the page. Same placeholder-substitution
 * approach as `render.ts` so the asset pipeline stays symmetric.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { VisualizeHistorySnapshot } from './history-snapshot';

function assetsDir(): string {
  const here = __dirname;
  const candidates = [
    here,
    path.join(here, '..', '..', 'dist', 'visualize'),
    path.join(here, 'visualize'),
  ];
  for (const dir of candidates) {
    if (
      fs.existsSync(path.join(dir, 'history-template.html')) &&
      fs.existsSync(path.join(dir, 'cytoscape.min.js'))
    ) {
      return dir;
    }
  }
  throw new Error(
    `Could not locate visualize history assets (history-template.html + cytoscape.min.js). ` +
      `Searched: ${candidates.join(', ')}. Run \`npm run build\` to copy assets into dist/.`,
  );
}

export interface RenderHistoryOptions {
  outPath: string;
}

export function renderHistoryToHtml(
  snapshot: VisualizeHistorySnapshot,
  options: RenderHistoryOptions,
): string {
  const dir = assetsDir();
  const template = fs.readFileSync(path.join(dir, 'history-template.html'), 'utf-8');
  const cytoscapeSrc = fs.readFileSync(path.join(dir, 'cytoscape.min.js'), 'utf-8');

  // Defensive: a file path containing `</script>` could otherwise break out
  // of the inline block.
  const dataJson = JSON.stringify(snapshot).replace(/<\/script>/gi, '<\\/script>');

  let html = template.replace(/\/\* __CYTOSCAPE_SRC__ \*\//, () => cytoscapeSrc);
  html = html.replace(/\/\* __ZCODEGRAPH_HISTORY_DATA__ \*\/ null/, () => dataJson);

  if (html.includes('__CYTOSCAPE_SRC__') || html.includes('__ZCODEGRAPH_HISTORY_DATA__')) {
    throw new Error('Failed to substitute placeholders in visualize history template.');
  }

  fs.mkdirSync(path.dirname(options.outPath), { recursive: true });
  fs.writeFileSync(options.outPath, html, 'utf-8');
  return options.outPath;
}
