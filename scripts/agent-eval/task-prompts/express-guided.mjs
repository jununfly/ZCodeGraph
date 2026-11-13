// Express route dispatch trace task — guided variant.
// Different corpus from Flask/Django to distribute model consumption.

export const PROMPT_ID = 'express-route-dispatch-trace-v1-guided';
export const COMMIT = 'main'; // Will be pinned at prepare time
export const CORPUS = `expressjs/express@${COMMIT}`;

export const PROMPT = [
  'You have access to CodeGraph MCP tools (mcp__codegraph__*). Use them for structural queries.',
  '',
  'Task: Trace the route dispatch chain in this Express checkout.',
  'First, use mcp__codegraph__zcodegraph_explore to find how the Router handles incoming requests — specifically how it matches routes and dispatches to route handlers.',
  'Second, use mcp__codegraph__zcodegraph_callees to find what the Router.handle function calls internally.',
  'Third, use mcp__codegraph__zcodegraph_explore to find how the Layer class matches paths and how the Route class dispatches to its stack of handlers.',
  'Cite the exact files, function names, and class names.',
  'Read-only investigation only: do not edit files, run tests, or start a server.',
  'Return a concise technical explanation.',
].join(' ');
