import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabasePath } from '../db';
import { IndexProgress, IndexResult } from '../extraction';
import { IndexEngine } from './engine-selection';

interface RustIndexerOptions {
  force?: boolean;
  verbose?: boolean;
  graphWorkProfile?: 'full' | 'matched-ts-js';
  sqliteWriteMode?: 'disk' | 'final-flush' | 'memory-final-flush';
  profiling?: 'heap';
  onProgress?: (progress: IndexProgress) => void;
}

export interface RustCoreCommand {
  command: string;
  argsPrefix: string[];
  cwd: string;
}

export interface RustReadinessDiagnostics {
  configuredEngine: {
    engine: IndexEngine | 'unavailable';
    source: 'default' | 'env' | 'unavailable';
    rawValue?: string;
    error?: string;
  };
  core: {
    available: boolean;
    discoverySource: 'env' | 'packaged-binary' | 'source-debug-binary' | 'source-cargo-run' | 'missing';
    attemptedCommand: string;
    attemptedArgsPrefix: string[];
    cwd: string | null;
    versionCheck: {
      ok: boolean;
      stdout?: string;
      stderr?: string;
      error?: string;
    };
  };
  lastIndex: {
    engine: string | null;
    engineVersion: string | null;
  };
  latestProfile: unknown | null;
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

function asExecutableCommand(file: string, cwd: string): RustCoreCommand {
  try {
    const header = fs.readFileSync(file, 'utf-8').slice(0, 128);
    if (header.startsWith('#!/usr/bin/env node') || header.startsWith('#!/usr/bin/node')) {
      return { command: process.execPath, argsPrefix: [file], cwd };
    }
  } catch {
    // Binary files may not decode as UTF-8; run them directly.
  }
  return { command: file, argsPrefix: [], cwd };
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
    return asExecutableCommand(binaryPath, process.cwd());
  }

  const packagedBinary = packagedRustCoreBinary(compiledFileDir, platform);
  if (fs.existsSync(packagedBinary)) {
    return asExecutableCommand(packagedBinary, path.dirname(packagedBinary));
  }

  const repoRoot = repoRootFromCompiledFile(compiledFileDir);
  const debugBinary = path.join(
    repoRoot,
    'target',
    'debug',
    rustCoreExecutableName(platform),
  );
  if (fs.existsSync(debugBinary)) {
    return asExecutableCommand(debugBinary, repoRoot);
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

function configuredEngineDiagnostics(env: NodeJS.ProcessEnv = process.env): RustReadinessDiagnostics['configuredEngine'] {
  const raw = env.ZCODEGRAPH_INDEX_ENGINE;
  if (raw == null || raw.trim() === '') {
    return { engine: 'rust-hybrid', source: 'default' };
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'typescript' || normalized === 'ts') {
    return { engine: 'typescript', source: 'env', rawValue: raw };
  }
  if (normalized === 'rust') {
    return { engine: 'rust', source: 'env', rawValue: raw };
  }
  if (normalized === 'rust-hybrid' || normalized === 'hybrid') {
    return { engine: 'rust-hybrid', source: 'env', rawValue: raw };
  }
  return {
    engine: 'unavailable',
    source: 'unavailable',
    rawValue: raw,
    error: `Unsupported index engine "${normalized}". Supported engines: typescript, rust, rust-hybrid`,
  };
}

function discoverRustCoreDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
  options: RustCoreDiscoveryOptions = {},
): Omit<RustReadinessDiagnostics['core'], 'versionCheck'> {
  const compiledFileDir = options.compiledFileDir ?? __dirname;
  const platform = options.platform ?? process.platform;
  const configured = env.ZCODEGRAPH_RUST_CORE_BINARY;
  if (configured) {
    const binaryPath = path.resolve(configured);
    return {
      available: fs.existsSync(binaryPath),
      discoverySource: 'env',
      attemptedCommand: binaryPath,
      attemptedArgsPrefix: [],
      cwd: process.cwd(),
    };
  }

  const packagedBinary = packagedRustCoreBinary(compiledFileDir, platform);
  if (fs.existsSync(packagedBinary)) {
    return {
      available: true,
      discoverySource: 'packaged-binary',
      attemptedCommand: packagedBinary,
      attemptedArgsPrefix: [],
      cwd: path.dirname(packagedBinary),
    };
  }

  const repoRoot = repoRootFromCompiledFile(compiledFileDir);
  const debugBinary = path.join(repoRoot, 'target', 'debug', rustCoreExecutableName(platform));
  if (fs.existsSync(debugBinary)) {
    return {
      available: true,
      discoverySource: 'source-debug-binary',
      attemptedCommand: debugBinary,
      attemptedArgsPrefix: [],
      cwd: repoRoot,
    };
  }

  if (fs.existsSync(path.join(repoRoot, 'Cargo.toml'))) {
    return {
      available: true,
      discoverySource: 'source-cargo-run',
      attemptedCommand: 'cargo',
      attemptedArgsPrefix: ['run', '--quiet', '--package', 'zcodegraph-core', '--'],
      cwd: repoRoot,
    };
  }

  return {
    available: false,
    discoverySource: 'missing',
    attemptedCommand: packagedBinary,
    attemptedArgsPrefix: [],
    cwd: null,
  };
}

function checkRustCoreVersion(core: Omit<RustReadinessDiagnostics['core'], 'versionCheck'>): RustReadinessDiagnostics['core']['versionCheck'] {
  if (!core.available) {
    return {
      ok: false,
      error: `${core.attemptedCommand} does not exist`,
    };
  }
  const args = [...core.attemptedArgsPrefix, '--version'];
  const result = spawnSync(core.attemptedCommand, args, {
    cwd: core.cwd ?? process.cwd(),
    env: process.env,
    encoding: 'utf-8',
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() || undefined,
    stderr: result.stderr?.trim() || undefined,
    error: result.error instanceof Error ? result.error.message : undefined,
  };
}

function readLatestRustProfile(projectPath: string): unknown | null {
  const candidates = [
    path.join(projectPath, '.zcodegraph', 'rust-profile-summary.json'),
    path.join(projectPath, '.zcodegraph', 'rust-profile', 'summary.json'),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return JSON.parse(fs.readFileSync(candidate, 'utf-8'));
    } catch {
      return {
        path: candidate,
        error: 'Failed to parse latest Rust profile summary',
      };
    }
  }
  return null;
}

export function getRustReadinessDiagnostics(
  projectPath: string,
  buildInfo: { engine: string | null; engineVersion: string | null },
  env: NodeJS.ProcessEnv = process.env,
  options: RustCoreDiscoveryOptions = {},
): RustReadinessDiagnostics {
  const core = discoverRustCoreDiagnostics(env, options);
  return {
    configuredEngine: configuredEngineDiagnostics(env),
    core: {
      ...core,
      versionCheck: checkRustCoreVersion(core),
    },
    lastIndex: {
      engine: buildInfo.engine,
      engineVersion: buildInfo.engineVersion,
    },
    latestProfile: readLatestRustProfile(projectPath),
  };
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
  if (options.graphWorkProfile) {
    args.push('--graph-work-profile', options.graphWorkProfile);
  }
  if (options.sqliteWriteMode) {
    args.push('--sqlite-write-mode', options.sqliteWriteMode);
  }

  return new Promise<IndexResult>((resolve, reject) => {
    const spawnedAt = Date.now();
    let subprocessStartupHandoffMs: number | undefined;
    const childEnv = {
      ...process.env,
      ...(options.profiling ? { ZCODEGRAPH_PROFILING: options.profiling } : {}),
    };
    const child = spawn(core.command, args, {
      cwd: core.cwd,
      env: childEnv,
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
