import type { FacetKey, Query } from "../data/types";
export const number = (n: number) => n.toLocaleString("en-US"),
  pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
export const money = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);
export const facetLabels: Record<FacetKey, string> = {
  companyId: "Employers",
  occupationId: "Occupation",
  level: "Career level",
  arrangement: "Work arrangement",
  country: "Country",
  skillIds: "Recorded skills",
  availability: "Availability",
};
export function queryDescription(q: Query, label: (id: string) => string) {
  const parts = Object.entries(q.filters)
    .filter(([, v]) => v.length)
    .map(
      ([k, v]) => `${facetLabels[k as FacetKey]}: ${v.map(label).join(", ")}`,
    );
  if (q.search) parts.unshift(`Search: “${q.search}”`);
  return parts.join(" · ") || "All records";
}
