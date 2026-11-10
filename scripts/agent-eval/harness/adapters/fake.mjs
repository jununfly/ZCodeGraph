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
        model: value.model ?? options.model,
        turns: value.turns ?? 0,
        readGrepFallbackDisplacement: value.readGrepFallbackDisplacement,
        graphStats: value.graphStats,
        fallbackTaxonomy: value.fallbackTaxonomy,
        sharedConfigFingerprint: value.sharedConfigFingerprint,
      };
    },
  };
}
