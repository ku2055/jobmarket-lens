import { describe, it, expect } from "vitest";
import {
  analyze,
  createIndex,
  compare,
  cohortRows,
  payEligible,
} from "../src/analysis/engine";
import { emptyQuery, type Posting, type Cohort } from "../src/data/types";
function record(id: string, changes: Partial<Posting> = {}): Posting {
  return {
    id,
    companyId: "A",
    title: id,
    sourceUrl: null,
    occupationId: "15",
    level: "Senior",
    employmentType: null,
    arrangement: "Remote",
    degree: null,
    equivalentExperience: null,
    experienceYears: null,
    locations: [],
    skillIds: [],
    licenseIds: [],
    pay: null,
    sourcePostedDate: null,
    dateBasis: "unknown",
    firstObservedAt: null,
    lastObservedAt: null,
    hasDescription: null,
    availability: "local_observed",
    availabilityAsOf: "2026-10-16",
    availabilitySourceId: "local:A",
    sourceIds: ["local:A"],
    quality: { completeness: "partial", flags: [], conflictGroups: [] },
    provenance: {
      status: "local:A",
      date: "local:A",
      location: "local:A",
      pay: "local:A",
      skills: "local:A",
      qualifications: "local:A",
    },
    fieldProvenance: {},
    ...changes,
  };
}
const pay = {
  low: 100000,
  high: 200000,
  currency: "USD",
  period: "year",
  annualLow: 100000,
  annualHigh: 200000,
  valid: true,
  flags: [],
};
const rows = [
  record("1", { skillIds: ["Python"], hasDescription: true, pay }),
  record("2", { skillIds: ["SQL"], level: null, arrangement: null }),
  record("3", {
    companyId: "B",
    skillIds: ["Python", "SQL"],
    arrangement: "On-site",
    pay: { ...pay, period: "typo" },
  }),
  record("4", {
    companyId: "B",
    level: "Mid",
    arrangement: "Hybrid",
    pay: { ...pay, currency: "CAD" },
  }),
];
const cohort = (ids: string[]): Cohort => ({
  name: "Fixture",
  datasetVersion: "a".repeat(64),
  sourceMode: "local",
  query: emptyQuery(),
  ids,
});
describe("independent query oracle", () => {
  it("calculates exact self-excluding facets and unknowns", () => {
    const q = emptyQuery();
    q.includeUnknown = false;
    q.filters.companyId = ["A"];
    q.filters.level = ["Senior"];
    const r = analyze(createIndex(rows), q, { includeIds: true });
    expect(r.ids).toEqual(["1"]);
    expect(
      Object.fromEntries(r.facets.companyId.map((x) => [x.value, x.count])),
    ).toEqual({ A: 1, B: 1 });
    expect(
      Object.fromEntries(r.facets.level.map((x) => [x.value, x.count])),
    ).toEqual({ Senior: 1, __unknown__: 1 });
    q.includeUnknown = true;
    expect(analyze(createIndex(rows), q, { includeIds: true }).ids).toEqual([
      "1",
      "2",
    ]);
  });
  it("separates recorded/text skill denominators and known/all remote shares", () => {
    const r = analyze(createIndex(rows), emptyQuery());
    expect(r.skills.find((x) => x.id === "Python")).toMatchObject({
      count: 2,
      denominator: 4,
      share: 0.5,
    });
    expect(r.analyzedSkills.find((x) => x.id === "Python")).toMatchObject({
      count: 1,
      denominator: 1,
      share: 1,
    });
    expect(r.metrics.find((x) => x.id === "remote")).toMatchObject({
      numerator: 2,
      denominator: 3,
      missing: 1,
    });
    expect(r.metrics.find((x) => x.id === "remote_all")).toMatchObject({
      numerator: 2,
      denominator: 4,
      value: 0.5,
    });
  });
  it("partitions pay missing/excluded and rejects unsupported period/currency", () => {
    const r = analyze(createIndex(rows), emptyQuery());
    expect(r.metrics.find((x) => x.id === "pay")).toMatchObject({
      value: 150000,
      denominator: 1,
      missing: 1,
      excluded: 2,
    });
    expect(payEligible(rows[2])).toBe(false);
    expect(payEligible(rows[3])).toBe(false);
  });
  it("retains overlap and percentage-point differences", () => {
    const idx = createIndex(rows),
      r = compare(idx, idx, cohort(["1", "2"]), cohort(["2", "3"]));
    expect(r.overlap).toBe(1);
    expect(r.a.count).toBe(2);
    expect(r.b.count).toBe(2);
    expect(r.skills.find((x) => x.id === "SQL")).toMatchObject({
      countA: 1,
      countB: 2,
      difference: -50,
    });
  });
  it("rejects duplicate IDs and invalid pinned membership", () => {
    expect(() => createIndex([rows[0], rows[0]])).toThrow(/Duplicate/);
    const idx = createIndex(rows);
    expect(() => cohortRows(idx, cohort(["1", "1"]))).toThrow(/duplicate/);
    expect(() => cohortRows(idx, cohort(["missing"]))).toThrow(/unavailable/);
  });
  it("reports null for undefined empty-population ratios/differences", () => {
    const idx = createIndex(rows),
      r = compare(idx, idx, cohort([]), cohort(["1"]));
    expect(r.skills[0].difference).toBeNull();
    expect(r.a.metrics.find((x) => x.id === "remote")!.value).toBeNull();
  });
});
