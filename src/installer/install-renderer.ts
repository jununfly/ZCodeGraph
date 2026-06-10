/**
 * InstallRenderer — separates "how we display install progress" from
 * "what we install." Each renderer implementation handles one mode
 * (interactive clack prompts, non-interactive script output, test
 * capture).
 *
 * Candidate 6: Installer target adapter contract hardening.
 */

import type { InstallPlan } from './install-plan';
import type { AgentTarget, WriteResult } from './targets/types';
import type { CommandContext } from '../cli/command-context';

// ============================================================
// InstallRenderer interface
// ============================================================

/**
 * Renders an install plan's lifecycle: intro → plan summary → per-target
 * execution → outro.
 *
 * Each method is a discrete rendering step. The orchestrator calls them
 * in order between the corresponding execution steps.
 */
export interface InstallRenderer {
  /** Display the intro/banner before any work starts. */
  intro(version: string): void;

  /** Display a summary of what the plan will do. */
  planSummary(plan: InstallPlan): void;

  /** Display a per-target install result (one call per target). */
  targetResult(target: AgentTarget, result: WriteResult): void;

  /** Display a warning message. */
  warn(message: string): void;

  /** Display an info message. */
  info(message: string): void;

  /** Display a success message. */
  success(message: string): void;

  /** Display an error message. */
  error(message: string): void;

  /** Display the outro/footer after all work is done. */
  outro(message: string): void;

  /** Display a "note" (e.g. "Quick start" hint). */
  note(message: string, title?: string): void;

  /** Start a spinner with the given message. Returns a stop function. */
  spinnerStart(message: string): () => void;
}

// ============================================================
// NonInteractiveRenderer
// ============================================================

/**
 * Renders install progress using CommandContext (stdout/stderr).
 * Suitable for --yes mode, CI, and scripting.
 */
export class NonInteractiveRenderer implements InstallRenderer {
  constructor(private ctx: CommandContext) {}

  private _out(text: string): void {
    this.ctx.stdout.write(text);
  }

  private _err(text: string): void {
    this.ctx.stderr.write(text);
  }

  intro(version: string): void {
    this._out(`CodeGraph v${version}\n`);
  }

  planSummary(plan: InstallPlan): void {
    const names = plan.targets.map((t) => t.displayName).join(', ');
    this._out(`Targets: ${names || '(none)'}\n`);
    this._out(`Location: ${plan.location}\n`);
    if (plan.installCli) {
      this._out('Installing CLI on PATH...\n');
    }
  }

  targetResult(target: AgentTarget, result: WriteResult): void {
    for (const file of result.files) {
      const verb = file.action === 'unchanged'
        ? 'Unchanged'
        : file.action === 'created' ? 'Created'
          : file.action === 'removed' ? 'Removed'
            : 'Updated';
      this._out(`${target.displayName}: ${verb} ${file.path}\n`);
    }
    for (const note of result.notes ?? []) {
      this._out(`${target.displayName}: ${note}\n`);
    }
  }

  warn(message: string): void {
    this._err(`[warn] ${message}\n`);
  }

  info(message: string): void {
    this._out(`[info] ${message}\n`);
  }

  success(message: string): void {
    this._out(`[ok] ${message}\n`);
  }

  error(message: string): void {
    this._err(`[error] ${message}\n`);
  }

  outro(message: string): void {
    this._out(`${message}\n`);
  }

  note(message: string, title?: string): void {
    if (title) {
      this._out(`${title}: ${message}\n`);
    } else {
      this._out(`${message}\n`);
    }
  }

  spinnerStart(_message: string): () => void {
    // Non-interactive: no spinner, just log the message.
    this._out(`${_message}\n`);
    return () => {}; // no-op stop
  }
}

// ============================================================
// TestRenderer
// ============================================================

/**
 * Captures all rendering output in-memory for test assertions.
 */
export interface TestRendererOutput {
  intro: string[];
  planSummary: string[];
  targetResults: Array<{ target: string; lines: string[] }>;
  warns: string[];
  infos: string[];
  successes: string[];
  errors: string[];
  outros: string[];
  notes: Array<{ title?: string; message: string }>;
  spinners: Array<{ message: string; stopped: boolean }>;
}

export class TestRenderer implements InstallRenderer {
  output: TestRendererOutput = {
    intro: [],
    planSummary: [],
    targetResults: [],
    warns: [],
    infos: [],
    successes: [],
    errors: [],
    outros: [],
    notes: [],
    spinners: [],
  };

  private _spinnerIndex = 0;

  intro(version: string): void {
    this.output.intro.push(version);
  }

  planSummary(plan: InstallPlan): void {
    this.output.planSummary.push(
      `targets=${plan.targets.map(t => t.id).join(',')}`,
      `location=${plan.location}`,
      `autoAllow=${plan.autoAllow}`,
      `installCli=${plan.installCli}`,
      `initProject=${plan.initializeProject}`,
    );
  }

  targetResult(target: AgentTarget, result: WriteResult): void {
    const lines: string[] = [];
    for (const file of result.files) {
      lines.push(`${file.action}:${file.path}`);
    }
    for (const note of result.notes ?? []) {
      lines.push(`note:${note}`);
    }
    this.output.targetResults.push({ target: target.id, lines });
  }

  warn(message: string): void {
    this.output.warns.push(message);
  }

  info(message: string): void {
    this.output.infos.push(message);
  }

  success(message: string): void {
    this.output.successes.push(message);
  }

  error(message: string): void {
    this.output.errors.push(message);
  }

  outro(message: string): void {
    this.output.outros.push(message);
  }

  note(message: string, title?: string): void {
    this.output.notes.push({ title, message });
  }

  spinnerStart(message: string): () => void {
    const idx = this._spinnerIndex++;
    this.output.spinners.push({ message, stopped: false });
    return () => {
      const entry = this.output.spinners[idx];
      if (entry) {
        entry.stopped = true;
      }
    };
  }
}
