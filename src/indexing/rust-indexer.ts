import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabasePath } from '../db';
import { IndexProgress, IndexResult } from '../extraction';

interface RustIndexerOptions {
  force?: boolean;
  verbose?: boolean;
  onProgress?: (progress: IndexProgress) => void;
}

export interface RustCoreCommand {
  command: string;
  argsPrefix: string[];
  cwd: string;
}

interface RustCoreDiscoveryOptions {
  compiledFileDir?: string;
  platform?: NodeJS.Platform;
}

type RustCoreMessage =
  | ({ type: 'progress' } & IndexProgress)
  | ({ type: 'result' } & IndexResult)
  | { type: 'error'; message: string; severity?: string; code?: string };

function repoRootFromCompiledFile(compiledFileDir = __dirname): string {
  return path.resolve(compiledFileDir, '..', '..');
}

function rustCoreExecutableName(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
}

function packagedRustCoreBinary(compiledFileDir = __dirname, platform: NodeJS.Platform = process.platform): string {
  return path.resolve(compiledFileDir, '..', '..', '..', 'bin', rustCoreExecutableName(platform));
}

export function findRustCoreCommand(
  env: NodeJS.ProcessEnv = process.env,
  options: RustCoreDiscoveryOptions = {},
): RustCoreCommand {
  const compiledFileDir = options.compiledFileDir ?? __dirname;
  const platform = options.platform ?? process.platform;
  const configured = env.ZCODEGRAPH_RUST_CORE_BINARY;
  if (configured) {
    const binaryPath = path.resolve(configured);
    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Rust index engine is unavailable: ${binaryPath} does not exist`);
    }
    return { command: binaryPath, argsPrefix: [], cwd: process.cwd() };
  }

  const packagedBinary = packagedRustCoreBinary(compiledFileDir, platform);
  if (fs.existsSync(packagedBinary)) {
    return { command: packagedBinary, argsPrefix: [], cwd: path.dirname(packagedBinary) };
  }

  const repoRoot = repoRootFromCompiledFile(compiledFileDir);
  const debugBinary = path.join(
    repoRoot,
    'target',
    'debug',
    rustCoreExecutableName(platform),
  );
  if (fs.existsSync(debugBinary)) {
    return { command: debugBinary, argsPrefix: [], cwd: repoRoot };
  }

  if (fs.existsSync(path.join(repoRoot, 'Cargo.toml'))) {
    return {
      command: 'cargo',
      argsPrefix: ['run', '--quiet', '--package', 'zcodegraph-core', '--'],
      cwd: repoRoot,
    };
  }

  throw new Error(
    'Rust index engine is unavailable: no Rust core binary was found. ' +
      'Set ZCODEGRAPH_RUST_CORE_BINARY to a zcodegraph-core executable.',
  );
}

function parseRustCoreLine(line: string): RustCoreMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed) as Partial<RustCoreMessage>;
  if (parsed.type === 'progress' || parsed.type === 'result' || parsed.type === 'error') {
    return parsed as RustCoreMessage;
  }

  throw new Error(`Unknown Rust index engine message type: ${String(parsed.type)}`);
}

function formatRustFailure(stderr: string, fallback: string): string {
  const lines = stderr.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      const parsed = parseRustCoreLine(line);
      if (parsed?.type === 'error') {
        return parsed.message;
      }
    } catch {
      // Keep looking; stderr may include non-JSON cargo diagnostics.
    }
  }
  return lines.length > 0 ? lines.join('\n') : fallback;
}

export async function runRustIndexer(
  projectPath: string,
  options: RustIndexerOptions = {},
): Promise<IndexResult> {
  const core = findRustCoreCommand();
  const args = [
    ...core.argsPrefix,
    'index',
    '--engine',
    'rust',
    '--project-path',
    projectPath,
    '--index-path',
    getDatabasePath(projectPath),
  ];

  if (options.force) {
    args.push('--force');
  }
  if (options.verbose) {
    args.push('--verbose');
  }

  return new Promise<IndexResult>((resolve, reject) => {
    const spawnedAt = Date.now();
    let subprocessStartupHandoffMs: number | undefined;
    const child = spawn(core.command, args, {
      cwd: core.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutBuffer = '';
    let stderr = '';
    let result: IndexResult | undefined;

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf-8');
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() ?? '';

      for (const line of lines) {
        try {
          const message = parseRustCoreLine(line);
          if (!message) continue;
          subprocessStartupHandoffMs ??= Date.now() - spawnedAt;
          if (message.type === 'progress') {
            options.onProgress?.({
              phase: message.phase,
              current: message.current,
              total: message.total,
              currentFile: message.currentFile,
            });
          } else if (message.type === 'result') {
            const { type: _type, ...indexResult } = message;
            indexResult.profile = {
              ...indexResult.profile,
              subprocessStartupHandoffMs,
            };
            result = indexResult;
          }
        } catch (err) {
          child.kill();
          reject(err);
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(`Rust index engine is unavailable: ${core.command} was not found`));
        return;
      }
      reject(err);
    });

    child.on('close', (code) => {
      if (stdoutBuffer.trim()) {
        try {
          const message = parseRustCoreLine(stdoutBuffer);
          if (message?.type === 'result') {
            subprocessStartupHandoffMs ??= Date.now() - spawnedAt;
            const { type: _type, ...indexResult } = message;
            indexResult.profile = {
              ...indexResult.profile,
              subprocessStartupHandoffMs,
            };
            result = indexResult;
          }
        } catch (err) {
          reject(err);
          return;
        }
      }

      if (code !== 0) {
        const resultError = result?.errors.find((err) => err.severity === 'error')?.message;
        if (resultError) {
          reject(new Error(resultError));
          return;
        }
        reject(new Error(formatRustFailure(stderr, `Rust index engine failed with exit code ${code ?? 'unknown'}`)));
        return;
      }

      if (!result) {
        reject(new Error('Rust index engine did not emit a final result'));
        return;
      }

      resolve(result);
    });
  });
}
