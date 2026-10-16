import { lazy, Suspense } from "react";
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
export function Evidence({
  analysis,
  catalog,
  state,
  label,
  onExport,
  onImport,
}: {
  analysis: Analysis;
  catalog: Catalog;
  state: AppState;
  label: (s: string) => string;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <>
      <div className="evidence-grid">
        <section className="panel evidence-primary">
          <p className="eyebrow">SCOPE & PROVENANCE</p>
          <h2>Every result has a basis.</h2>
          <p className="panel-explanation">
            This is an observed inventory of postings, not a representative
            census of jobs or people.
          </p>
          <dl className="facts">
            <div>
              <dt>Source mode</dt>
              <dd>{sourceLabel(state.sourceMode)}</dd>
            </div>
            <div>
              <dt>Current selection</dt>
              <dd>
                {number(analysis.count)} unique postings ·{" "}
                {number(analysis.employers)} employers
              </dd>
            </div>
            <div>
              <dt>Source counts</dt>
              <dd>
                {number(catalog.manifest.counts.upstream)} upstream ·{" "}
                {number(catalog.manifest.counts.local)} local ·{" "}
                {number(catalog.manifest.counts.overlap)} overlapping IDs
              </dd>
            </div>
            <div>
              <dt>Combined universe</dt>
              <dd>
                {number(catalog.manifest.counts.combined)} distinct canonical
                IDs
              </dd>
            </div>
            <div>
              <dt>Completeness</dt>
              <dd>
                {number(analysis.complete)} selected postings in operationally
                complete local inventories; upstream completeness unknown
              </dd>
            </div>
            <div>
              <dt>Conflicting fields</dt>
              <dd>
                {number(analysis.conflicts)} selected records retain source
                conflict indicators
              </dd>
            </div>
            <div>
              <dt>Dataset version</dt>
              <dd className="mono">{catalog.manifest.datasetVersion}</dd>
            </div>
            <div>
              <dt>Methods</dt>
              <dd>
                Import {catalog.manifest.methods.import} · merge{" "}
                {catalog.manifest.methods.merge} · pay{" "}
                {catalog.manifest.methods.pay}
              </dd>
            </div>
            <div>
              <dt>Active query</dt>
              <dd>
                {queryDescription(state.query, label)}. Unknowns{" "}
                {state.query.includeUnknown ? "included" : "excluded"} when
                categories are selected.
              </dd>
            </div>
          </dl>
          <div className="evidence-actions">
            <button className="button secondary" onClick={onExport}>
              <ArrowDownToLine size={15} />
              Export analysis state
            </button>
            <button className="button secondary" onClick={onImport}>
              <Upload size={15} />
              Restore analysis state
            </button>
          </div>
        </section>
        <div className="evidence-side">
          <section className="quality-card">
            <div>
              <ShieldCheck size={19} />
              <h3>What stays private</h3>
            </div>
            <p>
              Descriptions, extraction snippets, raw responses, SQLite history
              and credentials are excluded from the public release. A hidden
              control is never used as access protection.
            </p>
            <span className="privacy-check">
              <Check size={15} />
              Sanitized public artifacts only
            </span>
          </section>
          <section className="panel readiness-panel">
            <p className="eyebrow">TIME ANALYSIS</p>
            <h3>Inventory, not hiring growth.</h3>
            <p>
              Trend analysis needs four complete weekly observation windows for
              the same employer panel and stable methodology. This release does
              not provide that panel.
            </p>
            <div className="readiness-inline">
              Unavailable: comparable weekly observation history.
            </div>
            <h3>Geography with honest precision.</h3>
            <p>
              Country-only locations remain country-only. No geographic map is
              enabled without validated coordinates and coverage.
            </p>
          </section>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">METRICS & MISSINGNESS</p>
            <h2>The denominator matters.</h2>
          </div>
        </div>
        <div className="metric-grid">
          {analysis.metrics.map((m) => (
            <article key={m.id}>
              <h3>
                {m.id === "remote"
                  ? "Remote / hybrid"
                  : m.id === "pay"
                    ? "Posted pay"
                    : m.id === "text"
                      ? "Analyzed text"
                      : m.id === "degree"
                        ? "Recognized degree"
                        : m.id === "remote_all"
                          ? "Remote / all selected"
                          : "Posting count"}
              </h3>
              <p>{m.definition}</p>
              <strong>
                {number(m.numerator)} / {number(m.denominator)}
              </strong>
              <span>
                {number(m.missing)} missing · {number(m.excluded)} excluded
              </span>
            </article>
          ))}
        </div>
        <div className="source-strata">
          <h3>Source-mode coverage</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Postings</th>
                  <th>Known local text</th>
                  <th>Unknown text</th>
                  <th>Valid pay</th>
                </tr>
              </thead>
              <tbody>
                {(["combined", "upstream", "local"] as const).map((mode) => {
                  const s = catalog.summary.sourceModes[mode];
                  return (
                    <tr key={mode}>
                      <th>{sourceLabel(mode)}</th>
                      <td>{number(s.count)}</td>
                      <td>{number(s.withAnalyzedText)}</td>
                      <td>{number(s.unknownText)}</td>
                      <td>{number(s.withValidPay)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Coverage table describes each full source inventory, not the active
            filtered selection.
          </p>
        </div>
      </section>
      <section className="panel source-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SOURCE REGISTER</p>
            <h2>Dates, methods, limitations.</h2>
          </div>
        </div>
        {catalog.sources.map((s) => (
          <div className="source-row" key={s.id}>
            <span className="source-icon">
              <Database size={17} />
            </span>
            <div>
              <strong>
                {s.kind === "upstream"
                  ? "Pinned public upstream snapshot"
                  : "Local observed evidence"}
              </strong>
              <p>
                {s.id} · {s.asOf?.slice(0, 10) || "Date unknown"} · completeness{" "}
                {s.completeness}
              </p>
              {s.commit && (
                <a
                  href={`https://github.com/yimizhao2015/jobmarket-lens/commit/${s.commit}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pinned commit {s.commit.slice(0, 8)}{" "}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))}
        <ul className="limitations">
          {catalog.summary.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          <li>
            An employed profile is not an available job seeker. Employee/profile
            APIs and two-sided workforce analysis are outside V2.
          </li>
        </ul>
      </section>
    </>
  );
}
