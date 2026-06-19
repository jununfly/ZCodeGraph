import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { ToolHandler } from '../src/mcp/tools';

const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

describe('zcodegraph_explore — Gin route lookup sufficiency', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-gin-route-explore-'));
    fs.writeFileSync(
      path.join(testDir, 'main.go'),
      [
        'package main',
        '',
        'import (',
        '  "net/http"',
        '  "github.com/gin-gonic/gin"',
        ')',
        '',
        'func main() {',
        '  r := setupRouter()',
        '  r.Run(":8080")',
        '}',
        '',
        'func setupRouter() *gin.Engine {',
        '  r := gin.Default()',
        '  r.POST("/upload", uploadHandler)',
        '  return r',
        '}',
        '',
        'func uploadHandler(c *gin.Context) {',
        '  c.JSON(http.StatusOK, gin.H{"message": "upload successful"})',
        '}',
      ].join('\n') + '\n',
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.go'], exclude: [] },
    });
    await cg.indexAll({
      engine: 'rust-hybrid',
      rustCoreCommand: RUST_CORE_BIN,
    });
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (testDir && fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('surfaces the POST /upload route and handler from one explore call', async () => {
    const handler = new ToolHandler(cg);
    const result = await handler.execute('zcodegraph_explore', {
      query: 'How does a request reach the upload handler for POST /upload?',
      maxFiles: 5,
    });
    const text = result.content.map((part) => part.text).join('\n');

    expect(text).toContain('POST /upload');
    expect(text).toContain('uploadHandler');
    expect(text).toContain('r.POST("/upload", uploadHandler)');
    expect(text).toMatch(/### Route matches[\s\S]*POST \/upload[\s\S]*uploadHandler[\s\S]*references/);
  }, 30_000);
});
