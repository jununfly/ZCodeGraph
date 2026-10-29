const path = require('node:path');
const { DatabaseConnection } = require('../../dist/db');
const { default: CodeGraph } = require('../../dist');
const { MCPEngine } = require('../../dist/mcp/engine');
const { MCPServer } = require('../../dist/mcp');
const { EmbeddingRunner } = require('../../dist/embedding/worker-runner');

async function main() {
  const [dbPath, projectRoot, vec0Path, workerEntrypoint] = process.argv.slice(2);
  const connection = DatabaseConnection.open(dbPath);
  const cg = new CodeGraph(connection, connection.getDb(), projectRoot);
  const server = new MCPServer();
  await server.startDirect('lifecycle fixture');
  const engine = new MCPEngine({ watch: false });
  engine.cg = cg;
  server.engine = engine;
  const runner = EmbeddingRunner.forDatabase({
    dbPath,
    projectRoot,
    vec0Path,
    workerEntrypoint: path.resolve(workerEntrypoint),
  });
  runner.notifyEnqueued();
}

main().catch(error => {
  process.stderr.write(String(error));
  process.exit(1);
});
