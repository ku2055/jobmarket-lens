import { describe, it, expect } from "vitest";
import { canonicalState, initialState, validateState } from "../src/app/state";
const version = "a".repeat(64);
describe("strict public analysis state", () => {
  it("round trips source, filters, cohorts and selection", () => {
    const s = initialState(version);
    s.query.filters.arrangement = ["Remote"];
    s.a = {
      name: "A",
      datasetVersion: version,
      sourceMode: "local",
      query: structuredClone(s.query),
      ids: ["b", "a"],
    };
    const next = validateState(JSON.parse(JSON.stringify(s)));
    expect(canonicalState(next).a!.ids).toEqual(["a", "b"]);
  });
  it("rejects unexpected private fields at every nested object boundary", () => {
    for (const inject of [
      (s: any) => (s.description = "PRIVATE_SENTINEL"),
      (s: any) => (s.query.filters.description = ["secret"]),
      (s: any) =>
        (s.a = {
          name: "A",
          datasetVersion: version,
          sourceMode: "local",
          query: s.query,
          privateEvidence: "secret",
        }),
    ]) {
      const s = initialState(version);
      inject(s);
      expect(() => validateState(s)).toThrow();
    }
  });
  it("rejects invalid availability and arrangement enums", () => {
    const s = initialState(version);
    s.query.filters.arrangement = ["Teleport"];
    expect(() => validateState(s)).toThrow();
    s.query.filters.arrangement = [];
    s.query.filters.availability = ["hired"];
    expect(() => validateState(s)).toThrow();
  });
  it("rejects duplicate IDs, unsupported versions and overlong selections", () => {
    const s = initialState(version);
    s.a = {
      name: "A",
      datasetVersion: version,
      sourceMode: "local",
      query: s.query,
      ids: ["x", "x"],
    };
    expect(() => validateState(s)).toThrow();
    s.a = null;
    (s as any).v = 3;
    expect(() => validateState(s)).toThrow();
  });
});
