const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-recovery-'));
  const dbPath = path.join(dir, 'test.db');
  const raw = new DatabaseSync(dbPath);
  raw.exec(fs.readFileSync(path.join(__dirname, '../../src/db/schema.sql'), 'utf8'));
  raw.prepare(
    `INSERT INTO embedding_queue
      (file_path,content_hash,status,attempts,enqueued_at,started_at,heartbeat_at,worker_id)
      VALUES (?,?,?,?,?,?,?,?)`,
  ).run('src/a.ts', 'hash-a', 'in_progress', 1, 0, Date.now(), Date.now(), 'dead');
  raw.close();
  fs.writeFileSync(path.join(dir, 'placeholder.txt'), 'scheduler probe');
  const worker = new Worker(path.join(__dirname, '../../dist/embedding/worker.js'), {
    workerData: {
      dbPath, projectRoot: dir, vec0Path: 'fixture',
      modelsDir: path.join(dir, 'models'), staleInProgressMsForTests: 2000,
      skipVec0LoadForTests: true,
      skipModelLoadForTests: true,
    },
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not become ready')), 5000);
    worker.once('message', message => {
      clearTimeout(timer);
      if (message.type === 'ready') resolve();
      else reject(new Error(`expected ready, got ${JSON.stringify(message)}`));
    });
  });
  const messages = [{ type: 'ready' }];
  worker.on('message', message => messages.push(message));
  worker.postMessage({ type: 'drain' });
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && !messages.some(message => message.type === 'idle')) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    if (messages[0]?.type !== 'ready'
        || messages[1]?.type !== 'idle'
        || messages[1].processed !== 0) {
      throw new Error(`fixture did not reach its initial idle state: ${JSON.stringify(messages)}`);
    }
    let row;
    while (Date.now() < deadline) {
      const db = new DatabaseSync(dbPath);
      row = db.prepare(
        'SELECT status,worker_id,attempts,last_error FROM embedding_queue',
      ).get();
      db.close();
      if (row.status === 'done'
          && messages.filter(message => message.type === 'idle').length === 2) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    const recovered = row?.status === 'done'
      && row.worker_id !== 'dead'
      && row.last_error === null
      && messages.filter(message => message.type === 'idle').length === 2;
    console.log(JSON.stringify({ recovered, row, messages }));
    if (!recovered) throw new Error('orphan was not automatically retried after the first idle');
    console.log(JSON.stringify({ recovered, row, messages }));
    if (!recovered) throw new Error('orphan was not completed after lease recovery');
  } finally {
    worker.postMessage({ type: 'shutdown' });
    await new Promise(resolve => setTimeout(resolve, 500));
    await worker.terminate();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
