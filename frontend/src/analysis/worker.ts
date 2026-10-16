/// <reference lib="webworker" />
import {
  createIndex,
  analyze,
  compare,
  filterRecords,
  exportCsv,
  payEligible,
  cohortRows,
  UNKNOWN,
  type Indexed,
} from "./engine";
import { getRecords } from "../data/loader";
import type {
  Manifest,
  SourceMode,
  Query,
  Cohort,
  Catalog,
} from "../data/types";
let manifest: Manifest;
let latestQuery = 0;
let names: Record<string, string> = {};
const indexes = new Map<SourceMode, Indexed>();
const loading = new Map<SourceMode, Promise<Indexed>>();
async function ensure(mode: SourceMode) {
  const existing = indexes.get(mode);
  if (existing) return existing;
  let promise = loading.get(mode);
  if (!promise) {
    promise = getRecords(manifest, mode, (loaded, total) =>
      self.postMessage({ type: "progress", mode, loaded, total }),
    )
      .then((rows) => {
        const idx = createIndex(rows, names);
        indexes.set(mode, idx);
        return idx;
      })
      .finally(() => loading.delete(mode));
    loading.set(mode, promise);
  }
  return promise;
}
const allowed = new Map<string, Set<string>>();
function validateQuery(_idx: Indexed, q: Query) {
  for (const [key, chosen] of Object.entries(q.filters)) {
    const known = allowed.get(key);
    if (!known) continue;
    for (const value of chosen)
      if (!known.has(value))
        throw new Error(`Unknown ${key} filter value: ${value}`);
  }
}
self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data;
  try {
    let result: unknown;
    let computeMs: number | undefined;
    if (type === "init") {
      const catalog = payload as Catalog;
      manifest = catalog.manifest;
      allowed.set(
        "companyId",
        new Set([UNKNOWN, ...catalog.companies.map((c) => c.id)]),
      );
      allowed.set(
        "occupationId",
        new Set([UNKNOWN, ...catalog.taxonomy.occupations.map((c) => c.id)]),
      );
      allowed.set(
        "skillIds",
        new Set([UNKNOWN, ...catalog.taxonomy.skills.map((c) => c.id)]),
      );
      allowed.set(
        "arrangement",
        new Set([UNKNOWN, "Remote", "Hybrid", "On-site"]),
      );
      allowed.set(
        "availability",
        new Set([
          "local_observed",
          "upstream_reported_open",
          "possibly_closed",
          "closed",
          "unverified",
        ]),
      );
      names = Object.fromEntries([
        ...catalog.companies.map((c) => [c.id, c.name]),
        ...catalog.taxonomy.skills.map((s) => [s.id, s.name]),
      ]);
      result = { ready: true };
    }
    if (type === "query") {
      const p = payload as {
        mode: SourceMode;
        query: Query;
        page: number;
        focus: string;
        sort: "title" | "company" | "pay";
      };
      latestQuery = id;
      const idx = await ensure(p.mode);
      if (id !== latestQuery) {
        self.postMessage({ id, error: "Obsolete query" });
        return;
      }
      const started = performance.now();
      validateQuery(idx, p.query);
      result = {
        ...analyze(idx, p.query, p),
        context: {
          sourceMode: p.mode,
          datasetVersion: manifest.datasetVersion,
          methods: manifest.methods,
          query: p.query,
        },
      };
      computeMs = performance.now() - started;
    }
    if (type === "compare") {
      const { a, b } = payload as { a: Cohort; b: Cohort };
      if (
        a.datasetVersion !== manifest.datasetVersion ||
        b.datasetVersion !== manifest.datasetVersion
      )
        throw new Error(
          "Pinned cohort uses an unavailable dataset version. Refresh it explicitly.",
        );
      const ai = await ensure(a.sourceMode),
        bi = await ensure(b.sourceMode);
      validateQuery(ai, a.query);
      validateQuery(bi, b.query);
      result = compare(ai, bi, a, b);
    }
    if (type === "record") {
      const idx = await ensure(payload.mode);
      result = idx.byId.get(payload.recordId) || null;
    }
    if (type === "contributors") {
      const idx = await ensure(payload.mode);
      const rows = filterRecords(idx, payload.query).filter((r) =>
        payload.metric === "pay"
          ? payEligible(r)
          : payload.metric === "remote" || payload.metric === "remote_all"
            ? ["Remote", "Hybrid"].includes(r.arrangement || "")
            : payload.metric === "text"
              ? r.hasDescription === true
              : payload.metric === "degree"
                ? r.degree === "Bachelor's"
                : true,
      );
      const page = Math.max(0, payload.page || 0);
      result = {
        records: rows.slice(page * 25, page * 25 + 25),
        count: rows.length,
        page,
      };
    }
    if (type === "cohortContributors") {
      const cohort = payload.cohort as Cohort;
      if (cohort.datasetVersion !== manifest.datasetVersion)
        throw new Error("Cohort dataset version is unavailable.");
      const idx = await ensure(cohort.sourceMode);
      validateQuery(idx, cohort.query);
      const rows = cohortRows(idx, cohort).filter((r) =>
        r.skillIds.includes(payload.skill),
      );
      const page = Math.max(0, payload.page || 0);
      result = {
        records: rows.slice(page * 25, page * 25 + 25),
        count: rows.length,
        page,
      };
    }
    if (type === "export") {
      const idx = await ensure(payload.mode);
      const rows = filterRecords(idx, payload.query, payload.ids);
      result = {
        csv: exportCsv(rows, payload.mode, manifest.datasetVersion, names),
        count: rows.length,
      };
    }
    self.postMessage({ id, result, computeMs });
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
