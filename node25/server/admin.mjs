import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { load, runtime, METRIC_VERSION } from "./query.mjs";
const COOKIE = "lens_admin",
  TTL = 3 * 60 * 60;
export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
function equal(a, b) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
function cookie(req) {
  return String(req.headers.cookie ?? "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
}
export function authenticated(req, env = process.env) {
  if (!env.ADMIN_SESSION_SECRET || !env.ADMIN_PASSWORD_HASH) return false;
  const value = cookie(req);
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (
    !payload ||
    !signature ||
    !equal(sign(payload, env.ADMIN_SESSION_SECRET), signature)
  )
    return false;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    return (
      Number.isInteger(p.exp) &&
      p.exp > now &&
      p.exp <= now + TTL &&
      p.scope === "admin" &&
      p.passwordVersion ===
        sign(env.ADMIN_PASSWORD_HASH, env.ADMIN_SESSION_SECRET)
    );
  } catch {
    return false;
  }
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
const attempts = new Map();
export function login(req, res, body, env = process.env) {
  if (!sameOrigin(req))
    throw Object.assign(new Error("Same-origin request required"), {
      status: 403,
    });
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET)
    throw Object.assign(new Error("Admin access has not been configured"), {
      status: 503,
    });
  const ip = String(
      req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown",
    )
      .split(",")[0]
      .trim(),
    now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => t > now - 900000);
  if (recent.length >= 8)
    throw Object.assign(new Error("Too many attempts; retry in 15 minutes"), {
      status: 429,
    });
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 2000) attempts.delete(attempts.keys().next().value);
  const password = body?.password;
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 256 ||
    !equal(
      hashPassword(password, env.ADMIN_PASSWORD_HASH.split(":")[0]),
      env.ADMIN_PASSWORD_HASH,
    )
  )
    throw Object.assign(new Error("Invalid password"), { status: 401 });
  attempts.delete(ip);
  const payload = Buffer.from(
    JSON.stringify({
      scope: "admin",
      exp: Math.floor(now / 1000) + TTL,
      passwordVersion: sign(env.ADMIN_PASSWORD_HASH, env.ADMIN_SESSION_SECRET),
      nonce: randomBytes(12).toString("hex"),
    }),
  ).toString("base64url");
  const secure = env.VERCEL || req.headers["x-forwarded-proto"] === "https";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${payload}.${sign(payload, env.ADMIN_SESSION_SECRET)}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${TTL}${secure ? "; Secure" : ""}`,
  );
  return { authenticated: true, expiresInSeconds: TTL };
}
export function logout(req, res) {
  if (!sameOrigin(req))
    throw Object.assign(new Error("Same-origin request required"), {
      status: 403,
    });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${process.env.VERCEL ? "; Secure" : ""}`,
  );
  return { authenticated: false };
}
let trafficCache;
export function analyticsConfig(env = process.env) {
  if (!env.UMAMI_URL || !env.UMAMI_WEBSITE_ID) return null;
  try {
    const url = new URL(env.UMAMI_URL);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      !/^[a-f0-9-]{36}$/i.test(env.UMAMI_WEBSITE_ID)
    )
      return null;
    return {
      scriptUrl: url.origin + "/script.js",
      websiteId: env.UMAMI_WEBSITE_ID,
    };
  } catch {
    return null;
  }
}
export async function traffic(env = process.env) {
  const config = analyticsConfig(env),
    source = "Umami (self-hosted, open source)",
    providerDashboardUrl = config
      ? new URL(config.scriptUrl).origin
      : undefined;
  const base = {
    configured: false,
    source,
    providerDashboardUrl,
    visitors: null,
    pageViews: null,
    routes: [],
    countries: [],
    limitations: [
      "Aggregated browser visits are session-based estimates, not named people or a complete census. Blocking and reporting delays affect coverage.",
    ],
  };
  if (!config || !env.UMAMI_API_TOKEN)
    return {
      ...base,
      status: "unconfigured",
      limitations: [
        ...base.limitations,
        "Self-hosted Umami needs an always-on host and persistent PostgreSQL. Configure UMAMI_URL, UMAMI_WEBSITE_ID and a server-only UMAMI_API_TOKEN. No visitor history has been fabricated.",
      ],
    };
  const key = config.scriptUrl + config.websiteId;
  if (
    trafficCache &&
    trafficCache.key === key &&
    trafficCache.until > Date.now()
  )
    return trafficCache.value;
  const endAt = Date.now(),
    startAt = endAt - 7 * 86400000,
    params = new URLSearchParams({
      startAt: String(startAt),
      endAt: String(endAt),
    });
  const fetchJson = async (endpoint, type) => {
    const url = new URL(
      "/api/websites/" + config.websiteId + "/" + endpoint,
      providerDashboardUrl,
    );
    url.search = params.toString();
    if (type) url.searchParams.set("type", type);
    const r = await fetch(url, {
      headers: { Authorization: "Bearer " + env.UMAMI_API_TOKEN },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("Analytics provider unavailable");
    return r.json();
  };
  try {
    const [stats, paths, places] = await Promise.all([
      fetchJson("stats"),
      fetchJson("metrics", "path"),
      fetchJson("metrics", "country"),
    ]);
    const number = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
    const routes = (Array.isArray(paths) ? paths : [])
      .slice(0, 25)
      .map((r) => ({
        path:
          typeof r.x === "string" ? r.x.split("?")[0].slice(0, 160) : "Unknown",
        pageViews: number(r.y),
      }));
    const countries = (Array.isArray(places) ? places : [])
      .slice(0, 20)
      .map((r) => ({
        country: typeof r.x === "string" ? r.x.slice(0, 40) : "Unknown",
        pageViews: number(r.y),
      }));
    const visitors = number(stats.visitors),
      pageViews = number(stats.pageviews);
    const value = {
      ...base,
      configured: true,
      status: pageViews === null ? "awaiting-data" : "available",
      visitors,
      pageViews,
      routes,
      countries,
      since: new Date(startAt).toISOString(),
      until: new Date(endAt).toISOString(),
      checkedAt: new Date().toISOString(),
      limitations: base.limitations,
    };
    trafficCache = { key, until: Date.now() + 60000, value };
    return value;
  } catch {
    return {
      ...base,
      configured: true,
      status: "unavailable",
      checkedAt: new Date().toISOString(),
      limitations: [
        ...base.limitations,
        "Umami could not be read. Check host, read token and website permissions; unavailable counts do not mean zero visitors.",
      ],
    };
  }
}
export async function admin() {
  const { release } = await load();
  return {
    deployment: {
      version: "2.5.1",
      datasetVersion: release.datasetVersion,
      sourceDatasetVersion: release.sourceDatasetVersion ?? null,
      metricVersion: METRIC_VERSION,
      url: "https://lens.feedos.si",
      v2Url: "https://jobmarket.feedos.si",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      node: process.version,
    },
    collection: {
      ...release.collection,
      counts: release.counts,
      sources: release.catalog.sources,
      lastSnapshot: release.asOf,
      scheduled: false,
      runs: release.collection?.runs ?? [],
      limitations: [
        ...(release.limitations ?? []),
        "No scheduled collector is active. Snapshot records and imported source dates do not establish current vacancies.",
      ],
    },
    traffic: await traffic(),
    runtime: {
      ...runtime,
      memoryBytes: process.memoryUsage().rss,
      scope:
        "Current Node function instance only; counters reset on cold starts and do not measure unique visitors.",
      authRateLimit:
        "Best-effort per-instance login throttle; use platform firewall for distributed abuse.",
    },
  };
}
