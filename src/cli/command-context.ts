/**
 * CLI Command Context
 *
 * Separates command behavior from process-level IO, formatting, and
 * exit handling. Each command receives an injected CommandContext
 * and returns a CommandResult — the Commander action shell wires
 * context to real IO/exit.
 *
 * This generalizes the UpgradeDeps pattern from src/upgrade/index.ts.
 */

// ─── IO abstractions ────────────────────────────────────────────────────────

/**
 * Minimal write-only output stream interface.
 * In production: process.stdout / process.stderr.
 * In tests: in-memory string[] or mock.
 */
export interface OutputStream {
  write(chunk: string): void;
}

/**
 * Output target: which stream to write to.
 */
export type OutputTarget = 'stdout' | 'stderr';

// ─── Command output ─────────────────────────────────────────────────────────

/**
 * Structured output data that a command produces before formatting.
 * Formatting functions consume this and produce strings.
 */
export interface CommandOutput {
  /** JSON-serializable data (when --json is used) */
  json?: unknown;
  /** Pre-formatted text (when --json is NOT used) */
  text?: string;
  /** Lines of text to print (alternative to single text block) */
  lines?: string[];
}

/**
 * Result of a command execution — pure data, no side effects.
 */
export interface CommandResult {
  /** Exit code: 0 = success, non-zero = failure */
  exitCode: number;
  /** Output to write before exiting */
  output?: CommandOutput;
  /** Structured errors for logging/formatting */
  errors?: CommandError[];
}

/**
 * Structured error produced by a command.
 */
export interface CommandError {
  message: string;
  severity: 'info' | 'warn' | 'error';
  code?: string;
}

// ─── Command context (injected dependencies) ────────────────────────────────

/**
 * All side-effectful dependencies a command may need.
 * Injected so commands are testable without process-level IO.
 */
export interface CommandContext {
  /** Current working directory for the command */
  cwd: string;

  /** Write to stdout */
  stdout: OutputStream;

  /** Write to stderr */
  stderr: OutputStream;

  /** Exit the process (in tests, throws instead) */
  exit: (code: number) => never;

  /** Log at info level */
  log: (message: string) => void;

  /** Log at warn level */
  warn: (message: string) => void;

  /** Log at error level */
  error: (message: string) => void;

  /** Platform (for platform-specific logic) */
  platform: NodeJS.Platform;

  /** Node.js version string (e.g. "22.12.0") */
  nodeVersion: string;
}

// ─── Command function signature ─────────────────────────────────────────────

/**
 * A command function: receives arguments and context, returns a result.
 * No process.exit(), no console.log() — pure logic with injected IO.
 */
export type CommandFn<Args = Record<string, unknown>> = (
  args: Args,
  ctx: CommandContext
) => Promise<CommandResult>;

// ─── Factory: create production context ─────────────────────────────────────

/**
 * Create a CommandContext wired to real process IO.
 * Used in the Commander action shell.
 */
export function createProcessContext(cwd: string): CommandContext {
  return {
    cwd,
    stdout: process.stdout,
    stderr: process.stderr,
    exit: (code: number): never => {
      process.exit(code);
    },
    log: (message: string) => console.log(message),
    warn: (message: string) => console.warn(message),
    error: (message: string) => console.error(message),
    platform: process.platform,
    nodeVersion: process.version,
  };
}

// ─── Factory: create test context ───────────────────────────────────────────

/**
 * Create a CommandContext for testing. exit() throws TestExit instead
 * of terminating the process, and all output goes to in-memory buffers.
 */
export class TestExit extends Error {
  constructor(public readonly exitCode: number) {
    super(`TestExit(${exitCode})`);
    this.name = 'TestExit';
  }
}

export function createTestContext(cwd: string = '/test/project'): CommandContext & {
  getStdout(): string;
  getStderr(): string;
  getLogs(): string[];
} {
  const stdoutBuffer: string[] = [];
  const stderrBuffer: string[] = [];
  const logs: string[] = [];

  return {
    cwd,
    stdout: {
      write(chunk: string) { stdoutBuffer.push(chunk); },
    },
    stderr: {
      write(chunk: string) { stderrBuffer.push(chunk); },
    },
    exit: (code: number): never => {
      throw new TestExit(code);
    },
    log: (message: string) => { logs.push(`[INFO] ${message}`); },
    warn: (message: string) => { logs.push(`[WARN] ${message}`); },
    error: (message: string) => { logs.push(`[ERROR] ${message}`); },
    platform: process.platform,
    nodeVersion: process.version,
    getStdout: () => stdoutBuffer.join(''),
    getStderr: () => stderrBuffer.join(''),
    getLogs: () => [...logs],
  };
}

// ─── Output helpers ─────────────────────────────────────────────────────────

/**
 * Write CommandOutput to the appropriate streams.
 */
export function writeCommandOutput(output: CommandOutput, ctx: CommandContext): void {
  if (output.text) {
    ctx.stdout.write(output.text + '\n');
  }
  if (output.lines) {
    for (const line of output.lines) {
      ctx.stdout.write(line + '\n');
    }
  }
  if (output.json !== undefined) {
    ctx.stdout.write(JSON.stringify(output.json, null, 2) + '\n');
  }
}

/**
 * Write errors to stderr.
 */
export function writeCommandErrors(errors: CommandError[], ctx: CommandContext): void {
  for (const err of errors) {
    const prefix = err.severity === 'error' ? 'ERROR' : err.severity === 'warn' ? 'WARN' : 'INFO';
    const target = err.severity === 'error' ? ctx.stderr : ctx.stdout;
    target.write(`${prefix}: ${err.message}\n`);
  }
}
