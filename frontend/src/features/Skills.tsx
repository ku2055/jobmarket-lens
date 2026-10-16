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
export function Skills({
  analysis,
  label,
  focus,
  onFocus,
  onSkill,
  onRole,
}: {
  analysis: Analysis;
  label: (s: string) => string;
  focus: string;
  onFocus: (s: string) => void;
  onSkill: (s: string) => void;
  onRole: (s: string) => void;
}) {
  const shown = analysis.skills.slice(0, 8);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SKILL × OCCUPATION</p>
            <h2>Read the pattern, then the detail</h2>
          </div>
          <span className="lens-pill">Recorded mentions</span>
        </div>
        <p className="panel-explanation">
          Every cell is k/n postings. The denominator includes empty skill
          lists. Click a column or occupation to filter the matching record
          tray.
        </p>
        <div className="table-scroll">
          <table className="skill-matrix">
            <thead>
              <tr>
                <th>Occupation / postings</th>
                {shown.map((s) => (
                  <th key={s.id}>
                    <button onClick={() => onSkill(s.id)}>
                      {label(s.id)}
                      <small>{number(s.count)} mentions</small>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.matrix.map((row) => (
                <tr key={row.occupationId}>
                  <th>
                    <button onClick={() => onRole(row.occupationId)}>
                      {label(row.occupationId)}
                      <small>{number(row.count)} postings</small>
                    </button>
                  </th>
                  {shown.map((s) => (
                    <td key={s.id}>
                      <button
                        style={{
                          background: `rgba(104,97,216,${0.03 + (0.6 * row.values[s.id]) / row.count})`,
                          color: "#292541",
                        }}
                        onClick={() => {
                          onRole(row.occupationId);
                          onSkill(s.id);
                        }}
                        aria-label={`${label(row.occupationId)}, ${label(s.id)}: ${row.values[s.id]} of ${row.count}`}
                      >
                        <strong>{number(row.values[s.id])}</strong>
                        <small>/{number(row.count)}</small>
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <div className="empty-state">
            <Network size={26} />
            <h3>No recorded skill mentions</h3>
            <p>This does not establish that the roles require no skills.</p>
          </div>
        )}
        <div className="chart-foot">
          <Info size={13} />
          <span>
            Top 8 skills × top 9 occupations in this selection.
            Source-stratified denominators appear in Evidence.
          </span>
        </div>
      </section>
      <div className="skill-lower-grid">
        <section className="panel graph-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">A FOCUSED NEIGHBORHOOD</p>
              <h2>What appears together?</h2>
            </div>
            <Network size={18} />
          </div>
          <label className="focus-select">
            Focus skill
            <select value={focus} onChange={(e) => onFocus(e.target.value)}>
              {analysis.skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s.id)} ({s.count})
                </option>
              ))}
            </select>
          </label>
          {analysis.graph.edges.length ? (
            <>
              <svg
                className="skill-graph"
                viewBox="0 0 600 240"
                role="img"
                aria-label={`Co-mention neighborhood around ${label(focus)}. Exact supports listed below.`}
              >
                {analysis.graph.edges.map((e, i) => {
                  const angle =
                      -Math.PI / 2 +
                      (i * 2 * Math.PI) / analysis.graph.edges.length,
                    x = 300 + 195 * Math.cos(angle),
                    y = 120 + 82 * Math.sin(angle);
                  return (
                    <g key={e.id}>
                      <line
                        x1="300"
                        y1="120"
                        x2={x}
                        y2={y}
                        stroke="#d4d1ed"
                        strokeWidth={2 + e.jaccard * 10}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="18"
                        fill="#e9e7f8"
                        stroke="#b7b1e5"
                      />
                      <text
                        x={x}
                        y={y + 33}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#55536a"
                      >
                        {label(e.id).slice(0, 24)}
                      </text>
                    </g>
                  );
                })}
                <circle cx="300" cy="120" r="35" fill="#655dd3" />
                <text
                  x="300"
                  y="124"
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                >
                  {label(focus).slice(0, 14)}
                </text>
              </svg>
              <div className="graph-edges">
                {analysis.graph.edges.map((e) => (
                  <button key={e.id} onClick={() => onSkill(e.id)}>
                    <strong>{label(e.id)}</strong>
                    <span>
                      {e.count} / {number(e.denominator)} co-mentions · Jaccard{" "}
                      {e.jaccard.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Network size={28} />
              <h3>Not enough shared mentions yet</h3>
              <p>
                Edges require at least 3 postings containing both skills. The
                matrix remains available.
              </p>
            </div>
          )}
          <div className="chart-foot">
            <Info size={13} />
            <span>
              Top 5 supported neighbors. Co-mentions describe association, not
              causation or career moves.
            </span>
          </div>
        </section>
        <section className="panel skill-coverage">
          <p className="eyebrow">READ THE DENOMINATOR</p>
          <h2>
            A mention is a clue.
            <br />
            Context is the evidence.
          </h2>
          <p>
            {number(analysis.knownText)} selected records have usable local
            analyzed text; {number(analysis.unknownText)} have unknown upstream
            text coverage.
          </p>
          <p>
            Recorded share uses all selected records. Analyzed-text share uses
            only local records with usable description text. These measures
            answer different questions.
          </p>
          <div className="coverage-list">
            {analysis.skills.slice(0, 6).map((s) => (
              <div key={s.id}>
                <span>{label(s.id)}</span>
                <strong>
                  {s.count}/{number(s.denominator)}{" "}
                  <small>{pct(s.share)}</small>
                </strong>
              </div>
            ))}
          </div>
          <h3 className="analyzed-title">Local analyzed-text shares</h3>
          <div className="coverage-list">
            {analysis.analyzedSkills?.slice(0, 6).map((s) => (
              <div key={s.id}>
                <span>{label(s.id)}</span>
                <strong>
                  {s.count}/{number(s.denominator)}{" "}
                  <small>{pct(s.share)}</small>
                </strong>
              </div>
            ))}
            {!analysis.knownText && (
              <p className="muted">
                No usable local analyzed text in this selection.
              </p>
            )}
          </div>
          <div className="readiness-inline">
            Skill similarity projection is not enabled: neighbor relevance and
            preservation have not been evaluated. Categorical analysis remains
            available.
          </div>
        </section>
      </div>
    </>
  );
}
