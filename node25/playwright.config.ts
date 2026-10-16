import { defineConfig, devices } from "@playwright/test";
import { scryptSync } from "node:crypto";
const testPassword = "local-browser-test-password",
  salt = "node25-browser-fixture";
export default defineConfig({
  testDir: "./test/browser",
  timeout: 75_000,
  expect: { timeout: 30_000 },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.LENS_TEST_BASE_URL || "http://127.0.0.1:4185",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1512, height: 1000 },
      },
    },
  ],
  webServer: process.env.LENS_TEST_BASE_URL
    ? undefined
    : {
        command: "node server/dev.mjs",
        url: "http://127.0.0.1:4185/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 45_000,
        env: {
          PORT: "4185",
          ADMIN_PASSWORD_HASH:
            salt + ":" + scryptSync(testPassword, salt, 64).toString("hex"),
          ADMIN_SESSION_SECRET:
            "browser-fixture-session-secret-not-for-production",
          UMAMI_URL: "",
          UMAMI_WEBSITE_ID: "",
          UMAMI_API_TOKEN: "",
        },
      },
});
