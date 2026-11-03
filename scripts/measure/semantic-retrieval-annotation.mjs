#!/usr/bin/env node
/** Prepare and mechanically validate Human-blind semantic-retrieval labels.
 * This tool never approves candidates, tunes retrieval, or measures rankings.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CANDIDATE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-annotation-v1.json');
const PROBE_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-probe-v1.json');
const FROZEN_PATH = path.join(REPO, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v1.json');
const REVIEW_KEYS = ['query', 'expectedFiles', 'evidence', 'hardNegatives', 'split'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function assertRelativeFile(file) {
  return typeof file === 'string' && file.length > 0 && !path.isAbsolute(file) &&
    !file.includes('\\') && !file.split('/').includes('..');
}
function assertText(value, label) {
  require(typeof value === 'string' && value.trim().length > 0, `${label} must be non-empty text`);
}
export function validateQuery(query, knownCorpora) {
  require(query && typeof query === 'object', 'query must be an object');
  for (const key of ['id', 'corpus', 'query', 'split']) assertText(query[key], `query ${key}`);
  require(knownCorpora.has(query.corpus), `${query.id}: unknown corpus`);
  require(['development', 'holdout'].includes(query.split), `${query.id}: invalid split`);
  for (const key of ['expectedFiles', 'hardNegatives']) {
    require(Array.isArray(query[key]) && query[key].length >= (key === 'expectedFiles' ? 1 : 2), `${query.id}: incomplete ${key}`);
    require(new Set(query[key]).size === query[key].length, `${query.id}: duplicate ${key}`);
    for (const file of query[key]) require(assertRelativeFile(file), `${query.id}: unsafe file path ${file}`);
  }
  require(!query.expectedFiles.some((file) => query.hardNegatives.includes(file)), `${query.id}: expected file is also a hard negative`);
  assertText(query.evidence?.symbol, `${query.id} evidence.symbol`);
  require(Number.isInteger(query.evidence?.startLine) && query.evidence.startLine > 0, `${query.id}: invalid evidence line`);
}
function loadCandidates() {
  const addition = readJson(CANDIDATE_PATH);
  const probe = readJson(PROBE_PATH);
  require(addition.metric === 'semantic-retrieval-human-annotation' && addition.version === 1, 'unsupported candidate metric/version');
  require(addition.status === 'candidate-awaiting-human-review', 'candidate package has been changed to an approval state');
  require(addition.review?.decision === 'pending' && addition.review?.reviewer === null, 'candidate package must not claim Human approval');
  require(probe.status === 'exploratory-ai-source-anchored', 'probe label provenance must remain explicit');
  const corpora = new Map([...probe.corpora, ...addition.corpora].map((corpus) => [corpus.id, corpus]));
  require(corpora.size === probe.corpora.length + addition.corpora.length, 'duplicate corpus id');
  for (const corpus of corpora.values()) {
    require(/^[0-9a-f]{40}$/.test(corpus.ref), `${corpus.id}: invalid commit pin`);
    require(['development', 'holdout'].includes(corpus.split ?? 'development'), `${corpus.id}: invalid corpus split`);
  }
  const queries = [...probe.queries, ...addition.queries.map((query) => ({
    ...query, split: corpora.get(query.corpus)?.split ?? 'development',
  }))];
  const ids = new Set();
  for (const query of queries) {
    validateQuery(query, corpora);
    require(!ids.has(query.id), `duplicate query id: ${query.id}`);
    ids.add(query.id);
    require(!query.expectedFiles.some((file) => !fs.existsSync(path.join('C:/workspace/measure-corpus', query.corpus, file))), `${query.id}: missing expected file`);
  }
  require(queries.length === 60, `candidate set must contain exactly 60 questions, got ${queries.length}`);
  require(addition.queries.length === 36, 'candidate package must contain its 36 new questions');
  return { addition, probe, corpora, queries, candidateSha256: sha256(CANDIDATE_PATH), probeSha256: sha256(PROBE_PATH) };
}
function verifySource(corpusRoot, corpora, queries) {
  const resolved = path.resolve(corpusRoot);
  const actualRefs = {};
  for (const corpus of corpora.values()) {
    const root = path.join(resolved, corpus.id);
    require(fs.statSync(root, { throwIfNoEntry: false })?.isDirectory(), `${corpus.id}: missing corpus at ${root}`);
    const actual = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    require(actual === corpus.ref, `${corpus.id}: expected ${corpus.ref}, got ${actual}`);
    actualRefs[corpus.id] = actual;
  }
  for (const query of queries) {
    for (const file of [...query.expectedFiles, ...query.hardNegatives]) {
      require(fs.statSync(path.join(resolved, query.corpus, file), { throwIfNoEntry: false })?.isFile(), `${query.id}: missing ${file}`);
    }
    const source = fs.readFileSync(path.join(resolved, query.corpus, query.expectedFiles[0]), 'utf8').split(/\r?\n/);
    const line = source[query.evidence.startLine - 1] ?? '';
    const symbol = query.evidence.symbol.split(' and ')[0].split('.').at(-1);
    require(line.includes(symbol), `${query.id}: evidence line does not contain ${symbol}: ${line}`);
    require(!/^\s*(?:\/\/|\/\*|\*|#)/.test(line), `${query.id}: evidence points to a comment: ${line}`);
  }
  return { corpusRoot: resolved, revisionsVerified: actualRefs, sourceAnchorsVerified: queries.length, note: 'Definition-shaped source anchor check only; Human relevance judgment is still required.' };
}
function releaseSummary(corpora, queries) {
  const rows = [...corpora.values()].map((corpus) => {
    const own = queries.filter((query) => query.corpus === corpus.id);
    return { corpus: corpus.id, language: corpus.language, accepted: own.length, holdout: own.filter((query) => query.split === 'holdout').length };
  });
  const holdout = queries.filter((query) => query.split === 'holdout').length;
  return { total: queries.length, languages: new Set(rows.map((row) => row.language)).size, holdout, holdoutFraction: holdout / queries.length, corpora: rows };
}
export function validateRelease(corpora, queries, policy) {
  const summary = releaseSummary(corpora, queries);
  require(summary.total >= policy.minimumTotalAccepted, `only ${summary.total} accepted; ${policy.minimumTotalAccepted} required`);
  require(summary.holdoutFraction >= policy.minimumHoldoutFraction, `holdout fraction ${summary.holdoutFraction} below ${policy.minimumHoldoutFraction}`);
  for (const row of summary.corpora) require(row.accepted >= policy.minimumQuestionsPerCorpus, `${row.corpus}: only ${row.accepted} accepted`);
  const whole = corpora.get(policy.wholeHoldoutCorpus);
  require(whole?.split === 'holdout', 'designated whole holdout corpus is missing or not holdout');
  const own = queries.filter((query) => query.corpus === whole.id);
  require(own.length > 0 && own.every((query) => query.split === 'holdout'), 'whole holdout corpus must contain only holdout questions');
  return summary;
}
function initialReview(candidates) {
  return {
    metric: 'semantic-retrieval-human-review', version: 1,
    candidate: 'docs/baselines/semantic-retrieval-human-annotation-v1.json',
    candidateSha256: candidates.candidateSha256, probeSha256: candidates.probeSha256,
    reviewer: null, reviewedAt: null, independentOfTuning: null, rankingsShown: false,
    corpusApproved: Object.fromEntries([...candidates.corpora.keys()].map((id) => [id, false])),
    notes: '', decisions: candidates.queries.map((query) => ({ id: query.id, decision: 'pending', revised: null, notes: '' })),
  };
}
export function validateReview(review, candidates, { requireApproval = false } = {}) {
  require(review?.metric === 'semantic-retrieval-human-review' && review.version === 1, 'unsupported review metric/version');
  require(review.candidateSha256 === candidates.candidateSha256 && review.probeSha256 === candidates.probeSha256, 'review does not match candidate/probe SHA-256; regenerate and re-review');
  require(review.rankingsShown === false, 'ranked results must not be included in blind review');
  require(Array.isArray(review.decisions) && review.decisions.length === candidates.queries.length, 'every candidate must have exactly one review decision');
  const byId = new Map(candidates.queries.map((query) => [query.id, query]));
  const seen = new Set();
  const accepted = [];
  for (const row of review.decisions) {
    require(byId.has(row.id) && !seen.has(row.id), `unknown or duplicate reviewed id: ${row.id}`);
    seen.add(row.id);
    const original = byId.get(row.id);
    if (row.decision === 'reject') {
      require(row.revised === null && typeof row.notes === 'string' && row.notes.trim().length > 0, `${row.id}: rejection requires a note and no revision`);
      continue;
    }
    if (requireApproval) {
      assertText(review.reviewer, 'reviewer');
      require(review.independentOfTuning === true, 'reviewer must explicitly confirm independence from tuning');
      require(Number.isFinite(Date.parse(review.reviewedAt)), 'valid reviewedAt ISO date required');
      for (const id of candidates.corpora.keys()) require(review.corpusApproved?.[id] === true, `${id}: Human corpus approval missing`);
    }
    require(['accept', 'amend', 'pending'].includes(row.decision), `${row.id}: invalid decision`);
    if (requireApproval) require(row.decision !== 'pending', `${row.id}: still pending`);
    if (row.decision === 'pending') continue;
    let query = original;
    if (row.decision === 'amend') {
      require(row.revised && typeof row.revised === 'object' && !Array.isArray(row.revised), `${row.id}: amendment must be an object`);
      const keys = Object.keys(row.revised);
      require(keys.length > 0 && keys.every((key) => REVIEW_KEYS.includes(key)), `${row.id}: amendment may only change ${REVIEW_KEYS.join(', ')}`);
      query = { ...original, ...row.revised, id: original.id, corpus: original.corpus };
      require(keys.some((key) => JSON.stringify(row.revised[key]) !== JSON.stringify(original[key])), `${row.id}: amendment must change at least one field`);
    } else require(row.revised === null, `${row.id}: non-amend decision must have revised=null`);
    validateQuery(query, candidates.corpora);
    accepted.push(query);
  }
  const summary = releaseSummary(candidates.corpora, accepted);
  if (requireApproval) validateRelease(candidates.corpora, accepted, candidates.addition.policy);
  return { accepted, summary };
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function renderReviewHtml(review, candidates) {
  const byId = new Map(candidates.queries.map((query) => [query.id, query]));
  const cards = review.decisions.map((row) => {
    const query = byId.get(row.id);
    const fields = ['query', 'expectedFiles', 'evidence', 'hardNegatives', 'split'].map((key) => `<label>${key}<textarea data-revision="${key}" rows="${key === 'query' ? 2 : 3}" disabled>${escapeHtml(key === 'expectedFiles' || key === 'hardNegatives' ? JSON.stringify(query[key]) : key === 'evidence' ? JSON.stringify(query[key]) : query[key])}</textarea></label>`).join('');
    return `<article id="${query.id}"><h3>${escapeHtml(query.id)}</h3><p class="meta">${escapeHtml(query.corpus)} · proposed ${query.split} · ${query.evidence.symbol}:${query.evidence.startLine}</p><p>${escapeHtml(query.query)}</p><p><b>Accepted entry files:</b> ${query.expectedFiles.map(escapeHtml).join('<br>')}</p><p><b>Related files to inspect (not presumed irrelevant):</b> ${query.hardNegatives.map(escapeHtml).join('<br>')}</p><div class="decision"><label><input type="radio" name="${query.id}" value="accept"> Accept</label><label><input type="radio" name="${query.id}" value="amend"> Amend + accept</label><label><input type="radio" name="${query.id}" value="reject"> Reject</label></div><details><summary>Amendment fields (enabled only for Amend)</summary>${fields}</details><label>Review note (required for rejection)<textarea data-note rows="2"></textarea></label></article>`;
  }).join('\n');
  const corpora = Object.keys(review.corpusApproved).map((id) => `<label><input type="checkbox" data-corpus="${id}"> I reviewed and approve the ${id} candidates</label>`).join('<br>');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Semantic retrieval Human-blind review</title><style>body{font:15px/1.55 system-ui,sans-serif;max-width:1080px;margin:auto;padding:24px;background:#f7f8fa;color:#17202a}article,header{background:white;border:1px solid #d8dee6;border-radius:8px;padding:18px;margin:16px 0}textarea{display:block;width:100%;box-sizing:border-box;margin:5px 0 12px;font:13px monospace}.meta{color:#526273}.decision{display:flex;gap:20px;flex-wrap:wrap}button{padding:10px 16px;background:#155e75;color:white;border:0;border-radius:5px;cursor:pointer}#status{white-space:pre-wrap;font-weight:600}.warning{border-left:5px solid #b45309}</style></head><body><header class="warning"><h1>Human-blind label review</h1><p>This package contains AI-authored source-anchored candidates, <b>not Human-approved labels</b>. No model ranking, retrieval score, recall, or tuning threshold is supplied. Read the pinned real source and judge intent, entry files and evidence. Do not approve merely because a symbol exists.</p><p>Candidate SHA-256: <code>${review.candidateSha256}</code><br>Probe SHA-256: <code>${review.probeSha256}</code></p><p>Amendment JSON formats: expectedFiles/hardNegatives are arrays; evidence is {"symbol":"...","startLine":123}; split is development or holdout. Corpus and IDs cannot change. Rejecting any of these 60 candidates requires a replacement before a 60-question release can freeze.</p></header><header><h2>Reviewer declaration</h2><label>Reviewer identity<input id="reviewer" type="text" autocomplete="name"></label><label>Review completion timestamp (ISO 8601)<input id="reviewedAt" type="text" placeholder="2026-11-02T15:00:00+08:00"></label><label><input id="independent" type="checkbox"> I did not tune retrieval candidates or use model rankings for these judgments.</label><h3>Per-corpus approval</h3>${corpora}<p><label>General notes<textarea id="notes"></textarea></label></p><button id="export">Export review JSON</button><div id="status"></div></header>${cards}<script>const template=${JSON.stringify(review).replace(/</g, '\\u003c')};const original=${JSON.stringify(Object.fromEntries(candidates.queries.map((q) => [q.id, q]))).replace(/</g, '\\u003c')};for(const article of document.querySelectorAll('article')){article.querySelectorAll('input[type=radio]').forEach(radio=>radio.addEventListener('change',()=>{article.querySelectorAll('[data-revision]').forEach(field=>{field.disabled=radio.value!=='amend'||!radio.checked;if(!field.disabled){const key=field.dataset.revision;const value=original[article.id][key];field.value=Array.isArray(value)||typeof value==='object'?JSON.stringify(value):value;}});}));}document.getElementById('export').addEventListener('click',()=>{const status=document.getElementById('status');try{const out=structuredClone(template);out.reviewer=document.getElementById('reviewer').value.trim();out.reviewedAt=document.getElementById('reviewedAt').value.trim();out.independentOfTuning=document.getElementById('independent').checked;out.notes=document.getElementById('notes').value;for(const box of document.querySelectorAll('[data-corpus]'))out.corpusApproved[box.dataset.corpus]=box.checked;for(const article of document.querySelectorAll('article')){const row=out.decisions.find(item=>item.id===article.id);row.decision=article.querySelector('input[type=radio]:checked')?.value??'pending';row.notes=article.querySelector('[data-note]').value;if(row.decision==='amend'){row.revised={};for(const field of article.querySelectorAll('[data-revision]')){const key=field.dataset.revision;const value=field.value;row.revised[key]=['expectedFiles','hardNegatives','evidence'].includes(key)?JSON.parse(value):value;if(key==='split'&&!['development','holdout'].includes(value))throw new Error(article.id+': invalid split');}}}const text=JSON.stringify(out,null,2)+'\\n';const blob=new Blob([text],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='semantic-retrieval-human-review-v1.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);status.textContent='Exported review JSON. Validate and freeze it with semantic-retrieval-annotation.mjs; export alone is not a freeze.';}catch(error){status.textContent=error.message;}});</script></body></html>`;
}
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function parseArgs(argv) {
  const out = { command: argv[0] ?? 'prepare', corpusRoot: 'C:/workspace/measure-corpus', out: null, html: null, review: null };
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--corpus-root') out.corpusRoot = argv[++index];
    else if (arg === '--out') out.out = argv[++index];
    else if (arg === '--html') out.html = argv[++index];
    else if (arg === '--review') out.review = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  require(['prepare', 'validate', 'freeze'].includes(out.command), 'command must be prepare, validate, or freeze');
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (fs.existsSync(FROZEN_PATH)) {
    const frozen = readJson(FROZEN_PATH);
    require(frozen.status === 'human-reviewed-frozen' && frozen.review.reviewer === 'victo' && frozen.review.independentOfTuning === true, 'invalid frozen Human review provenance');
    const verification = verifySource(args.corpusRoot, new Map(frozen.corpora.map((corpus) => [corpus.id, corpus])), frozen.queries);
    if (args.command === 'validate') {
      console.log(JSON.stringify({ status: 'human-reviewed-frozen', frozen: FROZEN_PATH, frozenSha256: sha256(FROZEN_PATH), ...verification, ...validateRelease(new Map(frozen.corpora.map((corpus) => [corpus.id, corpus])), frozen.queries, frozen.policy) }, null, 2));
    } else if (args.command === 'prepare') {
      console.log(JSON.stringify({ status: 'human-reviewed-frozen', frozen: FROZEN_PATH, frozenSha256: sha256(FROZEN_PATH), note: 'Frozen release exists; prepare is a no-op and does not reset the Human review.', ...releaseSummary(new Map(frozen.corpora.map((corpus) => [corpus.id, corpus])), frozen.queries) }, null, 2));
    } else throw new Error('frozen release already exists; it is immutable and cannot be overwritten');
  } else {
  const candidates = loadCandidates();
  const verification = verifySource(args.corpusRoot, candidates.corpora, candidates.queries);
  if (args.command === 'prepare') {
    const review = initialReview(candidates);
    const out = path.resolve(args.out ?? path.join(REPO, '.tmp', 'measure', 'semantic-retrieval-human-review-v1.json'));
    const html = path.resolve(args.html ?? path.join(REPO, '.tmp', 'measure', 'semantic-retrieval-human-review-v1.html'));
    writeJson(out, review);
    fs.writeFileSync(html, renderReviewHtml(review, candidates));
    console.log(JSON.stringify({ status: 'candidate-awaiting-human-review', ...verification, review: out, html, ...releaseSummary(candidates.corpora, candidates.queries) }, null, 2));
  } else {
    require(args.review, '--review <file> is required for validate/freeze');
    const review = readJson(path.resolve(args.review));
    const result = validateReview(review, candidates, { requireApproval: args.command === 'freeze' });
    if (args.command === 'validate') console.log(JSON.stringify({ status: 'review-mechanically-valid-not-frozen', ...verification, ...result.summary }, null, 2));
    else {
      const out = path.resolve(args.out ?? FROZEN_PATH);
      require(path.resolve(out) === FROZEN_PATH, `frozen release must be written to ${FROZEN_PATH}`);
      require(!fs.existsSync(out), 'frozen release already exists; it is immutable and cannot be overwritten');
      const frozen = {
        metric: 'semantic-retrieval-human-frozen', version: 1, status: 'human-reviewed-frozen',
        candidate: 'docs/baselines/semantic-retrieval-human-annotation-v1.json', candidateSha256: candidates.candidateSha256, probeSha256: candidates.probeSha256,
        review: { reviewer: review.reviewer, reviewedAt: review.reviewedAt, independentOfTuning: true, rankingsShown: false, corpusApproved: review.corpusApproved, notes: review.notes },
        policy: candidates.addition.policy,
        corpora: [...candidates.corpora.values()], queries: result.accepted,
      };
      writeJson(out, frozen);
      console.log(JSON.stringify({ status: 'human-reviewed-frozen', frozen: out, frozenSha256: sha256(out), ...verification, ...result.summary }, null, 2));
    }
  }
  }
}
