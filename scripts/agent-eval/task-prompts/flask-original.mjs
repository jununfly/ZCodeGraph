// Flask structural trace task — original prompt (no CodeGraph guidance).
// Preserved as control arm for prompt-design comparison.
// This is the exact prompt used in flask-baseline-20261112T055419Z.
// It also remains the default input of later explicitly identified candidate runs;
// those runs are distinguishable by run ID, not by rewriting this text.

export const PROMPT_ID = 'flask-ipv6-structure-trace-v1-candidate';
export const COMMIT = '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7';
export const CORPUS = `pallets/flask@${COMMIT}`;

export const PROMPT = [
  'Trace the IPv6-related structure in this Flask checkout.',
  'First, explain how Flask.run uses SERVER_NAME to resolve an IPv6 host and optional port before invoking the development server.',
  'Second, trace FlaskClient.session_transaction through the cookie update helper and explain how response cookies are reapplied using the cookie host and path.',
  'Cite the exact files and function names.',
  'Do not claim a separate port argument is passed to the cookie update helper unless the code does so.',
  'Read-only investigation only: do not edit files, run tests, or start a server.',
  'Return a concise technical explanation.',
].join(' ');
