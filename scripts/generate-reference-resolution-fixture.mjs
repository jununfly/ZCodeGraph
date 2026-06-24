#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log([
    'Usage: node scripts/generate-reference-resolution-fixture.mjs --out <dir> [--modules <n>] [--fanout <n>]',
    '',
    'Generates a deterministic JS/TS fixture that creates many resolvable',
    'references and persisted edges during rust-hybrid finalization.',
  ].join('\n'));
}

function parseArgs(argv) {
  let out = null;
  let modules = 40;
  let fanout = 12;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--out') {
      out = path.resolve(requiredValue(argv, ++i, '--out'));
      continue;
    }
    if (arg === '--modules') {
      modules = positiveInt(requiredValue(argv, ++i, '--modules'), '--modules');
      continue;
    }
    if (arg === '--fanout') {
      fanout = positiveInt(requiredValue(argv, ++i, '--fanout'), '--fanout');
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!out) throw new Error('--out is required');
  return { help: false, out, modules, fanout };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function positiveInt(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${flag} must be a positive integer`);
  return parsed;
}

function pad(value) {
  return String(value).padStart(3, '0');
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function sharedSource(fanout) {
  const lines = [];
  for (let i = 0; i < fanout; i += 1) {
    lines.push(`export function sharedHelper${i}(value: number): number {`);
    lines.push(`  return value + ${i};`);
    lines.push('}');
    lines.push('');
    lines.push(`export class SharedClass${i} {`);
    lines.push(`  value${i}(): number {`);
    lines.push(`    return sharedHelper${i}(${i});`);
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function moduleSource(index, fanout) {
  const suffix = pad(index);
  const imports = [
    `import { ${Array.from({ length: fanout }, (_, i) => `sharedHelper${i}`).join(', ')} } from './shared';`,
    `import { ${Array.from({ length: fanout }, (_, i) => `SharedClass${i}`).join(', ')} } from './shared';`,
  ];
  const lines = [...imports, ''];
  lines.push(`export function runModule${suffix}(seed: number): number {`);
  lines.push('  let total = seed;');
  for (let i = 0; i < fanout; i += 1) {
    lines.push(`  total += sharedHelper${i}(seed + ${i});`);
    lines.push(`  total += new SharedClass${i}().value${i}();`);
  }
  lines.push('  return total;');
  lines.push('}');
  lines.push('');
  lines.push(`export const moduleValue${suffix} = runModule${suffix}(${index});`);
  return `${lines.join('\n')}\n`;
}

function indexSource(modules) {
  const lines = [];
  for (let i = 0; i < modules; i += 1) {
    lines.push(`import { runModule${pad(i)} } from './module-${pad(i)}';`);
  }
  lines.push('');
  lines.push('export function runReferenceResolutionFixture(): number {');
  lines.push('  let total = 0;');
  for (let i = 0; i < modules; i += 1) {
    lines.push(`  total += runModule${pad(i)}(${i});`);
  }
  lines.push('  return total;');
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function generate({ out, modules, fanout }) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'src'), { recursive: true });
  const files = ['package.json', 'tsconfig.json', 'src/shared.ts', 'src/index.ts'];
  write(path.join(out, 'package.json'), `${JSON.stringify({ name: 'zcodegraph-reference-resolution-fixture', private: true, type: 'module' }, null, 2)}\n`);
  write(path.join(out, 'tsconfig.json'), `${JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      baseUrl: '.',
    },
    include: ['src/**/*.ts'],
  }, null, 2)}\n`);
  write(path.join(out, 'src', 'shared.ts'), sharedSource(fanout));
  for (let i = 0; i < modules; i += 1) {
    const file = `src/module-${pad(i)}.ts`;
    files.push(file);
    write(path.join(out, file), moduleSource(i, fanout));
  }
  write(path.join(out, 'src', 'index.ts'), indexSource(modules));
  const manifest = {
    kind: 'rust-hybrid-reference-resolution-pressure-fixture',
    version: 1,
    modules,
    fanout,
    expectedPressureSources: [
      'edge-materialization-pressure',
      'resolved-edge-write-tail',
      'checkpoint-boundary',
    ],
    expectedReferencePattern: {
      importedFunctionsPerModule: fanout,
      importedClassesPerModule: fanout,
      localCallsPerModule: fanout * 2,
    },
    files,
  };
  write(path.join(out, 'fixture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const manifest = generate(args);
  console.log(JSON.stringify({ status: 'completed', out: args.out, manifest }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
