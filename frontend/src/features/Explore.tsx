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
const Atlas = lazy(() =>
  import("../components/Chart").then((m) => ({ default: m.Atlas })),
);
export function Explore({
  analysis,
  label,
  onCell,
  onReset,
  onMetric,
}: {
  analysis: Analysis;
  label: (s: string) => string;
  onCell: (o: string, l: string) => void;
  onReset: () => void;
  onMetric: () => void;
}) {
  return (
    <div className="explore-layout">
      <section className="panel atlas-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EXPLORE THE INVENTORY</p>
            <h2>Roles, in perspective</h2>
          </div>
          <span className="lens-pill">
            <span />
            Occupation × level
          </span>
        </div>
        <div className="atlas-caption">
          <span>Circle area = number of postings</span>
          <span>
            Click a group to narrow your view <ArrowUpRight size={12} />
          </span>
        </div>
        {analysis.count ? (
          <Suspense
            fallback={
              <div className="empty-state">Loading the categorical canvas…</div>
            }
          >
            <Atlas analysis={analysis} label={label} onCell={onCell} />
          </Suspense>
        ) : (
          <div className="empty-state">
            <Compass size={28} />
            <h3>A fresh perspective starts with a selection</h3>
            <button className="button secondary" onClick={onReset}>
              Reset filters
            </button>
          </div>
        )}
        <details className="accessible-groups">
          <summary>
            Accessible group list · {analysis.cells.length} occupation/level
            groups
          </summary>
          <div>
            {analysis.cells.map((c) => (
              <button
                key={c.occupationId + c.level}
                onClick={() => onCell(c.occupationId, c.level)}
              >
                {label(c.occupationId)} / {label(c.level)}{" "}
                <strong>{number(c.count)}</strong>
              </button>
            ))}
          </div>
        </details>
        <div className="chart-foot">
          <Info size={13} />
          <span>
            Categories describe the source classification. Position within a
            band has no numeric meaning.
          </span>
        </div>
      </section>
      <aside className="insight-column">
        <section className="insight-card">
          <span className="insight-icon">
            <Sparkles size={18} />
          </span>
          <p className="eyebrow">YOUR STARTING POINT</p>
          <h3>
            Follow a question.
            <br />
            Find the evidence.
          </h3>
          <p>
            Choose a role group, refine the selection, then pin two cohorts to
            compare what changes.
          </p>
          <ol>
            <li>
              <span>1</span>Explore roles & requirements
            </li>
            <li>
              <span>2</span>Pin your perspective as A or B
            </li>
            <li>
              <span>3</span>Inspect the contributing records
            </li>
          </ol>
        </section>
        <section className="quality-card">
          <div>
            <ShieldCheck size={17} />
            <h3>Know the boundaries</h3>
          </div>
          <p>
            {number(analysis.unknownText)} postings have unknown description
            coverage. Recorded skills are mentions, not verified requirements.
          </p>
          <div className="mini-meter">
            <span
              style={{
                width: `${analysis.count ? (analysis.knownText / analysis.count) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="meter-label">
            {number(analysis.knownText)} / {number(analysis.count)} locally
            analyzed texts
          </span>
          <button onClick={onMetric}>
            Inspect scope & sources <ArrowRight size={14} />
          </button>
        </section>
        <div className="readiness-note">
          <Info size={15} />
          <p>
            One source snapshot is an inventory view. It cannot establish hiring
            growth or available talent.
          </p>
        </div>
      </aside>
    </div>
  );
}
