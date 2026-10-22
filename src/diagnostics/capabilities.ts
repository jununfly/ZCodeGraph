/**
 * Capability health probe report consumption + upstream artifact checks.
 *
 * Roadmap 1-2-8-4 (`zcodegraph doctor capabilities.json [--upstream-check]`).
 *
 * Two offline concerns live here, deliberately separate from the diagnostic
 * bundle v1 flow (which bundles rust-hybrid run records):
 *
 *  1. `loadCapabilitiesReport` — validate the artifact emitted by
 *     scripts/measure/capability-probes.mjs and summarize per-domain states.
 *  2. `runUpstreamChecks` — verify the local upstream artifacts the runtime
 *     depends on: tree-sitter WASM grammars (existence + non-trivial size +
 *     version-pinned pairing) and the Rust core binary (discovery via the
 *     same sources rust-indexer uses, plus a `match-name` stdin smoke call).
 *     No network access — checks must work on an offline machine.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

export type CapabilityDomainState = 'healthy' | 'degraded' | 'failed';

export interface CapabilityDomainReport {
  state: CapabilityDomainState;
  latencyMs?: number;
  detail?: string;
}

export interface CapabilitiesReport {
  metric: string;
  repo?: string;
  ref?: string;
  measuredAt?: string;
  value: {
    overall: CapabilityDomainState;
    pass: boolean;
    domains: Record<string, CapabilityDomainReport>;
    probesTotalMs?: number;
  };
  evidence?: Record<string, unknown>;
}

export interface CapabilitiesSummary {
  overall: CapabilityDomainState;
  pass: boolean;
  domains: Record<string, CapabilityDomainReport>;
  measuredAt?: string;
  repo?: string;
  lines: string[];
}

/** Load and validate a capabilities.json probe artifact. Throws on malformed input. */
export function loadCapabilitiesReport(file: string): CapabilitiesSummary {
  if (!fs.existsSync(file)) {
    throw new Error(`capabilities report not found: ${file}`);
  }
  let parsed: CapabilitiesReport;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as CapabilitiesReport;
  } catch (err) {
    throw new Error(`capabilities report is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (parsed.metric !== 'capability-probes') {
    throw new Error(`capabilities report metric is '${parsed.metric}', expected 'capability-probes' (run scripts/measure/capability-probes.mjs)`);
  }
  const domains = parsed.value?.domains;
  if (!domains || typeof domains !== 'object' || Object.keys(domains).length === 0) {
    throw new Error('capabilities report has no domains');
  }
  for (const [name, d] of Object.entries(domains)) {
    if (!d || !['healthy', 'degraded', 'failed'].includes(d.state)) {
      throw new Error(`domain '${name}' has invalid state '${d?.state}'`);
    }
  }

  const lines: string[] = [];
  lines.push(`Overall: ${parsed.value.overall} (${parsed.value.pass ? 'pass' : 'FAIL'})`);
  if (parsed.measuredAt) lines.push(`Measured at: ${parsed.measuredAt}`);
  if (parsed.repo) lines.push(`Corpus: ${parsed.repo}`);
  lines.push('Domains:');
  for (const [name, d] of Object.entries(domains)) {
    const latency = typeof d.latencyMs === 'number' ? ` ${d.latencyMs}ms` : '';
    lines.push(`  [${d.state}] ${name}${latency} — ${d.detail ?? ''}`.trimEnd());
  }

  return {
    overall: parsed.value.overall,
    pass: parsed.value.pass,
    domains,
    measuredAt: parsed.measuredAt,
    repo: parsed.repo,
    lines,
  };
}

export interface UpstreamCheck {
  name: string;
  state: CapabilityDomainState;
  detail: string;
}

export interface UpstreamCheckResult {
  pass: boolean;
  checks: UpstreamCheck[];
  lines: string[];
}

/** WASM magic bytes + version 0x1. */
function looksLikeWasm(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x00 && buf[1] === 0x61 && buf[2] === 0x73 && buf[3] === 0x6d &&
    buf[4] === 0x01 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00
  );
}

/** wasm file names shared by src/extraction/wasm and dist (copy-assets). */
function expectedWasmNames(): string[] {
  // The wasm grammars shipped with the package. Source of truth on disk:
  // src/extraction/wasm/*.wasm; dist mirrors them via copy-assets.
  return [
    'tree-sitter-c_sharp.wasm',
    'tree-sitter-lua.wasm',
    'tree-sitter-luau.wasm',
    'tree-sitter-pascal.wasm',
    'tree-sitter-scala.wasm',
  ];
}

export function checkWasmAssets(distDir: string): UpstreamCheck {
  const wasmDir = path.join(distDir, 'extraction', 'wasm');
  if (!fs.existsSync(wasmDir)) {
    return { name: 'wasm-assets', state: 'failed', detail: `missing directory ${wasmDir} (run \`npm run build\`)` };
  }
  const problems: string[] = [];
  const seen: string[] = [];
  for (const name of expectedWasmNames()) {
    const p = path.join(wasmDir, name);
    if (!fs.existsSync(p)) {
      problems.push(`${name} missing`);
      continue;
    }
    const stat = fs.statSync(p);
    if (stat.size < 1024) {
      problems.push(`${name} suspiciously small (${stat.size}B)`);
      continue;
    }
    const head = Buffer.alloc(8);
    const fd = fs.openSync(p, 'r');
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    if (!looksLikeWasm(head)) {
      problems.push(`${name} bad magic`);
      continue;
    }
    seen.push(name);
  }
  if (problems.length > 0) {
    return { name: 'wasm-assets', state: 'failed', detail: problems.join('; ') };
  }
  return {
    name: 'wasm-assets',
    state: 'healthy',
    detail: `${seen.length}/${expectedWasmNames().length} wasm grammars present with valid magic in ${wasmDir}`,
  };
}

/**
 * Rust core binary check. Mirrors the discovery order of
 * src/indexing/rust-indexer.ts findRustCoreCommand (env override → packaged
 * bin → source debug binary → cargo), then smoke-calls the binary with the
 * `match-name` stdin protocol (cheapest subcommand; no indexing side effects).
 */
export function checkRustCore(repoRoot: string): UpstreamCheck {
  const exeName = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
  const candidates: Array<{ source: string; command: string; argsPrefix: string[]; cwd: string }> = [];

  const configured = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
  if (configured) {
    const p = path.resolve(configured);
    if (fs.existsSync(p)) {
      candidates.push({ source: 'env ZCODEGRAPH_RUST_CORE_BINARY', command: p, argsPrefix: [], cwd: process.cwd() });
    } else {
      return { name: 'rust-core', state: 'failed', detail: `ZCODEGRAPH_RUST_CORE_BINARY points at missing file ${p}` };
    }
  }
  const packaged = path.join(repoRoot, 'bin', exeName);
  if (fs.existsSync(packaged)) {
    candidates.push({ source: 'packaged bin/', command: packaged, argsPrefix: [], cwd: path.dirname(packaged) });
  }
  const debugBin = path.join(repoRoot, 'target', 'debug', exeName);
  if (fs.existsSync(debugBin)) {
    candidates.push({ source: 'source target/debug', command: debugBin, argsPrefix: [], cwd: repoRoot });
  }
  if (candidates.length === 0 && fs.existsSync(path.join(repoRoot, 'Cargo.toml'))) {
    candidates.push({
      source: 'cargo run',
      command: 'cargo',
      argsPrefix: ['run', '--quiet', '--package', 'zcodegraph-core', '--'],
      cwd: repoRoot,
    });
  }
  if (candidates.length === 0) {
    return {
      name: 'rust-core',
      state: 'failed',
      detail: 'no Rust core binary found (env/packaged/debug/cargo all absent)',
    };
  }

  const first = candidates[0]!;
  // Minimal valid NameMatcherBatchRequest (crates/zcodegraph-core/src/lib.rs
  // struct NameMatcherBatchRequest: version=1, empty references — zero-match
  // smoke that exercises binary startup + JSON protocol without side effects).
  const smokeInput = JSON.stringify({ version: 1, candidateTable: {}, references: [] });
  try {
    execFileSync(first.command, [...first.argsPrefix, 'match-name'], {
      input: smokeInput,
      cwd: first.cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      name: 'rust-core',
      state: 'healthy',
      detail: `match-name smoke ok via ${first.source} (${first.command})`,
    };
  } catch (err) {
    // match-name on a trivial payload should exit 0 even with zero matches;
    // a non-zero exit or spawn failure means the binary is broken/mismatched.
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: 'rust-core',
      state: 'failed',
      detail: `match-name smoke failed via ${first.source}: ${message.slice(0, 200)}`,
    };
  }
}

/**
 * Locate the repo/bundle root from this compiled file. A directory qualifies
 * as root when it has Cargo.toml (source checkout) or bin/<rust-core exe>
 * (release bundle layout) — a bare bin/ directory (e.g. dist/bin holding the
 * JS CLI) must NOT qualify, or dist/ would be mistaken for the root.
 */
export function resolveRepoRoot(fromDir: string): string {
  const exeName = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';
  let dir = path.resolve(fromDir);
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(dir, 'Cargo.toml'))) return dir;
    if (fs.existsSync(path.join(dir, 'bin', exeName))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(fromDir, '..', '..');
}

export function runUpstreamChecks(repoRoot: string): UpstreamCheckResult {
  const checks = [checkWasmAssets(path.join(repoRoot, 'dist')), checkRustCore(repoRoot)];
  const lines: string[] = [];
  lines.push('Upstream artifact checks (offline):');
  for (const c of checks) {
    lines.push(`  [${c.state}] ${c.name} — ${c.detail}`);
  }
  return { pass: checks.every((c) => c.state !== 'failed'), checks, lines };
}
