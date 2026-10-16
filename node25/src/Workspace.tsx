import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Database,
  GitCompareArrows,
  Grid2X2,
  Info,
  Layers3,
  LoaderCircle,
  Network,
  Plus,
  ShieldCheck,
  Table2,
  Upload,
  X,
} from "lucide-react";
import { dollars, modeLabel, n, percent } from "./state";
import type {
  Catalog,
  Category,
  Comparison,
  Envelope,
  Evidence,
  Filter,
  Mode,
  Overview,
  SkillsResult,
  Study,
} from "./types";
export function DemandMatrix({
  data,
  loading,
  onSelect,
}: {
  data?: Overview;
  loading: boolean;
  onSelect: (company: string, occupation: string) => void;
}) {
  const [table, setTable] = useState(false);
  const matrix = data?.matrix,
    lookup = useMemo(
      () =>
        new Map(
          matrix?.cells.map((c) => [
            c.companyId + "\0" + c.occupationId,
            c.count,
          ]) || [],
        ),
      [matrix],
    );
  const max = Math.max(1, ...(matrix?.cells.map((c) => c.count) || []));
  return (
    <section
      className="panel demand-panel"
      aria-label="Occupation by employer landscape"
      aria-busy={loading}
    >
      <div className="panel-head">
        <div>
          <p className="eyebrow">01 / THE DEMAND LANDSCAPE</p>
          <h2>Where roles meet employers.</h2>
        </div>
        <button
          className="view-toggle"
          onClick={() => setTable(!table)}
          aria-pressed={table}
        >
          {table ? <Grid2X2 size={14} /> : <Table2 size={14} />}{" "}
          {table ? "Matrix view" : "Cell list"}
        </button>
      </div>
      <div className="matrix-subhead">
        <p>A cell is a group of postings. Select one to focus every view.</p>
        <div className="heat-legend">
          <span>Fewer</span>
          <i />
          <i />
          <i />
          <i />
          <span>More postings</span>
        </div>
      </div>
      {!matrix ? (
        <div className="panel-loading">
          <LoaderCircle size={22} className="spin" />
          Building the occupation × employer view…
        </div>
      ) : !matrix.cells.length ? (
        <div className="empty">
          <Grid2X2 size={28} />
          <h3>No groups in this selection.</h3>
          <p>Widen the filters to see the landscape.</p>
        </div>
      ) : table ? (
        <div
          className="matrix-list-scroll"
          tabIndex={0}
          role="region"
          aria-label="Landscape cell list"
        >
          <table className="matrix-list">
            <thead>
              <tr>
                <th>Occupation</th>
                <th>Employer</th>
                <th>Postings</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {matrix.cells.map((c) => (
                <tr key={c.companyId + c.occupationId}>
                  <td>
                    {matrix.occupations.find((x) => x.id === c.occupationId)
                      ?.label || "Unknown"}
                  </td>
                  <td>
                    {matrix.companies.find((x) => x.id === c.companyId)
                      ?.label || c.companyId}
                  </td>
                  <td>{n(c.count)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => onSelect(c.companyId, c.occupationId)}
                    >
                      Select group <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="matrix-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable occupation by employer matrix"
        >
          <table className="demand-matrix">
            <thead>
              <tr>
                <th>
                  <span>OCCUPATION</span>
                  <small>EMPLOYER →</small>
                </th>
                {matrix.companies.map((c) => (
                  <th key={c.id}>
                    <div className="company-monogram" aria-hidden="true">
                      {c.label
                        .replace(/[^A-Za-z]/g, "")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span title={c.label}>{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.occupations.map((o, i) => (
                <tr key={o.id}>
                  <th>
                    <span className="row-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{o.label}</span>
                  </th>
                  {matrix.companies.map((c) => {
                    const count = lookup.get(c.id + "\0" + o.id) || 0;
                    return (
                      <td key={c.id}>
                        {count ? (
                          <button
                            className="matrix-cell"
                            style={{
                              background: `hsl(165 30% ${96 - 31 * Math.sqrt(count / max)}%)`,
                            }}
                            onClick={() => onSelect(c.id, o.id)}
                            aria-label={`${o.label}, ${c.label}: ${count} postings`}
                          >
                            {n(count)}
                          </button>
                        ) : (
                          <span
                            className="empty-cell"
                            aria-label={`No returned postings for ${o.label}, ${c.label}`}
                          >
                            ·
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel-foot">
        <Info size={13} />
        <p>
          {matrix
            ? `${matrix.companies.length} employers × ${matrix.occupations.length} occupations shown. ${n(matrix.otherCount)} postings outside these displayed groups remain in the full count.`
            : "The complete selected population remains the denominator."}{" "}
          <span>Classification is source-derived; unknowns are distinct.</span>
        </p>
      </div>
    </section>
  );
}
export function Distribution({
  title,
  eyebrow,
  categories,
  total,
  kind,
  onSelect,
}: {
  title: string;
  eyebrow: string;
  categories: Category[];
  total: number;
  kind: string;
  onSelect: (id: string) => void;
}) {
  const shown = categories.slice(0, 6),
    max = Math.max(1, ...shown.map((c) => c.count));
  return (
    <section className="panel distribution">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <ArrowUpRight size={15} />
      </div>
      <div className="bar-list">
        {shown.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            aria-label={`Filter ${kind}: ${c.label}, ${c.count} postings`}
          >
            <span className="bar-label">
              <span>{c.label}</span>
              <strong>{n(c.count)}</strong>
            </span>
            <span className="bar-base">
              <span
                style={{ width: `${(c.count / max) * 100}%` }}
                className={i === 0 ? "leading" : ""}
              />
            </span>
            <small>
              {percent(total ? c.count / total : 0)} of this selection
            </small>
          </button>
        ))}
      </div>
      {!shown.length && (
        <div className="empty small-empty">
          No returned categories in this selection.
        </div>
      )}
      <p className="distribution-foot">
        Top {shown.length} returned categories. Each count uses distinct posting
        IDs; missing countries are an explicit category.
      </p>
    </section>
  );
}
function describe(filter: Filter, label: (id: string) => string) {
  const parts: string[] = [];
  if (filter.search) parts.push(`“${filter.search}”`);
  for (const [k, v] of Object.entries(filter))
    if (Array.isArray(v)) parts.push(v.map(label).join(" + "));
  if (!parts.length)
    parts.push(
      filter.availability === "all" ? "All statuses" : "Open postings",
    );
  return parts.join(" · ");
}
export function ComparisonPanel({
  study,
  result,
  loading,
  compatible,
  label,
  onPin,
  onClear,
  onRename,
  onInspect,
}: {
  study: Study;
  result?: Comparison;
  loading: boolean;
  compatible: boolean;
  label: (id: string) => string;
  onPin: (slot: "a" | "b") => void;
  onClear: (slot: "a" | "b") => void;
  onRename: (slot: "a" | "b", label: string) => void;
  onInspect: (slot: "a" | "b", skill: string) => void;
}) {
  return (
    <section
      id="cohort-comparison"
      tabIndex={-1}
      className="panel comparison-panel"
      aria-label="Frozen cohort comparison"
    >
      <div className="panel-head">
        <div>
          <p className="eyebrow">02 / TWO PERSPECTIVES</p>
          <h2>Compare the view.</h2>
        </div>
        <GitCompareArrows size={17} />
      </div>
      <p className="comparison-intro">
        Freeze A. Refine the question. Freeze B.
        <br />
        Make the difference traceable.
      </p>
      <div className="pin-cards">
        {(["a", "b"] as const).map((slot) => {
          const c = study[slot];
          return (
            <div key={slot} className={`pin-card ${slot}`}>
              <div className="pin-card-heading">
                <span className={`letter ${slot}`}>{slot.toUpperCase()}</span>
                {c ? (
                  <input
                    aria-label={`Cohort ${slot.toUpperCase()} label`}
                    maxLength={70}
                    value={c.label}
                    onChange={(e) => onRename(slot, e.target.value)}
                  />
                ) : (
                  <strong>Choose a perspective</strong>
                )}
                {c && (
                  <button
                    className="icon-button"
                    aria-label={`Clear cohort ${slot.toUpperCase()}`}
                    onClick={() => onClear(slot)}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {c ? (
                <>
                  <p>{describe(c.filter, label)}</p>
                  <div className="pin-card-count">
                    <strong>
                      {n(result && compatible ? result[slot].count : c.count)}
                    </strong>
                    <span>postings · frozen</span>
                  </div>
                  <small>
                    {modeLabel[c.mode]} · {c.datasetVersion.slice(0, 8)}
                  </small>
                  <button className="replace-pin" onClick={() => onPin(slot)}>
                    Replace with current view <ArrowRight size={11} />
                  </button>
                </>
              ) : (
                <button className="add-pin" onClick={() => onPin(slot)}>
                  <Plus size={14} />
                  Pin current view
                </button>
              )}
            </div>
          );
        })}
      </div>
      {study.a && study.b ? (
        !compatible ? (
          <div className="comparison-boundary">
            <Info size={15} />
            <p>
              These cohorts do not share the active source basis. Switch to
              their original source or replace the pins. Membership is never
              silently rebased.
            </p>
          </div>
        ) : loading && !result ? (
          <div className="comparison-loading">
            <LoaderCircle size={18} className="spin" />
            Resolving frozen memberships…
          </div>
        ) : result ? (
          <>
            <div className="overlap-summary">
              <Layers3 size={14} />
              <strong>{n(result.overlap)}</strong>shared posting IDs
              <small>
                {n(result.onlyA)} only A · {n(result.onlyB)} only B
              </small>
            </div>
            <div className="difference-heading">
              <h3>Recorded skill differences</h3>
              <span>A − B · percentage points</span>
            </div>
            {result.differences.slice(0, 6).map((s) => (
              <div className="difference-row" key={s.id}>
                <div>
                  <strong>{s.label}</strong>
                  <span>
                    {result.a.count && result.b.count
                      ? `${s.aShare - s.bShare > 0 ? "+" : ""}${(100 * (s.aShare - s.bShare)).toFixed(1)} pp`
                      : "—"}
                  </span>
                </div>
                <div className="difference-axis">
                  <span />
                  <i
                    style={{
                      left:
                        s.aShare < s.bShare
                          ? `${50 - Math.min(50, 50 * Math.abs(s.aShare - s.bShare))}%`
                          : "50%",
                      width: `${result.a.count && result.b.count ? Math.min(50, 50 * Math.abs(s.aShare - s.bShare)) : 0}%`,
                    }}
                    className={s.aShare >= s.bShare ? "a" : "b"}
                  />
                </div>
                <div className="difference-contributors">
                  <button
                    onClick={() => onInspect("a", s.id)}
                    aria-label={`Inspect ${s.label} in cohort A`}
                  >
                    A {n(s.aCount)}/{n(result.a.count)}{" "}
                    <ArrowUpRight size={10} />
                  </button>
                  <button
                    onClick={() => onInspect("b", s.id)}
                    aria-label={`Inspect ${s.label} in cohort B`}
                  >
                    B {n(s.bCount)}/{n(result.b.count)}{" "}
                    <ArrowUpRight size={10} />
                  </button>
                </div>
              </div>
            ))}
            {!result.differences.length && (
              <p className="comparison-intro">
                No recorded skills to compare in these groups.
              </p>
            )}
            <div className="comparison-basis">
              <Info size={13} />
              <p>
                Skill mentions / all postings in each cohort, including empty
                lists. Click A or B to inspect its contributors.
              </p>
            </div>
          </>
        ) : null
      ) : (
        <div className="comparison-placeholder">
          <span className="placeholder-line" />
          <p>
            Two clear groups.
            <br />
            <strong>A more useful question.</strong>
          </p>
          <span className="placeholder-line" />
        </div>
      )}
    </section>
  );
}
export function PayPanel({ overview }: { overview?: Overview }) {
  const pay = overview?.pay;
  return (
    <section className="panel pay-context">
      <div className="eyebrow">
        <span className="amber-dot" />
        POSTED PAY / EVIDENCE GATE
      </div>
      <h3>
        {pay && pay.count >= 10
          ? "A bounded view of advertised pay."
          : "Keep sparse pay in perspective."}
      </h3>
      <div className="pay-count">
        <strong>{n(pay?.count || 0)}</strong>
        <span>eligible USD ranges</span>
      </div>
      {pay && pay.count >= 10 ? (
        <>
          <div className="pay-bounds">
            <div>
              <span>Median lower bound</span>
              <strong>{dollars(pay.medianLow)}</strong>
            </div>
            <div>
              <span>Median upper bound</span>
              <strong>{dollars(pay.medianHigh)}</strong>
            </div>
          </div>
          <p>
            Annualized posted-range bounds, calculated separately. These are
            advertised offers, not earnings or a salary premium.
          </p>
        </>
      ) : (
        <p>
          Fewer than 10 validated ranges: inspect individual records. A pooled
          salary summary would hide the limited evidence.
        </p>
      )}
      <small>
        Hourly × 2,080; monthly × 12. Other currencies and invalid ranges are
        excluded.
      </small>
    </section>
  );
}
export function SkillsWorkspace({
  response,
  loading,
  onSelect,
}: {
  response: Envelope<SkillsResult> | null;
  loading: boolean;
  onSelect: (skills: string[]) => void;
}) {
  const data = response?.data,
    skills = data?.skills.slice(0, 9) || [],
    lookup = new Map(
      data?.coMentions
        .filter((c) => c.count >= 3)
        .map((c) => [[c.a, c.b].sort().join("\0"), c.count]),
    );
  return (
    <>
      <section className="panel skills-panel" aria-busy={loading}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">01 / THE SKILL CONNECTIONS</p>
            <h2>Read the shared language.</h2>
          </div>
          <Network size={18} />
        </div>
        <p className="panel-description">
          Recorded co-mentions are a starting point for exploration. Select a
          pair to inspect postings mentioning both.
        </p>
        {!data ? (
          <div className="panel-loading">
            <LoaderCircle className="spin" size={23} />
            Loading supported co-mentions…
          </div>
        ) : !skills.length ? (
          <div className="empty">
            <Network size={28} />
            <h3>No skill mentions in this scope.</h3>
            <p>
              An empty skill list does not establish that a role requires no
              skills.
            </p>
          </div>
        ) : (
          <div
            className="skill-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable skill co-mention matrix"
          >
            <table className="skill-matrix">
              <thead>
                <tr>
                  <th>RECORDED SKILL</th>
                  {skills.map((s, i) => (
                    <th key={s.id}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <small>{s.label}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skills.map((s, i) => (
                  <tr key={s.id}>
                    <th>
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      <span>
                        {s.label}
                        <small>
                          {n(s.count)}/{n(response!.matchedCount)} ·{" "}
                          {percent(s.share)}
                        </small>
                      </span>
                    </th>
                    {skills.map((t) => {
                      const same = s.id === t.id,
                        count = same
                          ? s.count
                          : lookup.get([s.id, t.id].sort().join("\0"));
                      return (
                        <td key={t.id}>
                          {count !== undefined ? (
                            <button
                              className={same ? "diagonal" : ""}
                              style={{
                                background: same
                                  ? "#e8eee9"
                                  : `hsl(165 30% ${96 - 30 * Math.min(1, count / Math.max(1, s.count, t.count))}%)`,
                              }}
                              aria-label={`${s.label}${same ? "" : ` and ${t.label}`}: ${count} postings`}
                              onClick={() =>
                                onSelect(same ? [s.id] : [s.id, t.id])
                              }
                            >
                              {n(count)}
                            </button>
                          ) : (
                            <span aria-label="Not displayed: below support threshold or outside returned pairs">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="panel-foot">
          <Info size={13} />
          <p>
            Top {skills.length} returned skills. Off-diagonal cells require at
            least 3 shared postings; “—” is not a verified zero. No skill
            association implies causation or a career transition.
          </p>
        </div>
      </section>
      <section className="panel skills-basis">
        <div>
          <p className="eyebrow">KEEP THE DENOMINATOR IN VIEW</p>
          <h2>
            A mention is a clue.
            <br />
            The context matters.
          </h2>
        </div>
        <div>
          <p>
            {data?.basis ||
              "Recorded skill share uses the complete selected posting population, including empty skill lists."}
          </p>
          <div className="skills-coverage">
            <strong>{n(data?.analyzedTextCount || 0)}</strong>
            <span>
              of {n(response?.matchedCount || 0)} selected postings have usable
              locally analyzed text. Upstream description coverage remains
              unknown.
            </span>
          </div>
          <p>
            Recorded-mention shares are separate from analyzed-text shares.
            These views do not claim every mentioned skill is a verified
            requirement.
          </p>
        </div>
      </section>
    </>
  );
}
export function EvidenceWorkspace({
  response,
  catalog,
  mode,
  overview,
  onExport,
  onImport,
}: {
  response: Envelope<Evidence> | null;
  catalog: Catalog;
  mode: Mode;
  overview: Envelope<Overview> | null;
  onExport: () => void;
  onImport: () => void;
}) {
  const data = response?.data,
    coverage = data?.coverage;
  return (
    <>
      <section className="panel evidence-main">
        <div className="panel-head">
          <div>
            <p className="eyebrow">01 / KNOW THE BASIS</p>
            <h2>Good analysis leaves a trail.</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <p className="panel-description">
          A view of observed advertisements. Broad inventory is useful; it does
          not make this sample representative of every employer or worker.
        </p>
        <dl className="evidence-facts">
          <div>
            <dt>Population</dt>
            <dd>
              {modeLabel[mode]} ·{" "}
              {n(response?.matchedCount || overview?.matchedCount || 0)}{" "}
              distinct posting IDs
            </dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>
              Local observations and upstream reports retain different evidence
              bases. A report is not a live verification.
            </dd>
          </div>
          <div>
            <dt>Release</dt>
            <dd className="mono">{catalog.datasetVersion}</dd>
          </div>
          <div>
            <dt>Source as of</dt>
            <dd>{catalog.asOf?.slice(0, 10) || "Unknown date"}</dd>
          </div>
          <div>
            <dt>Contributor identity</dt>
            <dd className="mono">
              {response?.contributorHash ||
                overview?.contributorHash ||
                "Resolving"}
              <small>
                The record pages and export must resolve to this same selected
                population.
              </small>
            </dd>
          </div>
          <div>
            <dt>Method versions</dt>
            <dd>
              {Object.entries(catalog.methods || {}).map(([k, v]) => (
                <span key={k} className="method-token">
                  {k}: {typeof v === "string" ? v : JSON.stringify(v)}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        <div className="evidence-actions">
          <button className="button secondary" onClick={onExport}>
            <ArrowDownToLine size={14} />
            Save study file
          </button>
          <button className="button secondary" onClick={onImport}>
            <Upload size={14} />
            Restore study
          </button>
        </div>
      </section>
      <section className="panel coverage-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">MISSINGNESS IS INFORMATION</p>
            <h2>What this selection can support.</h2>
          </div>
        </div>
        <div className="coverage-cards">
          <article>
            <span>Locally analyzed text</span>
            <strong>{n(coverage?.analyzedTextCount || 0)}</strong>
            <p>
              Usable local descriptions. Unknown upstream text is not counted as
              analyzed.
            </p>
          </article>
          <article>
            <span>Unknown country</span>
            <strong>{n(coverage?.unknownCountryCount || 0)}</strong>
            <p>
              Missing geography stays distinct. Country-only evidence is not
              placed at a city.
            </p>
          </article>
          <article>
            <span>Unknown arrangement</span>
            <strong>{n(coverage?.unknownArrangementCount || 0)}</strong>
            <p>Unspecified is separate from remote, hybrid and on-site.</p>
          </article>
          <article>
            <span>Valid USD pay ranges</span>
            <strong>{n(coverage?.eligiblePayCount || 0)}</strong>
            <p>
              Ordered finite bounds with validated units and currency. Posted
              offers, not earnings.
            </p>
          </article>
        </div>
      </section>
      <section className="panel source-register">
        <div className="panel-head">
          <div>
            <p className="eyebrow">SOURCE REGISTER</p>
            <h2>The evidence has an origin.</h2>
          </div>
        </div>
        {(data?.sources || catalog.sources).map((s, i) => (
          <div key={String(s.id || i)} className="source-row">
            <span className="source-symbol">
              <Database size={17} />
            </span>
            <div>
              <strong>
                {s.kind === "upstream"
                  ? "Pinned public upstream snapshot"
                  : s.kind === "local"
                    ? "Local observed evidence"
                    : String(s.id || "Source")}
              </strong>
              <p>
                {String(s.id || "")} · As of{" "}
                {String(s.asOf || catalog.asOf || "Unknown").slice(0, 10)} ·
                Completeness {String(s.completeness || "unknown")}
              </p>
              {typeof s.commit === "string" &&
                /^[a-f0-9]{40}$/.test(s.commit) && (
                  <a
                    href={`https://github.com/yimizhao2015/jobmarket-lens/commit/${s.commit}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source commit {s.commit.slice(0, 8)}{" "}
                    <ArrowUpRight size={12} />
                  </a>
                )}
            </div>
          </div>
        ))}
        <ul className="limitations">
          {(data?.limitations || catalog.limitations).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
      <div className="evidence-readiness">
        <ShieldCheck size={23} />
        <div>
          <h3>Inventory is not hiring growth.</h3>
          <p>
            Trend analysis needs comparable repeated observations. Disappearance
            does not establish a hire, and an employed profile is not available
            talent. Workforce/profile integrations are outside this release.
          </p>
        </div>
      </div>
    </>
  );
}
