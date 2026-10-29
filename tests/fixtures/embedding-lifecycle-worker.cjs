const { parentPort, workerData } = require('node:worker_threads');

if (workerData.mode === 'early-exit') {
  parentPort.postMessage({ type: 'ready' });
  parentPort.on('message', (msg) => {
    if (msg.type === 'drain') process.exit(23);
  });
} else {
  let draining = false;
  let shutdown = false;
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(workerData.dbPath);
  parentPort.postMessage({ type: 'ready' });
  parentPort.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      shutdown = true;
      if (!draining) process.exit(0);
      return;
    }
    if (msg.type !== 'drain' || draining) return;
    draining = true;
    const claimed = db.prepare(
      "UPDATE embedding_queue SET status='in_progress', started_at=1 WHERE status='pending'",
    ).run();
    parentPort.postMessage({ type: 'progress', processed: 0, failed: 0, remaining: 1 });
    setTimeout(() => {
      db.prepare(
        "UPDATE embedding_queue SET status='done', finished_at=1 WHERE status='in_progress'",
      ).run();
      parentPort.postMessage({ type: 'idle', processed: claimed.changes, failed: 0 });
      draining = false;
      if (shutdown) process.exit(0);
    }, 150);
  });
}
