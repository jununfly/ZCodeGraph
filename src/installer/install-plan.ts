/**
 * InstallPlan — pure data structure describing what the installer should do.
 *
 * Separated from the interactive/non-interactive rendering so the plan
 * can be built by pure logic and rendered by an injected InstallRenderer.
 *
 * Candidate 6: Installer target adapter contract hardening.
 */

import type { AgentTarget, Location } from './targets/types';
import type { RunInstallerOptions } from './index';

// ============================================================
// InstallPlan
// ============================================================

/**
 * A complete, resolved install plan. All fields are concrete values —
 * no "maybe" or "ask the user" left. The renderer uses this to decide
 * what to show; the orchestrator uses it to decide what to execute.
 */
export interface InstallPlan {
  /** The agent targets to configure. */
  targets: readonly AgentTarget[];
  /** Where config files land: global (~/.claude etc) or local (./.claude etc). */
  location: Location;
  /** Whether to write auto-allow permissions (Claude settings.json). */
  autoAllow: boolean;
  /** Whether to run `npm install -g` for the CLI. */
  installCli: boolean;
  /** Whether to run CodeGraph.init() + index for the current project. */
  initializeProject: boolean;
  /** The project directory (cwd), for reference. */
  cwd: string;
}

// ============================================================
// BuildInstallPlanInput
// ============================================================

/**
 * Input to buildInstallPlan(). Accepts CLI flags and optional
 * interactive choices (from a renderer). When interactive fields are
 * supplied they take precedence over CLI defaults; when absent, CLI
 * flags (or their defaults) are used.
 */
export interface BuildInstallPlanInput {
  /** CLI options from `zcodegraph install`. */
  opts: RunInstallerOptions;
  /** All known agent targets (the registry). */
  allTargets: readonly AgentTarget[];
  /** Current working directory. */
  cwd: string;

  // --- Interactive overrides (supplied by a renderer after prompting) ---

  /** Targets the user selected interactively (as TargetId strings). */
  interactiveTargets?: string[];
  /** Location the user chose interactively. */
  interactiveLocation?: Location;
  /** autoAllow choice from interactive prompt. */
  interactiveAutoAllow?: boolean;
  /** Whether the user chose to install the CLI globally. */
  interactiveInstallCli?: boolean;
}

// ============================================================
// buildInstallPlan
// ============================================================

/**
 * Build a resolved InstallPlan from CLI options and optional
 * interactive choices. Pure function — no I/O, no prompts.
 *
 * Resolution order:
 *   1. Explicit CLI flags always win.
 *   2. --yes mode fills defaults for anything not explicitly set.
 *   3. Interactive choices fill what CLI didn't specify.
 *   4. Remaining fields get sensible defaults.
 */
export function buildInstallPlan(input: BuildInstallPlanInput): InstallPlan {
  const { opts, allTargets, cwd } = input;
  const useDefaults = opts.yes === true;

  // --- targets ---
  let targets: AgentTarget[];
  if (opts.target !== undefined) {
    // Explicit --target flag: resolve against the provided allTargets.
    targets = resolveTargetsFromList(opts.target, allTargets);
  } else if (input.interactiveTargets && input.interactiveTargets.length > 0) {
    // Interactive multiselect result.
    targets = resolveTargetsFromList(
      input.interactiveTargets.join(','),
      allTargets,
    );
  } else if (useDefaults) {
    // --yes → auto-detect.
    targets = resolveTargetsFromList('auto', allTargets);
  } else {
    // No targets specified and not interactive → empty (caller should
    // not reach this; the renderer should have prompted first).
    targets = [];
  }

  // --- location ---
  let location: Location;
  if (opts.location) {
    location = opts.location;
  } else if (useDefaults) {
    location = 'global';
  } else if (input.interactiveLocation) {
    // Interactive choice — but if all selected targets are global-only,
    // force global regardless of what the user picked.
    const allGlobalOnly =
      targets.length > 0 && targets.every((t) => !t.supportsLocation('local'));
    location = allGlobalOnly ? 'global' : input.interactiveLocation;
  } else {
    location = 'global'; // default
  }

  // --- autoAllow ---
  let autoAllow: boolean;
  if (opts.autoAllow !== undefined) {
    autoAllow = opts.autoAllow;
  } else if (input.interactiveAutoAllow !== undefined) {
    autoAllow = input.interactiveAutoAllow;
  } else if (useDefaults) {
    autoAllow = true;
  } else {
    // Default: true if Claude is among the targets (it's the only one
    // that uses permissions), false otherwise.
    autoAllow = targets.some((t) => t.id === 'claude');
  }

  // --- installCli ---
  let installCli: boolean;
  if (input.interactiveInstallCli !== undefined) {
    installCli = input.interactiveInstallCli;
  } else if (useDefaults) {
    installCli = false; // --yes skips npm install
  } else {
    installCli = false; // default: skip (user didn't confirm)
  }

  // --- initializeProject ---
  const initializeProject = location === 'local';

  return {
    targets,
    location,
    autoAllow,
    installCli,
    initializeProject,
    cwd,
  };
}

// ============================================================
// Internal: resolve targets against a specific list
// ============================================================

/**
 * Like registry.resolveTargetFlag(), but against a caller-supplied
 * list rather than the global ALL_TARGETS. This makes buildInstallPlan
 * testable with stub targets.
 */
function resolveTargetsFromList(
  value: string,
  allTargets: readonly AgentTarget[],
): AgentTarget[] {
  if (value === 'none') return [];
  if (value === 'all') return [...allTargets];
  if (value === 'auto') {
    const detected = allTargets.filter((t) => t.detect('global').installed);
    if (detected.length > 0) return detected;
    // Fallback to claude
    const fallback = allTargets.find((t) => t.id === 'claude');
    return fallback ? [fallback] : [];
  }

  const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
  const resolved: AgentTarget[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const t = allTargets.find((a) => a.id === id);
    if (t) resolved.push(t);
    else unknown.push(id);
  }
  if (unknown.length > 0) {
    const known = allTargets.map((t) => t.id).join(', ');
    throw new Error(
      `Unknown target id(s): ${unknown.join(', ')}. Known: ${known}, plus 'auto' / 'all' / 'none'.`,
    );
  }
  return resolved;
}
