/**
 * InstallPlan + buildInstallPlan Tests
 *
 * Tests for the InstallPlan data structure and buildInstallPlan() pure
 * function. The plan is the separation between "what should we do" and
 * "how do we render it" — all plan logic is pure, no I/O.
 *
 * TDD tracer bullets per zj-tdd:
 *   TB1: InstallPlan type + buildInstallPlan() (this file)
 *   TB2: InstallRenderer interface + InstallPlanRenderer (next)
 */

import { describe, it, expect } from 'vitest';
import type { AgentTarget, Location, DetectionResult, WriteResult, InstallOptions } from '../src/installer/targets/types';
import type { TargetId } from '../src/installer/targets/types';

// ============================================================
// Test doubles — minimal AgentTarget stubs
// ============================================================

function makeStubTarget(
  id: TargetId,
  overrides: Partial<{
    supportsLocal: boolean;
    installed: boolean;
    alreadyConfigured: boolean;
  }> = {},
): AgentTarget {
  const {
    supportsLocal = true,
    installed = false,
    alreadyConfigured = false,
  } = overrides;

  return {
    id,
    displayName: id.charAt(0).toUpperCase() + id.slice(1),
    supportsLocation(loc: Location): boolean {
      return loc === 'global' || supportsLocal;
    },
    detect(_loc: Location): DetectionResult {
      return { installed, alreadyConfigured };
    },
    install(_loc: Location, _opts: InstallOptions): WriteResult {
      return { files: [] };
    },
    uninstall(_loc: Location): WriteResult {
      return { files: [] };
    },
    printConfig(_loc: Location): string {
      return `{}`;
    },
    describePaths(_loc: Location): string[] {
      return [];
    },
  };
}

// ============================================================
// Import the module under test (will fail RED until written)
// ============================================================

import {
  buildInstallPlan,
  type InstallPlan,
  type BuildInstallPlanInput,
} from '../src/installer/install-plan';

// ============================================================
// TB1: buildInstallPlan — non-interactive (--yes)
// ============================================================

describe('buildInstallPlan — non-interactive (yes=true)', () => {
  const allTargets: AgentTarget[] = [
    makeStubTarget('claude', { installed: true }),
    makeStubTarget('cursor', { installed: true }),
    makeStubTarget('codex', { supportsLocal: false, installed: false }),
    makeStubTarget('opencode', { installed: false }),
  ];

  it('yes=true → location=global, autoAllow=true, target=auto', () => {
    const input: BuildInstallPlanInput = {
      opts: { yes: true },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.location).toBe('global');
    expect(plan.autoAllow).toBe(true);
    expect(plan.installCli).toBe(false); // yes skips npm install
    expect(plan.initializeProject).toBe(false); // global → no project init
    // auto = all detected as installed
    expect(plan.targets.map(t => t.id)).toEqual(['claude', 'cursor']);
  });

  it('yes=true with explicit target overrides auto-detect', () => {
    const input: BuildInstallPlanInput = {
      opts: { yes: true, target: 'all' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    // all targets, regardless of detection
    expect(plan.targets.map(t => t.id)).toEqual([
      'claude', 'cursor', 'codex', 'opencode',
    ]);
  });

  it('yes=true with explicit location overrides default', () => {
    const input: BuildInstallPlanInput = {
      opts: { yes: true, location: 'local' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.location).toBe('local');
    expect(plan.initializeProject).toBe(true); // local → project init
  });

  it('yes=true with explicit autoAllow=false', () => {
    const input: BuildInstallPlanInput = {
      opts: { yes: true, autoAllow: false },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.autoAllow).toBe(false);
  });

  it('target=none → empty targets', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'none' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.targets).toHaveLength(0);
  });

  it('unknown target throws', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'unknown-agent' },
      allTargets,
      cwd: '/test/project',
    };

    expect(() => buildInstallPlan(input)).toThrow(/unknown/i);
  });
});

// ============================================================
// TB2: buildInstallPlan — explicit flags (no --yes)
// ============================================================

describe('buildInstallPlan — explicit flags', () => {
  const allTargets: AgentTarget[] = [
    makeStubTarget('claude'),
    makeStubTarget('cursor'),
    makeStubTarget('codex', { supportsLocal: false }),
    makeStubTarget('hermes'),
  ];

  it('explicit target list via comma-separated string', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude,hermes' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.targets.map(t => t.id)).toEqual(['claude', 'hermes']);
  });

  it('explicit location=local', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude', location: 'local' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.location).toBe('local');
    expect(plan.initializeProject).toBe(true);
  });

  it('explicit autoAllow=false', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude', autoAllow: false },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.autoAllow).toBe(false);
  });

  it('autoAllow defaults to true when claude is in targets', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.autoAllow).toBe(true);
  });

  it('autoAllow defaults to false when claude is not in targets', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'cursor' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.autoAllow).toBe(false);
  });

  it('location defaults to global when explicit target given', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude' },
      allTargets,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.location).toBe('global');
    expect(plan.initializeProject).toBe(false);
  });
});

// ============================================================
// TB3: buildInstallPlan — interactive defaults (no flags at all)
// ============================================================

describe('buildInstallPlan — interactive defaults', () => {
  const allTargets: AgentTarget[] = [
    makeStubTarget('claude', { installed: true, alreadyConfigured: true }),
    makeStubTarget('cursor', { installed: false }),
    makeStubTarget('codex', { supportsLocal: false, installed: false }),
  ];

  it('with interactive targets supplied → uses them', () => {
    const input: BuildInstallPlanInput = {
      opts: {},
      allTargets,
      interactiveTargets: ['claude', 'codex'],
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.targets.map(t => t.id)).toEqual(['claude', 'codex']);
  });

  it('with interactive location supplied → uses it', () => {
    const input: BuildInstallPlanInput = {
      opts: {},
      allTargets,
      interactiveTargets: ['claude'],
      interactiveLocation: 'local',
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.location).toBe('local');
    expect(plan.initializeProject).toBe(true);
  });

  it('with interactive autoAllow supplied → uses it', () => {
    const input: BuildInstallPlanInput = {
      opts: {},
      allTargets,
      interactiveTargets: ['claude'],
      interactiveAutoAllow: false,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.autoAllow).toBe(false);
  });

  it('with interactive installCli=true', () => {
    const input: BuildInstallPlanInput = {
      opts: {},
      allTargets,
      interactiveTargets: ['claude'],
      interactiveInstallCli: true,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.installCli).toBe(true);
  });

  it('with interactive installCli=false', () => {
    const input: BuildInstallPlanInput = {
      opts: {},
      allTargets,
      interactiveTargets: ['claude'],
      interactiveInstallCli: false,
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.installCli).toBe(false);
  });

  it('allGlobalOnly=true → location forced to global even with interactive local', () => {
    // codex is global-only; claude supports both
    const targets: AgentTarget[] = [
      makeStubTarget('claude', { installed: true }),
      makeStubTarget('codex', { supportsLocal: false }),
    ];

    const input: BuildInstallPlanInput = {
      opts: {},
      allTargets: targets,
      interactiveTargets: ['codex'], // only codex selected
      interactiveLocation: 'local',
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    // codex is global-only, so location is forced to global
    expect(plan.location).toBe('global');
    expect(plan.initializeProject).toBe(false);
  });
});

// ============================================================
// TB4: InstallPlan shape contract
// ============================================================

describe('InstallPlan shape', () => {
  it('is a plain object with expected keys', () => {
    const plan: InstallPlan = {
      targets: [],
      location: 'global',
      autoAllow: false,
      installCli: false,
      initializeProject: false,
    };

    expect(plan).toHaveProperty('targets');
    expect(plan).toHaveProperty('location');
    expect(plan).toHaveProperty('autoAllow');
    expect(plan).toHaveProperty('installCli');
    expect(plan).toHaveProperty('initializeProject');
  });

  it('targets are readonly AgentTarget instances', () => {
    const t = makeStubTarget('claude');
    const plan: InstallPlan = {
      targets: [t],
      location: 'global',
      autoAllow: false,
      installCli: false,
      initializeProject: false,
    };

    expect(plan.targets[0].id).toBe('claude');
    expect(plan.targets[0].displayName).toBe('Claude');
  });

  it('location is "global" or "local"', () => {
    const globalPlan: InstallPlan = {
      targets: [], location: 'global', autoAllow: false,
      installCli: false, initializeProject: false,
    };
    const localPlan: InstallPlan = {
      targets: [], location: 'local', autoAllow: false,
      installCli: false, initializeProject: true,
    };

    expect(['global', 'local']).toContain(globalPlan.location);
    expect(['global', 'local']).toContain(localPlan.location);
  });
});

// ============================================================
// TB5: buildInstallPlan — edge cases
// ============================================================

describe('buildInstallPlan — edge cases', () => {
  const allTargets: AgentTarget[] = [
    makeStubTarget('claude'),
  ];

  it('empty allTargets + target=auto → no crash', () => {
    const input: BuildInstallPlanInput = {
      opts: { yes: true },
      allTargets: [],
      cwd: '/test/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.targets).toHaveLength(0);
  });

  it('cwd is passed through to plan (for future use)', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude' },
      allTargets,
      cwd: '/my/special/project',
    };

    const plan = buildInstallPlan(input);

    expect(plan.cwd).toBe('/my/special/project');
  });

  it('plan is deterministic — same input → same output', () => {
    const input: BuildInstallPlanInput = {
      opts: { target: 'claude', location: 'global', autoAllow: true },
      allTargets,
      cwd: '/test',
    };

    const plan1 = buildInstallPlan(input);
    const plan2 = buildInstallPlan(input);

    expect(plan1).toEqual(plan2);
  });
});
