import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-resolution.md',
);
const TARGETED_RAW_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json',
);
const FULL_RAW_PATH = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json',
);

const REAL_SYNTAX_GAP_PATHS = [
  'build/next/index.ts',
  'extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts',
  'extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts',
  'extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts',
  'extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts',
  'extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts',
  'extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts',
  'extensions/copilot/src/platform/telemetry/common/telemetry.ts',
  'src/vs/code/electron-browser/workbench/workbench.ts',
  'src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts',
  'src/vs/platform/browserView/electron-browser/preload-browserView.ts',
  'src/vs/platform/tunnel/test/node/tunnelProxy.test.ts',
  'src/vs/sessions/electron-browser/sessions.ts',
  'src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts',
  'src/vs/workbench/contrib/issue/browser/issueFormService.ts',
  'src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts',
];

describe('Phase 4 VS Code syntax-gap resolution doc', () => {
  it('records #88 root syntax families and raw rerun artifacts', () => {
    const doc = fs.readFileSync(DOC_PATH, 'utf8');

    expect(doc).toContain('#88');
    expect(doc).toContain('Type-only `import("module").Type` queries');
    expect(doc).toContain('Contextual keyword identifiers');
    expect(doc).toContain('2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-rerun.raw.json');
    expect(doc).toContain('2026-06-14-rust-indexing-core-phase-4-vscode-syntax-gap-full-rerun.raw.json');
    expect(doc).toContain('#88 is no longer a default-rollout blocker');
  });

  it('shows every real syntax-gap path moved out of the full VS Code parse-error set', () => {
    const targeted = JSON.parse(fs.readFileSync(TARGETED_RAW_PATH, 'utf8')) as {
      selectedPaths: string[];
      result: { filesErrored: number };
    };
    const full = JSON.parse(fs.readFileSync(FULL_RAW_PATH, 'utf8')) as {
      result: { filesIndexed: number; filesErrored: number; errors: Array<{ message: string }> };
    };

    expect(targeted.selectedPaths).toEqual(REAL_SYNTAX_GAP_PATHS);
    expect(targeted.result.filesErrored).toBe(0);
    expect(full.result.filesIndexed).toBe(11291);
    expect(full.result.filesErrored).toBe(29);

    const remainingErrors = new Set(full.result.errors.map((error) => error.message.replace(/: parse error$/, '')));
    for (const realPath of REAL_SYNTAX_GAP_PATHS) {
      expect(remainingErrors.has(realPath)).toBe(false);
    }
  });
});
