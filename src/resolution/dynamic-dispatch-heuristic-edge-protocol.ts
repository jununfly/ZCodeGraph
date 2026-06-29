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
  };
  agentSufficiencyGuardrail: {
    status: 'required-before-rust-shadow-or-double-read';
    fullAgentAbRequiredForThisSlice: false;
  };
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
