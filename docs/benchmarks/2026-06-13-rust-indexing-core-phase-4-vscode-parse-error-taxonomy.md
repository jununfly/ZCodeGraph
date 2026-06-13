# Rust Indexing Core Phase 4 VS Code Parse-Error Taxonomy

Issue: [#86](https://github.com/jununfly/ZCodeGraph/issues/86)

Source artifact: `docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json`

Parent large-target evidence: [Rust Indexing Core Phase 4 Large-Target Readiness](2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md)

## Summary

The VS Code large-target Rust profile reported 46 parse errors. Phase 4 does
not require zero parse errors on this target, but it does require a taxonomy so
default-rollout decisions do not hide real JS/TS parser coverage gaps.

Taxonomy counts:

| Category | Count | Follow-up |
| --- | ---: | --- |
| Intentional invalid fixture / malformed test input | 15 | none |
| Generated or prompt-heavy source not meant as normal app code | 15 | none |
| Real supported JS/TS syntax gap | 16 | [#88](https://github.com/jununfly/ZCodeGraph/issues/88) |
| Unknown | 0 | none |

Unknown share is 0/46, so the taxonomy itself does not block default rollout.
The real supported JS/TS syntax-gap bucket remains a default rollout blocker
until #88 is resolved or the limitations are explicitly accepted.

## Classification Table

| Path | Category | Rationale |
| --- | --- | --- |
| `build/next/index.ts` | Real supported JS/TS syntax gap | Normal build source; uses supported TypeScript/ESM syntax such as JSON import attributes. |
| `extensions/copilot/src/extension/byok/vscode-node/test/geminiNativeProvider.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/claude/vscode-node/test/claudeSlashCommandService.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/copilotcli/node/test/copilotcliSession.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/chatSessionMetadataStoreImpl.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/chatSessions/copilotcli/vscode-node/test/lockFile.spec.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `extensions/copilot/src/extension/prompt/node/intentDetector.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/executionSubagentPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt51CodexPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt51Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt52Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt53CodexPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt54Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt55BasePrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/openai/gpt5Prompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/agent/test/copilotCLIPrompt.spec.ts` | Generated or prompt-heavy source not meant as normal app code | Prompt-focused test source; useful for prompt rendering, not a representative app-code parser gate. |
| `extensions/copilot/src/extension/prompts/node/agent/vscModelPrompts.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/base/copilotIdentity.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/panel/panelChatFixPrompt.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/panel/search.tsx` | Generated or prompt-heavy source not meant as normal app code | Prompt TSX source that renders prompt markup rather than ordinary application logic. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/5710.selection.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.selection.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/extHost.api.impl.summarized.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/strings.test-example.3.summarized.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/prompts/node/test/fixtures/vscode.proposed.chatParticipantAdditions.d.selection.ts` | Intentional invalid fixture / malformed test input | Prompt fixture with selected/summarized source fragments, not a normal compilable module. |
| `extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p1/source/f4.ts` | Intentional invalid fixture / malformed test input | TypeScript-context fixture source, not a representative app-code parser gate. |
| `extensions/copilot/src/extension/typescriptContext/serverPlugin/fixtures/context/p14/source/f2.ts` | Intentional invalid fixture / malformed test input | TypeScript-context fixture source, not a representative app-code parser gate. |
| `extensions/copilot/src/extension/typescriptContext/serverPlugin/src/common/typescripts.ts` | Real supported JS/TS syntax gap | Normal TypeScript source; includes namespace/type patterns that should be reduced under #88. |
| `extensions/copilot/src/platform/telemetry/common/telemetry.ts` | Real supported JS/TS syntax gap | Normal TypeScript source with decorators/parameter injection; not a malformed fixture. |
| `extensions/copilot/test/scenarios/test-cli/wkspc1/stringUtils.js` | Intentional invalid fixture / malformed test input | Scenario fixture contains intentionally incomplete JavaScript. |
| `extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_comma_expected.ts` | Intentional invalid fixture / malformed test input | Fixing fixture intentionally contains syntax/lint errors. |
| `extensions/copilot/test/simulation/fixtures/fixing/typescript/eslint_unexpected_token.ts` | Intentional invalid fixture / malformed test input | Fixing fixture intentionally contains syntax/lint errors. |
| `extensions/copilot/test/simulation/fixtures/fixing/typescript/tsc_error_1128.ts` | Intentional invalid fixture / malformed test input | Fixing fixture intentionally contains TypeScript compiler errors. |
| `extensions/vscode-colorize-perf-tests/test/colorize-fixtures/test-checker.ts` | Generated or prompt-heavy source not meant as normal app code | Copied TypeScript compiler-scale colorization fixture, not normal application source. |
| `src/vs/code/electron-browser/workbench/workbench.ts` | Real supported JS/TS syntax gap | Normal VS Code source; includes type declarations inside an async IIFE. |
| `src/vs/platform/agentHost/node/claude/claudeSubagentSignals.ts` | Real supported JS/TS syntax gap | Normal TypeScript source, not an intentionally malformed fixture. |
| `src/vs/platform/browserView/electron-browser/preload-browserView.ts` | Real supported JS/TS syntax gap | Normal TypeScript preload source, not an intentionally malformed fixture. |
| `src/vs/platform/files/test/node/fixtures/resolver/examples/employee.js` | Intentional invalid fixture / malformed test input | Resolver fixture, not a normal application module. |
| `src/vs/platform/files/test/node/fixtures/resolver/other/deep/employee.js` | Intentional invalid fixture / malformed test input | Resolver fixture, not a normal application module. |
| `src/vs/platform/files/test/node/fixtures/service/deep/employee.js` | Intentional invalid fixture / malformed test input | Resolver fixture, not a normal application module. |
| `src/vs/platform/tunnel/test/node/tunnelProxy.test.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `src/vs/sessions/electron-browser/sessions.ts` | Real supported JS/TS syntax gap | Normal VS Code source; includes type declarations inside an async IIFE. |
| `src/vs/workbench/contrib/chat/test/common/promptSyntax/hookSchema.test.ts` | Real supported JS/TS syntax gap | Normal TypeScript test source, not an intentionally malformed fixture. |
| `src/vs/workbench/contrib/issue/browser/issueFormService.ts` | Real supported JS/TS syntax gap | Normal TypeScript source with decorators/parameter injection; not a malformed fixture. |
| `src/vs/workbench/contrib/terminal/test/browser/terminalProfileService.integrationTest.ts` | Real supported JS/TS syntax gap | Normal TypeScript integration test source, not an intentionally malformed fixture. |
| `src/vs/workbench/services/search/test/node/fixtures/examples/employee.js` | Intentional invalid fixture / malformed test input | Search fixture, not a normal application module. |

## Decision Impact

This taxonomy removes the generic "unknown parse errors" blocker from Phase 4.
It does not make Rust ready for default rollout: #88 remains open for the 16
real supported JS/TS syntax-gap paths, and #87 remains open for the large-repo
reference-resolution bottleneck.
