import {
  emptyQuery,
  type Analysis,
  type Cohort,
  type CompareResult,
  type FacetKey,
  type Posting,
  type Query,
  type Metric,
} from "../data/types";
export const FACETS: FacetKey[] = [
  "companyId",
  "occupationId",
  "level",
  "arrangement",
  "country",
  "skillIds",
  "availability",
];
export const UNKNOWN = "__unknown__";
export interface Indexed {
  records: Posting[];
  byId: Map<string, Posting>;
  search: Map<string, string>;
  countries: Map<string, string[]>;
  orders: Partial<Record<"title" | "company" | "pay", Posting[]>>;
  aggregates: Map<string, { rows: Posting[]; result: Analysis }>;
  cached?: { key: string; rows: Posting[]; facets: Analysis["facets"] };
}
export function createIndex(
  records: Posting[],
  names: Record<string, string> = {},
): Indexed {
  records = records.map((r) => {
    const unique = [...new Set(r.skillIds)];
    return unique.length === r.skillIds.length ? r : { ...r, skillIds: unique };
  });
  const byId = new Map<string, Posting>(),
    search = new Map<string, string>(),
    countries = new Map<string, string[]>();
  for (const r of records) {
    if (byId.has(r.id)) throw Error(`Duplicate canonical posting ID: ${r.id}`);
    byId.set(r.id, r);
    search.set(
      r.id,
      [
        r.title,
        names[r.companyId] || r.companyId,
        ...r.skillIds.map((s) => names[s] || s),
      ]
        .join(" ")
        .toLowerCase(),
    );
    const cs = [...new Set(r.locations.map((l) => l.country || UNKNOWN))];
    countries.set(r.id, cs.length ? cs : [UNKNOWN]);
  }
  return {
    records,
    byId,
    search,
    countries,
    orders: {},
    aggregates: new Map(),
  };
}
function values(index: Indexed, r: Posting, key: FacetKey): string[] {
  if (key === "country") return index.countries.get(r.id)!;
  if (key === "skillIds") return r.skillIds.length ? r.skillIds : [UNKNOWN];
  return [r[key] || UNKNOWN];
}
function activeFilters(q: Query) {
  return FACETS.filter((key) => q.filters[key].length).map((key) => ({
    key,
    chosen: new Set(q.filters[key]),
  }));
}
function passes(
  index: Indexed,
  r: Posting,
  key: FacetKey,
  chosen: Set<string>,
  unknown: boolean,
) {
  if (key !== "country" && key !== "skillIds") {
    const v = r[key] || UNKNOWN;
    return (
      chosen.has(v) || (unknown && v === UNKNOWN && key !== "availability")
    );
  }
  return values(index, r, key).some(
    (v) => chosen.has(v) || (unknown && v === UNKNOWN),
  );
}
export function filterRecords(
  index: Indexed,
  q: Query,
  ids?: string[],
): Posting[] {
  const set = ids ? new Set(ids) : null,
    search = q.search.trim().toLowerCase(),
    filters = activeFilters(q);
  return index.records.filter(
    (r) =>
      (!set || set.has(r.id)) &&
      (!search || index.search.get(r.id)!.includes(search)) &&
      filters.every((f) => passes(index, r, f.key, f.chosen, q.includeUnknown)),
  );
}
/** A single pass computes self-excluding facets and selected membership. */
function selection(index: Indexed, q: Query, ids?: string[]) {
  const key = JSON.stringify(q);
  if (!ids && index.cached?.key === key) return index.cached;
  const limited = ids ? new Set(ids) : null,
    search = q.search.trim().toLowerCase(),
    filters = activeFilters(q),
    rows: Posting[] = [];
  const counts = Object.fromEntries(
    FACETS.map((k) => [k, Object.create(null) as Record<string, number>]),
  ) as Record<FacetKey, Record<string, number>>;
  for (const r of index.records) {
    if (
      (limited && !limited.has(r.id)) ||
      (search && !index.search.get(r.id)!.includes(search))
    )
      continue;
    let fail: FacetKey | undefined,
      failCount = 0;
    for (const f of filters)
      if (!passes(index, r, f.key, f.chosen, q.includeUnknown)) {
        fail = f.key;
        if (++failCount > 1) break;
      }
    if (failCount > 1) continue;
    if (!failCount) rows.push(r);
    for (const k of FACETS) {
      if (failCount && k !== fail) continue;
      const target = counts[k];
      if (k === "country" || k === "skillIds")
        for (const v of values(index, r, k)) target[v] = (target[v] || 0) + 1;
      else {
        const v = r[k] || UNKNOWN;
        target[v] = (target[v] || 0) + 1;
      }
    }
  }
  const facets = Object.fromEntries(
    FACETS.map((k) => [
      k,
      Object.entries(counts[k])
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    ]),
  ) as Analysis["facets"];
  const result = { key, rows, facets };
  if (!ids) index.cached = result;
  return result;
}
function ordered(index: Indexed, sort: "title" | "company" | "pay") {
  let rows = index.orders[sort];
  if (!rows) {
    rows = index.records.slice().sort((a, b) => {
      const d =
        sort === "company"
          ? a.companyId.localeCompare(b.companyId)
          : sort === "pay"
            ? (payEligible(b) ? b.pay!.annualHigh! : -1) -
              (payEligible(a) ? a.pay!.annualHigh! : -1)
            : a.title.localeCompare(b.title);
      return d || a.id.localeCompare(b.id);
    });
    index.orders[sort] = rows;
  }
  return rows;
}
export function payEligible(r: Posting): boolean {
  const p = r.pay;
  return !!(
    p?.valid &&
    p.currency === "USD" &&
    ["hour", "month", "year"].includes(p.period || "") &&
    p.annualLow !== null &&
    p.annualHigh !== null &&
    Number.isFinite(p.annualLow) &&
    Number.isFinite(p.annualHigh) &&
    p.annualLow >= 0 &&
    p.annualLow <= p.annualHigh
  );
}
const count = (xs: string[]) => {
  const m: Record<string, number> = {};
  for (const x of xs) m[x] = (m[x] || 0) + 1;
  return m;
};
const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length
    ? (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2
    : null;
};
export function analyze(
  index: Indexed,
  q: Query,
  options: {
    page?: number;
    focus?: string;
    ids?: string[];
    sort?: "title" | "company" | "pay";
    includeIds?: boolean;
  } = {},
): Analysis {
  const aggregateKey = JSON.stringify([
    q,
    options.ids || null,
    options.focus || "",
  ]);
  const cached = index.aggregates.get(aggregateKey);
  if (cached) {
    index.aggregates.delete(aggregateKey);
    index.aggregates.set(aggregateKey, cached);
    const { rows, result } = cached,
      pages = result.pages,
      page = Math.min(Math.max(0, options.page || 0), pages - 1),
      membership = new Set(rows.map((r) => r.id)),
      records: Posting[] = [];
    let offset = 0;
    for (const r of ordered(index, options.sort || "title"))
      if (membership.has(r.id)) {
        if (offset++ >= page * 25) records.push(r);
        if (records.length === 25) break;
      }
    return {
      ...result,
      records,
      page,
      ...(options.includeIds ? { ids: rows.map((r) => r.id) } : {}),
    };
  }
  const { rows, facets } = selection(index, q, options.ids),
    n = rows.length;
  const skillCounts: Record<string, number> = {},
    cellCounts = new Map<
      string,
      { occupationId: string; level: string; count: number }
    >(),
    roleRows = new Map<
      string,
      { count: number; skills: Record<string, number> }
    >();
  for (const r of rows) {
    for (const s of r.skillIds) skillCounts[s] = (skillCounts[s] || 0) + 1;
    const occupationId = r.occupationId || UNKNOWN,
      level = r.level || UNKNOWN,
      key = occupationId + "\0" + level;
    const cell = cellCounts.get(key);
    if (cell) cell.count++;
    else cellCounts.set(key, { occupationId, level, count: 1 });
    let role = roleRows.get(occupationId);
    if (!role) {
      role = { count: 0, skills: Object.create(null) };
      roleRows.set(occupationId, role);
    }
    role.count++;
    for (const id of r.skillIds) role.skills[id] = (role.skills[id] || 0) + 1;
  }
  const skills = Object.entries(skillCounts)
    .map(([id, count]) => ({
      id,
      count,
      denominator: n,
      share: n ? count / n : 0,
    }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const analyzedCounts: Record<string, number> = {};
  let analyzedDenominator = 0;
  for (const r of rows)
    if (r.hasDescription === true) {
      analyzedDenominator++;
      for (const id of r.skillIds)
        analyzedCounts[id] = (analyzedCounts[id] || 0) + 1;
    }
  const analyzedSkills = Object.entries(analyzedCounts)
    .map(([id, count]) => ({
      id,
      count,
      denominator: analyzedDenominator,
      share: count / analyzedDenominator,
    }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const top = skills.slice(0, 8),
    matrix = [...roleRows]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 9)
      .map(([occupationId, role]) => ({
        occupationId,
        count: role.count,
        values: Object.fromEntries(
          top.map((s) => [s.id, role.skills[s.id] || 0]),
        ),
      }));
  const eligible = rows.filter(payEligible),
    knownArrangement = rows.filter((r) => r.arrangement),
    remote = rows.filter(
      (r) => r.arrangement === "Remote" || r.arrangement === "Hybrid",
    );
  const knownText = rows.filter((r) => r.hasDescription === true).length,
    unknownText = rows.filter((r) => r.hasDescription === null).length;
  const metric = (
    id: string,
    value: number | null,
    numerator: number,
    denominator: number,
    missing: number,
    excluded: number,
    unit: string,
    definition: string,
  ): Metric => ({
    id,
    value,
    numerator,
    denominator,
    missing,
    excluded,
    unit,
    definition,
  });
  const mids = eligible.map(
    (r) => (r.pay!.annualLow! + r.pay!.annualHigh!) / 2,
  );
  const metrics = [
    metric(
      "postings",
      n,
      n,
      n,
      0,
      0,
      "postings",
      "Distinct canonical posting IDs in the selected source mode and availability scope.",
    ),
    metric(
      "remote",
      knownArrangement.length ? remote.length / knownArrangement.length : null,
      remote.length,
      knownArrangement.length,
      n - knownArrangement.length,
      0,
      "share",
      "Remote or hybrid / postings with known arrangement. Unknown arrangement is excluded from this denominator.",
    ),
    metric(
      "pay",
      median(mids),
      eligible.length,
      eligible.length,
      rows.filter((r) => !r.pay).length,
      rows.filter((r) => r.pay && !payEligible(r)).length,
      "USD/year",
      "Median annual posted-range midpoint among valid USD records. Hourly ranges use 2,080 hours and monthly ranges use 12 months; posted offers are not earnings.",
    ),
    metric(
      "text",
      knownText,
      knownText,
      n,
      unknownText,
      0,
      "postings",
      "Records with usable locally analyzed description text; upstream text coverage is unknown.",
    ),
  ];
  const degreeRows = rows.filter((r) => r.degree),
    bachelors = degreeRows.filter((r) => r.degree === "Bachelor's").length;
  metrics.push(
    metric(
      "remote_all",
      n ? remote.length / n : null,
      remote.length,
      n,
      0,
      0,
      "share",
      "Remote or hybrid / all selected postings, including unknown arrangement.",
    ),
    metric(
      "degree",
      degreeRows.length ? bachelors / degreeRows.length : null,
      bachelors,
      degreeRows.length,
      n - degreeRows.length,
      0,
      "share",
      "Parsed Bachelor's category / records with a recognized degree. This is one category, not all jobs requiring a degree.",
    ),
  );
  const focus = options.focus || skills[0]?.id || "",
    focusRows = rows.filter((r) => r.skillIds.includes(focus)),
    neighbors: Record<string, number> = {};
  for (const r of focusRows)
    for (const s of r.skillIds)
      if (s !== focus) neighbors[s] = (neighbors[s] || 0) + 1;
  const edges = Object.entries(neighbors)
    .filter(([, n]) => n >= 3)
    .map(([id, count]) => ({
      id,
      count,
      jaccard: count / (focusRows.length + (skillCounts[id] || 0) - count),
      denominator: n,
    }))
    .sort((a, b) => b.jaccard - a.jaccard || b.count - a.count)
    .slice(0, 5);
  const pages = Math.max(1, Math.ceil(n / 25)),
    page = Math.min(Math.max(0, options.page || 0), pages - 1),
    membership = new Set(rows.map((r) => r.id)),
    pageRows: Posting[] = [];
  let offset = 0;
  for (const r of ordered(index, options.sort || "title"))
    if (membership.has(r.id)) {
      if (offset++ >= page * 25) pageRows.push(r);
      if (pageRows.length === 25) break;
    }
  const payFlags: Record<string, number> = {};
  for (const r of rows)
    if (!payEligible(r)) {
      if (!r.pay)
        payFlags["No pay range"] = (payFlags["No pay range"] || 0) + 1;
      else
        for (const f of r.pay.flags.length
          ? r.pay.flags
          : ["Ineligible currency or period"])
          payFlags[f] = (payFlags[f] || 0) + 1;
    }
  const result: Analysis = {
    count: n,
    employers: new Set(rows.map((r) => r.companyId)).size,
    facets,
    cells: [...cellCounts.values()].sort(
      (a, b) =>
        a.occupationId.localeCompare(b.occupationId) ||
        a.level.localeCompare(b.level),
    ),
    skills,
    analyzedSkills,
    matrix,
    metrics,
    pay: eligible.slice(0, 100).map((r) => ({
      id: r.id,
      low: r.pay!.annualLow!,
      high: r.pay!.annualHigh!,
      title: r.title,
    })),
    payEligible: eligible.length,
    payFlags,
    knownText,
    unknownText,
    conflicts: rows.filter((r) => r.quality.conflictGroups.length).length,
    complete: rows.filter((r) => r.quality.completeness === "complete").length,
    availability: count(rows.map((r) => r.availability)),
    dates: count(rows.map((r) => r.dateBasis)),
    graph: { focus, count: focusRows.length, edges },
    records: pageRows,
    page,
    pages,
  };
  if (index.aggregates.size >= 24)
    index.aggregates.delete(index.aggregates.keys().next().value!);
  index.aggregates.set(aggregateKey, { rows, result });
  return {
    ...result,
    ...(options.includeIds ? { ids: rows.map((r) => r.id) } : {}),
  };
}
export function cohortRows(index: Indexed, c: Cohort): Posting[] {
  if (!c.ids) return filterRecords(index, c.query);
  if (new Set(c.ids).size !== c.ids.length)
    throw Error("Pinned cohort contains duplicate posting IDs.");
  return c.ids.map((id) => {
    const r = index.byId.get(id);
    if (!r)
      throw Error(`Pinned posting is unavailable in this source mode: ${id}`);
    return r;
  });
}
export function compare(
  aIndex: Indexed,
  bIndex: Indexed,
  a: Cohort,
  b: Cohort,
): CompareResult {
  const ar = cohortRows(aIndex, a),
    br = cohortRows(bIndex, b),
    all = emptyQuery();
  all.filters.availability = [];
  const aa = analyze(aIndex, a.ids ? all : a.query, { ids: a.ids }),
    bb = analyze(bIndex, b.ids ? all : b.query, { ids: b.ids }),
    bs = new Set(br.map((r) => r.id)),
    as = new Map(aa.skills.map((s) => [s.id, s])),
    bss = new Map(bb.skills.map((s) => [s.id, s]));
  return {
    a: aa,
    b: bb,
    overlap: ar.filter((r) => bs.has(r.id)).length,
    skills: [...new Set([...as.keys(), ...bss.keys()])]
      .map((id) => ({
        id,
        a: as.get(id)?.share || 0,
        b: bss.get(id)?.share || 0,
        countA: as.get(id)?.count || 0,
        countB: bss.get(id)?.count || 0,
        difference:
          aa.count && bb.count
            ? 100 * ((as.get(id)?.share || 0) - (bss.get(id)?.share || 0))
            : null,
      }))
      .sort((a, b) => Math.abs(b.difference || 0) - Math.abs(a.difference || 0))
      .slice(0, 12),
  };
}
export function safeCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function exportCsv(
  rows: Posting[],
  mode: string,
  version: string,
  names: Record<string, string> = {},
): string {
  const fields = [
    "id",
    "title",
    "company",
    "occupation",
    "arrangement",
    "availability",
    "availability_as_of",
    "date_basis",
    "source_mode",
    "dataset_version",
    "url",
    "employer_name",
    "level",
    "employment_type",
    "countries",
    "degree",
    "equivalent_experience",
    "experience_years",
    "skill_ids",
    "recorded_skills",
    "pay_low",
    "pay_high",
    "pay_currency",
    "pay_period",
    "annual_low",
    "annual_high",
    "eligible_usd_pay",
    "pay_flags",
    "source_posted_date",
    "first_observed_at",
    "last_observed_at",
    "analyzed_text",
    "source_ids",
    "completeness",
    "quality_flags",
    "conflict_groups",
    "field_provenance",
  ];
  return (
    "\uFEFF" +
    [
      fields.map(safeCell).join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.title,
          r.companyId,
          r.occupationId,
          r.arrangement,
          r.availability,
          r.availabilityAsOf,
          r.dateBasis,
          mode,
          version,
          r.sourceUrl,
          names[r.companyId] || r.companyId,
          r.level,
          r.employmentType,
          [...new Set(r.locations.map((l) => l.country).filter(Boolean))].join(
            "; ",
          ),
          r.degree,
          r.equivalentExperience,
          r.experienceYears,
          r.skillIds.join("; "),
          r.skillIds.map((id) => names[id] || id).join("; "),
          r.pay?.low,
          r.pay?.high,
          r.pay?.currency,
          r.pay?.period,
          r.pay?.annualLow,
          r.pay?.annualHigh,
          payEligible(r),
          r.pay?.flags.join("; "),
          r.sourcePostedDate,
          r.firstObservedAt,
          r.lastObservedAt,
          r.hasDescription,
          r.sourceIds.join("; "),
          r.quality.completeness,
          r.quality.flags.join("; "),
          r.quality.conflictGroups.join("; "),
          JSON.stringify({ groups: r.provenance, fields: r.fieldProvenance }),
        ]
          .map(safeCell)
          .join(","),
      ),
    ].join("\r\n")
  );
}
