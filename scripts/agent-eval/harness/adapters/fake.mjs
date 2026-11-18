// Process-free adapter for structural verification (ADR-0016 D6 criterion 2).
// It never starts an agent and never spends anything.

export function createFakeAdapter(fixture) {
  return {
    async run(options) {
      const value = typeof fixture === 'function' ? fixture(options) : fixture;
      if (!value) return null;
      return {
        exitCode: value.exitCode ?? 0,
        toolCalls: value.toolCalls === undefined ? [] : value.toolCalls,
        usage: value.usage ?? {},
        model: value.model === undefined ? options.model : value.model,
        effort: value.effort,
        turns: value.turns ?? 0,
        finalResponse: value.finalResponse ?? `Synthetic answer for ${options.arm}; not a DES correctness classification.`,
        transcriptPath: value.transcriptPath,
        stderrTail: value.stderrTail,
        runtimeError: value.runtimeError,
        readGrepFallbackDisplacement: value.readGrepFallbackDisplacement,
        graphStats: value.graphStats,
        fallbackTaxonomy: value.fallbackTaxonomy,
        sharedConfigFingerprint: value.sharedConfigFingerprint,
      };
    },
  };
}
