#!/usr/bin/env node
// Legacy shim: the old context tool was removed; use zcodegraph_explore.
// Usage: node probe-context.mjs <repo-with-.codegraph> <task words...>
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [, , repo, ...taskParts] = process.argv;
const task = taskParts.join(' ');
if (!repo || !task) { console.error('usage: probe-context.mjs <repo> <task...>'); process.exit(1); }

const load = async (rel) => import(pathToFileURL(resolve(rel)).href);
const idx = await load('dist/index.js');
const tools = await load('dist/mcp/tools.js');
const CodeGraph = idx.default?.default ?? idx.default ?? idx.CodeGraph;
const ToolHandler = tools.ToolHandler ?? tools.default?.ToolHandler;

const cg = CodeGraph.openSync(repo);
const h = new ToolHandler(cg);
const res = await h.execute('zcodegraph_explore', { query: task });
console.log(res.content?.[0]?.text ?? '(no text)');
try { cg.close?.(); } catch {}
