/**
 * Restricted ResolutionAccessModel — roadmap 1-9-15-4 (Task #3, R1).
 *
 * A narrow, fail-closed TypeScript reader for the `zcgJavaCall.v1` envelope
 * the Rust core persists into `unresolved_refs.metadata` for Java
 * method-invocations. The model exposes ONLY:
 *
 *   - `getMetadata(rowid)` → a discriminated-union result (`ok` | `refused`)
 *   - (future rounds) `getDiagnostics()` — observability counters, default off
 *
 * It deliberately does NOT expose:
 *   - file reads / graph writes / node lookups
 *   - the raw metadata string (only the validated envelope)
 *   - any legacy loose-fallback path
 *
 * Every refusal returns a typed `{ kind: 'refused', reason }` and never
 * throws. The reason vocabulary is closed; new reasons require a test
 * amendment here and in the corresponding Rust writer.
 *
 * The 16 KiB budget mirrors the Rust writer's `metadata.len() <= 16 * 1024`
 * guard. A tampered or oversized row is rejected on the TS side as well.
 */

/** The v1 envelope as persisted by the Rust `java_call_fact_metadata`. */
export interface JavaCallEnvelopeV1 {
  v: 1;
  methodName: string;
  occurrence?: { byteOffset: number };
  caller?: JavaCallerFact;
  receiver?: JavaExpressionFact;
  arguments?: JavaExpressionFact[];
  complete: boolean;
  reason?: string;
}

export interface JavaCallerFact {
  nodeId?: string;
  category: 'ordinary-method' | 'constructor' | 'unsupported';
  lexicalDepth: number;
  topLevelClassNodeId?: string;
  topLevelClassCategory?: string;
  topLevelClassQualifiedName?: string;
  packageName?: string | null;
  complete: boolean;
  reason?: string;
}

export interface JavaExpressionFact {
  kind: string;
  name?: string;
  declaredType?: string;
  evidence?: string;
  syntaxKind?: string;
  receiver?: JavaExpressionFact;
  arguments?: JavaExpressionFact[];
  complete: boolean;
  reason?: string;
}

export type MetadataResult =
  | {
    kind: 'ok';
    envelope: JavaCallEnvelopeV1;
    identity: { fromNodeId: string; referenceName: string; filePath: string };
  }
  | { kind: 'refused'; reason: RefusalReason };

export type RefusalReason =
  | 'row-not-found'
  | 'non-java-row'
  | 'missing-envelope'
  | 'malformed-json'
  | 'unsupported-version'
  | 'malformed-caller'
  | 'caller-mismatch'
  | 'method-mismatch'
  | 'file-mismatch'
  | 'malformed-envelope'
  | 'malformed-method-name'
  | 'metadata-bytes';

const MAX_METADATA_BYTES = 16 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExpressionFact(value: unknown, depth = 0): boolean {
  if (
    depth > 16 || !isRecord(value) || typeof value.kind !== 'string' ||
    typeof value.complete !== 'boolean'
  ) {
    return false;
  }
  if (!['name', 'declaredType', 'evidence', 'syntaxKind', 'reason'].every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  )) {
    return false;
  }
  if (value.receiver !== undefined && !isExpressionFact(value.receiver, depth + 1)) {
    return false;
  }
  return value.arguments === undefined || (
    Array.isArray(value.arguments) && value.arguments.length <= 64 &&
    value.arguments.every((argument) => isExpressionFact(argument, depth + 1))
  );
}

function isCallerFact(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!['ordinary-method', 'constructor', 'unsupported'].includes(String(value.category))) return false;
  if (typeof value.complete !== 'boolean' || !Number.isSafeInteger(value.lexicalDepth)) return false;
  return [
    'nodeId', 'topLevelClassNodeId', 'topLevelClassCategory',
    'topLevelClassQualifiedName', 'packageName', 'reason',
  ].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string');
}

/** Minimal DB surface the access model needs. Matches better-sqlite3 / node-sqlite3-wasm. */
export interface AccessModelDb {
  prepare(sql: string): {
    get(...args: unknown[]): unknown;
  };
}

export interface JavaMetadataAccessDiagnostics {
  'pre-prewarm': number;
  hydration: number;
  ready: number;
}

const JAVA_METADATA_CACHE_LIMIT = 4096;

export class RestrictedResolutionAccessModel {
  private readonly db: AccessModelDb;
  private readonly cache = new Map<number, MetadataResult>();
  private readonly diagnostics: JavaMetadataAccessDiagnostics = {
    'pre-prewarm': 0,
    hydration: 0,
    ready: 0,
  };
  private hydrating = false;

  constructor(db: AccessModelDb) {
    this.db = db;
  }

  /** Populate only validated envelopes. The batch remains bounded per rowid. */
  hydrateMetadata(rowids: number[]): void {
    const previousHydrating = this.hydrating;
    this.hydrating = true;
    try {
      for (const rowid of rowids) {
        if (!Number.isSafeInteger(rowid) || rowid < 0 || this.cache.has(rowid)) continue;
        this.getMetadata(rowid);
      }
    } finally {
      this.hydrating = previousHydrating;
    }
  }

  /** A defensive snapshot; not a mutable view into the model. */
  getDiagnostics(): JavaMetadataAccessDiagnostics {
    return { ...this.diagnostics };
  }

  /** Start a new resolution batch while retaining valid hydrated facts. */
  beginBatch(): void {
    this.diagnostics['pre-prewarm'] = 0;
    this.diagnostics.hydration = 0;
    this.diagnostics.ready = 0;
  }

  /** Cache invalidation is explicit; it never changes stored graph state. */
  resetBatch(): void {
    this.cache.clear();
    this.diagnostics['pre-prewarm'] = 0;
    this.diagnostics.hydration = 0;
    this.diagnostics.ready = 0;
  }

  private cacheResult(rowid: number, result: MetadataResult): void {
    if (this.cache.size >= JAVA_METADATA_CACHE_LIMIT && !this.cache.has(rowid)) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(rowid, result);
  }

  /**
   * Read + validate the v1 envelope for a single unresolved_refs row.
   * Fail-closed: any deviation returns a typed refusal; never throws.
   */
  getMetadata(rowid: number): MetadataResult {
    if (!Number.isSafeInteger(rowid) || rowid < 0) {
      return { kind: 'refused', reason: 'row-not-found' };
    }
    const cached = this.cache.get(rowid);
    if (cached) {
      this.diagnostics.ready += 1;
      return cached;
    }
    if (this.hydrating) {
      this.diagnostics.hydration += 1;
    } else {
      this.diagnostics['pre-prewarm'] += 1;
    }
    const result = this.readMetadata(rowid);
    this.cacheResult(rowid, result);
    return result;
  }

  private readMetadata(rowid: number): MetadataResult {
    let row: {
      metadata: string | null;
      language: string;
      from_node_id: string;
      reference_name: string;
      file_path: string;
    } | undefined;
    try {
      row = this.db
        .prepare('SELECT metadata, language, from_node_id, reference_name, file_path FROM unresolved_refs WHERE id = ?1')
        .get(rowid) as {
          metadata: string | null;
          language: string;
          from_node_id: string;
          reference_name: string;
          file_path: string;
        } | undefined;
    } catch {
      return { kind: 'refused', reason: 'row-not-found' };
    }
    if (!row) return { kind: 'refused', reason: 'row-not-found' };
    if (row.language !== 'java') return { kind: 'refused', reason: 'non-java-row' };
    const raw = row.metadata;
    if (raw === null || raw === undefined) {
      return { kind: 'refused', reason: 'missing-envelope' };
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_METADATA_BYTES) {
      return { kind: 'refused', reason: 'metadata-bytes' };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: 'refused', reason: 'malformed-json' };
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { kind: 'refused', reason: 'missing-envelope' };
    }
    const envelope = (parsed as Record<string, unknown>).zcgJavaCall;
    if (
      typeof envelope !== 'object' ||
      envelope === null ||
      Array.isArray(envelope)
    ) {
      return { kind: 'refused', reason: 'missing-envelope' };
    }
    const env = envelope as Record<string, unknown>;
    if (env.v !== 1) return { kind: 'refused', reason: 'unsupported-version' };
    if (typeof env.methodName !== 'string' || env.methodName.length === 0) {
      return { kind: 'refused', reason: 'malformed-method-name' };
    }
    if (typeof env.complete !== 'boolean') {
      return { kind: 'refused', reason: 'malformed-envelope' };
    }
    // Rust may deliberately emit a terminal incomplete fact without AST
    // details after an argument-count or metadata-budget refusal.
    const terminalIncomplete = env.complete === false &&
      (env.reason === 'argument-count' || env.reason === 'metadata-bytes') &&
      env.caller === undefined && env.receiver === undefined && env.arguments === undefined;
    if (!terminalIncomplete) {
      if (
        !isCallerFact(env.caller) || !isExpressionFact(env.receiver) ||
        !Array.isArray(env.arguments) || env.arguments.length > 64 ||
        !env.arguments.every(isExpressionFact)
      ) {
        return { kind: 'refused', reason: 'malformed-envelope' };
      }
      if (env.occurrence !== undefined && (
        !isRecord(env.occurrence) || !Number.isSafeInteger(env.occurrence.byteOffset) ||
        (env.occurrence.byteOffset as number) < 0
      )) {
        return { kind: 'refused', reason: 'malformed-envelope' };
      }
    }
    if (env.complete === true) {
      const caller = env.caller;
      if (
        typeof caller !== 'object' ||
        caller === null ||
        typeof (caller as Record<string, unknown>).nodeId !== 'string'
      ) {
        return { kind: 'refused', reason: 'malformed-caller' };
      }
      if ((caller as Record<string, unknown>).nodeId !== row.from_node_id) {
        return { kind: 'refused', reason: 'caller-mismatch' };
      }
    }
    if (env.methodName !== row.reference_name.split('.').pop()) {
      return { kind: 'refused', reason: 'method-mismatch' };
    }
    if (isRecord(env.caller)) {
      const caller = env.caller;
      if (
        typeof caller.packageName === 'string' &&
        row.file_path.split('/').slice(0, -1).join('/') !== caller.packageName.replaceAll('.', '/')
      ) {
        return { kind: 'refused', reason: 'file-mismatch' };
      }
    }
    return {
      kind: 'ok',
      envelope: env as unknown as JavaCallEnvelopeV1,
      identity: {
        fromNodeId: row.from_node_id,
        referenceName: row.reference_name,
        filePath: row.file_path,
      },
    };
  }
}
