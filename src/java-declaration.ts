const JAVA_DECLARATION_PREFIX = 'zcg-java-declaration/v1\n';

export type JavaDeclarationCategory =
  | 'ordinary-method'
  | 'ordinary-class'
  | 'ordinary-interface'
  | 'annotation-interface'
  | 'package'
  | 'import';

export interface JavaDeclaration {
  category: JavaDeclarationCategory;
  header: string;
}

/** Decode only the reviewed, length-delimited Java declaration representation. */
export function decodeJavaDeclaration(
  signature: string | null | undefined,
): JavaDeclaration | null {
  if (!signature?.startsWith(JAVA_DECLARATION_PREFIX)) return null;
  const headerStart = signature.indexOf('\n\n', JAVA_DECLARATION_PREFIX.length);
  if (headerStart < 0) return null;
  const fields = signature.slice(JAVA_DECLARATION_PREFIX.length, headerStart).split('\n');
  if (fields.length !== 2) return null;
  const category = fields[0]?.match(/^category=(ordinary-method|ordinary-class|ordinary-interface|annotation-interface|package|import)$/)?.[1] as JavaDeclarationCategory | undefined;
  const byteLength = fields[1]?.match(/^header-bytes=(0|[1-9][0-9]*)$/)?.[1];
  if (!category || byteLength === undefined) return null;
  const header = signature.slice(headerStart + 2);
  if (Buffer.byteLength(header, 'utf8') !== Number(byteLength)) return null;
  return { category, header };
}

export function javaSemanticSignature(signature: string | null | undefined): string | null | undefined {
  const declaration = decodeJavaDeclaration(signature);
  if (!declaration) return signature;
  if (declaration.category === 'ordinary-interface') {
    const parents = declaration.header.match(/\bextends\s+([\s\S]+)$/)?.[1];
    if (!parents) return undefined;
    const leaves: string[] = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index <= parents.length; index += 1) {
      const char = parents[index];
      if (char === '<') depth += 1;
      if (char === '>') depth = Math.max(0, depth - 1);
      if ((char === ',' && depth === 0) || index === parents.length) {
        const raw = parents.slice(start, index).trim();
        const withoutGenerics = raw.split('<', 1)[0]?.trim() ?? '';
        const leaf = withoutGenerics.split('.').pop()?.trim();
        if (leaf === undefined || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(leaf)) return undefined;
        leaves.push(leaf);
        start = index + 1;
      }
    }
    return leaves.length > 0 ? `extends ${leaves.join(',')}` : undefined;
  }
  return declaration.header;
}
