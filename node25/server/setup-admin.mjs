import { mkdir, writeFile, chmod, access } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./admin.mjs";
const out = resolve("../.private/node25"),
  envPath = resolve(".env.local");
await mkdir(out, { recursive: true, mode: 0o700 });
try {
  await access(envPath);
  if (!process.argv.includes("--rotate"))
    throw new Error(
      "Admin configuration exists. Use --rotate to invalidate existing sessions.",
    );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const password = randomBytes(24).toString("base64url"),
  secret = randomBytes(48).toString("base64url"),
  hash = hashPassword(password);
await writeFile(
  envPath,
  `ADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${secret}\n`,
  { mode: 0o600 },
);
await chmod(envPath, 0o600);
await writeFile(
  resolve(out, "admin-access.txt"),
  `JobMarket Lens V2.5 admin\nURL: https://lens.feedos.si/admin\nPassword: ${password}\nSession duration: 3 hours\nKeep this file private.\n`,
  { mode: 0o600 },
);
console.log(
  "Admin configuration created. Credentials saved privately at ../.private/node25/admin-access.txt; no password printed.",
);
