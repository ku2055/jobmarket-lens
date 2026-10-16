import { parse } from "csv-parse/sync";
import { describe, it, expect } from "vitest";
import {
  analyze,
  compare,
  createIndex,
  exportCsv,
  filterRecords,
  payEligible,
  safeCell,
} from "../src/analysis/engine";
import { emptyQuery, type Cohort } from "../src/data/types";
import { posting, rows } from "./fixtures";
const version = "a".repeat(64);
describe("independent posting-set oracle", () => {
  it("filters open distinct IDs, keeps unknowns and calculates explicit denominators", () => {
    const a = analyze(createIndex(rows), emptyQuery());
    expect(a.count).toBe(4);
    expect(a.records.map((r) => r.id)).toEqual(["1", "2", "3", "5"]);
    expect(a.employers).toBe(2);
    expect(a.skills.find((s) => s.id === "python")).toMatchObject({
      count: 3,
      denominator: 4,
      share: 0.75,
    });
    expect(a.metrics.find((m) => m.id === "remote")).toMatchObject({
      numerator: 3,
      denominator: 3,
      missing: 1,
      value: 1,
    });
    expect(a.knownText).toBe(2);
    expect(a.unknownText).toBe(2);
  });
  it("uses OR within fields, AND across fields, with labeled unknown inclusion", () => {
    const q = emptyQuery();
    q.filters.arrangement = ["Remote", "Hybrid"];
    q.filters.companyId = ["A"];
    const idx = createIndex(rows);
    expect(filterRecords(idx, q).map((r) => r.id)).toEqual(["1", "3", "5"]);
    q.includeUnknown = false;
    expect(filterRecords(idx, q).map((r) => r.id)).toEqual(["1", "5"]);
    const a = analyze(idx, q);
    expect(
      a.facets.arrangement.find((s) => s.value === "__unknown__")?.count,
    ).toBe(1);
    expect(a.facets.companyId.find((s) => s.value === "B")?.count).toBe(1);
  });
  it("does not multiply a repeated skill mention", () => {
    const a = analyze(
      createIndex([posting("x", { skillIds: ["sql", "sql"] })]),
      emptyQuery(),
    );
    expect(a.skills[0].count).toBe(1);
  });
  it("handles zero denominators without invented zero-valued summaries", () => {
    const q = emptyQuery();
    q.search = "absent";
    const a = analyze(createIndex(rows), q);
    expect(a.count).toBe(0);
    expect(a.metrics.find((m) => m.id === "remote")!.value).toBeNull();
    expect(a.metrics.find((m) => m.id === "pay")!.value).toBeNull();
    expect(a.pages).toBe(1);
  });
  it("freezes explicit cohorts, retains overlap and source-specific values", () => {
    const q = emptyQuery(),
      a: Cohort = {
        name: "A",
        datasetVersion: version,
        sourceMode: "local",
        query: q,
        ids: ["1", "3"],
      },
      b: Cohort = { ...a, name: "B", sourceMode: "upstream", ids: ["3", "5"] };
    const r = compare(createIndex(rows), createIndex(rows), a, b);
    expect(r.a.count).toBe(2);
    expect(r.b.count).toBe(2);
    expect(r.overlap).toBe(1);
    expect(r.skills.find((s) => s.id === "sql")).toMatchObject({
      countA: 2,
      countB: 2,
      difference: 0,
    });
  });
  it("enforces minimum co-mention support, alongside Jaccard", () => {
    const q = emptyQuery();
    q.filters.availability = [];
    const a = analyze(createIndex(rows), q, { focus: "python" });
    expect(a.graph.edges).toEqual([
      { id: "sql", count: 3, jaccard: 3 / 5, denominator: 5 },
    ]);
    q.filters.availability = ["upstream_reported_open"];
    expect(
      analyze(createIndex(rows), q, { focus: "python" }).graph.edges,
    ).toHaveLength(0);
  });
  it("partitions missing and invalid pay and preserves interval eligibility", () => {
    const a = analyze(createIndex(rows), emptyQuery());
    expect(a.payEligible).toBe(1);
    expect(a.metrics.find((m) => m.id === "pay")).toMatchObject({
      value: 62400,
      missing: 2,
      excluded: 1,
    });
    expect(
      payEligible(
        posting("x", {
          pay: {
            low: 20,
            high: 10,
            currency: "USD",
            period: "year",
            annualLow: 20,
            annualHigh: 10,
            valid: true,
            flags: [],
          },
        }),
      ),
    ).toBe(false);
  });
  it("returns stable pages with ID tie-breakers and no dropped remainder", () => {
    const idx = createIndex(
        Array.from({ length: 53 }, (_, i) =>
          posting(String(i).padStart(2, "0"), { title: "Same title" }),
        ),
      ),
      q = emptyQuery();
    expect(analyze(idx, q, { page: 2 }).records.map((r) => r.id)).toEqual([
      "50",
      "51",
      "52",
    ]);
    expect(analyze(idx, q, { page: 100 }).page).toBe(2);
  });
  it("rejects duplicate canonical IDs at the indexing boundary", () =>
    expect(() => createIndex([posting("1"), posting("1")])).toThrow());
});
describe("safe consistent CSV", () => {
  it("quotes delimiters/newlines and protects formula-like cells", () => {
    expect(safeCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(safeCell("a,b\nc")).toBe('"a,b\nc"');
    expect(safeCell("  +123")).toBe('"\'  +123"');
  });
  it("exports the selected canonical IDs with source and version", () => {
    const selected = filterRecords(createIndex(rows), emptyQuery());
    const csv = exportCsv(selected, "combined", version);
    expect(csv.split("\r\n")).toHaveLength(5);
    expect(csv).toContain('"1","Role 1"');
    expect(csv).not.toContain('"4","Role 4"');
    expect(csv).toContain(version);
  });
});

it("round-trips complex exported text through an independent CSV parser", () => {
  const csv = exportCsv(
    [posting("x", { title: '=HYPERLINK("x,y")\nnext line' })],
    "local",
    version,
  );
  const result = parse(csv, { columns: true, bom: true }) as Record<
    string,
    string
  >[];
  expect(result).toHaveLength(1);
  expect(result[0].title).toBe('\'=HYPERLINK("x,y")\nnext line');
  expect(result[0].id).toBe("x");
  expect(result[0].dataset_version).toBe(version);
});
