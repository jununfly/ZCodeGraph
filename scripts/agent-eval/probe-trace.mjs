#!/usr/bin/env node
// Legacy shim: the old trace tool was removed; use zcodegraph_explore with endpoint symbols.
// Usage: node probe-trace.mjs <repo-with-.codegraph> <from> <to>
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [, , repo, from, to] = process.argv;
if (!repo || !from || !to) { console.error('usage: probe-trace.mjs <repo> <from> <to>'); process.exit(1); }

const load = async (rel) => import(pathToFileURL(resolve(rel)).href);
const idx = await load('dist/index.js');
const tools = await load('dist/mcp/tools.js');
const CodeGraph = idx.default?.default ?? idx.default ?? idx.CodeGraph;
const ToolHandler = tools.ToolHandler ?? tools.default?.ToolHandler;

const cg = CodeGraph.openSync(repo);
const h = new ToolHandler(cg);
const res = await h.execute('zcodegraph_explore', { query: `${from} ${to}`, projectPath: repo });
console.log(res.content?.[0]?.text ?? '(no text)');
try { cg.close?.(); } catch {}
