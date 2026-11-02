const fs = require('node:fs');
const path = require('node:path');

const mode = process.argv[2];
const projectRoot = process.argv[3];
const dbPath = path.join(projectRoot, '.zcodegraph', 'zcodegraph.db');
const supervisorPidPath = path.join(projectRoot, 'supervisor.pid');
const distRoot = path.resolve(__dirname, '../../dist');
// Observe the genuine production supervisor PID without changing its stdio,
// arguments, result, or lifetime. Patch before loading the production module
// because it captures spawn at import time.
const childProcess = require('node:child_process');
const originalSpawn = childProcess.spawn;
let closeSupervisionChannel = () => {};
childProcess.spawn = function(command, args, options) {
  const child = originalSpawn.call(this, command, args, options);
  if (Array.isArray(args) && args.includes('supervised-index')) {
    fs.writeFileSync(supervisorPidPath, String(child.pid));
    closeSupervisionChannel = () => child.stdin.end();
    process.once('supervision-fixture-eof', closeSupervisionChannel);
    child.once('close', () => process.off('supervision-fixture-eof', closeSupervisionChannel));
  }
  return child;
};
const { acquireExclusiveReplacementGate } = require(
  path.join(distRoot, 'embedding/replacement-gate.js'),
);

async function main() {
  const gate = await acquireExclusiveReplacementGate(dbPath, 5_000);
  if (mode === 'writer-fixture') {
    const { spawn } = require('node:child_process');
    const fixture = process.argv[4];
    const writerDb = process.argv[5];
    const writerState = process.argv[6];
    const supervisor = spawn(fixture, [writerDb, writerState], {
      stdio: ['pipe', 'ignore', 'inherit'],
    });
    fs.writeFileSync(supervisorPidPath, String(supervisor.pid));
  } else if (mode === 'production-index') {
    const { runRustIndexerBorrowingGate } = require(
      path.join(distRoot, 'indexing/rust-indexer.js'),
    );
    void runRustIndexerBorrowingGate(projectRoot, {
      onProgress: () => {
        if (!fs.existsSync(supervisorPidPath)) {
          fs.writeFileSync(supervisorPidPath, String(fs.readFileSync(
            path.join(projectRoot, '.zcodegraph', 'zcodegraph.lock'),
            'utf8',
          ).trim()));
        }
      },
    }).then(() => process.exit(0), (error) => {
      console.error(error);
      process.exit(2);
    });
    process.stdin.resume();
    process.stdin.once('end', () => closeSupervisionChannel());
    // Keep the gate owner alive until the test kills it. The gate itself must
    // be released only by process death, never by this fixture's cleanup.
    setInterval(() => {}, 1_000);
    return;
  } else {
    throw new Error(`unknown supervision fixture mode: ${mode}`);
  }
  process.stdin.resume();
  process.stdin.once('end', () => process.exit(0));
  setInterval(() => {}, 1_000);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
