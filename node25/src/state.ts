import type { Filter, Mode, Study } from "./types";
export const modeLabel: Record<Mode, string> = {
  combined: "Combined inventory",
  upstream: "Upstream reported",
  local: "Locally observed",
};
export const fieldLabels: Record<string, string> = {
  companyIds: "Employer",
  occupationIds: "Occupation",
  skillIds: "Skill",
  countries: "Country",
  arrangements: "Arrangement",
};
export const initial = (version: string): Study => ({
  v: "2.5",
  datasetVersion: version,
  mode: "combined",
  workspace: "canvas",
  filter: { availability: "open" },
  a: null,
  b: null,
});
const allowed = [
  "search",
  "companyIds",
  "occupationIds",
  "skillIds",
  "countries",
  "arrangements",
  "availability",
];
function record(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function fields(x: Record<string, unknown>, ks: string[]) {
  if (Object.keys(x).some((k) => !ks.includes(k)))
    throw new Error("Study contains an unsupported field.");
}
export function validateFilter(x: unknown): Filter {
  if (!record(x)) throw new Error("Invalid study filter.");
  fields(x, allowed);
  for (const [k, v] of Object.entries(x)) {
    if (k === "search") {
      if (typeof v !== "string" || v.length > 160)
        throw new Error("Search must be 160 characters or fewer.");
    } else if (k === "availability") {
      if (!["open", "all", "closed"].includes(String(v)))
        throw new Error("Unknown availability scope.");
    } else if (
      !Array.isArray(v) ||
      v.length > 32 ||
      new Set(v).size !== v.length ||
      v.some((s) => typeof s !== "string" || !s || s.length > 160)
    )
      throw new Error(
        "Choose at most 32 unique categories per field; each value must be 160 characters or fewer.",
      );
  }
  if (
    x.arrangements &&
    (x.arrangements as string[]).some(
      (s) =>
        !["Remote", "Hybrid", "On-site", "__unknown__", "Unknown"].includes(s),
    )
  )
    throw new Error("Unknown arrangement.");
  return x as Filter;
}
export function validateStudy(x: unknown): Study {
  if (!record(x)) throw new Error("Invalid study file.");
  fields(x, ["v", "datasetVersion", "mode", "workspace", "filter", "a", "b"]);
  if (
    x.v !== "2.5" ||
    typeof x.datasetVersion !== "string" ||
    !/^[a-f0-9]{64}$/.test(x.datasetVersion) ||
    !["combined", "upstream", "local"].includes(String(x.mode)) ||
    !["canvas", "skills", "evidence"].includes(String(x.workspace))
  )
    throw new Error("Invalid or unsupported study version.");
  validateFilter(x.filter);
  for (const slot of ["a", "b"]) {
    const p = x[slot];
    if (p === null) continue;
    if (!record(p)) throw new Error("Invalid frozen cohort.");
    fields(p, ["label", "mode", "datasetVersion", "filter", "count"]);
    if (
      typeof p.label !== "string" ||
      p.label.length > 70 ||
      !["combined", "upstream", "local"].includes(String(p.mode)) ||
      p.datasetVersion !== x.datasetVersion ||
      !Number.isSafeInteger(p.count) ||
      Number(p.count) < 0
    )
      throw new Error("Invalid frozen cohort basis.");
    validateFilter(p.filter);
  }
  return x as unknown as Study;
}
export function studyUrl(study: Study): string | null {
  const clean = structuredClone(study);
  for (const f of [clean.filter, clean.a?.filter, clean.b?.filter])
    if (f)
      for (const key of Object.keys(f)) {
        const v = f[key as keyof Filter];
        if (Array.isArray(v)) v.sort();
      }
  const u = new URL("/" + study.workspace, location.origin);
  u.searchParams.set("study", JSON.stringify(clean));
  return new TextEncoder().encode(u.href).byteLength > 8192 ? null : u.href;
}
export function fromLocation(version: string): Study {
  const path = location.pathname.replace(/\/$/, "").slice(1) || "canvas";
  if (!["canvas", "skills", "evidence"].includes(path))
    throw new Error("This workspace route does not exist.");
  const text = new URL(location.href).searchParams.get("study");
  if (!text)
    return { ...initial(version), workspace: path as Study["workspace"] };
  if (text.length > 100_000)
    throw new Error("Study link is too large. Import a study file instead.");
  const state = validateStudy(JSON.parse(text));
  if (state.datasetVersion !== version)
    throw new Error(
      "This study belongs to a different release. Start a fresh study explicitly; its cohorts will not be retargeted.",
    );
  return { ...state, workspace: path as Study["workspace"] };
}
export const n = (x: number) => x.toLocaleString("en-US");
export const percent = (x: number) => `${(x * 100).toFixed(1)}%`;
export const dollars = (x: number | null) =>
  x === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(x);
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
