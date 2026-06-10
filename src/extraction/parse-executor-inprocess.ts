/**
 * In-Process Parse Executor
 *
 * Calls extractFromSource() directly in the main thread. Used when:
 *   - Worker threads are unavailable (e.g., bundled/standalone builds)
 *   - Testing (no worker thread overhead)
 *   - Explicit opt-in via useWorker = false
 */

import type { Language, ExtractionResult } from '../types';
import type { ParseExecutor, ParseRequest, ParseExecutionResult } from './parse-executor-types';
import { extractFromSource } from './tree-sitter';
import { detectLanguage, initGrammars } from './grammars';

export class InProcessParseExecutor implements ParseExecutor {
  readonly name = 'in-process';
  private _frameworkNames: string[] = [];
  private _initialized = false;

  async initialize(_languages: Language[], frameworkNames: string[]): Promise<void> {
    if (this._initialized) return;
    await initGrammars();
    this._frameworkNames = frameworkNames;
    this._initialized = true;
  }

  async parse(request: ParseRequest): Promise<ParseExecutionResult> {
    if (!this._initialized) {
      throw new Error('InProcessParseExecutor not initialized');
    }

    const language = detectLanguage(request.filePath, request.content);
    const result: ExtractionResult = extractFromSource(
      request.filePath,
      request.content,
      language,
      this._frameworkNames
    );

    return {
      result,
      fromWorker: false,
      retryCount: 0,
    };
  }

  async dispose(): Promise<void> {
    this._initialized = false;
  }
}
