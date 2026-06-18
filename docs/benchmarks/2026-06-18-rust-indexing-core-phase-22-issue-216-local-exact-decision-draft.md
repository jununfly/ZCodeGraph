# Rust Indexing Optimization Decision Draft

## Scope

Generated from before/after Rust indexing experiment artifacts.

No Rust default rollout readiness is claimed.

## Recommendation

Pause or revert until sufficiency and graphStats parity are explained.

Recommend next bounded candidate: parseExtractionMs.

## Evidence

# Rust Indexing Evidence Comparison

Before: rust-indexing-core-issue-211-rust-core-sqlite-write-after
After: rust-indexing-core-phase-22-issue-216-local-exact-after
Before classification: failed-required-performance-gate-unmet
After classification: failed-required-performance-gate-unmet

Rust default rollout readiness is not claimed by this comparison.

## Target Matrix

| Target | Class | Required | Empty corpus | Sufficiency | Rust graphStats |
|---|---|---:|---|---|---|
| zcodegraph | required | yes | valid | passed | changed |
| excalidraw | required | yes | valid | passed | unchanged |
| vscode | stress | no | valid | passed | unchanged |

## Wall Time and RSS

| Target | Before Rust ms | After Rust ms | Rust wall delta | Before sqliteWriteMs | After sqliteWriteMs | sqliteWrite delta |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 7579 | 6747 | -10.98% | 1038 | 1060 | +2.12% |
| excalidraw | 14020 | 13427 | -4.23% | 1831 | 1859 | +1.53% |
| vscode | 577634 | 622492 | +7.77% | 126307 | 135645 | +7.39% |

| Target | Before Rust RSS | After Rust RSS | Rust RSS delta |
|---|---:|---:|---:|
| zcodegraph | 52609024 | 52363264 | -0.47% |
| excalidraw | 53133312 | 52887552 | -0.46% |
| vscode | 17776640 | 16990208 | -4.42% |

## Profile Buckets

| Target | Bucket | Before ms | After ms | Delta |
|---|---|---:|---:|---:|
| zcodegraph | sourceScanMs | 1 | 2 | +100.00% |
| zcodegraph | parseExtractionMs | 1046 | 1069 | +2.20% |
| zcodegraph | sqliteWriteMs | 1038 | 1060 | +2.12% |
| zcodegraph | importPathAliasResolutionMs | 81 | 79 | -2.47% |
| zcodegraph | esmNamedImportExportResolutionMs | 394 | 384 | -2.54% |
| zcodegraph | localExactReferenceResolutionMs | 1532 | 484 | -68.41% |
| zcodegraph | subprocessStartupHandoffMs | 290 | 445 | +53.45% |
| zcodegraph | TypeScript finalization | 716 | 705 | -1.54% |
| zcodegraph | cacheWarmupDbMs | 3 | 3 | 0.00% |
| zcodegraph | cacheWarmupMs | 4 | 3 | -25.00% |
| zcodegraph | candidateLookupCacheHitMs | 4 | 5 | +25.00% |
| zcodegraph | candidateLookupMs | 15 | 17 | +13.33% |
| zcodegraph | candidateReplayComparedRefs | 0 | 0 | n/a |
| zcodegraph | candidateReplayEligibleRefs | 0 | 0 | n/a |
| zcodegraph | candidateReplayEquivalentRefs | 0 | 0 | n/a |
| zcodegraph | candidateReplayMismatchRefs | 0 | 0 | n/a |
| zcodegraph | databaseAccessMs | 203 | 203 | 0.00% |
| zcodegraph | edgeMaterializationDbMs | 10 | 9 | -10.00% |
| zcodegraph | edgeMaterializationMs | 10 | 9 | -10.00% |
| zcodegraph | edgeWriteDbMs | 51 | 51 | 0.00% |
| zcodegraph | edgeWriteMs | 51 | 51 | 0.00% |
| zcodegraph | frameworkMatchingMs | 15 | 9 | -40.00% |
| zcodegraph | importResolutionMs | 45 | 49 | +8.89% |
| zcodegraph | nameMatcherCandidateLookupDbMs | 11 | 12 | +9.09% |
| zcodegraph | nameMatchingMs | 58 | 60 | +3.45% |
| zcodegraph | otherResolutionMs | 2 | 6 | +200.00% |
| zcodegraph | perReferenceDisambiguationMs | 47 | 46 | -2.13% |
| zcodegraph | refHydrationDbMs | 1 | 0 | -100.00% |
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
| zcodegraph | sharedCandidateLookupMs | 4 | 3 | -25.00% |
| zcodegraph | unresolvedCleanupDbMs | 114 | 114 | 0.00% |
| zcodegraph | unresolvedCleanupMs | 114 | 114 | 0.00% |
| zcodegraph | unresolvedReadDbMs | 24 | 26 | +8.33% |
| zcodegraph | unresolvedReadMs | 24 | 26 | +8.33% |
| excalidraw | sourceScanMs | 2 | 2 | 0.00% |
| excalidraw | parseExtractionMs | 1653 | 1677 | +1.45% |
| excalidraw | sqliteWriteMs | 1831 | 1859 | +1.53% |
| excalidraw | importPathAliasResolutionMs | 442 | 447 | +1.13% |
| excalidraw | esmNamedImportExportResolutionMs | 1187 | 1190 | +0.25% |
| excalidraw | localExactReferenceResolutionMs | 1565 | 720 | -53.99% |
| excalidraw | subprocessStartupHandoffMs | 2 | 3 | +50.00% |
| excalidraw | TypeScript finalization | 1914 | 1975 | +3.19% |
| excalidraw | cacheWarmupDbMs | 3 | 4 | +33.33% |
| excalidraw | cacheWarmupMs | 7 | 5 | -28.57% |
| excalidraw | candidateLookupCacheHitMs | 3 | 3 | 0.00% |
| excalidraw | candidateLookupMs | 32 | 38 | +18.75% |
| excalidraw | candidateReplayComparedRefs | 0 | 0 | n/a |
| excalidraw | candidateReplayEligibleRefs | 0 | 0 | n/a |
| excalidraw | candidateReplayEquivalentRefs | 0 | 0 | n/a |
| excalidraw | candidateReplayMismatchRefs | 0 | 0 | n/a |
| excalidraw | databaseAccessMs | 431 | 450 | +4.41% |
| excalidraw | edgeMaterializationDbMs | 20 | 18 | -10.00% |
| excalidraw | edgeMaterializationMs | 20 | 18 | -10.00% |
| excalidraw | edgeWriteDbMs | 174 | 180 | +3.45% |
| excalidraw | edgeWriteMs | 174 | 180 | +3.45% |
| excalidraw | frameworkMatchingMs | 9 | 13 | +44.44% |
| excalidraw | importResolutionMs | 850 | 868 | +2.12% |
| excalidraw | nameMatcherCandidateLookupDbMs | 29 | 35 | +20.69% |
| excalidraw | nameMatchingMs | 107 | 131 | +22.43% |
| excalidraw | otherResolutionMs | 15 | 13 | -13.33% |
| excalidraw | perReferenceDisambiguationMs | 86 | 103 | +19.77% |
| excalidraw | refHydrationDbMs | 4 | 1 | -75.00% |
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
| excalidraw | sharedCandidateLookupMs | 11 | 10 | -9.09% |
| excalidraw | unresolvedCleanupDbMs | 191 | 200 | +4.71% |
| excalidraw | unresolvedCleanupMs | 191 | 200 | +4.71% |
| excalidraw | unresolvedReadDbMs | 39 | 47 | +20.51% |
| excalidraw | unresolvedReadMs | 39 | 47 | +20.51% |
| vscode | sourceScanMs | 80 | 92 | +15.00% |
| vscode | parseExtractionMs | 42080 | 45248 | +7.53% |
| vscode | sqliteWriteMs | 126307 | 135645 | +7.39% |
| vscode | importPathAliasResolutionMs | 6293 | 7246 | +15.14% |
| vscode | esmNamedImportExportResolutionMs | 14013 | 16521 | +17.90% |
| vscode | localExactReferenceResolutionMs | 50877 | 34485 | -32.22% |
| vscode | subprocessStartupHandoffMs | 13 | 3 | -76.92% |
| vscode | TypeScript finalization | 101876 | 127288 | +24.94% |
| vscode | cacheWarmupDbMs | 518 | 402 | -22.39% |
| vscode | cacheWarmupMs | 545 | 455 | -16.51% |
| vscode | candidateLookupCacheHitMs | 409 | 441 | +7.82% |
| vscode | candidateLookupMs | 5569 | 9846 | +76.80% |
| vscode | candidateReplayComparedRefs | 0 | 0 | n/a |
| vscode | candidateReplayEligibleRefs | 0 | 0 | n/a |
| vscode | candidateReplayEquivalentRefs | 0 | 0 | n/a |
| vscode | candidateReplayMismatchRefs | 0 | 0 | n/a |
| vscode | databaseAccessMs | 44812 | 53900 | +20.28% |
| vscode | edgeMaterializationDbMs | 1118 | 1863 | +66.64% |
| vscode | edgeMaterializationMs | 1118 | 1863 | +66.64% |
| vscode | edgeWriteDbMs | 21574 | 25129 | +16.48% |
| vscode | edgeWriteMs | 21574 | 25129 | +16.48% |
| vscode | frameworkMatchingMs | 835 | 1208 | +44.67% |
| vscode | importResolutionMs | 8408 | 9986 | +18.77% |
| vscode | nameMatcherCandidateLookupDbMs | 5181 | 9419 | +81.80% |
| vscode | nameMatchingMs | 31113 | 40323 | +29.60% |
| vscode | otherResolutionMs | 341 | 419 | +22.87% |
| vscode | perReferenceDisambiguationMs | 27397 | 33541 | +22.43% |
| vscode | refHydrationDbMs | 27 | 53 | +96.30% |
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
| vscode | sharedCandidateLookupMs | 1855 | 3068 | +65.39% |
| vscode | unresolvedCleanupDbMs | 19271 | 23714 | +23.06% |
| vscode | unresolvedCleanupMs | 19271 | 23714 | +23.06% |
| vscode | unresolvedReadDbMs | 2304 | 2740 | +18.92% |
| vscode | unresolvedReadMs | 2304 | 2740 | +18.92% |

## Candidate Ranking

Recommend next bounded candidate: parseExtractionMs.

| Rank | Bucket | Required after ms | Stress after ms | Total after ms | Targets |
|---:|---|---:|---:|---:|---|
| 1 | parseExtractionMs | 2746 | 45248 | 47994 | zcodegraph:1069, excalidraw:1677, vscode:45248 |
| 2 | localExactReferenceResolutionMs | 1204 | 34485 | 35689 | zcodegraph:484, excalidraw:720, vscode:34485 |
| 3 | esmNamedImportExportResolutionMs | 1574 | 16521 | 18095 | zcodegraph:384, excalidraw:1190, vscode:16521 |
| 4 | importPathAliasResolutionMs | 526 | 7246 | 7772 | zcodegraph:79, excalidraw:447, vscode:7246 |

## Excluded Directions

- #208 candidate replay verifier: already measured as semantically useful but too expensive for production performance path unless materially reframed.
- #209 TypeScript finalization edge-write-only: already measured as a narrow edge-write-only hypothesis; future work must materially reframe the finalization DB path.
- #211 FTS-trigger bulk write: already implemented and measured; future graph-write work must target a different mechanism.

## Tracker Update Draft

- Sufficiency: passed on all compared targets.
- Rust graphStats parity: changed or unavailable on at least one target.
- Next recommendation: Recommend next bounded candidate: parseExtractionMs.
- Rust default rollout readiness is not claimed.
