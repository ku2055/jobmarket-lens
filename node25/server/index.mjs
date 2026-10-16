import http from "node:http";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import handler, { securityHeaders } from "./handler.mjs";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
  ".woff2": "font/woff2",
};
const routes = new Set([
  "/",
  "/canvas",
  "/skills",
  "/evidence",
  "/admin",
  "/spatial",
  "/spatial/",
]);
export function createAppServer(root = resolve("dist")) {
  root = resolve(root);
  return http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) return handler(req, res);
    securityHeaders(res);
    if (!["GET", "HEAD"].includes(req.method)) {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      return res.end();
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    } catch {
      res.statusCode = 400;
      return res.end("Invalid path");
    }
    const p = routes.has(pathname)
      ? resolve(root, "index.html")
      : resolve(root, "." + pathname);
    if (!p.startsWith(root + "/")) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    try {
      const info = await stat(p);
      if (!info.isFile()) throw new Error("Not a file");
      res.setHeader(
        "Content-Type",
        types[extname(p)] ?? "application/octet-stream",
      );
      res.setHeader("Accept-Ranges", "bytes");
      if (pathname === "/admin")
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      if (/^\/video\/tour-v\d+[.-]/.test(pathname))
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      let start = 0,
        end = info.size - 1;
      if (req.method === "GET" && req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match && (match[1] || match[2])) {
          if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
          else {
            start = Number(match[1]);
            if (match[2]) end = Math.min(end, Number(match[2]));
          }
        }
        if (
          !match ||
          (!match[1] && (!match[2] || Number(match[2]) === 0)) ||
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start < 0 ||
          start > end ||
          start >= info.size
        ) {
          res.statusCode = 416;
          res.setHeader("Content-Range", `bytes */${info.size}`);
          return res.end();
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
      }
      res.setHeader("Content-Length", Math.max(0, end - start + 1));
      if (req.method === "HEAD" || !info.size) return res.end();
      const stream = createReadStream(p, { start, end });
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.loadEnvFile(".env.local");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  createAppServer().listen(Number(process.env.PORT ?? 4175), "0.0.0.0", () =>
    console.log(
      "V2.5.1 production preview: http://localhost:" +
        (process.env.PORT ?? 4175),
    ),
  );
}
