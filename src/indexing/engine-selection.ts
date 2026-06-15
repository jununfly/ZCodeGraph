export type IndexEngine = 'typescript' | 'rust';

export function resolveIndexEngine(
  cliValue: string | undefined,
  env: Record<string, string | undefined> = process.env,
): IndexEngine {
  const raw = (cliValue ?? env.ZCODEGRAPH_INDEX_ENGINE ?? 'typescript').trim().toLowerCase();

  if (raw === 'typescript' || raw === 'ts') {
    return 'typescript';
  }
  if (raw === 'rust') {
    return 'rust';
  }

  throw new Error(`Unsupported index engine "${raw}". Supported engines: typescript, rust`);
}
