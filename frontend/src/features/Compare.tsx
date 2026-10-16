import { useEffect, useState } from "react";
import type { AnalysisClient } from "../analysis/client";
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
import { UNKNOWN } from "../analysis/engine";
import { sourceLabel } from "../app/state";
import { number, pct, money, queryDescription } from "./shared";
export function Compare({
  state,
  result,
  label,
  onPin,
  onClear,
  onRename,
  onRefresh,
  client,
  onRecord,
}: {
  state: AppState;
  result: CompareResult | null;
  label: (s: string) => string;
  onPin: (s: "a" | "b") => void;
  onClear: (s: "a" | "b") => void;
  onRename: (s: "a" | "b", n: string) => void;
  onRefresh: (s: "a" | "b") => void;
  client: AnalysisClient | null;
  onRecord: (id: string, mode: SourceMode) => void;
}) {
  const [inspect, setInspect] = useState<{
      slot: "a" | "b";
      skill: string;
    } | null>(null),
    [page, setPage] = useState(0),
    [contributors, setContributors] = useState<{
      records: Posting[];
      count: number;
    } | null>(null);
  useEffect(() => {
    if (!inspect || !state[inspect.slot] || !client) {
      setContributors(null);
      return;
    }
    let active = true;
    setContributors(null);
    client
      .request<{
        records: Posting[];
        count: number;
      }>("cohortContributors", {
        cohort: state[inspect.slot],
        skill: inspect.skill,
        page,
      })
      .then((result) => {
        if (active) setContributors(result);
      })
      .catch(() => {
        if (active) setContributors({ records: [], count: 0 });
      });
    return () => {
      active = false;
    };
  }, [inspect, state.a, state.b, client, page]);
  return (
    <>
      <div className="cohort-grid">
        {(["a", "b"] as const).map((slot) => {
          const c = state[slot],
            r = result?.[slot];
          return (
            <section key={slot} className={`panel cohort-card cohort-${slot}`}>
              <div className="cohort-heading">
                <span className={`cohort-letter ${slot}`}>
                  {slot.toUpperCase()}
                </span>
                {c ? (
                  <input
                    aria-label={`Cohort ${slot.toUpperCase()} name`}
                    value={c.name}
                    maxLength={100}
                    onChange={(e) => onRename(slot, e.target.value)}
                  />
                ) : (
                  <h2>Cohort {slot.toUpperCase()}</h2>
                )}
                {c && (
                  <button
                    className="icon-button"
                    aria-label={`Remove cohort ${slot.toUpperCase()}`}
                    onClick={() => onClear(slot)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {c ? (
                <>
                  <p className="cohort-definition">
                    {c.ids
                      ? `${number(c.ids.length)} explicitly selected IDs`
                      : queryDescription(c.query, label)}
                  </p>
                  <div className="cohort-count">
                    {r ? number(r.count) : "…"}
                    <span>postings</span>
                  </div>
                  <p className="cohort-meta">
                    {sourceLabel(c.sourceMode)} · {c.datasetVersion.slice(0, 8)}
                    <br />
                    Frozen membership · query changes do not update this cohort
                  </p>
                  <button
                    className="text-button"
                    onClick={() => onRefresh(slot)}
                  >
                    Refresh from current selection <ArrowRight size={13} />
                  </button>
                </>
              ) : (
                <div className="empty-cohort">
                  <Columns2 size={27} />
                  <p>
                    Choose a perspective in any workspace.
                    <br />
                    Pin the current query or selected records.
                  </p>
                  <button
                    className={`cohort-button ${slot}`}
                    onClick={() => onPin(slot)}
                  >
                    <span>{slot.toUpperCase()}</span>Pin current selection
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {!state.a || !state.b ? (
        <div className="panel empty-state compare-empty">
          <GitCompareArrows size={32} />
          <h2>Good comparisons start with two clear groups.</h2>
          <p>
            Pin A, change the filters, and pin B. Overlapping records remain
            visible in both groups.
          </p>
        </div>
      ) : !result ? (
        <div className="panel loading-state">
          <LoaderCircle className="spin" />
          <p>Comparing frozen source-specific groups…</p>
        </div>
      ) : (
        <>
          <div className="overlap-note">
            <Layers3 size={16} />
            <strong>{number(result.overlap)} shared posting IDs</strong>
            <span>
              Groups may overlap. Counts and denominators remain separate.
            </span>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">COMPOSITION, SIDE BY SIDE</p>
                <h2>Recorded skill differences</h2>
              </div>
              <span className="muted">Percentage points: A − B</span>
            </div>
            <p className="panel-explanation">
              Mentions / all records in each cohort, including empty skill
              lists. Upstream full-text coverage is unknown. Click an A or B
              value to inspect contributors from that frozen cohort.
            </p>
            <div className="comparison-table">
              <div className="compare-row compare-label">
                <span>Recorded skill</span>
                <span>A · {number(result.a.count)} postings</span>
                <span>B · {number(result.b.count)} postings</span>
                <span>Difference</span>
              </div>
              {result.skills.map((s) => (
                <div className="compare-row" key={s.id}>
                  <strong>{label(s.id)}</strong>
                  <button
                    className="compare-contributors"
                    aria-label={`Inspect ${label(s.id)} contributors in cohort A`}
                    onClick={() => {
                      setInspect({ slot: "a", skill: s.id });
                      setPage(0);
                    }}
                  >
                    <span className="bar-track">
                      <span
                        className="bar a"
                        style={{ width: `${s.a * 100}%` }}
                      />
                    </span>
                    <span>
                      {s.countA}/{number(result.a.count)} ·{" "}
                      {pct(result.a.count ? s.a : null)}
                    </span>
                  </button>
                  <button
                    className="compare-contributors"
                    aria-label={`Inspect ${label(s.id)} contributors in cohort B`}
                    onClick={() => {
                      setInspect({ slot: "b", skill: s.id });
                      setPage(0);
                    }}
                  >
                    <span className="bar-track">
                      <span
                        className="bar b"
                        style={{ width: `${s.b * 100}%` }}
                      />
                    </span>
                    <span>
                      {s.countB}/{number(result.b.count)} ·{" "}
                      {pct(result.b.count ? s.b : null)}
                    </span>
                  </button>
                  <span className="difference">
                    {s.difference === null
                      ? "—"
                      : `${s.difference > 0 ? "+" : ""}${s.difference.toFixed(1)} pp`}
                  </span>
                </div>
              ))}
            </div>
            {!result.skills.length && (
              <p className="empty-state">
                No recorded skills in these cohorts.
              </p>
            )}
          </section>
          {inspect && state[inspect.slot] && (
            <section
              className="panel cohort-contributors"
              aria-label="Frozen cohort skill contributors"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    COHORT {inspect.slot.toUpperCase()} ·{" "}
                    {sourceLabel(state[inspect.slot]!.sourceMode)}
                  </p>
                  <h2>{label(inspect.skill)} contributors</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close cohort contributors"
                  onClick={() => setInspect(null)}
                >
                  <X size={17} />
                </button>
              </div>
              <p className="panel-explanation">
                {contributors ? number(contributors.count) : "Loading"} records
                in the frozen cohort contain this skill. Empty and unknown skill
                lists do not count as contributors.
              </p>
              <div className="contributor-list">
                {contributors?.records.map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      onRecord(r.id, state[inspect.slot]!.sourceMode)
                    }
                  >
                    {r.title}
                    <small>{label(r.companyId)}</small>
                  </button>
                ))}
              </div>
              <div className="pagination">
                <span>Page {page + 1}</span>
                <div>
                  <button
                    className="icon-button"
                    disabled={!page}
                    aria-label="Previous cohort contributors"
                    onClick={() => setPage(page - 1)}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={
                      !contributors || (page + 1) * 25 >= contributors.count
                    }
                    aria-label="Next cohort contributors"
                    onClick={() => setPage(page + 1)}
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </section>
          )}
          <div className="comparison-detail-grid">
            {(["a", "b"] as const).map((slot) => (
              <PayCard
                key={slot}
                name={state[slot]!.name}
                analysis={result[slot]}
              />
            ))}
          </div>
          <div className="readiness-note wide">
            <Info size={17} />
            <p>
              Employer counts describe the observed sample. Inventory totals are
              comparable only for complete inventories from comparable
              collection periods. No salary premium, career movement or hiring
              probability is inferred.
            </p>
          </div>
        </>
      )}
    </>
  );
}
function PayCard({ name, analysis }: { name: string; analysis: Analysis }) {
  const n = analysis.payEligible;
  return (
    <section className="panel pay-card">
      <p className="eyebrow">POSTED PAY · {name}</p>
      <h3>
        {n < 10
          ? "Individual ranges"
          : n < 30
            ? "Ranges & descriptive median"
            : "Posted-range summary"}
      </h3>
      <p>
        {number(n)} eligible USD records / {number(analysis.count)} postings.{" "}
        {n < 10
          ? "Fewer than 10: no pooled median or density."
          : `Median annual midpoint ${money(analysis.metrics.find((m) => m.id === "pay")?.value ?? null)}.`}
      </p>
      {n > 0 ? (
        <div className="pay-ranges">
          {analysis.pay.slice(0, 8).map((p) => (
            <div key={p.id}>
              <span title={p.title}>{p.title}</span>
              <strong>
                {money(p.low)}–{money(p.high)}
              </strong>
            </div>
          ))}
          {n > 8 && (
            <small>
              First 8 of {number(n)} eligible intervals shown. Use
              records/export for the full query.
            </small>
          )}
        </div>
      ) : (
        <div className="readiness-inline">
          Pay comparison unavailable: no ranges pass validation.
        </div>
      )}
      <p className="muted">
        Posted offers, not earnings. Native units are preserved in record
        details; annualization uses 2,080 hours or 12 months where applicable.
      </p>
    </section>
  );
}
