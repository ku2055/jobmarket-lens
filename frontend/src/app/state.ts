import {
  emptyQuery,
  type AppState,
  type Cohort,
  type Query,
  type SourceMode,
  type Workspace,
} from "../data/types";
const modes = ["combined", "upstream", "local"];
const routes = ["explore", "compare", "skills", "evidence"];
const facets = [
  "companyId",
  "occupationId",
  "level",
  "arrangement",
  "country",
  "skillIds",
  "availability",
];
export function initialState(version = ""): AppState {
  return {
    v: 2,
    datasetVersion: version,
    sourceMode: "combined",
    workspace: "explore",
    query: emptyQuery(),
    a: null,
    b: null,
    selected: null,
  };
}
function object(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function keys(x: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(x).some((k) => !allowed.includes(k)))
    throw new Error("Analysis state contains an unexpected field.");
}
function query(x: unknown): x is Query {
  if (!object(x)) return false;
  keys(x, ["search", "filters", "includeUnknown"]);
  if (
    typeof x.search !== "string" ||
    x.search.length > 500 ||
    typeof x.includeUnknown !== "boolean" ||
    !object(x.filters)
  )
    return false;
  const fs = x.filters;
  keys(fs, facets);
  const enums: Record<string, string[]> = {
    arrangement: ["Remote", "Hybrid", "On-site", "__unknown__"],
    availability: [
      "local_observed",
      "upstream_reported_open",
      "possibly_closed",
      "closed",
      "unverified",
    ],
  };
  return facets.every(
    (k) =>
      Array.isArray(fs[k]) &&
      fs[k].length < 1000 &&
      new Set(fs[k]).size === fs[k].length &&
      fs[k].every(
        (v: unknown) =>
          typeof v === "string" &&
          v.length <= 300 &&
          (!enums[k] || enums[k].includes(v)),
      ),
  );
}
function cohort(x: unknown): x is Cohort | null {
  if (x === null) return true;
  if (!object(x)) return false;
  keys(x, ["name", "datasetVersion", "sourceMode", "query", "ids"]);
  return (
    typeof x.name === "string" &&
    x.name.length <= 100 &&
    typeof x.datasetVersion === "string" &&
    /^[a-f0-9]{64}$/.test(x.datasetVersion) &&
    modes.includes(String(x.sourceMode)) &&
    query(x.query) &&
    (x.ids === undefined ||
      (Array.isArray(x.ids) &&
        x.ids.length <= 100000 &&
        new Set(x.ids).size === x.ids.length &&
        x.ids.every(
          (v) => typeof v === "string" && v.length > 0 && v.length < 300,
        )))
  );
}
export function validateState(x: unknown): AppState {
  if (!object(x)) throw new Error("Analysis state must be an object.");
  keys(x, [
    "v",
    "datasetVersion",
    "sourceMode",
    "workspace",
    "query",
    "a",
    "b",
    "selected",
  ]);
  if (
    x.v !== 2 ||
    typeof x.datasetVersion !== "string" ||
    !/^[a-f0-9]{64}$/.test(x.datasetVersion) ||
    !modes.includes(String(x.sourceMode)) ||
    !routes.includes(String(x.workspace)) ||
    !query(x.query) ||
    !cohort(x.a) ||
    !cohort(x.b) ||
    (x.selected !== null &&
      (typeof x.selected !== "string" || x.selected.length > 300))
  )
    throw new Error("Invalid or unsupported analysis state.");
  return x as unknown as AppState;
}
export function canonicalState(s: AppState): AppState {
  const sortQ = (q: Query): Query => ({
    ...q,
    filters: Object.fromEntries(
      Object.entries(q.filters).map(([k, v]) => [k, [...v].sort()]),
    ) as Query["filters"],
  });
  const c = (c: Cohort | null) =>
    c
      ? {
          ...c,
          query: sortQ(c.query),
          ...(c.ids ? { ids: [...c.ids].sort() } : {}),
        }
      : null;
  return { ...s, query: sortQ(s.query), a: c(s.a), b: c(s.b) };
}
export function shareUrl(s: AppState): string | null {
  const c = canonicalState(s);
  if ((c.a?.ids?.length || 0) + (c.b?.ids?.length || 0) > 256) return null;
  const u = new URL("/" + s.workspace, location.origin);
  u.searchParams.set("state", JSON.stringify(c));
  return new TextEncoder().encode(u.href).byteLength <= 8192 ? u.href : null;
}
export function loadLocation(version: string): AppState {
  const route = location.pathname.replace(/\/$/, "").slice(1) || "explore";
  if (!routes.includes(route)) throw new Error("Unknown workspace route.");
  const text = new URL(location.href).searchParams.get("state");
  if (!text) return { ...initialState(version), workspace: route as Workspace };
  if (text.length > 1000000) throw new Error("Shared state is too large.");
  const state = validateState(JSON.parse(text));
  if (state.datasetVersion !== version)
    throw new Error(
      "This analysis uses an unavailable dataset release. Import an explicitly refreshed state to continue.",
    );
  return { ...state, workspace: route as Workspace };
}
export function sourceLabel(mode: SourceMode) {
  return {
    combined: "Combined inventory",
    upstream: "Upstream report",
    local: "Local observations",
  }[mode];
}
