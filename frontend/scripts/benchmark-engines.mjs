/** Developer-only engine comparison; DuckDB is installed OUTSIDE the production app.
 * DUCKDB_BENCH_ROOT=/tmp/jobmarket-engine-benchmark node scripts/benchmark-engines.mjs
 * This uses Node's WASM runtime: it is not a mobile/browser-network performance claim.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { gzipSync } from "node:zlib";
const root = path.resolve(import.meta.dirname, "..");
const dataRoot = path.join(root, "public/data");
const manifest = JSON.parse(
  fs.readFileSync(path.join(dataRoot, "manifest.json")),
);
const files = manifest.files.filter(
  (f) => f.kind === "postings" && f.sourceMode === "combined",
);
const start = performance.now();
const records = files.flatMap(
  (f) => JSON.parse(fs.readFileSync(path.join(dataRoot, f.path))).postings,
);
const compact = records.map((p) => ({
  id: p.id,
  company: p.companyId,
  occupation: p.occupationId ?? "unknown",
  level: p.level ?? "unknown",
  open: ["local_observed", "upstream_reported_open"].includes(p.availability),
}));
const loadMs = performance.now() - start;
const benchRoot = process.env.DUCKDB_BENCH_ROOT;
if (!benchRoot)
  throw Error(
    "Set DUCKDB_BENCH_ROOT to an external installation of @duckdb/duckdb-wasm",
  );
const require = createRequire(
  path.join(path.resolve(benchRoot), "package.json"),
);
const pkgPath = path.join(
  path.dirname(path.dirname(require.resolve("@duckdb/duckdb-wasm"))),
  "package.json",
);
const dist = path.join(path.dirname(pkgPath), "dist");
const duckdb = require(path.join(dist, "duckdb-node-blocking.cjs"));
const version = JSON.parse(fs.readFileSync(pkgPath)).version;
const percentile = (a, p) =>
  [...a].sort((x, y) => x - y)[
    Math.min(a.length - 1, Math.floor(a.length * p))
  ];
const { createServer } = await import("vite");
const vite = await createServer({
  root,
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { createIndex, analyze } = await vite.ssrLoadModule(
  "/src/analysis/engine.ts",
);
const { emptyQuery } = await vite.ssrLoadModule("/src/data/types.ts");
const runs = [];
for (const [label, input] of [
  ["real", compact],
  [
    "synthetic100k",
    Array.from({ length: 100000 }, (_, i) => ({
      ...compact[i % compact.length],
      id: `stress-${i}`,
    })),
  ],
]) {
  const fullInput =
    label === "real"
      ? records
      : Array.from({ length: 100000 }, (_, i) => ({
          ...records[i % records.length],
          id: `stress-${i}`,
        }));
  const engineStart = performance.now();
  const engine = createIndex(fullInput);
  const engineSetupMs = performance.now() - engineStart;
  const engineTimings = [],
    queryCases = [];
  for (let i = 0; i < 35; i++) {
    const q = emptyQuery();
    if (i % 5)
      q.filters.companyId = [fullInput[(i * 233) % fullInput.length].companyId];
    const t = performance.now();
    const result = analyze(engine, q);
    const elapsed = performance.now() - t;
    engineTimings.push(elapsed);
    queryCases.push({
      company: q.filters.companyId[0] ?? "all",
      records: result.count,
      ms: elapsed,
    });
  }
  const t0 = performance.now();
  const companyIndex = new Map();
  for (const row of input) {
    if (!companyIndex.has(row.company)) companyIndex.set(row.company, []);
    companyIndex.get(row.company).push(row);
  }
  const jsSetupMs = performance.now() - t0;
  const companies = [...companyIndex.keys()].slice(0, 30);
  const jt = [],
    dt = [];
  const d0 = performance.now();
  const db = await duckdb.createDuckDB(
    {
      mvp: { mainModule: path.join(dist, "duckdb-mvp.wasm") },
      eh: { mainModule: path.join(dist, "duckdb-eh.wasm") },
    },
    new duckdb.VoidLogger(),
    duckdb.NODE_RUNTIME,
  );
  await db.instantiate();
  db.registerFileText("input.json", JSON.stringify(input));
  const conn = db.connect();
  conn.query(
    "CREATE TABLE postings AS SELECT * FROM read_json_auto('input.json')",
  );
  const duckSetupMs = performance.now() - d0;
  for (let i = 0; i < 90; i++) {
    const company = companies[i % companies.length];
    let t = performance.now();
    const groups = new Map();
    for (const r of companyIndex.get(company) ?? [])
      if (r.open) groups.set(r.occupation, (groups.get(r.occupation) ?? 0) + 1);
    jt.push(performance.now() - t);
    t = performance.now();
    const result = conn
      .query(
        `SELECT occupation, count(*)::INTEGER AS n FROM postings WHERE open AND company='${company.replaceAll("'", "''")}' GROUP BY occupation`,
      )
      .toArray();
    dt.push(performance.now() - t);
    const got = new Map(result.map((r) => [r.occupation, Number(r.n)]));
    if (
      got.size !== groups.size ||
      [...groups].some(([k, v]) => got.get(k) !== v)
    )
      throw Error("Engine contributor count mismatch");
  }
  conn.close();
  runs.push({
    dataset: label,
    records: input.length,
    query:
      "open postings for employer grouped by occupation, 90 calls / first 30 employers",
    productionEngine: {
      setupMs: engineSetupMs,
      p95FullAnalysisMs: percentile(engineTimings, 0.95),
      maxMs: Math.max(...engineTimings),
      runs: 35,
      queryCases,
    },
    indexedJS: { setupMs: jsSetupMs, p95Ms: percentile(jt, 0.95) },
    duckdbWasm: { setupMs: duckSetupMs, p95Ms: percentile(dt, 0.95) },
    countsMatch: true,
  });
}
await vite.close();
const report = {
  recordedAt: new Date().toISOString(),
  runtime: process.version,
  platform: `${os.platform()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  logicalCpus: os.cpus().length,
  datasetVersion: manifest.datasetVersion,
  duckdbVersion: version,
  sharedJSONReadAndParseMs: loadMs,
  combinedJSONBytes: files.reduce((s, f) => s + f.bytes, 0),
  combinedGzipBytes: files.reduce(
    (s, f) => s + gzipSync(fs.readFileSync(path.join(dataRoot, f.path))).length,
    0,
  ),
  runs,
  limits: [
    "Node WASM comparison; browser worker startup, mobile performance and network not measured here.",
    "Shared compact input projected from full sanitized release; representative count/facet kernel only, not all UI operations.",
    "Synthetic100k repeats real public feature combinations with unique synthetic IDs.",
    "Production worker full query timings require separate browser measurements.",
  ],
};
console.log(JSON.stringify(report, null, 2));
