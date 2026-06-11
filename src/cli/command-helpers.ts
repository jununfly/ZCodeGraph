/**
 * CLI Command Helpers
 *
 * Pure functions extracted from src/bin/zcodegraph.ts that commands
 * use for pre-checks, path resolution, and formatting. These are
 * testable without any process-level IO.
 */

import * as path from 'path';
import * as fs from 'fs';

// ─── Path resolution ────────────────────────────────────────────────────────

/**
 * Resolve a user-supplied path argument to an absolute project path.
 * Defaults to cwd if no path provided.
 */
export function resolveProjectPath(pathArg: string | undefined, cwd: string): string {
  if (pathArg) {
    return path.isAbsolute(pathArg) ? pathArg : path.resolve(cwd, pathArg);
  }
  return path.resolve(cwd);
}

// ─── Initialization checks ──────────────────────────────────────────────────

/**
 * Check whether a project directory is initialized (has .zcodegraph/zcodegraph.db).
 */
export function isProjectInitialized(projectPath: string): boolean {
  try {
    const dotDir = path.join(projectPath, '.zcodegraph');
    const dbPath = path.join(dotDir, 'zcodegraph.db');
    return fs.existsSync(dotDir) && fs.statSync(dotDir).isDirectory() && fs.existsSync(dbPath);
  } catch {
    return false;
  }
}

/**
 * Result of a pre-check. Either ok with the resolved path, or an error.
 */
export type CheckResult =
  | { ok: true; path: string }
  | { ok: false; message: string; hint?: string };

/**
 * Require that a project is initialized. Returns the resolved path
 * or a structured error — never calls process.exit().
 */
export function requireInitialized(pathArg: string | undefined, cwd: string): CheckResult {
  const projectPath = resolveProjectPath(pathArg, cwd);
  if (!isProjectInitialized(projectPath)) {
    return {
      ok: false,
      message: `CodeGraph not initialized in ${projectPath}`,
      hint: 'Run "zcodegraph init" first',
    };
  }
  return { ok: true, path: projectPath };
}

/**
 * Require that a project is NOT initialized (for init command).
 */
export function requireNotInitialized(pathArg: string | undefined, cwd: string): CheckResult {
  const projectPath = resolveProjectPath(pathArg, cwd);
  if (isProjectInitialized(projectPath)) {
    return {
      ok: false,
      message: `CodeGraph already initialized in ${projectPath}`,
      hint: 'Run "zcodegraph uninit" first to remove',
    };
  }
  return { ok: true, path: projectPath };
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

/**
 * Format a number with locale-aware grouping (e.g., 1234567 → "1,234,567").
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * e.g., 1234 → "1.23s", 45678 → "45.68s", 60000 → "1m 0s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Truncate a string to maxLen, adding "..." if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Format file size in human-readable form.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
