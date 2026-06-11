/**
 * CLI Command Implementations
 *
 * Each command is a pure async function that takes typed arguments
 * and a CommandContext, and returns a CommandResult. No process.exit(),
 * no console.log() — all side effects go through the injected context.
 *
 * These are the "command behavior" layer from Candidate 5.
 * The Commander action shell (in zcodegraph.ts) wires context to real IO.
 */

import type { CommandResult, CommandFn, CommandError } from './command-context';
import {
  requireInitialized,
  requireNotInitialized,
  formatNumber,
  formatDuration,
} from './command-helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a CheckResult into a CommandResult with error output.
 */
function failCheck(result: { ok: false; message: string; hint?: string }): CommandResult {
  const errors: CommandError[] = [
    { message: result.message, severity: 'error', code: 'pre_check' },
  ];
  if (result.hint) {
    errors.push({ message: result.hint, severity: 'info', code: 'hint' });
  }
  return { exitCode: 1, errors };
}

/**
 * Wrap an async operation, catching errors into a CommandResult.
 */
async function catchErrors(fn: () => Promise<CommandResult>): Promise<CommandResult> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 1,
      errors: [{ message, severity: 'error', code: 'command_error' }],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// init command
// ═══════════════════════════════════════════════════════════════════════════════

export interface InitArgs {
  path?: string;
  force?: boolean;
  quiet?: boolean;
}

/**
 * Initialize CodeGraph in a project directory.
 */
export const runInit: CommandFn<InitArgs> = async (args, ctx) => {
  return catchErrors(async () => {
    // Pre-check: not already initialized
    const check = requireNotInitialized(args.path, ctx.cwd);
    if (!check.ok) return failCheck(check);

    const projectPath = check.path;

    // Dynamic import of CodeGraph core (lazy-loaded to avoid startup cost)
    const { default: CodeGraph } = await import('../index');
    const cg = await CodeGraph.init(projectPath, {});

    if (!args.quiet) {
      ctx.log(`Initialized CodeGraph in ${projectPath}`);
    }

    cg.destroy();
    return { exitCode: 0 };
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// uninit command
// ═══════════════════════════════════════════════════════════════════════════════

export interface UninitArgs {
  path?: string;
  quiet?: boolean;
}

/**
 * Remove CodeGraph from a project directory.
 */
export const runUninit: CommandFn<UninitArgs> = async (args, ctx) => {
  return catchErrors(async () => {
    const check = requireInitialized(args.path, ctx.cwd);
    if (!check.ok) return failCheck(check);

    const projectPath = check.path;
    const { default: CodeGraph } = await import('../index');
    const cg = await CodeGraph.open(projectPath);
    await cg.destroy(); // cleans up .zcodegraph/

    // Remove .zcodegraph directory
    const fs = await import('fs/promises');
    const path = await import('path');
    await fs.rm(path.join(projectPath, '.zcodegraph'), { recursive: true, force: true });

    if (!args.quiet) {
      ctx.log(`Removed CodeGraph from ${projectPath}`);
    }

    return { exitCode: 0 };
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// index command
// ═══════════════════════════════════════════════════════════════════════════════

export interface IndexArgs {
  path?: string;
  force?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

/**
 * Index a project's source files.
 */
export const runIndex: CommandFn<IndexArgs> = async (args, ctx) => {
  return catchErrors(async () => {
    const check = requireInitialized(args.path, ctx.cwd);
    if (!check.ok) return failCheck(check);

    const projectPath = check.path;
    const { default: CodeGraph } = await import('../index');
    const cg = await CodeGraph.open(projectPath);

    const result = await cg.indexAll();

    if (!result.success) {
      cg.destroy();
      return {
        exitCode: 1,
        errors: [
          { message: 'Indexing completed with errors', severity: 'error', code: 'index_failed' },
        ],
      };
    }

    if (!args.quiet) {
      const lines: string[] = [];
      lines.push(`Indexed ${formatNumber(result.filesIndexed)} files`);
      lines.push(`  ${formatNumber(result.nodesCreated)} nodes, ${formatNumber(result.edgesCreated)} edges`);
      if (result.filesSkipped > 0) lines.push(`  ${formatNumber(result.filesSkipped)} files skipped`);
      if (result.filesErrored > 0) lines.push(`  ${formatNumber(result.filesErrored)} files with errors`);
      lines.push(`  Duration: ${formatDuration(result.durationMs)}`);
      ctx.log(lines.join('\n'));
    }

    cg.destroy();
    return { exitCode: 0 };
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// status command
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatusArgs {
  path?: string;
  json?: boolean;
}

/**
 * Show project indexing status.
 */
export const runStatus: CommandFn<StatusArgs> = async (args, ctx) => {
  return catchErrors(async () => {
    const check = requireInitialized(args.path, ctx.cwd);
    if (!check.ok) return failCheck(check);

    const projectPath = check.path;
    const { default: CodeGraph } = await import('../index');
    const cg = await CodeGraph.open(projectPath);
    const status = cg.getStats();

    cg.destroy();

    if (args.json) {
      return {
        exitCode: 0,
        output: { json: status },
      };
    }

    const lines: string[] = [];
    lines.push(`Project: ${projectPath}`);
    lines.push(`Files indexed: ${formatNumber(status.fileCount ?? 0)}`);
    lines.push(`Total nodes: ${formatNumber(status.nodeCount ?? 0)}`);
    lines.push(`Total edges: ${formatNumber(status.edgeCount ?? 0)}`);

    return {
      exitCode: 0,
      output: { lines },
    };
  });
};
