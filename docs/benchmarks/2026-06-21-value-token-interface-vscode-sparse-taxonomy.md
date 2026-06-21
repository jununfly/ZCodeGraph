# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T14:41:47.857Z
## Source
- Profile: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-TxJ39s/.zcodegraph/value-token-interface-rust-profile.json`
- Database: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-TxJ39s/.zcodegraph/zcodegraph.db`
- Source root: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-TxJ39s`
- Source files read for bounded syntax metadata: 24
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: value-token-plus-interface
- Recommended next slice: candidate for next routing slice: value-token-plus-interface
- Overload implementation resolved refs: 3766
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 3 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| value-token-plus-interface | 80 | needs-more-metadata |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: none

## Collision Subtypes

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |
| value-token-plus-interface | 80 | candidate-for-next-routing-slice |

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant
- `relativePath` from `src/vs/platform/agentHost/node/agentHostFileCompletionProvider.ts` (typescript:10:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `h` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:15:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/list/listWidget.ts` (typescript:23:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/menu/menubar.ts` (typescript:20:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/pixelSpinner/pixelSpinner.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/scrollbar/scrollableElement.ts` (typescript:17:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/splitview/splitview.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### value-token-plus-interface

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IContextViewService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:13:0) -> `src/vs/platform/contextview/browser/contextView.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IHoverService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:14:0) -> `src/vs/platform/hover/browser/hover.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IKeybindingService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:18:0) -> `src/vs/platform/keybinding/common/keybinding.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `ILayoutService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:19:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IOpenerService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:20:0) -> `src/vs/platform/opener/common/opener.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
