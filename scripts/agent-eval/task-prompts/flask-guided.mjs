// Flask structural trace task — guided variant.
// Explicitly instructs the model to use CodeGraph explore for structural queries.
// Compare with flask-original.mjs to measure prompt-driven tool adoption.

export const PROMPT_ID = 'flask-ipv6-structure-trace-v2-guided';
export const COMMIT = '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7';
export const CORPUS = `pallets/flask@${COMMIT}`;

export const PROMPT = [
  'You have access to CodeGraph MCP tools (mcp__codegraph__*). Use them for structural queries.',
  '',
  'Task: Trace the IPv6-related structure in this Flask checkout.',
  'First, use mcp__codegraph__zcodegraph_explore to find how Flask.run uses SERVER_NAME to resolve an IPv6 host and optional port before invoking the development server.',
  'Second, use mcp__codegraph__zcodegraph_explore to trace FlaskClient.session_transaction through the cookie update helper and explain how response cookies are reapplied using the cookie host and path.',
  'If you need to see the full source of a specific symbol, use mcp__codegraph__zcodegraph_node with includeCode=true.',
  'Cite the exact files and function names.',
  'Do not claim a separate port argument is passed to the cookie update helper unless the code does so.',
  'Read-only investigation only: do not edit files, run tests, or start a server.',
  'Return a concise technical explanation.',
].join(' ');
