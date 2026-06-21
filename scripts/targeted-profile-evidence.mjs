#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnMeasured } from './process-tree-rss.mjs';

function usage() {
  console.log([
    'Usage: node scripts/targeted-profile-evidence.mjs --out <path> [--cwd <dir>] -- <command> [args...]',
    '',
    'Runs one targeted evidence command, samples process-tree RSS with procfs',
    'when available and ps as a fallback, then writes a JSON sidecar. RSS',
    'sampling failures are recorded in the sidecar and do not turn a successful',
    'command into a failed run.',
  ].join('\n'));
}

function parseArgs(argv) {
  let out = null;
  let cwd = process.cwd();
  let separator = argv.indexOf('--');

  for (let i = 0; i < (separator === -1 ? argv.length : separator); i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--out') {
      out = path.resolve(requiredValue(argv, ++i, '--out'));
      continue;
    }
    if (arg === '--cwd') {
      cwd = path.resolve(requiredValue(argv, ++i, '--cwd'));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (separator === -1) {
    throw new Error('Missing command separator: --');
  }
  const command = argv[separator + 1];
  if (!command) {
    throw new Error('Missing command after --');
  }
  if (!out) {
    throw new Error('--out is required');
  }
  return {
    help: false,
    out,
    cwd,
    command,
    args: argv.slice(separator + 2),
  };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const result = await spawnMeasured(args.command, args.args, { cwd: args.cwd });
  const artifact = {
    command: {
      executable: args.command,
      args: args.args,
      cwd: args.cwd,
    },
    status: result.code === 0 ? 'completed' : 'failed',
    exitCode: result.code,
    signal: result.signal,
    wallMs: result.wallMs,
    peakRssBytes: result.peakRssBytes,
    rssUnavailableReason: result.rssUnavailableReason,
    stdoutBytes: Buffer.byteLength(result.stdout),
    stderrBytes: Buffer.byteLength(result.stderr),
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(artifact, null, 2)}\n`);

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code ?? 1;
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
