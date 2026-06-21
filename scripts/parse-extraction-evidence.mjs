#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PARSE_SUB_BUCKETS = [
  'parseSourceReadMs',
  'parseNormalizationMs',
  'parseParserSetupMs',
  'parseTreeSitterMs',
  'parseAstExtractionMs',
  'parseErrorHandlingMs',
];

function usage() {
  console.log([
    'Usage: node scripts/parse-extraction-evidence.mjs --profile <profile.json> [--out-json <summary.json>] [--out-md <summary.md>]',
    '',
    'Reads rust-index-profile.mjs output and writes decision-ready parse/extraction',
    'evidence with dominant parse sub-bucket, per-language distribution, and RSS',
    'availability for #224 closeout.',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = { profile: null, outJson: null, outMarkdown: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--profile') {
      args.profile = argv[++i] ?? null;
    } else if (arg === '--out-json') {
      args.outJson = argv[++i] ?? null;
    } else if (arg === '--out-md') {
      args.outMarkdown = argv[++i] ?? null;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function dominantParseSubBucket(profile) {
  const entries = PARSE_SUB_BUCKETS
    .map((name) => [name, profile?.[name]])
    .filter(([, value]) => Number.isFinite(value));
  if (entries.length === 0) return { name: null, ms: null };
  const [name, ms] = entries.sort((a, b) => b[1] - a[1])[0];
  return { name, ms };
}

function rustRss(result) {
  const rust = result?.engines?.rust ?? {};
  return {
    peakRssBytes: Number.isFinite(rust.peakRssBytes) ? rust.peakRssBytes : null,
    unavailableReason: rust.rssUnavailableReason ?? null,
  };
}

function readiness(result, profile) {
  const missing = [];
  if (!Number.isFinite(profile?.parseExtractionMs)) missing.push('parseExtractionMs');
  if (!PARSE_SUB_BUCKETS.some((key) => Number.isFinite(profile?.[key]))) {
    missing.push('parse sub-buckets');
  }
  if (!profile?.parseByLanguage || Object.keys(profile.parseByLanguage).length === 0) {
    missing.push('parseByLanguage');
  }
  const rss = rustRss(result);
  if (rss.peakRssBytes == null && !rss.unavailableReason) {
    missing.push('RSS or rssUnavailableReason');
  }
  return {
    ready: missing.length === 0,
    missing,
  };
}

function summarize(profilePath) {
  const source = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const corpora = (source.results ?? []).map((result) => {
    const profile = result.profile ?? {};
    const parseByLanguage = profile.parseByLanguage ?? {};
    return {
      name: result.name ?? 'unknown',
      sourcePath: result.sourcePath ?? null,
      commit: result.commit ?? null,
      parseExtractionMs: Number.isFinite(profile.parseExtractionMs) ? profile.parseExtractionMs : null,
      parseSubBuckets: Object.fromEntries(
        PARSE_SUB_BUCKETS.map((key) => [key, Number.isFinite(profile[key]) ? profile[key] : null]),
      ),
      parseByLanguage,
      rss: rustRss(result),
      dominantParseSubBucket: dominantParseSubBucket(profile),
      decisionReadiness: readiness(result, profile),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    sourceProfile: path.resolve(profilePath),
    profileGeneratedAt: source.generatedAt ?? null,
    corpora,
  };
}

function markdown(summary) {
  const lines = [
    '# Parse Extraction Evidence Summary',
    '',
    `Source profile: \`${summary.sourceProfile}\``,
    '',
    '## Corpus Summary',
    '',
    '| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |',
    '|---|---:|---:|---|---:|---:|---|',
  ];
  for (const corpus of summary.corpora) {
    lines.push([
      corpus.name,
      corpus.commit ?? 'n/a',
      corpus.parseExtractionMs ?? 'n/a',
      corpus.dominantParseSubBucket.name ?? 'n/a',
      corpus.dominantParseSubBucket.ms ?? 'n/a',
      corpus.rss.peakRssBytes ?? `unavailable: ${corpus.rss.unavailableReason ?? 'unknown'}`,
      corpus.decisionReadiness.ready ? 'ready' : `not ready: ${corpus.decisionReadiness.missing.join(', ')}`,
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('', '## Per-Language Parse Distribution', '');
  lines.push('| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |');
  lines.push('|---|---|---:|---:|---:|---:|');
  for (const corpus of summary.corpora) {
    const entries = Object.entries(corpus.parseByLanguage ?? {});
    if (entries.length === 0) {
      lines.push(`| ${corpus.name} | n/a | n/a | n/a | n/a | n/a |`);
      continue;
    }
    for (const [language, buckets] of entries) {
      lines.push([
        corpus.name,
        language,
        buckets.files ?? 'n/a',
        buckets.parseExtractionMs ?? 'n/a',
        buckets.treeSitterMs ?? 'n/a',
        buckets.astExtractionMs ?? 'n/a',
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
  }

  lines.push('', '## Decision Sufficiency', '');
  for (const corpus of summary.corpora) {
    lines.push(`- ${corpus.name}: ${corpus.decisionReadiness.ready ? 'ready' : `not ready (${corpus.decisionReadiness.missing.join(', ')})`}`);
  }
  return `${lines.join('\n')}\n`;
}

function writeIfRequested(file, text) {
  if (!file) return;
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!args.profile) throw new Error('--profile is required');
  const summary = summarize(args.profile);
  const json = `${JSON.stringify(summary, null, 2)}\n`;
  writeIfRequested(args.outJson, json);
  writeIfRequested(args.outMarkdown, markdown(summary));
  if (!args.outJson && !args.outMarkdown) process.stdout.write(json);
}

main();
