/**
 * Project-level configuration (zcodegraph.json)
 *
 * Single-file config living at the project root. Schema is deliberately
 * minimal in v1 — only `exclude` is honored. More fields (language
 * overrides, max file size, etc.) are left for later roadmap nodes.
 *
 * Loading is fault-tolerant: any read / parse error silently falls back to
 * an empty config so `zcodegraph index` never gains a new failure mode
 * because of a malformed optional file.
 */

import * as fs from 'fs';
import * as path from 'path';

export const PROJECT_CONFIG_FILENAME = 'zcodegraph.json';

export interface ProjectConfig {
  /**
   * Gitignore-style globs to exclude from indexing, e.g.
   * `["research/**", "scratch/*.ts"]`. Patterns follow the same syntax as
   * `.gitignore` and are appended after the built-in defaults so user
   * `!negation` entries in `.gitignore` can still re-include specific paths.
   */
  exclude?: string[];
}

/**
 * Read `<projectRoot>/zcodegraph.json` if present. Returns an empty object
 * on any failure (missing file, invalid JSON, non-object root).
 *
 * Exported separately from `buildDefaultIgnore` so status/doctor can read
 * config without instantiating an Ignore matcher.
 */
export function loadProjectConfig(projectRoot: string): ProjectConfig {
  try {
    const configPath = path.join(projectRoot, PROJECT_CONFIG_FILENAME);
    if (!fs.existsSync(configPath)) return {};
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const cfg: ProjectConfig = {};
    if (Array.isArray(parsed.exclude)) {
      cfg.exclude = parsed.exclude.filter(
        (e: unknown): e is string => typeof e === 'string' && e.length > 0,
      );
    }
    return cfg;
  } catch {
    return {};
  }
}
