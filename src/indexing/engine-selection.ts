export type IndexEngine = 'typescript' | 'rust' | 'rust-hybrid';

export function resolveIndexEngine(
  cliValue: string | undefined,
  env: Record<string, string | undefined> = process.env,
): IndexEngine {
  const raw = (cliValue ?? env.ZCODEGRAPH_INDEX_ENGINE ?? 'rust-hybrid').trim().toLowerCase();

  if (raw === 'typescript' || raw === 'ts') {
    return 'typescript';
  }
  if (raw === 'rust') {
    return 'rust';
  }
  if (raw === 'rust-hybrid' || raw === 'hybrid') {
    return 'rust-hybrid';
  }

  throw new Error(`Unsupported index engine "${raw}". Supported engines: typescript, rust, rust-hybrid`);
}
