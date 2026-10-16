try {
  process.loadEnvFile(".env.local");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
import http from "node:http";
import { createServer } from "vite";
import handler from "./handler.mjs";
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "spa",
});
http
  .createServer((req, res) =>
    req.url.startsWith("/api/")
      ? handler(req, res)
      : vite.middlewares(req, res),
  )
  .listen(Number(process.env.PORT ?? 4175), "0.0.0.0", () =>
    console.log(
      "V2.5 research canvas: http://localhost:" + (process.env.PORT ?? 4175),
    ),
  );
