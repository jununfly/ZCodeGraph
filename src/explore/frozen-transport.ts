import type { PendingFile } from '../sync';
import { utf8ByteLength } from './budget-utf8';
import { measureEnvelopeBytes } from './exhausted';
import { minimumExploreEnvelope } from './delivery';

/** One adapter-owned snapshot. The application never reads watcher or clock state. */
export interface FrozenExploreTransportInput {
  readonly filePaths: readonly string[];
  readonly pendingFiles: readonly PendingFile[];
  readonly nowMs: number;
  readonly worktreeNotice?: string;
  readonly formatStaleBanner: (files: readonly PendingFile[], nowMs: number) => string;
  readonly formatStaleFooter: (files: readonly PendingFile[], nowMs: number) => string;
}

export interface FrozenExploreTransport {
  readonly prefix: string;
  readonly suffix: string;
  readonly reservationUtf8Bytes: number;
  readonly terminalFailureUtf8Bytes: number;
  readonly failureMinimumUtf8Bytes: number;
}

/** The failure projection omits the optional footer, so it needs its own reservation. */
export function frozenFailureReservation(frozen: FrozenExploreTransport): number {
  return frozen.terminalFailureUtf8Bytes;
}

/** Freeze both notice directions before source allocation; no later watcher read is needed. */
export function freezeExploreTransport(input: FrozenExploreTransportInput): FrozenExploreTransport {
  const paths = new Set(input.filePaths);
  const pendingFiles = [...input.pendingFiles].sort((a, b) => a.path.localeCompare(b.path)
    || a.lastSeenMs - b.lastSeenMs || Number(a.indexing) - Number(b.indexing));
  const referenced = pendingFiles.filter((file) => paths.has(file.path));
  const elsewhere = pendingFiles.filter((file) => !paths.has(file.path));
  const prefix = [
    input.worktreeNotice ?? '',
    referenced.length > 0 ? input.formatStaleBanner(referenced, input.nowMs) : '',
  ].filter(Boolean).join('\n\n');
  const suffix = elsewhere.length > 0 ? input.formatStaleFooter(elsewhere, input.nowMs) : '';
  // Every pending file may be absent from the final body, so reserve its
  // complete footer as well as its banner. The final projection may use less.
  const possibleFooter = pendingFiles.length > 0
    ? input.formatStaleFooter(pendingFiles, input.nowMs) : '';
  const possibleSuffixBytes = possibleFooter ? utf8ByteLength(possibleFooter) + 2 : 0;
  const possibleBanner = pendingFiles.length > 0
    ? input.formatStaleBanner(pendingFiles, input.nowMs) : '';
  // Reserve the actual prefix, a possible additional banner and both body
  // separators. All of them can occur together when source references a
  // pending file that was unknown before application retrieval.
  const reservationUtf8Bytes = utf8ByteLength(prefix)
    + (possibleBanner ? utf8ByteLength(possibleBanner) + 2 : 0)
    + (prefix || possibleBanner ? 2 : 0) + possibleSuffixBytes;
  const terminalFailureUtf8Bytes = utf8ByteLength(prefix) + (prefix ? 2 : 0);
  return {
    prefix,
    suffix,
    reservationUtf8Bytes,
    terminalFailureUtf8Bytes,
    failureMinimumUtf8Bytes: terminalFailureUtf8Bytes + measureEnvelopeBytes(minimumExploreEnvelope()),
  };
}

/** Project only the previously captured state; the response selects referenced files. */
export function projectFrozenExploreTransport(
  input: FrozenExploreTransportInput,
  text: string,
): FrozenExploreTransport {
  const frozen = freezeExploreTransport({
    ...input,
    filePaths: input.pendingFiles.filter((file) => text.includes(file.path)).map((file) => file.path),
  });
  const terminalFailureUtf8Bytes = utf8ByteLength(frozen.prefix) + (frozen.prefix ? 2 : 0);
  return { ...frozen,
    reservationUtf8Bytes: terminalFailureUtf8Bytes
      + (frozen.suffix ? utf8ByteLength(frozen.suffix) + 2 : 0),
    terminalFailureUtf8Bytes,
    failureMinimumUtf8Bytes: terminalFailureUtf8Bytes + measureEnvelopeBytes(minimumExploreEnvelope()),
  };
}

/** Envelope-only projection; this is the bounded terminal result for a frozen adapter. */
export function composeFrozenExploreTransport(
  text: string,
  frozen: FrozenExploreTransport,
  cap: number,
): string {
  const composed = frozen.prefix
    + (frozen.prefix ? '\n\n' : '')
    + text
    + (frozen.suffix ? `\n\n${frozen.suffix}` : '');
  if (utf8ByteLength(composed) > cap) {
    throw new Error(`budget-exhausted: final transport exceeds ${cap} UTF-8 bytes`);
  }
  return composed;
}
