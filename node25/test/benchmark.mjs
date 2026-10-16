// Frozen workload: same immutable V2 populations. HTTP timings include queue/network; no mobile claim.
import { writeFile } from "node:fs/promises";
const base = process.env.BENCHMARK_BASE_URL ?? "http://127.0.0.1:4175";
const catalog = await fetch(base + "/api/catalog").then((r) => r.json());
const workloads = [
  { name: "default", view: "overview", sourceMode: "combined", filter: {} },
  {
    name: "all",
    view: "overview",
    sourceMode: "combined",
    filter: { availability: "all" },
  },
  {
    name: "employer",
    view: "overview",
    sourceMode: "combined",
    filter: { companyIds: ["AMZN"] },
  },
  {
    name: "country",
    view: "overview",
    sourceMode: "combined",
    filter: { countries: ["United States"] },
  },
  {
    name: "local",
    view: "overview",
    sourceMode: "local",
    filter: { availability: "all" },
  },
  {
    name: "page",
    view: "records",
    sourceMode: "combined",
    filter: {},
    page: { offset: 0, limit: 100 },
  },
  { name: "skills", view: "skills", sourceMode: "combined", filter: {} },
  {
    name: "compare",
    view: "compare",
    sourceMode: "combined",
    filter: {},
    cohortA: { companyIds: ["AMZN"] },
    cohortB: { companyIds: ["NVDA"] },
  },
];
const report = {
  checkedAt: new Date().toISOString(),
  host: base,
  datasetVersion: catalog.datasetVersion,
  method:
    "Fixed real-data HTTP workload; catalog initializes native engine before timing. Warm cache rounds at concurrency 1/5/10; not a cold-engine, physical mobile or browser-memory comparison.",
  workloads,
  rounds: [],
};
for (const concurrency of [1, 5, 10]) {
  const pending = Array.from(
      { length: Math.max(workloads.length, concurrency * 3) },
      (_, i) => workloads[i % workloads.length],
    ),
    results = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < pending.length) {
        const i = cursor++,
          w = pending[i],
          t = performance.now();
        const response = await fetch(base + "/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            protocolVersion: "2.5",
            datasetVersion: catalog.datasetVersion,
            requestId: "benchmark-" + concurrency + "-" + i,
            ...Object.fromEntries(
              Object.entries(w).filter(([key]) => key !== "name"),
            ),
          }),
        });
        const text = await response.text();
        results.push({
          name: w.name,
          status: response.status,
          ms: Math.round(performance.now() - t),
          bytes: Buffer.byteLength(text),
        });
      }
    }),
  );
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  report.rounds.push({
    concurrency,
    requests: results.length,
    p50: ms[Math.ceil(ms.length * 0.5) - 1],
    p95: ms[Math.ceil(ms.length * 0.95) - 1],
    failures: results.filter((r) => r.status !== 200).length,
    results,
  });
}
const path = process.env.BENCHMARK_OUTPUT ?? "/tmp/node25-benchmark.json";
await writeFile(path, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.rounds.map(({ results, ...r }) => r)));
