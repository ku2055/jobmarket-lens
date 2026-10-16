import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Columns2,
  Compass,
  Database,
  ExternalLink,
  Filter,
  GitCompareArrows,
  Info,
  Layers3,
  Link,
  LoaderCircle,
  Network,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { getManifest, getCatalog } from "../data/loader";
import { AnalysisClient } from "../analysis/client";
import { UNKNOWN } from "../analysis/engine";
import {
  emptyQuery,
  type Analysis,
  type AppState,
  type Catalog,
  type Cohort,
  type CompareResult,
  type FacetKey,
  type Posting,
  type Query,
  type SourceMode,
  type Workspace,
} from "../data/types";
import {
  initialState,
  loadLocation,
  shareUrl,
  sourceLabel,
  validateState,
} from "./state";
const titles: Record<
  Workspace,
  { eyebrow: string; title: string; description: string }
> = {
  explore: {
    eyebrow: "THE ROLE LANDSCAPE",
    title: "Find your perspective.",
    description:
      "Explore the roles, requirements and patterns behind the posting inventory.",
  },
  compare: {
    eyebrow: "TWO PERSPECTIVES, ONE FRAME",
    title: "Make the difference visible.",
    description:
      "Pin two groups. Compare their composition with the evidence in view.",
  },
  skills: {
    eyebrow: "THE LANGUAGE OF OPPORTUNITY",
    title: "Connect the skills.",
    description:
      "See what appears together, with counts and denominators you can inspect.",
  },
  evidence: {
    eyebrow: "ANALYSIS YOU CAN TRACE",
    title: "Look behind the numbers.",
    description:
      "Understand what this inventory can tell you—and where the evidence ends.",
  },
};
const availabilityLabels: Record<string, string> = {
  local_observed: "Locally observed open",
  upstream_reported_open: "Upstream reported open",
  possibly_closed: "Possibly closed",
  closed: "Closed",
  unverified: "Unverified",
};
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
import {
  number,
  pct,
  money,
  queryDescription,
  facetLabels,
} from "../features/shared";
import { Explore } from "../features/Explore";
import { Compare } from "../features/Compare";
import { Skills } from "../features/Skills";
import { Evidence } from "../features/Evidence";
export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [state, setState] = useState<AppState>(initialState),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [comparison, setComparison] = useState<CompareResult | null>(null),
    [record, setRecord] = useState<Posting | null>(null),
    [loading, setLoading] = useState(true),
    [status, setStatus] = useState("Reading the release manifest…"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<"title" | "company" | "pay">("title"),
    [focus, setFocus] = useState(""),
    [draft, setDraft] = useState<string[]>([]),
    [filtersOpen, setFiltersOpen] = useState(false),
    [drawer, setDrawer] = useState<"record" | "metric" | null>(null),
    [metricId, setMetricId] = useState("postings"),
    [search, setSearch] = useState("");
  const client = useRef<AnalysisClient | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    closeRef = useRef<HTMLButtonElement>(null),
    previousFocus = useRef<HTMLElement | null>(null),
    latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    let active = true;
    const engine = new AnalysisClient((s) => {
      if (active) setStatus(s);
    });
    client.current = engine;
    (async () => {
      try {
        const manifest = await getManifest(),
          cat = await getCatalog(manifest);
        await engine.request("init", cat);
        if (!active) return;
        setCatalog(cat);
        try {
          const s = loadLocation(manifest.datasetVersion);
          setState(s);
          setSearch(s.query.search);
        } catch (e) {
          setState(initialState(manifest.datasetVersion));
          setError(String(e instanceof Error ? e.message : e));
        }
      } catch (e) {
        if (active) {
          setError(String(e instanceof Error ? e.message : e));
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      engine.dispose();
      client.current = null;
    };
  }, []);
  const label = useMemo(() => {
    const names = new Map<string, string>([
      [UNKNOWN, "Unknown"],
      ...Object.entries(availabilityLabels),
      ...(catalog?.companies.map((c) => [c.id, c.name] as [string, string]) ||
        []),
      ...(catalog?.taxonomy.skills.map(
        (s) => [s.id, s.name] as [string, string],
      ) || []),
      ...(catalog?.taxonomy.occupations.map(
        (s) => [s.id, s.name] as [string, string],
      ) || []),
    ]);
    return (id: string) => names.get(id) || id;
  }, [catalog]);
  const commit = useCallback((update: (s: AppState) => AppState) => {
    setState((s) => {
      const next = update(s);
      const url = next.datasetVersion ? shareUrl(next) : null;
      if (url) history.pushState(next, "", url);
      else history.pushState(next, "", "/" + next.workspace);
      return next;
    });
    setError("");
  }, []);
  useEffect(() => {
    if (!catalog) return;
    const onPop = (event: PopStateEvent) => {
      try {
        const s = event.state
          ? validateState(event.state)
          : loadLocation(catalog.manifest.datasetVersion);
        setState(s);
        setSearch(s.query.search);
        setDraft([]);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [catalog]);
  useEffect(() => {
    if (!catalog) return;
    const timer = setTimeout(() => {
      if (search !== state.query.search)
        commit((s) => ({ ...s, query: { ...s.query, search } }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, catalog, commit, state.query.search]);
  useEffect(() => {
    if (!catalog || !client.current) return;
    let active = true;
    setLoading(true);
    setStatus("Analyzing the complete selection…");
    client.current
      .request<Analysis>("query", {
        mode: state.sourceMode,
        query: state.query,
        page,
        focus,
        sort,
      })
      .then((result) => {
        if (active) {
          setAnalysis(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalog, state.query, state.sourceMode, page, focus, sort]);
  useEffect(() => {
    setPage(0);
    setDraft([]);
  }, [state.query, state.sourceMode]);
  useEffect(() => {
    if (!state.a || !state.b || !catalog || !client.current) {
      setComparison(null);
      return;
    }
    let active = true;
    setComparison(null);
    client.current
      .request<CompareResult>("compare", { a: state.a, b: state.b })
      .then((x) => {
        if (active) setComparison(x);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [catalog, state.a, state.b]);
  useEffect(() => {
    if (!state.selected || !client.current || !catalog) {
      setRecord(null);
      if (!state.selected && drawer === "record") setDrawer(null);
      return;
    }
    setDrawer("record");
    let active = true;
    client.current
      .request<Posting | null>("record", {
        mode: state.sourceMode,
        recordId: state.selected,
      })
      .then((r) => {
        if (active) {
          setRecord(r);
          if (!r)
            setNotice(
              "This posting is not present in the selected source mode.",
            );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [catalog, state.selected, state.sourceMode]);
  useEffect(() => {
    if (!drawer) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(null);
        if (latest.current.selected) commit((s) => ({ ...s, selected: null }));
      }
      if (e.key === "Tab") {
        const panel = document.querySelector<HTMLElement>(".detail-drawer");
        const all = panel?.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,[tabindex="0"]',
        );
        if (!all?.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      previousFocus.current?.focus();
    };
  }, [drawer]);
  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.activeElement as HTMLElement;
    document
      .querySelector<HTMLButtonElement>('[aria-label="Close filters"]')
      ?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
      if (event.key === "Tab") {
        const elements = [
          ...document.querySelectorAll<HTMLElement>(
            ".filter-rail button,.filter-rail input,.filter-rail summary",
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [filtersOpen]);
  const toggle = (key: FacetKey, value: string) => {
    commit((s) => ({
      ...s,
      query: {
        ...s.query,
        filters: {
          ...s.query.filters,
          [key]: s.query.filters[key].includes(value)
            ? s.query.filters[key].filter((v) => v !== value)
            : [...s.query.filters[key], value],
        },
      },
    }));
  };
  const selectCell = useCallback(
    (occupation: string, level: string) => {
      commit((s) => ({
        ...s,
        query: {
          ...s.query,
          includeUnknown: false,
          filters: {
            ...s.query.filters,
            occupationId: [occupation],
            level: [level],
          },
        },
      }));
    },
    [commit],
  );
  const pin = (slot: "a" | "b") => {
    const cohort: Cohort = {
      name: `Cohort ${slot.toUpperCase()}`,
      datasetVersion: state.datasetVersion,
      sourceMode: state.sourceMode,
      query: structuredClone(state.query),
      ...(draft.length
        ? {
            ids: [...draft],
            query: {
              ...emptyQuery(),
              filters: { ...emptyQuery().filters, availability: [] },
            },
          }
        : {}),
    };
    commit((s) => ({ ...s, [slot]: cohort }));
    setNotice(
      `Cohort ${slot.toUpperCase()} pinned. Its source, version and membership stay fixed.`,
    );
  };
  const exportRecords = async () => {
    if (!client.current) return;
    try {
      const result = await client.current.request<{
        csv: string;
        count: number;
      }>("export", { mode: state.sourceMode, query: state.query });
      download(
        "jobmarket-lens-postings.csv",
        result.csv,
        "text/csv;charset=utf-8",
      );
      setNotice(
        `${number(result.count)} matching records exported. Spreadsheet formula-like text is escaped.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const exportState = () =>
    download(
      "jobmarket-lens-analysis.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
  const share = async () => {
    const url = shareUrl(state);
    if (!url) {
      exportState();
      setNotice(
        "This selection exceeds the share-link budget. Analysis state downloaded instead.",
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Reproducible analysis link copied.");
    } catch {
      setNotice("Copy the address from your browser to share this analysis.");
    }
  };
  const importState = async (file: File) => {
    try {
      if (file.size > 2_000_000) throw new Error("State file exceeds 2 MB.");
      const next = validateState(JSON.parse(await file.text()));
      if (next.datasetVersion !== catalog?.manifest.datasetVersion)
        throw new Error(
          "This file references a different dataset version. Refresh its cohorts explicitly before import.",
        );
      commit(() => next);
      setSearch(next.query.search);
      setNotice("Analysis state restored.");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const closeDetail = () => {
    setDrawer(null);
    if (state.selected) commit((s) => ({ ...s, selected: null }));
  };
  const reset = () => {
    commit((s) => ({ ...s, query: emptyQuery() }));
    setSearch("");
    setDraft([]);
  };
  const activeFilters =
      Object.values(state.query.filters).reduce((n, v) => n + v.length, 0) -
      2 +
      (state.query.search ? 1 : 0),
    title = titles[state.workspace];
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to analysis
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="/explore"
          onClick={(e) => {
            e.preventDefault();
            commit((s) => ({ ...s, workspace: "explore" }));
          }}
        >
          <span className="brand-mark">
            <Layers3 size={19} />
          </span>
          <span>
            JobMarket <strong>Lens</strong>
          </span>
          <span className="version-tag">V2</span>
        </a>
        <nav aria-label="Workspaces">
          {(["explore", "compare", "skills", "evidence"] as Workspace[]).map(
            (route, i) => {
              const Icon = [Compass, GitCompareArrows, Network, ShieldCheck][i];
              return (
                <a
                  key={route}
                  href={"/" + route}
                  aria-current={state.workspace === route ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    commit((s) => ({ ...s, workspace: route }));
                  }}
                >
                  <Icon size={16} />
                  {route[0].toUpperCase() + route.slice(1)}
                  {route === "compare" && state.a && (
                    <span className="nav-dot" />
                  )}
                </a>
              );
            },
          )}
        </nav>
        <div className="header-actions">
          <span className="public-badge">
            <span />
            Public evidence
          </span>
          <button className="button secondary compact" onClick={share}>
            <Link size={15} />
            Share<span className="desktop-only"> analysis</span>
          </button>
        </div>
      </header>
      <div className="scope-bar">
        <div>
          <Database size={13} />
          <select
            aria-label="Data source mode"
            value={state.sourceMode}
            onChange={(e) =>
              commit((s) => ({
                ...s,
                sourceMode: e.target.value as SourceMode,
              }))
            }
          >
            <option value="combined">Combined inventory</option>
            <option value="upstream">Upstream report</option>
            <option value="local">Local observations</option>
          </select>
          <span className="scope-divider" />
          <span className="scope-date">
            As of{" "}
            {catalog?.sources
              .map((s) => s.asOf)
              .filter(Boolean)
              .sort()
              .at(-1)
              ?.slice(0, 10) || "loading"}
          </span>
          <span className="scope-divider desktop-only" />
          <span className="desktop-only">
            Version {state.datasetVersion.slice(0, 8) || "…"}
          </span>
        </div>
        <span className="coverage-note">
          <span className="amber-dot" />
          Observed sample · coverage varies
        </span>
      </div>
      <div className="workspace">
        <aside
          className={`filter-rail ${filtersOpen ? "mobile-open" : ""}`}
          aria-label="Filter postings"
          role={filtersOpen ? "dialog" : undefined}
          aria-modal={filtersOpen ? true : undefined}
        >
          <div className="rail-title">
            <SlidersHorizontal size={16} />
            <strong>Refine your view</strong>
            <button
              className="icon-button mobile-only"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>
          <p className="rail-intro">One selection. Every view.</p>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search title, employer or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, employer, skill…"
            />
            {search && (
              <button
                className="icon-button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="filter-summary">
            <span>{Math.max(0, activeFilters)} active refinements</span>
            <button onClick={reset}>Reset</button>
          </div>
          <label className="unknown-toggle">
            <input
              type="checkbox"
              checked={state.query.includeUnknown}
              onChange={(e) =>
                commit((s) => ({
                  ...s,
                  query: { ...s.query, includeUnknown: e.target.checked },
                }))
              }
            />
            <span>
              Include unknown values
              <small>Unknowns match selected categories</small>
            </span>
          </label>
          {(
            [
              "occupationId",
              "level",
              "arrangement",
              "companyId",
              "country",
              "skillIds",
              "availability",
            ] as FacetKey[]
          ).map((key) => (
            <FacetList
              key={key}
              title={facetLabels[key]}
              items={analysis?.facets[key] || []}
              chosen={state.query.filters[key]}
              label={label}
              onToggle={(v) => toggle(key, v)}
            />
          ))}
          <div className="rail-bottom">
            <ShieldCheck size={17} />
            <p>
              Public metadata only.
              <br />
              <span>Private evidence stays private.</span>
            </p>
          </div>
        </aside>
        <main id="main" className="main" tabIndex={-1} aria-busy={loading}>
          <div className="page-intro">
            <div>
              <p className="eyebrow">{title.eyebrow}</p>
              <h1>{title.title}</h1>
              <p className="subtitle">{title.description}</p>
            </div>
            <button
              className="button secondary mobile-only"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter size={16} />
              Filters
            </button>
            <div className="intro-stamp desktop-only">
              <div className="stamp-line" />
              <span>
                A clearer view of
                <br />
                <strong>the work landscape.</strong>
              </span>
            </div>
          </div>
          {error && (
            <div className="message error" role="alert">
              <Info size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="message notice" role="status">
              <Check size={17} />
              <span>{notice}</span>
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="sr-only" aria-live="polite">
            {loading
              ? status
              : analysis
                ? `${number(analysis.count)} matching postings`
                : "Dataset not loaded"}
          </div>
          {!analysis ? (
            <>
              {catalog && (
                <section
                  className="stats-grid"
                  aria-label="Full release summary while detailed data loads"
                >
                  <Stat
                    title="Source inventory"
                    value={number(
                      catalog.summary.sourceModes[state.sourceMode].count,
                    )}
                    foot="Complete release summary · details loading"
                    onClick={() =>
                      setNotice(
                        "Summary is validated. Full-population interactions enable after every required shard is verified.",
                      )
                    }
                  />
                  <Stat
                    title="Employers represented"
                    value={number(
                      catalog.summary.sourceModes[state.sourceMode].companies,
                    )}
                    foot="Full source inventory"
                    onClick={() => {}}
                  />
                  <Stat
                    title="Locally analyzed texts"
                    value={number(
                      catalog.summary.sourceModes[state.sourceMode]
                        .withAnalyzedText,
                    )}
                    foot="Known usable local text coverage"
                    onClick={() => {}}
                  />
                  <Stat
                    title="Valid posted pay"
                    value={number(
                      catalog.summary.sourceModes[state.sourceMode]
                        .withValidPay,
                    )}
                    foot="Validated USD ranges in full inventory"
                    onClick={() => {}}
                  />
                </section>
              )}
              <div className="loading-state">
                <LoaderCircle size={28} className="spin" />
                <h2>
                  {error
                    ? "Dataset unavailable"
                    : "Bringing the landscape into focus"}
                </h2>
                <p>{status}</p>
                {error && (
                  <button
                    className="button primary"
                    onClick={() => location.reload()}
                  >
                    Retry loading
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <section className="stats-grid" aria-label="Selection summary">
                <Stat
                  title="Matching postings"
                  value={number(analysis.count)}
                  foot={`${number(catalog?.manifest.counts[state.sourceMode] || 0)} in this source mode`}
                  onClick={() => {
                    setMetricId("postings");
                    setDrawer("metric");
                  }}
                />
                <Stat
                  title="Employers represented"
                  value={number(analysis.employers)}
                  foot="Distinct companies in selection"
                  onClick={() => {
                    setMetricId("postings");
                    setDrawer("metric");
                  }}
                />
                <Stat
                  title="Remote or hybrid"
                  value={pct(
                    analysis.metrics.find((m) => m.id === "remote")?.value ??
                      null,
                  )}
                  foot={`${analysis.metrics.find((m) => m.id === "remote")!.numerator}/${analysis.metrics.find((m) => m.id === "remote")!.denominator} with known arrangement`}
                  onClick={() => {
                    setMetricId("remote");
                    setDrawer("metric");
                  }}
                />
                <Stat
                  title="Valid posted pay"
                  value={`${number(analysis.payEligible)}`}
                  foot={`${number(analysis.count - analysis.payEligible)} without eligible USD ranges`}
                  onClick={() => {
                    setMetricId("pay");
                    setDrawer("metric");
                  }}
                />
              </section>
              <div className="selection-bar">
                <span className="selection-count">
                  <span className="selection-symbol">
                    {draft.length ? "✓" : "◈"}
                  </span>
                  <strong>{number(draft.length || analysis.count)}</strong>{" "}
                  {draft.length ? "selected records" : "in your current view"}
                  {loading && <LoaderCircle className="spin" size={14} />}
                </span>
                <div>
                  <button
                    className="cohort-button a"
                    onClick={() => pin("a")}
                    disabled={loading}
                  >
                    <span>A</span>Pin cohort
                  </button>
                  <button
                    className="cohort-button b"
                    onClick={() => pin("b")}
                    disabled={loading}
                  >
                    <span>B</span>Pin cohort
                  </button>
                  {draft.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => setDraft([])}
                    >
                      Clear selection
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label="Export matching postings as CSV"
                    onClick={exportRecords}
                    disabled={loading}
                  >
                    <ArrowDownToLine size={17} />
                  </button>
                </div>
              </div>
              {state.workspace === "explore" && (
                <Explore
                  analysis={analysis}
                  label={label}
                  onCell={selectCell}
                  onReset={reset}
                  onMetric={() => {
                    setMetricId("postings");
                    setDrawer("metric");
                  }}
                />
              )}
              {state.workspace === "compare" && (
                <Compare
                  state={state}
                  result={comparison}
                  label={label}
                  onPin={pin}
                  onClear={(slot) => commit((s) => ({ ...s, [slot]: null }))}
                  onRename={(slot, name) =>
                    commit((s) => ({
                      ...s,
                      [slot]: s[slot] ? { ...s[slot]!, name } : null,
                    }))
                  }
                  onRefresh={(slot) => pin(slot)}
                  client={client.current}
                  onRecord={(id, mode) => {
                    commit((s) => ({ ...s, sourceMode: mode, selected: id }));
                    setDrawer("record");
                  }}
                />
              )}
              {state.workspace === "skills" && (
                <Skills
                  analysis={analysis}
                  label={label}
                  focus={focus || analysis.graph.focus}
                  onFocus={setFocus}
                  onSkill={(id) =>
                    commit((s) => ({
                      ...s,
                      query: {
                        ...s.query,
                        includeUnknown: false,
                        filters: { ...s.query.filters, skillIds: [id] },
                      },
                    }))
                  }
                  onRole={(id) =>
                    commit((s) => ({
                      ...s,
                      query: {
                        ...s.query,
                        includeUnknown: false,
                        filters: { ...s.query.filters, occupationId: [id] },
                      },
                    }))
                  }
                />
              )}
              {state.workspace === "evidence" && catalog && (
                <Evidence
                  analysis={analysis}
                  catalog={catalog}
                  state={state}
                  label={label}
                  onExport={exportState}
                  onImport={() => fileInput.current?.click()}
                />
              )}
              <section
                className="panel record-panel"
                aria-label="Matching posting records"
              >
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">FROM PATTERN TO POSTING</p>
                    <h2>
                      Inspect the records{" "}
                      <span className="count-badge">
                        {number(analysis.count)}
                      </span>
                    </h2>
                  </div>
                  <div className="record-actions">
                    <label className="sort-label">
                      Sort
                      <select
                        value={sort}
                        aria-label="Sort records"
                        onChange={(e) => setSort(e.target.value as typeof sort)}
                      >
                        <option value="title">Title</option>
                        <option value="company">Employer</option>
                        <option value="pay">Posted pay</option>
                      </select>
                    </label>
                    <button
                      className="button secondary compact"
                      onClick={exportRecords}
                      disabled={loading}
                    >
                      <ArrowDownToLine size={14} />
                      CSV
                    </button>
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="record-table">
                    <thead>
                      <tr>
                        <th>
                          <span className="sr-only">Select</span>
                        </th>
                        <th>Role / employer</th>
                        <th>Work arrangement</th>
                        <th>Evidence basis</th>
                        <th>
                          <span className="sr-only">Details</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.records.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${r.title}`}
                              checked={draft.includes(r.id)}
                              onChange={(e) =>
                                setDraft((xs) =>
                                  e.target.checked
                                    ? [...xs, r.id]
                                    : xs.filter((id) => id !== r.id),
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="record-title"
                              onClick={() => {
                                commit((s) => ({ ...s, selected: r.id }));
                                setDrawer("record");
                              }}
                            >
                              {r.title}
                            </button>
                            <span className="record-employer">
                              {label(r.companyId)}
                              <span>·</span>
                              {label(r.occupationId || UNKNOWN)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`arrangement ${r.arrangement === "Remote" ? "remote" : ""}`}
                            >
                              {r.arrangement || "Unknown"}
                            </span>
                            <small>
                              {r.locations
                                .map((l) => l.city || l.region || l.country)
                                .filter(Boolean)
                                .join(" · ") || "Location unknown"}
                            </small>
                          </td>
                          <td>
                            <span className="basis-label">
                              <span
                                className={
                                  r.availability === "local_observed"
                                    ? "teal-dot"
                                    : "muted-dot"
                                }
                              />
                              {label(r.availability)}
                            </span>
                            <small>
                              {r.availabilityAsOf?.slice(0, 10) ||
                                "Date unknown"}
                            </small>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Inspect ${r.title}`}
                              onClick={() => {
                                commit((s) => ({ ...s, selected: r.id }));
                                setDrawer("record");
                              }}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!analysis.count && (
                  <div className="empty-state">
                    <Search size={24} />
                    <h3>No postings match this selection</h3>
                    <p>Try removing a filter or include unknown values.</p>
                    <button className="button secondary" onClick={reset}>
                      Reset selection
                    </button>
                  </div>
                )}
                <div className="pagination">
                  <span>
                    {analysis.count
                      ? `${number(analysis.page * 25 + 1)}–${number(Math.min((analysis.page + 1) * 25, analysis.count))}`
                      : "0"}{" "}
                    of {number(analysis.count)} · 25 per page
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      disabled={analysis.page === 0 || loading}
                      onClick={() => setPage(analysis.page - 1)}
                      aria-label="Previous page"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span>
                      {analysis.page + 1} / {analysis.pages}
                    </span>
                    <button
                      className="icon-button"
                      disabled={analysis.page + 1 >= analysis.pages || loading}
                      onClick={() => setPage(analysis.page + 1)}
                      aria-label="Next page"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
              <footer className="workspace-footer">
                <span>
                  JobMarket Lens <strong>V2</strong> · A public-data exploration
                  workspace
                </span>
                <button
                  onClick={() =>
                    commit((s) => ({ ...s, workspace: "evidence" }))
                  }
                >
                  Methods & limitations <ArrowUpRight size={13} />
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Import analysis state"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importState(f);
          e.target.value = "";
        }}
      />
      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={closeDetail} />
          <aside
            className="detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="drawer-head">
              <span className="eyebrow">
                {drawer === "record" ? "PUBLIC RECORD" : "METRIC EVIDENCE"}
              </span>
              <button
                className="icon-button"
                ref={closeRef}
                onClick={closeDetail}
                aria-label="Close detail panel"
              >
                <X size={20} />
              </button>
            </div>
            {drawer === "record" ? (
              record ? (
                <RecordDetail record={record} label={label} />
              ) : (
                <p>Loading record…</p>
              )
            ) : (
              <MetricDetail
                id={metricId}
                analysis={analysis!}
                state={state}
                catalog={catalog!}
                label={label}
                client={client.current}
                onRecord={(id) => {
                  commit((s) => ({ ...s, selected: id }));
                  setDrawer("record");
                }}
              />
            )}
          </aside>
        </>
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  foot,
  onClick,
}: {
  title: string;
  value: string;
  foot: string;
  onClick: () => void;
}) {
  return (
    <button className="stat-card" onClick={onClick}>
      <span className="stat-title">
        {title}
        <Info size={13} />
      </span>
      <strong>{value}</strong>
      <span className="stat-foot">{foot}</span>
    </button>
  );
}
function FacetList({
  title,
  items,
  chosen,
  label,
  onToggle,
}: {
  title: string;
  items: { value: string; count: number }[];
  chosen: string[];
  label: (id: string) => string;
  onToggle: (id: string) => void;
}) {
  const [all, setAll] = useState(false),
    [find, setFind] = useState("");
  const selected = chosen
    .filter((c) => !items.some((i) => i.value === c))
    .map((value) => ({ value, count: 0 }));
  const entries = [...selected, ...items].filter(
    (x) => !find || label(x.value).toLowerCase().includes(find.toLowerCase()),
  );
  const shown = all
    ? entries
    : entries.filter((x, i) => i < 7 || chosen.includes(x.value));
  return (
    <details
      className="facet-group"
      open={title === "Occupation" || title === "Work arrangement"}
    >
      <summary>
        {title}
        <span>
          {chosen.length || ""}
          <ChevronDown size={13} />
        </span>
      </summary>
      {items.length > 12 && (
        <input
          className="facet-search"
          aria-label={`Find ${title.toLowerCase()}`}
          placeholder={`Find ${title.toLowerCase()}…`}
          value={find}
          onChange={(e) => setFind(e.target.value)}
        />
      )}
      <div className="facet-options">
        {shown.map((item) => (
          <label key={item.value}>
            <input
              type="checkbox"
              checked={chosen.includes(item.value)}
              onChange={() => onToggle(item.value)}
            />
            <span>{label(item.value)}</span>
            <small>{number(item.count)}</small>
          </label>
        ))}
      </div>
      {!shown.length && <p className="muted">No categories in this scope</p>}
      {entries.length > 7 && (
        <button className="show-more" onClick={() => setAll(!all)}>
          {all ? "Show less" : `Show all ${entries.length}`}
        </button>
      )}
    </details>
  );
}
function RecordDetail({
  record: r,
  label,
}: {
  record: Posting;
  label: (s: string) => string;
}) {
  const fields = [
    ["Occupation", label(r.occupationId || UNKNOWN), "occupationId"],
    ["Career level", r.level || "Unknown", "level"],
    ["Work arrangement", r.arrangement || "Unknown", "arrangement"],
    ["Employment type", r.employmentType || "Unknown", "employmentType"],
    ["Degree", r.degree || "Unknown", "degree"],
    [
      "Experience",
      r.experienceYears === null ? "Unknown" : `${r.experienceYears} years`,
      "experienceYears",
    ],
    [
      "Equivalent experience",
      r.equivalentExperience === true
        ? "Detected"
        : r.equivalentExperience === false
          ? "Not detected"
          : "Unknown",
      "equivalentExperience",
    ],
  ];
  return (
    <>
      <h2 id="drawer-title">{r.title}</h2>
      <p className="drawer-company">{label(r.companyId)}</p>
      <span className="basis-label">
        <span className="muted-dot" />
        {label(r.availability)}
      </span>
      <p className="drawer-asof">
        As of {r.availabilityAsOf?.slice(0, 10) || "unknown date"} ·{" "}
        {r.availabilitySourceId}
      </p>
      {r.sourceUrl && (
        <a
          className="button primary source-link"
          href={r.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open source posting <ExternalLink size={15} />
        </a>
      )}
      <h3>Public record details</h3>
      <dl className="record-facts">
        {fields.map(([k, v, field]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              {v}
              <small>
                {r.fieldProvenance?.[field] ||
                  r.provenance[
                    [
                      "occupationId",
                      "level",
                      "employmentType",
                      "degree",
                      "equivalentExperience",
                      "experienceYears",
                    ].includes(field)
                      ? "qualifications"
                      : "location"
                  ]}
              </small>
            </dd>
          </div>
        ))}
      </dl>
      <h3>Recorded skill mentions</h3>
      <div className="skill-tags">
        {r.skillIds.length ? (
          r.skillIds.map((id) => <span key={id}>{label(id)}</span>)
        ) : (
          <p className="muted">
            No recorded skill list. Requirement coverage remains unknown.
          </p>
        )}
      </div>
      <h3>Posted pay</h3>
      {r.pay ? (
        <>
          <p>
            {r.pay.currency || "Unknown currency"} {r.pay.low ?? "Unknown"}–
            {r.pay.high ?? "Unknown"} / {r.pay.period || "unknown period"}
          </p>
          <p>
            {r.pay.valid
              ? `Validated annual USD range: ${money(r.pay.annualLow)}–${money(r.pay.annualHigh)}`
              : "Not eligible for the validated USD summary."}
          </p>
          <p className="muted">
            {r.pay.flags.join(" · ") || "No validation flags"}
          </p>
        </>
      ) : (
        <p className="muted">No usable pay range recorded.</p>
      )}
      <h3>Evidence basis</h3>
      <dl className="record-facts">
        <div>
          <dt>Posting date</dt>
          <dd>
            {r.sourcePostedDate || "Unknown"}
            <small>{r.dateBasis}</small>
          </dd>
        </div>
        <div>
          <dt>Local observation</dt>
          <dd>
            {r.firstObservedAt?.slice(0, 10) || "Not locally observed"} →{" "}
            {r.lastObservedAt?.slice(0, 10) || "unknown"}
          </dd>
        </div>
        <div>
          <dt>Inventory quality</dt>
          <dd>{r.quality.completeness}</dd>
        </div>
        <div>
          <dt>Conflicts retained</dt>
          <dd>{r.quality.conflictGroups.join(", ") || "None recorded"}</dd>
        </div>
        <div>
          <dt>Analyzed text</dt>
          <dd>
            {r.hasDescription === true
              ? "Usable local text"
              : r.hasDescription === false
                ? "Not available"
                : "Unknown coverage"}
          </dd>
        </div>
      </dl>
      <p className="drawer-note">
        Source posting may have changed or closed since observation. Private
        descriptions and extraction evidence are not part of this public record.
      </p>
      <p className="record-id">{r.id}</p>
    </>
  );
}
function MetricDetail({
  id,
  analysis,
  state,
  catalog,
  label,
  client,
  onRecord,
}: {
  id: string;
  analysis: Analysis;
  state: AppState;
  catalog: Catalog;
  label: (s: string) => string;
  client: AnalysisClient | null;
  onRecord: (id: string) => void;
}) {
  const [page, setPage] = useState(0),
    [contributors, setContributors] = useState<{
      records: Posting[];
      count: number;
      page: number;
    } | null>(null);
  useEffect(() => {
    let active = true;
    client
      ?.request<{ records: Posting[]; count: number; page: number }>(
        "contributors",
        { mode: state.sourceMode, query: state.query, metric: id, page },
      )
      .then((result) => {
        if (active) setContributors(result);
      })
      .catch(() => {
        if (active) setContributors(null);
      });
    return () => {
      active = false;
    };
  }, [client, state.query, state.sourceMode, id, page]);
  const metric =
    analysis.metrics.find((m) => m.id === id) || analysis.metrics[0];
  return (
    <>
      <h2 id="drawer-title">
        {id === "pay"
          ? "Posted-pay eligibility"
          : id === "remote"
            ? "Remote & hybrid share"
            : "The current selection"}
      </h2>
      <p className="drawer-company">A reproducible result, with its basis.</p>
      <p>{metric.definition}</p>
      <dl className="record-facts">
        <div>
          <dt>Numerator</dt>
          <dd>{number(metric.numerator)}</dd>
        </div>
        <div>
          <dt>Eligible denominator</dt>
          <dd>{number(metric.denominator)}</dd>
        </div>
        <div>
          <dt>Missing</dt>
          <dd>{number(metric.missing)}</dd>
        </div>
        <div>
          <dt>Excluded</dt>
          <dd>{number(metric.excluded)}</dd>
        </div>
        <div>
          <dt>Source mode</dt>
          <dd>{sourceLabel(state.sourceMode)}</dd>
        </div>
        <div>
          <dt>Dataset / method</dt>
          <dd className="mono">
            {state.datasetVersion.slice(0, 16)}
            <small>{JSON.stringify(catalog.manifest.methods)}</small>
          </dd>
        </div>
        <div>
          <dt>Query</dt>
          <dd>{queryDescription(state.query, label)}</dd>
        </div>
      </dl>
      {id === "pay" && (
        <>
          <h3>Why records are excluded</h3>
          {Object.entries(analysis.payFlags).map(([flag, n]) => (
            <p className="flag-row" key={flag}>
              <span>{flag}</span>
              <strong>{number(n)}</strong>
            </p>
          ))}
          <p className="muted">
            A record may have several flags; flag totals need not equal excluded
            records.
          </p>
        </>
      )}
      <h3>Availability basis</h3>
      {Object.entries(analysis.availability).map(([key, n]) => (
        <p className="flag-row" key={key}>
          <span>{label(key)}</span>
          <strong>{number(n)}</strong>
        </p>
      ))}
      <h3>Contributing public records</h3>
      {contributors && (
        <>
          <div className="contributor-list">
            {contributors.records.map((r) => (
              <button key={r.id} onClick={() => onRecord(r.id)}>
                {r.title}
                <small>{label(r.companyId)}</small>
              </button>
            ))}
          </div>
          <div className="pagination">
            <span>{number(contributors.count)} contributors</span>
            <div>
              <button
                className="icon-button"
                disabled={!page}
                aria-label="Previous contributors"
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                className="icon-button"
                disabled={(page + 1) * 25 >= contributors.count}
                aria-label="Next contributors"
                onClick={() => setPage(page + 1)}
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
      <p className="drawer-note">
        The record tray and CSV below use this same committed query. Counts are
        distinct posting IDs. Collection completeness does not establish
        representativeness.
      </p>
    </>
  );
}
