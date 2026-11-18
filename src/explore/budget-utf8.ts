/**
 * Slice 4.1: UTF-8 byte-precise budget (DES-universal-structural-explore-v1 §499-§536).
 *
 * The delivery unit is UTF-8 bytes, NOT JavaScript UTF-16 length. The cap
 * covers the agent-visible transport text body: reserved worktree/staleness
 * notices, headers, flow, source fences, line numbers, serialized
 * diagnostics and omission notices, plus the optional single CLI newline.
 *
 * Allocation arithmetic (§518-§528):
 *
 *   actualNoticeBytes <= transportReservation.utf8Bytes
 *   applicationBodyAllowance =
 *     maxOutputUtf8Bytes
 *     - transportReservation.utf8Bytes
 *     - optionalCliNewlineBytes
 *   actualComposedBytes =
 *     actualNoticeBytes + actualBodyBytes + optionalCliNewlineBytes
 *     <= maxOutputUtf8Bytes
 */

// ===========================================================================
// UTF-8 byte measurement
// ===========================================================================

/**
 * Exact UTF-8 byte length. Uses Buffer.byteLength (Node) which is the
 * same convention the rest of the codebase relies on for byte-accurate
 * accounting. Never use `.length` for budget math.
 */
export function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

// ===========================================================================
// Budget shape
// ===========================================================================

/**
 * The full UTF-8 budget for one operation. Transport adapters freeze
 * this before the application call and supply the exact reservation
 * (§509-§511); the application never extends it afterwards.
 */
export interface Utf8Budget {
  /** Hard cap on the composed UTF-8 bytes (body + notices + newline). */
  maxOutputUtf8Bytes: number;
  /** Adapter-supplied reservation for transport notices. */
  transportReservation: TransportReservation;
  /** Bytes reserved for the optional single CLI newline (0 or 1). */
  optionalCliNewlineBytes: 0 | 1;
  /**
   * Reserved envelope for the minimum `budget-exhausted` outcome.
   * Covers its notices, separators and CLI newline — not subtracted
   * again as a second notice reservation (§531-§532).
   */
  minimumErrorUtf8Bytes: number;
}

export interface TransportReservation {
  /** Upper bound on transport-notice bytes for this call. */
  utf8Bytes: number;
}

// ===========================================================================
// Allowance computation
// ===========================================================================

/**
 * Compute the byte allowance the application may use for the response
 * body (everything except transport notices and the optional CLI
 * newline). Returns 0 if the budget is too small — callers must then
 * route to the budget-exhausted envelope (Slice 4.6).
 */
export function computeApplicationBodyAllowance(budget: Utf8Budget): number {
  const allowance =
    budget.maxOutputUtf8Bytes -
    budget.transportReservation.utf8Bytes -
    budget.optionalCliNewlineBytes;
  return allowance > 0 ? allowance : 0;
}

/**
 * Verify the final composed answer respects the cap. Returns true iff
 * the postcondition holds (§509-§510: application and transport both
 * verify).
 */
export function verifyComposedCap(
  budget: Utf8Budget,
  actualNoticeBytes: number,
  actualBodyBytes: number,
): boolean {
  if (actualNoticeBytes > budget.transportReservation.utf8Bytes) return false;
  const total = actualNoticeBytes + actualBodyBytes + budget.optionalCliNewlineBytes;
  return total <= budget.maxOutputUtf8Bytes;
}

// ===========================================================================
// Transport notice freezing
// ===========================================================================

/**
 * The frozen state a transport adapter needs to compute its notice
 * reservation. All dynamic inputs (pending changes, worktree state,
 * wall clock) MUST be captured before the application call (§534-§536).
 */
export interface FrozenTransportInputs {
  /** Pre-formatted notice lines (no further interpolation allowed). */
  noticeLines: readonly string[];
  /** Separator bytes between notice lines. */
  separatorBytes: number;
  /** Optional CLI newline inclusion (0 or 1). */
  cliNewlineBytes: 0 | 1;
}

/**
 * Compute a safe reservation from frozen adapter inputs. The result
 * is an upper bound — the actual notice bytes emitted later must be
 * <= this reservation, never more.
 */
export function freezeTransportNotice(inputs: FrozenTransportInputs): TransportReservation {
  let bytes = 0;
  for (const line of inputs.noticeLines) {
    bytes += utf8ByteLength(line);
  }
  if (inputs.noticeLines.length > 1) {
    bytes += inputs.separatorBytes * (inputs.noticeLines.length - 1);
  }
  return { utf8Bytes: bytes };
}

// ===========================================================================
// Minimum protocol envelope validation
// ===========================================================================

/**
 * Adapter-side validation: if the requested cap is below the protocol
 * minimum (the budget-exhausted envelope + its notices), the adapter
 * MUST fail validation before retrieval rather than emitting a
 * malformed answer (§562-§564).
 */
export function isCapBelowProtocolMinimum(budget: Utf8Budget): boolean {
  const total =
    budget.minimumErrorUtf8Bytes +
    budget.transportReservation.utf8Bytes +
    budget.optionalCliNewlineBytes;
  return budget.maxOutputUtf8Bytes < total;
}
