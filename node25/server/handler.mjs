import { query, detail, exportCsv, load } from "./query.mjs";
import {
  spatialScene,
  spatialSelection,
  spatialCompare,
  exportSpatialCsv,
} from "./spatial.mjs";
import {
  authenticated,
  login,
  logout,
  admin,
  analyticsConfig,
} from "./admin.mjs";
export function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
}
async function body(req, maxBytes = 65536) {
  if (req.body !== undefined) {
    const v = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (Buffer.byteLength(JSON.stringify(v)) > maxBytes)
      throw Object.assign(new Error("Request too large"), { status: 413 });
    return v;
  }
  let b = "";
  for await (const chunk of req) {
    b += chunk;
    if (Buffer.byteLength(b) > maxBytes)
      throw Object.assign(new Error("Request too large"), { status: 413 });
  }
  return b ? JSON.parse(b) : {};
}
export default async function handler(req, res) {
  securityHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const url = new URL(req.url, "http://local");
  const path = (
    url.pathname === "/api/index" && url.searchParams.has("route")
      ? "/api/" + url.searchParams.get("route")
      : url.pathname
  ).replace(/\/$/, "");
  try {
    let result;
    if (path === "/api/admin/login" && req.method === "POST")
      result = login(req, res, await body(req));
    else if (path === "/api/admin/login" && req.method === "DELETE")
      result = logout(req, res);
    else if (path.startsWith("/api/admin")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      if (path !== "/api/admin")
        throw Object.assign(new Error("Not found"), { status: 404 });
      if (!authenticated(req))
        throw Object.assign(new Error("Admin authentication required"), {
          status: 401,
        });
      if (req.method !== "GET")
        throw Object.assign(new Error("Method not allowed"), { status: 405 });
      result = await admin();
    } else if (path === "/api/catalog" && req.method === "GET") {
      const { release } = await load();
      result = {
        protocolVersion: "2.5",
        datasetVersion: release.datasetVersion,
        counts: release.counts,
        ...release.catalog,
        asOf: release.asOf,
        methods: release.methods,
        limitations: release.limitations,
        analytics: analyticsConfig(),
      };
    } else if (path === "/api/health" && req.method === "GET") {
      const { release } = await load();
      result = {
        ready: true,
        version: "2.5.1",
        protocols: ["2.5", "2.5.1"],
        datasetVersion: release.datasetVersion,
      };
    } else if (path === "/api/query" && req.method === "POST")
      result = await query(await body(req));
    else if (path === "/api/spatial" && req.method === "POST")
      result = await spatialScene(await body(req, 131072));
    else if (path === "/api/spatial/selection" && req.method === "POST")
      result = await spatialSelection(await body(req, 131072));
    else if (path === "/api/spatial/compare" && req.method === "POST")
      result = await spatialCompare(await body(req, 131072));
    else if (path === "/api/spatial/export" && req.method === "POST")
      return await exportSpatialCsv(await body(req, 131072), res);
    else if (path === "/api/detail" && req.method === "POST")
      result = await detail(await body(req));
    else if (path === "/api/export" && req.method === "POST")
      return await exportCsv(await body(req), res);
    else throw Object.assign(new Error("Not found"), { status: 404 });
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    res.statusCode =
      error.status ??
      (error.name === "ZodError" || error instanceof SyntaxError ? 400 : 500);
    res.end(
      JSON.stringify({
        error:
          res.statusCode === 500
            ? "The analytical service is temporarily unavailable"
            : error.message,
      }),
    );
    if (res.statusCode === 500)
      console.error("Analytical service error:", error.message);
  }
}
