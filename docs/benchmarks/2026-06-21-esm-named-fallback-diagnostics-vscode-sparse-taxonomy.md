# ESM Named Binding Fallback Taxonomy
Generated: 2026-06-21T02:08:31.810Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples`
- Source files read: none
- Database opened: false
## Summary
- Rows inspected: 720
- Candidate next slice: investigate direct export candidate gaps (29584 reported)
## Reasons
| Reason group | Count |
| --- | ---: |
| directExportCandidateGap | 29584 |
| importEdgeTargetGap | 5783 |
| packageOrRuntimeBoundary | 1965 |
| reexportCandidateGap | 143 |
| typeOnlyBoundary | 2759 |
| unsupportedImportShape | 2083 |

## Candidate next slice

investigate direct export candidate gaps (29584 reported)

## Examples

### directExportCandidateGap

- `IReader` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `observableSignal` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `Disposable` from `src/vs/base/browser/broadcast.ts` (typescript:9:0) -> `src/vs/base/common/lifecycle.ts` candidates=0 via direct-export
- `ResolvedKeybinding` from `src/vs/base/browser/contextmenu.ts` (typescript:11:0) -> `src/vs/base/common/keybindings.ts` candidates=0 via direct-export
- `Disposable` from `src/vs/base/browser/dnd.ts` (typescript:7:0) -> `src/vs/base/common/lifecycle.ts` candidates=0 via direct-export
- `BrowserFeatures` from `src/vs/base/browser/dom.ts` (typescript:7:0) -> `src/vs/base/browser/canIUse.ts` candidates=0 via direct-export
- `AbstractIdleValue` from `src/vs/base/browser/dom.ts` (typescript:10:0) -> `src/vs/base/common/async.ts` candidates=0 via direct-export
- `KeyCode` from `src/vs/base/browser/dom.ts` (typescript:13:0) -> `src/vs/base/common/keyCodes.ts` candidates=0 via direct-export
- `Disposable` from `src/vs/base/browser/dom.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` candidates=0 via direct-export
- `IObservable` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export

### importEdgeTargetGap

- `convertTagToPlaintext` from `src/vs/base/browser/markdownRenderer.ts` (typescript:22:0)
- `localize` from `src/vs/base/browser/ui/button/button.ts` (typescript:23:0)
- `localize` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:7:0)
- `localize` from `src/vs/base/browser/ui/hover/hoverWidget.ts` (typescript:12:0)
- `localize` from `src/vs/base/browser/ui/icons/iconSelectBox.ts` (typescript:14:0)
- `localize` from `src/vs/base/browser/ui/keybindingLabel/keybindingLabel.ts` (typescript:16:0)
- `localize` from `src/vs/base/browser/ui/progressbar/progressbar.ts` (typescript:11:0)
- `localize` from `src/vs/base/browser/ui/selectBox/selectBoxCustom.ts` (typescript:6:0)
- `localize` from `src/vs/base/browser/ui/splitview/paneview.ts` (typescript:19:0)
- `localize` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:36:0)

### packageOrRuntimeBoundary

- `TrustedTypePolicy` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `TrustedTypesWindow` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `TrustedHTML` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `crypto` from `src/vs/base/node/crypto.ts` (typescript:6:0)
- `fs` from `src/vs/base/node/crypto.ts` (typescript:7:0)
- `os` from `src/vs/base/node/id.ts` (typescript:6:0)
- `networkInterfaces` from `src/vs/base/node/id.ts` (typescript:6:0)
- `os` from `src/vs/base/node/macAddress.ts` (typescript:6:0)
- `networkInterfaces` from `src/vs/base/node/macAddress.ts` (typescript:6:0)
- `fs` from `src/vs/base/node/nls.ts` (typescript:7:0)

### reexportCandidateGap

- `AnchorAlignment` from `src/vs/base/browser/contextmenu.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAxisAlignment` from `src/vs/base/browser/contextmenu.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/browser/ui/centered/centeredViewLayout.ts` (typescript:9:0) -> `src/vs/base/browser/ui/splitview/splitview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:10:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:19:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/inputbox/inputBox.ts` (typescript:13:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorPosition` from `src/vs/base/browser/ui/selectBox/selectBoxCustom.ts` (typescript:19:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/browser/ui/table/tableWidget.ts` (typescript:12:0) -> `src/vs/base/browser/ui/splitview/splitview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/toolbar/toolbar.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/test/browser/ui/grid/grid.test.ts` (typescript:7:0) -> `src/vs/base/browser/ui/grid/grid.ts` candidates=0 via one-hop-reexport

### typeOnlyBoundary

- `IJSONSchemaSnippet` from `src/vs/base/browser/fonts.ts` (typescript:7:0)
- `IManagedHover` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:22:0)
- `IManagedHoverContent` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:22:0)
- `IManagedHover` from `src/vs/base/browser/ui/button/button.ts` (typescript:24:0)
- `IManagedHover` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:11:0)
- `IActionViewItemProvider` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:17:0)
- `IHoverLifecycleOptions` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:22:0)
- `SplitView` from `src/vs/base/browser/ui/grid/grid.ts` (typescript:12:0)
- `AutoSizing` from `src/vs/base/browser/ui/grid/grid.ts` (typescript:12:0)
- `IManagedHover` from `src/vs/base/browser/ui/highlightedlabel/highlightedLabel.ts` (typescript:7:0)

### unsupportedImportShape

- `Event` from `src/vs/base/browser/event.ts` (typescript:7:0) -> `src/vs/base/common/event.ts`
- `basename` from `src/vs/base/browser/markdownRenderer.ts` (typescript:16:0) -> `src/vs/base/common/path.ts`
- `Event` from `src/vs/base/browser/touch.ts` (typescript:9:0) -> `src/vs/base/common/event.ts`
- `EventType` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:9:0) -> `src/vs/base/browser/touch.ts`
- `EventType` from `src/vs/base/browser/ui/button/button.ts` (typescript:10:0) -> `src/vs/base/browser/touch.ts`
- `Event` from `src/vs/base/browser/ui/button/button.ts` (typescript:17:0) -> `src/vs/base/common/event.ts`
- `IView` from `src/vs/base/browser/ui/centered/centeredViewLayout.ts` (typescript:9:0) -> `src/vs/base/browser/ui/splitview/splitview.ts`
- `EventType` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:9:0) -> `src/vs/base/browser/touch.ts`
- `IMessage` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:12:0) -> `src/vs/base/browser/ui/inputbox/inputBox.ts`
- `IMessage` from `src/vs/base/browser/ui/findinput/replaceInput.ts` (typescript:12:0) -> `src/vs/base/browser/ui/inputbox/inputBox.ts`
