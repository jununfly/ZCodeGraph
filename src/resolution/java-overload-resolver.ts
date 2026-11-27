/**
 * R2 of roadmap 1-9-15-4 — precise Java overload resolver.
 *
 * Consumes the RestrictedResolutionAccessModel's validated `zcgJavaCall.v1`
 * envelope and produces a `calls` edge ONLY when the evidence supports a
 * unique overload. Every other outcome abstains (returns null) — there is NO
 * legacy loose fallback path.
 *
 * Matching rules:
 *   1. Access model must return `ok`; any refusal → null.
 *   2. Envelope.complete must be true; Rust-incomplete → null.
 *   3. Receiver must have a declaredType (string).
 *   4. Candidates = methods with the same simple name whose declaring class
 *      matches the receiver's declaredType (qualified or same-package).
 *   5. Each candidate's parameter list is parsed from its
 *      `zcg-java-declaration/v1` signature header. The argument count must
 *      match the envelope's argument count.
 *   6. Each argument's declaredType must match the corresponding parameter
 *      type. Primitives are matched by exact string; reference types by
 *      fully-qualified name after same-package expansion.
 *   7. Exactly one candidate survives → emit exact-match edge.
 *      Zero or multiple → null (abstain).
 *
 * Cross-file same-package JDK shadowing (7b): when the receiver's
 * declaredType is a JDK alias (e.g. `java.lang.String`) but the project
 * contains a same-package class with that simple name, AST-only evidence
 * cannot distinguish them → abstain.
 */

import type { Node } from '../types';
import type { ResolutionContext, UnresolvedRef } from './types';
import type {
  RestrictedResolutionAccessModel,
  JavaCallEnvelopeV1,
  JavaExpressionFact,
} from './resolution-access-model';

export interface OverloadResolution {
  targetNodeId: string;
  confidence: number;
  resolvedBy: 'exact-match';
}

/** The signature prefix every Java declaration node carries. */
const JAVA_DECL_PREFIX = 'zcg-java-declaration/v1';

/** JDK types that are commonly shadowed by same-package user classes. */
const JDK_SHADOWABLE = new Set([
  'java.lang.String',
  'java.lang.Object',
  'java.lang.Integer',
  'java.lang.Long',
  'java.lang.Boolean',
  'java.lang.Double',
  'java.lang.Float',
  'java.lang.Character',
  'java.lang.Byte',
  'java.lang.Short',
  'java.lang.Void',
  'java.lang.Class',
  'java.lang.Number',
  'java.lang.Exception',
  'java.lang.RuntimeException',
  'java.lang.Throwable',
  'java.lang.Iterable',
  'java.lang.Comparable',
  'java.lang.Cloneable',
  'java.util.List',
  'java.util.Map',
  'java.util.Set',
  'java.util.Collection',
  'java.util.Optional',
  'java.util.stream.Stream',
]);

/** JDK simple-name → FQN alias table (mirrors the Rust `java_declared_type`). */
const JDK_SIMPLE_TO_FQN: Record<string, string> = {
  String: 'java.lang.String',
  Object: 'java.lang.Object',
  Integer: 'java.lang.Integer',
  Long: 'java.lang.Long',
  Boolean: 'java.lang.Boolean',
  Double: 'java.lang.Double',
  Float: 'java.lang.Float',
  Character: 'java.lang.Character',
  Byte: 'java.lang.Byte',
  Short: 'java.lang.Short',
  Void: 'java.lang.Void',
  Class: 'java.lang.Class',
  Number: 'java.lang.Number',
  Exception: 'java.lang.Exception',
  RuntimeException: 'java.lang.RuntimeException',
  Throwable: 'java.lang.Throwable',
  Iterable: 'java.lang.Iterable',
  Comparable: 'java.lang.Comparable',
  Cloneable: 'java.lang.Cloneable',
  List: 'java.util.List',
  Map: 'java.util.Map',
  Set: 'java.util.Set',
  Collection: 'java.util.Collection',
  Optional: 'java.util.Optional',
  Stream: 'java.util.stream.Stream',
};

/**
 * Attempt to resolve a Java method invocation to a unique overload.
 * Returns null (abstain) on any ambiguity, incompleteness or refusal.
 */
export function resolveJavaOverload(
  rowid: number,
  access: RestrictedResolutionAccessModel,
  context: ResolutionContext,
  reference?: Pick<UnresolvedRef, 'fromNodeId' | 'referenceName' | 'filePath'>,
): OverloadResolution | null {
  const result = access.getMetadata(rowid);
  if (result.kind !== 'ok') return null;
  if (
    reference &&
    (reference.fromNodeId !== result.identity.fromNodeId ||
      reference.referenceName !== result.identity.referenceName ||
      reference.filePath !== result.identity.filePath)
  ) {
    return null;
  }
  if (
    result.envelope.complete === true &&
    result.envelope.caller?.nodeId !== result.identity.fromNodeId
  ) {
    return null;
  }
  const envelope = result.envelope;

  // R3 declared-return recovery: when the receiver is itself a method
  // invocation whose return type the Rust writer could not resolve from
  // same-file AST (cross-file method), we attempt to resolve the return
  // type from the indexed graph. This is the ONLY recovery path — any
  // other incompleteness abstains.
  let receiverType = envelope.receiver?.declaredType;
  if (envelope.receiver?.kind === 'method-invocation') {
    const recovered = recoverDeclaredReturnType(envelope, context);
    if (!recovered) return null;
    // A same-file shortcut is only an unverified candidate type. Resolve the
    // inner invocation itself before using its declared return type.
    if (receiverType && recovered !== receiverType) return null;
    receiverType = recovered;
  } else if (!envelope.complete) {
    return null;
  }
  if (
    envelope.caller?.complete !== true ||
    !Array.isArray(envelope.arguments) ||
    !envelope.arguments.every((a) => a.complete && !!a.declaredType)
  ) {
    return null;
  }
  if (!receiverType) return null;

  // 7b: cross-file same-package JDK shadowing.
  // If the receiver type is a JDK-shadowable FQN and the project contains
  // a same-package class with the same simple name, we cannot distinguish
  // which type the writer meant → abstain.
  if (JDK_SHADOWABLE.has(receiverType)) {
    const simpleName = receiverType.split('.').pop()!;
    const callerPackage = envelope.caller?.packageName ??
      result.identity.filePath.split('/').slice(0, -1).join('.');
    const shadowFQN = callerPackage ? `${callerPackage}.${simpleName}` : simpleName;
    // Only a declaration in the caller's package can be the cross-file
    // same-package type left ambiguous by the Rust AST-only fact.
    const shadows = context
      .getNodesByName(simpleName)
      .filter(
        (n) =>
          (n.kind === 'class' || n.kind === 'interface') &&
          n.language === 'java' &&
          qualifiedNameToClassFQN(`${n.qualifiedName}::placeholder`) === shadowFQN,
      );
    if (shadows.length > 0) return null;
  }

  // All arguments must have declaredType.
  const args = envelope.arguments;
  if (!Array.isArray(args)) return null;
  for (const arg of args) {
    if (!arg.declaredType) return null;
  }

  // Find candidate methods by simple name.
  const candidates = context
    .getNodesByName(envelope.methodName)
    .filter((n) => n.kind === 'method' && n.language === 'java');
  if (candidates.length === 0) return null;

  // Filter by declaring class matching receiver type. When the direct class
  // has no match, walk the extends chain upward (R3 parent-class audit).
  // Only same-project classes are followed — JDK supertypes abort the walk
  // (we cannot resolve methods on JDK types we have not indexed).
  const directMatched = matchByReceiverClass(candidates, receiverType);
  const classMatched = directMatched.length > 0
    ? directMatched
    : matchByExtendsChain(candidates, receiverType, context);
  if (classMatched.length === 0) return null;

  // Parse each candidate's parameter list from its signature header.
  const survivors = classMatched.filter((c) => {
    const params = parseJavaMethodParams(c);
    if (!params) return false;
    if (params.length !== args.length) return false;
    // Type-by-type alignment
    for (let i = 0; i < params.length; i++) {
      if (!javaTypeMatches(params[i]!, args[i]!, c, context)) return false;
    }
    return true;
  });

  if (survivors.length !== 1) return null;
  return {
    targetNodeId: survivors[0]!.id,
    confidence: 1.0,
    resolvedBy: 'exact-match',
  };
}

// ── Declared-return recovery ──────────────────────────────────────────

/**
 * Attempt to recover the return type of a chained method invocation.
 *
 * Given an envelope whose receiver is `method-invocation` (e.g. `foo()`),
 * find the method declaration in the indexed graph and parse its return
 * type from the signature header. Returns the FQN of the return type, or
 * null if the method is not found or the return type is not resolvable.
 */
function recoverDeclaredReturnType(
  envelope: JavaCallEnvelopeV1,
  context: ResolutionContext,
): string | null {
  const invocation = envelope.receiver;
  const methodName = invocation?.name;
  const receiverType = invocation?.receiver?.declaredType;
  const args = invocation?.arguments;
  if (
    !methodName || invocation?.kind !== 'method-invocation' ||
    invocation.receiver?.complete !== true || !receiverType ||
    !Array.isArray(args) || !args.every((arg) => arg.complete && arg.declaredType)
  ) {
    return null;
  }
  // The inner method must belong to its own receiver, not merely be the only
  // method with this name anywhere in the graph.
  const candidates = context
    .getNodesByName(methodName)
    .filter((n) => n.kind === 'method' && n.language === 'java');
  const direct = matchByReceiverClass(candidates, receiverType);
  const classMatched = direct.length > 0
    ? direct
    : matchByExtendsChain(candidates, receiverType, context);
  const survivors = classMatched.filter((candidate) => {
    const params = parseJavaMethodParams(candidate);
    return params !== null && params.length === args.length &&
      params.every((param, index) => javaTypeMatches(param, args[index]!, candidate, context));
  });
  if (survivors.length !== 1) return null;
  const method = survivors[0]!;
  // Parse the return type from the method's signature header.
  const returnType = parseJavaMethodReturnType(method);
  if (!returnType) return null;
  // Resolve the return type to FQN.
  const methodClassFQN = qualifiedNameToClassFQN(method.qualifiedName);
  if (!methodClassFQN) return null;
  return resolveTypeToFQN(returnType, methodClassFQN, context);
}

/** Parse the return type from a Java method signature header. */
function parseJavaMethodReturnType(node: Node): string | null {
  const sig = node.signature;
  if (!sig || !sig.startsWith(JAVA_DECL_PREFIX)) return null;
  const sepIdx = sig.indexOf('\n\n');
  if (sepIdx === -1) return null;
  const header = sig.slice(sepIdx + 2).trim();
  // Header is like `public String getName()`. The return type is the token
  // before the method name (which is the token before the open paren).
  const openParen = header.indexOf('(');
  if (openParen === -1) return null;
  const beforeParen = header.slice(0, openParen).trim();
  const tokens = beforeParen.split(/\s+/);
  if (tokens.length < 2) return null;
  // The last token before `(` is the method name; the one before it is the
  // return type. Modifiers (public, static, etc.) precede the return type.
  return tokens[tokens.length - 2] ?? null;
}

// ── Receiver-class matching (direct + extends chain) ───────────────────

/** Filter candidates to those declared directly on `receiverType`. */
function matchByReceiverClass(candidates: Node[], receiverType: string): Node[] {
  const receiverSimple = receiverType.split('.').pop()!;
  const receiverPkg = receiverType.includes('.')
    ? receiverType.substring(0, receiverType.lastIndexOf('.'))
    : '';
  return candidates.filter((c) => {
    const classQN = qualifiedNameToClassFQN(c.qualifiedName);
    if (!classQN) return false;
    const classSimple = classQN.split('.').pop()!;
    if (classQN === receiverType) return true;
    if (classSimple === receiverSimple) {
      const classPkg = classQN.includes('.')
        ? classQN.substring(0, classQN.lastIndexOf('.'))
        : '';
      if (classPkg === receiverPkg) return true;
    }
    return false;
  });
}

/**
 * Walk the extends chain from `receiverType` upward, returning candidate
 * methods declared on any same-project ancestor. JDK supertypes abort the
 * walk — we cannot resolve methods on JDK types we have not indexed.
 */
function matchByExtendsChain(
  candidates: Node[],
  receiverType: string,
  context: ResolutionContext,
): Node[] {
  // Build the ancestor FQN list by walking `extends` edges.
  const ancestors = collectExtendsAncestors(receiverType, context);
  if (ancestors.length === 0) return [];
  const out: Node[] = [];
  for (const ancestorFQN of ancestors) {
    const matched = matchByReceiverClass(candidates, ancestorFQN);
    out.push(...matched);
  }
  return out;
}

/**
 * Collect the chain of same-project ancestor FQNs starting from `typeFQN`.
 * Stops at the first JDK type or when no further `extends` edge is found.
 */
function collectExtendsAncestors(
  typeFQN: string,
  context: ResolutionContext,
): string[] {
  const ancestors: string[] = [];
  const visited = new Set<string>([typeFQN]);
  let current = typeFQN;
  // Bounded walk to avoid pathological cycles.
  for (let depth = 0; depth < 16; depth++) {
    const simpleName = current.split('.').pop()!;
    // Find the class node for `current`. Match by simple name AND package.
    const classNode = context
      .getNodesByName(simpleName)
      .find(
        (n) =>
          (n.kind === 'class' || n.kind === 'interface') &&
          n.language === 'java' &&
          qualifiedNameToClassFQN(n.qualifiedName + '::placeholder') === current,
      );
    if (!classNode) break;
    // Read the extends edge target from the signature header.
    // The header is the raw class declaration text, e.g.:
    //   `public class Sub extends Base {}`  → extends Base
    const parent = parseExtendsTarget(classNode);
    if (!parent) break;
    // Resolve the parent's FQN.
    const parentFQN = resolveTypeToFQN(parent, current, context, classNode.filePath);
    if (!parentFQN) break;
    // JDK types abort the walk — we have not indexed them.
    if (
      parentFQN.startsWith('java.') ||
      parentFQN.startsWith('javax.') ||
      parentFQN.startsWith('jdk.')
    ) {
      break;
    }
    if (visited.has(parentFQN)) break;
    visited.add(parentFQN);
    ancestors.push(parentFQN);
    current = parentFQN;
  }
  return ancestors;
}

/** Parse the `extends` target simple name from a class declaration header. */
function parseExtendsTarget(node: Node): string | null {
  const sig = node.signature;
  if (!sig || !sig.startsWith(JAVA_DECL_PREFIX)) return null;
  const sepIdx = sig.indexOf('\n\n');
  if (sepIdx === -1) return null;
  const header = sig.slice(sepIdx + 2).trim();
  const m = /\bextends\s+([\w.]+)/.exec(header);
  return m ? m[1]! : null;
}

/**
 * Resolve a (possibly simple) type name to its FQN given the current class
 * FQN as the package reference. Uses JDK aliases, same-package expansion,
 * and explicit imports.
 */
function resolveTypeToFQN(
  typeName: string,
  currentClassFQN: string,
  context: ResolutionContext,
  sourceFilePath?: string,
): string | null {
  if (typeName.includes('.')) return typeName;
  if (isJavaPrimitive(typeName)) return typeName;
  if (sourceFilePath) {
    const imported = resolveExplicitJavaImport(typeName, sourceFilePath, context);
    if (imported) return imported;
  }
  // JDK alias
  if (JDK_SIMPLE_TO_FQN[typeName]) return JDK_SIMPLE_TO_FQN[typeName]!;
  // Same-package expansion: `Base` in `demo.Sub` → `demo.Base`
  const pkg = currentClassFQN.includes('.')
    ? currentClassFQN.substring(0, currentClassFQN.lastIndexOf('.'))
    : '';
  if (pkg) {
    const fqn = `${pkg}.${typeName}`;
    // Verify the type exists in the graph.
    const exists = context
      .getNodesByName(typeName)
      .some(
        (n) =>
          (n.kind === 'class' || n.kind === 'interface') &&
          n.language === 'java' &&
          qualifiedNameToClassFQN(n.qualifiedName + '::placeholder') === fqn,
      );
    if (exists) return fqn;
  }
  return null;
}

/** Resolve only a single-type import in the declaring class's compilation unit. */
function resolveExplicitJavaImport(
  typeName: string,
  sourceFilePath: string,
  context: ResolutionContext,
): string | null {
  if (!context.fileExists(sourceFilePath)) return null;
  const source = context.readFile(sourceFilePath);
  if (!source) return null;
  const importedFQNs = new Set<string>();
  const importPattern = /^\s*import\s+(?!static\s)([\w.]+)\s*;/gm;
  for (const match of source.matchAll(importPattern)) {
    const fqn = match[1]!;
    if (fqn.endsWith(`.${typeName}`)) importedFQNs.add(fqn);
  }
  if (importedFQNs.size !== 1) return null;
  const imported = importedFQNs.values().next().value!;
  const matches = new Set(
    context.getNodesByName(typeName)
      .filter((node) =>
        (node.kind === 'class' || node.kind === 'interface') &&
        node.language === 'java' && node.qualifiedName === imported.replaceAll('.', '::'))
      .map((node) => node.id),
  );
  return matches.size === 1 ? imported : null;
}

// ── Qualified-name helpers ─────────────────────────────────────────────

/**
 * Convert a CodeGraph qualifiedName (`demo::Owner::find`) to the Java FQN
 * of the declaring class (`demo.Owner`). Returns null when the shape is
 * unexpected.
 */
function qualifiedNameToClassFQN(qn: string): string | null {
  const parts = qn.split('::');
  if (parts.length < 2) return null;
  // Drop the last segment (the method name); the rest is the class.
  const classParts = parts.slice(0, -1);
  // `demo::Owner` → `demo.Owner`
  return classParts.join('.');
}

// ── Signature parsing ──────────────────────────────────────────────────

/**
 * Parse the parameter list from a Java method node's
 * `zcg-java-declaration/v1` signature header.
 *
 * The header is the raw method declaration text (without body), e.g.:
 *   `public void find(String name, boolean active)`
 *   `public <T> T find(Class<T> type)`
 *
 * Returns the parameter type strings in order, or null if the signature
 * is missing or unparseable.
 */
function parseJavaMethodParams(node: Node): string[] | null {
  const sig = node.signature;
  if (!sig || !sig.startsWith(JAVA_DECL_PREFIX)) return null;
  // The header is everything after the double-newline separator.
  const sepIdx = sig.indexOf('\n\n');
  if (sepIdx === -1) return null;
  const header = sig.slice(sepIdx + 2).trim();
  // Extract the parameter list between the outermost parentheses.
  const openParen = header.indexOf('(');
  if (openParen === -1) return null;
  const closeParen = findMatchingParen(header, openParen);
  if (closeParen === -1) return null;
  const paramsText = header.slice(openParen + 1, closeParen).trim();
  if (paramsText === '') return [];
  return splitJavaParams(paramsText);
}

/** Find the matching close paren, accounting for nested generics. */
function findMatchingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Split a Java parameter list by top-level commas (ignoring generic commas). */
function splitJavaParams(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '<') depth++;
    else if (ch === '>') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.map(extractJavaParamType);
}

/** Extract the type from a single parameter declaration (e.g. `String name` → `String`). */
function extractJavaParamType(param: string): string {
  // Handle varargs: `String... args` → `String[]`
  // Handle annotations: `@Nullable String name` → `String`
  // Handle final: `final String name` → `String`
  let text = param;
  // Strip leading annotations
  text = text.replace(/^(?:@\w+(?:\([^)]*\))?\s*)+/g, '');
  // Strip final
  text = text.replace(/^final\s+/, '');
  // Handle varargs
  const isVarargs = text.includes('...');
  if (isVarargs) {
    text = text.replace(/\.\.\./g, '').trim();
  }
  // The type is everything before the last whitespace-separated token
  // (which is the parameter name). For generics like `List<String> names`,
  // the last token is `names`.
  const tokens = text.split(/\s+/);
  if (tokens.length < 2) {
    // No name — just a type (shouldn't happen in valid Java but be safe)
    return tokens[0] ?? text;
  }
  // The type is all tokens except the last one (the parameter name).
  const type = tokens.slice(0, -1).join(' ');
  return isVarargs ? type + '[]' : type;
}

// ── Type matching ──────────────────────────────────────────────────────

/**
 * Check whether a parameter type matches an argument's declaredType.
 *
 * The parameter type comes from the method header (e.g. `String`), while
 * the argument's declaredType comes from the Rust envelope (e.g.
 * `java.lang.String`). We normalize both sides to fully-qualified names
 * before comparison:
 *
 *   - If the param type is a JDK simple name, expand it to its FQN.
 *   - If the param type is a simple name that matches a known class in
 *     the same package as the candidate method, expand to that package.
 *   - Primitives match by exact string.
 */
function javaTypeMatches(
  paramType: string,
  arg: JavaExpressionFact,
  candidate: Node,
  context: ResolutionContext,
): boolean {
  const argType = arg.declaredType;
  if (!argType) return false;

  const normalizedParam = normalizeJavaType(paramType);
  const paramArraySuffix = normalizedParam.match(/(?:\[\])+/)?.[0] ?? '';
  const paramElement = normalizedParam.slice(
    0,
    normalizedParam.length - paramArraySuffix.length,
  );
  const arraySuffix = paramArraySuffix;
  const candidateClass = qualifiedNameToClassFQN(candidate.qualifiedName);
  if (!candidateClass) return false;
  const resolvedParam = resolveTypeToFQN(
    paramElement,
    candidateClass,
    context,
    candidate.filePath,
  );
  if (!resolvedParam) return false;
  return `${resolvedParam}${arraySuffix}` === normalizeJavaType(argType);
}

/** Normalize a Java type string for comparison. */
function normalizeJavaType(type: string): string {
  let t = type.trim();
  // Erase nested generic arguments without discarding a following array
  // suffix: `Box<String>[]` → `Box[]`.
  let erased = '';
  let genericDepth = 0;
  for (const character of t) {
    if (character === '<') genericDepth++;
    else if (character === '>') genericDepth = Math.max(0, genericDepth - 1);
    else if (genericDepth === 0) erased += character;
  }
  t = erased;
  // Normalize array brackets: `String []` → `String[]`
  t = t.replace(/\s*\[\s*\]/g, '[]');
  return t;
}

/** Check if a type string is a Java primitive. */
function isJavaPrimitive(type: string): boolean {
  return [
    'byte', 'short', 'int', 'long', 'float', 'double', 'boolean', 'char',
  ].includes(type);
}
