import { useEffect, useRef, useState } from "react";
import type { Envelope, Filter, Mode } from "./types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "The research service returned an unreadable response. Please retry.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      body.error || body.message || `Request failed (${response.status}).`,
      response.status,
    );
  return body as T;
}
let sequence = 0;
export function queryBody(
  mode: Mode,
  filter: Filter,
  version: string,
  view: string,
  extra: Record<string, unknown> = {},
) {
  return {
    protocolVersion: "2.5",
    datasetVersion: version,
    requestId: `studio-${++sequence}`,
    sourceMode: mode,
    view,
    filter,
    ...extra,
  };
}
export function useQuery<T>(
  mode: Mode,
  filter: Filter,
  version: string,
  view: string,
  extra: Record<string, unknown> = {},
  enabled = true,
) {
  const [data, setData] = useState<Envelope<T> | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const key = JSON.stringify([mode, filter, version, view, extra, enabled]),
    request = useRef(0);
  useEffect(() => {
    if (!enabled || !version) {
      setData(null);
      return;
    }
    const controller = new AbortController(),
      current = ++request.current;
    setLoading(true);
    setError("");
    const body = queryBody(mode, filter, version, view, extra);
    api<Envelope<T>>("/api/query", {
      method: "POST",
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted || current !== request.current) return;
        if (
          result.protocolVersion !== "2.5" ||
          result.datasetVersion !== version ||
          result.requestId !== body.requestId ||
          result.sourceMode !== mode ||
          !Number.isSafeInteger(result.matchedCount) ||
          result.matchedCount < 0
        )
          throw new Error(
            "The response does not match this study. Reload to select a valid release.",
          );
        if (
          view === "records" &&
          (!Array.isArray((result.data as any).rows) ||
            (result.data as any).rows.length > 100)
        )
          throw new Error("Record page exceeded the public response limit.");
        setData(result);
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted || current !== request.current) return;
        setError(
          e.status === 409
            ? "This study uses an unavailable release. Reload to start a fresh study; frozen cohorts will not be retargeted."
            : e.message,
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [key]);
  return { data, loading, error };
}
