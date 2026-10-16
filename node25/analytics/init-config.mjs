import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
await writeFile(
  new URL(".env", import.meta.url),
  `UMAMI_DB_PASSWORD=${randomBytes(32).toString("hex")}\nUMAMI_APP_SECRET=${randomBytes(32).toString("hex")}\nUMAMI_2FA_KEY=${randomBytes(32).toString("hex")}\n`,
  { flag: "wx", mode: 0o600 },
);
console.log("Private analytics .env created; no secrets printed.");
