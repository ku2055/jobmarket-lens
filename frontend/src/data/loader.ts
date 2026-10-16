import { validate, hash } from "./validate";
import type {
  Catalog,
  Manifest,
  Posting,
  ReleaseFile,
  SourceMode,
} from "./types";
export async function getManifest(): Promise<Manifest> {
  const r = await fetch("/data/manifest.json", { cache: "no-cache" });
  if (!r.ok) throw new Error(`Dataset manifest unavailable (${r.status}).`);
  return validate<Manifest>("manifest", await r.json());
}
export async function getFile<T>(file: ReleaseFile, kind: string): Promise<T> {
  if (!/^releases\/[a-f0-9]{64}\/[A-Za-z0-9._-]+\.json$/.test(file.path))
    throw new Error("Unsafe release path");
  const r = await fetch("/data/" + file.path);
  if (!r.ok)
    throw new Error(
      `Missing release file (${r.status}): ${file.path.split("/").pop()}`,
    );
  const bytes = await r.arrayBuffer();
  if (bytes.byteLength !== file.bytes || (await hash(bytes)) !== file.sha256)
    throw new Error(
      `Release integrity check failed: ${file.path.split("/").pop()}`,
    );
  return validate<T>(kind, JSON.parse(new TextDecoder().decode(bytes)));
}
export async function getCatalog(manifest: Manifest): Promise<Catalog> {
  const load = async <T>(kind: ReleaseFile["kind"]) => {
    const f = manifest.files.find((f) => f.kind === kind);
    if (!f) throw new Error(`Missing ${kind} catalog`);
    return getFile<T>(f, kind);
  };
  const [companies, taxonomy, sources, summary] = await Promise.all([
    load<Catalog["companies"]>("companies"),
    load<Catalog["taxonomy"]>("taxonomy"),
    load<Catalog["sources"]>("sources"),
    load<Catalog["summary"]>("summary"),
  ]);
  return { manifest, companies, taxonomy, sources, summary };
}
export async function getRecords(
  manifest: Manifest,
  mode: SourceMode,
  progress: (n: number, total: number) => void,
): Promise<Posting[]> {
  const files = manifest.files.filter(
      (f) => f.kind === "postings" && f.sourceMode === mode,
    ),
    chunks: Posting[][] = Array.from({ length: files.length }, () => []);
  let next = 0,
    loaded = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, files.length) }, async () => {
      while (next < files.length) {
        const i = next++,
          f = files[i];
        if (!f.path.startsWith(`releases/${manifest.datasetVersion}/`))
          throw new Error("Mixed dataset release");
        const chunk = await getFile<{
          sourceMode: SourceMode;
          postings: Posting[];
        }>(f, "shard");
        if (
          chunk.sourceMode !== mode ||
          chunk.postings.length !== f.recordCount
        )
          throw new Error("Source mode/count mismatch");
        chunks[i] = chunk.postings;
        progress(++loaded, files.length);
      }
    }),
  );
  const rows = chunks.flat();
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length)
    throw new Error("Duplicate posting ID in release");
  if (rows.length !== manifest.counts[mode])
    throw new Error("Incomplete dataset: posting count differs from manifest");
  return rows;
}
