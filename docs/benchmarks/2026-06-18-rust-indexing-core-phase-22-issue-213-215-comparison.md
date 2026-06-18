# Rust Indexing Evidence Comparison

Before: rust-indexing-core-issue-210-post-209-scoreboard
After: rust-indexing-core-issue-211-rust-core-sqlite-write-after
Before classification: failed-required-performance-gate-unmet
After classification: failed-required-performance-gate-unmet

Rust default rollout readiness is not claimed by this comparison.

## Target Matrix

| Target | Class | Required | Empty corpus | Sufficiency | Rust graphStats |
|---|---|---:|---|---|---|
| zcodegraph | required | yes | valid | passed | unchanged |
| excalidraw | required | yes | valid | passed | unchanged |
| vscode | stress | no | valid | passed | unchanged |

## Wall Time and RSS

| Target | Before Rust ms | After Rust ms | Rust wall delta | Before sqliteWriteMs | After sqliteWriteMs | sqliteWrite delta |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 7649 | 7579 | -0.92% | 1356 | 1038 | -23.45% |
| excalidraw | 14979 | 14020 | -6.40% | 2411 | 1831 | -24.06% |
| vscode | 570731 | 577634 | +1.21% | 133042 | 126307 | -5.06% |

| Target | Before Rust RSS | After Rust RSS | Rust RSS delta |
|---|---:|---:|---:|
| zcodegraph | 52854784 | 52609024 | -0.46% |
| excalidraw | 53411840 | 53133312 | -0.52% |
| vscode | 39141376 | 17776640 | -54.58% |

## Profile Buckets

| Target | Bucket | Before ms | After ms | Delta |
|---|---|---:|---:|---:|
| zcodegraph | sourceScanMs | 0 | 1 | n/a |
| zcodegraph | parseExtractionMs | 1059 | 1046 | -1.23% |
| zcodegraph | sqliteWriteMs | 1356 | 1038 | -23.45% |
| zcodegraph | importPathAliasResolutionMs | 90 | 81 | -10.00% |
| zcodegraph | esmNamedImportExportResolutionMs | 386 | 394 | +2.07% |
| zcodegraph | localExactReferenceResolutionMs | 1525 | 1532 | +0.46% |
| zcodegraph | subprocessStartupHandoffMs | 3 | 290 | +9566.67% |
| zcodegraph | TypeScript finalization | 725 | 716 | -1.24% |
| zcodegraph | cacheWarmupDbMs | 4 | 3 | -25.00% |
| zcodegraph | cacheWarmupMs | 4 | 4 | 0.00% |
| zcodegraph | candidateLookupCacheHitMs | 7 | 4 | -42.86% |
| zcodegraph | candidateLookupMs | 15 | 15 | 0.00% |
| zcodegraph | candidateReplayComparedRefs | 0 | 0 | n/a |
| zcodegraph | candidateReplayEligibleRefs | 0 | 0 | n/a |
| zcodegraph | candidateReplayEquivalentRefs | 0 | 0 | n/a |
| zcodegraph | candidateReplayMismatchRefs | 0 | 0 | n/a |
| zcodegraph | databaseAccessMs | 212 | 203 | -4.25% |
| zcodegraph | edgeMaterializationDbMs | 11 | 10 | -9.09% |
| zcodegraph | edgeMaterializationMs | 11 | 10 | -9.09% |
| zcodegraph | edgeWriteDbMs | 51 | 51 | 0.00% |
| zcodegraph | edgeWriteMs | 51 | 51 | 0.00% |
| zcodegraph | frameworkMatchingMs | 12 | 15 | +25.00% |
| zcodegraph | importResolutionMs | 40 | 45 | +12.50% |
| zcodegraph | nameMatcherCandidateLookupDbMs | 8 | 11 | +37.50% |
| zcodegraph | nameMatchingMs | 64 | 58 | -9.38% |
| zcodegraph | otherResolutionMs | 4 | 2 | -50.00% |
| zcodegraph | perReferenceDisambiguationMs | 52 | 47 | -9.62% |
| zcodegraph | refHydrationDbMs | 0 | 1 | n/a |
| zcodegraph | rustMatcherCandidateMaterializationMs | 0 | 0 | n/a |
| zcodegraph | rustMatcherEligibleRefs | 0 | 0 | n/a |
| zcodegraph | rustMatcherFallbackRefs | 0 | 0 | n/a |
| zcodegraph | rustMatcherHandledRefs | 0 | 0 | n/a |
| zcodegraph | rustMatcherMs | 0 | 0 | n/a |
| zcodegraph | rustMatcherPayloadBytes | 0 | 0 | n/a |
| zcodegraph | rustMatcherSemanticMismatchRefs | 0 | 0 | n/a |
| zcodegraph | rustMatcherSerializationMs | 0 | 0 | n/a |
| zcodegraph | rustMatcherStartupMs | 0 | 0 | n/a |
| zcodegraph | rustMatcherSubprocessMs | 0 | 0 | n/a |
| zcodegraph | rustMatcherTsVerificationMs | 0 | 0 | n/a |
| zcodegraph | rustMatcherUniqueCandidateFacts | 0 | 0 | n/a |
| zcodegraph | sharedCandidateLookupMs | 3 | 4 | +33.33% |
| zcodegraph | unresolvedCleanupDbMs | 119 | 114 | -4.20% |
| zcodegraph | unresolvedCleanupMs | 119 | 114 | -4.20% |
| zcodegraph | unresolvedReadDbMs | 27 | 24 | -11.11% |
| zcodegraph | unresolvedReadMs | 27 | 24 | -11.11% |
| excalidraw | sourceScanMs | 1 | 2 | +100.00% |
| excalidraw | parseExtractionMs | 1686 | 1653 | -1.96% |
| excalidraw | sqliteWriteMs | 2411 | 1831 | -24.06% |
| excalidraw | importPathAliasResolutionMs | 456 | 442 | -3.07% |
| excalidraw | esmNamedImportExportResolutionMs | 1216 | 1187 | -2.38% |
| excalidraw | localExactReferenceResolutionMs | 1570 | 1565 | -0.32% |
| excalidraw | subprocessStartupHandoffMs | 2 | 2 | 0.00% |
| excalidraw | TypeScript finalization | 2010 | 1914 | -4.78% |
| excalidraw | cacheWarmupDbMs | 3 | 3 | 0.00% |
| excalidraw | cacheWarmupMs | 6 | 7 | +16.67% |
| excalidraw | candidateLookupCacheHitMs | 10 | 3 | -70.00% |
| excalidraw | candidateLookupMs | 32 | 32 | 0.00% |
| excalidraw | candidateReplayComparedRefs | 0 | 0 | n/a |
| excalidraw | candidateReplayEligibleRefs | 0 | 0 | n/a |
| excalidraw | candidateReplayEquivalentRefs | 0 | 0 | n/a |
| excalidraw | candidateReplayMismatchRefs | 0 | 0 | n/a |
| excalidraw | databaseAccessMs | 454 | 431 | -5.07% |
| excalidraw | edgeMaterializationDbMs | 22 | 20 | -9.09% |
| excalidraw | edgeMaterializationMs | 22 | 20 | -9.09% |
| excalidraw | edgeWriteDbMs | 184 | 174 | -5.43% |
| excalidraw | edgeWriteMs | 184 | 174 | -5.43% |
| excalidraw | frameworkMatchingMs | 18 | 9 | -50.00% |
| excalidraw | importResolutionMs | 885 | 850 | -3.95% |
| excalidraw | nameMatcherCandidateLookupDbMs | 24 | 29 | +20.83% |
| excalidraw | nameMatchingMs | 119 | 107 | -10.08% |
| excalidraw | otherResolutionMs | 10 | 15 | +50.00% |
| excalidraw | perReferenceDisambiguationMs | 96 | 86 | -10.42% |
| excalidraw | refHydrationDbMs | 3 | 4 | +33.33% |
| excalidraw | rustMatcherCandidateMaterializationMs | 0 | 0 | n/a |
| excalidraw | rustMatcherEligibleRefs | 0 | 0 | n/a |
| excalidraw | rustMatcherFallbackRefs | 0 | 0 | n/a |
| excalidraw | rustMatcherHandledRefs | 0 | 0 | n/a |
| excalidraw | rustMatcherMs | 0 | 0 | n/a |
| excalidraw | rustMatcherPayloadBytes | 0 | 0 | n/a |
| excalidraw | rustMatcherSemanticMismatchRefs | 0 | 0 | n/a |
| excalidraw | rustMatcherSerializationMs | 0 | 0 | n/a |
| excalidraw | rustMatcherStartupMs | 0 | 0 | n/a |
| excalidraw | rustMatcherSubprocessMs | 0 | 0 | n/a |
| excalidraw | rustMatcherTsVerificationMs | 0 | 0 | n/a |
| excalidraw | rustMatcherUniqueCandidateFacts | 0 | 0 | n/a |
| excalidraw | sharedCandidateLookupMs | 9 | 11 | +22.22% |
| excalidraw | unresolvedCleanupDbMs | 200 | 191 | -4.50% |
| excalidraw | unresolvedCleanupMs | 200 | 191 | -4.50% |
| excalidraw | unresolvedReadDbMs | 42 | 39 | -7.14% |
| excalidraw | unresolvedReadMs | 42 | 39 | -7.14% |
| vscode | sourceScanMs | 81 | 80 | -1.23% |
| vscode | parseExtractionMs | 39445 | 42080 | +6.68% |
| vscode | sqliteWriteMs | 133042 | 126307 | -5.06% |
| vscode | importPathAliasResolutionMs | 4595 | 6293 | +36.95% |
| vscode | esmNamedImportExportResolutionMs | 11572 | 14013 | +21.09% |
| vscode | localExactReferenceResolutionMs | 50967 | 50877 | -0.18% |
| vscode | subprocessStartupHandoffMs | 3 | 13 | +333.33% |
| vscode | TypeScript finalization | 97554 | 101876 | +4.43% |
| vscode | cacheWarmupDbMs | 272 | 518 | +90.44% |
| vscode | cacheWarmupMs | 332 | 545 | +64.16% |
| vscode | candidateLookupCacheHitMs | 467 | 409 | -12.42% |
| vscode | candidateLookupMs | 4249 | 5569 | +31.07% |
| vscode | candidateReplayComparedRefs | 0 | 0 | n/a |
| vscode | candidateReplayEligibleRefs | 0 | 0 | n/a |
| vscode | candidateReplayEquivalentRefs | 0 | 0 | n/a |
| vscode | candidateReplayMismatchRefs | 0 | 0 | n/a |
| vscode | databaseAccessMs | 38269 | 44812 | +17.10% |
| vscode | edgeMaterializationDbMs | 1052 | 1118 | +6.27% |
| vscode | edgeMaterializationMs | 1052 | 1118 | +6.27% |
| vscode | edgeWriteDbMs | 19619 | 21574 | +9.96% |
| vscode | edgeWriteMs | 19619 | 21574 | +9.96% |
| vscode | frameworkMatchingMs | 837 | 835 | -0.24% |
| vscode | importResolutionMs | 9429 | 8408 | -10.83% |
| vscode | nameMatcherCandidateLookupDbMs | 3789 | 5181 | +36.74% |
| vscode | nameMatchingMs | 33872 | 31113 | -8.15% |
| vscode | otherResolutionMs | 401 | 341 | -14.96% |
| vscode | perReferenceDisambiguationMs | 30895 | 27397 | -11.32% |
| vscode | refHydrationDbMs | 60 | 27 | -55.00% |
| vscode | rustMatcherCandidateMaterializationMs | 0 | 0 | n/a |
| vscode | rustMatcherEligibleRefs | 0 | 0 | n/a |
| vscode | rustMatcherFallbackRefs | 0 | 0 | n/a |
| vscode | rustMatcherHandledRefs | 0 | 0 | n/a |
| vscode | rustMatcherMs | 0 | 0 | n/a |
| vscode | rustMatcherPayloadBytes | 0 | 0 | n/a |
| vscode | rustMatcherSemanticMismatchRefs | 0 | 0 | n/a |
| vscode | rustMatcherSerializationMs | 0 | 0 | n/a |
| vscode | rustMatcherStartupMs | 0 | 0 | n/a |
| vscode | rustMatcherSubprocessMs | 0 | 0 | n/a |
| vscode | rustMatcherTsVerificationMs | 0 | 0 | n/a |
| vscode | rustMatcherUniqueCandidateFacts | 0 | 0 | n/a |
| vscode | sharedCandidateLookupMs | 1276 | 1855 | +45.38% |
| vscode | unresolvedCleanupDbMs | 16265 | 19271 | +18.48% |
| vscode | unresolvedCleanupMs | 16265 | 19271 | +18.48% |
| vscode | unresolvedReadDbMs | 1003 | 2304 | +129.71% |
| vscode | unresolvedReadMs | 1003 | 2304 | +129.71% |

## Candidate Ranking

Recommend next bounded candidate: localExactReferenceResolutionMs.

| Rank | Bucket | Required after ms | Stress after ms | Total after ms | Targets |
|---:|---|---:|---:|---:|---|
| 1 | localExactReferenceResolutionMs | 3097 | 50877 | 53974 | zcodegraph:1532, excalidraw:1565, vscode:50877 |
| 2 | parseExtractionMs | 2699 | 42080 | 44779 | zcodegraph:1046, excalidraw:1653, vscode:42080 |
| 3 | esmNamedImportExportResolutionMs | 1581 | 14013 | 15594 | zcodegraph:394, excalidraw:1187, vscode:14013 |
| 4 | importPathAliasResolutionMs | 523 | 6293 | 6816 | zcodegraph:81, excalidraw:442, vscode:6293 |

## Excluded Directions

- #208 candidate replay verifier: already measured as semantically useful but too expensive for production performance path unless materially reframed.
- #209 TypeScript finalization edge-write-only: already measured as a narrow edge-write-only hypothesis; future work must materially reframe the finalization DB path.
- #211 FTS-trigger bulk write: already implemented and measured; future graph-write work must target a different mechanism.
