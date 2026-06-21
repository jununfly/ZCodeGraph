# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T09:28:51.261Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: function-overload-signature
- Recommended next slice: resolve prerequisite for function-overload-signature before tie-break
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 85 | prerequisite-first |
| type-value-namespace-collision | 13 | no-go-keep-fallback |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `addDisposableListener` from `src/vs/base/browser/dnd.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:8:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/button/button.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `append` from `src/vs/base/browser/ui/countBadge/countBadge.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:8:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `append` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### type-value-namespace-collision

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:12:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:13:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:14:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:15:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
