// Django middleware chain trace task — guided variant.
// Different corpus from Flask to avoid repeated consumption of the same task.

export const PROMPT_ID = 'django-middleware-chain-trace-v1-guided';
export const COMMIT = 'main'; // Will be pinned at prepare time
export const CORPUS = `django/django@${COMMIT}`;

export const PROMPT = [
  'You have access to CodeGraph MCP tools (mcp__codegraph__*). Use them for structural queries.',
  '',
  'Task: Trace the middleware processing chain in this Django checkout.',
  'First, use mcp__codegraph__zcodegraph_explore to find how the MiddlewareMixin processes requests — specifically how process_request is called before the view and process_response is called after.',
  'Second, use mcp__codegraph__zcodegraph_callers to find what calls MiddlewareMixin.__call__ and trace the middleware handler chain.',
  'Third, use mcp__codegraph__zcodegraph_explore to find how CsrfViewMiddleware extends MiddlewareMixin and overrides process_request.',
  'Cite the exact files, class names, and method names.',
  'Read-only investigation only: do not edit files, run tests, or start a server.',
  'Return a concise technical explanation.',
].join(' ');
