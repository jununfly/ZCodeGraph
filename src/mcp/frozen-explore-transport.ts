import { readExploreRuntimeOptions } from '../explore/runtime';
import { minimumExploreEnvelope, prepareExploreDelivery } from '../explore/delivery';
import { UniversalExploreApplication } from '../explore/universal-application';
import { CapBelowProtocolMinimumError, measureEnvelopeBytes } from '../explore/exhausted';
import {
  composeFrozenExploreTransport,
  freezeExploreTransport,
  projectFrozenExploreTransport,
} from '../explore/frozen-transport';
import { formatStaleBanner, formatStaleFooter } from './tools';
import type CodeGraph from '../index';
import type { PendingFile } from '../sync';

/** Explicit construction is the implementation switch; no environment flag is consulted. */
export interface FrozenMcpExploreRequest {
  readonly graph: CodeGraph;
  readonly query: string;
  readonly maxFiles?: number;
  readonly pendingFiles: readonly PendingFile[];
  readonly nowMs: number;
  readonly worktreeNotice?: string;
  readonly capUtf8Bytes: number;
}

export class FrozenMcpExploreAdapter {
  private readonly application = new UniversalExploreApplication();

  async explore(request: FrozenMcpExploreRequest): Promise<string> {
    const transportInput = {
      filePaths: [] as string[],
      pendingFiles: request.pendingFiles.map((file) => ({ ...file })),
      nowMs: request.nowMs,
      worktreeNotice: request.worktreeNotice,
      formatStaleBanner,
      formatStaleFooter,
    };
    const frozen = freezeExploreTransport(transportInput);
    const minimumErrorUtf8Bytes = frozen.reservationUtf8Bytes
      + measureEnvelopeBytes(minimumExploreEnvelope());
    // Validate the complete minimum directly; byte length is not string length.
    const delivery = prepareExploreDelivery(request.capUtf8Bytes, [], 0);
    if (request.capUtf8Bytes < minimumErrorUtf8Bytes) {
      throw new CapBelowProtocolMinimumError(minimumErrorUtf8Bytes, request.capUtf8Bytes);
    }
    const result = await this.application.explore(request.graph, request.query, {
      maxFiles: request.maxFiles,
      runtime: readExploreRuntimeOptions(),
      delivery: {
        ...delivery,
        transportReservation: { utf8Bytes: frozen.reservationUtf8Bytes },
        minimumErrorUtf8Bytes,
      },
    });
    const text = result.kind === 'answer' ? result.markdown : result.text;
    const projected = result.kind === 'failed'
      ? { ...frozen, suffix: '', reservationUtf8Bytes: frozen.terminalFailureUtf8Bytes }
      : projectFrozenExploreTransport(transportInput, text);
    return composeFrozenExploreTransport(text, projected, request.capUtf8Bytes);
  }
}
