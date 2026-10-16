export type Mode = "combined" | "upstream" | "local";
export type Workspace = "canvas" | "skills" | "evidence";
export type Filter = {
  search?: string;
  companyIds?: string[];
  occupationIds?: string[];
  skillIds?: string[];
  countries?: string[];
  arrangements?: string[];
  availability?: "open" | "all" | "closed";
};
export type Dimension =
  | "companyIds"
  | "occupationIds"
  | "skillIds"
  | "countries"
  | "arrangements";
export interface Category {
  id: string;
  label: string;
  count: number;
}
export interface Named {
  id: string;
  name: string;
}
export interface Catalog {
  analytics?: { scriptUrl: string; websiteId: string } | null;
  protocolVersion: "2.5";
  datasetVersion: string;
  counts: Record<string, number>;
  companies: Named[];
  occupations: Named[];
  skills: Named[];
  sources: Record<string, unknown>[];
  asOf: string;
  methods: Record<string, string>;
  limitations: string[];
}
export interface Envelope<T> {
  protocolVersion: "2.5";
  datasetVersion: string;
  requestId: string;
  sourceMode: Mode;
  matchedCount: number;
  contributorHash: string;
  elapsedMs: number;
  data: T;
}
export interface Overview {
  companyCount: number;
  analyzedTextCount: number;
  eligiblePayCount: number;
  unknownCountryCount: number;
  unknownArrangementCount: number;
  pay: {
    count: number;
    medianLow: number | null;
    medianHigh: number | null;
    currency: "USD";
    basis: string;
  };
  companies: Category[];
  occupations: Category[];
  countries: Category[];
  arrangements: Category[];
  matrix: {
    companies: { id: string; label: string }[];
    occupations: { id: string; label: string }[];
    cells: { companyId: string; occupationId: string; count: number }[];
    otherCount: number;
  };
  skills: Skill[];
  coverage: { total: number; shownCompanies: number; shownOccupations: number };
}
export interface Skill {
  id: string;
  label: string;
  count: number;
  share: number;
}
export interface SkillsResult {
  skills: Skill[];
  analyzedTextCount: number;
  coMentions: { a: string; b: string; count: number }[];
  basis: string;
}
export interface Comparison {
  a: {
    count: number;
    hash: string;
    companyCount: number;
    eligiblePayCount: number;
    skills: Skill[];
  };
  b: Comparison["a"];
  overlap: number;
  onlyA: number;
  onlyB: number;
  differences: {
    id: string;
    label: string;
    aCount: number;
    bCount: number;
    aShare: number;
    bShare: number;
    delta: number;
  }[];
}
export interface Evidence {
  counts: Record<string, number>;
  sources: Record<string, unknown>[];
  methods: Record<string, string>;
  limitations: string[];
  coverage: {
    analyzedTextCount: number;
    unknownCountryCount: number;
    unknownArrangementCount: number;
    eligiblePayCount: number;
  };
  sourceModes: Record<string, number>;
}
export interface Posting {
  id: string;
  title: string;
  companyId: string;
  sourceUrl: string | null;
  occupationId: string | null;
  level: string | null;
  arrangement: string | null;
  employmentType: string | null;
  degree: string | null;
  experienceYears: number | null;
  skillIds: string[];
  sourceIds: string[];
  availability: string;
  availabilityAsOf: string | null;
  sourcePostedDate: string | null;
  dateBasis: string;
  hasDescription: boolean | null;
  locations: {
    country: string | null;
    region: string | null;
    city: string | null;
    precision: string;
  }[];
  quality: { completeness: string; flags: string[]; conflictGroups: string[] };
  pay: {
    low: number | null;
    high: number | null;
    currency: string | null;
    period: string | null;
    annualLow: number | null;
    annualHigh: number | null;
    valid: boolean;
    flags: string[];
  } | null;
  provenance: Record<string, string>;
  fieldProvenance?: Record<string, string>;
}
export interface RecordsResult {
  rows: Posting[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
export interface Pin {
  label: string;
  mode: Mode;
  datasetVersion: string;
  filter: Filter;
  count: number;
}
export interface Study {
  v: "2.5";
  datasetVersion: string;
  mode: Mode;
  workspace: Workspace;
  filter: Filter;
  a: Pin | null;
  b: Pin | null;
}
export interface AdminData {
  deployment: Record<string, unknown>;
  collection: {
    counts: Record<string, number>;
    sources: Record<string, unknown>[];
    lastSnapshot: string | null;
    scheduled: boolean;
    runs: Record<string, unknown>[];
    limitations: string[];
  };
  traffic: {
    configured: boolean;
    source: string;
    visitors: number | null;
    pageViews: number | null;
    routes: Record<string, unknown>[];
    countries: Record<string, unknown>[];
    limitations: string[];
    providerDashboardUrl?: string;
    since?: string;
    until?: string;
    checkedAt?: string;
    status?: string;
  };
  runtime: Record<string, unknown>;
}
