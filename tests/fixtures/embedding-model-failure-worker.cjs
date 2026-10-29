const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const { claimPendingEmbeddings, markEmbeddingFailed } = require('../../dist/embedding/queue.js');

let draining = false;
let raw = null;
parentPort.postMessage({ type: 'ready' });
parentPort.on('message', (msg) => {
  if (msg.type === 'shutdown') {
    if (!draining) {
      if (raw) raw.close();
      process.exit(0);
    }
    return;
  }
  if (msg.type !== 'drain' || draining) return;
  draining = true;
  raw = new DatabaseSync(workerData.dbPath);
  const db = {
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => (...args) => {
      raw.exec('BEGIN');
      try {
        const result = fn(...args);
        raw.exec('COMMIT');
        return result;
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    },
  };
  const claimed = claimPendingEmbeddings(db, 8);
  for (const row of claimed) {
    markEmbeddingFailed(db, row.file_path, row.content_hash, 'test-model-init-failed');
  }
  parentPort.postMessage({ type: 'idle', processed: 0, failed: claimed.length });
  raw.close();
  raw = null;
  draining = false;
});
