export type SourceMode = "combined" | "upstream" | "local";
export type Workspace = "explore" | "compare" | "skills" | "evidence";
export interface PublicPay {
  low: number | null;
  high: number | null;
  currency: string | null;
  period: string | null;
  annualLow: number | null;
  annualHigh: number | null;
  valid: boolean;
  flags: string[];
}
export interface PublicLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  precision: string;
  primary: boolean;
}
export interface Posting {
  id: string;
  companyId: string;
  title: string;
  sourceUrl: string | null;
  occupationId: string | null;
  level: string | null;
  employmentType: string | null;
  arrangement: string | null;
  degree: string | null;
  equivalentExperience: boolean | null;
  experienceYears: number | null;
  locations: PublicLocation[];
  skillIds: string[];
  licenseIds: string[];
  pay: PublicPay | null;
  sourcePostedDate: string | null;
  dateBasis: string;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  hasDescription: boolean | null;
  availability: string;
  availabilityAsOf: string | null;
  availabilitySourceId: string;
  sourceIds: string[];
  quality: { completeness: string; flags: string[]; conflictGroups: string[] };
  provenance: Record<string, string>;
  fieldProvenance: Partial<Record<string, string>>;
}
export interface Manifest {
  schemaVersion: string;
  datasetVersion: string;
  builtAt: string;
  inputReleases: {
    id: string;
    commit: string | null;
    asOf: string | null;
    sha256: string;
  }[];
  methods: { import: string; merge: string; pay: string };
  counts: Record<SourceMode, number> & { overlap: number; rejected: number };
  localEvidenceAvailable: boolean;
  files: ReleaseFile[];
}
export interface ReleaseFile {
  path: string;
  sha256: string;
  bytes: number;
  recordCount: number;
  kind: "postings" | "companies" | "taxonomy" | "sources" | "summary";
  sourceMode: SourceMode | null;
}
export interface Company {
  id: string;
  name: string;
  sector: string | null;
  careerUrl: string | null;
}
export interface Taxonomy {
  skills: { id: string; name: string; family: string }[];
  licenses: { id: string; name: string }[];
  occupations: { id: string; name: string }[];
}
export interface Source {
  id: string;
  kind: string;
  asOf: string | null;
  commit: string | null;
  completeness: string;
}
export interface Summary {
  sourceModes: Record<
    SourceMode,
    {
      count: number;
      companies: number;
      availability: Record<string, number>;
      withValidPay: number;
      withAnalyzedText: number;
      unknownText: number;
    }
  >;
  limitations: string[];
}
export interface Catalog {
  manifest: Manifest;
  companies: Company[];
  taxonomy: Taxonomy;
  sources: Source[];
  summary: Summary;
}
export type FacetKey =
  | "companyId"
  | "occupationId"
  | "level"
  | "arrangement"
  | "country"
  | "skillIds"
  | "availability";
export interface Query {
  search: string;
  filters: Record<FacetKey, string[]>;
  includeUnknown: boolean;
}
export const OPEN = ["local_observed", "upstream_reported_open"];
export function emptyQuery(): Query {
  return {
    search: "",
    filters: {
      companyId: [],
      occupationId: [],
      level: [],
      arrangement: [],
      country: [],
      skillIds: [],
      availability: [...OPEN],
    },
    includeUnknown: true,
  };
}
export interface Cohort {
  name: string;
  datasetVersion: string;
  sourceMode: SourceMode;
  query: Query;
  ids?: string[];
}
export interface AppState {
  v: 2;
  datasetVersion: string;
  sourceMode: SourceMode;
  workspace: Workspace;
  query: Query;
  a: Cohort | null;
  b: Cohort | null;
  selected: string | null;
}
export interface Facet {
  value: string;
  count: number;
}
export interface Metric {
  id: string;
  value: number | null;
  numerator: number;
  denominator: number;
  missing: number;
  excluded: number;
  unit: string;
  definition: string;
}
export interface SkillStat {
  id: string;
  count: number;
  denominator: number;
  share: number;
}
export interface Cell {
  occupationId: string;
  level: string;
  count: number;
}
export interface Edge {
  id: string;
  count: number;
  jaccard: number;
  denominator: number;
}
export interface Analysis {
  count: number;
  employers: number;
  facets: Record<FacetKey, Facet[]>;
  cells: Cell[];
  skills: SkillStat[];
  analyzedSkills: SkillStat[];
  matrix: {
    occupationId: string;
    count: number;
    values: Record<string, number>;
  }[];
  metrics: Metric[];
  pay: { id: string; low: number; high: number; title: string }[];
  payEligible: number;
  payFlags: Record<string, number>;
  knownText: number;
  unknownText: number;
  conflicts: number;
  complete: number;
  availability: Record<string, number>;
  dates: Record<string, number>;
  graph: { focus: string; count: number; edges: Edge[] };
  records: Posting[];
  page: number;
  pages: number;
  ids?: string[];
}
export interface CompareResult {
  a: Analysis;
  b: Analysis;
  overlap: number;
  skills: {
    id: string;
    a: number;
    b: number;
    countA: number;
    countB: number;
    difference: number | null;
  }[];
}
