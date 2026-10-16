import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  Database,
  Globe2,
  Info,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Header } from "./Brand";
import { api, ApiError } from "./api";
import { n } from "./state";
import type { AdminData } from "./types";
const display = (value: unknown) =>
  value === null || value === undefined
    ? "Not reported"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
function reportingDate(value: string | undefined) {
  if (!value) return "Not reported";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date) + " UTC"
    : "Unrecognized date";
}
export function Admin() {
  const [data, setData] = useState<AdminData | null>(null),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [auth, setAuth] = useState(false),
    [busy, setBusy] = useState(false);
  const passwordField = useRef<HTMLInputElement>(null);
  const load = async () => {
    setLoading(true);
    try {
      const result = await api<AdminData>("/api/admin", { cache: "no-store" });
      setData(result);
      setAuth(true);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAuth(false);
        setData(null);
      } else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,nofollow";
    document.head.append(tag);
    document.title = "Owner access — JobMarket Lens";
    void load();
    return () => tag.remove();
  }, []);
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setPassword("");
      passwordField.current?.focus();
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    try {
      await api("/api/admin/login", { method: "DELETE" });
      setData(null);
      setAuth(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const dashboard = (() => {
    try {
      const url = new URL(data?.traffic.providerDashboardUrl || "");
      return url.protocol === "https:" && !url.username && !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  })();
  return (
    <>
      <Header />
      <main className="admin-page" id="research">
        <div className="admin-title">
          <div>
            <p className="eyebrow">
              <LockKeyhole size={12} />
              OWNER WORKSPACE / PRIVATE ACCESS
            </p>
            <h1>Keep the operation in view.</h1>
            <p>
              Deployment status, collection evidence and anonymous site traffic.
            </p>
          </div>
          {auth && (
            <div>
              <button
                className="button secondary"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
                Refresh
              </button>
              <button
                className="button secondary"
                onClick={logout}
                disabled={busy}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="alert error" role="alert">
            <Info size={17} />
            <span>{error}</span>
          </div>
        )}
        {loading && !data ? (
          <div className="initial-loading">
            <LoaderCircle size={25} className="spin" />
            <p>Checking owner session…</p>
          </div>
        ) : !auth ? (
          <section className="admin-login">
            <div className="admin-login-icon">
              <KeyRound size={27} />
            </div>
            <p className="eyebrow">RESTRICTED ADMINISTRATION</p>
            <h2>Your studio, behind a lock.</h2>
            <p>
              Sign in to inspect collection and aggregate traffic. Public
              analysis remains available without an account.
            </p>
            <form onSubmit={login}>
              <label>
                Owner password
                <input
                  ref={passwordField}
                  aria-label="Owner password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <LockKeyhole size={15} />
                )}
                Sign in securely <ArrowRight size={15} />
              </button>
            </form>
            <div className="login-boundary">
              <ShieldCheck size={16} />
              <span>
                Secure owner session. Passwords are never stored in the browser.
              </span>
            </div>
            <a className="text-button" href="/canvas">
              Back to public research <ArrowUpRight size={13} />
            </a>
          </section>
        ) : data ? (
          <>
            <div className="admin-summary">
              <AdminStat
                title="Combined inventory"
                value={
                  data.collection.counts.combined === undefined
                    ? "Not reported"
                    : n(data.collection.counts.combined)
                }
                caption="Distinct posting IDs in the released snapshot"
                icon={<Database size={20} />}
              />
              <AdminStat
                title="Collection schedule"
                value={data.collection.scheduled ? "Configured" : "Disabled"}
                caption={
                  data.collection.scheduled
                    ? "Inspect run details below"
                    : "No automatic employer collection is running"
                }
                icon={<CalendarClock size={20} />}
              />
              <AdminStat
                title="Anonymous visitors"
                value={
                  data.traffic.configured && data.traffic.visitors !== null
                    ? n(data.traffic.visitors)
                    : "Unavailable"
                }
                caption={
                  data.traffic.configured
                    ? "Aggregate provider count"
                    : "Analytics reporting is not connected"
                }
                icon={<Globe2 size={20} />}
              />
              <AdminStat
                title="Page views"
                value={
                  data.traffic.configured && data.traffic.pageViews !== null
                    ? n(data.traffic.pageViews)
                    : "Unavailable"
                }
                caption="No individual visitor identities or profile data"
                icon={<Activity size={20} />}
              />
            </div>
            <div className="admin-columns">
              <section className="panel admin-deployment">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">DEPLOYMENT & RUNTIME</p>
                    <h2>The active environment.</h2>
                  </div>
                  <Server size={18} />
                </div>
                <dl className="evidence-facts">
                  {Object.entries(data.deployment)
                    .filter(([k]) =>
                      [
                        "environment",
                        "region",
                        "commit",
                        "datasetVersion",
                        "version",
                        "service",
                        "host",
                        "url",
                        "origin",
                        "node",
                        "sourceDatasetVersion",
                        "metricVersion",
                      ].includes(k),
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd
                          className={
                            key.toLowerCase().includes("version") ||
                            key === "commit"
                              ? "mono"
                              : ""
                          }
                        >
                          {display(value)}
                        </dd>
                      </div>
                    ))}
                  {Object.entries(data.runtime)
                    .filter(([k]) =>
                      [
                        "node",
                        "nodeVersion",
                        "uptimeSeconds",
                        "rssBytes",
                        "memoryBytes",
                        "queries",
                        "completedQueries",
                        "activeQueries",
                        "queuedQueries",
                        "engine",
                        "cacheEntries",
                        "maxConcurrency",
                        "active",
                        "queued",
                        "scope",
                        "authRateLimit",
                      ].includes(k),
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{display(value)}</dd>
                      </div>
                    ))}
                </dl>
                <p className="admin-data-basis">
                  Runtime values are read from the active service. Missing
                  fields are not treated as healthy zeroes.
                </p>
              </section>
              <section className="panel admin-traffic">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">ANONYMOUS TRAFFIC</p>
                    <h2>Usage, with a privacy boundary.</h2>
                  </div>
                  <Activity size={18} />
                </div>
                {(data.traffic.since ||
                  data.traffic.until ||
                  data.traffic.checkedAt ||
                  data.traffic.status) && (
                  <dl
                    className="evidence-facts"
                    aria-label="Analytics reporting window"
                  >
                    {data.traffic.status && (
                      <div>
                        <dt>Reporting status</dt>
                        <dd>{data.traffic.status.replaceAll("_", " ")}</dd>
                      </div>
                    )}
                    {(data.traffic.since || data.traffic.until) && (
                      <div>
                        <dt>Reporting window</dt>
                        <dd>
                          {reportingDate(data.traffic.since)} →{" "}
                          {reportingDate(data.traffic.until)}
                        </dd>
                      </div>
                    )}
                    {data.traffic.checkedAt && (
                      <div>
                        <dt>Last checked</dt>
                        <dd>{reportingDate(data.traffic.checkedAt)}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {!data.traffic.configured ? (
                  <div className="traffic-unavailable">
                    <div className="traffic-icon">
                      <Globe2 size={26} />
                    </div>
                    <h3>Reporting is not connected.</h3>
                    <p>
                      Page-view collection and owner reporting are separate.
                      Visitor and page-view counts stay unavailable until an
                      approved reporting connection supplies them.
                    </p>
                    {dashboard && (
                      <a
                        className="button secondary"
                        href={dashboard}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open provider analytics <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="panel-description">
                      Source: {data.traffic.source}. Counts are aggregated;
                      there are no named visitors.
                    </p>
                    <TrafficList title="Routes" items={data.traffic.routes} />
                    <TrafficList
                      title="Countries"
                      items={data.traffic.countries}
                    />
                    {dashboard && (
                      <a
                        className="text-button provider-link"
                        href={dashboard}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open provider analytics <ArrowUpRight size={14} />
                      </a>
                    )}
                  </>
                )}
                <ul className="limitations">
                  {data.traffic.limitations.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                  <li>
                    Only public route paths are collected. Study filters, search
                    terms, URL state and admin pages are excluded from the
                    client analytics event.
                  </li>
                </ul>
              </section>
            </div>
            <section className="panel admin-collection">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">COLLECTION & SOURCE STATUS</p>
                  <h2>A snapshot, with an audit trail.</h2>
                </div>
                <Database size={18} />
              </div>
              <div className="collection-banner">
                <span className="amber-dot" />
                <p>
                  {data.collection.scheduled
                    ? "Collection schedule is configured; inspect actual run records below."
                    : "Collection scheduling is disabled. This deployment serves a pinned, sanitized release."}
                </p>
              </div>
              <dl className="evidence-facts">
                <div>
                  <dt>Last source snapshot</dt>
                  <dd>{data.collection.lastSnapshot || "Not reported"}</dd>
                </div>
                <div>
                  <dt>Source populations</dt>
                  <dd>
                    {Object.entries(data.collection.counts).map(([k, v]) => (
                      <span className="method-token" key={k}>
                        {k}: {n(v)}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              {data.collection.runs.length ? (
                <div className="admin-runs">
                  {data.collection.runs.map((run, i) => (
                    <article key={i}>
                      <h3>
                        {display(
                          run.company ||
                            run.source ||
                            run.id ||
                            "Collection run",
                        )}
                      </h3>
                      <p>
                        Status: {display(run.status)} · Observed:{" "}
                        {display(
                          run.runDate || run.observedAt || run.startedAt,
                        )}
                      </p>
                      <p>
                        {run.kind === "historical-import"
                          ? "Historical imported observation · legacy Python collector"
                          : "Recorded collection run"}{" "}
                        · Collected {display(run.collected)} / reported{" "}
                        {display(run.siteTotal)} · Inventory{" "}
                        {display(run.inventoryStatus)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="no-runs">
                  <CalendarClock size={18} />
                  <p>
                    No collection runs have been recorded by this deployment. A
                    read-only analytical request does not trigger a job-board
                    fetch.
                  </p>
                </div>
              )}
              <ul className="limitations">
                {data.collection.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
        <footer className="admin-footer">
          <ShieldCheck size={15} />
          <span>
            Owner-only controls · no collection credentials or raw evidence in
            the public analytical service
          </span>
        </footer>
      </main>
    </>
  );
}
function AdminStat({
  title,
  value,
  caption,
  icon,
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="admin-stat">
      <div>
        {icon}
        <span>{title}</span>
      </div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}
function TrafficList({
  title,
  items,
}: {
  title: string;
  items: Record<string, unknown>[];
}) {
  return (
    <section className="traffic-list">
      <h3>{title}</h3>
      {items.length ? (
        items.slice(0, 12).map((r, i) => (
          <div key={i}>
            <span>
              {display(r.route || r.path || r.country || r.name || r.label)}
            </span>
            <strong>{display(r.visitors ?? r.pageViews ?? r.count)}</strong>
          </div>
        ))
      ) : (
        <p>No aggregate breakdown was returned.</p>
      )}
    </section>
  );
}
