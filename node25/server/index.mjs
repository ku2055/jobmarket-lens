try {
  process.loadEnvFile(".env.local");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import handler from "./handler.mjs";
const root = resolve("dist"),
  types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".json": "application/json",
  };
http
  .createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) return handler(req, res);
    const pathname = decodeURI(new URL(req.url, "http://local").pathname),
      route = ["/", "/canvas", "/skills", "/evidence", "/admin"].includes(
        pathname,
      ),
      p = route ? resolve(root, "index.html") : resolve(root, "." + pathname);
    if (!p.startsWith(root + "/")) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    try {
      const b = await readFile(p);
      res.setHeader(
        "Content-Type",
        types[extname(p)] ?? "application/octet-stream",
      );
      if (pathname === "/admin")
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.end(b);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT ?? 4175), "0.0.0.0", () =>
    console.log(
      "V2.5 production preview: http://localhost:" + (process.env.PORT ?? 4175),
    ),
  );
