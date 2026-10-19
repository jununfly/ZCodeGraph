/**
 * Visualize HTML renderer
 *
 * Reads the HTML template + cytoscape.min.js bundled into `dist/visualize/`
 * (see `copy-assets` in package.json), injects the snapshot IR JSON into the
 * `__ZCODEGRAPH_DATA__` placeholder, and writes a single self-contained HTML
 * file. No external CDN, no runtime dependencies beyond what's in dist/.
 */

import * as fs from 'fs';
import * as path from 'path';
import { VisualizeSnapshot } from './snapshot';

/**
 * Locate `dist/visualize/` (or `src/visualize/` when running from source).
 * The `copy-assets` script ships `cytoscape.min.js` and `template.html` into
 * `dist/visualize/`; `render.ts` is compiled into `dist/visualize/render.js`,
 * so `__dirname` is already the right directory. The `src` fallback covers
 * ts-node-style invocations in tests.
 */
function assetsDir(): string {
  const here = __dirname;
  const candidates = [
    here, // dist/visualize/ (compiled) or src/visualize/ (ts-node)
    path.join(here, '..', '..', 'dist', 'visualize'), // src/visualize -> dist/visualize
    path.join(here, 'visualize'), // dist/ layout when bundled differently
  ];
  for (const dir of candidates) {
    if (
      fs.existsSync(path.join(dir, 'template.html')) &&
      fs.existsSync(path.join(dir, 'cytoscape.min.js'))
    ) {
      return dir;
    }
  }
  throw new Error(
    `Could not locate visualize assets (template.html + cytoscape.min.js). Searched: ${candidates.join(', ')}. ` +
      'Run `npm run build` to copy assets into dist/.',
  );
}

export interface RenderOptions {
  /** Absolute path of the HTML file to write. */
  outPath: string;
}

/**
 * Render a snapshot to a self-contained HTML file.
 *
 * Returns the path written.
 */
export function renderSnapshotToHtml(
  snapshot: VisualizeSnapshot,
  options: RenderOptions,
): string {
  const dir = assetsDir();
  const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf-8');
  const cytoscapeSrc = fs.readFileSync(path.join(dir, 'cytoscape.min.js'), 'utf-8');

  // Serialize the snapshot. We replace `</script>` defensively so an
  // attacker-controlled file path containing the literal string cannot
  // break out of the inline <script> block.
  const dataJson = JSON.stringify(snapshot).replace(/<\/script>/gi, '<\\/script>');

  // Inject cytoscape source. Same escape applies in reverse: cytoscape is a
  // known-trusted input, but the placeholder lives inside a JS block comment
  // so we don't need to escape; we replace the comment token entirely.
  let html = template.replace(
    /\/\* __CYTOSCAPE_SRC__ \*\//,
    () => cytoscapeSrc,
  );

  // Replace the data placeholder. The template writes `var DATA = /* __ZCODEGRAPH_DATA__ */ null;`
  // — we substitute the entire `/* __ZCODEGRAPH_DATA__ */ null` expression with the real JSON.
  html = html.replace(
    /\/\* __ZCODEGRAPH_DATA__ \*\/ null/,
    () => dataJson,
  );

  // Sanity: refuse to ship an HTML with placeholders still in it.
  if (html.includes('__CYTOSCAPE_SRC__') || html.includes('__ZCODEGRAPH_DATA__')) {
    throw new Error('Failed to substitute placeholders in visualize template.');
  }

  fs.mkdirSync(path.dirname(options.outPath), { recursive: true });
  fs.writeFileSync(options.outPath, html, 'utf-8');
  return options.outPath;
}
