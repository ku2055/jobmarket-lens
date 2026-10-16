import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Database,
  Info,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "./api";
import { dollars } from "./state";
import type { Catalog, Mode, Posting } from "./types";
export function Detail({
  id,
  mode,
  catalog,
  label,
  onClose,
}: {
  id: string;
  mode: Mode;
  catalog: Catalog;
  label: (id: string) => string;
  onClose: () => void;
}) {
  const [row, setRow] = useState<Posting | null>(null),
    [error, setError] = useState(""),
    close = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const c = new AbortController();
    setRow(null);
    setError("");
    api<{
      protocolVersion: string;
      datasetVersion: string;
      data: { row: Posting };
    }>("/api/detail", {
      method: "POST",
      body: JSON.stringify({
        sourceMode: mode,
        id,
        datasetVersion: catalog.datasetVersion,
      }),
      signal: c.signal,
    })
      .then((r) => {
        if (
          r.protocolVersion !== "2.5" ||
          r.datasetVersion !== catalog.datasetVersion ||
          r.data.row.id !== id
        )
          throw new Error("Record identity does not match this study.");
        setRow(r.data.row);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [id, mode, catalog.datasetVersion]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const targets = [
          ...panel.current!.querySelectorAll<HTMLElement>(
            "button,a[href],input,select",
          ),
        ].filter((x) => x.getClientRects().length > 0);
        if (e.shiftKey && document.activeElement === targets[0]) {
          e.preventDefault();
          targets.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === targets.at(-1)) {
          e.preventDefault();
          targets[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <>
      <div className="detail-backdrop" onClick={onClose} />
      <aside
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        ref={panel}
      >
        <header>
          <div className="eyebrow">
            <Database size={13} />
            PUBLIC POSTING / EVIDENCE
          </div>
          <button
            className="icon-button"
            ref={close}
            onClick={onClose}
            aria-label="Close record details"
          >
            <X size={20} />
          </button>
        </header>
        {error ? (
          <div className="alert error" role="alert">
            {error}
          </div>
        ) : !row ? (
          <div className="panel-loading">
            <LoaderCircle size={24} className="spin" />
            <h2 id="detail-title">Opening the public record</h2>
          </div>
        ) : (
          <>
            <h2 id="detail-title">{row.title}</h2>
            <p className="detail-employer">{label(row.companyId)}</p>
            <span className="detail-status">
              <span className="tiny-dot" />
              {row.availability.replaceAll("_", " ")}
              <span>
                As of {row.availabilityAsOf?.slice(0, 10) || "unknown"}
              </span>
            </span>
            {row.sourceUrl && /^https?:\/\//i.test(row.sourceUrl) && (
              <a
                className="button primary detail-source"
                href={row.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open source posting <ArrowUpRight size={15} />
              </a>
            )}
            <section>
              <h3>Role & requirements</h3>
              <dl className="detail-facts">
                <div>
                  <dt>Occupation</dt>
                  <dd>{label(row.occupationId || "__unknown__")}</dd>
                </div>
                <div>
                  <dt>Level</dt>
                  <dd>{row.level || "Unknown"}</dd>
                </div>
                <div>
                  <dt>Arrangement</dt>
                  <dd>{row.arrangement || "Unknown"}</dd>
                </div>
                <div>
                  <dt>Employment</dt>
                  <dd>{row.employmentType || "Unknown"}</dd>
                </div>
                <div>
                  <dt>Degree category</dt>
                  <dd>{row.degree || "Unknown"}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>
                    {row.experienceYears === null
                      ? "Unknown"
                      : `${row.experienceYears} years`}
                  </dd>
                </div>
                <div>
                  <dt>Locations</dt>
                  <dd>
                    {row.locations.length
                      ? row.locations.map((l, i) => (
                          <span key={i}>
                            {[l.city, l.region, l.country]
                              .filter(Boolean)
                              .join(", ") || "Unknown"}
                            <small>{l.precision} precision</small>
                          </span>
                        ))
                      : "Unknown"}
                  </dd>
                </div>
              </dl>
            </section>
            <section>
              <h3>Recorded skill mentions</h3>
              <div className="skill-tags">
                {row.skillIds.length ? (
                  row.skillIds.map((s) => <span key={s}>{label(s)}</span>)
                ) : (
                  <p>
                    No skill list recorded. This does not mean no skills are
                    required.
                  </p>
                )}
              </div>
            </section>
            <section>
              <h3>Advertised pay</h3>
              {row.pay ? (
                <>
                  <p className="native-pay">
                    {row.pay.currency || "Unknown currency"}{" "}
                    {row.pay.low ?? "Unknown"}–{row.pay.high ?? "Unknown"}{" "}
                    <span>/ {row.pay.period || "unknown period"}</span>
                  </p>
                  <p>
                    {row.pay.valid
                      ? `Validated annual range ${dollars(row.pay.annualLow)}–${dollars(row.pay.annualHigh)}.`
                      : "Excluded from the validated USD summary."}
                  </p>
                  <p className="detail-muted">
                    {row.pay.flags.join(" · ") ||
                      "No pay-validation flags recorded."}
                  </p>
                </>
              ) : (
                <p>No usable advertised range recorded.</p>
              )}
            </section>
            <section>
              <h3>Trace the evidence</h3>
              <dl className="detail-facts">
                <div>
                  <dt>Posting date</dt>
                  <dd>
                    {row.sourcePostedDate || "Unknown"}
                    <small>{row.dateBasis.replaceAll("_", " ")}</small>
                  </dd>
                </div>
                <div>
                  <dt>Text coverage</dt>
                  <dd>
                    {row.hasDescription === true
                      ? "Usable local analyzed text"
                      : row.hasDescription === false
                        ? "Not available"
                        : "Unknown upstream coverage"}
                  </dd>
                </div>
                <div>
                  <dt>Completeness</dt>
                  <dd>{row.quality.completeness}</dd>
                </div>
                <div>
                  <dt>Conflicts retained</dt>
                  <dd>
                    {row.quality.conflictGroups.join(", ") || "None recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Source references</dt>
                  <dd>{row.sourceIds.join(" · ")}</dd>
                </div>
              </dl>
              <details className="provenance-details">
                <summary>Field provenance & flags</summary>
                <dl>
                  {Object.entries(row.provenance).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {row.quality.flags.length > 0 && (
                  <p>{row.quality.flags.join(" · ")}</p>
                )}
              </details>
            </section>
            <div className="detail-boundary">
              <ShieldCheck size={18} />
              <p>
                Private descriptions and extraction snippets are excluded. The
                original posting may have changed or closed since this source
                observation.
              </p>
            </div>
            <p className="detail-id">{row.id}</p>
          </>
        )}
      </aside>
    </>
  );
}
