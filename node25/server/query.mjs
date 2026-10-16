import { DuckDBInstance } from "@duckdb/node-api";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const STORE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../store",
);
export const METRIC_VERSION = "node25-distinct-v1";
const list = z.array(z.string().min(1).max(160)).max(32);
export const Filter = z
  .object({
    search: z.string().max(160).optional(),
    companyIds: list.optional(),
    occupationIds: list.optional(),
    skillIds: list.optional(),
    countries: list.optional(),
    arrangements: list.optional(),
    availability: z.enum(["open", "all", "closed"]).optional(),
  })
  .strict();
export const Request = z
  .object({
    protocolVersion: z.literal("2.5"),
    datasetVersion: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    requestId: z.string().min(1).max(100),
    sourceMode: z.enum(["combined", "upstream", "local"]),
    view: z.enum(["overview", "records", "compare", "skills", "evidence"]),
    filter: Filter,
    page: z
      .object({
        offset: z.number().int().min(0).max(1000000),
        limit: z.number().int().min(1).max(100),
      })
      .strict()
      .optional(),
    cohortA: Filter.optional(),
    cohortB: Filter.optional(),
  })
  .strict();
export const runtime = {
  startedAt: new Date().toISOString(),
  queries: 0,
  errors: 0,
  cacheHits: 0,
  active: 0,
  queued: 0,
};
let ready;
let searchLabels = { companies: new Map(), skills: new Map() };
export function load() {
  return (ready ??= (async () => {
    const release = JSON.parse(
      await readFile(resolve(STORE, "release.json"), "utf8"),
    );
    for (const file of release.files) {
      if (file.path !== basename(file.path))
        throw new Error("Invalid store path");
      const bytes = await readFile(resolve(STORE, file.path));
      if (
        bytes.length !== file.bytes ||
        createHash("sha256").update(bytes).digest("hex") !== file.sha256
      )
        throw new Error("Release integrity check failed");
    }
    const instance = await DuckDBInstance.create(":memory:", {
      threads: "2",
      memory_limit: "768MB",
      allow_unsigned_extensions: "false",
      autoinstall_known_extensions: "false",
      autoload_known_extensions: "false",
    });
    const conn = await instance.connect();
    const path = resolve(STORE, "postings.parquet").replaceAll("'", "''");
    await conn.run(
      `CREATE TABLE postings AS SELECT * FROM read_parquet('${path}')`,
    );
    await conn.run("SET enable_external_access=false");
    await conn.run("SET lock_configuration=true");
    conn.closeSync();
    const catalog = release.catalog;
    const labels = {
      companies: new Map(catalog.companies.map((r) => [r.id, r.name])),
      occupations: new Map(catalog.occupations.map((r) => [r.id, r.name])),
      skills: new Map(catalog.skills.map((r) => [r.id, r.name])),
    };
    searchLabels = labels;
    return { instance, release, labels };
  })().catch((e) => {
    ready = undefined;
    throw e;
  }));
}
const cache = new Map();
let waiting = [];
export async function slot() {
  if (runtime.active >= 2) {
    if (waiting.length >= 16)
      throw Object.assign(new Error("Query queue busy; retry shortly"), {
        status: 429,
      });
    runtime.queued++;
    await new Promise((resolve, reject) => {
      const entry = {
        resolve,
        timer: setTimeout(() => {
          waiting = waiting.filter((w) => w !== entry);
          runtime.queued--;
          reject(
            Object.assign(new Error("Query queue timeout"), { status: 503 }),
          );
        }, 5000),
      };
      waiting.push(entry);
    });
  }
  runtime.active++;
}
export function free() {
  runtime.active--;
  const next = waiting.shift();
  if (next) {
    clearTimeout(next.timer);
    runtime.queued--;
    next.resolve();
  }
}
export function normalizeFilter(f = {}) {
  const out = { availability: f.availability ?? "open" };
  for (const k of [
    "companyIds",
    "occupationIds",
    "skillIds",
    "countries",
    "arrangements",
  ])
    if (f[k]?.length) out[k] = [...new Set(f[k])].sort();
  if (f.search?.trim()) out.search = f.search.trim();
  return out;
}
export function predicate(mode, filter, values = []) {
  const f = normalizeFilter(filter),
    parts = [];
  const bind = (v) => {
    values.push(v);
    return `$${values.length}`;
  };
  parts.push(`mode=${bind(mode)}`);
  if (f.availability === "open")
    parts.push("availability IN ('local_observed','upstream_reported_open')");
  if (f.availability === "closed") parts.push("availability='closed'");
  for (const [key, col] of [
    ["companyIds", "companyId"],
    ["occupationIds", "occupationId"],
    ["arrangements", "arrangement"],
  ])
    if (f[key])
      parts.push(
        `coalesce("${col}",'Unknown') IN (${f[key].map(bind).join(",")})`,
      );
  if (f.countries)
    parts.push(
      "(" +
        f.countries
          .map((v) =>
            v === "Unknown"
              ? "len(countries)=0"
              : `list_contains(countries,${bind(v)})`,
          )
          .join(" OR ") +
        ")",
    );
  if (f.skillIds)
    for (const skill of f.skillIds)
      parts.push(`list_contains("skillIds",${bind(skill)})`);
  if (f.search) {
    const word = f.search.toLowerCase(),
      alternatives = [
        `contains(lower(title || ' ' || "companyId" || ' ' || id), lower(${bind(f.search)}))`,
      ];
    const companyIds = [...searchLabels.companies]
      .filter(([id, label]) => label.toLowerCase().includes(word))
      .map(([id]) => id);
    const skillIds = [...searchLabels.skills]
      .filter(([id, label]) => label.toLowerCase().includes(word))
      .map(([id]) => id);
    if (companyIds.length)
      alternatives.push(`"companyId" IN (${companyIds.map(bind).join(",")})`);
    for (const id of skillIds)
      alternatives.push(`list_contains("skillIds",${bind(id)})`);
    parts.push("(" + alternatives.join(" OR ") + ")");
  }
  return { sql: parts.join(" AND "), values };
}
export async function rows(conn, sql, values = []) {
  if (conn.lensDeadline && performance.now() > conn.lensDeadline)
    throw Object.assign(
      new Error("Interactive query deadline exceeded; narrow selection"),
      { status: 503 },
    );
  return (await conn.runAndReadAll(sql, values)).getRowObjects();
}
export async function stats(conn, where, values, version, mode) {
  const [r] = await rows(
    conn,
    `SELECT count(*)::INTEGER AS count, count(DISTINCT "companyId")::INTEGER AS "companyCount",count(*) FILTER(WHERE "hasDescription"=true)::INTEGER AS "analyzedTextCount",count(*) FILTER(WHERE "eligiblePay")::INTEGER AS "eligiblePayCount",count(*) FILTER(WHERE len(countries)=0)::INTEGER AS "unknownCountryCount",count(*) FILTER(WHERE arrangement IS NULL)::INTEGER AS "unknownArrangementCount", median("annualLow") FILTER(WHERE "eligiblePay") AS "medianLow",median("annualHigh") FILTER(WHERE "eligiblePay") AS "medianHigh",sha256(coalesce(string_agg(id,chr(10) ORDER BY id),'')) AS ids FROM postings WHERE ${where}`,
    values,
  );
  r.hash = createHash("sha256")
    .update([version, mode, METRIC_VERSION, r.ids].join(":"))
    .digest("hex");
  delete r.ids;
  return r;
}
async function skills(conn, where, values, matched, labels) {
  return (
    await rows(
      conn,
      `SELECT id, count(*)::INTEGER AS count FROM (SELECT unnest("skillIds") AS id FROM postings WHERE ${where}) GROUP BY 1 ORDER BY count DESC,1 LIMIT 40`,
      values,
    )
  ).map((r) => ({
    ...r,
    label: labels.skills.get(r.id) ?? r.id,
    share: matched ? r.count / matched : 0,
  }));
}
async function groups(conn, where, values, col, labels, limit = 12) {
  return (
    await rows(
      conn,
      `SELECT coalesce("${col}",'Unknown') AS id,count(*)::INTEGER AS count FROM postings WHERE ${where} GROUP BY 1 ORDER BY count DESC,1 LIMIT ${limit}`,
      values,
    )
  ).map((r) => ({ ...r, label: labels?.get(r.id) ?? r.id }));
}
async function overview(conn, p, s, ctx) {
  const { labels } = ctx;
  const companies = await groups(
      conn,
      p.sql,
      p.values,
      "companyId",
      labels.companies,
      12,
    ),
    occupations = await groups(
      conn,
      p.sql,
      p.values,
      "occupationId",
      labels.occupations,
      12,
    ),
    arrangements = await groups(conn, p.sql, p.values, "arrangement", null, 10);
  const countries = (
    await rows(
      conn,
      `SELECT id,count(*)::INTEGER AS count FROM (SELECT unnest(CASE WHEN len(countries)=0 THEN ['Unknown'] ELSE countries END) AS id FROM postings WHERE ${p.sql}) GROUP BY 1 ORDER BY count DESC,1 LIMIT 20`,
      p.values,
    )
  ).map((r) => ({ ...r, label: r.id }));
  const cells = await rows(
    conn,
    `SELECT "companyId",coalesce("occupationId",'Unknown') AS "occupationId",count(*)::INTEGER AS count FROM postings WHERE ${p.sql} GROUP BY "companyId",coalesce("occupationId",'Unknown')`,
    p.values,
  );
  const shown = cells.filter(
    (c) =>
      companies.some((x) => x.id === c.companyId) &&
      occupations.some((x) => x.id === c.occupationId),
  );
  return {
    companyCount: s.companyCount,
    analyzedTextCount: s.analyzedTextCount,
    eligiblePayCount: s.eligiblePayCount,
    unknownCountryCount: s.unknownCountryCount,
    unknownArrangementCount: s.unknownArrangementCount,
    pay: {
      count: s.eligiblePayCount,
      medianLow: s.medianLow,
      medianHigh: s.medianHigh,
      currency: "USD",
      basis: "annual advertised range bounds",
    },
    companies,
    occupations,
    countries,
    arrangements,
    matrix: {
      companies,
      occupations,
      cells: shown,
      otherCount: s.count - shown.reduce((n, c) => n + c.count, 0),
    },
    skills: await skills(conn, p.sql, p.values, s.count, labels),
    coverage: {
      total: s.count,
      shownCompanies: companies.length,
      shownOccupations: occupations.length,
    },
  };
}
export async function query(input) {
  const parsed = Request.safeParse(input);
  if (!parsed.success)
    throw Object.assign(
      new Error(
        "Invalid query: " +
          parsed.error.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; ")
            .slice(0, 500),
      ),
      { status: 400 },
    );
  const req = parsed.data,
    started = performance.now(),
    ctx = await load();
  if (req.datasetVersion && req.datasetVersion !== ctx.release.datasetVersion)
    throw Object.assign(
      new Error("Dataset changed; reload before restoring this selection"),
      { status: 409 },
    );
  const normalized = {
    ...req,
    requestId: undefined,
    filter: normalizeFilter(req.filter),
    cohortA: req.cohortA && normalizeFilter(req.cohortA),
    cohortB: req.cohortB && normalizeFilter(req.cohortB),
  };
  const key = JSON.stringify(normalized),
    hit = cache.get(key);
  if (hit) {
    runtime.cacheHits++;
    cache.delete(key);
    cache.set(key, hit);
    return {
      ...hit,
      requestId: req.requestId,
      elapsedMs: Math.round(performance.now() - started),
    };
  }
  await slot();
  let conn;
  let deadline;
  try {
    runtime.queries++;
    conn = await ctx.instance.connect();
    conn.lensDeadline = performance.now() + 5000;
    deadline = setTimeout(() => conn.interrupt(), 5000);
    const p = predicate(req.sourceMode, req.filter),
      s = await stats(
        conn,
        p.sql,
        p.values,
        ctx.release.datasetVersion,
        req.sourceMode,
      );
    let data;
    if (req.view === "overview") data = await overview(conn, p, s, ctx);
    else if (req.view === "records") {
      const { offset = 0, limit = 100 } = req.page ?? {};
      const rr = await rows(
        conn,
        `SELECT "detailJSON" FROM postings WHERE ${p.sql} ORDER BY id LIMIT ${limit} OFFSET ${offset}`,
        p.values,
      );
      data = {
        rows: rr.map((r) => JSON.parse(r.detailJSON)),
        total: s.count,
        offset,
        limit,
        hasMore: offset + limit < s.count,
      };
    } else if (req.view === "skills") {
      const sk = await skills(conn, p.sql, p.values, s.count, ctx.labels),
        ids = sk.slice(0, 12).map((r) => r.id),
        coMentions = [];
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const vals = [...p.values, ids[i], ids[j]];
          const [r] = await rows(
            conn,
            `SELECT count(*)::INTEGER AS count FROM postings WHERE ${p.sql} AND list_contains("skillIds",$${vals.length - 1}) AND list_contains("skillIds",$${vals.length})`,
            vals,
          );
          if (r.count)
            coMentions.push({ a: ids[i], b: ids[j], count: r.count });
        }
      data = {
        skills: sk,
        analyzedTextCount: s.analyzedTextCount,
        coMentions,
        basis:
          "Recorded skill mentions / distinct matched postings. Unknown upstream description coverage is not a negative skill observation.",
      };
    } else if (req.view === "evidence")
      data = {
        counts: ctx.release.counts,
        sources: ctx.release.catalog.sources,
        methods: ctx.release.methods,
        limitations: ctx.release.limitations,
        coverage: {
          analyzedTextCount: s.analyzedTextCount,
          unknownCountryCount: s.unknownCountryCount,
          unknownArrangementCount: s.unknownArrangementCount,
          eligiblePayCount: s.eligiblePayCount,
        },
        sourceModes: ctx.release.counts,
      };
    else {
      if (!req.cohortA || !req.cohortB)
        throw Object.assign(new Error("Pin both A and B before comparing"), {
          status: 400,
        });
      const a = predicate(req.sourceMode, req.cohortA),
        b = predicate(req.sourceMode, req.cohortB),
        bothVals = [],
        bothA = predicate(req.sourceMode, req.cohortA, bothVals),
        bothB = predicate(req.sourceMode, req.cohortB, bothVals);
      const sa = await stats(
          conn,
          a.sql,
          a.values,
          ctx.release.datasetVersion,
          req.sourceMode,
        ),
        sb = await stats(
          conn,
          b.sql,
          b.values,
          ctx.release.datasetVersion,
          req.sourceMode,
        );
      const [overlap] = await rows(
        conn,
        `SELECT count(*)::INTEGER AS count FROM postings WHERE (${bothA.sql}) AND (${bothB.sql})`,
        bothVals,
      );
      const ska = await skills(conn, a.sql, a.values, sa.count, ctx.labels),
        skb = await skills(conn, b.sql, b.values, sb.count, ctx.labels);
      const differences = [...new Set([...ska, ...skb].map((s) => s.id))]
        .map((id) => {
          const aa = ska.find((s) => s.id === id),
            bb = skb.find((s) => s.id === id);
          return {
            id,
            label: ctx.labels.skills.get(id) ?? id,
            aCount: aa?.count ?? 0,
            bCount: bb?.count ?? 0,
            aShare: aa?.share ?? 0,
            bShare: bb?.share ?? 0,
            delta: 100 * ((aa?.share ?? 0) - (bb?.share ?? 0)),
          };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      // Recompute every displayed skill in both cohorts: top-N absence is not a zero.
      for (const diff of differences)
        for (const [prefix, pp, ss] of [
          ["a", a, sa],
          ["b", b, sb],
        ]) {
          const vals = [...pp.values, diff.id];
          const [r] = await rows(
            conn,
            `SELECT count(*)::INTEGER AS count FROM postings WHERE ${pp.sql} AND list_contains("skillIds",$${vals.length})`,
            vals,
          );
          diff[prefix + "Count"] = r.count;
          diff[prefix + "Share"] = ss.count ? r.count / ss.count : 0;
          diff.delta = 100 * (diff.aShare - diff.bShare);
        }
      differences.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      data = {
        a: {
          count: sa.count,
          hash: sa.hash,
          companyCount: sa.companyCount,
          eligiblePayCount: sa.eligiblePayCount,
          skills: ska,
        },
        b: {
          count: sb.count,
          hash: sb.hash,
          companyCount: sb.companyCount,
          eligiblePayCount: sb.eligiblePayCount,
          skills: skb,
        },
        overlap: overlap.count,
        onlyA: sa.count - overlap.count,
        onlyB: sb.count - overlap.count,
        differences,
      };
    }
    const response = {
      protocolVersion: "2.5",
      datasetVersion: ctx.release.datasetVersion,
      requestId: req.requestId,
      sourceMode: req.sourceMode,
      matchedCount: s.count,
      contributorHash: s.hash,
      elapsedMs: Math.round(performance.now() - started),
      data,
    };
    if (Buffer.byteLength(JSON.stringify(response)) > 2_000_000)
      throw Object.assign(
        new Error("Result exceeds response budget; narrow the selection"),
        { status: 413 },
      );
    cache.set(key, { ...response, requestId: "" });
    while (cache.size > 64) cache.delete(cache.keys().next().value);
    return response;
  } catch (e) {
    runtime.errors++;
    throw e;
  } finally {
    clearTimeout(deadline);
    conn?.closeSync();
    free();
  }
}
export async function detail(input) {
  const p = z
      .object({
        sourceMode: z.enum(["combined", "upstream", "local"]),
        id: z.string().min(1).max(200),
        datasetVersion: z.string().optional(),
      })
      .strict()
      .parse(input),
    ctx = await load();
  if (p.datasetVersion && p.datasetVersion !== ctx.release.datasetVersion)
    throw Object.assign(new Error("Dataset changed; reload"), { status: 409 });
  await slot();
  const conn = await ctx.instance.connect();
  try {
    const rr = await rows(
      conn,
      'SELECT "detailJSON" FROM postings WHERE mode=$1 AND id=$2',
      [p.sourceMode, p.id],
    );
    if (!rr.length)
      throw Object.assign(new Error("Posting not found"), { status: 404 });
    return {
      protocolVersion: "2.5",
      datasetVersion: ctx.release.datasetVersion,
      data: { row: JSON.parse(rr[0].detailJSON) },
    };
  } finally {
    conn.closeSync();
    free();
  }
}
export function csvCell(v) {
  const text = String(v ?? "");
  return (
    '"' +
    (/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text).replaceAll(
      '"',
      '""',
    ) +
    '"'
  );
}
async function writeChunk(res, text) {
  if (res.destroyed) return false;
  if (!res.write(text))
    await new Promise((resolve) => {
      const done = () => {
        res.off("drain", done);
        res.off("close", done);
        resolve();
      };
      res.once("drain", done);
      res.once("close", done);
    });
  return !res.destroyed;
}
export async function exportResolvedCsv(input, res, resolvePredicate) {
  const req = Request.parse({ ...input, view: "records" }),
    ctx = await load();
  if (req.datasetVersion && req.datasetVersion !== ctx.release.datasetVersion)
    throw Object.assign(new Error("Dataset changed; reload"), { status: 409 });
  await slot();
  const conn = await ctx.instance.connect();
  try {
    let p;
    if (resolvePredicate) {
      conn.lensDeadline = performance.now() + 5000;
      const timer = setTimeout(() => conn.interrupt(), 5000);
      try {
        p = await resolvePredicate(conn, ctx);
      } finally {
        clearTimeout(timer);
        conn.lensDeadline = undefined;
      }
    } else p = predicate(req.sourceMode, req.filter);
    const s = await stats(
      conn,
      p.sql,
      p.values,
      ctx.release.datasetVersion,
      req.sourceMode,
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="jobmarket-node25.csv"',
    );
    res.setHeader("X-Contributor-Hash", s.hash);
    res.setHeader("X-Dataset-Version", ctx.release.datasetVersion);
    const cell = csvCell;
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
    res.setHeader("X-Export-Rows", String(s.count));
    res.write("\uFEFF" + fields.map(cell).join(",") + "\r\n");
    let after = "";
    for (let emitted = 0; emitted < s.count; ) {
      const values = [...p.values, after];
      const page = await rows(
        conn,
        `SELECT id,"detailJSON" FROM postings WHERE ${p.sql} AND id>$${values.length} ORDER BY id LIMIT 1000`,
        values,
      );
      if (!page.length)
        throw new Error("Export contributor reconciliation failed");
      let chunk = "";
      for (const r of page) {
        const v = JSON.parse(r.detailJSON);
        const cells = [
          v.id,
          v.title,
          v.companyId,
          v.occupationId,
          v.arrangement,
          v.availability,
          v.availabilityAsOf,
          v.dateBasis,
          req.sourceMode,
          ctx.release.datasetVersion,
          v.sourceUrl,
          ctx.labels.companies.get(v.companyId) ?? v.companyId,
          v.level,
          v.employmentType,
          [...new Set(v.locations.map((l) => l.country).filter(Boolean))].join(
            "; ",
          ),
          v.degree,
          v.equivalentExperience,
          v.experienceYears,
          v.skillIds.join("; "),
          v.skillIds.map((id) => ctx.labels.skills.get(id) ?? id).join("; "),
          v.pay?.low,
          v.pay?.high,
          v.pay?.currency,
          v.pay?.period,
          v.pay?.annualLow,
          v.pay?.annualHigh,
          !!v.pay?.valid && v.pay?.currency === "USD",
          v.pay?.flags.join("; "),
          v.sourcePostedDate,
          v.firstObservedAt,
          v.lastObservedAt,
          v.hasDescription,
          v.sourceIds.join("; "),
          v.quality.completeness,
          v.quality.flags.join("; "),
          v.quality.conflictGroups.join("; "),
          JSON.stringify({ groups: v.provenance, fields: v.fieldProvenance }),
        ];
        chunk += cells.map(cell).join(",") + "\r\n";
      }
      if (!(await writeChunk(res, chunk))) return;
      emitted += page.length;
      after = page.at(-1).id;
    }
    res.end();
  } finally {
    conn.closeSync();
    free();
  }
}

// Trusted module resolver only; HTTP input still passes the unchanged 2.5 Request schema.
export async function exportCsv(input, res) {
  return exportResolvedCsv(input, res);
}
