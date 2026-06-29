import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../index';
import { scanDirectory, detectLanguage } from '../extraction';
import { isGeneratedFile } from '../extraction/generated-detection';

export type DiagnosticRecordKind = 'last-run' | 'last-failure';

export interface DiagnosticOutputTail {
  text?: string;
  unavailableReason?: string;
}

export interface DiagnosticRunRecord {
  schemaVersion: 1;
  kind: DiagnosticRecordKind;
  engine: string;
  command: {
    name: string;
    args: string[];
  };
  startedAt: string;
  endedAt: string;
  elapsedMs: number;
  exitCode: number;
  fallbackState: string | null;
  previousIndexPreserved: boolean | null;
  projectRootHash: string;
  result?: unknown;
  statusSummary?: unknown;
  profile?: unknown;
  rss: {
    peakRssBytes: number | null;
    unavailableReason: string;
  };
  sanitizedOutput: {
    stdoutTail: DiagnosticOutputTail;
    stderrTail: DiagnosticOutputTail;
  };
  errors: Array<{
    message: string;
    code?: string;
    severity?: string;
    pathHash?: string;
    extension?: string;
    language?: string;
    line?: number;
    column?: number;
  }>;
}

export interface DiagnosticRecordInput {
  kind: DiagnosticRecordKind;
  engine: string;
  commandName: string;
  args: string[];
  startedAt: number;
  endedAt?: number;
  exitCode: number;
  result?: {
    success: boolean;
    filesIndexed: number;
    filesSkipped: number;
    filesErrored: number;
    nodesCreated: number;
    edgesCreated: number;
    durationMs: number;
    errors?: Array<{ message: string; filePath?: string; severity?: string; code?: string; line?: number; column?: number }>;
    profile?: unknown;
  };
  error?: unknown;
  previousIndexPreserved?: boolean | null;
  stdoutTail?: string;
  stderrTail?: string;
}

export type DiagnosticBundleSource = 'last-run' | 'last-failure';

export function diagnosticsDir(projectRoot: string): string {
  return path.join(projectRoot, '.zcodegraph', 'diagnostics');
}

export function diagnosticRecordPath(projectRoot: string, kind: DiagnosticRecordKind): string {
  return path.join(diagnosticsDir(projectRoot), `${kind}.json`);
}

export function hashDiagnosticValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function sanitizeDiagnosticText(text: string, projectRoot?: string): string {
  let out = text;
  const home = process.env.HOME;
  if (home) out = out.split(home).join('<home>');
  if (projectRoot) out = out.split(projectRoot).join('<path>');
  out = out.replace(/(?:[A-Za-z]:)?(?:\/[\w .@-]+){2,}/g, '<path>');
  out = out.replace(/(authorization\s*:\s*)\S+/gi, '$1<redacted>');
  out = out.replace(/([A-Z0-9_]*(?:TOKEN|KEY|SECRET)[A-Z0-9_]*\s*=\s*)\S+/gi, '$1<redacted>');
  out = out.replace(/\b(token|key|secret)=([^&\s]+)/gi, '$1=<redacted>');
  out = out.replace(/\b[A-Fa-f0-9]{40,}\b/g, '<redacted>');
  out = out.replace(/\b[A-Za-z0-9+/=_-]{80,}\b/g, '<redacted>');
  return out;
}

function tailText(text: string | undefined, projectRoot: string): DiagnosticOutputTail {
  if (!text) return { unavailableReason: 'not-captured-in-this-run' };
  const lines = text.split(/\r?\n/).slice(-200).join('\n');
  const clipped = lines.length > 32 * 1024 ? lines.slice(lines.length - 32 * 1024) : lines;
  return { text: sanitizeDiagnosticText(clipped, projectRoot) };
}

function sanitizeErrorMessage(message: string, projectRoot: string, filePath: string | undefined): string {
  let sanitized = sanitizeDiagnosticText(message, projectRoot);
  if (filePath) {
    const relative = path.isAbsolute(filePath) ? path.relative(projectRoot, filePath) : filePath;
    sanitized = sanitized.split(relative).join('<path>');
    sanitized = sanitized.split(path.basename(relative)).join('<path>');
  }
  return sanitized;
}

function safeRelativePathDetails(projectRoot: string, filePath: string | undefined): {
  pathHash?: string;
  extension?: string;
  language?: string;
} {
  if (!filePath) return {};
  const relative = path.isAbsolute(filePath) ? path.relative(projectRoot, filePath) : filePath;
  return {
    pathHash: hashDiagnosticValue(relative),
    extension: path.extname(relative).toLowerCase(),
    language: detectLanguage(relative),
  };
}

function statusSummary(projectRoot: string): unknown {
  if (!fs.existsSync(path.join(projectRoot, '.zcodegraph', 'zcodegraph.db'))) {
    return { available: false, unavailableReason: 'index-db-not-found' };
  }
  const cg = CodeGraph.openSync(projectRoot);
  try {
    const stats = cg.getStats();
    const buildInfo = cg.getIndexBuildInfo();
    return {
      available: true,
      fileCount: stats.fileCount,
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      nodesByKind: stats.nodesByKind,
      filesByLanguage: stats.filesByLanguage,
      index: {
        engine: buildInfo.engine,
        engineVersion: buildInfo.engineVersion,
        hybrid: buildInfo.hybrid,
        builtWithVersion: buildInfo.version,
        builtWithExtractionVersion: buildInfo.extractionVersion,
      },
    };
  } finally {
    cg.close();
  }
}

function fallbackStateFromStatus(summary: unknown): string | null {
  const hybrid = (summary as { index?: { hybrid?: { fallbackState?: string } | null } })?.index?.hybrid;
  return hybrid?.fallbackState ?? null;
}

export function writeDiagnosticRunRecord(projectRoot: string, input: DiagnosticRecordInput): DiagnosticRunRecord {
  const endedAt = input.endedAt ?? Date.now();
  const summary = statusSummary(projectRoot);
  const errors = [
    ...(input.result?.errors ?? []),
    ...(input.error ? [{ message: input.error instanceof Error ? input.error.message : String(input.error), severity: 'error' }] : []),
  ].map((err) => ({
    message: sanitizeErrorMessage(err.message, projectRoot, err.filePath),
    code: err.code,
    severity: err.severity,
    ...safeRelativePathDetails(projectRoot, err.filePath),
    line: err.line,
    column: err.column,
  }));

  const record: DiagnosticRunRecord = {
    schemaVersion: 1,
    kind: input.kind,
    engine: input.engine,
    command: {
      name: input.commandName,
      args: input.args.map((arg) => sanitizeDiagnosticText(arg, projectRoot)),
    },
    startedAt: new Date(input.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    elapsedMs: Math.max(0, endedAt - input.startedAt),
    exitCode: input.exitCode,
    fallbackState: fallbackStateFromStatus(summary),
    previousIndexPreserved: input.previousIndexPreserved ?? null,
    projectRootHash: hashDiagnosticValue(path.resolve(projectRoot)),
    result: input.result ? {
      success: input.result.success,
      filesIndexed: input.result.filesIndexed,
      filesSkipped: input.result.filesSkipped,
      filesErrored: input.result.filesErrored,
      nodesCreated: input.result.nodesCreated,
      edgesCreated: input.result.edgesCreated,
      durationMs: input.result.durationMs,
    } : undefined,
    statusSummary: summary,
    profile: input.result?.profile,
    rss: { peakRssBytes: null, unavailableReason: 'not-collected-in-this-run' },
    sanitizedOutput: {
      stdoutTail: tailText(input.stdoutTail, projectRoot),
      stderrTail: tailText(input.stderrTail ?? (input.error instanceof Error ? input.error.message : undefined), projectRoot),
    },
    errors,
  };

  fs.mkdirSync(diagnosticsDir(projectRoot), { recursive: true });
  fs.writeFileSync(diagnosticRecordPath(projectRoot, input.kind), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

function readRecord(projectRoot: string, source: DiagnosticBundleSource): DiagnosticRunRecord {
  const file = diagnosticRecordPath(projectRoot, source);
  if (!fs.existsSync(file)) {
    throw new Error(`No ${source} diagnostic record found. Run zcodegraph index first.`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as DiagnosticRunRecord;
}

function gitMetadata(projectRoot: string): unknown {
  try {
    const commit = execFileSync('git', ['-C', projectRoot, 'rev-parse', 'HEAD'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const status = execFileSync('git', ['-C', projectRoot, 'status', '--porcelain'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    let trackedFileCount: number | null = null;
    try {
      trackedFileCount = execFileSync('git', ['-C', projectRoot, 'ls-files'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split('\n')
        .filter(Boolean)
        .length;
    } catch {
      trackedFileCount = null;
    }
    return { gitAvailable: true, gitCommit: commit, gitDirty: status.trim().length > 0, gitTrackedFileCount: trackedFileCount };
  } catch (err) {
    return {
      gitAvailable: false,
      unavailableReason: err instanceof Error ? 'git-command-failed' : 'git-metadata-unavailable',
    };
  }
}

function corpusFingerprint(projectRoot: string): unknown {
  const files = scanDirectory(projectRoot);
  const extensionDistribution: Record<string, number> = {};
  const languageDistribution: Record<string, number> = {};
  let totalBytes = 0;
  let generatedFileCount = 0;

  for (const file of files) {
    const full = path.join(projectRoot, file);
    const ext = path.extname(file).toLowerCase() || '<none>';
    const lang = detectLanguage(file);
    extensionDistribution[ext] = (extensionDistribution[ext] ?? 0) + 1;
    languageDistribution[lang] = (languageDistribution[lang] ?? 0) + 1;
    if (isGeneratedFile(file)) generatedFileCount++;
    try {
      totalBytes += fs.statSync(full).size;
    } catch {
      // ignore races
    }
  }

  return {
    projectRootHash: hashDiagnosticValue(path.resolve(projectRoot)),
    fileCount: files.length,
    totalBytes,
    extensionDistribution,
    languageDistribution,
    generatedFileCount,
    git: gitMetadata(projectRoot),
  };
}

function perFileDiagnostics(record: DiagnosticRunRecord): unknown {
  const fallbackSummary = (record.statusSummary as { index?: { hybrid?: {
    fallbackState?: string;
    fallbackFileCount?: number;
    fallbackReasonTaxonomy?: Record<string, number>;
    missingFallbackFileCount?: number;
    missingFallbackByLanguage?: Record<string, number>;
    fallbackByLanguage?: Record<string, number>;
  } } })?.index?.hybrid ?? null;

  return {
    schemaVersion: 1,
    classification: {
      replaySafe: true,
      sourcePathPolicy: 'path-hash-only',
      sourceSlicePolicy: 'omitted',
      aggregateTaxonomy: fallbackSummary ? {
        fallbackState: fallbackSummary.fallbackState ?? null,
        fallbackFileCount: fallbackSummary.fallbackFileCount ?? null,
        fallbackReasonTaxonomy: fallbackSummary.fallbackReasonTaxonomy ?? {},
        missingFallbackFileCount: fallbackSummary.missingFallbackFileCount ?? null,
        missingFallbackByLanguage: fallbackSummary.missingFallbackByLanguage ?? {},
        fallbackByLanguage: fallbackSummary.fallbackByLanguage ?? {},
      } : null,
    },
    errors: record.errors.map((err) => ({
      pathHash: err.pathHash,
      extension: err.extension,
      language: err.language,
      code: err.code,
      severity: err.severity,
      line: err.line,
      column: err.column,
      message: err.message,
    })),
    fallbackSummary,
  };
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function createDiagnosticBundle(projectRoot: string, options: {
  engine: string;
  source: DiagnosticBundleSource;
  version: string;
}): string {
  const record = readRecord(projectRoot, options.source);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const relativeBundleDir = path.join('.zcodegraph', 'diagnostics', 'bundles', `${stamp}-${options.source}`);
  const bundleDir = path.join(projectRoot, relativeBundleDir);
  fs.mkdirSync(bundleDir, { recursive: true });

  const status = record.statusSummary ?? statusSummary(projectRoot);
  writeJson(path.join(bundleDir, 'manifest.json'), {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: options.source,
    engine: options.engine,
    version: options.version,
    projectRootHash: record.projectRootHash,
    recordKind: record.kind,
  });
  writeJson(path.join(bundleDir, 'status.json'), status);
  const statusObject = status as { available?: boolean; fileCount?: number; nodeCount?: number; edgeCount?: number; nodesByKind?: unknown; filesByLanguage?: unknown };
  writeJson(path.join(bundleDir, 'graph-stats.json'), statusObject.available === false
    ? { available: false, unavailableReason: 'status-unavailable' }
    : {
      fileCount: statusObject.fileCount,
      nodeCount: statusObject.nodeCount,
      edgeCount: statusObject.edgeCount,
      nodesByKind: statusObject.nodesByKind,
      filesByLanguage: statusObject.filesByLanguage,
    });
  writeJson(path.join(bundleDir, 'profile.json'), record.profile ?? { available: false, unavailableReason: 'not-collected-in-this-run' });
  writeJson(path.join(bundleDir, 'corpus-fingerprint.json'), corpusFingerprint(projectRoot));
  const perFile = perFileDiagnostics(record);
  writeJson(path.join(bundleDir, 'per-file-diagnostics.json'), perFile);
  fs.writeFileSync(path.join(bundleDir, 'replay.md'), [
    '# Replay Manifest',
    '',
    `Source: ${options.source}`,
    `Engine: ${options.engine}`,
    `Project root hash: ${record.projectRootHash}`,
    '',
    'This bundle intentionally omits source code and plaintext file paths.',
    'Use the recorded Git commit, aggregate corpus fingerprint, engine assignment, fallback taxonomy, and sanitized process output to classify the report.',
    '',
    '## Per-file diagnostics',
    '',
    '`per-file-diagnostics.json` is the replay-safe per-file classification contract for this bundle.',
    'Each diagnostic uses `pathHash` instead of a plaintext path and keeps only classification fields such as language, extension, code, severity, location, and sanitized message.',
    'The `classification.aggregateTaxonomy.fallbackReasonTaxonomy` field summarizes why the run was degraded, including Rust-owned parse or extraction gaps and hybrid fallback categories when present.',
    'Diagnostic bundle v1 does not include source slices; use these fields to classify the report before requesting any source from the reporter.',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(bundleDir, 'privacy.md'), [
    '# Privacy Summary',
    '',
    'This diagnostic bundle is local-only and is not uploaded automatically.',
    'It excludes source code by default.',
    'It excludes plaintext file paths by default and uses path hashes for per-file diagnostics.',
    'It excludes Git remote URLs, branch names, commit messages, diffs, author data, and untracked filenames.',
    '',
  ].join('\n'));

  return relativeBundleDir;
}
