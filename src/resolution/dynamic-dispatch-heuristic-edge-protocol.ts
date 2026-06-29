export const DYNAMIC_DISPATCH_HEURISTIC_EDGE_PROTOCOL_FAMILIES = [
  'callback',
  'closure-collection',
  'event-emitter',
] as const;

export type DynamicDispatchHeuristicEdgeProtocolFamily =
  typeof DYNAMIC_DISPATCH_HEURISTIC_EDGE_PROTOCOL_FAMILIES[number];

export interface DynamicDispatchHeuristicEdgeGraphParitySample {
  sourceNodeId: string;
  targetNodeId: string;
  sourceName: string;
  targetName: string;
  sourceFilePath: string;
  targetFilePath: string;
  language: string;
  kind: string;
  provenance: 'heuristic';
  synthesizedBy: string;
  eventName?: string;
  metadataKeys: string[];
}

export interface DynamicDispatchHeuristicEdgeFamilyGraphParity {
  synthesizedEdgeCount: number;
  unavailableReason: string | null;
  samples: DynamicDispatchHeuristicEdgeGraphParitySample[];
}

export interface DynamicDispatchHeuristicEdgeProtocolDiagnostics {
  version: 1;
  status: 'protocol-seed-only';
  productionWriterOwner: 'typescript-synthesizer';
  rustEdgeWritesEnabled: false;
  supportedSeedFamilies: DynamicDispatchHeuristicEdgeProtocolFamily[];
  commonFields: string[];
  familyMetadataWhitelist: Record<DynamicDispatchHeuristicEdgeProtocolFamily, string[]>;
  graphParity: {
    sampleLimit: number;
    families: Record<DynamicDispatchHeuristicEdgeProtocolFamily, DynamicDispatchHeuristicEdgeFamilyGraphParity>;
    eventEmitterShadow?: DynamicDispatchEventEmitterShadowParity;
  };
  agentSufficiencyGuardrail: {
    status: 'required-before-rust-shadow-or-double-read';
    fullAgentAbRequiredForThisSlice: false;
  };
}

export interface DynamicDispatchEventEmitterShadowParity {
  rustCandidateCount: number;
  typescriptEdgeCount: number;
  comparedCount: number;
  matchedCount: number;
  mismatchCount: number;
  rustEdgeWritesEnabled: false;
  mismatchReasons: Record<string, number>;
  samples: Array<{
    sourceName: string;
    targetName: string;
    eventName: string;
    status: 'matched' | 'missing-typescript-edge';
  }>;
}

interface RustDynamicDispatchShadowProducerLike {
  candidateCount?: number;
  samples?: Array<{
    sourceNodeId?: string;
    targetNodeId?: string;
    sourceName?: string;
    targetName?: string;
    eventName?: string;
  }>;
}

export function withEventEmitterShadowParity(
  diagnostics: DynamicDispatchHeuristicEdgeProtocolDiagnostics,
  rustShadowProducer: unknown,
): DynamicDispatchHeuristicEdgeProtocolDiagnostics {
  const producer = rustShadowProducer && typeof rustShadowProducer === 'object'
    ? rustShadowProducer as RustDynamicDispatchShadowProducerLike
    : {};
  const rustSamples = Array.isArray(producer.samples) ? producer.samples : [];
  const typescriptFamily = diagnostics.graphParity.families['event-emitter'];
  const typescriptKeys = new Set(
    typescriptFamily.samples.map((sample) => eventEmitterShadowKey({
      sourceNodeId: sample.sourceNodeId,
      targetNodeId: sample.targetNodeId,
      eventName: sample.eventName,
    })),
  );
  let matchedCount = 0;
  const mismatchReasons: Record<string, number> = {};
  const samples: DynamicDispatchEventEmitterShadowParity['samples'] = [];
  for (const sample of rustSamples) {
    const eventName = typeof sample.eventName === 'string' ? sample.eventName : '';
    const key = eventEmitterShadowKey({
      sourceNodeId: sample.sourceNodeId,
      targetNodeId: sample.targetNodeId,
      eventName,
    });
    const matched = typescriptKeys.has(key);
    if (matched) {
      matchedCount += 1;
    } else {
      mismatchReasons['missing-typescript-edge'] = (mismatchReasons['missing-typescript-edge'] ?? 0) + 1;
    }
    if (samples.length < diagnostics.graphParity.sampleLimit) {
      samples.push({
        sourceName: String(sample.sourceName ?? ''),
        targetName: String(sample.targetName ?? ''),
        eventName,
        status: matched ? 'matched' : 'missing-typescript-edge',
      });
    }
  }
  const rustCandidateCount = typeof producer.candidateCount === 'number'
    ? producer.candidateCount
    : rustSamples.length;
  return {
    ...diagnostics,
    graphParity: {
      ...diagnostics.graphParity,
      eventEmitterShadow: {
        rustCandidateCount,
        typescriptEdgeCount: typescriptFamily.synthesizedEdgeCount,
        comparedCount: rustSamples.length,
        matchedCount,
        mismatchCount: rustSamples.length - matchedCount,
        rustEdgeWritesEnabled: false,
        mismatchReasons,
        samples,
      },
    },
  };
}

function eventEmitterShadowKey(input: {
  sourceNodeId?: string;
  targetNodeId?: string;
  eventName?: string;
}): string {
  return `${input.sourceNodeId ?? ''}>${input.targetNodeId ?? ''}>${input.eventName ?? ''}`;
}

const COMMON_FIELDS = [
  'sourceNodeId',
  'targetNodeId',
  'kind',
  'provenance',
  'synthesizedBy',
  'registeredAt',
  'language',
  'precision',
];

const FAMILY_METADATA_WHITELIST: Record<DynamicDispatchHeuristicEdgeProtocolFamily, string[]> = {
  callback: ['via', 'field', 'registrationSite', 'confidenceReason'],
  'closure-collection': ['via', 'field', 'registrationSite', 'confidenceReason'],
  'event-emitter': ['via', 'eventName', 'registrationSite', 'confidenceReason'],
};

export function dynamicDispatchHeuristicEdgeProtocolDiagnostics(input: {
  sampleLimit: number;
  families: Record<DynamicDispatchHeuristicEdgeProtocolFamily, DynamicDispatchHeuristicEdgeFamilyGraphParity>;
}): DynamicDispatchHeuristicEdgeProtocolDiagnostics {
  return {
    version: 1,
    status: 'protocol-seed-only',
    productionWriterOwner: 'typescript-synthesizer',
    rustEdgeWritesEnabled: false,
    supportedSeedFamilies: [...DYNAMIC_DISPATCH_HEURISTIC_EDGE_PROTOCOL_FAMILIES],
    commonFields: [...COMMON_FIELDS],
    familyMetadataWhitelist: {
      callback: [...FAMILY_METADATA_WHITELIST.callback],
      'closure-collection': [...FAMILY_METADATA_WHITELIST['closure-collection']],
      'event-emitter': [...FAMILY_METADATA_WHITELIST['event-emitter']],
    },
    graphParity: {
      sampleLimit: input.sampleLimit,
      families: input.families,
    },
    agentSufficiencyGuardrail: {
      status: 'required-before-rust-shadow-or-double-read',
      fullAgentAbRequiredForThisSlice: false,
    },
  };
}
